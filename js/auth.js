import emailjs from "@emailjs/browser";
import { EMAIL_REGEX, safeEl, codeStorageSet, codeStorageGet, codeStorageDel, mostrarStep, getGravatarUrl, el } from "./utils.js";
import { apiGetUsers, apiGetUserByEmail, apiRegisterUser, apiSalvarPerfil, loginComGoogle as loginGoogleSupabase, logoutGoogle } from "./supabase.js";
import { currentUserRole, currentUserEmail, currentUserProfile, setCurrentUserRole, setCurrentUserEmail, setCurrentUserProfile, dados } from "./state.js";
import { popularFiltros, popularFiltroFilialEquipamento, atualizarDashboard } from "./dashboard.js";
import { atualizarDashboardEquipamentos } from "./equipamentos.js";

function completarDashboard() {
    if (dados.length === 0) { console.warn("completarDashboard: dados vazio"); return; }
    try { popularFiltros(); } catch(e) { console.error("popularFiltros erro:", e); }
    try { if (typeof popularFiltroFilialEquipamento === "function") popularFiltroFilialEquipamento(); } catch(e) { console.error("popularFiltroFilialEquipamento erro:", e); }
    try { atualizarDashboard(); } catch(e) { console.error("atualizarDashboard erro:", e); }
    try { atualizarDashboardEquipamentos(); } catch(e) { console.error("atualizarDashboardEquipamentos erro:", e); }
}

const LOGIN_PASSWORD = typeof __LOGIN_PASSWORD__ !== "undefined" ? __LOGIN_PASSWORD__ : "";
const DEVELOPER_EMAIL = typeof __DEVELOPER_EMAIL__ !== "undefined" ? __DEVELOPER_EMAIL__ : "";
const EMAILJS_PUBLIC_KEY = typeof __EMAILJS_PUBLIC_KEY__ !== "undefined" ? __EMAILJS_PUBLIC_KEY__ : "";
const EMAILJS_SERVICE_ID = typeof __EMAILJS_SERVICE_ID__ !== "undefined" ? __EMAILJS_SERVICE_ID__ : "";
const EMAILJS_TEMPLATE_ID = typeof __EMAILJS_TEMPLATE_ID__ !== "undefined" ? __EMAILJS_TEMPLATE_ID__ : "";

export function aplicarPermissoes() {
    const importLabel = document.querySelector("label.btn-success");
    if (!importLabel) return;
    importLabel.style.display = (currentUserRole === "admin") ? "inline-flex" : "none";
    const menuConfig = document.getElementById("menuConfiguracoes");
    if (menuConfig) menuConfig.style.display = currentUserRole === "admin" ? "" : "none";
}

export function atualizarBotaoPerfil() {
    const btn = document.getElementById("btnPerfil");
    const nomeSpan = document.getElementById("perfilBtnNome");
    if (!btn || !nomeSpan) return;
    const email = currentUserEmail || "";
    const gravatarUrl = getGravatarUrl(email, 28);
    const nome = currentUserProfile?.first_name || email.split("@")[0] || "User";
    const nomeCompleto = currentUserProfile?.first_name
        ? currentUserProfile.first_name + " " + (currentUserProfile.last_name || "")
        : email;
    if (gravatarUrl) {
        btn.textContent = "";
        const img = document.createElement("img");
        img.src = gravatarUrl;
        img.alt = "";
        Object.assign(img.style, { width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: "0" });
        btn.appendChild(img);
        btn.appendChild(el("span", { id: "perfilBtnNome", style: { display: "inline" } }, nome));
    } else {
        nomeSpan.textContent = nome;
        nomeSpan.style.display = "inline";
    }
    btn.title = nomeCompleto;
}

