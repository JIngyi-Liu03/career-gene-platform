#!/usr/bin/env bash
#
# Career Gene Platform —— 一键部署脚本
#
# 设计原则（符合 12-Factor）：
#   - git 为唯一事实来源：服务器不存任何"手改过的代码"
#   - 配置外置：密钥来自同目录 .env（git 不跟踪，git pull 永不覆盖）
#   - 前端代码零改动：仅执行其自带 `npm run build` 产出 dist
#   - 构建/运行分离：后端由 Docker 现场构建，前端 dist 由挂载提供
#
# 用法（服务器 /opt/career-gene-platform 下）：
#   ./deploy.sh
#
set -euo pipefail

# 脚本始终以仓库根目录为工作目录，避免 cd 失败导致误删/误构建
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "==> [1/4] 拉取最新代码"
git pull --ff-only

echo "==> [2/4] 构建前端（用户站 + 管理后台，均仅执行其 build 产出 dist）"
cd frontend
npm ci
npm run build
cd "$ROOT_DIR"

cd admin
npm ci
npm run build
cd "$ROOT_DIR"

echo "==> [3/4] 从模板生成 prisma schema（服务器用 PostgreSQL）并重建启动容器"
cp backend/prisma/schema.prisma.example backend/prisma/schema.prisma
docker compose up -d --build
# 强制重建 nginx：重新绑定 frontend/dist，避免 `npm run build` 重建 dist 目录后
# 旧的 bind mount 仍指向失效 inode，导致容器内目录为空、nginx 返回 403。
docker compose up -d --force-recreate nginx

echo "==> [4/4] 等待后端就绪（GET /api/health）"
HEALTHY=0
for i in $(seq 1 30); do
  if curl -fsS http://localhost:8080/api/health >/dev/null 2>&1; then
    HEALTHY=1
    echo "==> 后端已就绪"
    break
  fi
  sleep 2
done

if [ "$HEALTHY" -ne 1 ]; then
  echo "!! 超时：后端未在 60s 内就绪，请排查："
  echo "   docker compose logs api"
  echo "   docker compose logs db"
  docker compose ps
  exit 1
fi

docker compose ps
echo "==> 完成。"
echo "    用户站：  http://<服务器IP>:8080/"
echo "    管理后台：http://<服务器IP>:8081/"
