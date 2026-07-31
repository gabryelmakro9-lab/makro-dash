import { safeEl } from "./utils.js";
import { getAuthHeaders as supabaseAuthHeaders } from "./supabase.js";
import { carregarFrota, criarAutocomplete, getFrotaItem } from "./frota-autocomplete.js";

const SUPABASE_URL = typeof __SUPABASE_URL__ !== "undefined" ? __SUPABASE_URL__ : "";
const SUPABASE_ANON = typeof __SUPABASE_ANON__ !== "undefined" ? __SUPABASE_ANON__ : "";

const CHECKLIST_ITENS = [
  { id: "estrutura_lanca", label: "Estrutura / Lança", sub: "Trincas, deformações, corrosão e pintura" },
  { id: "cabos_aco", label: "Cabos de Aço", sub: "Fios rompidos, redução de diâmetro, alma exposta, corrosão, terminais e pregagem" },
  { id: "gancho", label: "Gancho", sub: "Abertura, trava de segurança, deformação, giro livre e rolamento" },
  { id: "sistema_hidraulico", label: "Sistema Hidráulico", sub: "Mangueiras, cilindros, vazamentos, nível e pressão do óleo" },
  { id: "freios", label: "Freios", sub: "Estado geral das lonas, discos, regulagem e sistema de acionamento" },
  { id: "limitadores", label: "Limitadores e Segurança", sub: "LMI / TLM, fim de curso, alarmes e sensores" },
  { id: "estabilizadores", label: "Estabilizadores", sub: "Pernas hidráulicas, sapatas, cilindros e travamento" },
  { id: "sistema_giro", label: "Sistema de Giro", sub: "Coroa, pinhão, rolamento de giro e redução" },
  { id: "painel_eletrica", label: "Painel e Elétrica", sub: "Comandos, sinalização, cabos elétricos e baterias" },
  { id: "pneus_rodagem", label: "Pneus e Rodagem", sub: "Estado dos pneus, pressão, estepe e para-lamas" },
  { id: "iluminacao", label: "Iluminação e Sinalização", sub: "Faróis, lanternas, alarme de ré e buzina" },
  { id: "documentacao", label: "Documentação", sub: "Manuais, certificados, plano de manutenção e registro" }
];

