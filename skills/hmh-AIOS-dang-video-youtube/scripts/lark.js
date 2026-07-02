// lark.js — Helper gọi lark-cli cho bảng "Lịch đăng YouTube"
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');

function larkRun(args, cwd) {
  const full = [cfg.LARK_JS, 'base', ...args, '--base-token', cfg.BASE_TOKEN, '--as', cfg.LARK_AS];
  const r = spawnSync(process.execPath, full, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    cwd: cwd || undefined,
  });
  if (r.error) throw new Error('Không gọi được lark-cli: ' + r.error.message);
  const out = (r.stdout || '').trim();
  let j;
  try { j = JSON.parse(out); }
  catch (e) { throw new Error('lark-cli trả về không phải JSON: ' + out.slice(0, 300) + (r.stderr ? ' | stderr: ' + r.stderr.slice(0, 300) : '')); }
  if (j.ok === false) throw new Error('lark-cli lỗi: ' + JSON.stringify(j.error));
  return j.data;
}

// Đọc toàn bộ record → mảng { record_id, get(fieldName) }
function listRecords() {
  const d = larkRun(['+record-list', '--table-id', cfg.TABLE_ID, '--format', 'json']);
  const fields = d.fields || [];
  const rows = d.data || [];
  const ids = d.record_id_list || [];
  return rows.map((row, idx) => {
    const map = {};
    fields.forEach((f, i) => { map[f] = row[i]; });
    return {
      record_id: ids[idx],
      raw: map,
      get(name) { return map[name]; },
      // select trả về mảng ["x"] → lấy phần tử đầu
      sel(name) { const v = map[name]; return Array.isArray(v) ? (v[0] || null) : (v || null); },
      // attachment trả về mảng object {file_token,name,...}
      attachments(name) {
        const v = map[name];
        if (!Array.isArray(v)) return [];
        return v.map((a) => ({
          file_token: a.file_token || a.fileToken || a.token,
          name: a.name || 'file',
          type: a.type || '',
          size: a.size || 0,
        })).filter((a) => a.file_token);
      },
    };
  });
}

function updateRecord(recordId, patch) {
  return larkRun(['+record-upsert', '--table-id', cfg.TABLE_ID, '--record-id', recordId, '--json', JSON.stringify(patch)]);
}

// Tải 1 attachment theo file_token; trả về đường dẫn file.
// lark-cli yêu cầu --output là đường dẫn TƯƠNG ĐỐI trong cwd → chạy với cwd=destDir, output=tên file.
function downloadAttachment(recordId, fileToken, destDir, suggestName) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  // tên file an toàn (cho phép khoảng trắng & tiếng Việt, chỉ bỏ ký tự cấm)
  const safe = (suggestName || (fileToken + '.bin')).replace(/[\\/:*?"<>|]/g, '_');
  larkRun(['+record-download-attachment', '--table-id', cfg.TABLE_ID,
    '--record-id', recordId, '--file-token', fileToken, '--output', safe, '--overwrite'], destDir);
  const dest = path.join(destDir, safe);
  if (!fs.existsSync(dest)) throw new Error('Tải attachment thất bại: ' + safe);
  return dest;
}

module.exports = { larkRun, listRecords, updateRecord, downloadAttachment };
