#!/bin/bash
# register-launchagent-mac.sh — Bản macOS của Task Scheduler/watchdog (Windows).
# TÔM là DAEMON dài hạn (WebSocket) -> dùng KeepAlive: launchd tự bật lại khi crash
# và tự chạy khi đăng nhập. Không cần watchdog riêng.
# Chạy:  bash register-launchagent-mac.sh
set -euo pipefail

LABEL="com.nhu.tom-voice"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START="$DIR/start-mac.sh"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$DIR/../logs/run.log"
mkdir -p "$DIR/../logs" "$HOME/Library/LaunchAgents"

NODE_BIN="$(command -v node || true)"
[ -z "$NODE_BIN" ] && { echo "[X] Không thấy 'node' trên PATH."; exit 1; }
NODE_DIR="$(dirname "$NODE_BIN")"
LARK_BIN="$(command -v lark-cli || true)"
LARK_DIR=""; [ -n "$LARK_BIN" ] && LARK_DIR="$(dirname "$LARK_BIN")"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$START</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$NODE_DIR:${LARK_DIR:+$LARK_DIR:}/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>15</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST_EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"

echo "OK — Đã nạp LaunchAgent: $LABEL (KeepAlive, tự chạy khi đăng nhập)"
echo "   Plist : $PLIST"
echo "   Log   : $LOG"
echo "   Bật   : launchctl start $LABEL"
echo "   Tắt   : launchctl unload \"$PLIST\""
echo "   Gỡ    : launchctl unload \"$PLIST\" && rm \"$PLIST\""
echo "   Xem   : launchctl list | grep tom-voice ; tail -f \"$LOG\""