const STATUS_CORES = {
  "Aprovado": { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.3)" },
  "Aprovado com Restrições": { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  "Reprovado": { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" }
};

const SUBITENS_PADRAO = {
  estrutura_lanca: ["Lança Telescópica", "Lança Treliçada", "Contra-lança (Jib)", "Torre / Mastro", "Linha de Vida", "Chassis / Base"],
  cabos_aco: ["Cabo Principal (Elevação)", "Cabo Auxiliar", "Cabo do Carrinho", "Terminal / Pregagem", "Tambor / Enrolamento"],
  gancho: ["Gancho Principal", "Gancho Auxiliar", "Trava de Segurança", "Rolamento / Giro"],
  sistema_hidraulico: ["Cilindro", "Mangueira", "Válvula / Bloco", "Bomba", "Motor Hidráulico", "Reservatório / Nível"],
  freios: ["Freio de Elevação", "Freio de Giro", "Freio de Translação", "Sistema de Acionamento"],
  limitadores: ["LMI / TLM", "Fim de Curso", "Alarmes / Sensores", "Chave de Segurança"],
  estabilizadores: ["Perna Hidráulica", "Sapata / Base", "Travamento", "Cilindro de Estabilização"],
  sistema_giro: ["Coroa de Giro", "Pinhão", "Rolamento", "Redução / Motor"],
  painel_eletrica: ["Painel de Comando", "Sinalização (LEDs)", "Cabos Elétricos", "Baterias", "Alarmes"],
  pneus_rodagem: ["Pneu Dianteiro", "Pneu Traseiro", "Estepe", "Para-lamas", "Suspensão"],
  iluminacao: ["Faróis", "Lanternas", "Alarme de Ré", "Buzina", "Sinalização Rotativa"],
  documentacao: ["Manuais do Operador", "Certificado de Inspeção", "Plano de Manutenção", "Registro de Inspeções Anteriores"]
};

let laudosSalvos = [];
let currentLaudoId = null;

function gerarNumeroLaudo() {
  const a = new Date();
  const tipo = (safeEl("lgTipo")?.value || "Guindaste") === "Guindaste" ? "LDG" : "LGD";
  return `${tipo}-${a.getFullYear()}${String(a.getMonth()+1).padStart(2,"0")}${String(a.getDate()).padStart(2,"0")}-${String(a.getHours()).padStart(2,"0")}${String(a.getMinutes()).padStart(2,"0")}`;
}
function hojeISO() { return new Date().toISOString().split("T")[0]; }
async function compressImage(file) {
  const isHeic = /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
  if (isHeic) {
    let bitmap;
    try { bitmap = await createImageBitmap(file); } catch {}
    if (!bitmap && typeof window.heic2any === "function") {
      const converted = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.6 });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      if (blob) bitmap = await createImageBitmap(blob);
    }
    if (!bitmap) throw new Error("HEIC não suportado neste navegador. Instale a extensão 'HEIF Image Extensions' da Microsoft Store ou use fotos JPEG/PNG.");
    const c = document.createElement("canvas");
    let w = bitmap.width, h = bitmap.height;
    if (w > h) { if (w > 800) { h *= 800/w; w = 800; } }
    else { if (h > 800) { w *= 800/h; h = 800; } }
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return c.toDataURL("image/jpeg", 0.6);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = e => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const c = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > h) { if (w > 800) { h *= 800/w; w = 800; } }
        else { if (h > 800) { w *= 800/h; h = 800; } }
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

function getChecklistState() {
  const state = {};
  CHECKLIST_ITENS.forEach(item => {
    const cb = document.getElementById(`incluir_${item.id}`);
    const sel = document.querySelector(`input[name="chk_${item.id}"]:checked`);
    const subContainer = document.getElementById(`subitens_${item.id}`);
    let subitens = [];
    if (subContainer) {
      subContainer.querySelectorAll(".sub-item").forEach(si => {
        const nomeEl = si.querySelector(".si-nome");
        const obsEl = si.querySelector(".si-obs");
        const fotosEl = si.querySelector(".si-fotos");
        const nome = nomeEl ? nomeEl.value : "";
        const observacao = obsEl ? obsEl.value : "";
        const fotos = fotosEl ? JSON.parse(fotosEl.dataset.fotos || "[]") : [];
        if (nome) subitens.push({ nome, observacao, fotos });
      });
    }
    state[item.id] = {
      incluido: cb ? cb.checked : true,
      status: sel ? sel.value : "Aprovado",
      subitens
    };
  });
  return state;
}

function setChecklistState(state) {
  CHECKLIST_ITENS.forEach(item => {
    const s = state?.[item.id] || { incluido: true, status: "Aprovado", subitens: [] };
    const cb = document.getElementById(`incluir_${item.id}`);
    if (cb) { cb.checked = s.incluido !== false; toggleItemInclusao(item.id, s.incluido !== false); }
    const r = document.querySelector(`input[name="chk_${item.id}"][value="${s.status}"]`);
    if (r) r.checked = true;

    let subitens = s.subitens;
    if (subitens && subitens.length > 0) {
      renderSubitens(item.id, subitens);
    } else {
      const subContainer = document.getElementById(`subitens_${item.id}`);
      if (subContainer) subContainer.innerHTML = "";
    }
  });
  updateRadioStyles();
}

function toggleItemInclusao(itemId, incluir) {
  const card = document.getElementById(`ci_${itemId}`);
  if (!card) return;
  const body = card.querySelector(".ci-body");
  if (body) body.style.display = incluir ? "" : "none";
  card.style.opacity = incluir ? "1" : "0.35";
}

function renderSubitens(itemId, subitens) {
  const container = document.getElementById(`subitens_${itemId}`);
  if (!container) return;
  container.innerHTML = subitens.map((si, idx) => {
    if (!si) return "";
    const nome = si.nome || "";
    const observacao = si.observacao || "";
    const fotos = si.fotos || [];
    return `<div class="sub-item" data-sub-idx="${idx}" style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.04);border-radius:8px;padding:10px;margin-bottom:8px;">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
        <select class="si-nome" style="flex:1;padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);color:#e2e8f0;font-size:12px;">
          ${SUBITENS_PADRAO[itemId] ? SUBITENS_PADRAO[itemId].map(c => `<option value="${c}" ${c===nome?"selected":""}>${c}</option>`).join("") : ""}
          <option value="__outro__" ${SUBITENS_PADRAO[itemId]&&SUBITENS_PADRAO[itemId].includes(nome)?"":"selected"}>Outro...</option>
        </select>
        <input class="si-nome-outro" type="text" placeholder="Nome do componente" value="${SUBITENS_PADRAO[itemId]&&SUBITENS_PADRAO[itemId].includes(nome)?"":nome}" style="${SUBITENS_PADRAO[itemId]&&SUBITENS_PADRAO[itemId].includes(nome)?"display:none;":"flex"};flex:1;padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);color:#e2e8f0;font-size:12px;">
        <button type="button" class="rm-sub" data-item="${itemId}" style="background:rgba(239,68,68,0.3);color:#ef4444;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">&times;</button>
      </div>
      <textarea class="si-obs" rows="1" placeholder="Observação deste componente..." style="width:100%;padding:5px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.25);color:#e2e8f0;font-size:11px;resize:none;outline:none;box-sizing:border-box;margin-bottom:6px;">${observacao}</textarea>
      <div class="si-fotos" data-fotos='${JSON.stringify(fotos)}'>
        <label style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:1px dashed rgba(255,255,255,0.08);cursor:pointer;font-size:10px;color:rgba(136,153,180,0.6);background:rgba(0,0,0,0.15);transition:all 0.2s;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Fotos
          <input type="file" accept="image/*,.heic,.heif" multiple hidden class="sif" data-item="${itemId}" data-idx="${idx}">
        </label>
        <div class="si-fotos-preview" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px;">
          ${fotos.map((f, fi) => `<div style="position:relative;border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);">
            <img src="${f}" style="max-width:100%;height:auto;display:block;">
            <button type="button" class="rsf" data-item="${itemId}" data-idx="${idx}" data-fi="${fi}" style="position:absolute;top:1px;right:1px;background:rgba(239,68,68,0.85);color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;line-height:1;backdrop-filter:blur(4px);">&times;</button>
          </div>`).join("")}
        </div>
      </div>
    </div>`;
  }).join("");

  container.querySelectorAll(".si-nome").forEach(sel => {
    sel.addEventListener("change", function() {
      const si = this.closest(".sub-item");
      const outro = si.querySelector(".si-nome-outro");
      if (this.value === "__outro__") {
        outro.style.display = "flex";
        outro.focus();
      } else {
        outro.style.display = "none";
        outro.value = "";
      }
    });
  });

  container.querySelectorAll(".rm-sub").forEach(btn => {
    btn.addEventListener("click", () => {
      const si = btn.closest(".sub-item");
      si.remove();
    });
  });

  container.querySelectorAll(".sif").forEach(inp => {
    inp.addEventListener("change", async e => {
      const itemId = e.target.dataset.item;
      const idx = parseInt(e.target.dataset.idx);
      const si = e.target.closest(".sub-item");
      const fotosEl = si.querySelector(".si-fotos");
      const arr = JSON.parse(fotosEl.dataset.fotos || "[]");
      for (const f of Array.from(e.target.files)) {
        try { arr.push(await compressImage(f)); } catch (err) { console.error(err); alert("Erro ao processar foto: " + (err.message || err)); }
      }
      fotosEl.dataset.fotos = JSON.stringify(arr);
      const pv = si.querySelector(".si-fotos-preview");
      pv.innerHTML = arr.map((f, fi) => `<div style="position:relative;border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);">
        <img src="${f}" style="max-width:100%;height:auto;display:block;">
        <button type="button" class="rsf" data-item="${itemId}" data-idx="${idx}" data-fi="${fi}" style="position:absolute;top:1px;right:1px;background:rgba(239,68,68,0.85);color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;line-height:1;backdrop-filter:blur(4px);">&times;</button>
      </div>`).join("");
      pv.querySelectorAll(".rsf").forEach(b => b.addEventListener("click", () => {
        const a = JSON.parse(fotosEl.dataset.fotos || "[]");
        a.splice(parseInt(b.dataset.fi), 1);
        fotosEl.dataset.fotos = JSON.stringify(a);
        b.closest("div").remove();
      }));
      e.target.value = "";
    });
  });
}

function updateRadioStyles() {
  document.querySelectorAll("#lgChecklistContainer .check-option").forEach(lb => {
    const inp = lb.querySelector("input[type=radio]");
    if (!inp) return;
    const cor = STATUS_CORES[inp.value] || STATUS_CORES["Aprovado"];
    lb.style.background = inp.checked ? cor.bg : "rgba(30,41,59,0.5)";
    lb.style.color = inp.checked ? cor.text : "rgba(136,153,180,0.5)";
    lb.style.borderColor = inp.checked ? cor.border : "transparent";
    lb.style.boxShadow = inp.checked ? `0 0 12px ${cor.border}` : "none";
  });
}

function renderChecklist() {
  const container = safeEl("lgChecklistContainer");
  if (!container) return;
  container.innerHTML = CHECKLIST_ITENS.map(item => {
    const eid = `chk_${item.id}`;
    const sel = document.querySelector(`input[name="${eid}"]:checked`);
    const val = sel ? sel.value : "Aprovado";
    const def = { Aprovado: '', 'Aprovado com Restrições': '', Reprovado: '' };
    def[val] = 'checked';
    return `<div class="ci" id="ci_${item.id}" style="background:linear-gradient(135deg,rgba(13,18,37,0.95),rgba(20,30,55,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;backdrop-filter:blur(8px);transition:all 0.2s;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div style="flex:1;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="incluir_${item.id}" checked style="width:16px;height:16px;accent-color:#D4AF37;cursor:pointer;">
            <div>
              <div style="font-weight:700;font-size:14px;color:#f1f5f9;letter-spacing:-0.3px;user-select:none;">${item.label}</div>
              <div style="font-size:11px;color:rgba(136,153,180,0.7);margin-top:2px;user-select:none;">${item.sub}</div>
            </div>
          </label>
        </div>
      </div>
      <div class="ci-body">
        <div style="display:flex;gap:6px;margin-bottom:10px;">
          <label class="check-option" style="flex:1;text-align:center;padding:6px 4px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;border:1px solid transparent;transition:all 0.2s;background:rgba(30,41,59,0.5);color:rgba(136,153,180,0.5);letter-spacing:-0.2px;">
            <input type="radio" name="${eid}" value="Aprovado" ${def.Aprovado} style="display:none;"> ✅ Aprovado
          </label>
          <label class="check-option" style="flex:1;text-align:center;padding:6px 4px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;border:1px solid transparent;transition:all 0.2s;background:rgba(30,41,59,0.5);color:rgba(136,153,180,0.5);letter-spacing:-0.2px;">
            <input type="radio" name="${eid}" value="Aprovado com Restrições" ${def['Aprovado com Restrições']} style="display:none;"> ⚠️ Restrições
          </label>
          <label class="check-option" style="flex:1;text-align:center;padding:6px 4px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;border:1px solid transparent;transition:all 0.2s;background:rgba(30,41,59,0.5);color:rgba(136,153,180,0.5);letter-spacing:-0.2px;">
            <input type="radio" name="${eid}" value="Reprovado" ${def.Reprovado} style="display:none;"> ❌ Reprovado
          </label>
        </div>
        <div id="subitens_${item.id}"></div>
        <button type="button" class="add-sub" data-item="${item.id}" style="margin-top:6px;background:rgba(212,175,55,0.1);color:#D4AF37;border:1px dashed rgba(212,175,55,0.2);border-radius:8px;padding:6px 14px;cursor:pointer;font-size:11px;font-weight:600;transition:all 0.2s;width:100%;">+ Adicionar Componente</button>
      </div>
    </div>`;
  }).join("");

  container.querySelectorAll(".add-sub").forEach(btn => {
    btn.addEventListener("click", () => {
      const itemId = btn.dataset.item;
      const subContainer = document.getElementById(`subitens_${itemId}`);
      if (!subContainer) return;
      const idx = subContainer.children.length;
      const div = document.createElement("div");
      div.className = "sub-item";
      div.innerHTML = `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
        <select class="si-nome" style="flex:1;padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);color:#e2e8f0;font-size:12px;">
          ${SUBITENS_PADRAO[itemId] ? SUBITENS_PADRAO[itemId].map(c => `<option value="${c}">${c}</option>`).join("") : ""}
          <option value="__outro__">Outro...</option>
        </select>
        <input class="si-nome-outro" type="text" placeholder="Nome do componente" style="display:none;flex:1;padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);color:#e2e8f0;font-size:12px;">
        <button type="button" class="rm-sub" style="background:rgba(239,68,68,0.3);color:#ef4444;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">&times;</button>
      </div>
      <textarea class="si-obs" rows="1" placeholder="Observação deste componente..." style="width:100%;padding:5px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.25);color:#e2e8f0;font-size:11px;resize:none;outline:none;box-sizing:border-box;margin-bottom:6px;"></textarea>
      <div class="si-fotos" data-fotos='[]'>
        <label style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:1px dashed rgba(255,255,255,0.08);cursor:pointer;font-size:10px;color:rgba(136,153,180,0.6);background:rgba(0,0,0,0.15);transition:all 0.2s;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Fotos
          <input type="file" accept="image/*,.heic,.heif" multiple hidden class="sif" data-item="${itemId}">
        </label>
        <div class="si-fotos-preview" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px;"></div>
      </div>`;
      subContainer.appendChild(div);

      div.querySelector(".si-nome").addEventListener("change", function() {
        const si = this.closest(".sub-item");
        const outro = si.querySelector(".si-nome-outro");
        if (this.value === "__outro__") {
          outro.style.display = "flex";
          outro.focus();
        } else {
          outro.style.display = "none";
          outro.value = "";
        }
      });

      div.querySelector(".rm-sub").addEventListener("click", () => div.remove());

      div.querySelector(".sif").addEventListener("change", async e => {
        const fotosEl = e.target.closest(".sub-item").querySelector(".si-fotos");
        const arr = JSON.parse(fotosEl.dataset.fotos || "[]");
        for (const f of Array.from(e.target.files)) {
          try { arr.push(await compressImage(f)); } catch (err) { console.error(err); alert("Erro ao processar foto: " + (err.message || err)); }
        }
        fotosEl.dataset.fotos = JSON.stringify(arr);
        const pv = e.target.closest(".sub-item").querySelector(".si-fotos-preview");
        pv.innerHTML = arr.map((f, fi) => `<div style="position:relative;border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);">
          <img src="${f}" style="max-width:100%;height:auto;display:block;">
          <button type="button" class="rsf" data-fi="${fi}" style="position:absolute;top:1px;right:1px;background:rgba(239,68,68,0.85);color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;line-height:1;backdrop-filter:blur(4px);">&times;</button>
        </div>`).join("");
        pv.querySelectorAll(".rsf").forEach(b => b.addEventListener("click", () => {
          const a = JSON.parse(fotosEl.dataset.fotos || "[]");
          a.splice(parseInt(b.dataset.fi), 1);
          fotosEl.dataset.fotos = JSON.stringify(a);
          b.closest("div").remove();
        }));
        e.target.value = "";
      });
    });
  });

  container.querySelectorAll(`[id^="incluir_"]`).forEach(cb => {
    cb.addEventListener("change", () => {
      const itemId = cb.id.replace("incluir_", "");
      toggleItemInclusao(itemId, cb.checked);
    });
  });

  container.querySelectorAll("input[type=radio]").forEach(r => {
    r.addEventListener("change", updateRadioStyles);
  });
  updateRadioStyles();
}

function getFormData() {
  return {
    numeroLaudo: safeEl("lgNumeroLaudo")?.textContent || gerarNumeroLaudo(),
    tipo: safeEl("lgTipo")?.value || "Guindaste",
    frota: safeEl("lgFrota")?.value || "",
    modelo: safeEl("lgModelo")?.value || "",
    capacidade: safeEl("lgCapacidade")?.value || "",
    serie: safeEl("lgSerie")?.value || "",
    ano: safeEl("lgAno")?.value || "",
    unidade: safeEl("lgUnidade")?.value || "",
    dataInspecao: safeEl("lgDataInspecao")?.value || "",
    inspetor: safeEl("lgInspetor")?.value || "",
    crea: safeEl("lgCrea")?.value || "",
    art: safeEl("lgArt")?.value || "",
    observacoes: safeEl("lgObservacoes")?.value || "",
    parecer: safeEl("lgParecer")?.value || "Aprovado",
    recomendacoes: safeEl("lgRecomendacoes")?.value || "",
    checklist: getChecklistState()
  };
}

function setFormData(data) {
  [
    ["lgTipo","tipo"],["lgFrota","frota"],["lgModelo","modelo"],["lgCapacidade","capacidade"],
    ["lgSerie","serie"],["lgAno","ano"],["lgUnidade","unidade"],
    ["lgDataInspecao","dataInspecao"],["lgInspetor","inspetor"],
    ["lgCrea","crea"],["lgArt","art"],
    ["lgObservacoes","observacoes"],["lgParecer","parecer"],["lgRecomendacoes","recomendacoes"]
  ].forEach(([id,k]) => { const el = safeEl(id); if (el && data[k] !== undefined) el.value = data[k]; });
  if (data.checklist) setChecklistState(data.checklist);
}

async function supabaseSalvarLaudoGuindaste(data) {
  const url = SUPABASE_URL + "/rest/v1/laudos_guindaste";
  const h = await supabaseAuthHeaders(true);
  h["Prefer"] = "return=representation";
  const p = { tipo: data.tipo, numero_laudo: data.numeroLaudo, frota: data.frota, modelo: data.modelo, capacidade: data.capacidade, serie: data.serie, ano: data.ano, unidade: data.unidade, data_inspecao: data.dataInspecao, inspetor: data.inspetor, crea: data.crea, art: data.art, observacoes: data.observacoes, parecer: data.parecer, recomendacoes: data.recomendacoes, checklist: JSON.stringify(data.checklist), updated_at: new Date().toISOString() };
  if (currentLaudoId) {
    const r = await fetch(url + "?id=eq." + currentLaudoId, { method: "PATCH", headers: h, body: JSON.stringify(p) });
    if (!r.ok) throw new Error("Falha ao atualizar (" + r.status + ")");
  } else {
    const r = await fetch(url, { method: "POST", headers: h, body: JSON.stringify(p) });
    if (!r.ok) throw new Error("Falha ao salvar (" + r.status + ")");
    try { const j = await r.json(); if (j && j.length > 0) currentLaudoId = j[0].id; } catch(e) {
      // fallback: buscar pelo numero_laudo
      try { const r2 = await fetch(url + "?numero_laudo=eq." + encodeURIComponent(data.numeroLaudo) + "&select=id&order=created_at.desc&limit=1", { headers: h }); if (r2.ok) { const j2 = await r2.json(); if (j2 && j2.length > 0) currentLaudoId = j2[0].id; } } catch(e2) {}
    }
  }
}

async function supabaseCarregarLaudosGuindaste() {
  try { const h = await supabaseAuthHeaders(); const r = await fetch(SUPABASE_URL + "/rest/v1/laudos_guindaste?order=updated_at.desc", { headers: h }); if (!r.ok) return []; return await r.json(); } catch (e) { return []; }
}

async function supabaseDeletarLaudoGuindaste(id) {
  const h = await supabaseAuthHeaders(true); const r = await fetch(SUPABASE_URL + "/rest/v1/laudos_guindaste?id=eq." + id, { method: "DELETE", headers: h }); return r.ok;
}

function limparFormulario() {
  ["lgFrota","lgModelo","lgCapacidade","lgSerie","lgAno","lgInspetor","lgCrea","lgArt","lgObservacoes","lgRecomendacoes"].forEach(id => { const el = safeEl(id); if (el) el.value = ""; });
  const tp = safeEl("lgTipo"); if (tp) tp.value = "Guindaste";
  const u = safeEl("lgUnidade"); if (u) u.value = "Matriz";
  const d = safeEl("lgDataInspecao"); if (d) d.value = hojeISO();
  const p = safeEl("lgParecer"); if (p) p.value = "Aprovado";
  currentLaudoId = null;
  CHECKLIST_ITENS.forEach(item => {
    const sc = document.getElementById(`subitens_${item.id}`);
    if (sc) sc.innerHTML = "";
  });
  setChecklistState({});
}

function migrarChecklist(checklist) {
  const novo = {};
  CHECKLIST_ITENS.forEach(item => {
    const s = checklist?.[item.id];
    if (!s) { novo[item.id] = { incluido: true, status: "Aprovado", subitens: [] }; return; }
    if (s.subitens) {
      novo[item.id] = s;
    } else {
      const fotos = s.fotos || [];
      const obs = s.observacao || "";
      const subitens = [];
      if (obs || fotos.length > 0) {
        subitens.push({ nome: "Geral", observacao: obs, fotos });
      }
      novo[item.id] = { incluido: s.incluido !== false, status: s.status || "Aprovado", subitens };
    }
  });
  return novo;
}

function loadLaudo(laudo) {
  currentLaudoId = laudo.id;
  const raw = typeof laudo.checklist === "string" ? JSON.parse(laudo.checklist) : (laudo.checklist || {});
  setFormData({
    ...laudo,
    numeroLaudo: laudo.numero_laudo,
    tipo: laudo.tipo || "Guindaste",
    dataInspecao: laudo.data_inspecao,
    observacoes: laudo.observacoes,
    recomendacoes: laudo.recomendacoes,
    checklist: migrarChecklist(raw)
  });
  const nl = safeEl("lgNumeroLaudo");
  if (nl) nl.textContent = laudo.numero_laudo;
}

function renderHistoricoModal() {
  const body = safeEl("historicoLaudoGuindasteBody");
  if (!body) return;
  body.innerHTML = `<div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:rgba(30,41,59,0.5);color:rgba(136,153,180,0.8);">
        <th style="padding:10px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);">Nº Laudo</th>
        <th style="padding:10px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);">Tipo</th>
        <th style="padding:10px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);">Frota</th>
        <th style="padding:10px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);">Modelo</th>
        <th style="padding:10px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);">Data</th>
        <th style="padding:10px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);">Inspetor</th>
        <th style="padding:10px 12px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">Parecer</th>
        <th style="padding:10px 12px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">Ações</th>
      </tr></thead>
      <tbody>${laudosSalvos.length === 0 ? '<tr><td colspan="8" style="padding:40px;text-align:center;color:rgba(136,153,180,0.5);">Nenhum laudo salvo.</td></tr>' : laudosSalvos.map(l => {
        const cor = STATUS_CORES[l.parecer || "Aprovado"];
        const tipoLabel = l.tipo || "Guindaste";
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s;">
          <td style="padding:10px 12px;font-weight:700;color:#D4AF37;font-family:monospace;">${l.numero_laudo}</td>
          <td style="padding:10px 12px;color:#e2e8f0;"><span style="background:rgba(212,175,55,0.1);color:#D4AF37;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;">${tipoLabel}</span></td>
          <td style="padding:10px 12px;color:#e2e8f0;">${l.frota || "-"}</td>
          <td style="padding:10px 12px;color:#e2e8f0;">${l.modelo || "-"}</td>
          <td style="padding:10px 12px;color:rgba(255,255,255,0.6);">${l.data_inspecao || "-"}</td>
          <td style="padding:10px 12px;color:#e2e8f0;">${l.inspetor || "-"}</td>
          <td style="padding:10px 12px;text-align:center;"><span style="background:${cor.bg};color:${cor.text};padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid ${cor.border};">${l.parecer || "Aprovado"}</span></td>
          <td style="padding:10px 12px;text-align:center;">
            <button class="ll" data-id="${l.id}" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.2);padding:5px 14px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;margin-right:6px;transition:all 0.15s;">Carregar</button>
            <button class="dl" data-id="${l.id}" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.2);padding:5px 14px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;transition:all 0.15s;">Excluir</button>
          </td>
        </tr>`;
      }).join("")}</tbody>
    </table>
  </div>`;
  body.querySelectorAll(".ll").forEach(b => b.addEventListener("click", () => {
    const laudo = laudosSalvos.find(l => String(l.id) === b.dataset.id);
    if (laudo) { loadLaudo(laudo); safeEl("laudoGuindasteForm").style.display = "block"; safeEl("modalHistoricoLaudoGuindaste").style.display = "none"; }
  }));
  body.querySelectorAll(".dl").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Excluir permanentemente?")) return;
    await supabaseDeletarLaudoGuindaste(b.dataset.id);
    if (currentLaudoId === b.dataset.id) { currentLaudoId = null; limparFormulario(); }
    laudosSalvos = laudosSalvos.filter(l => String(l.id) !== b.dataset.id);
    renderHistoricoModal();
    const q = safeEl("qtdeLaudosGuindaste"); if (q) q.textContent = laudosSalvos.length;
  }));
}

function bindFrotaAutocomplete() {
  const input = safeEl("lgFrota");
  if (!input || input.dataset.autocompleteBound) return;
  input.dataset.autocompleteBound = "1";
  input.autocomplete = "off";
  criarAutocomplete(input, item => {
    const modelo = safeEl("lgModelo");
    const serie = safeEl("lgSerie");
    const ano = safeEl("lgAno");
    if (modelo) modelo.value = item.Descrição || item["Nome do Bem"] || "";
    if (serie) serie.value = item.Série || item["Série"] || "";
    if (ano) ano.value = item["Ano Fabric."] || item["Ano Fabricação"] || "";
  });
}

export async function initLaudoGuindaste() {
  const form = safeEl("laudoGuindasteForm");
  const di = safeEl("lgDataInspecao"); if (di) di.value = hojeISO();
  renderChecklist();
  await carregarFrota();
  bindFrotaAutocomplete();

  safeEl("btnNovoLaudoGuindaste")?.addEventListener("click", () => { limparFormulario(); form.style.display = "block"; form.scrollIntoView({ behavior: "smooth" }); });
  safeEl("btnSalvarLaudoGuindaste")?.addEventListener("click", async () => {
    const d = getFormData();
    if (!d.frota) return alert("Informe a frota.");
    if (!d.modelo) return alert("Informe o modelo.");
    if (!d.inspetor) return alert("Informe o inspetor.");
    try {
      await supabaseSalvarLaudoGuindaste(d);
      alert("Laudo salvo com sucesso!");
      laudosSalvos = await supabaseCarregarLaudosGuindaste();
      const q = safeEl("qtdeLaudosGuindaste"); if (q) q.textContent = laudosSalvos.length;
    } catch (e) { alert("Erro: " + e.message); }
  });
  safeEl("lgTipo")?.addEventListener("change", () => {
    const el = safeEl("lgNumeroLaudo");
    if (el) el.textContent = gerarNumeroLaudo();
  });
  safeEl("btnHistoricoLaudoGuindaste")?.addEventListener("click", async () => {
    laudosSalvos = await supabaseCarregarLaudosGuindaste();
    const q = safeEl("qtdeLaudosGuindaste"); if (q) q.textContent = laudosSalvos.length;
    renderHistoricoModal();
    safeEl("modalHistoricoLaudoGuindaste").style.display = "flex";
  });
  safeEl("fecharModalHistoricoGuindaste")?.addEventListener("click", () => safeEl("modalHistoricoLaudoGuindaste").style.display = "none");
  window.addEventListener("click", e => { const m = safeEl("modalHistoricoLaudoGuindaste"); if (e.target === m) m.style.display = "none"; });
  safeEl("btnGerarPDFLaudoGuindaste")?.addEventListener("click", gerarPDFLaudoGuindaste);
  laudosSalvos = await supabaseCarregarLaudosGuindaste();
  const q = safeEl("qtdeLaudosGuindaste"); if (q) q.textContent = laudosSalvos.length;
}

function gerarPDFLaudoGuindaste() {
  const data = getFormData();
  if (!data.frota) return alert("Preencha os dados do equipamento.");
  const win = window.open("", "_blank");
  if (!win) return alert("Permita pop-ups.");

  const itensSelecionados = CHECKLIST_ITENS.filter(item => {
    const s = data.checklist?.[item.id] || {};
    return s.incluido !== false;
  });

  const checkRows = itensSelecionados.map(item => {
    const s = data.checklist?.[item.id] || { status: "Aprovado", subitens: [] };
    const st = s.status;
    const icon = st === "Aprovado" ? "&#10003;" : st === "Aprovado com Restrições" ? "&#9888;" : "&#10007;";
    const cor = st === "Aprovado" ? "#10b981" : st === "Aprovado com Restrições" ? "#f59e0b" : "#ef4444";

    const subitens = s.subitens || [];
    const subHtml = subitens.length > 0 ? subitens.map(si => {
      if (!si.nome) return "";
const siObs = si.observacao ? `<br><span style="font-size:7px;color:#666;">${si.observacao}</span>` : "";
const siFotos = si.fotos?.length ? `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;">${si.fotos.map(f => `<div style="flex:0 0 calc(50% - 3px);max-height:130px;display:flex;align-items:center;justify-content:center;"><img src="${f}" style="max-width:100%;max-height:130px;width:auto;height:auto;object-fit:contain;border:1px solid #ddd;border-radius:3px;"></div>`).join("")}</div>` : "";
return `<div style="padding:2px 0 2px 10px;border-top:1px dashed #ddd;font-size:7.5px;"><strong>${si.nome}</strong>${siObs}${siFotos}</div>`;
    }).join("") : s.observacao ? `<div style="padding:3px 0 3px 12px;font-size:9px;color:#666;">${s.observacao}</div>` : "";

    return `<tr><td style="padding:2px 8px;border:1px solid #000;font-size:9px;">${item.label}${subHtml}</td><td style="padding:2px 8px;border:1px solid #000;text-align:center;font-size:10px;font-weight:bold;color:${cor};">${icon} ${st}</td></tr>`;
  }).join("");

  const total = itensSelecionados.length;
  const aprov = itensSelecionados.filter(i => (data.checklist?.[i.id]?.status || "Aprovado") === "Aprovado").length;
  const restr = itensSelecionados.filter(i => (data.checklist?.[i.id]?.status || "Aprovado") === "Aprovado com Restrições").length;
  const repro = itensSelecionados.filter(i => (data.checklist?.[i.id]?.status || "Aprovado") === "Reprovado").length;

  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Laudo ${data.frota}</title><style>
    @page{margin:6mm;size:portrait}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;color:#000;font-size:12px;margin:0;padding:0}
    table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:2px 8px;font-size:9px}th{background:#e0e0e0;font-weight:bold;text-align:left}
    .b{border:2px solid #000;margin-bottom:5px}.bt{background:#034C8C;color:#fff;padding:4px 10px;font-size:11px;font-weight:bold;border-bottom:1px solid #000}
    .sb{display:inline-block;padding:6px 24px;border:2px solid #000;font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:1px}
    .as{margin-top:25px;text-align:center}.as .ln{width:55%;border-top:1px solid #000;margin:0 auto 5px}
  </style></head><body>
  <table class="pf">
<tr><td style="width:22%;border:none;text-align:center;padding:4px;"><img src="data:image/png;base64,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" alt="Makro" style="max-height:45px;max-width:100%;"></td>
<td style="width:48%;border:none;text-align:center;padding:4px;"><div style="font-size:14px;font-weight:bold;">LAUDO TÉCNICO DE INSPEÇÃO</div></td>
<td style="width:30%;border:none;padding:4px 6px;font-size:9px;"><strong>CONTROLE:</strong> ${data.numeroLaudo}<br><strong>DATA:</strong> ${data.dataInspecao||hojeISO()}<br><strong>ART:</strong> ${data.art||"N/A"}<br><strong>PARECER:</strong> ${data.parecer}</td></tr>
</table>
  <div class="b"><div class="bt" style="font-size:10px;padding:3px 10px;">EQUIPAMENTO / CONTRATANTE</div><table>
    <tr><td style="width:18%;font-weight:bold;font-size:9px;padding:2px 8px;">Empresa</td><td style="width:32%;font-size:9px;padding:2px 8px;">MAKRO ENGENHARIA LTDA</td><td style="width:18%;font-weight:bold;font-size:9px;padding:2px 8px;">CNPJ</td><td style="font-size:9px;padding:2px 8px;">05.325.014/0001-07</td></tr>
    <tr><td style="font-weight:bold;font-size:9px;padding:2px 8px;">Frota</td><td style="font-size:9px;padding:2px 8px;">${data.frota}</td><td style="font-weight:bold;font-size:9px;padding:2px 8px;">Modelo</td><td style="font-size:9px;padding:2px 8px;">${data.modelo}</td></tr>
    <tr><td style="font-weight:bold;font-size:9px;padding:2px 8px;">Capacidade</td><td style="font-size:9px;padding:2px 8px;">${data.capacidade||"N/I"} t</td><td style="font-weight:bold;font-size:9px;padding:2px 8px;">Nº Série</td><td style="font-size:9px;padding:2px 8px;">${data.serie||"N/I"}</td></tr>
    <tr><td style="font-weight:bold;font-size:9px;padding:2px 8px;">Ano Fab.</td><td style="font-size:9px;padding:2px 8px;">${data.ano||"N/I"}</td><td style="font-weight:bold;font-size:9px;padding:2px 8px;">Unidade</td><td style="font-size:9px;padding:2px 8px;">${data.unidade}</td></tr>
    <tr><td style="font-weight:bold;font-size:9px;padding:2px 8px;">Inspetor</td><td style="font-size:9px;padding:2px 8px;">${data.inspetor||"N/I"}</td><td style="font-weight:bold;font-size:9px;padding:2px 8px;">CREA</td><td style="font-size:9px;padding:2px 8px;">${data.crea||"N/I"}</td></tr>
  </table></div>
  <div class="b"><div class="bt" style="font-size:10px;padding:3px 10px;">NORMATIVAS</div><div style="padding:3px 10px;font-size:9px;">NR 11 | NR 12 | NBR ISO 4309 | NBR 8400 | NBR 13541-1 | NBR 15637-1</div></div>
  <div class="b"><div class="bt" style="font-size:10px;padding:3px 10px;">RESULTADO DA INSPEÇÃO</div><div style="padding:3px 10px;display:flex;gap:14px;font-size:10px;"><span><strong>Total:</strong> ${total}</span><span style="color:#10b981;"><strong>&#10003; Aprovados:</strong> ${aprov}</span><span style="color:#f59e0b;"><strong>&#9888; Restrições:</strong> ${restr}</span><span style="color:#ef4444;"><strong>&#10007; Reprovados:</strong> ${repro}</span></div></div>
  <div class="b"><div class="bt" style="font-size:10px;padding:3px 10px;">CHECKLIST DETALHADO</div><table><thead><tr><th style="font-size:9px;padding:2px 8px;">Item</th><th style="font-size:9px;padding:2px 8px;text-align:center;">Status</th></tr></thead><tbody>${checkRows}</tbody></table></div>
  <div class="b"><div class="bt" style="font-size:10px;padding:3px 10px;">OBSERVAÇÕES</div><div style="padding:3px 10px;min-height:24px;font-size:9px;">${data.observacoes||"Sem observações."}</div></div>
  <div class="b"><div class="bt" style="font-size:10px;padding:3px 10px;">RECOMENDAÇÕES</div><div style="padding:3px 10px;min-height:24px;font-size:9px;">${data.recomendacoes||"Nenhuma."}</div></div>
  <div style="text-align:center;padding:10px 0 6px;"><div style="font-size:10px;font-weight:bold;margin-bottom:4px;">PARECER FINAL</div><div class="sb" style="color:${data.parecer==="Aprovado"?"#10b981":data.parecer==="Aprovado com Restrições"?"#f59e0b":"#ef4444"};border-color:${data.parecer==="Aprovado"?"#10b981":data.parecer==="Aprovado com Restrições"?"#f59e0b":"#ef4444"}">${data.parecer}</div></div>
  <div class="as"><div class="ln"></div><div style="font-weight:bold;font-size:11px;">${data.inspetor||"INSPETOR TÉCNICO"}</div><div style="font-size:10px;">Engenheiro Mecânico</div><div style="font-size:9px;">CREA: ${data.crea||"________"} | ART: ${data.art||"________"}</div><div style="font-size:10px;font-weight:bold;margin-top:2px;">MAKRO ENGENHARIA LTDA</div></div>
  <script>window.onload=function(){window.print();window.close()};<\/script></body></html>`);
  win.document.close();
}
