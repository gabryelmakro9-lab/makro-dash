# PROJECT MEMORY - Makro Dashboard v2

## IDENTIDADE
Dashboard corporativo da Makro Engenharia para monitoramento de danos, frota, metas e KPIs. Vanilla JS + Vite + Supabase.

---

## STACK
- **Bundler:** Vite 8.1.2 (build: `npm run build`, dev: `npm run dev` na porta 3000)
- **Database:** Supabase REST API via fetch (NÃO usa o cliente JS diretamente, usa `@supabase/supabase-js` apenas para Realtime)
- **Charts:** Chart.js 4.5.1
- **PDF:** jsPDF + jspdf-autotable + html2canvas
- **Excel:** xlsx (SheetJS)
- **Email:** EmailJS (verificacao de login)
- **Testes:** Vitest + jsdom
- **Deploy:** Vercel (`makro-dash-7bz7`)

---

## ARQUITETURA DE ARQUIVOS

```
/
├── index.html               # Estrutura unica (SPA), login + dashboard + frota + config
├── vite.config.js           # define: SUPABASE_URL, SUPABASE_ANON, EMAILJS_*, DEVELOPER_EMAIL, LOGIN_PASSWORD
├── vercel.json              # SPA rewrites para index.html
├── public/
│   ├── sw.js                # Service Worker v3 (network-first HTML, precache so index)
│   ├── data/
│   │   ├── frota.js         # 10.25MB - window._frotaData = [...] (4053 registros)
│   │   └── frota.json       # 10.25MB - JSON puro (mesmo conteudo)
│   └── assets/
│       └── frota.json       # Copia do mesmo JSON (fallback de carregamento)
├── js/
│   ├── app.js               # Entry point: init, Excel upload, data normalization, event binding
│   ├── state.js             # Estado global compartilhado (dados, cadastroEquipamentos, charts, etc)
│   ├── utils.js             # parseValorMonetario, formatarMoeda, formatarData, EmailJS, progressSteps, helpers
│   ├── auth.js              # Login flow (password + EmailJS + Supabase), permissoes, perfil
│   ├── supabase.js          # Todas as chamadas Supabase: users CRUD, danos CRUD, metas CRUD, Realtime
│   ├── dashboard.js         # KPI computation, charts, tabela, drill-down, metas, alertas
│   ├── equipamentos.js      # Frota loading, equipamentos dashboard, ficha tecnica modal
│   ├── config.js            # Aba de configuracoes: metas, usuarios, "sobre"
│   └── pdf.js               # Geracao de relatorio PDF
├── css/
│   └── style.css            # Estilo unico (dark theme, tooltips custom, grids)
└── dist/                    # Build output (enviado para Vercel)
```

---

## SUPABASE

### URL
`https://lxdszgtcrqpjczjehwhy.supabase.co`

### Tabelas

**users** — registro de usuarios do dashboard
- `email` (PK), `name`, `first_name`, `last_name`, `sector`, `role` (admin/viewer), `last_login`, `dev` (boolean), `created_at`

**danos** — registros de ordens de servico/danos
- `id` (PK auto), `os`, `valor_sa`, `valor_sc`, `bem`, `sc`, `filial`, `unidade`, `tipo`, `data`, `descricao`, `created_at`

**metas** — metas configuradas (1 unica linha, id=1)
- `id`, `meta_mensal_sa`, `meta_ticket_medio`, `meta_gap_max`, `alerta_limite_dano`, `updated_at`

### Autenticacao
- **Nao usa Supabase Auth** — usa hardcoded password + EmailJS para verificacao
- Senha: `makro123`
- Dev email: `gabryel.silva@makroengenharia.com` (login direto sem verificacao)
- Novos usuarios: password → email code (EmailJS) → preencher perfil → login
- Usuarios existentes (com first_name no Supabase): login direto apos password

### APIs Storage
- **danos:** DELETE + POST em batch de 500 para upload; GET paginado (1000/page) para load
- **users:** GET all, GET by email, POST register, PATCH role, PATCH perfil
- **metas:** GET id=1, PATCH id=1
- **Realtime:** subscribe `postgres_changes` na tabela `danos` para atualizar dashboard em tempo real

---

## FLUXO DE DADOS

