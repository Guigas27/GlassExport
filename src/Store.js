const fs = require("fs");
const path = require("path");

function Store(config) {
  this.config = config;
  this.mode = "json";
  this.connection = null;
  this.file = path.resolve(config.dataDir, "database.json");
}
Store.prototype.init = async function() {
  fs.mkdirSync(path.dirname(this.file), { recursive: true });
  if (this.config.mysql.host && this.config.mysql.user && this.config.mysql.database) {
    try {
      const mysql = require("mysql");
      this.connection = mysql.createConnection({
        host: this.config.mysql.host, user: this.config.mysql.user,
        password: this.config.mysql.password, database: this.config.mysql.database
      });
      await new Promise((resolve, reject) => this.connection.connect(err => err ? reject(err) : resolve()));
      await this.query("CREATE TABLE IF NOT EXISTS app_data (entity VARCHAR(40) NOT NULL, id VARCHAR(80) NOT NULL, payload LONGTEXT NOT NULL, PRIMARY KEY(entity,id))");
      this.mode = "mysql";
      return this.mode;
    } catch (e) {
      console.log("MySQL indisponível; usando JSON:", e.message);
      this.connection = null;
    }
  }
  if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, JSON.stringify({ products:[], clients:[], orders:[], currencies:[], countries:[] }, null, 2));
  this.mode = "json";
  return this.mode;
};
Store.prototype.query = function(sql, params) {
  return new Promise((resolve, reject) => this.connection.query(sql, params || [], (err, rows) => err ? reject(err) : resolve(rows)));
};
Store.prototype.readJson = function() {
  try { return JSON.parse(fs.readFileSync(this.file, "utf8")); }
  catch (e) { return { products:[], clients:[], orders:[], currencies:[], countries:[] }; }
};
Store.prototype.writeJson = function(data) { fs.writeFileSync(this.file, JSON.stringify(data, null, 2)); };
Store.prototype.list = async function(entity) {
  if (this.mode === "mysql") {
    const rows = await this.query("SELECT payload FROM app_data WHERE entity=?", [entity]);
    return rows.map(r => JSON.parse(r.payload));
  }
  return this.readJson()[entity] || [];
};
Store.prototype.get = async function(entity, id) {
  const rows = await this.list(entity);
  return rows.find(item => String(item.id) === String(id)) || null;
};
Store.prototype.save = async function(entity, item) {
  if (this.mode === "mysql") {
    await this.query("INSERT INTO app_data(entity,id,payload) VALUES(?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)", [entity, item.id, JSON.stringify(item)]);
    return item;
  }
  const data = this.readJson();
  if (!data[entity]) data[entity] = [];
  const index = data[entity].findIndex(x => String(x.id) === String(item.id));
  if (index < 0) data[entity].push(item); else data[entity][index] = item;
  this.writeJson(data);
  return item;
};
Store.prototype.remove = async function(entity, id) {
  if (this.mode === "mysql") return this.query("DELETE FROM app_data WHERE entity=? AND id=?", [entity, id]);
  const data = this.readJson();
  data[entity] = (data[entity] || []).filter(x => String(x.id) !== String(id));
  this.writeJson(data);
};
module.exports = Store;
