const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./config");
const Store = require("./src/Store");

const store = new Store(config);
const sessions = {};
const publicDir = path.join(__dirname, "public");
const mime = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"application/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml" };

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control":"no-store" });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => { raw += chunk; if (raw.length > 1e6) req.destroy(); });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error("JSON inválido.")); }
    });
    req.on("error", reject);
  });
}
function getSession(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/sid=([a-f0-9]+)/);
  return match ? sessions[match[1]] : null;
}
function requireAuth(req, res) {
  if (!getSession(req)) { send(res, 401, { error: "Faça login para continuar." }); return false; }
  return true;
}
function serveStatic(req, res) {
  let pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  if (pathname === "/") pathname = "/index.html";
  const file = path.normalize(path.join(publicDir, pathname));
  if (file.indexOf(publicDir) !== 0) { res.writeHead(403); return res.end("Acesso negado"); }
  fs.readFile(file, (err, content) => {
    if (err) { res.writeHead(404); return res.end("Não encontrado"); }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(content);
  });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  try {
    if (req.method === "POST" && url.pathname === "/api/login") {
      const body = await readBody(req);
      if (body.username !== config.adminUser || body.password !== config.adminPassword) return send(res, 401, { error: "Usuário ou senha incorretos." });
      const sid = crypto.randomBytes(24).toString("hex");
      sessions[sid] = { username: body.username };
      res.setHeader("Set-Cookie", "sid=" + sid + "; HttpOnly; SameSite=Lax; Path=/");
      return send(res, 200, { ok: true, username: body.username });
    }
    if (req.method === "POST" && url.pathname === "/api/logout") {
      const cookie = req.headers.cookie || "", match = cookie.match(/sid=([a-f0-9]+)/);
      if (match) delete sessions[match[1]];
      res.setHeader("Set-Cookie", "sid=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
      return send(res, 200, { ok: true });
    }
    if (req.method === "GET" && url.pathname === "/api/session") {
      const s = getSession(req);
      return send(res, 200, { authenticated: !!s, username: s ? s.username : null });
    }
    if (url.pathname.startsWith("/api/")) {
      if (!requireAuth(req, res)) return;
      if (req.method === "GET" && url.pathname === "/api/dashboard") {
        const [products, clients, orders] = await Promise.all([store.list("products"), store.list("clients"), store.list("orders")]);
        const revenue = orders.reduce((sum, o) => sum + Number(o.totalBrl || 0), 0);
        return send(res, 200, { products: products.length, clients: clients.length, orders: orders.length, revenueBrl: revenue });
      }
      if (parts.length >= 2) {
        const entity = parts[1];
        const allowed = ["products", "clients", "orders", "currencies", "countries"];
        if (allowed.indexOf(entity) < 0) return send(res, 404, { error: "Recurso não encontrado." });
        if (req.method === "GET" && parts.length === 2) return send(res, 200, await store.list(entity));
        if (req.method === "POST" && parts.length === 2) {
          const body = await readBody(req);
          const item = normalize(entity, body);
          if (!item.name && entity !== "orders") return send(res, 400, { error: "Informe o nome." });
          if (entity === "orders") {
            if (!item.productId || !item.clientId || !(Number(item.quantity) > 0)) return send(res, 400, { error: "Pedido exige produto, cliente e quantidade maior que zero." });
            const product = await store.get("products", item.productId);
            if (!product) return send(res, 400, { error: "Produto não encontrado." });
            const cost = Number(product.costBrl || 0);
            const sellBrl = cost * 2;
            const rate = Number(item.exchangeRate || 1);
            if (!(rate > 0)) return send(res, 400, { error: "Cotação deve ser maior que zero." });
            item.unitPriceBrl = sellBrl;
            item.totalBrl = sellBrl * Number(item.quantity);
            item.currency = item.currency || "BRL";
            item.totalForeign = item.currency === "BRL" ? item.totalBrl : item.totalBrl / rate;
            item.exchangeRate = rate;
            item.createdAt = new Date().toISOString();
          }
          item.id = crypto.randomBytes(8).toString("hex");
          await store.save(entity, item);
          return send(res, 201, item);
        }
        if (parts.length === 3 && req.method === "DELETE") {
          await store.remove(entity, parts[2]);
          return send(res, 200, { ok: true });
        }
        if (parts.length === 3 && req.method === "PUT") {
          const body = await readBody(req);
          const old = await store.get(entity, parts[2]);
          if (!old) return send(res, 404, { error: "Registro não encontrado." });
          const updated = Object.assign({}, old, body, { id: old.id });
          await store.save(entity, updated);
          return send(res, 200, updated);
        }
      }
      return send(res, 404, { error: "Rota não encontrada." });
    }
    serveStatic(req, res);
  } catch (err) {
    console.error(err);
    send(res, 500, { error: err.message || "Erro interno." });
  }
});
function normalize(entity, body) {
  const item = Object.assign({}, body);
  ["costBrl", "quantity", "exchangeRate"].forEach(k => { if (item[k] !== undefined) item[k] = Number(item[k]); });
  return item;
}
store.init().then(mode => {
  console.log("Armazenamento ativo: " + mode);
  server.listen(config.port, () => console.log("Sistema disponível em http://localhost:" + config.port));
}).catch(err => { console.error("Falha ao iniciar armazenamento:", err); process.exit(1); });
