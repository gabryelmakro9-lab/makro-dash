import { currentUserRole, currentUserEmail } from "./state.js";
import { apiGetUsers, apiSetUserRole } from "./supabase.js";
import { METAS, salvarMetas, recarregarMetas, atualizarDashboard } from "./dashboard.js";
import { formatarMoeda } from "./utils.js";

const DEVELOPER_EMAIL = typeof __DEVELOPER_EMAIL__ !== "undefined" ? __DEVELOPER_EMAIL__ : "gabryel.silva@makroengenharia.com";

export async function renderizarMetas() {
    const container = document.getElementById("metasConfigContainer");
    if (!container) return;
    container.innerHTML = `
        <div class="card config-card" style="margin-top:20px;">
            <h3><i class="fa-solid fa-bullseye"></i> Metas e Alertas</h3>
            <p class="config-subtitle">Configure os valores de meta e alerta do dashboard.</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
                <div class="meta-field">
                    <label style="color:#8899b4;font-size:12px;font-weight:600;">Valor Estimado Total</label>
                    <input type="number" id="metaSA" value="${METAS.metaMensalSA}" style="width:100%;padding:11px 14px;border:1px solid #1a2540;border-radius:10px;background:#0d1225;color:#e8edf5;font-size:14px;margin-top:4px;">
                </div>
                <div class="meta-field">
                    <label style="color:#8899b4;font-size:12px;font-weight:600;">Meta Ticket Médio</label>
                    <input type="number" id="metaTicket" value="${METAS.metaTicketMedio}" style="width:100%;padding:11px 14px;border:1px solid #1a2540;border-radius:10px;background:#0d1225;color:#e8edf5;font-size:14px;margin-top:4px;">
                </div>
                <div class="meta-field">
                    <label style="color:#8899b4;font-size:12px;font-weight:600;">Gap Máximo Permitido</label>
                    <input type="number" id="metaGap" value="${METAS.metaGapMax}" style="width:100%;padding:11px 14px;border:1px solid #1a2540;border-radius:10px;background:#0d1225;color:#e8edf5;font-size:14px;margin-top:4px;">
                </div>
                <div class="meta-field">
                    <label style="color:#8899b4;font-size:12px;font-weight:600;">Limite Alerta Danos</label>
                    <input type="number" id="metaDano" value="${METAS.alertaLimiteDano}" style="width:100%;padding:11px 14px;border:1px solid #1a2540;border-radius:10px;background:#0d1225;color:#e8edf5;font-size:14px;margin-top:4px;">
                </div>
            </div>
            <button id="btnSalvarMetas" class="btn btn-success" style="margin-top:16px;padding:10px 24px;">
                <i class="fa-solid fa-floppy-disk"></i> Salvar Metas
            </button>
            <p id="metasFeedback" style="color:#22c55e;font-size:12px;margin-top:8px;min-height:18px;"></p>
        </div>`;

    const btnSalvar = document.getElementById("btnSalvarMetas");
    if (btnSalvar) {
        btnSalvar.addEventListener("click", async () => {
            const novasMetas = {
                metaMensalSA: parseFloat(document.getElementById("metaSA").value) || 0,
                metaTicketMedio: parseFloat(document.getElementById("metaTicket").value) || 0,
                metaGapMax: parseFloat(document.getElementById("metaGap").value) || 0,
                alertaLimiteDano: parseFloat(document.getElementById("metaDano").value) || 0,
            };
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
            await salvarMetas(novasMetas);
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Metas';
            const feedback = document.getElementById("metasFeedback");
            if (feedback) feedback.textContent = "Metas salvas com sucesso!";
            setTimeout(() => { if (feedback) feedback.textContent = ""; }, 3000);
            try { atualizarDashboard(); } catch (e) { console.warn("Erro ao atualizar dashboard:", e); }
        });
    }
}

export async function renderizarConfigUsuarios() {
    const container = document.getElementById("userRegistryTable");
    if (!container) return;
    if (currentUserEmail !== DEVELOPER_EMAIL) {
        container.innerHTML = "";
        return;
    }
    container.innerHTML = `<div class="registry-empty">Carregando...</div>`;

    const registry = await apiGetUsers();
    const emails = Object.keys(registry).sort();

    if (emails.length === 0) {
        container.innerHTML = `<div class="registry-empty">Nenhum usuário registrado ainda.</div>`;
        return;
    }

    const isDeveloper = currentUserEmail === DEVELOPER_EMAIL;
    let html = `<table class="user-registry"><thead><tr><th>Usuário</th><th>E-mail</th><th>Papel</th><th>Último Acesso` +
        (isDeveloper ? `<th>Ação</th>` : ``) +
        `</tr></thead><tbody>`;

    emails.forEach(email => {
        const u = registry[email];
        const isDev = email === DEVELOPER_EMAIL;
        const nome = u.name || email.split("@")[0].replace(".", " ");
        const ultimo = u.last_login ? new Date(u.last_login).toLocaleString("pt-BR") : "-";
        const roleLabel = isDev ? "admin" : u.role;
        const devBadge = isDev ? ' <span class="dev-badge">Desenvolvedor</span>' : "";
        const adminActive = u.role === "admin" ? "active" : "";
        const viewerActive = u.role === "viewer" ? "active" : "";
        html += `<tr>
            <td><strong>${nome}${devBadge}</strong></td>
            <td style="color:#5a6b89;">${email}</td>
            <td><span style="text-transform:capitalize;font-weight:600;">${roleLabel}</span></td>
            <td style="color:#5a6b89;font-size:13px;">${ultimo}</td>` +
            (isDeveloper ? `<td>
                <div class="role-selector">
                    <button class="role-sel-btn ${adminActive}" data-email="${email}" data-role="admin">Admin</button>
                    <button class="role-sel-btn ${viewerActive}" data-email="${email}" data-role="viewer">Visualizador</button>
                </div>
            </td>` : ``) +
        `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    // Delegacao de eventos para evitar listeners duplicados
    container.addEventListener("click", async (e) => {
        const btn = e.target.closest(".role-sel-btn");
        if (!btn || btn.disabled) return;
        const email = btn.dataset.email;
        const newRole = btn.dataset.role;
        const reg = await apiGetUsers();
        if (!reg[email]) return;
        if (reg[email].role === newRole) return;
        btn.disabled = true;
        const ok = await apiSetUserRole(email, newRole);
        if (!ok) {
            alert("Erro ao alterar permissão. Verifique se você está logado como administrador.");
            renderizarConfigUsuarios();
            return;
        }
        renderizarConfigUsuarios();
    });
}
