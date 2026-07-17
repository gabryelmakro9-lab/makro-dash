import { dados, cadastroEquipamentos, indiceFrota, fleetStats, setCadastroEquipamentos, setIndiceFrota, setFleetStats } from "./state.js";
import { normalizarBem, formatarMoeda, formatarData, el } from "./utils.js";
import { popularSelect } from "./dashboard.js";
import { apiGetFrota } from "./supabase.js";

async function carregarFrotaJson() {
    if (cadastroEquipamentos.length > 0) return;

    try {
        let data = null;

        if (window._frotaData && window._frotaData.length > 0) {
            data = window._frotaData;
        } else {
            const frotaRows = await apiGetFrota();
            if (frotaRows && frotaRows.length > 0) {
                data = frotaRows.map(r => r.data);
            }
        }

        if (!data || data.length === 0) {
            console.error("Frota data is empty after all load attempts");
            return;
        }

        setCadastroEquipamentos(data);

        const novoIndice = {};
        cadastroEquipamentos.forEach(item => {
            const codigo = normalizarBem(item.Bem);
            if (codigo) novoIndice[codigo] = item;
        });
        setIndiceFrota(novoIndice);



        const stats = { total: 0, operacionais: 0, manutencao: 0, disponibilidade: "100" };
        cadastroEquipamentos.forEach(item => {
            if (String(item["Categoria"]).trim() !== "Bem") return;
            stats.total++;
            const st = String(item["Sit. Manut."] || item["Situação Bem"] || "").toUpperCase();
            if (st === "ATIVO") stats.operacionais++;
            if (st.includes("MANUT")) stats.manutencao++;
        });
        stats.disponibilidade = stats.total ? ((stats.operacionais / stats.total) * 100).toFixed(1) : "100";
        setFleetStats(stats);
    } catch(error) {
        console.error("Erro ao carregar frota:", error);
    }
}

export function popularFiltroFilialEquipamento() {
    const filiais = [...new Set(dados.map(x => x.filial))].filter(Boolean);
    popularSelect("filtroFilialEquipamento", filiais);
}

