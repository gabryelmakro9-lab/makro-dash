const MAKRO_COLORS = [
    "#001F3F",
    "#003366",
    "#00509D",
    "#0A66C2",
    "#D4AF37",
    "#B38F2A",
    "#E5E7EB"
];

let dados = [];
let cadastroEquipamentos = [];
let indiceFrota = {};
let fleetStats = { total: 0, operacionais: 0, manutencao: 0, disponibilidade: "100" };
let chartMensal;
let chartTipo;
let chartFilial;
let chartUnidade;

const EMAIL_REGEX = /^[a-zA-Z]+\.[a-zA-Z]+@makroengenharia\.com(\.br)?$/;
const LOGIN_PASSWORD = "makro123";
const DEVELOPER_EMAIL = "gabryel.silva@makroengenharia.com";
const SUPABASE_URL = "https://lxdszgtcrqpjczjehwhy.supabase.co";
const SUPABASE_ANON = "sb_publishable_LH64S5vndisCw7XJHlIbrg_pZdlOCXY";
let currentUserRole = null;
let currentUserEmail = null;

function sbHeaders() {
    return {
        "apikey": SUPABASE_ANON,
        "Authorization": "Bearer " + SUPABASE_ANON,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    };
}

async function apiGetUsers() {
    const r = await fetch(SUPABASE_URL + "/rest/v1/users?order=email.asc", {
        headers: sbHeaders()
    });
    if (!r.ok) throw new Error("Erro ao buscar usuarios");
    const data = await r.json();
    const obj = {};
    data.forEach(u => { obj[u.email] = u; });
    return obj;
}

async function apiRegisterUser(email, name) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/users", {
        method: "POST",
        headers: sbHeaders(),
        body: JSON.stringify({
            email: email,
            role: email === DEVELOPER_EMAIL ? "admin" : "viewer",
            name: name,
            last_login: new Date().toISOString(),
            dev: email === DEVELOPER_EMAIL
        })
    });
    if (r.status === 201 || r.status === 200) {
        const role = email === DEVELOPER_EMAIL ? "admin" : "viewer";
        return { ok: true, role: role };
    }
    if (r.status === 409) {
        const role = email === DEVELOPER_EMAIL ? "admin" : "viewer";
        return { ok: true, role: role };
    }
    return { ok: false, error: await r.text() };
}

async function apiSetUserRole(email, role) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/users?email=eq." + encodeURIComponent(email), {
        method: "PATCH",
        headers: sbHeaders(),
        body: JSON.stringify({ role: role })
    });
    return r.ok;
}

async function validarRespostaSupabase(response, acao) {
    if (response.ok) return;
    const detalhes = await response.text();
    throw new Error(`${acao} falhou (${response.status}): ${detalhes || response.statusText}`);
}

async function supabaseSalvarDados(lista) {
    const deleteResponse = await fetch(SUPABASE_URL + "/rest/v1/danos?id=not.is.null", {
        method: "DELETE",
        headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + SUPABASE_ANON }
    });
    await validarRespostaSupabase(deleteResponse, "Limpeza dos dados antigos");

    if (lista.length === 0) {
        console.log("Dados antigos removidos do Supabase. Nenhum registro novo para salvar.");
        return;
    }

    const rows = lista.map(d => ({
        os: d.os,
        valor_sa: d.valorSA,
        valor_sc: d.valorSC,
        bem: d.bem,
        sc: d.sc,
        filial: d.filial,
        unidade: d.unidade,
        tipo: d.tipo,
        data: d.data instanceof Date && !isNaN(d.data.getTime()) ? d.data.toISOString() : String(d.data || ""),
        descricao: d.descricao
    }));
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const insertResponse = await fetch(SUPABASE_URL + "/rest/v1/danos", {
            method: "POST",
            headers: sbHeaders(),
            body: JSON.stringify(batch)
        });
        await validarRespostaSupabase(insertResponse, `Gravacao do lote ${Math.floor(i / batchSize) + 1}`);
    }
    console.log("Dados salvos no Supabase:", lista.length);
}

async function supabaseCarregarDados() {
    try {
        const rows = [];
        const pageSize = 1000;
        for (let start = 0; ; start += pageSize) {
            const r = await fetch(SUPABASE_URL + "/rest/v1/danos?order=id.asc", {
                headers: {
                    "apikey": SUPABASE_ANON,
                    "Authorization": "Bearer " + SUPABASE_ANON,
                    "Range": `${start}-${start + pageSize - 1}`
                }
            });
            if (!r.ok) return false;
            const pageRows = await r.json();
            if (!pageRows || pageRows.length === 0) break;
            rows.push(...pageRows);
            if (pageRows.length < pageSize) break;
        }
        if (!rows || rows.length === 0) return false;
        dados = rows.map(d => ({
            os: d.os || "",
            valorSA: parseValorMonetario(d.valor_sa),
            valorSC: parseValorMonetario(d.valor_sc),
            bem: d.bem || "",
            sc: d.sc || "",
            filial: d.filial || "",
            unidade: d.unidade || "",
            tipo: d.tipo || "",
            data: d.data ? new Date(d.data) : "",
            descricao: d.descricao || ""
        }));
        console.log("Dados carregados do Supabase:", dados.length);
        return true;
    } catch(e) {
        console.warn("Erro ao carregar do Supabase:", e);
        return false;
    }
}

async function fazerLogin() {
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const errorEl = document.getElementById("loginError");

    if (!EMAIL_REGEX.test(email)) {
        errorEl.textContent = "E-mail invalido. Use o formato: nome.sobrenome@makroengenharia.com";
        return;
    }
    if (password !== LOGIN_PASSWORD) {
        errorEl.textContent = "Senha incorreta.";
        return;
    }

    errorEl.textContent = "Autenticando...";
    const name = email.split("@")[0].replace(".", " ");
    const result = await apiRegisterUser(email, name);

    if (!result.ok) {
        errorEl.textContent = "Erro ao registrar usuario: " + (result.error || "desconhecido");
        return;
    }

    currentUserEmail = email;
    currentUserRole = result.role;
    localStorage.setItem("makroUserRole", currentUserRole);
    localStorage.setItem("makroUserEmail", currentUserEmail);
    errorEl.textContent = "";
    document.getElementById("loginOverlay").style.display = "none";
    aplicarPermissoes();
}

function aplicarPermissoes() {
    const importLabel = document.querySelector("label.btn-success");
    if (!importLabel) return;
    importLabel.style.display = currentUserRole === "admin" ? "inline-flex" : "none";
    const menuConfig = document.getElementById("menuConfiguracoes");
    if (menuConfig) {
        menuConfig.style.display = currentUserRole === "admin" ? "" : "none";
    }
}

function fazerLogout() {
    localStorage.removeItem("makroUserRole");
    localStorage.removeItem("makroUserEmail");
    currentUserRole = null;
    currentUserEmail = null;
    document.getElementById("loginOverlay").style.display = "flex";
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginError").textContent = "";
}

