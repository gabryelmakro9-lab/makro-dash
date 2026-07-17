param(
    [switch]$NoBuild,
    [switch]$NoSQL
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MAKRO EXECUTIVE DASHBOARD - DEPLOY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Git
$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Host "[AVISO] Git nao encontrado no PATH." -ForegroundColor Yellow
    Write-Host "        Instale git: https://git-scm.com/downloads/win" -ForegroundColor Yellow
    Write-Host "        Ou use GitHub Desktop para fazer commit/push." -ForegroundColor Yellow
    Write-Host ""
    $continuar = Read-Host "Deseja continuar mesmo sem Git? (s/N)"
    if ($continuar -ne "s") { exit }
}

# 2. Build
if (-not $NoBuild) {
    Write-Host "[1/4] Buildando projeto..." -ForegroundColor Green
    $build = node "node_modules\vite\bin\vite.js" build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO no build:" -ForegroundColor Red
        $build | Out-String | Write-Host -ForegroundColor Red
        exit 1
    }
    Write-Host "Build concluido com sucesso!" -ForegroundColor Green
} else {
    Write-Host "[1/4] Build pulado (--NoBuild)" -ForegroundColor Yellow
}

# 3. Commit
if ($gitPath) {
    Write-Host "[2/4] Verificando arquivos para commit..." -ForegroundColor Green
    git add -A
    $status = git status --porcelain
    if ($status) {
        Write-Host "Arquivos alterados:" -ForegroundColor Yellow
        $status | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        $msg = Read-Host "Mensagem do commit (Enter para 'fix: security hardening - RLS, auth, secrets cleanup')"
        if (-not $msg) { $msg = "fix: security hardening - RLS, auth, secrets cleanup" }
        git commit -m $msg
        Write-Host "Commit feito: $msg" -ForegroundColor Green
    } else {
        Write-Host "Nenhuma alteracao para commit." -ForegroundColor Yellow
    }
} else {
    Write-Host "[2/4] Git nao disponivel - pule esta etapa manualmente" -ForegroundColor Yellow
    Write-Host "        Rode manualmente no terminal:" -ForegroundColor Yellow
    Write-Host "          git add -A" -ForegroundColor White
    Write-Host "          git commit -m 'fix: security hardening - RLS, auth, secrets cleanup'" -ForegroundColor White
}

# 4. Limpar secrets do historico
Write-Host "[3/4] Removendo secrets do tracking..." -ForegroundColor Green
if ($gitPath) {
    git rm --cached .env 2>$null
    git rm --cached .env.local 2>$null
    git rm --cached .env.example 2>$null
    Write-Host "Secrets removidos do tracking." -ForegroundColor Green
    Write-Host "ATENCAO: Para remover do historico git tambem, execute:" -ForegroundColor Yellow
    Write-Host "  git filter-repo --path .env --path .env.local --invert-paths" -ForegroundColor White
} else {
    Write-Host "Git nao disponivel - execute manualmente:" -ForegroundColor Yellow
    Write-Host "  git rm --cached .env .env.local" -ForegroundColor White
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DEPLOY - PROXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SQL no Supabase (OBRIGATORIO):" -ForegroundColor Yellow
Write-Host "   Abra https://supabase.com/dashboard/project/lxdszgtcrqpjczjehwhy" -ForegroundColor White
Write-Host "   Va para SQL Editor, cole o conteudo de:" -ForegroundColor White
Write-Host "   migrations/003_rls_hardening.sql" -ForegroundColor Cyan
Write-Host "   Execute (selecionar tudo > CTRL+ENTER)" -ForegroundColor White
Write-Host ""
Write-Host "2. Push para o repositorio:" -ForegroundColor Yellow
Write-Host "   git push origin master" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. A Vercel detecta automaticamente e faz o deploy." -ForegroundColor Yellow
Write-Host "   Acompanhe em: https://vercel.com/makroenginner/makro-dash-7bz7" -ForegroundColor White
Write-Host ""
Write-Host "4. Apos o deploy, testar:" -ForegroundColor Yellow
Write-Host "   https://makro-dash-7bz7.vercel.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Verificar RLS policies no Supabase:" -ForegroundColor Yellow
Write-Host "   Va em Authentication > Policies e confirme que as" -ForegroundColor White
Write-Host "   novas policies 'danos_select_public', 'danos_insert_auth'," -ForegroundColor White
Write-Host "   'danos_delete_auth' etc. estao ativas." -ForegroundColor White
