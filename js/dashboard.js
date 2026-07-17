import Chart from "chart.js/auto";
import { dados, chartMensal, chartTipo, chartFilial, chartUnidade, tabelaSortKey, tabelaSortOrder,
    setChartMensal, setChartTipo, setChartFilial, setChartUnidade, setTabelaSortKey, setTabelaSortOrder } from "./state.js";
import { safeEl, formatarMoeda, formatarData, animarMoeda, animarNumero, el } from "./utils.js";
import { apiGetMetas, apiSaveMetas } from "./supabase.js";

const METAS_DEFAULT = { metaMensalSA: 500000, metaTicketMedio: 15000, metaGapMax: 100000, alertaLimiteDano: 200000 };

function carregarMetasLocal() {
    try {
        const raw = localStorage.getItem("makroMetas");
        if (raw) return JSON.parse(raw);
    } catch(e) {}
    return null;
}

function salvarMetasLocal(metas) {
    try { localStorage.setItem("makroMetas", JSON.stringify(metas)); } catch(e) {}
}

export let METAS = { ...METAS_DEFAULT };

export async function carregarMetas() {
    const supabaseMetas = await apiGetMetas();
    if (supabaseMetas) {
        METAS = supabaseMetas;
        salvarMetasLocal(supabaseMetas);
        return;
    }
    const localMetas = carregarMetasLocal();
    if (localMetas) {
        METAS = localMetas;
        return;
    }
    METAS = { ...METAS_DEFAULT };
}

export async function salvarMetas(metas) {
    METAS = metas;
    salvarMetasLocal(metas);
    await apiSaveMetas(metas);
}

export async function recarregarMetas() {
    await carregarMetas();
}

export function popularSelect(id, valores) {
    const select = document.getElementById(id);
    if (!select) return;
    while (select.options.length > 1) select.remove(1);
    valores.sort().forEach(v => {
        const op = document.createElement("option");
        op.value = v; op.text = v;
        select.appendChild(op);
    });
}

export function popularFiltros() {
    popularSelect("filtroFilial", [...new Set(dados.map(x => x.filial))]);
    popularSelect("filtroUnidade", [...new Set(dados.map(x => x.unidade))]);
    popularSelect("filtroTipo", [...new Set(dados.map(x => x.tipo))]);

    const mesesUnicos = [];
    dados.forEach(x => {
        if (x.data && x.data instanceof Date && !isNaN(x.data.getTime())) {
            const chave = `${x.data.getFullYear()}-${String(x.data.getMonth()).padStart(2,'0')}`;
            const nomeMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
            const label = `${nomeMeses[x.data.getMonth()]}/${x.data.getFullYear()}`;
            if (!mesesUnicos.find(m => m.val === chave)) {
                mesesUnicos.push({ val: chave, label });
            }
        }
    });
    mesesUnicos.sort((a, b) => a.val.localeCompare(b.val));

    const selectMes = document.getElementById("filtroMes");
    if (selectMes) {
        while (selectMes.options.length > 1) selectMes.remove(1);
        mesesUnicos.forEach(m => {
            const op = document.createElement("option");
            op.value = m.val; op.text = m.label;
            selectMes.appendChild(op);
        });
    }
}

export function popularFiltroFilialEquipamento() {
    const filiais = [...new Set(dados.map(x => x.filial))].filter(Boolean);
    popularSelect("filtroFilialEquipamento", filiais);
}

export function dadosFiltrados() {
    let resultado = [...dados];
    const filial = safeEl("filtroFilial");
    const unidade = safeEl("filtroUnidade");
    const tipo = safeEl("filtroTipo");
    const mes = safeEl("filtroMes");
    if (filial && filial.value != "ALL") resultado = resultado.filter(x => x.filial === filial.value);
    if (unidade && unidade.value != "ALL") resultado = resultado.filter(x => x.unidade === unidade.value);
    if (tipo && tipo.value != "ALL") resultado = resultado.filter(x => x.tipo === tipo.value);
    if (mes && mes.value != "ALL") {
        resultado = resultado.filter(x => {
            if (!x.data || !(x.data instanceof Date) || isNaN(x.data.getTime())) return false;
            return `${x.data.getFullYear()}-${String(x.data.getMonth()).padStart(2,'0')}` === mes.value;
        });
    }
    return resultado;
}

