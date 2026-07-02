#!/usr/bin/env node
/*
 * post-reels-multi.js — Đăng Reel từ Lark Base lên Facebook Page.
 * Hỗ trợ đa page: đọc page ID + token từ bảng Pages (LARK_PAGES_TABLE_ID).
 * Kích hoạt qua GitHub Actions repository_dispatch (event_type: dang-reel).
 *
 * Biến môi trường (GitHub Secrets/Variables):
 *   LARK_APP_ID          — App ID Lark (non-secret, set as Variable)
 *   LARK_APP_SECRET      — App Secret Lark (secret, set as Secret)
 *   LARK_APP_TOKEN       — Base app token (non-secret)
 *   LARK_TABLE_ID        — Table ID bảng đăng bài (non-secret)
 *   LARK_PAGES_TABLE_ID  — Table ID bảng pages/fanpage (non-secret)
 *   RECORD_ID            — (tùy chọn) chỉ đăng dòng này; nếu trống → đăng tất cả "Chờ đăng"
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');

const CFG = {
  APP_ID:          process.env.LARK_APP_ID        || 'cli_aaaa95eec2b8de15',
  APP_SECRET:      process.env.LARK_APP_SECRET     || '',
  APP_TOKEN:       process.env.LARK_APP_TOKEN      || 'JZVhbYOhZapmv0s7DRwjg6C2plb',
  TABLE_ID:        process.env.LARK_TABLE_ID       || 'tblGerQNgbg1dE1Y',
  PAGES_TABLE_ID:  process.env.LARK_PAGES_TABLE_ID || 'tblIz9prZQrSaf1X',
  RECORD_ID:       process.env.RECORD_ID           || '',
  LARK_DOMAIN:     'https://open.larksuite.com',
  GRAPH_VERSION:   'v21.0',
};
const GRAPH = `https://graph.facebook.com/${CFG.GRAPH_VERSION}`;
const DRY   = process.argv.includes('--dry-run');

if (!DRY && !CFG.APP_SECRET) {
  console.error('!! Thiếu LARK_APP_SECRET — đặt trong GitHub Secrets.');
  process.exit(1);
}

// Tên cột bảng đăng bài (tblGerQNgbg1dE1Y)
const F = {
  status:   'Trạng thái',    // ghi kết quả: Thành công / Thất bại
  loai:     'Loại',          // select: Video | Hình ảnh
  media:    'Ảnh/video',
  caption:  'Nội dung',
  hashtag:  'Hastag',
  link:     'Link Reel',     // ghi link bài sau khi đăng
  log:      'Log đăng Reel', // ghi log chi tiết
  comment:  'Comment ebook',
  page:     'Page',
};

const now   = () => new Date().toISOString().replace('T',' ').slice(0,19);
const log   = (...a) => console.log(now(), ...a);
const plain = v => v==null?'':typeof v==='string'?v:Array.isArray(v)?v.map(x=>x.text||x.name||'').join(''):(v.text||v.name||String(v));

async function larkToken() {
  const r = await fetch(`${CFG.LARK_DOMAIN}/open-apis/auth/v3/tenant_access_token/internal`,
    { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({app_id:CFG.APP_ID, app_secret:CFG.APP_SECRET}) });
  const j = await r.json();
  if (j.code !== 0) throw new Error('Lark token: ' + JSON.stringify(j));
  return j.tenant_access_token;
}

async function getRecord(tk, tableId, recId) {
  const r = await fetch(`${CFG.LARK_DOMAIN}/open-apis/bitable/v1/apps/${CFG.APP_TOKEN}/tables/${tableId}/records/${recId}`,
    { headers:{ Authorization:'Bearer '+tk } });
  const j = await r.json();
  if (j.code !== 0) throw new Error('getRecord: ' + JSON.stringify(j));
  return j.data.record;
}

async function listAll(tk) {
  let items=[], pt='';
  do {
    const r = await fetch(`${CFG.LARK_DOMAIN}/open-apis/bitable/v1/apps/${CFG.APP_TOKEN}/tables/${CFG.TABLE_ID}/records?page_size=200`+(pt?'&page_token='+pt:''),
      { headers:{ Authorization:'Bearer '+tk } });
    const j = await r.json();
    if (j.code !== 0) throw new Error('list: ' + JSON.stringify(j));
    items = items.concat(j.data.items||[]);
    pt = j.data.has_more ? j.data.page_token : '';
  } while (pt);
  return items;
}

async function getPageInfo(tk, pageRelation) {
  // pageRelation từ Lark: [{record_ids: ['recXXX'], table_id: '...'}]
  if (!pageRelation || !Array.isArray(pageRelation) || !pageRelation[0]) return null;
  const item = pageRelation[0];
  const recId = (item.record_ids && item.record_ids[0]) || item.record_id || item;
  if (!recId || typeof recId !== 'string') return null;
  try {
    const rec = await getRecord(tk, CFG.PAGES_TABLE_ID, recId);
    return {
      pageId:    plain(rec.fields['ID']),
      pageToken: plain(rec.fields['access_token']),
      pageName:  plain(rec.fields['Fanpage']),
    };
  } catch(e) {
    log('! Không lấy được page info:', e.message);
    return null;
  }
}

async function downloadVideo(tk, fileToken, out) {
  const urls = [
    `${CFG.LARK_DOMAIN}/open-apis/drive/v1/medias/${fileToken}/download?extra=${encodeURIComponent(JSON.stringify({bitablePerm:{tableId:CFG.TABLE_ID}}))}`,
    `${CFG.LARK_DOMAIN}/open-apis/drive/v1/medias/${fileToken}/download`,
  ];
  for (const u of urls) {
    const r = await fetch(u, { headers:{ Authorization:'Bearer '+tk } });
    if (r.ok && !(r.headers.get('content-type')||'').includes('json')) {
      const b = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(out, b);
      return b.length;
    }
  }
  throw new Error('không tải được video');
}

async function fbFetch(u, o) {
  const r = await fetch(u, o);
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = {_raw:t}; }
  if (!r.ok || j.error) throw new Error('FB ' + r.status + ': ' + JSON.stringify(j.error||j._raw||j));
  return j;
}

async function postReel(pageId, pageToken, videoPath, caption) {
  const start = await fbFetch(`${GRAPH}/${pageId}/video_reels?upload_phase=start&access_token=${encodeURIComponent(pageToken)}`, {method:'POST'});
  const {video_id:videoId, upload_url:uploadUrl} = start;
  if (!videoId || !uploadUrl) throw new Error('start thiếu video_id/upload_url');
  const buf = fs.readFileSync(videoPath);
  await fbFetch(uploadUrl, { method:'POST', headers:{ Authorization:`OAuth ${pageToken}`, offset:'0', file_size:String(buf.length) }, body:buf });
  await fbFetch(`${GRAPH}/${pageId}/video_reels`, { method:'POST', body: new URLSearchParams({ upload_phase:'finish', video_id:videoId, video_state:'PUBLISHED', description:caption||'', access_token:pageToken }) });
  let permalink = '';
  for (let i=0; i<30; i++) {
    await new Promise(r=>setTimeout(r,6000));
    try {
      const st = await fbFetch(`${GRAPH}/${videoId}?fields=status,permalink_url&access_token=${encodeURIComponent(pageToken)}`, {method:'GET'});
      if (st.permalink_url) permalink = st.permalink_url;
      const phase = st.status && (st.status.video_status || (st.status.processing_phase&&st.status.processing_phase.status));
      if (phase==='ready'||phase==='PUBLISHED'||(st.status&&st.status.video_status==='ready')) break;
      if (phase==='error') throw new Error('FB xử lý lỗi: '+JSON.stringify(st.status));
    } catch(e) {}
  }
  if (permalink && permalink.startsWith('/')) permalink = 'https://www.facebook.com' + permalink;
  return {videoId, permalink};
}

async function postComment(objectId, pageToken, message) {
  return fbFetch(`${GRAPH}/${objectId}/comments`, { method:'POST', body: new URLSearchParams({ message, access_token:pageToken }) });
}

async function postPhoto(pageId, pageToken, filePath, caption) {
  const buf = fs.readFileSync(filePath);
  const boundary = '----FormBoundary' + Date.now();
  const CRLF = '\r\n';
  const enc = s => Buffer.from(s, 'utf-8');
  const parts = [
    enc(`--${boundary}${CRLF}Content-Disposition: form-data; name="caption"${CRLF}${CRLF}`),
    enc(caption || ''),
    enc(`${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="access_token"${CRLF}${CRLF}`),
    enc(pageToken),
    enc(`${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="source"; filename="photo.jpg"${CRLF}Content-Type: image/jpeg${CRLF}${CRLF}`),
    buf,
    enc(`${CRLF}--${boundary}--${CRLF}`),
  ];
  const body = Buffer.concat(parts);
  const res = await fbFetch(`${GRAPH}/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  // res = {id, post_id}
  const postId = res.post_id || res.id;
  const permalink = postId ? `https://www.facebook.com/${postId.replace('_','/')}` : '';
  return { photoId: res.id, postId, permalink };
}

async function updateRow(tk, recId, fields) {
  const r = await fetch(`${CFG.LARK_DOMAIN}/open-apis/bitable/v1/apps/${CFG.APP_TOKEN}/tables/${CFG.TABLE_ID}/records/${recId}`,
    { method:'PUT', headers:{'Content-Type':'application/json; charset=utf-8', Authorization:'Bearer '+tk}, body: JSON.stringify({fields}) });
  const j = await r.json();
  if (j.code !== 0) throw new Error('update: ' + JSON.stringify(j));
}

(async () => {
  const tk = await larkToken();

  if (!CFG.RECORD_ID) {
    console.error('!! Thiếu RECORD_ID — phải truyền qua client_payload khi gọi dispatch.');
    process.exit(1);
  }
  log(`Đăng record_id=${CFG.RECORD_ID}`);
  const rec = await getRecord(tk, CFG.TABLE_ID, CFG.RECORD_ID);
  const targets = [rec];

  let ok=0, err=0;
  for (const row of targets) {
    const recId   = row.record_id;
    const loai    = plain(row.fields[F.loai]).trim();         // "Video" hoặc "Hình ảnh"
    const isVideo = loai === 'Video';
    const isPhoto = loai === 'Hình ảnh';
    const media   = row.fields[F.media];
    const att     = Array.isArray(media) ? media[0] : null;
    const caption = [plain(row.fields[F.caption]), plain(row.fields[F.hashtag])].filter(Boolean).join('\n\n');

    if (!isVideo && !isPhoto) {
      log(`  [BỎ QUA] ${recId}: Loại="${loai}" không hỗ trợ (chỉ Video/Hình ảnh).`);
      if (!DRY) await updateRow(tk, recId, {[F.status]:'Thất bại', [F.log]:`${now()} - Loại không hỗ trợ: ${loai}`});
      err++; continue;
    }

    const pageInfo = await getPageInfo(tk, row.fields[F.page]);
    if (!pageInfo || !pageInfo.pageId || !pageInfo.pageToken) {
      log(`  [BỎ QUA] ${recId}: không tìm được page/token.`);
      if (!DRY) await updateRow(tk, recId, {[F.status]:'Thất bại', [F.log]:`${now()} - không tìm được page`});
      err++; continue;
    }

    if (!att || !att.file_token) {
      log(`  [BỎ QUA] ${recId}: không có file.`);
      if (!DRY) await updateRow(tk, recId, {[F.status]:'Thất bại', [F.log]:`${now()} - không có file`});
      err++; continue;
    }

    log(`  >> ${recId} [${loai}]: page="${pageInfo.pageName}" | file="${(att.name||'').slice(0,40)}"`);

    if (DRY) {
      log(`     [DRY] caption: ${caption.slice(0,80).replace(/\n/g,' ')}`);
      continue;
    }

    const ext  = isVideo ? '.mp4' : '.jpg';
    const tmpf = path.join(os.tmpdir(), 'media_'+recId+ext);
    try {
      await downloadVideo(tk, att.file_token, tmpf);

      let permalink = '', objectId = '';
      if (isVideo) {
        const r = await postReel(pageInfo.pageId, pageInfo.pageToken, tmpf, caption);
        permalink = r.permalink; objectId = r.videoId;
        log(`     ✔ REEL ĐÃ ĐĂNG: ${permalink||'(đang xử lý)'}`);
      } else {
        const r = await postPhoto(pageInfo.pageId, pageInfo.pageToken, tmpf, caption);
        permalink = r.permalink; objectId = r.photoId;
        log(`     ✔ ẢNH ĐÃ ĐĂNG: ${permalink||'(đang xử lý)'}`);
      }

      let cmtNote = '';
      const commentText = plain(row.fields[F.comment]).trim();
      if (commentText && objectId) {
        try { await postComment(objectId, pageInfo.pageToken, commentText); cmtNote = ' +cmt'; }
        catch(e) { cmtNote = ' (cmt lỗi: '+String(e.message||e).slice(0,80)+')'; log(`     ! comment lỗi: ${e.message}`); }
      }

      await updateRow(tk, recId, {[F.status]:'Thành công', [F.link]:permalink||'', [F.log]:`${now()} - OK [${loai}] id=${objectId}${cmtNote}`});
      ok++;
    } catch(e) {
      const msg = String(e.message||e).slice(0,300);
      log(`     ✖ LỖI: ${msg}`);
      try { await updateRow(tk, recId, {[F.status]:'Thất bại', [F.log]:`${now()} - ${msg}`}); } catch {}
      err++;
    } finally {
      try { fs.unlinkSync(tmpf); } catch {}
    }
  }
  log(`Xong. Đăng: ${ok}, Lỗi: ${err}.`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
