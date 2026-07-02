#!/usr/bin/env node
/**
 * deploy.mjs — Deploy một thư mục web tĩnh lên Cloudflare Pages, in link công khai.
 *
 * Cách dùng:
 *   node deploy.mjs --dir "output/2026-06-24-web-ten-dn" --name "ten-dn"
 *
 * Yêu cầu: đã `npx wrangler login` 1 lần (OAuth, bấm Allow).
 * Script tự: kiểm tra login → tạo project Pages nếu chưa có → wrangler pages deploy → in link.
 *
 * ⚠️ Deploy là hành động CÔNG KHAI ra ngoài — chỉ chạy khi người dùng đã xác nhận.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : 'true';
      a[key] = val;
    }
  }
  return a;
}

// tìm npx nằm cạnh node đang chạy (an toàn với nvm khi PATH chưa có)
function npxCmd() {
  const dir = path.dirname(process.execPath);
  const local = path.join(dir, 'npx');
  return fs.existsSync(local) ? local : 'npx';
}
const NPX = npxCmd();

function run(args, opts = {}) {
  return spawnSync(NPX, ['--yes', 'wrangler', ...args], {
    encoding: 'utf8',
    stdio: opts.capture ? 'pipe' : 'inherit',
    env: process.env,
  });
}

const a = parseArgs(process.argv);
const dir = a.dir;
const name = a.name;

if (!dir || !name) {
  console.error('Thiếu tham số.\n  node deploy.mjs --dir "<thư mục web>" --name "<ten-project-kebab>"');
  process.exit(1);
}
const absDir = path.resolve(dir);
if (!fs.existsSync(absDir)) { console.error('❌ Không tìm thấy thư mục:', absDir); process.exit(1); }
if (!fs.existsSync(path.join(absDir, 'index.html'))) {
  console.warn('⚠️  Thư mục không có index.html — vẫn deploy nhưng kiểm tra lại:', absDir);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error('❌ --name phải là kebab-case ASCII (vd "nha-khoa-abc"). Đang nhận:', name);
  process.exit(1);
}

// 1) kiểm tra đăng nhập
console.log('› Kiểm tra đăng nhập Cloudflare (wrangler whoami)…');
const who = run(['whoami'], { capture: true });
const whoOut = (who.stdout || '') + (who.stderr || '');
if (who.status !== 0 || /not authenticated|You are not/i.test(whoOut)) {
  console.error('\n❌ Chưa đăng nhập Cloudflare. Hãy tự chạy lệnh sau trong terminal rồi bấm Allow NGAY:\n');
  console.error('    ' + NPX + ' wrangler login\n');
  console.error('Sau khi login xong, chạy lại lệnh deploy này (cùng terminal).');
  process.exit(1);
}
const acct = (whoOut.match(/[0-9a-f]{32}/) || [])[0];
console.log('  ✓ Đã đăng nhập' + (acct ? ` (account ${acct})` : '') + '.');

// 2) tạo project nếu chưa có (bỏ qua nếu đã tồn tại)
console.log(`› Bảo đảm project Pages "${name}" tồn tại…`);
const create = run(['pages', 'project', 'create', name, '--production-branch', 'main'], { capture: true });
const createOut = (create.stdout || '') + (create.stderr || '');
if (create.status === 0) {
  console.log('  ✓ Đã tạo project mới.');
} else if (/already exists|already a project/i.test(createOut)) {
  console.log('  ✓ Project đã có sẵn — tiếp tục.');
} else {
  // không chặn: pages deploy vẫn có thể tự tạo; chỉ cảnh báo
  console.log('  (ghi chú) tạo project trả về:', createOut.trim().split('\n').slice(-1)[0]);
}

// 3) deploy
console.log(`› Deploy "${absDir}" → project "${name}"…\n`);
const dep = run(['pages', 'deploy', absDir, '--project-name', name, '--branch', 'main'], { capture: true });
const depOut = (dep.stdout || '') + (dep.stderr || '');
process.stdout.write(depOut);

const link = (depOut.match(/https?:\/\/[a-z0-9-]+\.pages\.dev\S*/i) || [])[0]
          || `https://${name}.pages.dev`;

if (dep.status === 0) {
  console.log('\n✅ DEPLOY THÀNH CÔNG.');
  console.log('   Link sống ngay: ' + link);
  console.log('\n➡️  Gắn tên miền riêng (tuỳ chọn):');
  console.log('   node ' + path.join(path.dirname(new URL(import.meta.url).pathname), 'add-domain.mjs') +
              ` --project "${name}" --domain "web.tenmien.com"`);
} else {
  console.error('\n❌ Deploy lỗi (exit ' + dep.status + '). Xem log phía trên.');
  process.exit(dep.status || 1);
}
