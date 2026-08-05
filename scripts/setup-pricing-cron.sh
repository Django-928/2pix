#!/bin/bash
# 安装价格同步定时任务
# 用法：在服务器项目根目录执行 bash scripts/setup-pricing-cron.sh [每N小时]
# 默认每 6 小时同步一次

set -euo pipefail

INTERVAL_HOURS="${1:-6}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/data/logs"
CRON_TAG="# 2PIX-pricing-sync"

# 校验项目目录
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "错误：无法找到项目根目录 $PROJECT_DIR"
    exit 1
fi

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 查找 npm 绝对路径
NPM_BIN="$(command -v npm || true)"
if [ -z "$NPM_BIN" ]; then
    echo "错误：找不到 npm，请先安装 Node.js"
    exit 1
fi

# 生成 cron 表达式
# 每 N 小时执行一次，从 0 点开始
CRON_EXPR="0 */$INTERVAL_HOURS * * *"

# 生成 cron 命令（完整流水线：抓取 -> 构建映射 -> 同步数据库）
COMMAND="cd $PROJECT_DIR && $NPM_BIN run pricing:run >> $LOG_DIR/pricing-sync-cron.log 2>&1"
CRON_LINE="$CRON_EXPR $COMMAND $CRON_TAG"

echo "项目目录: $PROJECT_DIR"
echo "同步间隔: 每 $INTERVAL_HOURS 小时"
echo "日志文件: $LOG_DIR/pricing-sync-cron.log"
echo ""

# 读取当前 crontab
CURRENT_CRON=""
if crontab -l >/dev/null 2>&1; then
    CURRENT_CRON="$(crontab -l)"
fi

# 删除旧的 2PIX 价格同步任务
NEW_CRON="$(echo "$CURRENT_CRON" | grep -v "$CRON_TAG" || true)"

# 添加新任务
NEW_CRON="$NEW_CRON
$CRON_LINE"

# 安装 crontab
printf '%s\n' "$NEW_CRON" | crontab -

echo "已安装定时任务："
echo "  $CRON_LINE"
echo ""
echo "查看当前 crontab："
crontab -l | grep "$CRON_TAG"
