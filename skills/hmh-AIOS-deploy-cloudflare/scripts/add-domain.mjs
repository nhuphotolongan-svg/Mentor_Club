#!/usr/bin/env node
/**
 * add-domain.mjs — Gắn custom domain vào một Cloudflare Pages project + tạo CNAME qua API.
 *
 * Cách dùng:
 *   node add-domain.mjs --project "ten-dn" --domain "web.tenmien.com"
 *
 * Cần trong .env (cùng thư mục chạy lệnh, hoặc cạnh script):
 *   CF_API_TOKEN   — token quyền Account·Cloudflare Pages·Edit + Zone·DNS·Edit
 *   CF_ACCOUNT_ID  — lấy bằng: npx wrangler whoami
 *   CF_ZONE_ID     — (tuỳ chọn) nếu không có, script tự dò theo tên domain
 *
 * wrangler CLI KHÔNG gắn được custom domain (issue #11772) → đi qua API này.
 * Token chỉ đọc từ .env, KHÔNG in ra log, KHÔNG lưu memory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.cloudflare.com/client/v4';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// nạp .env tối giản (không phụ thuộc package): tìm ở cwd rồi cạnh script
function loadEnv() {
  for (const p of [path.join(process.cwd(), '.env'), path.join(__dirname, '..', '.env')]) {
    if (fs.existsSync(p)) {
      for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
}
loadEnv();

async function cf(pathname, init = {}) {
  const res = await fetch(API + pathname, {
    ...init,
    headers: {
      'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, status: res.status, json };
}

const a = parseArgs(process.argv);
const project = a.project;
const domain = a.domain;

if (!project || !domain) {
  console.error('Thiếu tham số.\n  node add-domain.mjs --project "<ten-project>" --domain "web.tenmien.com"');
  process.exit(1);
}
const TOKEN = process.env.CF_API_TOKEN;
const ACCT  = process.env.CF_ACCOUNT_ID;
if (!TOKEN || !ACCT) {
  console.error('❌ Thiếu CF_API_TOKEN / CF_ACCOUNT_ID trong .env.');
  console.error('   Tạo token: Dashboard → My Profile → API Tokens → quyền Pages·Edit + DNS·Edit.');
  console.error('   Lấy account id: npx wrangler whoami');
  process.exit(1);
}

(async () => {
  // 0) verify token
  const v = await cf('/user/tokens/verify');
  if (!v.ok || v.json?.result?.status !== 'active') {
    console.error('❌ Token không hợp lệ hoặc không active. Kiểm tra lại CF_API_TOKEN.');
    process.exit(1);
  }
  console.log('  ✓ Token hợp lệ (active).');

  // 1) gắn domain vào Pages project
  console.log(`› Gắn domain "${domain}" vào Pages project "${project}"…`);
  const add = await cf(`/accounts/${ACCT}/pages/projects/${project}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  });
  if (add.ok) {
    console.log('  ✓ Đã gắn domain vào project.');
  } else if (JSON.stringify(add.json).match(/already|exists/i)) {
    console.log('  ✓ Domain đã được gắn từ trước — tiếp tục.');
  } else {
    console.error('  ⚠️ Gắn domain trả về lỗi:', JSON.stringify(add.json?.errors || add.json));
    console.error('     (Có thể project name sai, hoặc token thiếu quyền Pages·Edit.)');
  }

  // 2) tạo bản ghi CNAME (cần biết zone)
  let zoneId = process.env.CF_ZONE_ID;
  if (!zoneId) {
    // dò zone: thử ghép 2 nhãn cuối, rồi 3 nhãn cuối…
    const labels = domain.split('.');
    for (let i = labels.length - 2; i >= 0; i--) {
      const cand = labels.slice(i).join('.');
      const z = await cf(`/zones?name=${cand}`);
      if (z.ok && z.json.result?.length) { zoneId = z.json.result[0].id; break; }
    }
  }
  if (!zoneId) {
    console.log('\n⚠️ Chưa tìm thấy zone trên Cloudflare cho domain này.');
    console.log('   → Nameservers của domain phải trỏ về Cloudflare trước. Hoặc gắn DNS thủ công:');
    console.log(`   CNAME  ${domain}  →  ${project}.pages.dev  (proxied)`);
  } else {
    const isApex = domain.split('.').length === 2;
    const recName = isApex ? '@' : domain;
    console.log(`› Tạo CNAME ${domain} → ${project}.pages.dev (proxied)…`);
    const dns = await cf(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'CNAME', name: recName, content: `${project}.pages.dev`,
        proxied: true, ttl: 1,
      }),
    });
    if (dns.ok) console.log('  ✓ Đã tạo bản ghi CNAME.');
    else if (JSON.stringify(dns.json).match(/already exists|identical record/i))
      console.log('  ✓ Bản ghi CNAME đã tồn tại — bỏ qua.');
    else console.error('  ⚠️ Tạo CNAME lỗi:', JSON.stringify(dns.json?.errors || dns.json));
  }

  console.log('\n✅ XONG. Lưu ý:');
  console.log('   • SSL cấp tự động sau ~5–15 phút. Báo 522 / chưa https lúc đầu là BÌNH THƯỜNG — đợi rồi mở lại.');
  console.log('   • Link *.pages.dev đã sống ngay: https://' + project + '.pages.dev');
  console.log('   • Trang custom domain: https://' + domain);
})().catch(e => { console.error('Lỗi:', e.message); process.exit(1); });
