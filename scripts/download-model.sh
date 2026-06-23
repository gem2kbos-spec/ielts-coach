#!/usr/bin/env bash
# 下载 whisper.cpp 的 ggml 模型，默认 small.en（约 466MB，英文场景速度/准确度平衡）。
# 用法: scripts/download-model.sh [model_name]，比如 base.en（更快更小，约142MB）。
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WHISPER_DIR="$ROOT_DIR/tools/whisper.cpp"
MODEL_NAME="${1:-small.en}"

if [ ! -d "$WHISPER_DIR" ]; then
  echo "未找到 $WHISPER_DIR，先跑 scripts/build-whisper.sh"
  exit 1
fi

cd "$WHISPER_DIR"

if [ -f "models/ggml-$MODEL_NAME.bin" ]; then
  echo "模型已存在: models/ggml-$MODEL_NAME.bin"
else
  bash ./models/download-ggml-model.sh "$MODEL_NAME"
fi
