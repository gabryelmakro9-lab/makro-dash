import { apiGetFrota } from "./supabase.js";

let frotaCache = null;
let frotaIndice = null;

export async function carregarFrota() {
  if (frotaCache) return frotaCache;
  if (window._frotaData && window._frotaData.length > 0) {
    frotaCache = window._frotaData;
  } else {
    const rows = await apiGetFrota();
    if (rows && rows.length > 0) {
      frotaCache = rows.map(r => r.data);
    }
  }
  if (frotaCache) {
    frotaIndice = {};
    frotaCache.forEach(item => {
      const codigo = (item.Bem || '').trim().toUpperCase();
      if (codigo) frotaIndice[codigo] = item;
    });
  }
  return frotaCache || [];
}

export function buscarFrota(termo) {
  if (!frotaIndice) return [];
  const t = termo.toUpperCase().trim();
  if (!t) return Object.values(frotaIndice).slice(0, 10);
  return Object.keys(frotaIndice)
    .filter(key => key.includes(t))
    .sort((a, b) => {
      const aStarts = a.startsWith(t);
      const bStarts = b.startsWith(t);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    })
    .slice(0, 15)
    .map(key => frotaIndice[key]);
}

export function getFrotaItem(bem) {
  if (!frotaIndice) return null;
  return frotaIndice[bem.toUpperCase().trim()] || null;
}

export function criarAutocomplete(input, onSelect) {
  const container = document.createElement("div");
  container.style.cssText = "position:relative;width:100%;";
  input.parentNode.insertBefore(container, input);
  container.appendChild(input);

  const dropdown = document.createElement("div");
  dropdown.style.cssText =
    "position:absolute;top:100%;left:0;right:0;z-index:1000;background:#0d1225;border:1px solid #2a3550;border-radius:0 0 8px 8px;max-height:280px;overflow-y:auto;display:none;box-shadow:0 8px 24px rgba(0,0,0,0.4);";
  container.appendChild(dropdown);

  let selectedIndex = -1;
  let currentResults = [];

  function fechar() {
    dropdown.style.display = "none";
    selectedIndex = -1;
  }

  function renderizar(items) {
    currentResults = items;
    if (items.length === 0) {
      fechar();
      return;
    }
    dropdown.innerHTML = items
      .map(
        (item, i) =>
          `<div data-index="${i}" style="padding:8px 12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.04);background:${i === selectedIndex ? "rgba(212,175,55,0.15)" : "transparent"};color:${i === selectedIndex ? "#D4AF37" : "#e2e8f0"};transition:background 0.1s;">
            <span style="font-weight:600;font-family:monospace;">${item.Bem || ""}</span>
            <span style="font-size:11px;color:rgba(136,153,180,0.7);margin-left:8px;">${item.Descrição || item["Nome do Bem"] || ""}</span>
          </div>`
      )
      .join("");
    dropdown.style.display = "block";

    dropdown.querySelectorAll("div[data-index]").forEach(el => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.index);
        if (currentResults[idx]) selecionar(currentResults[idx]);
      });
      el.addEventListener("mouseenter", () => {
        selectedIndex = parseInt(el.dataset.index);
        dropdown.querySelectorAll("div[data-index]").forEach(e => {
          const i = parseInt(e.dataset.index);
          e.style.background = i === selectedIndex ? "rgba(212,175,55,0.15)" : "transparent";
          e.style.color = i === selectedIndex ? "#D4AF37" : "#e2e8f0";
        });
      });
    });
  }

  function selecionar(item) {
    input.value = item.Bem || "";
    fechar();
    if (onSelect) onSelect(item);
  }

  input.addEventListener("input", () => {
    selectedIndex = -1;
    const results = buscarFrota(input.value);
    renderizar(results);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      const results = buscarFrota(input.value);
      renderizar(results);
    } else {
      const results = buscarFrota("");
      renderizar(results);
    }
  });

  input.addEventListener("blur", () => {
    setTimeout(fechar, 200);
  });

  input.addEventListener("keydown", e => {
    if (dropdown.style.display !== "block" || currentResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
      renderizar(currentResults);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderizar(currentResults);
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      if (currentResults[selectedIndex]) selecionar(currentResults[selectedIndex]);
    } else if (e.key === "Escape") {
      fechar();
    }
  });

  return { fechar, dropdown };
}
