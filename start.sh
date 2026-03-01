#!/usr/bin/env bash
# --------------------------------------------------
# start.sh -- Launch ProDataViz frontend & backend
# Frees ports 3000 (frontend) and 8000 (backend) if busy
# --------------------------------------------------
set -euo pipefail

FE_PORT=3000
BE_PORT=8000
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# -- Helpers ---------------------------------------

free_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "[!] Port $port is in use (PID(s): $pids). Killing..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 0.5
    echo "[ok] Port $port freed."
  else
    echo "[ok] Port $port is available."
  fi
}

cleanup() {
  echo ""
  echo "Shutting down..."
  [[ -n "${BE_PID:-}" ]] && kill "$BE_PID" 2>/dev/null
  [[ -n "${FE_PID:-}" ]] && kill "$FE_PID" 2>/dev/null
  wait 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# -- Free ports ------------------------------------

free_port "$BE_PORT"
free_port "$FE_PORT"

# -- Start backend ---------------------------------

echo ""
echo ">> Starting backend (uvicorn) on port ${BE_PORT}..."
cd "$ROOT_DIR/backend"
source .venv/bin/activate 2>/dev/null || true
uvicorn app.main:app --reload --port "${BE_PORT}" &
BE_PID=$!

# -- Start frontend --------------------------------

echo ">> Starting frontend (Next.js) on port ${FE_PORT}..."
cd "$ROOT_DIR/frontend"
npm run dev -- -p "${FE_PORT}" &
FE_PID=$!

# -- Wait ------------------------------------------

echo ""
echo "==========================================="
echo "  Frontend -> http://localhost:${FE_PORT}"
echo "  Backend  -> http://localhost:${BE_PORT}/docs"
echo "  Press Ctrl+C to stop both servers"
echo "==========================================="
echo ""

wait
