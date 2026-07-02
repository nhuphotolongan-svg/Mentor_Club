#!/bin/bash
# start-mac.sh — Khởi động TÔM Voice trên macOS.
# Tự tìm: claude (bản desktop mới nhất hoặc CLI), ffmpeg (imageio-ffmpeg), python venv.
# Bật voice-server (STT/TTS) nền → chờ /health → chạy bridge (foreground).
# Bridge chết => script chết => LaunchAgent (KeepAlive) tự bật lại cả cụm.
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# 1) Nạp .env (export hết cho cả python lẫn node)
if [ ! -f ".env" ]; then echo "❌ Chưa có .env. Copy .env.example -> .env rồi điền."; exit 1; fi
set -a; . ./.env; set +a

VENV_PY="$DIR/.venv/bin/python"
[ -x "$VENV_PY" ] || { echo "❌ Thiếu venv. Chạy: python3 -m venv .venv && .venv/bin/pip install faster-whisper imageio-ffmpeg gTTS requests"; exit 1; }

# 2) Resolver claude (nếu .env chưa set CLAUDE_BIN)
if [ -z "${CLAUDE_BIN:-}" ] || [ ! -x "${CLAUDE_BIN:-/nonexistent}" ]; then
  if command -v claude >/dev/null 2>&1; then
    CLAUDE_BIN="$(command -v claude)"
  else
    CLAUDE_BIN="$(ls -td "$HOME/Library/Application Support/Claude/claude-code/"*/claude.app/Contents/MacOS/claude 2>/dev/null | head -1)"
  fi
fi
[ -n "${CLAUDE_BIN:-}" ] && [ -x "$CLAUDE_BIN" ] || { echo "❌ Không tìm thấy claude. Cài Claude Code hoặc set CLAUDE_BIN trong .env"; exit 1; }
export CLAUDE_BIN

# 3) Resolver ffmpeg (ưu tiên system, sau đó imageio-ffmpeg)
if [ -z "${FFMPEG_BIN:-}" ] || [ ! -x "${FFMPEG_BIN:-/nonexistent}" ]; then
  if command -v ffmpeg >/dev/null 2>&1; then
    FFMPEG_BIN="$(command -v ffmpeg)"
  else
    FFMPEG_BIN="$("$VENV_PY" -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())' 2>/dev/null)"
  fi
fi
export FFMPEG_BIN
echo "claude : $CLAUDE_BIN"
echo "ffmpeg : $FFMPEG_BIN"

# 4) Bật voice-server nền
"$VENV_PY" "$DIR/voice-server.py" &
VS_PID=$!
trap 'kill $VS_PID 2>/dev/null' EXIT INT TERM

# 5) Chờ /health (tối đa ~120s — lần đầu tải model whisper)
PORT="${WHISPER_PORT:-8765}"
echo "⏳ Chờ voice-server (nạp model whisper, lần đầu vài phút)…"
for i in $(seq 1 120); do
  if curl -fs "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then echo "✅ voice-server OK"; break; fi
  if ! kill -0 $VS_PID 2>/dev/null; then echo "❌ voice-server tắt sớm — xem log phía trên"; exit 1; fi
  sleep 1
done

# 6) Chạy bridge (foreground)
exec node "$DIR/lark-voice-bridge.mjs"
