#!/usr/bin/env bash
# ==============================================================================
# deploy-prod.sh — Despliegue de NovaApp (Visitas Técnicas) a Producción (VPS)
# Dominio: novaapp.novateam.tech
# Puerto interno: 127.0.0.1:3006 -> contenedor 80
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

VPS_IP="${VPS_IP:-5.183.8.172}"
REMOTE_SRC="/opt/nova/novaapp-src"

echo "==> 1. Sincronizando código fuente a VPS ($VPS_IP:$REMOTE_SRC)..."
ssh root@"$VPS_IP" "mkdir -p $REMOTE_SRC"
rsync -az --delete \
  --exclude '.git' \
  --exclude '.expo' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env*' \
  --exclude 'android' \
  --exclude 'ios' \
  --exclude '.DS_Store' \
  "$REPO_ROOT/" "root@$VPS_IP:$REMOTE_SRC/"

echo "==> 2. Compilando y desplegando contenedor novaapp-web en VPS..."
ssh root@"$VPS_IP" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/nova/novaapp-src

# Resguardar imagen previa para rollback
podman tag localhost/novaapp-web:latest localhost/novaapp-web:previous 2>/dev/null || true

# Compilar imagen podman con ulimit adecuado para empaquetado de Metro
podman build --ulimit nofile=65536:65536 -t localhost/novaapp-web:latest -f Dockerfile .

# Reemplazar contenedor
podman rm -f novaapp-web 2>/dev/null || true
podman run -d \
  --name novaapp-web \
  --network nova-internal \
  --restart always \
  -p 127.0.0.1:3006:80 \
  localhost/novaapp-web:latest

# Limpiar capas intermedias
podman image prune -f

# Verificar health check local
sleep 2
curl -fsSI http://127.0.0.1:3006/ | head -n 1
echo "==> Contenedor novaapp-web activo en 127.0.0.1:3006:80."
REMOTE

echo "==> 3. Verificando endpoint HTTPS público..."
curl -fsSI https://novaapp.novateam.tech/ | head -n 1 || echo "Nota: Si el DNS o SSL aún no están configurados, valida primero Nginx y Certbot."
echo "==> Despliegue de NovaApp finalizado con éxito."

