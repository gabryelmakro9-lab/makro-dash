const animationTimers = {};

export const MAKRO_COLORS = [
    "#001F3F", "#003366", "#00509D", "#0A66C2",
    "#D4AF37", "#B38F2A", "#E5E7EB"
];

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function safeEl(id) { return document.getElementById(id); }
export function safeText(id, val) { const el = safeEl(id); if (el) el.innerText = val; }
export function safeHtml(id, val) { const el = safeEl(id); if (el) el.innerHTML = val; }
export function safeShow(id, display) { const el = safeEl(id); if (el) el.style.display = display; }

export function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "className") e.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === "string" || typeof child === "number") {
      e.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      e.appendChild(child);
    }
  }
  return e;
}

export function codeStorageSet(email, data) {
    try { sessionStorage.setItem("vc_" + email, JSON.stringify(data)); } catch(e) {}
}
export function codeStorageGet(email) {
    try {
        const raw = sessionStorage.getItem("vc_" + email);
        return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
}
export function codeStorageDel(email) {
    try { sessionStorage.removeItem("vc_" + email); } catch(e) {}
}

export function parseValorMonetario(valor) {
    if (typeof valor === "number") {
        return Number.isFinite(valor) ? valor : 0;
    }
    if (valor === null || valor === undefined) return 0;
    let texto = String(valor).trim();
    if (!texto) return 0;
    texto = texto.replace(/\s+/g, "").replace(/[^\d,.-]/g, "");
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

export function formatarMoeda(v){
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(v){
    if(!v) return "";
    if(v instanceof Date){
        return isNaN(v.getTime()) ? "" : v.toLocaleDateString("pt-BR");
    }
    return v;
}

export function converterDataExcel(valor){
    if(!valor) return "";
    if(typeof valor === "number"){
        return new Date((valor - 25569) * 86400 * 1000);
    }
    if(typeof valor === "string"){
        const str = valor.trim();
        const matchBr = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if(matchBr){
            return new Date(parseInt(matchBr[3],10), parseInt(matchBr[2],10) - 1, parseInt(matchBr[1],10));
        }
        const matchIso = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if(matchIso){
            return new Date(parseInt(matchIso[1],10), parseInt(matchIso[2],10) - 1, parseInt(matchIso[3],10));
        }
    }
    return new Date(valor);
}

export function normalizarBem(valor){
    return String(valor || "").trim().replace(/\s+/g,"").toUpperCase();
}

export function mostrarStep(id) {
    const stepPrincipal = safeEl("loginStepPrincipal");
    const stepCode = safeEl("loginStepCode");
    const stepPerfil = safeEl("loginStepPerfil");
    if (stepPrincipal) stepPrincipal.style.display = id === "loginStepPrincipal" ? "block" : "none";
    if (stepCode) stepCode.style.display = id === "loginStepCode" ? "block" : "none";
    if (stepPerfil) stepPerfil.style.display = id === "loginStepPerfil" ? "block" : "none";
    if (id === "loginStepCode") {
        setTimeout(() => { const el = safeEl("loginCode"); if (el) el.focus(); }, 100);
    }
}

export function animarMoeda(elemento, valorFinal){
    const id = elemento.id || elemento;
    if (animationTimers[id]) {
        clearInterval(animationTimers[id]);
    }
    let atual = 0;
    const incremento = valorFinal / 80;
    const timer = setInterval(()=>{
        atual += incremento;
        if(atual >= valorFinal){
            atual = valorFinal;
            clearInterval(timer);
            delete animationTimers[id];
        }
        elemento.innerText = formatarMoeda(atual);
    },15);
    animationTimers[id] = timer;
}

export function md5(str) {
  const rotate = (x, n) => (x << n) | (x >>> (32 - n));
  const F = (x, y, z) => (x & y) | (~x & z);
  const G = (x, y, z) => (x & z) | (y & ~z);
  const H = (x, y, z) => x ^ y ^ z;
  const I = (x, y, z) => y ^ (x | ~z);
  const K = [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391];
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const utf8 = unescape(encodeURIComponent(str));
  const bytes = [...utf8].map(c => c.charCodeAt(0));
  const origLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 8; i++) bytes.push((origLen >>> (i * 8)) & 0xff);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let i = 0; i < bytes.length; i += 64) {
    const w = [];
    for (let j = 0; j < 16; j++) w[j] = bytes[i + j * 4] | (bytes[i + j * 4 + 1] << 8) | (bytes[i + j * 4 + 2] << 16) | (bytes[i + j * 4 + 3] << 24);
    let [aa, bb, cc, dd] = [a, b, c, d];
    for (let j = 0; j < 64; j++) {
      const g = j < 16 ? j : j < 32 ? (5 * j + 1) % 16 : j < 48 ? (3 * j + 5) % 16 : (7 * j) % 16;
      const f = j < 16 ? F(bb, cc, dd) : j < 32 ? G(bb, cc, dd) : j < 48 ? H(bb, cc, dd) : I(bb, cc, dd);
      const temp = dd;
      dd = cc;
      cc = bb;
      bb = bb + rotate(a + f + K[j] + w[g], S[(j >> 3) & 3 | (j >> 2) & ~3]);
      a = temp;
    }
    [a, b, c, d] = [a + aa, b + bb, c + cc, d + dd];
  }
  return [a, b, c, d].map(v => ("00000000" + (v >>> 0).toString(16)).slice(-8)).join("");
}

export function getGravatarUrl(email, size = 80) {
  if (!email) return "";
  const hash = md5(email.toLowerCase().trim());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}

export function animarNumero(elemento, valorFinal, prefixo=""){
    const id = elemento.id || elemento;
    if (animationTimers[id]) {
        clearInterval(animationTimers[id]);
    }
    let atual = 0;
    const incremento = valorFinal / 60;
    const timer = setInterval(()=>{
        atual += incremento;
        if(atual >= valorFinal){
            atual = valorFinal;
            clearInterval(timer);
            delete animationTimers[id];
        }
        elemento.innerText = prefixo + Math.round(atual).toLocaleString("pt-BR");
    },15);
    animationTimers[id] = timer;
}
