#!/bin/bash
set -e

PORT="${PORT:-8080}"
export PORT="$PORT"
export PRODUCER_PORT="$PORT"
export HYPERFRAMES_PREVIEW_HOST="0.0.0.0"

echo "=========================================================="
echo " Starting HyperFrames on Railway"
echo " Mode   : ${MODE:-api}"
echo " Port   : ${PORT}"
echo " Chrome : ${PRODUCER_HEADLESS_SHELL_PATH}"
echo "=========================================================="

if [ "$MODE" = "studio" ]; then
  echo "[HyperFrames] Launching Studio Web UI on port $PORT..."
  cd /app/packages/studio
  exec bun --bun ./node_modules/.bin/vite --host 0.0.0.0 --port "$PORT"
elif [ "$MODE" = "cli" ]; then
  echo "[HyperFrames] Running CLI command: $@"
  exec bun packages/cli/bin/hyperframes.mjs "$@"
else
  echo "[HyperFrames] Launching Producer Render API Server on port $PORT..."
  cd /app/packages/producer
  exec bun dist/public-server.js --port "$PORT"
fi
