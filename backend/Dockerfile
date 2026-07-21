FROM node:20-alpine

WORKDIR /app

# 安装运行/构建期依赖（下载中文字体 + prisma）
RUN apk add --no-cache curl

# 下载中文字体（报告 PDF 必须嵌入 CJK 字形才能显示中文）
# 服务运行时路径：容器 /app 为项目根，dist 内 __dirname/../fonts = /app/fonts
RUN mkdir -p /app/fonts && \
    curl -fL -o /app/fonts/NotoSansSC-Regular.otf \
    "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf" || \
    echo "WARN: NotoSansSC 字体下载失败，报告 PDF 中文将无法正常显示，请手动放入 /app/fonts/NotoSansSC-Regular.otf"

# 依赖
COPY package*.json ./
RUN npm install

# 源码与构建
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

# 启动脚本：等待数据库 → 建表 → 启动
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000
CMD ["./start.sh"]
