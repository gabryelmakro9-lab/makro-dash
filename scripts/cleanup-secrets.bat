@echo off
REM ============================================================
REM Cleanup de secrets do repositório Git (Windows)
REM ============================================================
echo === Removendo secrets do tracking do Git ===

git rm --cached .env 2>nul && echo   .env removido do tracking || echo   .env nao estava no tracking
git rm --cached .env.local 2>nul && echo   .env.local removido do tracking || echo   .env.local nao estava no tracking
git rm --cached .env.example 2>nul && echo   .env.example removido do tracking || echo   .env.example nao estava no tracking

git diff --cached --quiet
if %errorlevel% equ 0 (
    echo Nenhuma alteracao para commit.
) else (
    echo.
    echo === Deseja remover do historico tambem? ===
    echo git filter-branch --force --index-filter
    echo   "git rm --cached --ignore-unmatch .env .env.local .env.example"
    echo   --prune-empty --tag-name-filter cat -- --all
    echo.
    echo Ou instale git-filter-repo via pip e use:
    echo   git filter-repo --path .env --path .env.local --path .env.example --invert-paths
)
echo.
echo === Verificando se ainda ha secrets no tracking ===
git ls-files .env .env.local .env.example
pause
