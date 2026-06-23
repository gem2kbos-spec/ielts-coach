#!/usr/bin/env bash
# 克隆并编译 whisper.cpp（开 Metal 加速），供口语模块的本地语音转录使用。
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WHISPER_DIR="$ROOT_DIR/tools/whisper.cpp"

if ! command -v cmake >/dev/null 2>&1; then
  echo "未找到 cmake，尝试用 Homebrew 或 pip 安装..."
  if command -v brew >/dev/null 2>&1; then
    brew install cmake
  else
    pip3 install --user cmake
    PY_BIN_DIR=$(python3 -c "import sysconfig; print(sysconfig.get_path('scripts', 'osx_framework_user'))" 2>/dev/null || true)
    [ -n "$PY_BIN_DIR" ] && export PATH="$PY_BIN_DIR:$PATH"
  fi
fi

if ! command -v cmake >/dev/null 2>&1; then
  echo "cmake 安装失败，请手动安装 cmake 后重新运行此脚本。" >&2
  exit 1
fi

if [ ! -d "$WHISPER_DIR" ]; then
  echo "克隆 whisper.cpp..."
  git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$WHISPER_DIR"
fi

cd "$WHISPER_DIR"

if [ ! -f "build/bin/whisper-cli" ]; then
  echo "编译 whisper.cpp（Metal 加速）..."
  cmake -B build -DGGML_METAL=ON -DCMAKE_BUILD_TYPE=Release
  cmake --build build --config Release -j 8
else
  echo "whisper-cli 已存在，跳过编译。"
fi

echo "完成：$WHISPER_DIR/build/bin/whisper-cli"