function isDanoCategorizado(tipo) { const t = (tipo || '').toLowerCase(); return t === 'dano critico' || t === 'dano não critico'; }
function isPossivelDano(tipo) { const t = (tipo || '').toLowerCase(); return t === 'dano sem identificação' || t === 'dano não categorizado'; }

function computarKPIs(lista) {
    const totalSA = lista.reduce((a, b) => a + b.valorSA, 0);
    const totalSC = lista.reduce((a, b) => a + b.valorSC, 0);
    const totalOS = new Set(lista.map(x => x.os)).size;
    const ticket = totalOS ? totalSA / totalOS : 0;
    const totalDanosCategorizados = lista.filter(x => isDanoCategorizado(x.tipo)).reduce((a, b) => a + b.valorSA, 0);
    const possiveisDanos = lista.filter(x => isPossivelDano(x.tipo)).reduce((a, b) => a + b.valorSA, 0);
    return { totalSA, totalSC, gap: totalSA - totalSC, totalOS, ticket, totalDanosCategorizados, possiveisDanos };
}

function obterMesesBase() {
    const meses = {};
    dados.forEach(x => {
        if (x.data && x.data instanceof Date && !isNaN(x.data.getTime())) {
            const chave = `${x.data.getFullYear()}-${String(x.data.getMonth()).padStart(2,"0")}`;
            if (!meses[chave]) meses[chave] = [];
            meses[chave].push(x);
        }
    });
    return Object.keys(meses).sort().map(k => ({ chave: k, dados: meses[k] }));
}

function calcularVariacao(atual, anterior) {
    if (anterior === 0) return null;
    return ((atual - anterior) / anterior) * 100;
}

function atualizarKPIChange(id, variacao) {
    const el = document.getElementById(id);
    if (!el) return;
    if (variacao === null || variacao === undefined) {
        el.textContent = ""; el.className = "kpi-change";
        return;
    }
    const sinal = variacao > 0 ? "+" : "";
    el.textContent = `${sinal}${variacao.toFixed(1)}% vs mes anterior`;
    el.className = `kpi-change ${variacao > 0 ? "positive" : "negative"}`;
}

function atualizarKpiMeta(id, value, meta, invert) {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = ((value - meta) / meta) * 100;
    if (value > meta) {
        el.textContent = `${invert ? "▼" : "▲"} ${Math.abs(pct).toFixed(0)}% acima da meta`;
        el.className = `kpi-meta ${invert ? "below-target" : "above-target"}`;
    } else {
        el.textContent = `${invert ? "▲" : "▼"} ${Math.abs(pct).toFixed(0)}% abaixo da meta`;
        el.className = `kpi-meta ${invert ? "above-target" : "below-target"}`;
    }
}

export function atualizarKPIs(base) {
    const { totalSA, totalSC, gap, totalOS, ticket, totalDanosCategorizados, possiveisDanos } = computarKPIs(base);

    const elKpiSA = safeEl("kpiSA");
    const elKpiGap = safeEl("kpiGap");
    const elKpiOs = safeEl("kpiOs");
    const elKpiTicket = safeEl("kpiTicket");
    const elKpiDanoTotal = safeEl("kpiDanoTotal");

    if (elKpiSA) animarMoeda(elKpiSA, totalDanosCategorizados);
    if (elKpiGap) elKpiGap.innerText = formatarMoeda(gap);
    if (elKpiOs) animarNumero(elKpiOs, totalOS);
    if (elKpiTicket) elKpiTicket.innerText = formatarMoeda(ticket);
    if (elKpiDanoTotal) animarMoeda(elKpiDanoTotal, possiveisDanos);

    const porUnidade = {};
    base.forEach(l => { if (l.unidade) porUnidade[l.unidade] = (porUnidade[l.unidade] || 0) + l.valorSA; });
    const unidades = Object.entries(porUnidade).sort((a, b) => b[1] - a[1]);
    const elFilialNome = safeEl("kpiFilialNome");
    const elFilialValor = safeEl("kpiFilialValor");
    if (unidades.length > 0) {
        if (elFilialNome) elFilialNome.innerText = unidades[0][0];
        if (elFilialValor) elFilialValor.innerText = formatarMoeda(unidades[0][1]);
    } else {
        if (elFilialNome) elFilialNome.innerText = "-";
        if (elFilialValor) elFilialValor.innerText = formatarMoeda(0);
    }

    const mesesBase = obterMesesBase();
    if (mesesBase.length >= 2) {
        const kpiUltimo = computarKPIs(mesesBase[mesesBase.length - 1].dados);
        const kpiAnterior = computarKPIs(mesesBase[mesesBase.length - 2].dados);
        atualizarKPIChange("kpiSAChange", calcularVariacao(kpiUltimo.totalDanosCategorizados, kpiAnterior.totalDanosCategorizados));
        atualizarKPIChange("kpiGapChange", calcularVariacao(kpiUltimo.gap, kpiAnterior.gap));
        atualizarKPIChange("kpiOsChange", calcularVariacao(kpiUltimo.totalOS, kpiAnterior.totalOS));
        atualizarKPIChange("kpiTicketChange", calcularVariacao(kpiUltimo.ticket, kpiAnterior.ticket));
        atualizarKPIChange("kpiDanoTotalChange", calcularVariacao(kpiUltimo.possiveisDanos, kpiAnterior.possiveisDanos));
    } else {
        ["kpiSAChange","kpiGapChange","kpiOsChange","kpiTicketChange","kpiDanoTotalChange"]
            .forEach(id => atualizarKPIChange(id, null));
    }

    atualizarKpiMeta("kpiSAMeta", totalDanosCategorizados, METAS.metaMensalSA, false);
    atualizarKpiMeta("kpiDanoTotalMeta", possiveisDanos, METAS.alertaLimiteDano, false);
}

