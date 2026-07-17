export let dados = [];
export let cadastroEquipamentos = [];
export let indiceFrota = {};
export let fleetStats = { total: 0, operacionais: 0, manutencao: 0, disponibilidade: "100" };
export let chartMensal;
export let chartTipo;
export let chartFilial;
export let chartUnidade;
export let tabelaSortKey = null;
export let tabelaSortOrder = "asc";
export let autoRefreshTimer = null;
export let animationTimers = {};
export let currentUserRole = null;
export let currentUserEmail = null;
export let currentUserProfile = null;

export function setDados(val) { dados = val; }
export function setCadastroEquipamentos(val) { cadastroEquipamentos = val; }
export function setIndiceFrota(val) { indiceFrota = val; }
export function setFleetStats(val) { fleetStats = val; }
export function setChartMensal(val) { chartMensal = val; }
export function setChartTipo(val) { chartTipo = val; }
export function setChartFilial(val) { chartFilial = val; }
export function setChartUnidade(val) { chartUnidade = val; }
export function setAutoRefreshTimer(val) { autoRefreshTimer = val; }
export function setCurrentUserRole(val) { currentUserRole = val; }
export function setCurrentUserEmail(val) { currentUserEmail = val; }
export function setCurrentUserProfile(val) { currentUserProfile = val; }
export function setTabelaSortKey(val) { tabelaSortKey = val; }
export function setTabelaSortOrder(val) { tabelaSortOrder = val; }
