#!/usr/bin/env bash
# --------------------------------------------------
# update.sh — Update deployment after code changes
# Run ON the server after push.sh has synced files.
# --------------------------------------------------
set -euo pipefail

APP_DIR="$HOME/prodataviz"
SERVER_IP="${1:-$(curl -s4 --max-time 3 ifconfig.me 2>/dev/null || curl -s6 --max-time 3 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')}"
# Wrap IPv6 in brackets for URLs
if [[ "$SERVER_IP" == *:* ]]; then
  SERVER_URL="[${SERVER_IP}]"
else
  SERVER_URL="${SERVER_IP}"
fi
# Use empty API URL so frontend uses relative paths (same host via nginx)
export NEXT_PUBLIC_API_URL="/projects/prodataviz"
export CORS_ORIGINS="http://${SERVER_URL},http://${SERVER_URL}:3000"

echo ">> Updating ProDataViz..."

cd "$APP_DIR"

# Rebuild and restart containers
echo "[1/2] Rebuilding containers..."
docker compose build

echo "[2/2] Restarting..."
docker compose up -d

# Verify
sleep 3
echo ""
echo "Container status:"
docker compose ps
echo ""

BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null || echo "fail")
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "fail")

echo "  Backend:  ${BACKEND_STATUS}"
echo "  Frontend: ${FRONTEND_STATUS}"

if [[ "$BACKEND_STATUS" == "200" && "$FRONTEND_STATUS" == "200" ]]; then
  echo ""
  echo ">> Update successful! App live at http://${SERVER_URL}"
else
  echo ""
  echo ">> WARNING: One or more services may not be healthy."
  echo "   Check logs: docker compose logs -f"
fi
