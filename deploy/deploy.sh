#!/bin/bash
# 2PIX 生产部署脚本
# 适用于 2核2G 香港服务器（Ubuntu/Debian）
#
# 使用方法：bash deploy/deploy.sh

set -e

echo "========================================="
echo "  2PIX 生产部署"
echo "========================================="

# ========== 配置 ==========
PROJECT_DIR="/root/2pix"        # 项目目录
NODE_VERSION="20"                # Node.js 版本

# ========== 1. 检查 Node.js ==========
echo ""
echo "[1/6] 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo "  未安装 Node.js，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi
echo "  Node.js: $(node -v)"
echo "  npm: $(npm -v)"

# ========== 2. 安装依赖 ==========
echo ""
echo "[2/6] 安装项目依赖..."
cd $PROJECT_DIR
npm install --production=false  # 需要开发依赖来构建
echo "  依赖安装完成"

# ========== 3. 构建前端 ==========
echo ""
echo "[3/6] 构建前端..."
npm run build
echo "  前端构建完成，输出到 dist/"

# ========== 4. 准备日志目录 ==========
echo ""
echo "[4/6] 准备运行环境..."
mkdir -p logs
mkdir -p data/backups

# ========== 5. 检查 PM2 ==========
echo ""
echo "[5/6] 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "  未安装 PM2，正在安装..."
    npm install -g pm2
fi
echo "  PM2: $(pm2 -v)"

# ========== 6. 启动服务 ==========
echo ""
echo "[6/6] 启动服务..."
pm2 delete 2pix 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo ""
echo "  常用命令："
echo "    pm2 logs 2pix        # 查看日志"
echo "    pm2 monit            # 监控面板"
echo "    pm2 restart 2pix     # 重启服务"
echo "    pm2 stop 2pix        # 停止服务"
echo "    pm2 status           # 查看状态"
echo ""
echo "  如需 Nginx 反向代理，请参考 deploy/nginx.conf"
echo ""
