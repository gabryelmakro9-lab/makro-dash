import * as XLSX from "xlsx";
import { dados, setDados } from "./state.js";
import { safeEl, parseValorMonetario, formatarMoeda, formatarData, converterDataExcel, mostrarStep } from "./utils.js";
import { supabaseSalvarDados, supabaseCarregarDados, apiGetUsers, apiGetUserByEmail, iniciarRealtime, isImportEmAndamento } from "./supabase.js";
import { completarLogin, verificarCodigo, reenviarCodigo, salvarPerfil, fazerLogout, abrirModalPerfil, aplicarPermissoes, atualizarBotaoPerfil, loginComGoogle, processarLoginGoogle } from "./auth.js";
import { currentUserRole } from "./state.js";
import { dadosFiltrados, atualizarDashboard, configurarOrdenacaoTabela, atualizarLiveLabel, popularFiltros, popularFiltroFilialEquipamento, abrirDrillDown, abrirAnalise, METAS, carregarMetas } from "./dashboard.js";
import { carregarFrotaJson, atualizarDashboardEquipamentos } from "./equipamentos.js";
import { renderizarConfigUsuarios, renderizarMetas } from "./config.js";
import { gerarRelatorioPDF } from "./pdf.js";
import { initLaudoGuindaste } from "./laudo-guindaste.js";
import { initLaudoMateriais } from "./laudo-materiais.js";
import { setAutoRefreshTimer, setCurrentUserRole, setCurrentUserEmail, setCurrentUserProfile } from "./state.js";
import { getSessaoGoogle } from "./supabase.js";

let autoRefreshTimer = null;

function normalizarDados() {
    if (!Array.isArray(dados) || dados.length === 0) {
        console.warn("normalizarDados: dados vazio ou invalido");
        return;
    }
    const colunasExcel = Object.keys(dados[0] || {}).map(c => c.trim());

    let normalizados = dados.map(linha => {
        const rowNormalized = {};
        Object.keys(linha).forEach(k => { rowNormalized[k.trim()] = linha[k]; });
        const valorSA = parseValorMonetario(rowNormalized["Valor SA total"]);
        const valorSC = parseValorMonetario(rowNormalized["Valor SC total"]);
        return {
            os: rowNormalized["Ordem Serv."] || "",
            valorSA, valorSC,
            bem: rowNormalized["Bem"] || "",
            sc: rowNormalized["SC"] || "",
            filial: rowNormalized["Filial"] || "",
            unidade: rowNormalized["Unidade"] || "",
            tipo: rowNormalized["Tipo"] || "",
            data: converterDataExcel(rowNormalized["Data"]),
            descricao: rowNormalized["Descrição"] || ""
        };
    });
    normalizados = normalizados.filter(l => l.valorSA > 0 || l.valorSC > 0);
    setDados(normalizados);
}

function salvarDadosLocal() {
    try {
        const dadosParaSalvar = dados.map(d => ({
            ...d,
            data: d.data instanceof Date && !isNaN(d.data.getTime()) ? d.data.toISOString() : null
        }));
        localStorage.setItem("makroDashboardDados", JSON.stringify(dadosParaSalvar));
    } catch (e) {
        console.warn("Não foi possível salvar dados localmente:", e.message);
    }
}

function carregarDadosLocal() {
    try {
        const raw = localStorage.getItem("makroDashboardDados");
        if (!raw) return false;
        setDados(JSON.parse(raw).map(d => ({ ...d, data: d.data ? new Date(d.data) : "" })));
        return dados.length > 0;
    } catch (e) {
        console.warn("Erro ao restaurar dados:", e.message);
        return false;
    }
}

function limparDadosLocal() {
    try { localStorage.removeItem("makroDashboardDados"); } catch (e) { }
}

