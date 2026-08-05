#!/bin/bash
# 2PIX 价格同步模块部署脚本
# 在服务器项目根目录执行：bash deploy/update-pricing-sync.sh

set -euo pipefail

PROJECT_DIR="/opt/2pix"

# 如果当前目录就是项目目录，也允许执行
if [ -f "./package.json" ] && [ -d "./api/scripts" ]; then
    PROJECT_DIR="$(pwd)"
fi

cd "$PROJECT_DIR"

echo "========================================="
echo "  2PIX 价格同步模块更新"
echo "  项目目录: $PROJECT_DIR"
echo "========================================="

# ========== 1. 更新代码 ==========
echo ""
echo "[1/6] 更新代码..."
if [ -d ".git" ]; then
    git pull
else
    echo "  不是 git 仓库，请手动确保代码已更新到 $PROJECT_DIR"
fi

# ========== 2. 安装依赖 ==========
echo ""
echo "[2/6] 安装依赖..."
npm install --production=false

# ========== 3. 构建前端 ==========
echo ""
echo "[3/6] 构建前端..."
npm run build

# ========== 4. 确保运行目录 ==========
echo ""
echo "[4/6] 准备运行环境..."
mkdir -p data/logs
mkdir -p data/backups

# ========== 5. 重启服务 ==========
echo ""
echo "[5/6] 重启 PM2 服务..."
pm2 restart 2pix || pm2 start deploy/ecosystem.config.cjs
pm2 save

# ========== 6. 安装定时任务 ==========
echo ""
echo "[6/6] 安装价格同步定时任务（每 6 小时）..."
bash scripts/setup-pricing-cron.sh 6

echo ""
echo "========================================="
echo "  价格同步模块部署完成！"
echo "========================================="
echo ""
echo "  常用命令："
echo "    npm run pricing:run          # 手动执行完整同步"
echo "    npm run pricing:fetch        # 仅抓取上游价格"
echo "    npm run pricing:sync         # 仅同步数据库"
echo "    pm2 logs 2pix                # 查看服务日志"
echo "    tail -f data/logs/pricing-sync-cron.log  # 查看同步日志"
echo "    crontab -l | grep 2PIX       # 查看定时任务"
echo ""
