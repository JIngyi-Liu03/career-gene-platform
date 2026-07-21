# Career Gene Platform —— 部署指南

技术栈：**Vue3 + TypeScript（前端）** · **NestJS + TypeScript（后端）** · **PostgreSQL + Prisma** · **Docker + Nginx**

目标服务器：腾讯云轻量应用服务器（已有旧站 `server.js` 监听 **80 端口**，无 Nginx）。
本方案与旧站 **完全隔离**：对外用 **8080** 端口，独立 Docker 网络 / 数据卷 / 进程。

部署核心思路（符合上海外企常见标准）：**Git 为唯一事实来源 + SSH 登录服务器执行一条 `./deploy.sh`**。
本地改代码 → `git push` → SSH 进服务器 → `./deploy.sh`，无需任何打包上传。

---

## 一、隔离规划（与旧站不重合）

| 维度 | 旧站 | 新站（本方案） |
|------|------|----------------|
| 对外端口 | 80（server.js 直听） | **8080**（nginx 容器映射） |
| 运行方式 | 裸 Node + systemd | Docker Compose |
| 数据库 | 纯 JSON 文件 | PostgreSQL（容器内） |
| 数据卷 | `/opt/career-gene/data/` | `pgdata` 卷 |
| 网络 | 宿主机直连 | `career-net` 独立桥接 |
| 进程/服务名 | `career-gene` (systemd) | docker 容器组 |

> 物理端口不同，**不可能冲突**。新站内部 `db/api` 不映射宿主机端口，仅 `nginx` 暴露 8080。

---

## 二、首次部署（服务器，一次性）

### 1) 前置条件：安装 Docker 与 Compose 插件

> Ubuntu 24.04 默认 apt 源**不含** `docker-compose-plugin`，必须用官方脚本安装。

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo docker compose version   # 确认输出 v2.x.x（deploy.sh 依赖此插件）
```

### 2) 克隆仓库（即"上传代码"，之后不再手动传文件）

- **公开仓库**：直接 clone。
- **私有仓库（推荐）**：用 **GitHub Deploy Key**（只读 SSH key），最安全。

```bash
# 生成只读 deploy key（私有仓库）
ssh-keygen -t ed25519 -C "deploy@career-gene" -f ~/.ssh/career_gene_deploy
# 把 ~/.ssh/career_gene_deploy.pub 加到仓库的 Deploy Keys（勾选 read-only）

sudo mkdir -p /opt/career-gene-platform
sudo git clone <仓库地址> /opt/career-gene-platform
cd /opt/career-gene-platform
```

> 公开仓库可跳过 deploy key 步骤直接 clone。

### 3) 创建生产密钥（`.env` 不会进 git，git pull 永不覆盖）

```bash
sudo cp .env.example .env
sudo nano .env        # 填入下方"三件套"的强随机值
```

生成强随机值（任选其一）：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
openssl rand -base64 32
```

`.env` 需要（详见 `.env.example`）：

| 变量 | 说明 |
|------|------|
| `DB_PASSWORD` | PostgreSQL 密码（db 与 api 共用，必须一致） |
| `ACCESS_JWT_SECRET` | Access Token 签名密钥（≥32 字节随机） |
| `REFRESH_JWT_SECRET` | Refresh Token 签名密钥（≥32 字节随机） |

> JWT 采用 **Access Token（15 分钟）+ Refresh Token（7 天）** 机制，密钥仅存在于环境变量，**不落库**。
> 修改密钥会使已签发的 Token 全部失效（用户需重新登录），属正常强制定期轮换手段。

### 4) 防火墙放行 8080

- 服务器安全组 / 防火墙：放行 TCP **8080** 入站（腾讯云控制台"防火墙规则"加一条允许）。
- 同时确认本地机器能访问 `http://<服务器IP>:8080/`。

### 5) 一键部署

```bash
sudo chmod +x deploy.sh
./deploy.sh
```

---

## 三、构建前端（deploy.sh 自动处理）

`deploy.sh` 已内含前端构建步骤，**无需人工操作**。它只执行前端自带命令，不修改任何前端代码：

```bash
cd frontend && npm ci && npm run build && cd ..
```

构建产物 `frontend/dist/` 由 `docker-compose.yml` 挂载进 nginx 容器（`nginx/default.conf` 将其作为站点根目录）。

> `VITE_API_BASE` 在**构建期**写死进产物（见 `frontend/.env`）。若以后改 IP/端口，重新 `./deploy.sh` 即可（脚本会自动重新 build 前端），无需手动改文件。

---

## 四、日常开发与部署循环

```text
本地（VS Code）
  └─ 改后端代码
       └─ git push origin main

SSH 登录服务器
  └─ cd /opt/career-gene-platform
       └─ ./deploy.sh          # = git pull + 构建前端 + docker compose up -d --build + 健康检查
```