function renderizarPerfil(container) {
    const p = currentUserProfile || {};
    const setorLabel = p.sector || "Nao informado";
    const email = currentUserEmail || p.email || "";
    const gravatarUrl = getGravatarUrl(email, 80);
    container.textContent = "";

    const img = document.createElement("img");
    img.src = gravatarUrl;
    img.alt = "Foto de perfil";
    Object.assign(img.style, { width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", border: "2px solid rgba(212,175,55,0.3)", display: "block" });

    const header = el("div", { style: { textAlign: "center", padding: "20px 0" } },
      img,
      el("h3", { style: { color: "#e8edf5", marginBottom: "4px" } }, p.first_name || "", " ", p.last_name || ""),
      el("p", { style: { color: "#5a6b89", fontSize: "13px" } }, email)
    );
    container.appendChild(header);

    const info = el("div", { style: { borderTop: "1px solid #1a2540", padding: "16px 0" } },
      el("div", { style: { display: "flex", justifyContent: "space-between", padding: "8px 0" } },
        el("span", { style: { color: "#8899b4" } }, "Setor"),
        el("span", { style: { color: "#e8edf5", fontWeight: "600" } }, setorLabel)
      ),
      el("div", { style: { display: "flex", justifyContent: "space-between", padding: "8px 0" } },
        el("span", { style: { color: "#8899b4" } }, "Permissao"),
        el("span", { style: { color: "#e8edf5", fontWeight: "600" } }, p.role === "admin" ? "Administrador" : "Visualizador")
      )
    );
    container.appendChild(info);
}

export function abrirModalPerfil() {
    const modal = document.getElementById("modalPerfil");
    const conteudo = document.getElementById("perfilConteudo");
    if (!modal || !conteudo) return;

    if (!currentUserProfile && currentUserEmail) {
        conteudo.innerHTML = "<p style='text-align:center;color:#8899b4;'>Carregando...</p>";
        modal.style.display = "flex";
        (async () => {
            const registry = await apiGetUsers();
            const user = registry[currentUserEmail];
            if (user) {
                setCurrentUserProfile(user);
                renderizarPerfil(conteudo);
            } else {
                conteudo.innerHTML = "<p style='text-align:center;color:#ef4444;'>Erro ao carregar perfil.</p>";
            }
        })();
    } else {
        renderizarPerfil(conteudo);
        modal.style.display = "flex";
    }
}

function enviarCodigoEmail(email, codigo) {
    if (typeof emailjs === "undefined") {
        console.warn("EmailJS nao carregado. Codigo exibido no console.");
        return;
    }
    if (EMAILJS_PUBLIC_KEY.includes("SEU_PUBLIC_KEY")) {
        console.warn("EmailJS nao configurado. Codigo exibido no console.");
        return;
    }
    emailjs.init(EMAILJS_PUBLIC_KEY);
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: email, to_name: email.split("@")[0].replace(".", " "),
        codigo_verificacao: codigo, subject: "Seu codigo de verificacao Makro Dashboard"
    }).then(() => {},
      (err) => { console.error("Erro ao enviar email:", err); });
}

function tentarLoginOffline(email, remember) {
    const cached = localStorage.getItem("makroUserCache_" + email);
    if (!cached) return null;
    try {
        const perfil = JSON.parse(cached);
        setCurrentUserEmail(email);
        setCurrentUserRole(perfil.role || "viewer");
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem("makroUserRole", perfil.role || "viewer");
        storage.setItem("makroUserEmail", email);
        setCurrentUserProfile(perfil);
        return perfil;
    } catch(e) { return null; }
}

function entrar(email, role, remember) {
    setCurrentUserEmail(email);
    setCurrentUserRole(role);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("makroUserRole", role);
    storage.setItem("makroUserEmail", email);
    const overlay = safeEl("loginOverlay");
    if (overlay) overlay.style.display = "none";
    aplicarPermissoes();
    atualizarBotaoPerfil();
    completarDashboard();
    const btnEl = safeEl("loginBtn");
    if (btnEl) btnEl.disabled = false;
}