document
.getElementById("excelFile")
.addEventListener("change", carregarExcel);
function normalizarBem(valor){

    return String(valor || "")
        .trim()
        .replace(/\s+/g,"")
        .toUpperCase();

}
async function carregarFrotaJson(){
    if (cadastroEquipamentos.length > 0) return;

    try{
        if (window._frotaData && window._frotaData.length > 0) {
            cadastroEquipamentos = window._frotaData;
        } else {
            const urls = ["./data/frota.json", "./assets/frota.json", "data/frota.json", "assets/frota.json"];
            let loaded = false;
            for (const url of urls) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        cadastroEquipamentos = await response.json();
                        loaded = true;
                        break;
                    }
                } catch(e) { /* try next url */ }
            }
            if (!loaded) {
                cadastroEquipamentos = await new Promise((resolve, reject) => {
                    const script = document.createElement("script");
                    script.src = "data/frota.js";
                    script.onload = () => {
                        if (window._frotaData) resolve(window._frotaData);
                        else reject(new Error("window._frotaData not set"));
                    };
                    script.onerror = () => reject(new Error("Failed to load frota.js"));
                    document.head.appendChild(script);
                });
            }
        }

        if (!cadastroEquipamentos || cadastroEquipamentos.length === 0) {
            console.error("Frota data is empty after all load attempts");
            return;
        }

        indiceFrota = {};
        cadastroEquipamentos.forEach(item => {
            const codigo = normalizarBem(item.Bem);
            if (codigo) indiceFrota[codigo] = item;
        });

        console.log("Base de frota carregada:", cadastroEquipamentos.length);
        console.log("Índice criado:", Object.keys(indiceFrota).length);

        fleetStats = { total: 0, operacionais: 0, manutencao: 0, disponibilidade: "100" };
        cadastroEquipamentos.forEach(item => {
            if (String(item["Categoria"]).trim() !== "Bem") return;
            fleetStats.total++;
            const st = String(item["Sit. Manut."] || item["Situação Bem"] || "").toUpperCase();
            if (st === "ATIVO") fleetStats.operacionais++;
            if (st.includes("MANUT")) fleetStats.manutencao++;
        });
        fleetStats.disponibilidade = fleetStats.total
            ? ((fleetStats.operacionais / fleetStats.total) * 100).toFixed(1)
            : "100";
    }
    catch(error){
        console.error("Erro ao carregar frota:", error);
    }
}

function parseValorMonetario(valor) {
    if (typeof valor === "number") {
        return Number.isFinite(valor) ? valor : 0;
    }

    if (valor === null || valor === undefined) return 0;

    let texto = String(valor).trim();
    if (!texto) return 0;

    texto = texto
        .replace(/\s+/g, "")
        .replace(/[^\d,.-]/g, "");

    if (!texto) return 0;

    const temVirgula = texto.includes(",");
    const temPonto = texto.includes(".");

    if (temVirgula && temPonto) {
        const ultimaVirgula = texto.lastIndexOf(",");
        const ultimoPonto = texto.lastIndexOf(".");
        texto = ultimaVirgula > ultimoPonto
            ? texto.replace(/\./g, "").replace(",", ".")
            : texto.replace(/,/g, "");
    } else if (temVirgula) {
        texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (temPonto) {
        const partes = texto.split(".");
        const ultimoGrupo = partes[partes.length - 1];
        if (partes.length > 2 || ultimoGrupo.length === 3) {
            texto = partes.join("");
        }
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
}

async function processarArrayBuffer(arrayBuffer, salvar){
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    console.log(dados);
    if(dados.length === 0){
        alert("A planilha não contém dados válidos.");
        return false;
    }
    console.log(Object.keys(dados[0]));
    normalizarDados();
    if(salvar) {
        salvarDadosLocal();
        try {
            await supabaseSalvarDados(dados);
        } catch(e) {
            console.error("Erro ao salvar no Supabase:", e);
            alert("A planilha foi carregada na tela, mas nao foi salva no Supabase. Ao atualizar a pagina, os dados antigos podem voltar.\n\nDetalhes: " + e.message);
        }
    }

    popularFiltros();
    popularFiltroFilialEquipamento();
    document.body.classList.add("loadingDashboard");
    atualizarDashboard();
    atualizarDashboardEquipamentos();
    setTimeout(() => {
        document.body.classList.remove("loadingDashboard");
    }, 1200);
    return true;
}

function carregarExcel(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(evt){
        processarArrayBuffer(evt.target.result, true);
    };
    reader.readAsArrayBuffer(file);
}

async function carregarExcelAutomatico(){
    try {
        const response = await fetch("./Pasta1.xlsx");
        if(!response.ok) return false;
        const buffer = await response.arrayBuffer();
        return processarArrayBuffer(buffer, true);
    } catch(e) {
        console.warn("Planilha padrão não encontrada no servidor.");
        return false;
    }
}

function atualizarRankings(base){

    atualizarTopEquipamentos(base);

    atualizarRankingFiliais(base);

}
function mostrarEmptyRanking(container, mensagem) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-chart-simple"></i><h3>${mensagem}</h3></div>`;
}

function atualizarTopEquipamentos(base){

    const agrupado = {};

    base.forEach(l=>{

        if(!l.bem) return;

        agrupado[l.bem] =
            (agrupado[l.bem] || 0)
            + l.valorSA;

    });

    const ranking =
        Object.entries(agrupado)
        .sort((a,b)=>b[1]-a[1])
        .slice(0,10);

    const container =
        document.getElementById(
            "rankingEquipamentos"
        );

    container.innerHTML = "";

    if (ranking.length === 0) {
        mostrarEmptyRanking(container, "Nenhum equipamento encontrado");
        return;
    }

    ranking.forEach((item, index) => {

        const div =
            document.createElement("div");

        div.className =
            `ranking-item rank-top${Math.min(index+1, 3)}`;

        div.innerHTML = `

            <div class="rank-left">

                <div class="rank-pos">
                    ${index+1}
                </div>

                <div class="rank-name">
                    ${item[0]}
                </div>

            </div>

            <div class="rank-value">
                ${formatarMoeda(item[1])}
            </div>

        `;

        container.appendChild(div);

    });

}
function atualizarRankingFiliais(base){

    const agrupado = {};

    base.forEach(l=>{

        if(!l.filial) return;

        agrupado[l.filial] =
            (agrupado[l.filial] || 0)
            + l.valorSA;

    });

    const ranking =
        Object.entries(agrupado)
        .sort((a,b)=>b[1]-a[1]);

    const container =
        document.getElementById(
            "rankingFiliais"
        );

    container.innerHTML = "";

    if (ranking.length === 0) {
        mostrarEmptyRanking(container, "Nenhuma filial encontrada");
        return;
    }

    ranking.forEach((item,index)=>{

        const div =
            document.createElement("div");

        div.className =
            `ranking-item rank-top${Math.min(index+1, 3)}`;

        div.innerHTML = `

            <div class="rank-left">

                <div class="rank-pos">
                    ${index+1}
                </div>

                <div class="rank-name">
                    ${item[0]}
                </div>

            </div>

            <div class="rank-value">
                ${formatarMoeda(item[1])}
            </div>

        `;

        container.appendChild(div);

    });

}
function normalizarDados(){
    dados = dados.map(linha => {
        const rowNormalized = {};
        Object.keys(linha).forEach(k => {
            rowNormalized[k.trim()] = linha[k];
        });

        const valorSA = parseValorMonetario(rowNormalized["Valor SA total"]);
        const valorSC = parseValorMonetario(rowNormalized["Valor SC total"]);

        return {
            os: rowNormalized["Ordem Serv."] || "",
            valorSA: valorSA,
            valorSC: valorSC,
            bem: rowNormalized["Bem"] || "",
            sc: rowNormalized["SC"] || "",
            filial: rowNormalized["Filial"] || "",
            unidade: rowNormalized["Unidade"] || "",
            tipo: rowNormalized["Tipo"] || "",
            data: converterDataExcel(rowNormalized["Data"]),
            descricao: rowNormalized["Descrição"] || ""
        };
    });

    dados = dados.filter(l =>
        l.valorSA > 0 ||
        l.valorSC > 0
    );

    console.log("Dados normalizados:", dados);
}
function salvarDadosLocal(){
    try {
        const dadosParaSalvar = dados.map(d => ({
            ...d,
            data: d.data instanceof Date && !isNaN(d.data.getTime())
                ? d.data.toISOString()
                : null
        }));
        localStorage.setItem("makroDashboardDados", JSON.stringify(dadosParaSalvar));
        console.log("Dados salvos no navegador.");
    } catch(e) {
        console.warn("Não foi possível salvar dados localmente:", e.message);
    }
}
function limparDadosLocal(){
    try {
        localStorage.removeItem("makroDashboardDados");
        console.log("Dados locais removidos.");
    } catch(e) {}
}
function carregarDadosLocal(){
    try {
        const raw = localStorage.getItem("makroDashboardDados");
        if(!raw) return false;
        dados = JSON.parse(raw).map(d => ({
            ...d,
            data: d.data ? new Date(d.data) : ""
        }));
        console.log("Dados restaurados:", dados.length);
        return dados.length > 0;
    } catch(e) {
        console.warn("Erro ao restaurar dados:", e.message);
        return false;
    }
}
function popularFiltros(){

    popularSelect(
        "filtroFilial",
        [...new Set(dados.map(x=>x.filial))]
    );

    popularSelect(
        "filtroUnidade",
        [...new Set(dados.map(x=>x.unidade))]
    );

    popularSelect(
        "filtroTipo",
        [...new Set(dados.map(x=>x.tipo))]
    );

    // Popular filtro de meses
    const mesesUnicos = [];
    dados.forEach(x => {
        if (x.data && x.data instanceof Date && !isNaN(x.data.getTime())) {
            const ano = x.data.getFullYear();
            const mes = x.data.getMonth();
            const chave = `${ano}-${String(mes).padStart(2, '0')}`;
            const nomeMeses = [
                "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
            ];
            const label = `${nomeMeses[mes]}/${ano}`;
            if (!mesesUnicos.find(m => m.val === chave)) {
                mesesUnicos.push({ val: chave, label: label });
            }
        }
    });
    mesesUnicos.sort((a, b) => a.val.localeCompare(b.val));

    const selectMes = document.getElementById("filtroMes");
    if (selectMes) {
        while(selectMes.options.length > 1){
            selectMes.remove(1);
        }
        mesesUnicos.forEach(m => {
            const op = document.createElement("option");
            op.value = m.val;
            op.text = m.label;
            selectMes.appendChild(op);
        });
    }
}

function popularSelect(id,valores){

const select =
document.getElementById(id);

while(select.options.length>1){

select.remove(1);

}

valores
.sort()
.forEach(v=>{

const op =
document.createElement("option");

op.value=v;

op.text=v;

select.appendChild(op);

});

}

[
    "filtroFilial",
    "filtroUnidade",
    "filtroTipo",
    "filtroMes"
]
.forEach(id=>{
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("change", atualizarDashboard);
    }
});

