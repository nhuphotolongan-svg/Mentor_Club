#!/bin/bash
# register-task-mac.sh — Ban macOS cua register-task.ps1 (Windows).
# Dang ky LaunchAgent quet bang Reel moi 120 giay (chay nen, tu chay lai sau khi dang nhap).
# Chay:  bash register-task-mac.sh
# Override config rieng cho khach:  REEL_CONFIG=/duong/dan/config.local.json bash register-task-mac.sh
set -euo pipefail

LABEL="com.nhu.reel-facebook-autopost"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$DIR/post-reels.js"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$DIR/../logs/run.log"
mkdir -p "$DIR/../logs"

NODE_BIN="$(command -v node || true)"
[ -z "$NODE_BIN" ] && { echo "[X] Khong tim thay 'node' tren PATH."; exit 1; }
NODE_DIR="$(dirname "$NODE_BIN")"

# lark-cli nam cung thu muc node (nvm) — bao dam launchd (PATH toi thieu) thay duoc.
LARK_BIN="$(command -v lark-cli || true)"
LARK_DIR=""
[ -n "$LARK_BIN" ] && LARK_DIR="$(dirname "$LARK_BIN")"

# Canh bao config con trong.
if command -v node >/dev/null 2>&1; then
  CFG="${REEL_CONFIG:-$DIR/config.local.json}"
  MISSING="$(node -e "const c=require('$CFG');const m=['BASE_TOKEN','TABLE_ID','FB_PAGE_ID','FB_PAGE_TOKEN'].filter(k=>!c[k]);process.stdout.write(m.join(','))" 2>/dev/null || echo 'read-error')"
  [ -n "$MISSING" ] && echo "[!] Config con thieu: $MISSING — agent se bao loi cho toi khi dien xong ($CFG)."
fi

# Khoi env cho plist (launchd dung PATH toi thieu).
ENV_BLOCK="    <key>PATH</key><string>$NODE_DIR:${LARK_DIR:+$LARK_DIR:}/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key><string>$HOME</string>"
[ -n "${REEL_CONFIG:-}" ] && ENV_BLOCK="$ENV_BLOCK
    <key>REEL_CONFIG</key><string>$REEL_CONFIG</string>"

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
  <key>StartInterval</key><integer>120</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST_EOF

# Nap lai: go job cu roi nap moi.
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"

echo "OK - Da nap LaunchAgent: $LABEL (quet moi 120 giay)"
echo "   Plist:       $PLIST"
echo "   Working dir: $DIR"
echo "   Log:         $LOG"
echo "   Chay ngay:   launchctl start $LABEL"
echo "   Tat tam:     launchctl unload \"$PLIST\""
echo "   Go han:      launchctl unload \"$PLIST\" && rm \"$PLIST\""
echo "   Trang thai:  launchctl list | grep reel-facebook"