export async function completarLogin() {
    const emailEl = safeEl("loginEmail");
    const passwordEl = safeEl("loginPassword");
    const btnEl = safeEl("loginBtn");
    const errorEl = safeEl("loginErrorPrincipal");
    if (!emailEl || !passwordEl || !btnEl || !errorEl) return;

    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;
    const rememberEl = safeEl("loginRemember");
    const remember = rememberEl ? rememberEl.checked : false;

    if (!EMAIL_REGEX.test(email)) {
        errorEl.textContent = "E-mail invalido.";
        return;
    }
    if (password !== LOGIN_PASSWORD) {
        errorEl.textContent = "Senha incorreta.";
        return;
    }

    btnEl.disabled = true;
    errorEl.textContent = "Verificando...";

    // Dev entra direto
    if (email === DEVELOPER_EMAIL) {
        entrar(email, "admin", remember);
        (async () => {
            try {
                const user = await apiGetUserByEmail(email);
                if (user) { setCurrentUserProfile(user); atualizarBotaoPerfil(); }
            } catch(e) {}
        })();
        return;
    }

    // Verifica se usuario ja tem cadastro completo no Supabase
    try {
        const user = await apiGetUserByEmail(email);
        if (user && user.first_name) {
            setCurrentUserProfile(user);
            try { localStorage.setItem("makroUserCache_" + email, JSON.stringify(user)); } catch(e) {}
            entrar(email, user.role || "viewer", remember);
            return;
        }
    } catch(e) {
        const offline = tentarLoginOffline(email, remember);
        if (offline) {
            entrar(email, offline.role || "viewer", remember);
            return;
        }
    }

    // Usuario novo: enviar codigo de verificacao
    errorEl.textContent = "";
    btnEl.disabled = false;
    const codigo = String(Math.floor(10000 + Math.random() * 90000));
    codeStorageSet(email, { codigo, expira: Date.now() + 300000 });
    enviarCodigoEmail(email, codigo);
    const emailExibido = safeEl("loginEmailExibido");
    if (emailExibido) emailExibido.textContent = email;
    mostrarStep("loginStepCode");
}

export async function verificarCodigo() {
    const emailEl = safeEl("loginEmail");
    const input = safeEl("loginCode");
    const errorEl = safeEl("loginErrorCode");
    const rememberEl = safeEl("loginRemember");
    if (!emailEl || !input || !errorEl) return;
    const email = emailEl.value.trim().toLowerCase();
    const codigo = input.value.trim();
    const remember = rememberEl ? rememberEl.checked : false;

    if (codigo.length !== 5 || !/^\d{5}$/.test(codigo)) {
        errorEl.textContent = "Digite o codigo de 5 digitos enviado ao seu email.";
        return;
    }

    const saved = codeStorageGet(email);
    if (!saved) {
        errorEl.textContent = "Nenhum codigo enviado para este email. Solicite um novo.";
        return;
    }
    if (Date.now() > saved.expira) {
        codeStorageDel(email);
        errorEl.textContent = "Codigo expirado. Solicite um novo.";
        return;
    }
    if (saved.codigo !== codigo) {
        errorEl.textContent = "Codigo incorreto. Verifique e tente novamente.";
        return;
    }

    codeStorageDel(email);
    errorEl.textContent = "Verificando...";
    const btnCode = safeEl("loginBtnCode");
    if (btnCode) btnCode.disabled = true;

    const name = email.split("@")[0].replace(".", " ");
    const result = await apiRegisterUser(email, name);
    if (!result.ok) {
        errorEl.textContent = "Erro ao registrar usuario: " + (result.error || "desconhecido");
        if (btnCode) btnCode.disabled = false;
        return;
    }

    setCurrentUserEmail(email);
    setCurrentUserRole(result.role);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("makroUserRole", result.role);
    storage.setItem("makroUserEmail", email);

    mostrarStep("loginStepPerfil");
    if (safeEl("loginBtnPerfil")) safeEl("loginBtnPerfil").disabled = false;
    if (safeEl("loginErrorPerfil")) safeEl("loginErrorPerfil").textContent = "";
}

export function reenviarCodigo(e) {
    e.preventDefault();
    const emailEl = safeEl("loginEmail");
    if (!emailEl) return;
    const email = emailEl.value.trim().toLowerCase();
    const codigo = String(Math.floor(10000 + Math.random() * 90000));
    codeStorageSet(email, { codigo, expira: Date.now() + 300000 });
    enviarCodigoEmail(email, codigo);
    const errorEl = safeEl("loginErrorCode");
    if (errorEl) errorEl.textContent = "Novo codigo enviado!";
    setTimeout(() => { if (errorEl) errorEl.textContent = ""; }, 3000);
}