### Login
1. Usuario digita email + senha (`makro123`)
2. Se senha errada → bloqueado
3. Se email = dev → login direto (role admin)
4. Se email existe no Supabase com `first_name` → login direto
5. Senao → EmailJS envia codigo de 6 digitos → usuario confirma → modal de perfil → salva no Supabase → login

### Carregamento de Dados (Ordem de prioridade)
1. Tenta carregar do Supabase (`supabaseCarregarDados`)
2. Se falhar, tenta do localStorage (`makroDashboardDados`)
3. Se falhar, exibe tela para upload de Excel

### Upload Excel -> Supabase
1. Usuario faz upload do Excel (.xlsx)
2. Le sheet[0] com XLSX
3. Normaliza colunas (trim headers): "Valor SA total", "Valor SC total", "Ordem Serv.", "Bem", "Filial", "Unidade", "Tipo", "Data", "Descricao"
4. Filtra linhas com valorSA=0 e valorSC=0
5. Salva no localStorage
6. Envia para Supabase (DELETE + INSERT batch 500)
7. Atualiza dashboard

### Frota (equipamentos)
- Fonte: arquivos estaticos em `public/data/` e `public/assets/`
- Carregamento assincrono (nao bloqueia login)
- Ordem: window._frotaData (inline) → fetch frota.json → script tag frota.js
- Indexado por `Bem` (normalizado: trim, uppercase, remove espacos duplos)
- Usado no painel de equipamentos para exibir nome, local, status, specs

---

## KPI COMPUTATIONS (dashboard.js)

### KPIs Principais
| KPI | ID | Formula |
|-----|----|---------|
| Valor Total de Danos (Critico) | `kpiSA` | Soma `valorSA` onde tipo = "Dano Critico" + "Dano Nao Critico" |
| Gap Financeiro | `kpiGap` | `totalSA - totalSC` |
| Total OS | `kpiOs` | `new Set(lista.map(x => x.os)).size` |
| Ticket Medio | `kpiTicket` | `totalSA / totalOS` |
| Total Possiveis Danos Identif. | `kpiDanoTotal` | Soma `valorSA` onde tipo = "Dano Sem Identificacao" + "Dano Nao Categorizado" |

### Metas (configuraveis via Supabaase)
| Meta | Chave | Default |
|------|-------|---------|
| Meta Mensal SA | `metaMensalSA` | R$ 500.000 |
| Ticket Medio | `metaTicketMedio` | R$ 15.000 |
| Gap Maximo | `metaGapMax` | R$ 100.000 |
| Alerta Limite Dano | `alertaLimiteDano` | R$ 200.000 |

### Alertas (dashboard.js ~linha 460)
- Gap Financeiro Elevado (se `gap > metaGapMax`)
- Ticket Medio Alto (se `ticket > metaTicketMedio`)
- Dano Nao Categorizado Alto (se `possiveisDanos > alertaLimiteDano`)

### KPIs Equipamentos
| KPI | ID | Descricao |
|-----|----|-----------|
| Total da Frota | `kpiTotalEquipamentos` | Itens com Categoria = "Bem" |
| Disponibilidade Fisica | `kpiDisponibilidade` | (Ativos / Total) * 100 |
| Ativos Operacionais | `kpiAtivosOp` | Sit. Manut. = "ATIVO" |
| Em Manutencao | `kpiEmManutencao` | Sit. Manut. contem "MANUT" |
| Custo Total Frota | `kpiCustoTotalFrota` | Soma de valorSA agrupado por bem |
| Ticket Medio OS | `kpiTicketFrota` | CustoTotal / TotalOS |

### Classificacao de Danos (case-insensitive)
```js
function isDanoCategorizado(tipo) {
  const t = (tipo || '').toLowerCase();
  return t === 'dano critico' || t === 'dano não critico';
}
function isPossivelDano(tipo) {
  const t = (tipo || '').toLowerCase();
  return t === 'dano sem identificação' || t === 'dano não categorizado';
}
```

---

## FROTA (BASE DE VEICULOS)

### Arquivos (3 copias)
- `public/data/frota.js` (JS com `window._frotaData = [...]`)
- `public/data/frota.json` (JSON puro)
- `public/assets/frota.json` (JSON puro, fallback)