function dadosFiltrados(){

    let resultado = [...dados];

    const filial = document.getElementById("filtroFilial").value;
    const unidade = document.getElementById("filtroUnidade").value;
    const tipo = document.getElementById("filtroTipo").value;
    const mes = document.getElementById("filtroMes").value;

    if(filial!="ALL"){
        resultado = resultado.filter(x=>x.filial===filial);
    }

    if(unidade!="ALL"){
        resultado = resultado.filter(x=>x.unidade===unidade);
    }

    if(tipo!="ALL"){
        resultado = resultado.filter(x=>x.tipo===tipo);
    }

    if(mes!="ALL"){
        resultado = resultado.filter(x=>{
            if(!x.data || !(x.data instanceof Date) || isNaN(x.data.getTime())) return false;
            const chave = `${x.data.getFullYear()}-${String(x.data.getMonth()).padStart(2, '0')}`;
            return chave === mes;
        });
    }

    return resultado;

}

function atualizarDashboard(){

    const base =
        dadosFiltrados();

    atualizarKPIs(base);

    atualizarTabela(base);

    atualizarGraficos(base);

    atualizarRankings(base);

    gerarInsights(base);

    atualizarLiveLabel();

}
function obterMesesBase() {
    const meses = {};
    dados.forEach(x => {
        if (x.data && x.data instanceof Date && !isNaN(x.data.getTime())) {
            const chave = `${x.data.getFullYear()}-${String(x.data.getMonth()).padStart(2, "0")}`;
            if (!meses[chave]) meses[chave] = [];
            meses[chave].push(x);
        }
    });
    return Object.keys(meses).sort().map(k => ({ chave: k, dados: meses[k] }));
}

function calcularVariacao(atual, anterior) {
    if (anterior === 0) return atual > 0 ? null : null;
    return ((atual - anterior) / anterior) * 100;
}

function atualizarKPIChange(id, variacao, atual) {
    const el = document.getElementById(id);
    if (!el) return;
    if (variacao === null || variacao === undefined) {
        el.textContent = "";
        el.className = "kpi-change";
        return;
    }
    const sinal = variacao > 0 ? "+" : "";
    el.textContent = `${sinal}${variacao.toFixed(1)}% vs mes anterior`;
    el.className = `kpi-change ${variacao > 0 ? "positive" : "negative"}`;
}

function computarKPIs(lista) {
    const totalSA = lista.reduce((a, b) => a + b.valorSA, 0);
    const totalSC = lista.reduce((a, b) => a + b.valorSC, 0);
    const totalOS = new Set(lista.map(x => x.os)).size;
    const ticket = totalOS ? totalSA / totalOS : 0;
    const danoTotal = lista
        .filter(x => x.tipo === "Dano Critico" || x.tipo === "Dano Não Critico")
        .reduce((a, b) => a + b.valorSA, 0);
    return { totalSA, totalSC, gap: totalSA - totalSC, totalOS, ticket, danoTotal };
}

function atualizarKPIs(base){

const totalSA =
base.reduce(
(a,b)=>a+b.valorSA,
0
);

const totalSC =
base.reduce(
(a,b)=>a+b.valorSC,
0
);

const totalOS =
new Set(
base.map(x=>x.os)
).size;

const ticket =
totalOS
? totalSA / totalOS
: 0;

const danoTotal =
base
.filter(x => x.tipo === "Dano Critico" || x.tipo === "Dano Não Critico")
.reduce((a, b) => a + b.valorSA, 0);

animarMoeda(
    document.getElementById("kpiSA"),
    totalSA
);

document.getElementById("kpiSC")
.innerText =
formatarMoeda(totalSC);

document.getElementById("kpiGap")
.innerText =
formatarMoeda(
totalSA-totalSC
);

animarNumero(
    document.getElementById("kpiOs"),
    totalOS
);

document.getElementById("kpiTicket")
.innerText =
formatarMoeda(ticket);

animarMoeda(
    document.getElementById("kpiDanoTotal"),
    danoTotal
);

    const mesesBase = obterMesesBase();

    if (mesesBase.length >= 2) {
        const kpiUltimo = computarKPIs(mesesBase[mesesBase.length - 1].dados);
        const kpiAnterior = computarKPIs(mesesBase[mesesBase.length - 2].dados);
        atualizarKPIChange("kpiSAChange", calcularVariacao(kpiUltimo.totalSA, kpiAnterior.totalSA), kpiUltimo.totalSA);
        atualizarKPIChange("kpiSCChange", calcularVariacao(kpiUltimo.totalSC, kpiAnterior.totalSC), kpiUltimo.totalSC);
        atualizarKPIChange("kpiGapChange", calcularVariacao(kpiUltimo.gap, kpiAnterior.gap), kpiUltimo.gap);
        atualizarKPIChange("kpiOsChange", calcularVariacao(kpiUltimo.totalOS, kpiAnterior.totalOS), kpiUltimo.totalOS);
        atualizarKPIChange("kpiTicketChange", calcularVariacao(kpiUltimo.ticket, kpiAnterior.ticket), kpiUltimo.ticket);
        atualizarKPIChange("kpiDanoTotalChange", calcularVariacao(kpiUltimo.danoTotal, kpiAnterior.danoTotal), kpiUltimo.danoTotal);
    } else {
        ["kpiSAChange","kpiSCChange","kpiGapChange","kpiOsChange","kpiTicketChange","kpiDanoTotalChange"]
            .forEach(id => atualizarKPIChange(id, null, 0));
    }

}
function animarMoeda(
    elemento,
    valorFinal
){

    let atual = 0;

    const incremento =
        valorFinal / 80;

    const timer =
        setInterval(()=>{

            atual += incremento;

            if(atual >= valorFinal){

                atual =
                valorFinal;

                clearInterval(timer);

            }

            elemento.innerText =
                atual.toLocaleString(
                    "pt-BR",
                    {
                        style:"currency",
                        currency:"BRL"
                    }
                );

        },15);

}
let tabelaSortKey = null;
let tabelaSortOrder = "asc";