`deploy.sh` 内部顺序：
1. `git pull --ff-only` —— 拉取最新代码（仅快进，避免服务器产生分叉提交）。
2. `npm ci && npm run build`（前端）—— 产出 dist。
3. `docker compose up -d --build` —— 现场构建后端镜像并重建容器组。
4. 轮询 `GET /api/health` 直到就绪（最多 60s），失败则打印日志并退出非零。

---

## 五、接口对照（前端已内置）

后端为**业务唯一来源**，所有接口经 nginx `/api` 前缀转发到 NestJS（容器内 3000 端口）。

### 鉴权（Auth）
| 方法 & 路径 | 说明 |
|-------------|------|
| `GET  /api/auth/security-questions` | 获取注册可选安全问题列表（无需登录） |
| `POST /api/auth/register` | 注册：手机号 + 姓名 + 密码 + 安全问题/答案，返回双 Token |
| `POST /api/auth/login` | 登录：手机号 + 密码，返回双 Token |
| `POST /api/auth/recover` | 找回密码：手机号 + 姓名 + 安全问题 + 答案 + 新密码 |
| `POST /api/auth/refresh` | 用 Refresh Token 换取新的双 Token |
| `GET  /api/auth/me` | 当前用户信息（需登录） |

### 测评（Quiz，需登录）
| 方法 & 路径 | 说明 |
|-------------|------|
| `GET  /api/quiz/meta` | 测评元信息（章节/题目数量/提示，不含评分内部键） |
| `GET  /api/quiz/part/:i` | 第 i 部分题目（仅文本与选项） |
| `POST /api/quiz/part/:i` | 提交第 i 部分答案（增量落库 + 计分） |
| `GET  /api/quiz/progress` | 各部分完成状态 + 稀疏答案缓存 |
| `POST /api/quiz/submit` | 一次性提交全部答案并完成计分 |
| `GET  /api/quiz/result` | 获取完整测评结果 |

### 报告（Report，需登录）
| 方法 & 路径 | 说明 |
|-------------|------|
| `GET  /api/report?inline=1` | 后端用该用户最新测评重建并生成 PDF 报告（inline 直接预览） |

后端出参中**不包含**题目评分内部键（`m`/`dim`），仅返回清洗后的 `text` 与 `options`。

---

## 六、中文字体说明

PDF 报告依赖 `NotoSansSC-Regular.otf` 才能正确渲染中文。
- **Docker 构建时**会自动从 jsDelivr 下载并放入镜像 `/app/fonts/`。
- **本地开发（非 Docker）**：需手动下载到 `backend/fonts/NotoSansSC-Regular.otf`：

```bash
mkdir -p backend/fonts
curl -fL -o backend/fonts/NotoSansSC-Regular.otf \
  "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf"
```

> 若字体缺失，服务会降级用 Helvetica，中文将显示为空白/方块，但流程不中断。

---

## 七、本地开发（不依赖 Docker）

```bash
cd backend
npm install
# 准备一个本地 PostgreSQL，并把连接串写入 backend/.env（参考 .env.example）
cp .env.example .env
npx prisma generate
npx prisma db push
npm run start:dev      # 监听 3000
```

前端本地联调：把 `frontend/.env` 的 `VITE_API_BASE` 改为 `http://localhost:3000`（开发期直接打后端，不走 /api 前缀），或保留 `/api` 并在本地另起 nginx。

---

## 八、常用运维命令

```bash
./deploy.sh                         # 部署 / 更新（日常用这一条）
sudo docker compose logs -f api     # 看后端日志
sudo docker compose logs -f nginx   # 看反代日志
sudo docker compose down            # 停止
sudo docker compose up -d --build   # 手动重新构建并启动
sudo docker volume ls               # 查看 pgdata 卷
```

### 备份数据库
```bash
sudo docker compose exec db pg_dump -U career career_gene > backup_$(date +%F).sql
```

### 回滚到指定版本
```bash
git fetch --all
git checkout <commit-or-tag>     # 切到上一个可用版本
./deploy.sh
```

---

## 九、故障排查

| 现象 | 排查 |
|------|------|
| `./deploy.sh` 报 `DB_PASSWORD:?` 未设置 | 根目录 `.env` 缺失或未填，执行 `cp .env.example .env` 并补全 |
| 前端打开空白 / 404 | `frontend/dist` 未生成；手动 `cd frontend && npm ci && npm run build` 后重跑 `./deploy.sh` |
| 接口 502 | `docker compose logs api` 看是否还在等 db 就绪；确认 `db` 健康检查通过 |
| `/api/health` 一直超时 | 看 `docker compose ps`，确认 `api` 状态为 `healthy`；查 `docker compose logs api` |

---

## 十、从旧站迁移数据（可选）

旧站 `/opt/career-gene/data/records.json` 是纯 JSON。若需迁移，写一个小脚本读取旧 JSON，
按 `POST /api/` 的 `full` 格式重新上报即可（昵称即手机号）。本仓库不含迁移脚本，按需自行实现。
