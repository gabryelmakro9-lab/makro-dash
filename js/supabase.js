import { parseValorMonetario } from "./utils.js";
import { dados, setDados } from "./state.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = typeof __SUPABASE_URL__ !== "undefined" ? __SUPABASE_URL__ : "";
const SUPABASE_ANON = typeof __SUPABASE_ANON__ !== "undefined" ? __SUPABASE_ANON__ : "";
const DEVELOPER_EMAIL = typeof __DEVELOPER_EMAIL__ !== "undefined" ? __DEVELOPER_EMAIL__ : "";

export const sbClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});

let realtimeUnsub = null;

let importEmAndamento = false;

export function isImportEmAndamento() { return importEmAndamento; }
export function setImportEmAndamento(val) { importEmAndamento = val; }

export function iniciarRealtime(onChange) {
    const channel = sbClient
        .channel("danos-changes")
        .on("postgres_changes",
            { event: "*", schema: "public", table: "danos" },
            (payload) => {
                if (importEmAndamento) {
                    return;
                }
                if (typeof onChange === "function") onChange(payload);
            }
        )
        .subscribe();
    realtimeUnsub = () => sbClient.removeChannel(channel);
}

export function pararRealtime() {
    if (realtimeUnsub) { realtimeUnsub(); realtimeUnsub = null; }
}

// --- HEADERS COM AUTENTICAÇÃO ADEQUADA ---

async function getAccessToken() {
  try {
    const { data } = await sbClient.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function getAuthHeaders(forWrite = false) {
  const token = await getAccessToken();
  const apikey = SUPABASE_ANON;
  const headers = {
    "apikey": apikey,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
  };
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  } else if (forWrite) {
    headers["Authorization"] = "Bearer " + apikey;
  } else {
    headers["Authorization"] = "Bearer " + apikey;
  }
  return headers;
}

// --- HELPERS ---

async function fetchComTimeout(url, options, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const r = await fetch(url, { ...options, signal: controller.signal });
        return r;
    } finally {
        clearTimeout(id);
    }
}

// --- READS (usam anon key) ---

export async function apiGetUsers() {
    const r = await fetchComTimeout(SUPABASE_URL + "/rest/v1/users?order=email.asc", { headers: await getAuthHeaders() });
    if (!r.ok) throw new Error("Erro ao buscar usuarios (" + r.status + ")");
    const data = await r.json();
    const obj = {};
    data.forEach(u => { obj[u.email] = u; });
    return obj;
}

export async function apiGetUserByEmail(email) {
    const r = await fetchComTimeout(SUPABASE_URL + "/rest/v1/users?email=eq." + encodeURIComponent(email), { headers: await getAuthHeaders() });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows && rows.length > 0 ? rows[0] : null;
}

// --- WRITES (usam token auth se disponível) ---

export async function apiRegisterUser(email, name) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/users", {
        method: "POST",
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
            email, role: email === DEVELOPER_EMAIL ? "admin" : "viewer",
            name, last_login: new Date().toISOString(),
            dev: email === DEVELOPER_EMAIL
        })
    });
    if (r.status === 201 || r.status === 200) {
        return { ok: true, role: email === DEVELOPER_EMAIL ? "admin" : "viewer" };
    }
    if (r.status === 409) {
        return { ok: true, role: email === DEVELOPER_EMAIL ? "admin" : "viewer" };
    }
    return { ok: false, error: await r.text() };
}

export async function apiSetUserRole(email, role) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/users?email=eq." + encodeURIComponent(email), {
        method: "PATCH", headers: await getAuthHeaders(true),
        body: JSON.stringify({ role })
    });
    return r.ok;
}

export async function apiSalvarPerfil(email, first_name, last_name, sector) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/users?email=eq." + encodeURIComponent(email), {
        method: "PATCH", headers: await getAuthHeaders(true),
        body: JSON.stringify({ first_name, last_name, sector, name: (first_name + " " + last_name).trim() })
    });
    return r.ok;
}

async function validarRespostaSupabase(response, acao) {
    if (response.ok) return;
    const detalhes = await response.text();
    throw new Error(`${acao} falhou (${response.status}): ${detalhes || response.statusText}`);
}

export async function supabaseSalvarDados(lista) {
    setImportEmAndamento(true);
    try {
        const headers = await getAuthHeaders(true);
        const token = await getAccessToken();

        if (!token) {
            console.warn("Sem sessão Supabase Auth ativa — DELETE de danos pode ser bloqueado pelo RLS.");
            if (lista.length > 0) {
                console.warn("Tentando importar sem autenticação — verifique se o RLS permite.");
            }
        }

        const role = localStorage.getItem("makroUserRole") || sessionStorage.getItem("makroUserRole") || "viewer";
        if (role !== "admin") {
            throw new Error("Apenas administradores podem importar dados. Seu papel atual: " + role);
        }

        const deleteResponse = await fetch(SUPABASE_URL + "/rest/v1/danos?id=not.is.null", {
            method: "DELETE",
            headers
        });
        if (!deleteResponse.ok) {
            throw new Error("Falha ao limpar dados antigos (" + deleteResponse.status + ")");
        }

        if (lista.length === 0) {
            return;
        }

        const rows = lista.map(d => ({
            os: d.os, valor_sa: d.valorSA, valor_sc: d.valorSC,
            bem: d.bem, sc: d.sc, filial: d.filial, unidade: d.unidade,
            tipo: d.tipo,
            data: d.data instanceof Date && !isNaN(d.data.getTime()) ? d.data.toISOString() : String(d.data || ""),
            descricao: d.descricao
        }));
        const batchSize = 500;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const loteNum = Math.floor(i / batchSize) + 1;
            const insertResponse = await fetch(SUPABASE_URL + "/rest/v1/danos", {
                method: "POST", headers, body: JSON.stringify(batch)
            });
            if (!insertResponse.ok) {
                throw new Error(`Gravacao do lote ${loteNum} falhou (${insertResponse.status})`);
            }
        }
    } finally {
        setTimeout(() => setImportEmAndamento(false), 2000);
    }
}

