#!/usr/bin/env bash
# init.sh — Verificação e inicialização do ambiente
#
# Este script é executado pelo agente ao COMEÇAR uma sessão e antes de
# declarar qualquer tarefa como `done`. Se falhar, a sessão não deve avançar.
#
# Saída esperada: códigos de saída claros e blocos marcados com [OK]/[FAIL].

set -u
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail()  { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }

EXIT_CODE=0

echo "── 1. Verificando ambiente ─────────────────────────────"

# Node disponível
if ! command -v node >/dev/null 2>&1; then
  fail "node não está instalado"
  exit 1
fi
ok "node -> $(node --version)"

# Versão mínima 20 (ESM estável, fetch global)
NODE_VERSION_OK=$(node -e 'process.stdout.write(process.versions.node.split(".")[0] >= 20 ? "1" : "0")')
if [ "$NODE_VERSION_OK" != "1" ]; then
  fail "É necessário Node.js >= 20"
  exit 1
fi
ok "Versão de Node.js compatível"

if ! command -v npm >/dev/null 2>&1; then
  fail "npm não está instalado"
  exit 1
fi
ok "npm -> $(npm --version)"

echo ""
echo "── 2. Verificando arquivos base do arnês ──────────────"

for f in AGENTS.md feature_list.json progress/current.md docs/architecture.md docs/conventions.md docs/verification.md CHECKPOINTS.md; do
  if [ ! -f "$f" ]; then
    fail "Falta arquivo base: $f"
    EXIT_CODE=1
  else
    ok "Existe $f"
  fi
done

echo ""
echo "── 3. Validando feature_list.json e specs ─────────────"

if node scripts/validate-features.mjs; then
  :
else
  EXIT_CODE=1
fi

echo ""
echo "── 4. Executando testes ─────────────────────────────────"

if [ -f "package.json" ]; then
  if [ ! -d "node_modules" ]; then
    warn "node_modules ausente, executando npm install"
    npm install --silent || { fail "npm install falhou"; EXIT_CODE=1; }
  fi
  TEST_FILE_COUNT=$(find tests -type f -name "*.test.js" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$TEST_FILE_COUNT" -eq 0 ]; then
    warn "Ainda não há arquivos tests/*.test.js"
  else
    if npm test --silent; then
      ok "Todos os testes passam"
    else
      fail "Há testes quebrados"
      EXIT_CODE=1
    fi
  fi
else
  warn "package.json ainda não existe"
fi

echo ""
echo "── 5. Resumo ──────────────────────────────────────────"

if [ $EXIT_CODE -eq 0 ]; then
  ok "Ambiente pronto. Você pode começar a trabalhar."
else
  fail "Ambiente NÃO está pronto. Resolva os erros antes de avançar."
fi

exit $EXIT_CODE
