# ProDataViz — Deployment Guide (Oracle Cloud VM)

## Overview

Deploy the ProDataViz application (Next.js frontend + FastAPI backend) on an **Oracle Cloud Ubuntu VM** using **Docker Compose**.

| Component | Tech | Container |
|-----------|------|-----------|
| Frontend | Next.js 16 | `prodataviz-frontend` |
| Backend | FastAPI / Uvicorn | `prodataviz-backend` |
| Database | SQLite (file-based) | volume mount |
| Reverse Proxy | Nginx | `prodataviz-nginx` |

---

## Prerequisites

### Local machine

- SSH access configured in `~/.ssh/config`:

```
Host oracle-vm
  HostName <SERVER_IP>
  User ubuntu
  IdentityFile ~/.ssh/your-private-key
  ServerAliveInterval 60
  ServerAliveCountMax 3
  ForwardAgent yes
```

- Key permissions: `chmod 400 ~/.ssh/your-private-key`

### Oracle Cloud Console

Ensure the **VCN Security List** has these **Ingress Rules**:

| Source | Protocol | Dest Port | Description |
|--------|----------|-----------|-------------|
| 0.0.0.0/0 | TCP | 22 | SSH |
| 0.0.0.0/0 | TCP | 80 | HTTP |
| 0.0.0.0/0 | TCP | 443 | HTTPS |

---

## Quick Deploy (automated)

From your **local machine**, run:

```bash
# 1. Deploy codebase to the server
./deploy/push.sh

# 2. SSH in and run the setup (first time)
ssh oracle-vm 'bash ~/prodataviz/deploy/setup-server.sh'
```

That's it. The app will be live at `http://<SERVER_IP>` (auto-detected).

---

## Manual Deploy (step-by-step)

### 1. Connect to the VM

```bash
ssh oracle-vm
```

### 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect
exit
ssh oracle-vm
```

### 3. Upload the project

From your local machine:

```bash
rsync -avz --delete \
  --exclude='node_modules' --exclude='.venv' --exclude='__pycache__' \
  --exclude='.next' --exclude='.git' --exclude='.DS_Store' \
  ./ oracle-vm:~/prodataviz/
```

### 4. Seed the database (first time only)

```bash
cd ~/prodataviz
docker compose run --rm backend python scripts/seed.py
```

### 5. Start the application

```bash
cd ~/prodataviz
docker compose up -d --build
```

### 6. Open firewall ports

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo sh -c "iptables-save > /etc/iptables/rules.v4"
```

---

## Verify deployment

```bash
# Check containers
docker compose ps

# Check endpoints
curl -s http://localhost:8000/ | python3 -m json.tool
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

From your browser: `http://<SERVER_IP>` (or `http://[IPv6_ADDRESS]` for IPv6-only servers)

---

## Update deployment

From your local machine:

```bash
./deploy/push.sh
ssh oracle-vm 'bash ~/prodataviz/deploy/update.sh'
```

---

## Logs & Troubleshooting

```bash
# View live logs (all containers)
docker compose logs -f

# Logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# Restart all
docker compose restart

# Full rebuild (after Dockerfile changes)
docker compose up -d --build

# Stop everything
docker compose down

# Check ports
sudo ss -tlnp | grep -E '(3000|8000|80)'
```

---

## Environment Variables

| Variable | Where | Default | Description |
|----------|-------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Frontend build arg | auto-detected at deploy time | Backend API URL |
| `DATABASE_URL` | Backend | `sqlite:///../data/prodataviz.db` | SQLite DB path |

---

## Architecture

```
Client ──► Nginx (:80) ──┬──► Next.js (:3000)  [frontend container]
                         └──► Uvicorn (:8000)   [backend container]
                                   │
                              data/prodataviz.db  [volume mount]
```

## Project files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Orchestrates all 3 containers |
| `backend/Dockerfile` | Multi-stage Python image |
| `frontend/Dockerfile` | Multi-stage Node image (standalone) |
| `deploy/nginx-prodataviz.conf` | Nginx reverse proxy config |
| `deploy/push.sh` | Syncs code to VM via rsync |
| `deploy/setup-server.sh` | First-time server setup |
| `deploy/update.sh` | Update after code changes |
