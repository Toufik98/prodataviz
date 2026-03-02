#!/usr/bin/env bash
# --------------------------------------------------
# setup-server.sh — First-time server setup
# Run ON the server. Sets up Docker, GHCR auth,
# seeds the database, and starts containers.
#
# Prerequisites:
#   - GitHub PAT with read:packages scope (stored in CR_PAT env or prompted)
#   - deploy/nginx-prodataviz.conf and docker-compose.prod.yml synced
#
# Usage: bash deploy/setup-server.sh
# --------------------------------------------------
set -euo pipefail

APP_DIR="$HOME/prodataviz"
REGISTRY="ghcr.io"
GITHUB_USER="toufik98"
COMPOSE_FILE="docker-compose.prod.yml"

echo "==============================================="
echo "  ProDataViz — Server Setup"
echo "==============================================="

# -- 1. Install Docker -----------------------------
echo ""
echo "[1/5] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "  Docker installed. You may need to log out/in for group changes."
else
  echo "  Docker already installed: $(docker --version)"
fi

sudo systemctl enable --now docker

# -- 2. Install Docker Compose plugin --------------
echo ""
echo "[2/5] Checking Docker Compose..."
if ! docker compose version &>/dev/null; then
  sudo apt install -y docker-compose-plugin
fi
echo "  $(docker compose version)"

# -- 3. Authenticate to GHCR -----------------------
echo ""
echo "[3/5] Authenticating to GitHub Container Registry..."
if [ -z "${CR_PAT:-}" ]; then
  echo "  Enter a GitHub Personal Access Token (read:packages scope):"
  read -rsp "  Token: " CR_PAT
  echo ""
fi
echo "$CR_PAT" | docker login "$REGISTRY" -u "$GITHUB_USER" --password-stdin
echo "  ✓ Authenticated to ${REGISTRY}"

# -- 4. Seed database if needed --------------------
echo ""
echo "[4/5] Checking database..."
if [ ! -f "$APP_DIR/data/prodataviz.db" ]; then
  echo "  Seeding database (one-time)..."
  cd "$APP_DIR"
  # Pull backend image and run seed script
  docker compose -f "$COMPOSE_FILE" pull backend
  docker compose -f "$COMPOSE_FILE" run --rm backend python scripts/seed.py
  echo "  ✓ Database seeded."
else
  echo "  Database already exists. Delete data/prodataviz.db to re-seed."
fi

# -- 5. Open firewall ports -------------------------
echo ""
echo "[5/5] Opening firewall ports..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
sudo ip6tables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
sudo ip6tables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
sudo sh -c "iptables-save > /etc/iptables/rules.v4" 2>/dev/null || true
sudo sh -c "ip6tables-save > /etc/iptables/rules.v6" 2>/dev/null || true
echo "  ✓ Firewall updated."

# -- 6. Pull images & start -------------------------
echo ""
echo "Starting deployment..."
cd "$APP_DIR"
bash deploy/deploy.sh

echo ""
echo "==============================================="
echo "  ✓ Setup complete!"
echo "  Live at: https://tferhat.com/projects/prodataviz/"
echo ""
echo "  Future deployments:"
echo "    bash deploy/deploy.sh           # pull latest"
echo "    bash deploy/deploy.sh abc1234   # deploy specific tag"
echo "==============================================="
