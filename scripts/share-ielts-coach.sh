#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3100}"
CLOUDFLARED="$ROOT_DIR/.tools/cloudflared"

is_ielts_coach() {
  curl -fsS "http://localhost:$PORT/api/health" 2>/dev/null | grep -q '"app":"ielts-coach"'
}

if [[ ! -x "$CLOUDFLARED" ]]; then
  mkdir -p "$ROOT_DIR/.tools"
  ARCH="$(uname -m)"
  case "$ARCH" in
    arm64) ASSET="cloudflared-darwin-arm64.tgz" ;;
    x86_64) ASSET="cloudflared-darwin-amd64.tgz" ;;
    *) echo "Unsupported macOS architecture: $ARCH" >&2; exit 1 ;;
  esac
  echo "Downloading cloudflared..."
  curl -L --fail -o "$ROOT_DIR/.tools/cloudflared.tgz" "https://github.com/cloudflare/cloudflared/releases/latest/download/$ASSET"
  tar -xzf "$ROOT_DIR/.tools/cloudflared.tgz" -C "$ROOT_DIR/.tools"
  chmod +x "$CLOUDFLARED"
fi

if ! is_ielts_coach; then
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $PORT is occupied by another application. Run with a free port, for example: PORT=3101 npm run share" >&2
    exit 1
  fi
  echo "Local server is not running on port $PORT. Building client and starting server..."
  npm run build
  PORT="$PORT" npm run start -w server > "$ROOT_DIR/.tools/share-server.log" 2>&1 &
  SERVER_PID=$!
  for _ in {1..30}; do
    if is_ielts_coach; then
      break
    fi
    sleep 1
  done
  if ! is_ielts_coach; then
    echo "Server failed to start. See .tools/share-server.log" >&2
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    exit 1
  fi
fi

echo "Sharing IELTS Coach from http://localhost:$PORT"
echo "Keep this terminal open while she is using it."
exec "$CLOUDFLARED" tunnel --url "http://localhost:$PORT"
