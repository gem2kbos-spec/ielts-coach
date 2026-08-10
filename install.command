#!/usr/bin/env bash
# G2Band - 一键安装/启动（macOS）
# 双击运行，或在终端里执行 ./install.command
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "=================================="
echo " G2Band - 安装/启动"
echo "=================================="

# 让已有的 nvm 安装生效（如果有），避免重复装
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" --no-use

# 1. 检测 / 安装 Node.js（用 nvm，不需要 sudo，也不依赖 Homebrew）
if ! command -v node >/dev/null 2>&1; then
  echo
  echo "[1/6] 未检测到 Node.js，自动安装 nvm + Node LTS..."
  if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi
  \. "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
else
  echo
  echo "[1/6] Node.js 已安装：$(node -v)"
fi

# 2. 安装依赖
echo
echo "[2/6] 安装依赖（第一次会比较久）..."
npm install

# 3. 编译 whisper.cpp（口语模块语音转录需要）
echo
echo "[3/6] 检查本地语音识别引擎（whisper.cpp）..."
if [ ! -f "tools/whisper.cpp/build/bin/whisper-cli" ]; then
  bash scripts/build-whisper.sh
else
  echo "已编译，跳过。"
fi
if [ ! -f "tools/whisper.cpp/models/ggml-small.en.bin" ]; then
  bash scripts/download-model.sh small.en
else
  echo "语音识别模型已存在，跳过下载。"
fi

# 4. 初始化题库
echo
echo "[4/6] 初始化题库..."
npm run seed -w server

# 5. 构建前端
echo
echo "[5/6] 构建前端..."
npm run build

# 6. 启动并打开浏览器
echo
echo "[6/6] 启动服务..."
echo "=================================="
echo " 启动完成，浏览器会自动打开 http://localhost:3000"
echo " 关闭这个窗口会停止服务。"
echo "=================================="
PORT=3000 OPEN_BROWSER=1 npm run start