export function atualizarDashboardEquipamentos() {
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
            agrupadoPorBem[l.bem] = { bem: l.bem, custoTotal: 0, totalOS: 0, filial: l.filial || "" };
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
        const cadastro = indiceFrota[normalizarBem(bem)];

        const specs = {
            planoManutencao: "Manutenção Preventiva", nomeBem: "-", familia: "-",
            proprietario: "-", centroCusto: "-", estoque: "-", fabricante: "-",
            modelo: "-", tipoVeiculo: "-", ano: "-", capacidade: "Não informado",
            local: info.filial || "-", status: "Ativo", situacaoManut: "-",
            horimetro: 0, valorCompra: 0, valorVenal: 0, placa: "-"
        };

        if (cadastro) {
            specs.planoManutencao = cadastro["Sit. Manut."] === "Ativo" ? "Manutenção Preventiva" : "Em Manutenção";
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
            if (cadastro["Local Atual"]) specs.local = cadastro["Local Atual"];
        }

        const matchSearch = bem.toLowerCase().includes(searchInput) ||
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

    const totalEquip = Object.keys(agrupadoPorBem).length;
    let ativosOp = 0;
    let emManut = 0;
    Object.keys(agrupadoPorBem).forEach(bem => {
        const cad = indiceFrota[normalizarBem(bem)];
        if (cad) {
            const st = String(cad["Sit. Manut."] || cad["Situação Bem"] || "").toUpperCase();
            if (st === "ATIVO") ativosOp++;
            if (st.includes("MANUT")) emManut++;
        } else { ativosOp++; }
    });
    const disp = totalEquip ? ((ativosOp / totalEquip) * 100).toFixed(1) : "100";

    const kpiTotal = document.getElementById("kpiTotalEquipamentos");
    const kpiDisp = document.getElementById("kpiDisponibilidade");
    const kpiAtivos = document.getElementById("kpiAtivosOp");
    const kpiManut = document.getElementById("kpiEmManutencao");
    const kpiCusto = document.getElementById("kpiCustoTotalFrota");
    const kpiTicket = document.getElementById("kpiTicketFrota");

    if (kpiTotal) kpiTotal.innerText = totalEquip;
    if (kpiDisp) kpiDisp.innerText = `${disp}%`;
    if (kpiAtivos) kpiAtivos.innerText = ativosOp;
    if (kpiManut) kpiManut.innerText = emManut;
    if (kpiCusto) kpiCusto.innerText = formatarMoeda(custoTotal);
    if (kpiTicket) kpiTicket.innerText = formatarMoeda(totalOSGeral ? custoTotal / totalOSGeral : 0);

    if (ativosFiltrados.length === 0) {
        const mensagem = dados.length === 0 ? "Importe uma planilha Excel para carregar a frota." : "Nenhum equipamento corresponde aos filtros selecionados.";
        listaEquipamentosDiv.innerHTML = `<div class="no-data-message">${mensagem}</div>`;
        return;
    }

    ativosFiltrados.forEach(ativo => {
        const card = document.createElement("div");
        const statusClass = ativo.specs.status.toLowerCase();
        card.className = `equipment-card card-${statusClass}`;

        const header = el("div", { className: "equipment-card-header" },
          el("span", { className: "equipment-code" }, ativo.bem),
          el("span", { className: `status-badge status-${statusClass}` }, ativo.specs.status)
        );

        const details = el("div", { className: "equipment-details" },
          el("div", { className: "detail-row" }, el("span", { className: "detail-label" }, "Tipo:"), el("span", { className: "detail-value" }, ativo.specs.tipoVeiculo)),
          el("div", { className: "detail-row" }, el("span", { className: "detail-label" }, "Modelo:"), el("span", { className: "detail-value" }, ativo.specs.modelo)),
          el("div", { className: "detail-row" }, el("span", { className: "detail-label" }, "Local Atual:"), el("span", { className: "detail-value" }, ativo.specs.local)),
          el("div", { className: "detail-row" }, el("span", { className: "detail-label" }, "Custo Acumulado:"), el("span", { className: "detail-value", style: { color: "#f87171", fontWeight: "700" } }, formatarMoeda(ativo.info.custoTotal))),
          el("div", { className: "detail-row" }, el("span", { className: "detail-label" }, "Total OS:"), el("span", { className: "detail-value" }, ativo.info.totalOS))
        );

        const footer = el("div", { className: "equipment-footer" });
        footer.innerHTML = '<i class="fa-solid fa-circle-info"></i> Ficha Técnica & Manutenção';

        card.appendChild(header);
        card.appendChild(details);
        card.appendChild(footer);
        card.addEventListener("click", () => abrirModalDetalhesAtivo(ativo.bem, ativo.info, ativo.specs));
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

    const histTable = document.createElement("table");
    Object.assign(histTable.style, { width: "100%", borderCollapse: "collapse", marginTop: "10px", fontSize: "13px" });
    const thead = document.createElement("thead");
    const thr = document.createElement("tr");
    Object.assign(thr.style, { background: "#0d1225", color: "#5a6b89" });
    ["OS", "Data", "Valor SA", "Tipo", "Descrição"].forEach(t => {
      const th = document.createElement("th");
      Object.assign(th.style, { padding: "10px", textAlign: "left" });
      th.textContent = t;
      thr.appendChild(th);
    });
    thead.appendChild(thr);
    histTable.appendChild(thead);
    const tbody = document.createElement("tbody");

    if (osAtivo.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.setAttribute("colspan", "5");
      Object.assign(td.style, { textAlign: "center", padding: "15px", color: "#5a6b89" });
      td.textContent = "Nenhuma ordem de serviço registrada.";
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      osAtivo.forEach(o => {
        const tr = document.createElement("tr");
        Object.assign(tr.style, { borderBottom: "1px solid rgba(255,255,255,0.04)" });
        const vOS = document.createElement("td");
        Object.assign(vOS.style, { padding: "8px", fontWeight: "600" });
        vOS.textContent = o.os;
        tr.appendChild(vOS);
        const vData = document.createElement("td");
        Object.assign(vData.style, { padding: "8px" });
        vData.textContent = formatarData(o.data);
        tr.appendChild(vData);
        const vSA = document.createElement("td");
        Object.assign(vSA.style, { padding: "8px", fontWeight: "600", color: "#f87171" });
        vSA.textContent = formatarMoeda(o.valorSA);
        tr.appendChild(vSA);
        const vTipo = document.createElement("td");
        Object.assign(vTipo.style, { padding: "8px" });
        vTipo.textContent = o.tipo;
        tr.appendChild(vTipo);
        const vDesc = document.createElement("td");
        Object.assign(vDesc.style, { padding: "8px", maxWidth: "250px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
        vDesc.textContent = o.descricao;
        vDesc.title = o.descricao;
        tr.appendChild(vDesc);
        tbody.appendChild(tr);
      });
    }
    histTable.appendChild(tbody);
    const histWrapper = document.createElement("div");
    Object.assign(histWrapper.style, { maxHeight: "250px", overflowY: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px" });
    histWrapper.appendChild(histTable);

    corpo.textContent = "";
    const specGrid = el("div", { className: "spec-grid" },
      el("div", { className: "spec-card" }, el("div", { className: "spec-title" }, "Fabricante"), el("div", { className: "spec-value" }, specs.fabricante)),
      el("div", { className: "spec-card" }, el("div", { className: "spec-title" }, "Modelo"), el("div", { className: "spec-value" }, specs.modelo)),
      el("div", { className: "spec-card" }, el("div", { className: "spec-title" }, "Ano Fab."), el("div", { className: "spec-value" }, specs.ano)),
      el("div", { className: "spec-card" }, el("div", { className: "spec-title" }, "Capacidade"), el("div", { className: "spec-value" }, specs.capacidade)),
      el("div", { className: "spec-card" }, el("div", { className: "spec-title" }, "Status Atual"), el("div", { className: "spec-value" }, el("span", { className: `status-badge status-${specs.status.toLowerCase()}` }, specs.status))),
      el("div", { className: "spec-card" }, el("div", { className: "spec-title" }, "Local Atual"), el("div", { className: "spec-value" }, specs.local)),
      el("div", { className: "spec-card", style: { gridColumn: "span 2" } }, el("div", { className: "spec-title" }, "Horímetro / Odômetro"), el("div", { className: "spec-value" }, specs.horimetro))
    );
    const specBox = el("div", { className: "eq-spec-box" },
      el("h3", null, el("i", { className: "fa-solid fa-circle-info" }), " Características do Ativo"),
      specGrid
    );

    const planBox = el("div", { className: "eq-plan-box" },
      el("h3", null, el("i", { className: "fa-solid fa-calendar-check" }), " Plano de Manutenção Ativo"),
      el("div", { className: "eq-plan-item" }, el("strong", null, "Tipo de Plano:"), el("span", null, specs.planoManutencao)),
      el("div", { className: "eq-plan-item" }, el("strong", null, "Próxima Revisão:"), el("span", { style: { color: "#eab308", fontWeight: "700" } }, "Preventiva Planejada")),
      el("div", { className: "eq-plan-item" }, el("strong", null, "Inspeção ART/Laudo:"), el("span", { style: { color: "#22c55e", fontWeight: "700" } }, "Válido / Regular"))
    );
    const costBox = el("div", { className: "eq-cost-box" },
      el("h3", null, el("i", { className: "fa-solid fa-file-invoice-dollar" }), " Resumo Financeiro"),
      el("div", { className: "eq-plan-item" }, el("strong", null, "Custo Acumulado OS:"), el("span", { style: { color: "#f87171", fontWeight: "700" } }, formatarMoeda(info.custoTotal))),
      el("div", { className: "eq-plan-item" }, el("strong", null, "Quantidade de OSs:"), el("span", { style: { fontWeight: "700" } }, `${info.totalOS} ordens`)),
      el("div", { className: "eq-plan-item" }, el("strong", null, "Ticket Médio OS:"), el("span", { style: { fontWeight: "700" } }, formatarMoeda(info.custoTotal / info.totalOS)))
    );

    const histHeading = el("h3", { style: { color: "#c8d0dc", fontSize: "16px", fontWeight: "700", marginBottom: "15px" } },
      el("i", { className: "fa-solid fa-clock-history" }), " Histórico de Ordens de Serviço (Custos)"
    );
    const histSection = el("div", { style: { marginTop: "30px" } }, histHeading, histWrapper);

    corpo.appendChild(el("div", { className: "eq-modal-grid" }, specBox, el("div", null, planBox, costBox)));
    corpo.appendChild(histSection);

    modal.style.display = "block";
}

export { carregarFrotaJson };
