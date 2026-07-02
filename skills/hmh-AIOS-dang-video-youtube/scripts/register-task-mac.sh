#!/bin/bash
# register-task-mac.sh — Bản macOS của register-task.ps1.
# Đăng ký LaunchAgent quét bảng "Lịch đăng YouTube" mỗi 60 giây (chạy nền, tự khởi động lại sau khi đăng nhập).
# Chạy:  bash register-task-mac.sh
# Tuỳ chọn truyền base/table riêng cho khách:
#   YT_BASE_TOKEN=xxx YT_TABLE_ID=yyy YT_ROOT="$HOME/.nhu-youtube-autopost" bash register-task-mac.sh
set -euo pipefail

LABEL="com.nhu.youtube-autopost"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$DIR/scan-and-post.js"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$DIR/run.log"

NODE_BIN="$(command -v node || true)"
[ -z "$NODE_BIN" ] && { echo "[X] Khong tim thay 'node' tren PATH."; exit 1; }
NODE_DIR="$(dirname "$NODE_BIN")"

# lark-cli entry that gets baked into the plist (launchd has a minimal PATH).
LARK_BIN="$(command -v lark-cli || true)"
if [ -n "$LARK_BIN" ]; then
  LARK_JS="$(readlink -f "$LARK_BIN" 2>/dev/null || python3 -c 'import os,sys;print(os.path.realpath(sys.argv[1]))' "$LARK_BIN")"
else
  echo "[!] Khong tim thay lark-cli tren PATH — config se tu do tim luc chay."
  LARK_JS=""
fi

if [ ! -d "$DIR/node_modules" ]; then
  echo "[!] Chua co node_modules trong $DIR"
  echo "    Chay truoc:  cd \"$DIR\" && npm install"
fi

# Build the <key>/<string> env block. Always set PATH + HOME; pass through any YT_* override given.
ENV_BLOCK="    <key>PATH</key><string>$NODE_DIR:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key><string>$HOME</string>"
[ -n "$LARK_JS" ]            && ENV_BLOCK="$ENV_BLOCK
    <key>YT_LARK_JS</key><string>$LARK_JS</string>"
[ -n "${YT_ROOT:-}" ]       && ENV_BLOCK="$ENV_BLOCK
    <key>YT_ROOT</key><string>$YT_ROOT</string>"
[ -n "${YT_BASE_TOKEN:-}" ] && ENV_BLOCK="$ENV_BLOCK
    <key>YT_BASE_TOKEN</key><string>$YT_BASE_TOKEN</string>"
[ -n "${YT_TABLE_ID:-}" ]   && ENV_BLOCK="$ENV_BLOCK
    <key>YT_TABLE_ID</key><string>$YT_TABLE_ID</string>"
[ -n "${YT_LARK_AS:-}" ]    && ENV_BLOCK="$ENV_BLOCK
    <key>YT_LARK_AS</key><string>$YT_LARK_AS</string>"

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$SCRIPT</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
$ENV_BLOCK
  </dict>
  <key>StartInterval</key><integer>60</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST_EOF

# Reload: gỡ job cũ rồi nạp lại.
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"

echo "OK - Da nap LaunchAgent: $LABEL (quet moi 60 giay)"
echo "   Plist:       $PLIST"
echo "   Working dir: $DIR"
echo "   Log:         $LOG"
echo "   Tat tam:     launchctl unload \"$PLIST\""
echo "   Bat lai:     launchctl load -w \"$PLIST\""
echo "   Chay ngay:   launchctl start $LABEL"
echo "   Go han:      launchctl unload \"$PLIST\" && rm \"$PLIST\""
echo "   Trang thai:  launchctl list | grep $LABEL"