function atualizarTabela(base){

const tbody =
document.querySelector(
"#mainTable tbody"
);

tbody.innerHTML="";

let linhas = [...base];

linhas.sort((a, b) => {
    const aVal = Number(a.valorSA);
    const bVal = Number(b.valorSA);
    return bVal - aVal;
});

linhas = linhas.slice(0, 10);

if (tabelaSortKey) {
    linhas.sort((a, b) => {
        let aVal = a[tabelaSortKey];
        let bVal = b[tabelaSortKey];
        if (tabelaSortKey === "valorSA" || tabelaSortKey === "valorSC") {
            aVal = Number(aVal);
            bVal = Number(bVal);
        } else if (tabelaSortKey === "data") {
            aVal = a.data instanceof Date ? a.data.getTime() : 0;
            bVal = b.data instanceof Date ? b.data.getTime() : 0;
        } else {
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
        }
        if (aVal < bVal) return tabelaSortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return tabelaSortOrder === "asc" ? 1 : -1;
        return 0;
    });
}

linhas.forEach(l=>{

const tr =
document.createElement("tr");

tr.innerHTML=`

<td>${l.os}</td>

<td>${formatarMoeda(l.valorSA)}</td>

<td>${formatarMoeda(l.valorSC)}</td>

<td>${l.bem}</td>

<td>${l.sc}</td>

<td>${l.filial}</td>

<td>${l.unidade}</td>

<td>${l.tipo}</td>

<td>${formatarData(l.data)}</td>

<td>${l.descricao}</td>

`;

tbody.appendChild(tr);

});

}

function configurarOrdenacaoTabela() {
    const header = document.getElementById("tableHeader");
    if (!header) return;
    header.querySelectorAll("th[data-sort]").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.dataset.sort;
            if (tabelaSortKey === key) {
                tabelaSortOrder = tabelaSortOrder === "asc" ? "desc" : "asc";
            } else {
                tabelaSortKey = key;
                tabelaSortOrder = "asc";
            }
            header.querySelectorAll("th").forEach(h => h.classList.remove("sort-active"));
            th.classList.add("sort-active");
            const icone = th.querySelector(".sort-indicator i");
            if (icone) {
                icone.className = tabelaSortOrder === "asc" ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
            }
            atualizarDashboard();
        });
    });
}

function atualizarGraficos(base){

criarGraficoTipo(base);

criarGraficoFilial(base);

criarGraficoUnidade(base);

criarGraficoMensal(base);

}

function criarGraficoMensal(base){

    const datasValidas = base
        .filter(x => x.data && x.data instanceof Date && !isNaN(x.data.getTime()))
        .map(x => x.data);

    if(datasValidas.length === 0)
        return;

    const mesesUnicos = [
        ...new Set(
            datasValidas.map(d =>
                `${d.getFullYear()}-${d.getMonth()}`
            )
        )
    ];

    let agrupado = {};
    let titulo = "";

    // APENAS UM MÊS -> AGRUPA POR DIA

    if(mesesUnicos.length === 1){

        titulo = "Evolução Diária";
        document.getElementById("chartMensalTitle").textContent = "Evolução Diária";

        base.forEach(item => {

            if(!item.data || !(item.data instanceof Date) || isNaN(item.data.getTime())) return;

            const data = item.data;

            const dia =
                String(
                    data.getDate()
                ).padStart(2,"0");

            agrupado[dia] =
                (agrupado[dia] || 0)
                + item.valorSA;

        });

    }

    // MAIS DE UM MÊS -> AGRUPA POR MÊS

    else{

        titulo = "Evolução Mensal";
        document.getElementById("chartMensalTitle").textContent = "Evolução Mensal";

        const meses = [
            "Jan","Fev","Mar","Abr",
            "Mai","Jun","Jul","Ago",
            "Set","Out","Nov","Dez"
        ];

        base.forEach(item => {

            if(!item.data || !(item.data instanceof Date) || isNaN(item.data.getTime())) return;

            const data = item.data;

            const chave =
                meses[data.getMonth()];

            agrupado[chave] =
                (agrupado[chave] || 0)
                + item.valorSA;

        });

    }

    const labels =
        Object.keys(agrupado);

    const valores =
        Object.values(agrupado);

    if(chartMensal)
        chartMensal.destroy();

    chartMensal = new Chart(

        document.getElementById(
            "chartMensal"
        ),

        {
            type:"bar",

            data:{
                labels,
                datasets:[{
                    label:"Valor SA",
                    data:valores,

                    backgroundColor:"rgba(212, 175, 55, 0.6)",

                    hoverBackgroundColor:"rgba(212, 175, 55, 0.8)",

                    hoverBorderColor:"#D4AF37",

                    hoverBorderWidth:3,

                    borderRadius:12
                }]
            },

            options:{
                responsive:true,
                maintainAspectRatio:false,
                animation:{
                    duration:1800,
                    easing:"easeOutQuart"
                    },       

                plugins:{
                    legend:{
                        display:false
                    },

                    title:{
                        display:true,
                        text:titulo,
                        color:"#c8d0dc"
                    },

                    tooltip:{
                        backgroundColor:"#0d1225",

                        titleColor:"#e8edf5",

                        bodyColor:"#c8d0dc",

                        borderColor:"rgba(212, 175, 55, 0.3)",

                        borderWidth:1,

                        callbacks:{
                            label:function(context){

                                return context.raw.toLocaleString(
                                    "pt-BR",
                                    {
                                        style:"currency",
                                        currency:"BRL"
                                    }
                                );

                            }
                        }
                    }
                },

                scales:{
                    y:{
                        beginAtZero:true,
                        ticks:{
                            color:"#5a6b89"
                        },
                        grid:{
                            color:"rgba(255, 255, 255, 0.04)"
                        }
                    },
                    x:{
                        ticks:{
                            color:"#5a6b89"
                        },
                        grid:{
                            color:"rgba(255, 255, 255, 0.04)"
                        }
                    }
                }
            }
        }
    );

}

function criarGraficoTipo(base){

const agrupado = {};

base.forEach(l=>{

agrupado[l.tipo] =
(agrupado[l.tipo]||0)
+
l.valorSA;

});

const labels =
Object.keys(agrupado);

const valores =
Object.values(agrupado);

if(chartTipo)
chartTipo.destroy();

chartTipo =
new Chart(
document.getElementById(
"chartTipo"
),
{
type:"doughnut",
data:{
labels,
datasets:[{
    data:valores,
    backgroundColor:[
        "rgba(212, 175, 55, 0.7)",
        "rgba(0, 80, 157, 0.7)",
        "rgba(180, 143, 42, 0.7)",
        "rgba(42, 107, 158, 0.7)"
    ],
    borderWidth:0
}]
},
options:{
    responsive:true,
    maintainAspectRatio:false,

    animation:{
        duration:1800,
        easing:"easeOutQuart"
    },

    plugins:{
        legend:{
            position:"bottom",
            labels:{
                color:"#8899b4"
            }
        }
    },

    cutout:"65%"
}
}
);

}

