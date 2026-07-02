// config.js — Cấu hình hệ thống đăng video YouTube
// Mặc định = hệ thống đang chạy của Hoàng Minh Hóa. Máy/khách khác: đổi 3 giá trị ⬇ (hoặc set biến môi trường).
// Đã PORT cross-platform (Windows + macOS/Linux) cho NHƯ Photo — máy Thuần Như là macOS.
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const IS_WIN = process.platform === 'win32';

// ROOT = thư mục chứa .secrets/. Windows: "H:\HOÁ TRI THỨC"; macOS/Linux: ~/.nhu-youtube-autopost. Đổi qua env YT_ROOT.
const ROOT = process.env.YT_ROOT || (IS_WIN
  ? 'H:\\HOÁ TRI THỨC'
  : path.join(os.homedir(), '.nhu-youtube-autopost'));

// Tự định vị entry JS của lark-cli (gọi `node run.js` để tránh EINVAL khi spawn .cmd trên Windows).
// macOS/Linux: resolve binary `lark-cli` về file run.js thật (symlink). Override qua env YT_LARK_JS.
function detectLarkJs() {
  if (process.env.YT_LARK_JS) return process.env.YT_LARK_JS;
  if (IS_WIN) return 'C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\@larksuite\\cli\\scripts\\run.js';
  try {
    const r = spawnSync('which', ['lark-cli'], { encoding: 'utf8' });
    const line = (r.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    if (line && fs.existsSync(line)) return fs.realpathSync(line);
  } catch (_) {}
  try { return require.resolve('@larksuite/cli/scripts/run.js'); } catch (_) {}
  return 'lark-cli';
}

module.exports = {
  // --- Lark Base (ĐỔI cho khách khác) ---
  BASE_TOKEN: process.env.YT_BASE_TOKEN || 'TaaEbHJg5aoz2Usw3mQlK9mQgUR',
  TABLE_ID: process.env.YT_TABLE_ID || 'tblpu3bAGohfC4Rt', // "Lịch đăng YouTube"
  // Tên field (lark-cli nhận theo tên field, ổn định hơn id khi đọc)
  FIELDS: {
    tieuDe: 'Tiêu đề',
    moTa: 'Mô tả',
    tags: 'Tags',
    video: 'Video',
    thumbnail: 'Thumbnail',
    loai: 'Loại',          // "Video dài" | "Shorts"
    playlist: 'Playlist',
    cheDo: 'Chế độ',       // "Công khai" | "Không công khai" | "Riêng tư"
    ngayGio: 'Ngày giờ đăng',
    trangThai: 'Trạng thái', // "Chờ đăng" | "Đang đăng" | "Đã đăng" | "Lỗi"
    linkVideo: 'Link video',
    ghiChuLoi: 'Ghi chú lỗi',
  },
  FIELD_IDS: {
    video: 'fldRNZj7wV',
    thumbnail: 'fldVFTTvqJ',
  },
  STATUS: {
    cho: 'Chờ đăng',
    dang: 'Đang đăng',
    xong: 'Đã đăng',
    loi: 'Lỗi',
  },
  PRIVACY_MAP: {
    'Công khai': 'public',
    'Không công khai': 'unlisted',
    'Riêng tư': 'private',
  },

  // --- lark-cli (gọi node trực tiếp vào run.js để tránh lỗi EINVAL khi spawn .cmd) ---
  LARK_JS: detectLarkJs(),
  LARK_AS: process.env.YT_LARK_AS || 'user',

  // --- YouTube / Google ---
  CLIENT_SECRET: path.join(ROOT, '.secrets', 'client_secret.json'),
  TOKEN_FILE: path.join(ROOT, '.secrets', 'youtube-token.json'), // refresh token lưu ở đây
  SCOPES: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
  ],

  // --- thư mục tạm tải video ---
  TMP_DIR: process.env.YT_TMP || path.join(os.tmpdir(), 'yt-upload'),

  // --- log ---
  LOG_FILE: path.join(__dirname, 'run.log'),

  ROOT,
};
