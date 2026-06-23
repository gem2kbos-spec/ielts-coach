#!/usr/bin/env bash
# 确保雅思练习系统的本地服务在跑。优先用已构建的生产模式（单端口，更快更稳），
# 没有构建产物就退回开发模式（vite + nodemon 两个端口）。
set -euo pipefail

PROJECT_DIR="$HOME/ielts-coach"
PORT="${PORT:-3000}"

if curl -sf "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
  echo "READY http://localhost:$PORT"
  exit 0
fi

cd "$PROJECT_DIR"

if [ -d "client/dist" ]; then
  (PORT="$PORT" OPEN_BROWSER=0 nohup npm run start -w server >/tmp/ielts-coach-server.log 2>&1 &)
  URL="http://localhost:$PORT"
else
  (nohup npm run dev >/tmp/ielts-coach-server.log 2>&1 &)
  URL="http://localhost:5173"
fi

for i in $(seq 1 30); do
  if curl -sf "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
    echo "READY $URL"
    exit 0
  fi
  sleep 1
done

echo "TIMEOUT: 服务没能在 30 秒内启动，检查 /tmp/ielts-coach-server.log" >&2
exit 1
