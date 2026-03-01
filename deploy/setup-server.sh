#!/usr/bin/env bash
# --------------------------------------------------
# setup-server.sh — First-time server setup (Docker)
# Run this ON the Oracle VM after pushing the code.
# --------------------------------------------------
set -euo pipefail

APP_DIR="$HOME/prodataviz"

echo "==============================================="
echo "  ProDataViz — Server Setup (Docker)"
echo "==============================================="

# -- 1. Install Docker -----------------------------
echo ""
echo "[1/4] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "  Docker installed. You may need to log out/in for group changes."
else
  echo "  Docker already installed: $(docker --version)"
fi

# Ensure Docker is running
sudo systemctl enable --now docker

# -- 2. Install Docker Compose plugin --------------
echo ""
echo "[2/4] Checking Docker Compose..."
if ! docker compose version &>/dev/null; then
  sudo apt install -y docker-compose-plugin
fi
echo "  $(docker compose version)"

# -- 3. Seed database if needed --------------------
echo ""
echo "[3/4] Checking database..."
if [ ! -f "$APP_DIR/data/prodataviz.db" ]; then
  echo "  Seeding database (one-time)..."
  cd "$APP_DIR"
  docker compose run --rm backend python scripts/seed.py
  echo "  Database seeded."
else
  echo "  Database already exists. Delete data/prodataviz.db to re-seed."
fi

# -- 4. Open firewall ports -------------------------
echo ""
echo "[4/4] Opening firewall ports..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
sudo sh -c "iptables-save > /etc/iptables/rules.v4" 2>/dev/null || true
echo "  Firewall updated."

# -- 5. Build & start containers --------------------
echo ""
echo "[5/5] Building and starting containers..."
cd "$APP_DIR"
docker compose up -d --build

echo ""
echo "==============================================="
echo "  Deployment complete!"
echo "  App:  http://84.235.235.15"
echo "  API:  http://84.235.235.15/api/"
echo "  Docs: http://84.235.235.15/docs"
echo ""
echo "  Useful commands:"
echo "    docker compose ps          # status"
echo "    docker compose logs -f     # logs"
echo "    docker compose down        # stop"
echo "    docker compose up -d       # start"
echo "==============================================="
