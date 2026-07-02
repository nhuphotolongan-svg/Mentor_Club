// youtube.js — Lấy client YouTube đã xác thực + hàm upload video
const fs = require('fs');
const { google } = require('googleapis');
const cfg = require('./config');

function getAuth() {
  const raw = JSON.parse(fs.readFileSync(cfg.CLIENT_SECRET, 'utf8'));
  const key = raw.installed || raw.web;
  const oauth2 = new google.auth.OAuth2(key.client_id, key.client_secret, `http://localhost:4119`);
  if (!fs.existsSync(cfg.TOKEN_FILE)) {
    throw new Error('Chưa có refresh token. Chạy: node auth.js trước.');
  }
  const tok = JSON.parse(fs.readFileSync(cfg.TOKEN_FILE, 'utf8'));
  oauth2.setCredentials({ refresh_token: tok.refresh_token });
  return oauth2;
}

function getYoutube() {
  return google.youtube({ version: 'v3', auth: getAuth() });
}

/**
 * Upload 1 video lên YouTube (resumable).
 * @param {object} o
 *   o.videoPath    - đường dẫn file video
 *   o.title        - tiêu đề
 *   o.description  - mô tả
 *   o.tags         - mảng tag
 *   o.privacyStatus- 'public' | 'unlisted' | 'private'
 *   o.thumbnailPath- (tùy chọn) đường dẫn ảnh thumbnail
 *   o.playlistId   - (tùy chọn) id playlist để thêm video
 *   o.publishAt    - (tùy chọn) ISO time để YouTube tự công khai (yêu cầu privacy=private)
 * @returns {Promise<{videoId, url}>}
 */
async function uploadVideo(o) {
  const yt = getYoutube();
  const stat = fs.statSync(o.videoPath);

  const status = { privacyStatus: o.privacyStatus || 'private', selfDeclaredMadeForKids: false };
  if (o.publishAt) { status.privacyStatus = 'private'; status.publishAt = o.publishAt; }

  const res = await yt.videos.insert(
    {
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: (o.title || 'Video').slice(0, 100),
          description: o.description || '',
          tags: (o.tags || []).slice(0, 60),
          categoryId: '22', // People & Blogs (mặc định an toàn)
        },
        status,
      },
      media: { body: fs.createReadStream(o.videoPath) },
    },
    {
      // upload resumable — chống đứt mạng
      onUploadProgress: (e) => {
        const pct = stat.size ? Math.round((e.bytesRead / stat.size) * 100) : 0;
        if (process.stdout.isTTY) process.stdout.write(`\r  Upload: ${pct}%   `);
      },
    }
  );
  const videoId = res.data.id;
  if (process.stdout.isTTY) process.stdout.write('\n');

  // Thumbnail (chỉ video dài; Shorts thường bỏ qua nhưng vẫn set được)
  if (o.thumbnailPath && fs.existsSync(o.thumbnailPath)) {
    try {
      await yt.thumbnails.set({ videoId, media: { body: fs.createReadStream(o.thumbnailPath) } });
    } catch (e) { /* thumbnail có thể fail nếu kênh chưa xác minh — không chặn */ }
  }

  // Thêm vào playlist
  if (o.playlistId) {
    try {
      await yt.playlistItems.insert({
        part: ['snippet'],
        requestBody: { snippet: { playlistId: o.playlistId, resourceId: { kind: 'youtube#video', videoId } } },
      });
    } catch (e) { /* playlist id sai thì bỏ qua, không chặn */ }
  }

  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
}

module.exports = { getYoutube, uploadVideo, getAuth };