export async function apiGetMetas() {
    try {
        const r = await fetchComTimeout(SUPABASE_URL + "/rest/v1/metas?id=eq.1", { headers: await getAuthHeaders() });
        if (!r.ok) {
            console.warn("apiGetMetas falhou:", r.status, await r.text());
            return null;
        }
        const rows = await r.json();
        if (!rows || rows.length === 0) {
            console.warn("apiGetMetas: tabela vazia");
            return null;
        }
        const m = rows[0];
        return {
            metaMensalSA: Number(m.meta_mensal_sa) || 500000,
            metaTicketMedio: Number(m.meta_ticket_medio) || 15000,
            metaGapMax: Number(m.meta_gap_max) || 100000,
            alertaLimiteDano: Number(m.alerta_limite_dano) || 200000
        };
    } catch (e) {
        console.warn("Erro ao carregar metas do Supabase:", e);
        return null;
    }
}

export async function apiSaveMetas(metas) {
    try {
        const payload = {
            meta_mensal_sa: metas.metaMensalSA,
            meta_ticket_medio: metas.metaTicketMedio,
            meta_gap_max: metas.metaGapMax,
            alerta_limite_dano: metas.alertaLimiteDano,
            updated_at: new Date().toISOString()
        };
        const headers = await getAuthHeaders(true);
        const r = await fetch(SUPABASE_URL + "/rest/v1/metas?id=eq.1", {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload)
        });

        if (!r.ok) {
            const errText = await r.text();
            console.error("Falha ao salvar metas:", r.status, errText);
            return false;
        }

        return true;
    } catch (e) {
        console.warn("Erro ao salvar metas no Supabase:", e);
        return false;
    }
}

export async function apiGetFrota() {
  try {
    const r = await fetchComTimeout(SUPABASE_URL + "/rest/v1/frota?order=bem.asc", {
      headers: await getAuthHeaders()
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    console.warn("Erro ao carregar frota do Supabase:", e);
    return null;
  }
}

// --- LAUDOS GUINDASTE ---

export async function apiLaudosGuindasteList() {
  try {
    const r = await fetchComTimeout(SUPABASE_URL + "/rest/v1/laudos_guindaste?order=updated_at.desc", {
      headers: await getAuthHeaders()
    });
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.warn("Erro ao listar laudos guindaste:", e);
    return [];
  }
}

export async function apiLaudoGuindasteSalvar(data) {
  const headers = await getAuthHeaders(true);
  const url = SUPABASE_URL + "/rest/v1/laudos_guindaste";
  if (data.id) {
    const r = await fetch(url + "?id=eq." + data.id, {
      method: "PATCH", headers, body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error("Falha ao atualizar (" + r.status + ")");
    return data.id;
  } else {
    const r = await fetch(url, {
      method: "POST", headers, body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error("Falha ao salvar (" + r.status + ")");
    const json = await r.json();
    return json[0]?.id;
  }
}

export async function apiLaudoGuindasteDeletar(id) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/laudos_guindaste?id=eq." + id, {
    method: "DELETE", headers: await getAuthHeaders(true)
  });
  return r.ok;
}

// --- SUPABASE AUTH (Google OAuth) ---

export async function loginComGoogle() {
  const { error } = await sbClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }
  });
  if (error) { console.error("Google login error:", error); throw error; }
}

export async function getSessaoGoogle() {
  const { data, error } = await sbClient.auth.getSession();
  if (error) { console.error("Erro ao recuperar sessao:", error); return null; }
  return data?.session || null;
}

export async function logoutGoogle() {
  const { error } = await sbClient.auth.signOut();
  if (error) console.error("Erro ao deslogar Google:", error);
}

// --- CARREGAMENTO DE DADOS ---

export async function supabaseCarregarDados() {
    try {
        if (importEmAndamento) {
                return false;
        }
        const rows = [];
        const pageSize = 1000;
        for (let start = 0; ; start += pageSize) {
            const r = await fetch(SUPABASE_URL + "/rest/v1/danos?order=id.asc", {
                headers: {
                    ...(await getAuthHeaders()),
                    "Range": `${start}-${start + pageSize - 1}`
                }
            });
            if (!r.ok) {
                console.error("supabaseCarregarDados falhou:", r.status, await r.text());
                return false;
            }
            const pageRows = await r.json();
            if (!pageRows || pageRows.length === 0) break;
            rows.push(...pageRows);
            if (pageRows.length < pageSize) break;
        }
        if (!rows || rows.length === 0) return false;
        setDados(rows.map(d => ({
            os: d.os || "", valorSA: parseValorMonetario(d.valor_sa),
            valorSC: parseValorMonetario(d.valor_sc), bem: d.bem || "",
            sc: d.sc || "", filial: d.filial || "", unidade: d.unidade || "",
            tipo: d.tipo || "",
            data: d.data ? new Date(d.data) : "", descricao: d.descricao || ""
        })));
        return true;
    } catch(e) {
        console.warn("Erro ao carregar do Supabase:", e);
        return false;
    }
}