export async function salvarPerfil() {
    const nomeEl = safeEl("regNome");
    const sobrenomeEl = safeEl("regSobrenome");
    const setorEl = safeEl("regSetor");
    const errorEl = safeEl("loginErrorPerfil");
    const btn = safeEl("loginBtnPerfil");
    if (!nomeEl || !sobrenomeEl || !setorEl || !errorEl || !btn) return;

    const nome = nomeEl.value.trim();
    const sobrenome = sobrenomeEl.value.trim();
    const setor = setorEl.value;

    if (!nome) { errorEl.textContent = "Digite seu nome."; return; }
    if (!sobrenome) { errorEl.textContent = "Digite seu sobrenome."; return; }
    if (!setor) { errorEl.textContent = "Selecione um setor."; return; }

    errorEl.textContent = "Salvando...";
    btn.disabled = true;

    const ok = await apiSalvarPerfil(currentUserEmail, nome, sobrenome, setor);
    if (!ok) {
        errorEl.textContent = "Erro ao salvar perfil. Tente novamente.";
        btn.disabled = false;
        return;
    }

    setCurrentUserProfile({ first_name: nome, last_name: sobrenome, sector: setor, email: currentUserEmail, role: currentUserRole });
    completarLoginAposPerfil();
}

function completarLoginAposPerfil() {
    const storage = localStorage.getItem("makroUserRole") ? localStorage : sessionStorage;
    storage.setItem("makroUserRole", currentUserRole);
    storage.setItem("makroUserEmail", currentUserEmail);
    const overlay = safeEl("loginOverlay");
    if (overlay) overlay.style.display = "none";
    const btn = safeEl("loginBtn");
    if (btn) btn.disabled = false;
    aplicarPermissoes();
    atualizarBotaoPerfil();
    completarDashboard();
}

export async function loginComGoogle() {
  try {
    await loginGoogleSupabase();
  } catch (e) {
    console.error("Erro ao iniciar login Google:", e);
  }
}

export async function processarLoginGoogle(session) {
  const email = session?.user?.email;
  if (!email) { console.warn("Google login: email não encontrado"); return; }

  setCurrentUserEmail(email);
  setCurrentUserRole("viewer");
  const storage = localStorage.getItem("makroUserRole") ? localStorage : sessionStorage;
  storage.setItem("makroUserRole", "viewer");
  storage.setItem("makroUserEmail", email);

  try {
    let user = await apiGetUserByEmail(email);
    if (user) {
      setCurrentUserProfile(user);
      setCurrentUserRole(user.role || "viewer");
      storage.setItem("makroUserRole", user.role || "viewer");
    } else {
      const name = email.split("@")[0].replace(".", " ");
      const result = await apiRegisterUser(email, name);
      if (result.ok) {
        setCurrentUserRole(result.role);
        storage.setItem("makroUserRole", result.role);
      }
    }
  } catch (e) {
    console.warn("Google login: erro ao verificar usuario, prosseguindo como viewer:", e);
  }

  const overlay = safeEl("loginOverlay");
  if (overlay) overlay.style.display = "none";
  aplicarPermissoes();
  atualizarBotaoPerfil();
  completarDashboard();
}

export function fazerLogout() {
    localStorage.removeItem("makroUserRole");
    localStorage.removeItem("makroUserEmail");
    sessionStorage.removeItem("makroUserRole");
    sessionStorage.removeItem("makroUserEmail");
    setCurrentUserRole(null);
    setCurrentUserEmail(null);
    setCurrentUserProfile(null);
    const btn = document.getElementById("btnPerfil");
    if (btn) {
      btn.textContent = "";
      btn.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i> <span id="perfilBtnNome" style="display:none;"></span>';
    }
    const overlay = safeEl("loginOverlay");
    if (overlay) overlay.style.display = "flex";
    const pw = safeEl("loginPassword");
    if (pw) pw.value = "";
    const err = safeEl("loginErrorPrincipal");
    if (err) err.textContent = "";
    mostrarStep("loginStepPrincipal");
    const code = safeEl("loginCode");
    if (code) code.value = "";
    const email = safeEl("loginEmail");
    if (email) email.value = "";
    logoutGoogle();
}
