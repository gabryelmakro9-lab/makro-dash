#!/bin/bash
# ============================================================
# Script de cleanup de secrets do repositório Git
# ============================================================
# Remove .env, .env.local e .env.example do tracking do Git
# sem deletar os arquivos do disco.
# ============================================================

set -e

echo "=== Removendo secrets do tracking do Git ==="

# Remove do index (mantém arquivos no disco)
git rm --cached .env 2>/dev/null && echo "  .env removido do tracking" || echo "  .env não estava no tracking"
git rm --cached .env.local 2>/dev/null && echo "  .env.local removido do tracking" || echo "  .env.local não estava no tracking"
git rm --cached .env.example 2>/dev/null && echo "  .env.example removido do tracking" || echo "  .env.example não estava no tracking"

# Verifica se há alterações para commitar
if git diff --cached --quiet; then
    echo "Nenhuma alteração para commit."
else
    echo ""
    echo "=== Deseja remover do histórico também? (apaga dos commits antigos) ==="
    echo "Comando: git filter-branch --force --index-filter"
    echo "  'git rm --cached --ignore-unmatch .env .env.local .env.example'"
    echo "  --prune-empty --tag-name-filter cat -- --all"
    echo ""
    echo "Ou use git-filter-repo (recomendado):"
    echo "  pip install git-filter-repo"
    echo "  git filter-repo --path .env --path .env.local --path .env.example --invert-paths"
    echo ""
    echo "Depois force push:"
    echo "  git push origin --force --all"
fi

echo ""
echo "=== Verificando se ainda há secrets no tracking ==="
git ls-files .env .env.local .env.example
