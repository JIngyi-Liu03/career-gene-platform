#!/usr/bin/env bash
# 服务器侧部署脚本：由 deploy.ps1 通过 scp 上传到 /tmp/do_deploy.sh 后后台执行
# 流程：git pull(重试) -> 构建 frontend/admin -> docker compose up -> 等待健康检查
set -euo pipefail
cd /opt/career-gene-platform

echo "[deploy] $(date) git pull (retry up to 5)"
ok=0
for n in 1 2 3 4 5; do
  if git pull --ff-only; then ok=1; echo "[deploy] pull ok -> $(git rev-parse HEAD)"; break; fi
  echo "[deploy] pull attempt $n failed, retry in 5s"; sleep 5
done
if [ "$ok" -ne 1 ]; then
  echo "[deploy] FATAL: git pull 失败，中止部署（不使用旧代码构建）"
  exit 1
fi

echo "[deploy] build frontend"
cd frontend && npm ci && npm run build

echo "[deploy] build admin"
cd ../admin && npm ci && npm run build
cd ..

echo "[deploy] docker compose up"
sudo docker compose up -d --build

echo "[deploy] wait health (max ~80s)"
for i in $(seq 1 40); do
  if curl -fsS http://localhost:8080/api/health >/dev/null 2>&1; then echo "[deploy] healthy"; break; fi
  sleep 2
done

echo "[deploy] done -> $(git rev-parse HEAD)"
