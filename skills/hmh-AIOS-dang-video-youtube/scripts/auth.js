// auth.js — Đăng nhập 1 lần để lấy refresh token, lưu vào .secrets/youtube-token.json
// Chạy: node auth.js   (mở trình duyệt, anh bấm cho phép đúng tài khoản kênh)
const fs = require('fs');
const http = require('http');
const { URL } = require('url');
const { exec } = require('child_process');
const { google } = require('googleapis');
const cfg = require('./config');

function loadClient() {
  const raw = JSON.parse(fs.readFileSync(cfg.CLIENT_SECRET, 'utf8'));
  const key = raw.installed || raw.web;
  if (!key) throw new Error('client_secret.json không hợp lệ (thiếu installed/web)');
  return key;
}

function openBrowser(url) {
  // Cross-platform: Windows (start/cmd) · macOS (open) · Linux (xdg-open)
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`, { shell: 'cmd.exe' }, () => {});
  } else if (process.platform === 'darwin') {
    exec(`open "${url}"`, () => {});
  } else {
    exec(`xdg-open "${url}"`, () => {});
  }
}

async function main() {
  const key = loadClient();
  const PORT = 4119; // cổng loopback cố định
  const redirectUri = `http://localhost:${PORT}`;
  const oauth2 = new google.auth.OAuth2(key.client_id, key.client_secret, redirectUri);

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // ép trả refresh_token mỗi lần
    scope: cfg.SCOPES,
  });

  console.log('\n=== ĐĂNG NHẬP YOUTUBE ===');
  console.log('Đang mở trình duyệt. Nếu không tự mở, copy link sau vào trình duyệt:\n');
  console.log(authUrl + '\n');
  console.log('Lưu ý: đăng nhập ĐÚNG tài khoản kênh muốn đăng.');
  console.log('Nếu gặp màn hình "chưa xác minh": Advanced → Go to ... (unsafe).\n');

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, redirectUri);
        const c = u.searchParams.get('code');
        const err = u.searchParams.get('error');
        if (err) {
          res.end('Loi: ' + err + '. Dong tab nay va thu lai.');
          server.close();
          return reject(new Error(err));
        }
        if (c) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end('<h2>Xong! Da lay duoc quyen. Quay lai cua so dong lenh.</h2>');
          server.close();
          resolve(c);
        }
      } catch (e) { reject(e); }
    });
    server.listen(PORT, () => openBrowser(authUrl));
    setTimeout(() => { server.close(); reject(new Error('Hết giờ chờ đăng nhập (5 phút).')); }, 5 * 60 * 1000);
  });

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('Không nhận được refresh_token. Hãy thu hồi quyền ở myaccount.google.com/permissions rồi chạy lại.');
  }
  fs.writeFileSync(cfg.TOKEN_FILE, JSON.stringify({
    refresh_token: tokens.refresh_token,
    obtained_at: new Date().toISOString(),
  }, null, 2));
  console.log('\n✅ Đã lưu refresh token vào:', cfg.TOKEN_FILE);

  // Xác minh: lấy tên kênh
  oauth2.setCredentials(tokens);
  const yt = google.youtube({ version: 'v3', auth: oauth2 });
  const me = await yt.channels.list({ part: ['snippet'], mine: true });
  const ch = me.data.items && me.data.items[0];
  if (ch) console.log('✅ Kênh đã kết nối:', ch.snippet.title);
  console.log('\nHoàn tất. Hệ thống sẵn sàng đăng video.\n');
}

main().catch((e) => { console.error('\n❌ Lỗi:', e.message); process.exit(1); });