function criarGraficoFilial(base){

const agrupado={};

base.forEach(l=>{

agrupado[l.filial] =
(agrupado[l.filial]||0)
+
l.valorSA;

});

if(chartFilial)
chartFilial.destroy();

chartFilial =
new Chart(
document.getElementById(
"chartFilial"
),
{
type:"bar",
data:{
labels:
Object.keys(agrupado),
datasets:[{

    data:Object.values(agrupado),

    backgroundColor:"rgba(212, 175, 55, 0.5)",

    borderRadius:11,

    hoverBackgroundColor:"rgba(212, 175, 55, 0.7)"

}]
},
    options:{
        responsive:true,
        maintainAspectRatio:false,
        indexAxis:"y",
        animation:{
        duration:1800,
        easing:"easeOutQuart"
        },
        plugins:{
            legend:{
                display:false
            }
        },
        scales:{
            x:{
                ticks:{
                    color:"#5a6b89"
                },
                grid:{
                    color:"rgba(255, 255, 255, 0.04)"
                }
            },
            y:{
                ticks:{
                    color:"#5a6b89"
                },
                grid:{
                    display:false
                }
            }
        }
    }
    }
    );
    
    }
    
    function criarGraficoUnidade(base){

const agrupado={};

base.forEach(l=>{

agrupado[l.unidade] =
(agrupado[l.unidade]||0)
+
l.valorSA;

});

if(chartUnidade)
chartUnidade.destroy();

chartUnidade =
new Chart(
document.getElementById(
"chartUnidade"
),
{
type:"bar",
data:{
labels:
Object.keys(agrupado),
datasets:[{
    label:"Valor SA",
    data:Object.values(agrupado),
    backgroundColor:"rgba(42, 107, 158, 0.6)",
    borderRadius:11,
    hoverBackgroundColor:"rgba(42, 107, 158, 0.8)"
}]
},
options:{
    responsive:true,
    maintainAspectRatio:false,

    indexAxis:"y",

    animation:{
        duration:1800,
        easing:"easeOutQuart"
    },

    plugins:{
        legend:{
            display:false
        }
    },

    scales:{
        x:{
            beginAtZero:true,
            ticks:{
                color:"#5a6b89"
            },
            grid:{
                color:"rgba(255, 255, 255, 0.04)"
            }
        },

        y:{
            ticks:{
                color:"#5a6b89"
            },
            grid:{
                display:false
            }
        }
    }
}
}
);

}

function gerarInsights(base){

const box =
document.getElementById(
"insightsContainer"
);

box.innerHTML="";

const totalSA =
base.reduce(
(a,b)=>a+b.valorSA,
0
);

const totalSC =
base.reduce(
(a,b)=>a+b.valorSC,
0
);

box.innerHTML +=

`<div class="insight">

Valor total SA: <strong>
${formatarMoeda(totalSA)} </strong>

</div>`;

box.innerHTML +=

`<div class="insight">

Valor total SC: <strong>
${formatarMoeda(totalSC)} </strong>

</div>`;

box.innerHTML +=

`<div class="insight">

Diferença Financeira: <strong>
${formatarMoeda(
totalSA-totalSC
)} </strong>

</div>`;

}

function formatarMoeda(v){
    return v.toLocaleString(
        "pt-BR",
        {
            style:"currency",
            currency:"BRL"
        }
    );
}

function formatarData(v){
    if(!v) return "";
    if(v instanceof Date){
        return isNaN(v.getTime()) ? "" : v.toLocaleDateString("pt-BR");
    }
    return v;
}

function converterDataExcel(valor){
    if(!valor) return "";

    if(typeof valor === "number"){
        const data =
            new Date(
                (valor - 25569) *
                86400 *
                1000
            );
        return data;
    }

    if(typeof valor === "string"){
        const str = valor.trim();
        // Formato brasileiro: DD/MM/YYYY ou DD-MM-YYYY
        const matchBr = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if(matchBr){
            const dia = parseInt(matchBr[1], 10);
            const mes = parseInt(matchBr[2], 10) - 1;
            const ano = parseInt(matchBr[3], 10);
            return new Date(ano, mes, dia);
        }
        // Formato ISO: YYYY-MM-DD ou YYYY/MM/DD
        const matchIso = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if(matchIso){
            const ano = parseInt(matchIso[1], 10);
            const mes = parseInt(matchIso[2], 10) - 1;
            const dia = parseInt(matchIso[3], 10);
            return new Date(ano, mes, dia);
        }
    }

    return new Date(valor);
}

// LOGIN
document.getElementById("loginBtn").addEventListener("click", fazerLogin);
document.getElementById("btnLogout").addEventListener("click", fazerLogout);
document.getElementById("loginPassword").addEventListener("keydown", e => {
    if (e.key === "Enter") fazerLogin();
});
document.getElementById("loginEmail").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("loginPassword").focus();
});

let autoRefreshTimer = null;

function atualizarLiveLabel() {
    const label = document.getElementById("liveLabel");
    if (!label) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    label.textContent = `Atualizado às ${h}:${m}`;
}

function iniciarAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
        if (dados.length === 0) return;
        atualizarDashboard();
        atualizarDashboardEquipamentos();
        atualizarLiveLabel();
    }, 30000);
}