export function atualizarTabela(base) {
    const tbody = document.querySelector("#mainTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let linhas = [...base];
    linhas.sort((a, b) => Number(b.valorSA) - Number(a.valorSA));
    linhas = linhas.slice(0, 10);

    if (tabelaSortKey) {
        linhas.sort((a, b) => {
            let aVal = a[tabelaSortKey];
            let bVal = b[tabelaSortKey];
            if (tabelaSortKey === "valorSA" || tabelaSortKey === "valorSC") {
                aVal = Number(aVal); bVal = Number(bVal);
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

    linhas.forEach(l => {
        const tr = document.createElement("tr");
        const campos = [
            l.os, formatarMoeda(l.valorSA), l.bem, l.sc,
            l.filial, l.unidade, l.tipo, formatarData(l.data), l.descricao
        ];
        campos.forEach(v => {
            const td = document.createElement("td");
            td.textContent = v;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

export function configurarOrdenacaoTabela() {
    const header = document.getElementById("tableHeader");
    if (!header) return;
    header.querySelectorAll("th[data-sort]").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.dataset.sort;
            if (tabelaSortKey === key) {
                setTabelaSortOrder(tabelaSortOrder === "asc" ? "desc" : "asc");
            } else {
                setTabelaSortKey(key);
                setTabelaSortOrder("asc");
            }
            header.querySelectorAll("th").forEach(h => h.classList.remove("sort-active"));
            th.classList.add("sort-active");
            const icone = th.querySelector(".sort-indicator i");
            if (icone) icone.className = tabelaSortOrder === "asc" ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
            atualizarDashboard();
        });
    });
}

export function atualizarGraficos(base) {
    criarGraficoTipo(base);
    criarGraficoFilial(base);
    criarGraficoUnidade(base);
    criarGraficoMensal(base);
}

function criarGraficoMensal(base) {
    const canvas = document.getElementById("chartMensal");
    if (!canvas) return;

    const datasValidas = base.filter(x => x.data && x.data instanceof Date && !isNaN(x.data.getTime())).map(x => x.data);
    if (datasValidas.length === 0) return;

    const mesesUnicos = [...new Set(datasValidas.map(d => `${d.getFullYear()}-${d.getMonth()}`))];
    let agrupado = {};
    let titulo = "";

    if (mesesUnicos.length === 1) {
        titulo = "Evolução Diária";
        const titleEl = document.getElementById("chartMensalTitle");
        if (titleEl) titleEl.textContent = "Evolução Diária";
        base.forEach(item => {
            if (!item.data || !(item.data instanceof Date) || isNaN(item.data.getTime())) return;
            const dia = String(item.data.getDate()).padStart(2, "0");
            agrupado[dia] = (agrupado[dia] || 0) + item.valorSA;
        });
    } else {
        titulo = "Evolução Mensal";
        const titleEl = document.getElementById("chartMensalTitle");
        if (titleEl) titleEl.textContent = "Evolução Mensal";
        const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

        base.forEach(item => {
            if (!item.data || !(item.data instanceof Date) || isNaN(item.data.getTime())) return;
            const chave = item.data.getFullYear() + "-" + String(item.data.getMonth()).padStart(2, "0");
            agrupado[chave] = (agrupado[chave] || 0) + item.valorSA;
        });

        // Ordenar cronologicamente e mapear para rotulos
        const chavesOrdenadas = Object.keys(agrupado).sort();
        const agrupadoOrdenado = {};
        chavesOrdenadas.forEach(k => {
            const partes = k.split("-");
            const mesIdx = parseInt(partes[1], 10);
            const rotulo = meses[mesIdx] + "/" + partes[0];
            agrupadoOrdenado[rotulo] = agrupado[k];
        });
        agrupado = agrupadoOrdenado;
    }

    const labels = Object.keys(agrupado);
    const valores = Object.values(agrupado);

    if (chartMensal) chartMensal.destroy();

    const ctx = document.getElementById("chartMensal");
    if (!ctx) return;
    setChartMensal(new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [{ label: "Valor SA", data: valores, backgroundColor: "rgba(212, 175, 55, 0.6)", hoverBackgroundColor: "rgba(212, 175, 55, 0.8)", hoverBorderColor: "#D4AF37", hoverBorderWidth: 3, borderRadius: 12 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 1800, easing: "easeOutQuart" },
            plugins: {
                legend: { display: false },
                title: { display: true, text: titulo, color: "#c8d0dc" },
                tooltip: { backgroundColor: "#0d1225", titleColor: "#e8edf5", bodyColor: "#c8d0dc", borderColor: "rgba(212, 175, 55, 0.3)", borderWidth: 1, callbacks: { label: context => context.raw.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) } }
            },
            scales: { y: { beginAtZero: true, ticks: { color: "#5a6b89" }, grid: { color: "rgba(255, 255, 255, 0.04)" } }, x: { ticks: { color: "#5a6b89" }, grid: { color: "rgba(255, 255, 255, 0.04)" } } }
        }
    }));
}

function criarGraficoTipo(base) {
    const canvas = document.getElementById("chartTipo");
    if (!canvas) return;

    const agrupado = {};
    base.forEach(l => { agrupado[l.tipo] = (agrupado[l.tipo] || 0) + l.valorSA; });
    const labels = Object.keys(agrupado);
    const valores = Object.values(agrupado);

    if (chartTipo) chartTipo.destroy();
    const ctx = document.getElementById("chartTipo");
    if (!ctx) return;
    setChartTipo(new Chart(ctx, {
        type: "doughnut",
        data: { labels, datasets: [{ data: valores, backgroundColor: ["rgba(212, 175, 55, 0.7)", "rgba(0, 80, 157, 0.7)", "rgba(180, 143, 42, 0.7)", "rgba(42, 107, 158, 0.7)"], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: { duration: 1800, easing: "easeOutQuart" }, plugins: { legend: { position: "bottom", labels: { color: "#8899b4" } } }, cutout: "65%" }
    }));
}

function criarGraficoFilial(base) {
    const canvas = document.getElementById("chartFilial");
    if (!canvas) return;

    const agrupado = {};
    base.forEach(l => { agrupado[l.filial] = (agrupado[l.filial] || 0) + l.valorSA; });

    if (chartFilial) chartFilial.destroy();
    const ctx = document.getElementById("chartFilial");
    if (!ctx) return;
    setChartFilial(new Chart(ctx, {
        type: "bar",
        data: { labels: Object.keys(agrupado), datasets: [{ data: Object.values(agrupado), backgroundColor: "rgba(212, 175, 55, 0.5)", borderRadius: 11, hoverBackgroundColor: "rgba(212, 175, 55, 0.7)" }] },
        options: {
            responsive: true, maintainAspectRatio: false, indexAxis: "y",
            animation: { duration: 1800, easing: "easeOutQuart" },
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: "#5a6b89" }, grid: { color: "rgba(255, 255, 255, 0.04)" } }, y: { ticks: { color: "#5a6b89" }, grid: { display: false } } }
        }
    }));
}

function criarGraficoUnidade(base) {
    const canvas = document.getElementById("chartUnidade");
    if (!canvas) return;

    const agrupado = {};
    base.forEach(l => { agrupado[l.unidade] = (agrupado[l.unidade] || 0) + l.valorSA; });
    const sorted = Object.entries(agrupado).sort((a, b) => b[1] - a[1]);

    if (chartUnidade) chartUnidade.destroy();
    const ctx = document.getElementById("chartUnidade");
    if (!ctx) return;
    setChartUnidade(new Chart(ctx, {
        type: "bar",
        data: { labels: sorted.map(e => e[0]), datasets: [{ label: "Valor SA", data: sorted.map(e => e[1]), backgroundColor: "rgba(42, 107, 158, 0.6)", borderRadius: 11, hoverBackgroundColor: "rgba(42, 107, 158, 0.8)" }] },
        options: {
            responsive: true, maintainAspectRatio: false, indexAxis: "y",
            animation: { duration: 1800, easing: "easeOutQuart" },
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { color: "#5a6b89" }, grid: { color: "rgba(255, 255, 255, 0.04)" } }, y: { ticks: { color: "#5a6b89" }, grid: { display: false } } }
        }
    }));
}

