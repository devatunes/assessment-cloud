#!/usr/bin/env bash
# deploy-executor.sh — Empaqueta y despliega la Lambda executor (sandbox de código JS).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXECUTOR_DIR="$SCRIPT_DIR/executor"
IAC_DIR="$(cd "$SCRIPT_DIR/../app-iac" && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[executor]${NC} $*"; }
warn()  { echo -e "${YELLOW}[executor]${NC} $*"; }
error() { echo -e "${RED}[executor]${NC} $*" >&2; exit 1; }

command -v aws &>/dev/null || error "aws cli no está instalado"

get_tf_output() {
  local key="$1"
  (cd "$IAC_DIR" && terraform output -raw "$key" 2>/dev/null) || true
}

FUNCTION_NAME=$(get_tf_output "assessment_executor_function_name")
[[ -n "$FUNCTION_NAME" ]] || error "No se pudo leer assessment_executor_function_name desde Terraform."

# ── correr el test local del runner antes de desplegar ───────────────────────
cd "$EXECUTOR_DIR"
info "Corriendo pruebas locales del runner..."
node test-local.js

info "Empaquetando executor.zip..."
rm -f executor.zip
zip -q executor.zip index.js runner.js

ZIP_SIZE=$(du -sh executor.zip | cut -f1)
info "Artefacto listo: executor.zip ($ZIP_SIZE)"

info "Actualizando código de Lambda: $FUNCTION_NAME..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://executor.zip" \
  --no-cli-pager \
  --query '{FunctionName:FunctionName,CodeSize:CodeSize,LastModified:LastModified}' \
  --output table

aws lambda wait function-updated --function-name "$FUNCTION_NAME"
info "✅ Executor desplegado: $FUNCTION_NAME"
