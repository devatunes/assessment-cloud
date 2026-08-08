#!/usr/bin/env bash
# deploy-frontend.sh — Build del frontend Angular y publicación a S3 + CloudFront.
# Uso: ./deploy-frontend.sh [--skip-build]
#   --skip-build   Sube directamente el dist/browser/ existente sin re-compilar.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
IAC_DIR="$(cd "$SCRIPT_DIR/../app-iac" && pwd)"
ENV_FILE="$FRONTEND_DIR/src/environments/environment.ts"

# ── colores ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[frontend]${NC} $*"; }
warn()  { echo -e "${YELLOW}[frontend]${NC} $*"; }
error() { echo -e "${RED}[frontend]${NC} $*" >&2; exit 1; }

# ── argumentos ───────────────────────────────────────────────────────────────
SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    *) error "Argumento desconocido: $arg" ;;
  esac
done

# ── validaciones ─────────────────────────────────────────────────────────────
command -v aws &>/dev/null || error "aws cli no está instalado"
command -v npm &>/dev/null || error "npm no está instalado"

# ── leer valores de Terraform ────────────────────────────────────────────────
get_tf_output() {
  local key="$1"
  (cd "$IAC_DIR" && terraform output -raw "$key" 2>/dev/null) || true
}

BUCKET=$(get_tf_output "assessment_frontend_bucket_name")
API_URL=$(get_tf_output "assessment_api_url")

if [[ -z "$BUCKET" ]]; then
  warn "No se pudo leer el output de Terraform, leyendo tfvars..."
  BUCKET=$(grep 'assessment_frontend_bucket_name' "$IAC_DIR/terraform.tfvars" | sed 's/.*= *"\(.*\)"/\1/')
fi

[[ -n "$BUCKET" ]] || error "No se pudo determinar el bucket S3 de destino."
[[ -n "$API_URL" ]] || error "No se pudo leer assessment_api_url desde Terraform. Corre 'terraform apply' primero."

# API_URL viene con / final desde API Gateway; se lo quitamos para armar environment.ts limpio.
API_URL="${API_URL%/}"

DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[0].DomainName && contains(Origins.Items[0].DomainName,'${BUCKET}')].Id | [0]" \
  --output text 2>/dev/null || true)
[[ "$DISTRIBUTION_ID" == "None" ]] && DISTRIBUTION_ID=""

# ── build ────────────────────────────────────────────────────────────────────
cd "$FRONTEND_DIR"

if ! $SKIP_BUILD; then
  info "Instalando dependencias..."
  npm ci --prefer-offline

  info "Apuntando el frontend a la API desplegada: $API_URL"
  cp "$ENV_FILE" "$ENV_FILE.bak"
  cat > "$ENV_FILE" <<EOF
export const environment = {
  production: true,
  apiUrl: '${API_URL}',
};
EOF

  info "Compilando frontend..."
  npm run build -- --configuration production

  info "Restaurando environment.ts local..."
  mv "$ENV_FILE.bak" "$ENV_FILE"
else
  warn "--skip-build activo: usando dist/browser/ existente."
  [[ -d "dist/browser" ]] || error "No existe dist/browser/. Ejecuta sin --skip-build primero."
fi

# ── subida a S3 ──────────────────────────────────────────────────────────────
info "Sincronizando con S3: s3://$BUCKET"
aws s3 sync dist/browser/ "s3://$BUCKET/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

# index.html siempre sin caché para que CloudFront sirva la versión más reciente
aws s3 cp dist/browser/index.html "s3://$BUCKET/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"

# ── invalidación CloudFront ───────────────────────────────────────────────────
if [[ -n "$DISTRIBUTION_ID" ]]; then
  info "Invalidando caché de CloudFront (Distribution: $DISTRIBUTION_ID)..."
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' --output text)
  info "Invalidación creada: $INVALIDATION_ID"
else
  warn "No se encontró Distribution ID de CloudFront. Invalida manualmente si es necesario."
fi

info "✅ Frontend desplegado en s3://$BUCKET"