function mostrarEmptyRanking(container, mensagem) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-chart-simple"></i><h3>${mensagem}</h3></div>`;
}

export function atualizarTopEquipamentos(base) {
    const agrupado = {};
    base.forEach(l => { if (l.bem) agrupado[l.bem] = (agrupado[l.bem] || 0) + l.valorSA; });
    const ranking = Object.entries(agrupado).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById("rankingEquipamentos");
    if (!container) return;
    container.innerHTML = "";
    if (ranking.length === 0) { mostrarEmptyRanking(container, "Nenhum equipamento encontrado"); return; }
    ranking.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = `ranking-item rank-top${Math.min(index + 1, 3)}`;

        const rankLeft = document.createElement("div");
        rankLeft.className = "rank-left";
        const rankPos = document.createElement("div");
        rankPos.className = "rank-pos";
        rankPos.textContent = index + 1;
        rankLeft.appendChild(rankPos);
        const rankName = document.createElement("div");
        rankName.className = "rank-name";
        rankName.textContent = item[0];
        rankLeft.appendChild(rankName);

        const rankValue = document.createElement("div");
        rankValue.className = "rank-value";
        rankValue.textContent = formatarMoeda(item[1]);

        div.appendChild(rankLeft);
        div.appendChild(rankValue);
        container.appendChild(div);
    });
}

