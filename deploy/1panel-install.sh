#!/bin/bash
set -e

# 2PIX 一键部署脚本（适用于 1Panel 环境）
# 使用方法：在 1Panel 终端中执行：
# curl -fsSL https://raw.githubusercontent.com/Django-928/2pix/main/deploy/1panel-install.sh | bash
# 或直接复制本脚本内容粘贴执行

PROJECT_DIR="/opt/2pix"
NODE_VERSION="20"

echo "========================================="
echo "  2PIX AI 工作台 - 1Panel 一键部署脚本"
echo "========================================="

# 1. 更新系统并安装基础依赖
echo "[1/7] 更新系统并安装依赖..."
export DEBIAN_FRONTEND=noninteractive
sudo apt update -y
sudo apt install -y git curl ca-certificates openssl

# 2. 安装 Node.js 20
echo "[2/7] 安装 Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "${NODE_VERSION}" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | sudo bash -
  sudo apt install -y nodejs
fi
node -v
npm -v

# 3. 安装 PM2
echo "[3/7] 安装 PM2..."
sudo npm install -g pm2

# 4. 拉取代码
echo "[4/7] 从 GitHub 拉取代码..."
if [ -d "${PROJECT_DIR}" ]; then
  echo "目录 ${PROJECT_DIR} 已存在，先备份..."
  sudo mv "${PROJECT_DIR}" "${PROJECT_DIR}.bak.$(date +%Y%m%d%H%M%S)"
fi
sudo git clone https://github.com/Django-928/2pix.git "${PROJECT_DIR}"
cd "${PROJECT_DIR}"

# 5. 安装依赖并构建
echo "[5/7] 安装依赖并构建..."
sudo npm install
sudo npm run build

# 6. 配置环境变量
echo "[6/7] 配置环境变量..."
if [ ! -f ".env" ]; then
  sudo cp .env.example .env
  JWT_SECRET=$(openssl rand -hex 32)
  CONFIG_KEY=$(openssl rand -hex 32)
  SERVER_IP=$(curl -s ifconfig.me)
  sudo sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
  sudo sed -i "s|CONFIG_ENCRYPTION_KEY=.*|CONFIG_ENCRYPTION_KEY=${CONFIG_KEY}|" .env
  sudo sed -i "s|NODE_ENV=.*|NODE_ENV=production|" .env
  sudo sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://${SERVER_IP}|" .env
fi
echo "环境变量已生成，请检查 ${PROJECT_DIR}/.env"

# 7. 启动服务
echo "[7/7] 启动后端服务..."
sudo mkdir -p data/backups logs
sudo pm2 start deploy/ecosystem.config.cjs
sudo pm2 save
sudo pm2 startup 2>/dev/null || true

SERVER_IP=$(curl -s ifconfig.me)

echo ""
echo "========================================="
echo "  Node.js 服务部署完成！"
echo "========================================="
echo "内部访问：http://127.0.0.1:3001"
echo ""
echo "接下来请在 1Panel 中配置反向代理："
echo "1. 进入 1Panel → 网站 → 创建网站"
echo "2. 类型选择「反向代理」"
echo "3. 域名/端口：填写你的 IP 或域名"
echo "4. 代理地址：http://127.0.0.1:3001"
echo "5. 保存并访问 http://${SERVER_IP}"
echo ""
echo "后台地址：http://${SERVER_IP}/admin/login"
echo "默认账号：admin / admin123456"
echo "项目目录：${PROJECT_DIR}"
echo ""
echo "后续更新命令："
echo "  cd ${PROJECT_DIR}"
echo "  git pull && npm install && npm run build"
echo "  pm2 restart 2pix"