async function processarArrayBuffer(arrayBuffer, salvar) {
    try {
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        setDados(rawData);
        if (dados.length === 0) {
            alert("A planilha não contém dados válidos.");
            return false;
        }
        normalizarDados();
        if (salvar) {
            salvarDadosLocal();
            try {
                await supabaseSalvarDados(dados);
            } catch (e) {
                console.error("Erro ao salvar no Supabase:", e);
                alert("A planilha foi carregada na tela, mas NAO foi salva no Supabase. Ao atualizar a pagina, os dados antigos podem voltar.\n\nDetalhes: " + e.message);
            }
        }
        try { popularFiltros(); } catch(e) { console.error("ERRO popularFiltros:", e); }
        try { if (typeof popularFiltroFilialEquipamento === "function") popularFiltroFilialEquipamento(); } catch(e) { console.error("ERRO popularFiltroFilialEquipamento:", e); }
        document.body.classList.add("loadingDashboard");
        atualizarDashboard();
        atualizarDashboardEquipamentos();
        setTimeout(() => {}, 2000);
        setTimeout(() => document.body.classList.remove("loadingDashboard"), 1200);
        return true;
    } catch (e) {
        console.error("ERRO FATAL ao processar planilha:", e);
        alert("Erro ao processar o arquivo Excel.\n\nDetalhes: " + e.message);
        return false;
    }
}

function carregarExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (currentUserRole !== "admin") {
        safeEl("loginErrorPrincipal").textContent = "Apenas administradores podem importar dados.";
        e.target.value = "";
        return;
    }
    const reader = new FileReader();
    reader.onload = function (evt) { processarArrayBuffer(evt.target.result, true); };
    reader.readAsArrayBuffer(file);
}

async function carregarExcelAutomatico() {
    try {
        const response = await fetch("./Pasta1.xlsx");
        if (!response.ok) return false;
        const buffer = await response.arrayBuffer();
        return processarArrayBuffer(buffer, true);
    } catch (e) {
        console.warn("Planilha padrão não encontrada no servidor.");
        return false;
    }
}

function on(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
    else console.warn("Elemento #" + id + " não encontrado para evento " + event);
}

// Event listeners
on("excelFile", "change", carregarExcel);

["filtroFilial", "filtroUnidade", "filtroTipo", "filtroMes"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", atualizarDashboard);
});

// LOGIN
on("loginBtnCode", "click", verificarCodigo);
on("loginCode", "keydown", (e) => { if (e.key === "Enter") verificarCodigo(); });
on("loginResendCode", "click", reenviarCodigo);
on("loginVoltarPrincipal", "click", (e) => { e.preventDefault(); mostrarStep("loginStepPrincipal"); });
on("loginBtn", "click", completarLogin);
on("loginPassword", "keydown", (e) => { if (e.key === "Enter") completarLogin(); });
on("loginEmail", "keydown", e => { if (e.key === "Enter") safeEl("loginPassword")?.focus(); });
on("loginBtnGoogle", "click", loginComGoogle);
on("loginBtnPerfil", "click", salvarPerfil);
on("loginSairPerfil", "click", (e) => { e.preventDefault(); fazerLogout(); });
on("regNome", "keydown", (e) => { if (e.key === "Enter") safeEl("regSobrenome")?.focus(); });
on("regSobrenome", "keydown", (e) => { if (e.key === "Enter") safeEl("regSetor")?.focus(); });

const btnPerfil = document.getElementById("btnPerfil");
if (btnPerfil) btnPerfil.addEventListener("click", abrirModalPerfil);

const fecharModalPerfil = document.getElementById("fecharModalPerfil");
if (fecharModalPerfil) fecharModalPerfil.addEventListener("click", () => {
    const modal = document.getElementById("modalPerfil");
    if (modal) modal.style.display = "none";
});

window.addEventListener("click", (e) => {
    const modal = document.getElementById("modalPerfil");
    if (e.target === modal && modal) modal.style.display = "none";
});

function iniciarAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
        if (dados.length === 0) return;
        atualizarDashboard();
        atualizarDashboardEquipamentos();
        atualizarLiveLabel();
    }, 30000);
}

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(console.warn);
}

// DOMContentLoaded - Initialization
window.addEventListener("DOMContentLoaded", () => {
    const loadingEl = document.getElementById("loadingOverlay");

    (async () => {
        const startTime = Date.now();

        const sessaoGoogle = await getSessaoGoogle();

        await carregarMetas();
        const frotaPromise = carregarFrotaJson();
        const carregou = await supabaseCarregarDados();
        if (carregou) {
            popularFiltros();
            popularFiltroFilialEquipamento();
            atualizarDashboard();
            atualizarDashboardEquipamentos();
        } else if (carregarDadosLocal()) {
            try { await supabaseSalvarDados(dados); } catch (e) {
                console.warn("Dados locais carregados, mas nao foi possivel atualizar o Supabase:", e);
            }
            popularFiltros();
            popularFiltroFilialEquipamento();
            atualizarDashboard();
            atualizarDashboardEquipamentos();
        } else {
            await carregarExcelAutomatico();
        }

        const elapsed = Date.now() - startTime;
        if (elapsed < 2000) {
            await new Promise(r => setTimeout(r, 2000 - elapsed));
        }

        if (loadingEl) loadingEl.classList.add("hidden");

        if (sessaoGoogle) {
            await processarLoginGoogle(sessaoGoogle);
            return;
        }

        const savedRole = localStorage.getItem("makroUserRole") || sessionStorage.getItem("makroUserRole");
        const savedEmail = localStorage.getItem("makroUserEmail") || sessionStorage.getItem("makroUserEmail");
        if (savedRole && savedEmail) {
            setCurrentUserRole(savedRole);
            setCurrentUserEmail(savedEmail);
            const overlay = safeEl("loginOverlay");
            if (overlay) overlay.style.display = "none";
            aplicarPermissoes();
            try {
                const user = await apiGetUserByEmail(savedEmail);
                if (user) {
                    setCurrentUserProfile(user);
                    if (user.role && user.role !== savedRole) {
                        setCurrentUserRole(user.role);
                        const storage = localStorage.getItem("makroUserRole") ? localStorage : sessionStorage;
                        storage.setItem("makroUserRole", user.role);
                        aplicarPermissoes();
                    }
                    atualizarBotaoPerfil();
                }
            } catch (e) {
                console.warn("Nao foi possivel carregar perfil:", e);
            }
        }
    })();

    configurarOrdenacaoTabela();
    iniciarAutoRefresh();
    initLaudoGuindaste();
    initLaudoMateriais();
    iniciarRealtime(() => {
        supabaseCarregarDados().then(carregou => {
            if (carregou) {
                popularFiltros();
                if (typeof popularFiltroFilialEquipamento === "function") popularFiltroFilialEquipamento();
                atualizarDashboard();
                atualizarDashboardEquipamentos();
            }
        });
    });

    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) btnLogout.addEventListener("click", fazerLogout);

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

    const btnAnalise = document.getElementById("btnAnalise");
    const modalAnalise = document.getElementById("modalAnalise");
    const fecharModal = document.getElementById("fecharModal");

    if (btnAnalise) btnAnalise.addEventListener("click", abrirAnalise);
    if (fecharModal) fecharModal.addEventListener("click", () => { if (modalAnalise) modalAnalise.style.display = "none"; });

    // Navigation
    const menuDashboard = document.getElementById("menuDashboard");
    const menuEquipamentos = document.getElementById("menuEquipamentos");
    const menuConfig = document.getElementById("menuConfiguracoes");
    const menuLaudoGuindaste = document.getElementById("menuLaudoGuindaste");
    const menuLaudoMateriais = document.getElementById("menuLaudoMateriais");
    const viewDashboard = document.getElementById("viewDashboard");
    const viewEquipamentos = document.getElementById("viewEquipamentos");
    const viewConfig = document.getElementById("viewConfiguracoes");
    const viewLaudoGuindaste = document.getElementById("viewLaudoGuindaste");
    const viewLaudoMateriais = document.getElementById("viewLaudoMateriais");

    function esconderViews() {
        [viewDashboard, viewEquipamentos, viewConfig, viewLaudoGuindaste, viewLaudoMateriais].forEach(v => { if (v) v.style.display = "none"; });
        [menuDashboard, menuEquipamentos, menuConfig, menuLaudoGuindaste, menuLaudoMateriais].forEach(m => { if (m) m.classList.remove("active"); });
    }

    if (menuDashboard && viewDashboard) {
        menuDashboard.addEventListener("click", (e) => {
            e.preventDefault();
            esconderViews();
            menuDashboard.classList.add("active");
            viewDashboard.style.display = "block";
        });
    }

    if (menuEquipamentos && viewEquipamentos) {
        menuEquipamentos.addEventListener("click", (e) => {
            e.preventDefault();
            esconderViews();
            menuEquipamentos.classList.add("active");
            viewEquipamentos.style.display = "block";
            atualizarDashboardEquipamentos();
        });
    }

    if (menuConfig && viewConfig) {
        menuConfig.addEventListener("click", async (e) => {
            e.preventDefault();
            esconderViews();
            menuConfig.classList.add("active");
            viewConfig.style.display = "block";
            await renderizarConfigUsuarios();
            renderizarMetas();
        });
    }

    if (menuLaudoGuindaste && viewLaudoGuindaste) {
        menuLaudoGuindaste.addEventListener("click", (e) => {
            e.preventDefault();
            esconderViews();
            menuLaudoGuindaste.classList.add("active");
            viewLaudoGuindaste.style.display = "block";
        });
    }

    if (menuLaudoMateriais && viewLaudoMateriais) {
        menuLaudoMateriais.addEventListener("click", (e) => {
            e.preventDefault();
            esconderViews();
            menuLaudoMateriais.classList.add("active");
            viewLaudoMateriais.style.display = "block";
        });
    }

    // Nav scroll arrows
    (function initNavScroll() {
        const wrapper = document.querySelector(".nav-links-wrapper");
        const container = document.querySelector(".nav-links");
        const btnLeft = document.querySelector(".nav-scroll-left");
        const btnRight = document.querySelector(".nav-scroll-right");
        if (!wrapper || !container || !btnLeft || !btnRight) return;

        const SCROLL_AMOUNT = 200;

        function updateArrows() {
            const canScrollLeft = container.scrollLeft > 4;
            const canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth - 4;
            btnLeft.classList.toggle("visible", canScrollLeft);
            btnRight.classList.toggle("visible", canScrollRight);
        }

        btnLeft.addEventListener("click", () => {
            container.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
        });
        btnRight.addEventListener("click", () => {
            container.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
        });

        container.addEventListener("scroll", updateArrows);
        window.addEventListener("resize", updateArrows);
        const observer = new MutationObserver(updateArrows);
        observer.observe(container, { childList: true, subtree: true });

        updateArrows();
        setTimeout(updateArrows, 100);
        setTimeout(updateArrows, 500);
    })();

    // Equipment filters
    const buscaEquip = document.getElementById("buscaEquipamento");
    const statusEquip = document.getElementById("filtroStatusEquipamento");
    const filialEquip = document.getElementById("filtroFilialEquipamento");

    if (buscaEquip) buscaEquip.addEventListener("input", atualizarDashboardEquipamentos);
    if (statusEquip) statusEquip.addEventListener("change", atualizarDashboardEquipamentos);
    if (filialEquip) filialEquip.addEventListener("change", atualizarDashboardEquipamentos);

    // Drill-down KPI
    document.querySelectorAll(".kpi-card[data-kpi]").forEach(card => {
        card.addEventListener("click", () => {
            const kpi = card.dataset.kpi;
            abrirDrillDown(kpi, dadosFiltrados());
        });
    });

    const fecharDrillDown = document.getElementById("fecharDrillDown");
    const modalDrill = document.getElementById("modalDrillDown");
    if (fecharDrillDown && modalDrill) {
        fecharDrillDown.addEventListener("click", () => { modalDrill.style.display = "none"; });
        window.addEventListener("click", (e) => { if (e.target === modalDrill) modalDrill.style.display = "none"; });
        window.addEventListener("keydown", (e) => { if (e.key === "Escape") modalDrill.style.display = "none"; });
    }

    const fecharModalEquipamento = document.getElementById("fecharModalEquipamento");
    const modalEquipamento = document.getElementById("modalEquipamento");
    if (fecharModalEquipamento && modalEquipamento) {
        fecharModalEquipamento.addEventListener("click", () => { modalEquipamento.style.display = "none"; });
    }

    window.addEventListener("click", (e) => {
        if (e.target === modalAnalise) modalAnalise.style.display = "none";
        if (modalEquipamento && e.target === modalEquipamento) modalEquipamento.style.display = "none";
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (modalAnalise) modalAnalise.style.display = "none";
            if (modalEquipamento) modalEquipamento.style.display = "none";
        }
    });

    // Export PDF
    const btnExportPDF = document.getElementById("btnExportPDF");
    if (btnExportPDF) {
        btnExportPDF.addEventListener("click", () => {
            try {
                if (dados.length === 0) { alert("Nenhum dado para exportar."); return; }
                const base = dadosFiltrados();
                const insights = document.querySelectorAll(".insight-item");
                gerarRelatorioPDF({
                    kpis: {
                        "Valor Total de Danos": formatarMoeda(dados.reduce((s, l) => s + l.valorSA, 0)),
                        "Qtd SA": dados.length,
                        "Ticket Médio": formatarMoeda(dados.reduce((s, l) => s + l.valorSA, 0) / (dados.length || 1)),
                    },
                    metas: METAS,
                    tabela: base.slice(0, 50).map(l => ({
                        OS: l.os, "Valor Danos": l.valorSA,
                        Bem: l.bem, Filial: l.filial, Unidade: l.unidade,
                        Tipo: l.tipo, Data: formatarData(l.data)
                    })),
                    insights: insights.length
                        ? [...insights].map(el => el.textContent?.trim()).filter(Boolean)
                        : ["Nenhum insight disponível no momento."]
                });
            } catch (e) {
                console.error("ERRO ao gerar PDF:", e);
                alert("Erro ao gerar PDF: " + e.message);
            }
        });
    } else {
        console.error("btnExportPDF NAO encontrado no DOM!");
    }

    // Export Excel
    const btnExport = document.getElementById("btnExportExcel");
    if (btnExport) {
        btnExport.addEventListener("click", () => {
            if (dados.length === 0) {
                alert("Nenhum dado para exportar. Importe uma planilha primeiro.");
                return;
            }
            const base = dadosFiltrados();
            if (base.length === 0) {
                alert("Nenhum registro corresponde aos filtros atuais.");
                return;
            }
            const linhas = base.map(l => ({
                "Ordem Serv.": l.os, "Valor Danos": l.valorSA,
                "Bem": l.bem, "SC": l.sc, "Filial": l.filial, "Unidade": l.unidade,
                "Tipo": l.tipo, "Data": formatarData(l.data), "Descrição": l.descricao
            }));
            const ws = XLSX.utils.json_to_sheet(linhas);
            ws["!cols"] = [{ wch: 15 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 14 }, { wch: 40 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Danos Filtrados");
            const dataHoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
            XLSX.writeFile(wb, `Makro_Danos_${dataHoje}.xlsx`);
        });
    }
});
