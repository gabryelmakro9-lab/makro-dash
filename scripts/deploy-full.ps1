param(
    [string]$GitRemote = "",
    [switch]$NoSQL
)

$ErrorActionPreference = "Continue"
$Git = "C:\Users\gabryel.silva\AppData\Local\GitHubDesktop\app-3.6.1\resources\app\git\mingw64\bin\git.exe"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MAKRO DASHBOARD - DEPLOY AUTOMATIZADO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ---- 1. REMOTE ----
if (-not $GitRemote) {
    # Tenta adivinhar pelo Vercel project
    if (Test-Path ".vercel/project.json") {
        $v = Get-Content ".vercel/project.json" | ConvertFrom-Json
        $GitRemote = "https://github.com/makroenginner/$($v.projectName).git"
    }
}
if ($GitRemote) {
    Write-Host "[1/6] Configurando remote..." -ForegroundColor Green
    & $Git remote remove origin 2>$null
    & $Git remote add origin $GitRemote 2>&1 | Out-Null
    Write-Host "  Remote: $GitRemote" -ForegroundColor White
} else {
    Write-Host "[1/6] Remote nao informado - pula push" -ForegroundColor Yellow
}

# ---- 2. LIMPAR SECRETS DO TRACKING ----
Write-Host "[2/6] Removendo secrets do tracking..." -ForegroundColor Green
& $Git rm --cached .env 2>$null
& $Git rm --cached .env.local 2>$null
Write-Host "  .env e .env.local removidos do tracking" -ForegroundColor White

# ---- 3. CONFIRMAR ARQUIVOS RELEVANTES ----
Write-Host "[3/6] Arquivos que serao commitados:" -ForegroundColor Green
& $Git status --short 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor White }

# ---- 4. COMMIT ----
Write-Host "[4/6] Fazendo commit..." -ForegroundColor Green
& $Git add -A
$diff = & $Git diff --cached --stat
if (-not $diff) {
    Write-Host "  Nada para commitar." -ForegroundColor Yellow
} else {
    & $Git commit -m "fix: security hardening - RLS policies, Supabase auth, cleanup secrets" 2>&1
    Write-Host "  Commit feito!" -ForegroundColor Green
}

# ---- 5. PUSH ----
Write-Host "[5/6] Fazendo push..." -ForegroundColor Green
$remoteUrl = & $Git remote get-url origin 2>$null
if ($remoteUrl) {
    & $Git push origin master 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Push feito com sucesso!" -ForegroundColor Green
        Write-Host "  URL: $remoteUrl" -ForegroundColor White
    } else {
        Write-Host "  Push FALHOU. Verifique:" -ForegroundColor Red
        Write-Host "    - Se o remote esta correto: $remoteUrl" -ForegroundColor Yellow
        Write-Host "    - Se tem permissao de escrita no repositorio" -ForegroundColor Yellow
        Write-Host "    - Rode manualmente: git push origin master" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Remote nao configurado - pula push" -ForegroundColor Yellow
}

# ---- 6. SQL ----
if (-not $NoSQL) {
    Write-Host ""
    Write-Host "[6/6] SQL para rodar no Supabase:" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Abra https://supabase.com/dashboard/project/lxdszgtcrqpjczjehwhy" -ForegroundColor White
    Write-Host "Va em SQL Editor > New Query" -ForegroundColor White
    Write-Host "Cole o conteudo abaixo e execute (CTRL+ENTER):" -ForegroundColor White
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    $sql = Get-Content "migrations/003_rls_hardening.sql" -Raw
    Write-Host $sql -ForegroundColor Magenta
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  FINALIZADO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "POS-INSTALACAO (verificar no Supabase):" -ForegroundColor Yellow
Write-Host "  Authentication > Policies" -ForegroundColor White
Write-Host "  Confirmar que as policies estao ativas:" -ForegroundColor White
Write-Host "    danos_select_public, danos_insert_auth, danos_delete_auth" -ForegroundColor Cyan
Write-Host "    metas_select_public, metas_update_auth" -ForegroundColor Cyan
Write-Host "    users_select_public, users_insert_public, users_update_auth" -ForegroundColor Cyan
Write-Host "    frota_select_public, frota_insert_auth" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vercel deploy automatico em:" -ForegroundColor Yellow
Write-Host "  https://makro-dash-7bz7.vercel.app" -ForegroundColor Cyan