export function atualizarRankingFiliais(base) {
    const agrupado = {};
    base.forEach(l => { if (l.filial) agrupado[l.filial] = (agrupado[l.filial] || 0) + l.valorSA; });
    const ranking = Object.entries(agrupado).sort((a, b) => b[1] - a[1]);
    const container = document.getElementById("rankingFiliais");
    if (!container) return;
    container.innerHTML = "";
    if (ranking.length === 0) { mostrarEmptyRanking(container, "Nenhuma filial encontrada"); return; }
    ranking.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = `ranking-item rank-top${Math.min(index + 1, 3)}`;

        const rankLeft = document.createElement("div");
        rankLeft.className = "rank-left";
        const rankPos = document.createElement("div");
        rankPos.className = "rank-pos";
        rankPos.textContent = index + 1;
        rankLeft.appendChild(rankPos);
        const rankName = document.createElement("div");
        rankName.className = "rank-name";
        rankName.textContent = item[0];
        rankLeft.appendChild(rankName);

        const rankValue = document.createElement("div");
        rankValue.className = "rank-value";
        rankValue.textContent = formatarMoeda(item[1]);

        div.appendChild(rankLeft);
        div.appendChild(rankValue);
        container.appendChild(div);
    });
}

export function atualizarRankings(base) {
    atualizarTopEquipamentos(base);
    atualizarRankingFiliais(base);
}

export function gerarInsights(base) {
    const box = document.getElementById("insightsContainer");
    if (!box) return;
    const totalSA = base.reduce((a, b) => a + b.valorSA, 0);
    const totalSC = base.reduce((a, b) => a + b.valorSC, 0);
    box.textContent = "";
    const ins1 = document.createElement("div");
    ins1.className = "insight";
    ins1.innerHTML = "Valor total de Danos: <strong>" + formatarMoeda(totalSA) + "</strong>";
    box.appendChild(ins1);
    const ins2 = document.createElement("div");
    ins2.className = "insight";
    ins2.innerHTML = "Diferença Financeira: <strong>" + formatarMoeda(totalSA - totalSC) + "</strong>";
    box.appendChild(ins2);
}

