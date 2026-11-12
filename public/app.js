const $ = s => document.querySelector(s);
const state = { page:"dashboard", data:{} };
const titles = { dashboard:"Visão geral", products:"Produtos", clients:"Clientes", orders:"Pedidos", currencies:"Moedas e cotações", countries:"Países" };
const labels = { products:"produto", clients:"cliente", orders:"pedido", currencies:"moeda", countries:"país" };
async function api(url, options) {
  const response = await fetch("/api"+url, Object.assign({ headers:{ "Content-Type":"application/json" }, credentials:"same-origin" }, options || {}));
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Falha na solicitação.");
  return data;
}
function toast(message){ const el=$("#toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2500); }
async function checkSession(){ try{const s=await api("/session"); if(s.authenticated) showApp(); else showLogin();}catch(e){showLogin();} }
function showLogin(){ $("#loginView").classList.remove("hidden"); $("#appView").classList.add("hidden"); }
function showApp(){ $("#loginView").classList.add("hidden"); $("#appView").classList.remove("hidden"); navigate("dashboard"); }
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();$("#loginError").textContent="";try{await api("/login",{method:"POST",body:JSON.stringify({username:$("#username").value,password:$("#password").value})});showApp();}catch(err){$("#loginError").textContent=err.message;}});
$("#logoutBtn").addEventListener("click",async()=>{await api("/logout",{method:"POST"});showLogin();});
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
async function navigate(page){state.page=page;$("#pageTitle").textContent=titles[page];document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));if(page==="dashboard")return renderDashboard();await load(page);renderTable(page);}
async function load(entity){state.data[entity]=await api("/"+entity);}
async function renderDashboard(){const d=await api("/dashboard");$("#content").innerHTML=`<div class="welcome"><h2>Bem-vindo ao painel</h2><p>Acompanhe os principais números da operação de exportação.</p></div><div class="stats"><div class="stat"><small>Produtos cadastrados</small><strong>${d.products}</strong></div><div class="stat"><small>Clientes</small><strong>${d.clients}</strong></div><div class="stat"><small>Pedidos registrados</small><strong>${d.orders}</strong></div><div class="stat"><small>Valor total em pedidos</small><strong>${money(d.revenueBrl)}</strong></div></div><div class="panel"><h3>Resumo operacional</h3><p class="note">Os valores dos pedidos são calculados com margem de 100% sobre o custo cadastrado do produto. A cotação utilizada fica salva no próprio pedido.</p></div>`;}
function money(v){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v||0));}
const columns={
 products:[["name","Produto"],["sku","SKU"],["costBrl","Custo (R$)"],["stock","Estoque"]],
 clients:[["name","Cliente"],["email","E-mail"],["country","País"]],
 orders:[["id","Pedido"],["clientName","Cliente"],["productName","Produto"],["quantity","Qtd."],["totalBrl","Total (R$)"],["currency","Moeda"]],
 currencies:[["code","Código"],["name","Moeda"],["rate","Cotação (R$ por unidade)"]],
 countries:[["name","País"],["currency","Moeda"]]
};
function renderTable(entity){const rows=state.data[entity]||[];const cols=columns[entity];$("#content").innerHTML=`<div class="toolbar"><p>Gerencie os registros de ${labels[entity]}.</p><button class="primary" id="addBtn">+ Novo ${labels[entity]}</button></div><div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join("")}<th>Ações</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${cols.map(c=>`<td>${escapeHtml(displayValue(row,c[0]))}</td>`).join("")}<td class="actions"><button data-delete="${row.id}">Excluir</button></td></tr>`).join(""):`<tr><td colspan="${cols.length+1}" class="empty">Nenhum registro cadastrado.</td></tr>`}</tbody></table></div>${entity==="orders"?'<p class="note">A margem aplicada é de 100% sobre o custo do produto. A cotação é informada em reais por uma unidade da moeda estrangeira.</p>':""}`;
$("#addBtn").addEventListener("click",()=>openForm(entity));document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",async()=>{if(confirm("Deseja excluir este registro?")){await api("/"+entity+"/"+b.dataset.delete,{method:"DELETE"});await load(entity);renderTable(entity);toast("Registro excluído.");}}));}
function displayValue(row,key){if(key==="costBrl"||key==="totalBrl")return money(row[key]);if(key==="id")return String(row[key]).slice(0,8).toUpperCase();return row[key]===undefined?"—":row[key];}
function escapeHtml(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function field(name,label,type,required=true,options){let input=options?`<select name="${name}" ${required?"required":""}>${options.map(o=>`<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("")}</select>`:`<input name="${name}" type="${type||"text"}" ${required?"required":""} ${type==="number"?'min="0" step="any"':""}>`;return `<label>${label}${input}</label>`;}
async function openForm(entity){
 let form="";
 if(entity==="products")form=field("name","Nome do produto")+field("sku","SKU", "text",false)+field("costBrl","Custo unitário (R$)","number")+field("stock","Estoque","number",false);
 if(entity==="clients")form=field("name","Nome / Empresa")+field("email","E-mail","email",false)+field("country","País","text",false);
 if(entity==="currencies")form=field("code","Código (ex.: USD)")+field("name","Nome da moeda")+field("rate","Cotação em R$ por 1 unidade","number");
 if(entity==="countries")form=field("name","País")+field("currency","Moeda (ex.: USD)","text",false);
 if(entity==="orders"){
   await Promise.all(["products","clients","currencies"].map(load));
   const products=state.data.products,clients=state.data.clients,currencies=state.data.currencies;
   if(!products.length||!clients.length){toast("Cadastre ao menos um produto e um cliente.");return;}
   form=field("productId","Produto","text",true,products.map(p=>({value:p.id,label:p.name+" — custo "+money(p.costBrl)})))+
   field("clientId","Cliente","text",true,clients.map(c=>({value:c.id,label:c.name})))+
   field("quantity","Quantidade","number")+
   field("currency","Moeda de destino","text",true,[{value:"BRL",label:"BRL — Real"},...currencies.map(c=>({value:c.code,label:c.code+" — "+c.name}))])+
   field("exchangeRate","Cotação (R$ por 1 unidade)","number");
 }
 const wrap=document.createElement("div");wrap.className="modal-back";wrap.innerHTML=`<form class="modal"><h3>Novo ${labels[entity]}</h3><div class="form-grid">${form}</div><p class="note">${entity==="orders"?"Exemplo: se 1 USD = R$ 5,00, informe 5. O sistema divide o total em reais por 5.":""}</p><div class="modal-actions"><button type="button" class="secondary" id="cancel">Cancelar</button><button class="primary">Salvar registro</button></div></form>`;document.body.appendChild(wrap);
 wrap.querySelector("#cancel").onclick=()=>wrap.remove();
 wrap.querySelector("form").onsubmit=async e=>{e.preventDefault();const obj=Object.fromEntries(new FormData(e.target).entries());["costBrl","stock","quantity","exchangeRate","rate"].forEach(k=>{if(obj[k]!==undefined)obj[k]=Number(obj[k]);});try{await api("/"+entity,{method:"POST",body:JSON.stringify(obj)});wrap.remove();await load(entity);renderTable(entity);toast("Registro salvo com sucesso.");}catch(err){toast(err.message);}};
}
checkSession();