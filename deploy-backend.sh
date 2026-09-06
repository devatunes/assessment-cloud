#!/usr/bin/env bash
# deploy-backend.sh — Empaqueta la Lambda NestJS y la despliega en AWS.
# Uso: ./deploy-backend.sh [--skip-package]
#   --skip-package   Sube directamente el lambda.zip existente sin re-compilar.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
IAC_DIR="$(cd "$SCRIPT_DIR/../app-iac" && pwd)"

# ── colores ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[backend]${NC} $*"; }
warn()  { echo -e "${YELLOW}[backend]${NC} $*"; }
error() { echo -e "${RED}[backend]${NC} $*" >&2; exit 1; }

# ── argumentos ───────────────────────────────────────────────────────────────
SKIP_PACKAGE=false
for arg in "$@"; do
  case "$arg" in
    --skip-package) SKIP_PACKAGE=true ;;
    *) error "Argumento desconocido: $arg" ;;
  esac
done

# ── validaciones ─────────────────────────────────────────────────────────────
command -v aws &>/dev/null || error "aws cli no está instalado"
command -v npm &>/dev/null || error "npm no está instalado"

# ── leer outputs de Terraform ─────────────────────────────────────────────────
get_tf_output() {
  local key="$1"
  (cd "$IAC_DIR" && terraform output -raw "$key" 2>/dev/null) || true
}

LAMBDA_NAME=$(get_tf_output "assessment_lambda_function_name")

if [[ -z "$LAMBDA_NAME" ]]; then
  warn "No se pudo leer el output de Terraform, leyendo tfvars..."
  LAMBDA_NAME=$(grep 'assessment_backend_name' "$IAC_DIR/terraform.tfvars" | head -1 | sed 's/.*= *"\(.*\)"/\1/')
fi

[[ -n "$LAMBDA_NAME" ]] || error "No se pudo determinar el nombre de la Lambda."

ZIP="$BACKEND_DIR/lambda.zip"

# ── empaquetar ───────────────────────────────────────────────────────────────
cd "$BACKEND_DIR"

if ! $SKIP_PACKAGE; then
  info "Empaquetando Lambda (build + dependencias de producción + zip)..."
  npm run package:lambda
else
  warn "--skip-package activo: usando lambda.zip existente."
  [[ -f "$ZIP" ]] || error "No existe $ZIP. Ejecuta sin --skip-package primero."
fi

ZIP_SIZE=$(du -sh "$ZIP" | cut -f1)
info "Artefacto listo: lambda.zip ($ZIP_SIZE)"

# ── desplegar ────────────────────────────────────────────────────────────────
info "Actualizando código de Lambda: $LAMBDA_NAME..."
aws lambda update-function-code \
  --function-name "$LAMBDA_NAME" \
  --zip-file "fileb://$ZIP" \
  --no-cli-pager \
  --query '{FunctionName:FunctionName,CodeSize:CodeSize,LastModified:LastModified}' \
  --output table

info "Esperando que la Lambda quede activa..."
aws lambda wait function-updated --function-name "$LAMBDA_NAME"

info "✅ Backend desplegado: $LAMBDA_NAME (las migraciones corren solas al arrancar)"
