#!/bin/bash
set -e

# 2PIX 一键部署脚本（适用于 Ubuntu/Debian + 1Panel 环境）
# 使用方法：在 1Panel 终端中执行：
# curl -fsSL https://raw.githubusercontent.com/Django-928/2pix/main/deploy/1panel-install.sh | bash
# 或直接复制本脚本内容粘贴执行

PROJECT_DIR="/opt/2pix"
NODE_VERSION="20"

echo "========================================="
echo "  2PIX AI 工作台 - 一键部署脚本"
echo "========================================="

# 1. 更新系统并安装基础依赖
echo "[1/8] 更新系统并安装依赖..."
export DEBIAN_FRONTEND=noninteractive
sudo apt update -y
sudo apt install -y git nginx curl ca-certificates

# 2. 安装 Node.js 20
echo "[2/8] 安装 Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "${NODE_VERSION}" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | sudo bash -
  sudo apt install -y nodejs
fi
node -v
npm -v

# 3. 安装 PM2
echo "[3/8] 安装 PM2..."
sudo npm install -g pm2

# 4. 拉取代码
echo "[4/8] 从 GitHub 拉取代码..."
if [ -d "${PROJECT_DIR}" ]; then
  echo "目录 ${PROJECT_DIR} 已存在，先备份..."
  sudo mv "${PROJECT_DIR}" "${PROJECT_DIR}.bak.$(date +%Y%m%d%H%M%S)"
fi
sudo git clone https://github.com/Django-928/2pix.git "${PROJECT_DIR}"
cd "${PROJECT_DIR}"

# 5. 安装依赖并构建
echo "[5/8] 安装依赖并构建..."
sudo npm install
sudo npm run build

# 6. 配置环境变量
echo "[6/8] 配置环境变量..."
if [ ! -f ".env" ]; then
  sudo cp .env.example .env
  # 生成随机密钥
  JWT_SECRET=$(openssl rand -hex 32)
  CONFIG_KEY=$(openssl rand -hex 32)
  sudo sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
  sudo sed -i "s|CONFIG_ENCRYPTION_KEY=.*|CONFIG_ENCRYPTION_KEY=${CONFIG_KEY}|" .env
  sudo sed -i "s|NODE_ENV=.*|NODE_ENV=production|" .env
  sudo sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://$(curl -s ifconfig.me)|" .env
fi
echo "环境变量已生成，请检查 ${PROJECT_DIR}/.env"

# 7. 启动服务
echo "[7/8] 启动后端服务..."
sudo mkdir -p data/backups logs
sudo pm2 start deploy/ecosystem.config.cjs
sudo pm2 save
sudo pm2 startup 2>/dev/null || true

# 8. 配置 Nginx
echo "[8/8] 配置 Nginx..."
SERVER_IP=$(curl -s ifconfig.me)
sudo cp deploy/nginx.conf /etc/nginx/conf.d/2pix.conf
sudo sed -i "s/server_name .*/server_name ${SERVER_IP};/" /etc/nginx/conf.d/2pix.conf
sudo nginx -t && sudo nginx -s reload

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo "访问地址：http://${SERVER_IP}"
echo "后台地址：http://${SERVER_IP}/admin/login"
echo "默认账号：admin / admin123456"
echo "项目目录：${PROJECT_DIR}"
echo ""
echo "后续更新命令："
echo "  cd ${PROJECT_DIR}"
echo "  git pull && npm install && npm run build"
echo "  pm2 restart 2pix"