### Ultima atualizacao
- **Data:** 09/07/2026
- **Origem:** `C:\Users\gabryel.silva\Documents\BASE VEICULOS\base veiculos 0907.xlsx`
- **Registros:** 4.053 (antes: 4.042)
- **Colunas (principais):** `Bem`, `Descricao`, `Categoria`, `Nome do Bem`, `Sit. Manut.`, `Nome Familia`, `Filial`, `Local Atual`, `Nome Fabrica`, `Fabricante`, `Ano Fabric.`, `Cap. Tanque`, `Cont. Acum.`, `Valor Compra`, `Valor Venal`, `Placa`, `Proprietario`, `Nome C.Custo`, `Nome Estoque`
- **Mudancas:** 11 registros novos, 0 removidos, 41 alteracoes de Local Atual

### Como atualizar a frota
```powershell
# Script para converter Excel -> frota.js + frota.json
# 1. Instalar xlsx: npm install xlsx
# 2. Rodar (exemplo):
$env:NODE_PATH=".\node_modules"
node -e "
const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('CAMINHO_DO_EXCEL.xlsx');
const dados = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  .map(row => { const o={}; Object.keys(row).forEach(k=>{o[k.trim()]=row[k]}); return o; });
const json = JSON.stringify(dados, null, 2);
fs.writeFileSync('public/data/frota.js', 'window._frotaData = ' + json + ';', 'utf8');
fs.writeFileSync('public/data/frota.json', json, 'utf8');
fs.writeFileSync('public/assets/frota.json', json, 'utf8');
console.log('OK:', dados.length, 'registros');
"
```

---

## DEPLOY (VERCEL)

### Comando
```powershell
npx vercel --prod
```

### Credenciais Vercel
- Projeto: `makro-dash-7bz7`
- URL: `https://makro-dash-7bz7.vercel.app`
- Framework: Vite
- Build: `npm run build`
- Output: `dist/`
- SPA rewrites: `/(.*)` -> `/index.html`

### Deploy manual
1. Fazer alteracoes nos arquivos
2. `npx vercel --prod`
3. Aguardar build (upload + Vercel build ~20-30s)
4. Hard refresh (Ctrl+Shift+R) no navegador para limpar cache

---

## SERVICE WORKER
- **Arquivo:** `public/sw.js`
- **Cache name:** `makro-dashboard-v3`
- **Precache:** so `/` e `/index.html`
- **HTML:** network-first (tenta fetch, fallback cache)
- **Frota.js:** NAO esta no precache (carregada sob demanda)
- **API/rest:** network-only com fallback 503

---

## EMAILJS
- **Public Key:** `VA450vL4O8IlsrfI_`
- **Service ID:** `service_3ke998y`
- **Template ID:** `template_6kzv9jf`
- **Uso:** Envio de codigo de 6 digitos para verificacao de email no login

---

## COMANDOS UTEIS

```powershell
# Dev server
npm run dev

# Build
npm run build

# Testes
npm test

# Deploy
npx vercel --prod

# Ver frota atual (antes vs depois)
$env:NODE_PATH=".\node_modules"
node -e "
const old = JSON.parse(require('fs').readFileSync('dist/data/frota.json','utf8'));
const novo = JSON.parse(require('fs').readFileSync('public/data/frota.json','utf8'));
console.log('Antiga:', old.length, 'Nova:', novo.length);
"
```

---

## OBSERVACOES IMPORTANTES

### Ordem de carregamento dos dados
1. Supabase (online)
2. localStorage (offline/cache)
3. Upload manual Excel

### Frota nao bloqueia login
- O script `data/frota.js` e carregado com `async` no index.html
- `carregarFrotaJson()` tenta carregar em background (nao e `await` no login)
- O painel de equipamentos so funciona apos o carregamento da frota

### File size warning
- `frota.js` e `frota.json` tem ~10.25MB cada (4053 registros)
- Vercel aceita arquivos de ate 50MB no upload

### Colunas do Excel de danos (case-sensitive)
Esperadas (apos trim): `Ordem Serv.`, `Valor SA total`, `Valor SC total`, `Bem`, `SC`, `Filial`, `Unidade`, `Tipo`, `Data`, `Descricao`

### Metas - tabela Supabase
- 1 unica linha (id=1)
- Criar via SQL em PASSO_A_PASSO_SUPABASE.txt
- Valores default sao usados se a tabela estiver vazia

### Permissoes
- **admin:** Import Excel, configuracoes, gerenciar usuarios
- **viewer:** Visualizacao apenas
- Dev email sempre admin