export function gerarAlertas(base) {
    const section = document.getElementById("alertsSection");
    const container = document.getElementById("alertsContainer");
    const countEl = document.getElementById("alertsCount");
    if (!container || !section) return;

    const totalSA = base.reduce((a, b) => a + b.valorSA, 0);
    const totalSC = base.reduce((a, b) => a + b.valorSC, 0);
    const gap = totalSA - totalSC;
    const danos = base.filter(x => isDanoCategorizado(x.tipo)).reduce((a, b) => a + b.valorSA, 0);
    const qtdeDanos = base.filter(x => isDanoCategorizado(x.tipo)).length;

    const alerts = [];
    if (gap > METAS.metaGapMax) {
        alerts.push({ level: "critical", icon: "fa-solid fa-circle-exclamation", title: "Gap Financeiro Elevado", desc: `A diferença entre SA e SC está em ${formatarMoeda(gap)}, ultrapassando a meta de ${formatarMoeda(METAS.metaGapMax)}.`, action: "Ver Detalhes", kpi: "gap" });
    }
    if (danos > METAS.alertaLimiteDano) {
        alerts.push({ level: "warning", icon: "fa-solid fa-triangle-exclamation", title: "Alto Custo com Danos", desc: `Total de ${formatarMoeda(danos)} em danos (${qtdeDanos} ocorrências).`, action: "Ver Danos", kpi: "danoTotal" });
    }
    if (qtdeDanos > 0 && (qtdeDanos / base.length) * 100 > 30) {
        alerts.push({ level: "warning", icon: "fa-solid fa-chart-pie", title: "Proporção de Danos Alta", desc: `${((qtdeDanos / base.length) * 100).toFixed(0)}% dos lançamentos são danos (${qtdeDanos} de ${base.length} registros).`, action: "Analisar", kpi: "danoTotal" });
    }

    if (alerts.length === 0) { section.style.display = "none"; return; }
    section.style.display = "block";
    if (countEl) countEl.textContent = alerts.length;
    container.innerHTML = alerts.map(a => `
        <div class="alert-item alert-${a.level}">
            <div class="alert-icon"><i class="${a.icon}"></i></div>
            <div class="alert-body">
                <div class="alert-title">${a.title}</div>
                <div class="alert-desc">${a.desc}</div>
            </div>
            <button class="alert-action" data-kpi="${a.kpi}">${a.action} <i class="fa-solid fa-arrow-right"></i></button>
        </div>
    `).join("");

    container.querySelectorAll(".alert-action").forEach(btn => {
        btn.addEventListener("click", () => {
            const kpi = btn.dataset.kpi;
            const card = document.querySelector(`[data-kpi="${kpi}"]`);
            if (card) {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.style.outline = "2px solid #D4AF37";
                setTimeout(() => card.style.outline = "", 2000);
            }
        });
    });
}

