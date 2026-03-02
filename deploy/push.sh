#!/usr/bin/env bash
# --------------------------------------------------
# push.sh — Sync project to a remote server
# Usage: ./deploy/push.sh [host]  (default: oracle-vm)
# --------------------------------------------------
set -euo pipefail

REMOTE="${1:-oracle-vm}"
REMOTE_DIR="~/prodataviz"

echo ">> Syncing project to ${REMOTE}:${REMOTE_DIR} ..."

rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.venv' \
  --exclude='__pycache__' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='.DS_Store' \
  ./ "${REMOTE}:${REMOTE_DIR}/"

echo ""
echo ">> Done. Files synced to ${REMOTE}:${REMOTE_DIR}"
echo ""
echo "Next steps:"
echo "  First time:  ssh ${REMOTE} 'bash ${REMOTE_DIR}/deploy/setup-server.sh'"
echo "  Updates:     ssh ${REMOTE} 'bash ${REMOTE_DIR}/deploy/update.sh'"