async function renderizarConfigUsuarios() {
    const container = document.getElementById("userRegistryTable");
    if (!container) return;
    container.innerHTML = `<div class="registry-empty">Carregando...</div>`;

    const registry = await apiGetUsers();
    const emails = Object.keys(registry).sort();

    if (emails.length === 0) {
        container.innerHTML = `<div class="registry-empty">Nenhum usuário registrado ainda.</div>`;
        return;
    }

    let html = `<table class="user-registry">
        <thead><tr><th>Usuário</th><th>E-mail</th><th>Papel</th><th>Último Acesso</th><th>Ação</th></tr></thead><tbody>`;

    emails.forEach(email => {
        const u = registry[email];
        const isDev = email === DEVELOPER_EMAIL;
        const nome = u.name || email.split("@")[0].replace(".", " ");
        const ultimo = u.last_login ? new Date(u.last_login).toLocaleString("pt-BR") : "-";
        const roleLabel = isDev ? "admin" : u.role;
        const disabled = isDev || currentUserRole !== "admin" ? "disabled" : "";
        const devBadge = isDev ? ' <span class="dev-badge">Desenvolvedor</span>' : "";

        html += `<tr>
            <td><strong>${nome}${devBadge}</strong></td>
            <td style="color:#5a6b89;">${email}</td>
            <td><span style="text-transform:capitalize;font-weight:600;">${roleLabel}</span></td>
            <td style="color:#5a6b89;font-size:13px;">${ultimo}</td>
            <td>
                <button class="role-toggle-btn ${u.role}" data-email="${email}" ${disabled}>
                    ${u.role === "admin" ? "Viewer" : "Admin"}
                </button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    container.querySelectorAll(".role-toggle-btn:not(:disabled)").forEach(btn => {
        btn.addEventListener("click", async () => {
            const email = btn.dataset.email;
            const registry = await apiGetUsers();
            if (!registry[email]) return;
            const newRole = registry[email].role === "admin" ? "viewer" : "admin";
            btn.disabled = true;
            await apiSetUserRole(email, newRole);
            renderizarConfigUsuarios();
        });
    });
}

window.addEventListener("DOMContentLoaded", () => {
    const savedRole = localStorage.getItem("makroUserRole");
    const savedEmail = localStorage.getItem("makroUserEmail");
    if (savedRole && savedEmail) {
        currentUserRole = savedRole;
        currentUserEmail = savedEmail;
        document.getElementById("loginOverlay").style.display = "none";
        aplicarPermissoes();
    }

    (async () => {
        await carregarFrotaJson();
        const carregou = await supabaseCarregarDados();
        if (carregou) {
            popularFiltros();
            popularFiltroFilialEquipamento();
            atualizarDashboard();
            atualizarDashboardEquipamentos();
        } else if (carregarDadosLocal()) {
            try {
                await supabaseSalvarDados(dados);
            } catch(e) {
                console.warn("Dados locais carregados, mas nao foi possivel atualizar o Supabase:", e);
            }
            popularFiltros();
            popularFiltroFilialEquipamento();
            atualizarDashboard();
            atualizarDashboardEquipamentos();
        } else {
            await carregarExcelAutomatico();
        }
    })();

    configurarOrdenacaoTabela();
    iniciarAutoRefresh();

    const btnRefresh = document.getElementById("btnRefresh");
    if (btnRefresh) {
        btnRefresh.addEventListener("click", () => {
            btnRefresh.classList.add("spinning");
            setTimeout(() => btnRefresh.classList.remove("spinning"), 700);
            if (dados.length > 0) {
                atualizarDashboard();
                atualizarDashboardEquipamentos();
                atualizarLiveLabel();
            }
        });
    }

    const btnAnalise =
        document.getElementById("btnAnalise");

    const modalAnalise =
        document.getElementById("modalAnalise");

    const fecharModal =
        document.getElementById("fecharModal");

    if(btnAnalise){
        btnAnalise.addEventListener("click", () => {
            abrirAnalise();
        });
    }

    if(fecharModal){
        fecharModal.addEventListener("click", () => {
            modalAnalise.style.display = "none";
        });
    }

    // NAVEGAÇÃO DE ABAS
    const menuDashboard = document.getElementById("menuDashboard");
    const menuEquipamentos = document.getElementById("menuEquipamentos");
    const menuConfig = document.getElementById("menuConfiguracoes");
    const viewDashboard = document.getElementById("viewDashboard");
    const viewEquipamentos = document.getElementById("viewEquipamentos");
    const viewConfig = document.getElementById("viewConfiguracoes");

    function esconderViews() {
        [viewDashboard, viewEquipamentos, viewConfig].forEach(v => { if (v) v.style.display = "none"; });
        [menuDashboard, menuEquipamentos, menuConfig].forEach(m => { if (m) m.classList.remove("active"); });
    }

    if(menuDashboard && viewDashboard){
        menuDashboard.addEventListener("click", (e) => {
            e.preventDefault();
            esconderViews();
            menuDashboard.classList.add("active");
            viewDashboard.style.display = "block";
        });
    }

    if(menuEquipamentos && viewEquipamentos){
        menuEquipamentos.addEventListener("click", (e) => {
            e.preventDefault();
            esconderViews();
            menuEquipamentos.classList.add("active");
            viewEquipamentos.style.display = "block";
            atualizarDashboardEquipamentos();
        });
    }

    if(menuConfig && viewConfig){
        menuConfig.addEventListener("click", async (e) => {
            e.preventDefault();
            esconderViews();
            menuConfig.classList.add("active");
            viewConfig.style.display = "block";
            await renderizarConfigUsuarios();
        });
    }

    // FILTROS DO PAINEL DE EQUIPAMENTOS
    const buscaEquip = document.getElementById("buscaEquipamento");
    const statusEquip = document.getElementById("filtroStatusEquipamento");
    const filialEquip = document.getElementById("filtroFilialEquipamento");

    if(buscaEquip){
        buscaEquip.addEventListener("input", atualizarDashboardEquipamentos);
    }
    if(statusEquip){
        statusEquip.addEventListener("change", atualizarDashboardEquipamentos);
    }
    if(filialEquip){
        filialEquip.addEventListener("change", atualizarDashboardEquipamentos);
    }

    // FECHAR MODAL EQUIPAMENTO
    const fecharModalEquipamento = document.getElementById("fecharModalEquipamento");
    const modalEquipamento = document.getElementById("modalEquipamento");
    if(fecharModalEquipamento && modalEquipamento){
        fecharModalEquipamento.addEventListener("click", () => {
            modalEquipamento.style.display = "none";
        });
    }

    // FECHAR MODAIS AO CLICAR NO FUNDO (BACKDROP)
    window.addEventListener("click", (e) => {
        if(e.target === modalAnalise){
            modalAnalise.style.display = "none";
        }
        if(modalEquipamento && e.target === modalEquipamento){
            modalEquipamento.style.display = "none";
        }
    });

    // FECHAR MODAIS COM TECLA ESC
    window.addEventListener("keydown", (e) => {
        if(e.key === "Escape"){
            if(modalAnalise) modalAnalise.style.display = "none";
            if(modalEquipamento) modalEquipamento.style.display = "none";
        }
    });

    // EXPORTAR EXCEL
    const btnExport = document.getElementById("btnExportExcel");
    if(btnExport){
        btnExport.addEventListener("click", () => {
            if(dados.length === 0){
                alert("Nenhum dado para exportar. Importe uma planilha primeiro.");
                return;
            }

            const base = dadosFiltrados();

            if(base.length === 0){
                alert("Nenhum registro corresponde aos filtros atuais.");
                return;
            }

            const linhas = base.map(l => ({
                "Ordem Serv.": l.os,
                "Valor SA": l.valorSA,
                "Valor SC": l.valorSC,
                "Bem": l.bem,
                "SC": l.sc,
                "Filial": l.filial,
                "Unidade": l.unidade,
                "Tipo": l.tipo,
                "Data": formatarData(l.data),
                "Descrição": l.descricao
            }));

            const ws = XLSX.utils.json_to_sheet(linhas);

            // Ajuste de largura das colunas
            ws["!cols"] = [
                { wch: 15 }, { wch: 16 }, { wch: 16 }, { wch: 20 },
                { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
                { wch: 14 }, { wch: 40 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Danos Filtrados");

            const dataHoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
            XLSX.writeFile(wb, `Makro_Danos_${dataHoje}.xlsx`);
        });
    }
});
function abrirAnalise(){

    const modalAnalise =
        document.getElementById("modalAnalise");

    const base =
        dadosFiltrados();

    if(base.length === 0){

        alert(
            "Nenhum registro encontrado."
        );

        return;

    }

    const total =
        base.reduce(
            (s,x)=>s+x.valorSA,
            0
        );

    const ticket =
        total / base.length;

    const maiorOS =
        [...base]
        .sort(
            (a,b)=>b.valorSA-a.valorSA
        )[0];

    // EQUIPAMENTO CRÍTICO

    const equipamentos = {};

    base.forEach(item=>{

        if(!item.bem) return;

        equipamentos[item.bem] =
            (equipamentos[item.bem] || 0)
            + item.valorSA;

    });

    const equipamentoCritico =
        Object.entries(equipamentos)
        .sort(
            (a,b)=>b[1]-a[1]
        )[0];

    // FILIAL CRÍTICA

    const filiais = {};

    base.forEach(item=>{

        if(!item.filial) return;

        filiais[item.filial] =
            (filiais[item.filial] || 0)
            + item.valorSA;

    });

    const filialCritica =
        Object.entries(filiais)
        .sort(
            (a,b)=>b[1]-a[1]
        )[0];

    // PERCENTUAL MAIOR OS

    const percentualMaiorOS =
        (
            maiorOS.valorSA /
            total
        ) * 100;

    document
    .getElementById("analiseTexto")
    .innerHTML = `

        <div class="executive-grid">

            <div class="exec-card">

                <h3>💰 Resumo Financeiro</h3>

                <p>
                Investimento Total:
                <strong>
                ${formatarMoeda(total)}
                </strong>
                </p>

                <p>
                Ticket Médio:
                <strong>
                ${formatarMoeda(ticket)}
                </strong>
                </p>

                <p>
                Total de Ordens:
                <strong>
                ${base.length}
                </strong>
                </p>

            </div>

            <div class="exec-card">

                <h3>🏆 Equipamento Crítico</h3>

                <p>
                Equipamento:
                <strong>
                ${equipamentoCritico?.[0] || "-"}
                </strong>
                </p>

                <p>
                Custo Acumulado:
                <strong>
                ${formatarMoeda(
                    equipamentoCritico?.[1] || 0
                )}
                </strong>
                </p>

            </div>

            <div class="exec-card">

                <h3>🏢 Filial Destaque</h3>

                <p>
                Filial:
                <strong>
                ${filialCritica?.[0] || "-"}
                </strong>
                </p>

                <p>
                Valor Acumulado:
                <strong>
                ${formatarMoeda(
                    filialCritica?.[1] || 0
                )}
                </strong>
                </p>

            </div>

            <div class="exec-card">

                <h3>⚠️ Alerta Executivo</h3>

                <p>
                A ordem de serviço
                <strong>
                ${maiorOS.os}
                </strong>
                foi a mais onerosa.
                </p>

                <p>
                Representando
                <strong>
                ${percentualMaiorOS.toFixed(1)}%
                </strong>
                do custo total.
                </p>

            </div>

        </div>

        <div class="conclusao">

            <h3>
            📈 Conclusão Gerencial
            </h3>

            <p>

            Foram registradas
            <strong>${base.length}</strong>
            ordens de serviço.

            O investimento total foi de
            <strong>
            ${formatarMoeda(total)}
            </strong>.

            O equipamento com maior impacto
            financeiro foi
            <strong>
            ${equipamentoCritico?.[0] || "-"}
            </strong>.

            A filial com maior custo foi
            <strong>
            ${filialCritica?.[0] || "-"}
            </strong>.

            A ordem
            <strong>
            ${maiorOS.os}
            </strong>

            concentrou

            <strong>
            ${percentualMaiorOS.toFixed(1)}%
            </strong>

            do valor total analisado.

            </p>

        </div>

    `;

    modalAnalise.style.display =
        "block";

}
function animarNumero(
    elemento,
    valorFinal,
    prefixo=""
){

    let atual = 0;

    const incremento =
        valorFinal / 60;

    const timer =
        setInterval(()=>{

            atual += incremento;

            if(atual >= valorFinal){

                atual =
                valorFinal;

                clearInterval(timer);

            }

            elemento.innerText =
                prefixo +
                atual.toLocaleString(
                    "pt-BR",
                    {
                        minimumFractionDigits:0,
                        maximumFractionDigits:0
                    }
                );

        },15);

}

// ==========================================================================
// FUNÇÕES DE GESTÃO DE EQUIPAMENTOS E FROTAS
// ==========================================================================


function popularFiltroFilialEquipamento() {
    const filiais = [...new Set(dados.map(x => x.filial))].filter(Boolean);
    popularSelect("filtroFilialEquipamento", filiais);
}

function atualizarDashboardEquipamentos() {
    const buscaEquip = document.getElementById("buscaEquipamento");
    const statusEquip = document.getElementById("filtroStatusEquipamento");
    const filialEquip = document.getElementById("filtroFilialEquipamento");

    if (!buscaEquip || !statusEquip || !filialEquip) return;

    const searchInput = buscaEquip.value.toLowerCase();
    const statusFilter = statusEquip.value;
    const filialFilter = filialEquip.value;

    const agrupadoPorBem = {};
    dados.forEach(l => {
        if (!l.bem) return;
        if (!agrupadoPorBem[l.bem]) {
            agrupadoPorBem[l.bem] = {
                bem: l.bem,
                custoTotal: 0,
                totalOS: 0,
                filial: l.filial || ""
            };
        }
        agrupadoPorBem[l.bem].custoTotal += l.valorSA;
        agrupadoPorBem[l.bem].totalOS += 1;
    });

    let custoTotal = 0;
    let totalOSGeral = 0;

    const listaEquipamentosDiv = document.getElementById("listaEquipamentos");
    if (!listaEquipamentosDiv) return;
    listaEquipamentosDiv.innerHTML = "";

    const ativosFiltrados = [];

    Object.entries(agrupadoPorBem).forEach(([bem, info]) => {
        const cadastro =
            indiceFrota[
                normalizarBem(bem)
            ];

            const specs = {
            planoManutencao: "Manutenção Preventiva",
            nomeBem: "-",
            familia: "-",
            proprietario: "-",
            centroCusto: "-",
            estoque: "-",
            fabricante: "-",
            modelo: "-",
            tipoVeiculo: "-",
            ano: "-",
            capacidade: "Não informado",
            local: info.filial || "-",
            status: "Ativo",
            situacaoManut: "-",
            horimetro: 0,
            valorCompra: 0,
            valorVenal: 0,
            placa: "-"
        };

        if(cadastro){
            specs.planoManutencao =
                cadastro["Sit. Manut."] === "Ativo"
                    ? "Manutenção Preventiva"
                    : "Em Manutenção";
            specs.nomeBem = cadastro["Nome do Bem"] || "-";
            specs.familia = cadastro["Nome Família"] || "-";
            specs.proprietario = cadastro["Proprietario"] || "-";
            specs.centroCusto = cadastro["Nome C.Custo"] || "-";
            specs.estoque = cadastro["Nome Estoque"] || "-";
            specs.fabricante = cadastro["Nome Fábrica"] || cadastro["Fabricante"] || "-";
            specs.modelo = cadastro["Nome do Bem"] || "-";
            specs.tipoVeiculo = cadastro["Nome Família"] || cadastro["Categoria"] || "-";
            specs.ano = cadastro["Ano Fabric."] || "-";
            specs.capacidade = cadastro["Cap. Tanque"] > 0 ? cadastro["Cap. Tanque"] + " L" : "Não informado";
            specs.status = cadastro["Sit. Manut."] || cadastro["Situação Bem"] || "Ativo";
            specs.situacaoManut = cadastro["Sit. Manut."] || "-";
            specs.horimetro = cadastro["Cont. Acum."] || 0;
            specs.valorCompra = cadastro["Valor Compra"] || 0;
            specs.valorVenal = cadastro["Valor Venal"] || 0;
            specs.placa = cadastro["Placa"] || "-";

            if (cadastro["Local Atual"]) {
                specs.local = cadastro["Local Atual"];
            }
        }

        const matchSearch =
            bem.toLowerCase().includes(searchInput) ||
            String(specs.tipoVeiculo).toLowerCase().includes(searchInput) ||
            String(specs.modelo).toLowerCase().includes(searchInput);

        const matchStatus = statusFilter === "ALL" || specs.status === statusFilter;
        const matchFilial = filialFilter === "ALL" || specs.local === filialFilter;

        custoTotal += info.custoTotal;
        totalOSGeral += info.totalOS;

        if (matchSearch && matchStatus && matchFilial) {
            ativosFiltrados.push({ bem, info, specs });
        }
    });

    const totalEquipamentosHtml = document.getElementById("kpiTotalEquipamentos");
    const disponibilidadeHtml = document.getElementById("kpiDisponibilidade");
    const ativosOpHtml = document.getElementById("kpiAtivosOp");
    const emManutencaoHtml = document.getElementById("kpiEmManutencao");
    const custoTotalHtml = document.getElementById("kpiCustoTotalFrota");
    const ticketFrotaHtml = document.getElementById("kpiTicketFrota");

    const equipKeys = Object.keys(agrupadoPorBem);
    const totalEquip = equipKeys.length;
    let ativosOp = 0;
    let emManut = 0;
    equipKeys.forEach(bem => {
        const cad = indiceFrota[normalizarBem(bem)];
        if (cad) {
            const st = String(cad["Sit. Manut."] || cad["Situação Bem"] || "").toUpperCase();
            if (st === "ATIVO") ativosOp++;
            if (st.includes("MANUT")) emManut++;
        } else {
            ativosOp++;
        }
    });
    const disp = totalEquip ? ((ativosOp / totalEquip) * 100).toFixed(1) : "100";

    if (totalEquipamentosHtml) totalEquipamentosHtml.innerText = totalEquip;
    if (disponibilidadeHtml) disponibilidadeHtml.innerText = `${disp}%`;
    if (ativosOpHtml) ativosOpHtml.innerText = ativosOp;
    if (emManutencaoHtml) emManutencaoHtml.innerText = emManut;
    if (custoTotalHtml) custoTotalHtml.innerText = formatarMoeda(custoTotal);
    if (ticketFrotaHtml) {
        const avg = totalOSGeral ? custoTotal / totalOSGeral : 0;
        ticketFrotaHtml.innerText = formatarMoeda(avg);
    }

    if (ativosFiltrados.length === 0) {
        const mensagem = dados.length === 0
            ? "Importe uma planilha Excel para carregar a frota."
            : "Nenhum equipamento corresponde aos filtros selecionados.";
        listaEquipamentosDiv.innerHTML = `
            <div class="no-data-message">
                ${mensagem}
            </div>
        `;
        return;
    }

    ativosFiltrados.forEach(ativo => {
        const card = document.createElement("div");
        const statusClass = ativo.specs.status.toLowerCase();
        card.className = `equipment-card card-${statusClass}`;
        
        card.innerHTML = `
            <div class="equipment-card-header">
                <span class="equipment-code">${ativo.bem}</span>
                <span class="status-badge status-${statusClass}">${ativo.specs.status}</span>
            </div>
            <div class="equipment-details">
                <div class="detail-row">
                    <span class="detail-label">Tipo:</span>
                    <span class="detail-value">${ativo.specs.tipoVeiculo}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Modelo:</span>
                    <span class="detail-value">${ativo.specs.modelo}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Local Atual:</span>
                    <span class="detail-value">${ativo.specs.local}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Custo Acumulado:</span>
                    <span class="detail-value" style="color: #f87171; font-weight: 700;">${formatarMoeda(ativo.info.custoTotal)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total OS:</span>
                    <span class="detail-value">${ativo.info.totalOS}</span>
                </div>
            </div>
            <div class="equipment-footer">
                <i class="fa-solid fa-circle-info"></i>
                Ficha Técnica & Manutenção
            </div>
        `;

        card.addEventListener("click", () => {
            abrirModalDetalhesAtivo(ativo.bem, ativo.info, ativo.specs);
        });

        listaEquipamentosDiv.appendChild(card);
    });
}

function abrirModalDetalhesAtivo(bem, info, specs) {
    const modal = document.getElementById("modalEquipamento");
    const titulo = document.getElementById("detalheEquipamentoTitulo");
    const corpo = document.getElementById("detalheEquipamentoCorpo");

    if (!modal || !titulo || !corpo) return;

    const cadastro = indiceFrota[normalizarBem(bem)];
    if (cadastro && specs.fabricante === "-") {
        specs.fabricante = cadastro["Nome Fábrica"] || cadastro["Fabricante"] || "-";
        specs.modelo = cadastro["Nome do Bem"] || "-";
        specs.ano = cadastro["Ano Fabric."] || "-";
        specs.capacidade = cadastro["Cap. Tanque"] > 0 ? cadastro["Cap. Tanque"] + " L" : "Não informado";
        specs.status = cadastro["Sit. Manut."] || cadastro["Situação Bem"] || "Ativo";
        specs.local = cadastro["Local Atual"] || specs.local;
        specs.horimetro = cadastro["Cont. Acum."] || 0;
        specs.tipoVeiculo = cadastro["Nome Família"] || cadastro["Categoria"] || "-";
        specs.planoManutencao = cadastro["Sit. Manut."] === "Ativo" ? "Manutenção Preventiva" : "Em Manutenção";
    }

    titulo.innerText = `Ficha Técnica & Manutenção: ${bem}`;

    const osAtivo = dados.filter(x => x.bem === bem);
    let tabelaHistoricoHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
            <thead>
                <tr style="background: #0d1225; color: #5a6b89;">
                    <th style="padding: 10px; text-align: left;">OS</th>
                    <th style="padding: 10px; text-align: left;">Data</th>
                    <th style="padding: 10px; text-align: left;">Valor SA</th>
                    <th style="padding: 10px; text-align: left;">Tipo</th>
                    <th style="padding: 10px; text-align: left;">Descrição</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (osAtivo.length === 0) {
        tabelaHistoricoHtml += `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #5a6b89;">Nenhuma ordem de serviço registrada.</td></tr>`;
    } else {
        osAtivo.forEach(o => {
            tabelaHistoricoHtml += `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.04);">
                    <td style="padding: 8px; font-weight: 600;">${o.os}</td>
                    <td style="padding: 8px;">${formatarData(o.data)}</td>
                    <td style="padding: 8px; font-weight: 600; color: #f87171;">${formatarMoeda(o.valorSA)}</td>
                    <td style="padding: 8px;">${o.tipo}</td>
                    <td style="padding: 8px; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.descricao}">${o.descricao}</td>
                </tr>
            `;
        });
    }
    tabelaHistoricoHtml += `</tbody></table>`;

    corpo.innerHTML = `
        <div class="eq-modal-grid">
            <div class="eq-spec-box">
                <h3><i class="fa-solid fa-circle-info"></i> Características do Ativo</h3>
                <div class="spec-grid">
                    <div class="spec-card">
                        <div class="spec-title">Fabricante</div>
                        <div class="spec-value">${specs.fabricante}</div>
                      </div>
                      <div class="spec-card">
                          <div class="spec-title">Modelo</div>
                          <div class="spec-value">${specs.modelo}</div>
                      </div>
                      <div class="spec-card">
                          <div class="spec-title">Ano Fab.</div>
                          <div class="spec-value">${specs.ano}</div>
                      </div>
                      <div class="spec-card">
                          <div class="spec-title">Capacidade</div>
                          <div class="spec-value">${specs.capacidade}</div>
                      </div>
                      <div class="spec-card">
                          <div class="spec-title">Status Atual</div>
                          <div class="spec-value">
                              <span class="status-badge status-${specs.status.toLowerCase()}">${specs.status}</span>
                          </div>
                      </div>
                      <div class="spec-card">
                          <div class="spec-title">Local Atual</div>
                          <div class="spec-value">${specs.local}</div>
                      </div>
                      <div class="spec-card" style="grid-column: span 2;">
                          <div class="spec-title">Horímetro / Odômetro</div>
                          <div class="spec-value">${specs.horimetro}</div>
                      </div>
                  </div>
              </div>
  
              <div>
                  <div class="eq-plan-box">
                      <h3><i class="fa-solid fa-calendar-check"></i> Plano de Manutenção Ativo</h3>
                      <div class="eq-plan-item">
                          <strong>Tipo de Plano:</strong>
                          <span>${specs.planoManutencao}</span>
                      </div>
                      <div class="eq-plan-item">
                          <strong>Próxima Revisão:</strong>
                          <span style="color: #eab308; font-weight: 700;">Preventiva Planejada</span>
                      </div>
                      <div class="eq-plan-item">
                          <strong>Inspeção ART/Laudo:</strong>
                          <span style="color: #22c55e; font-weight: 700;">Válido / Regular</span>
                      </div>
                  </div>
  
                  <div class="eq-cost-box">
                      <h3><i class="fa-solid fa-file-invoice-dollar"></i> Resumo Financeiro</h3>
                      <div class="eq-plan-item">
                          <strong>Custo Acumulado OS:</strong>
                          <span style="color: #f87171; font-weight: 700;">${formatarMoeda(info.custoTotal)}</span>
                      </div>
                      <div class="eq-plan-item">
                          <strong>Quantidade de OSs:</strong>
                          <span style="font-weight: 700;">${info.totalOS} ordens</span>
                      </div>
                      <div class="eq-plan-item">
                          <strong>Ticket Médio OS:</strong>
                          <span style="font-weight: 700;">${formatarMoeda(info.custoTotal / info.totalOS)}</span>
                      </div>
                  </div>
              </div>
          </div>
  
          <div style="margin-top: 30px;">
              <h3 style="color: #c8d0dc; font-size: 16px; font-weight: 700; margin-bottom: 15px;"><i class="fa-solid fa-clock-history"></i> Histórico de Ordens de Serviço (Custos)</h3>
              <div style="max-height: 250px; overflow-y: auto; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px;">
                  ${tabelaHistoricoHtml}
              </div>
          </div>
      `;
  
      modal.style.display = "block";
  }