export function atualizarLiveLabel() {
    const label = document.getElementById("liveLabel");
    if (!label) return;
    const now = new Date();
    label.textContent = `Atualizado às ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
}

export function atualizarDashboard() {
    const base = dadosFiltrados();
    try { atualizarKPIs(base); } catch(e) { console.error("atualizarKPIs erro:", e); }
    try { atualizarTabela(base); } catch(e) { console.error("atualizarTabela erro:", e); }
    try { atualizarGraficos(base); } catch(e) { console.error("atualizarGraficos erro:", e); }
    try { atualizarRankings(base); } catch(e) { console.error("atualizarRankings erro:", e); }
    try { gerarInsights(base); } catch(e) { console.error("gerarInsights erro:", e); }
    try { gerarAlertas(base); } catch(e) { console.error("gerarAlertas erro:", e); }
    try { atualizarLiveLabel(); } catch(e) { console.error("atualizarLiveLabel erro:", e); }
}

export function abrirDrillDown(kpi, base) {
    const modal = document.getElementById("modalDrillDown");
    const title = document.getElementById("drillDownTitle");
    const body = document.getElementById("drillDownBody");
    if (!modal || !body) return;

    const titulos = { valorSA: "Valor Total de Danos", gap: "Gap Financeiro", totalOS: "Total de Ordens de Serviço", ticket: "Ticket Médio", danoTotal: "Total Possiveis Danos Identificados" };
    if (title) title.textContent = titulos[kpi] || "Detalhamento";

    body.innerHTML = "";
    const drillTable = document.createElement("div");
    drillTable.className = "drill-table";

    if (kpi === "valorSA") {
        const porFilial = {};
        base.forEach(l => { if (l.filial) porFilial[l.filial] = (porFilial[l.filial] || 0) + l.valorSA; });
        const top = Object.entries(porFilial).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const header = document.createElement("div");
        header.className = "drill-row drill-header";
        const h1 = document.createElement("span"); h1.textContent = "Filial"; header.appendChild(h1);
        const h2 = document.createElement("span"); h2.textContent = "Valor Danos"; header.appendChild(h2);
        drillTable.appendChild(header);
        top.forEach(([filial, valor]) => {
            const row = document.createElement("div");
            row.className = "drill-row";
            const s1 = document.createElement("span"); s1.textContent = filial; row.appendChild(s1);
            const s2 = document.createElement("span"); s2.textContent = formatarMoeda(valor); row.appendChild(s2);
            drillTable.appendChild(row);
        });
    } else if (kpi === "gap") {
        const porFilial = {};
        base.forEach(l => { if (l.filial) { const g = l.valorSA - l.valorSC; porFilial[l.filial] = (porFilial[l.filial] || 0) + g; } });
        const top = Object.entries(porFilial).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);
        const header = document.createElement("div");
        header.className = "drill-row drill-header";
        const h1 = document.createElement("span"); h1.textContent = "Filial"; header.appendChild(h1);
        const h2 = document.createElement("span"); h2.textContent = "Gap Financeiro"; header.appendChild(h2);
        drillTable.appendChild(header);
        top.forEach(([filial, valor]) => {
            const row = document.createElement("div");
            row.className = "drill-row";
            const s1 = document.createElement("span"); s1.textContent = filial; row.appendChild(s1);
            const s2 = document.createElement("span"); s2.textContent = formatarMoeda(valor); row.appendChild(s2);
            s2.className = valor > 0 ? "positive" : "negative";
            drillTable.appendChild(row);
        });
    } else if (kpi === "totalOS") {
        const porTipo = {};
        base.forEach(l => { porTipo[l.tipo] = (porTipo[l.tipo] || 0) + 1; });
        const header = document.createElement("div");
        header.className = "drill-row drill-header";
        const h1 = document.createElement("span"); h1.textContent = "Tipo"; header.appendChild(h1);
        const h2 = document.createElement("span"); h2.textContent = "Quantidade"; header.appendChild(h2);
        drillTable.appendChild(header);
        Object.entries(porTipo).sort((a, b) => b[1] - a[1]).forEach(([tipo, qtd]) => {
            const row = document.createElement("div");
            row.className = "drill-row";
            const s1 = document.createElement("span"); s1.textContent = tipo; row.appendChild(s1);
            const s2 = document.createElement("span"); s2.textContent = qtd; row.appendChild(s2);
            drillTable.appendChild(row);
        });
    } else if (kpi === "ticket") {
        const mesesBase = obterMesesBase();
        const header = document.createElement("div");
        header.className = "drill-row drill-header";
        const h1 = document.createElement("span"); h1.textContent = "Mês"; header.appendChild(h1);
        const h2 = document.createElement("span"); h2.textContent = "Ticket Médio"; header.appendChild(h2);
        drillTable.appendChild(header);
        mesesBase.slice(-6).forEach(m => {
            const total = m.dados.reduce((a, b) => a + b.valorSA, 0);
            const os = new Set(m.dados.map(x => x.os)).size;
            const row = document.createElement("div");
            row.className = "drill-row";
            const s1 = document.createElement("span"); s1.textContent = m.chave; row.appendChild(s1);
            const s2 = document.createElement("span"); s2.textContent = formatarMoeda(os ? total / os : 0); row.appendChild(s2);
            drillTable.appendChild(row);
        });
    } else if (kpi === "danoTotal") {
        const porEquip = {};
        base.filter(x => isPossivelDano(x.tipo)).forEach(l => { if (l.bem) porEquip[l.bem] = (porEquip[l.bem] || 0) + l.valorSA; });
        const top = Object.entries(porEquip).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const header = document.createElement("div");
        header.className = "drill-row drill-header";
        const h1 = document.createElement("span"); h1.textContent = "Equipamento"; header.appendChild(h1);
        const h2 = document.createElement("span"); h2.textContent = "Valor Danos"; header.appendChild(h2);
        drillTable.appendChild(header);
        top.forEach(([bem, valor]) => {
            const row = document.createElement("div");
            row.className = "drill-row";
            const s1 = document.createElement("span"); s1.textContent = bem; row.appendChild(s1);
            const s2 = document.createElement("span"); s2.textContent = formatarMoeda(valor); row.appendChild(s2);
            drillTable.appendChild(row);
        });
    }

    body.appendChild(drillTable);
    const drillNote = document.createElement("div");
    drillNote.className = "drill-note";
    drillNote.innerHTML = '<i class="fa-solid fa-info-circle"></i> Clique no fundo ou pressione ESC para fechar';
    body.appendChild(drillNote);
    modal.style.display = "block";
}

export function abrirAnalise() {
    const modalAnalise = document.getElementById("modalAnalise");
    const base = dadosFiltrados();

    if (base.length === 0) { alert("Nenhum registro encontrado."); return; }

    const total = base.reduce((s, x) => s + x.valorSA, 0);
    const ticket = total / base.length;
    const maiorOS = [...base].sort((a, b) => b.valorSA - a.valorSA)[0];

    const equipamentos = {};
    base.forEach(item => { if (item.bem) equipamentos[item.bem] = (equipamentos[item.bem] || 0) + item.valorSA; });
    const equipamentoCritico = Object.entries(equipamentos).sort((a, b) => b[1] - a[1])[0];

    const filiais = {};
    base.forEach(item => { if (item.filial) filiais[item.filial] = (filiais[item.filial] || 0) + item.valorSA; });
    const filialCritica = Object.entries(filiais).sort((a, b) => b[1] - a[1])[0];

    const percentualMaiorOS = (maiorOS.valorSA / total) * 100;

    const analiseEl = document.getElementById("analiseTexto");
    if (analiseEl) {
        analiseEl.textContent = "";
        analiseEl.appendChild(
          el("div", { className: "executive-grid" },
            el("div", { className: "exec-card" },
              el("h3", null, "💰 Resumo Financeiro"),
              el("p", null, "Investimento Total: ", el("strong", null, formatarMoeda(total))),
              el("p", null, "Ticket Médio: ", el("strong", null, formatarMoeda(ticket))),
              el("p", null, "Total de Ordens: ", el("strong", null, base.length))
            ),
            el("div", { className: "exec-card" },
              el("h3", null, "🏆 Equipamento Crítico"),
              el("p", null, "Equipamento: ", el("strong", null, equipamentoCritico?.[0] || "-")),
              el("p", null, "Custo Acumulado: ", el("strong", null, formatarMoeda(equipamentoCritico?.[1] || 0)))
            ),
            el("div", { className: "exec-card" },
              el("h3", null, "🏢 Filial Destaque"),
              el("p", null, "Filial: ", el("strong", null, filialCritica?.[0] || "-")),
              el("p", null, "Valor Acumulado: ", el("strong", null, formatarMoeda(filialCritica?.[1] || 0)))
            ),
            el("div", { className: "exec-card" },
              el("h3", null, "⚠️ Alerta Executivo"),
              el("p", null, "A ordem de serviço ", el("strong", null, maiorOS.os), " foi a mais onerosa."),
              el("p", null, "Representando ", el("strong", null, percentualMaiorOS.toFixed(1) + "%"), " do custo total.")
            )
          ),
          el("div", { className: "conclusao" },
            el("h3", null, "📈 Conclusão Gerencial"),
            el("p", null, "Foram registradas ", el("strong", null, base.length), " ordens de serviço. O investimento total foi de ", el("strong", null, formatarMoeda(total)), ". O equipamento com maior impacto financeiro foi ", el("strong", null, equipamentoCritico?.[0] || "-"), ". A filial com maior custo foi ", el("strong", null, filialCritica?.[0] || "-"), ". A ordem ", el("strong", null, maiorOS.os), " concentrou ", el("strong", null, percentualMaiorOS.toFixed(1) + "%"), " do valor total analisado.")
          )
        );
    }

    if (modalAnalise) modalAnalise.style.display = "block";
}
