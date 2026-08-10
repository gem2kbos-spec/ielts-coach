#!/usr/bin/env bash
# 确保雅思练习系统的本地服务在跑。优先用已构建的生产模式（单端口，更快更稳），
# 没有构建产物就退回开发模式（vite + nodemon 两个端口）。
set -euo pipefail

PROJECT_DIR="$HOME/ielts-coach"
PORT="${PORT:-3000}"
TOKEN_FILE="$PROJECT_DIR/data/local_token.txt"

# 加了用户系统之后，/api/* 大部分接口都要带JWT。这个token是用户在网页登录/注册时
# 服务端顺手存到本地文件的(见server/routes/auth.js)，这里读出来一起打印，
# 后面的skill步骤里直接curl接口要用 -H "Authorization: Bearer $TOKEN"。
# 文件不存在/为空说明这台机器还没人在网页登录过，得先让用户登录一次。
print_ready() {
  echo "READY $1"
  if [ -s "$TOKEN_FILE" ]; then
    echo "TOKEN $(cat "$TOKEN_FILE")"
  else
    echo "TOKEN NONE（还没人登录过，先让用户打开网页注册/登录一次，再回来直接curl接口）"
  fi
}

if curl -sf "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
  print_ready "http://localhost:$PORT"
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
    print_ready "$URL"
    exit 0
  fi
  sleep 1
done

echo "TIMEOUT: 服务没能在 30 秒内启动，检查 /tmp/ielts-coach-server.log" >&2
exit 1
