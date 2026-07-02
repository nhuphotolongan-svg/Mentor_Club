#!/usr/bin/env node
/**
 * scaffold.mjs — Sinh khung website ngành dịch vụ (10 khối chuẩn chuyển đổi).
 *
 * Cách dùng:
 *   node scaffold.mjs --brief "path/to/brief.json"
 *   node scaffold.mjs --ten "Nha khoa ABC" --slug "nha-khoa-abc" --mau "#0E7C7B" --sdt "0978276815" --nganh "nha khoa thẩm mỹ"
 *
 * Ra: output/YYYY-MM-DD-web-<slug>/index.html  (+ copy brief.json)
 *
 * Khung đã wiring sẵn 10 khối + responsive + mobile-first + sticky call button.
 * AI có nhiệm vụ thay 100% placeholder [ ... ] bằng nội dung THẬT (Bước 4 trong SKILL.md).
 */
import fs from 'node:fs';
import path from 'node:path';

// ---- parse args ----
function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) {
      const key = k.slice(2);
      const val = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : 'true';
      a[key] = val;
    }
  }
  return a;
}

function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const args = parseArgs(process.argv);

// ---- load brief ----
let brief = {};
if (args.brief) {
  const p = path.resolve(args.brief);
  if (!fs.existsSync(p)) { console.error('Không tìm thấy brief:', p); process.exit(1); }
  brief = JSON.parse(fs.readFileSync(p, 'utf8'));
}
// CLI overrides
brief.ten   = args.ten   || brief.ten   || 'Tên Doanh Nghiệp';
brief.nganh = args.nganh || brief.nganh || 'ngành dịch vụ';
brief.sdt   = args.sdt   || brief.sdt   || brief.lien_he?.sdt || '0900000000';
brief.mau   = args.mau   || brief.mau   || brief.thuong_hieu?.mau || '#0E7C7B';
const slug  = args.slug  || brief.slug  || slugify(brief.ten);

const dichVu = Array.isArray(brief.dich_vu) && brief.dich_vu.length
  ? brief.dich_vu
  : ['[Dịch vụ 1]', '[Dịch vụ 2]', '[Dịch vụ 3]'];

// ---- output dir ----
const today = new Date().toISOString().slice(0, 10);
const cwd = process.cwd();
const outDir = path.join(cwd, 'output', `${today}-web-${slug}`);
fs.mkdirSync(outDir, { recursive: true });

const tel = String(brief.sdt).replace(/[^0-9+]/g, '');
const accent = brief.mau;

// helper: service card
const serviceCards = dichVu.map((d, i) => `
        <article class="card">
          <div class="card-ico">0${i + 1}</div>
          <h3>${d}</h3>
          <p>[Mô tả ngắn lợi ích của "${d}" theo Phương trình Giá trị: kết quả mơ ước, nhanh, dễ, đáng tin.]</p>
          <a class="card-link" href="#lien-he">Tìm hiểu →</a>
        </article>`).join('');

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${brief.ten} — ${brief.nganh}</title>
<meta name="description" content="[Mô tả SEO 150 ký tự: ${brief.ten} giúp [khách] đạt [kết quả mơ ước]...]">
<style>
  :root{
    --accent:${accent};
    --accent-d:color-mix(in srgb, ${accent} 80%, black);
    --ink:#1a1a1a; --muted:#5b6470; --bg:#ffffff; --soft:#f5f7f9; --line:#e6eaee;
    --maxw:1120px; --r:14px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
       color:var(--ink);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 20px}
  h1,h2,h3{line-height:1.2;letter-spacing:-.01em}
  h1{font-size:clamp(28px,5vw,46px);font-weight:800}
  h2{font-size:clamp(24px,3.4vw,34px);font-weight:800;margin-bottom:.4em}
  h3{font-size:20px;font-weight:700}
  p{color:var(--muted)}
  a{color:inherit;text-decoration:none}
  .btn{display:inline-block;background:var(--accent);color:#fff;font-weight:700;padding:14px 26px;
       border-radius:999px;transition:.2s;border:none;cursor:pointer;font-size:16px}
  .btn:hover{background:var(--accent-d);transform:translateY(-1px)}
  .btn-ghost{background:transparent;border:2px solid var(--accent);color:var(--accent)}
  section{padding:64px 0}
  .eyebrow{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:13px}
  /* header */
  header{position:sticky;top:0;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);
         border-bottom:1px solid var(--line);z-index:50}
  .nav{display:flex;align-items:center;justify-content:space-between;height:64px}
  .logo{font-weight:800;font-size:20px}
  .nav-links{display:flex;gap:26px;align-items:center}
  .nav-links a{color:var(--muted);font-weight:600;font-size:15px}
  .nav-links a:hover{color:var(--ink)}
  /* hero */
  .hero{background:linear-gradient(180deg,var(--soft),#fff);text-align:center}
  .hero .sub{font-size:clamp(16px,2.2vw,20px);max-width:680px;margin:18px auto 28px}
  .trust{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-top:34px;color:var(--muted);font-size:14px}
  .trust b{color:var(--ink)}
  /* grid */
  .grid{display:grid;gap:22px}
  .g3{grid-template-columns:repeat(3,1fr)}
  .g2{grid-template-columns:repeat(2,1fr)}
  .card{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:26px;transition:.2s}
  .card:hover{box-shadow:0 12px 30px rgba(0,0,0,.07);transform:translateY(-2px)}
  .card-ico{width:42px;height:42px;border-radius:10px;background:color-mix(in srgb,var(--accent) 14%,white);
            color:var(--accent);font-weight:800;display:grid;place-items:center;margin-bottom:14px}
  .card-link{color:var(--accent);font-weight:700;display:inline-block;margin-top:12px}
  .soft{background:var(--soft)}
  /* steps */
  .steps{counter-reset:s}
  .step{display:flex;gap:16px;align-items:flex-start;padding:16px 0;border-bottom:1px dashed var(--line)}
  .step::before{counter-increment:s;content:counter(s);background:var(--accent);color:#fff;
     min-width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:800}
  /* proof */
  .quote{background:#fff;border:1px solid var(--line);border-left:4px solid var(--accent);
         border-radius:var(--r);padding:24px}
  .quote p{color:var(--ink);font-size:17px}
  .quote .who{color:var(--muted);font-size:14px;margin-top:10px}
  /* guarantee */
  .promise{background:color-mix(in srgb,var(--accent) 8%,white);border:1px solid color-mix(in srgb,var(--accent) 30%,white);
           border-radius:var(--r);padding:30px;text-align:center}
  /* faq */
  details{border-bottom:1px solid var(--line);padding:16px 0}
  details summary{font-weight:700;cursor:pointer;list-style:none;display:flex;justify-content:space-between}
  details summary::after{content:"+";color:var(--accent);font-size:22px}
  details[open] summary::after{content:"–"}
  details p{margin-top:10px}
  /* cta band */
  .band{background:var(--accent);color:#fff;text-align:center;border-radius:18px;padding:48px 20px}
  .band h2{color:#fff}.band p{color:rgba(255,255,255,.9)}
  .band .btn{background:#fff;color:var(--accent)}
  /* contact */
  .contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px}
  .field{display:block;width:100%;padding:13px 14px;border:1px solid var(--line);border-radius:10px;margin-bottom:12px;font-size:15px}
  .info-row{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}
  /* footer */
  footer{background:var(--ink);color:#cfd5dc;padding:34px 0;text-align:center;font-size:14px}
  /* sticky mobile call */
  .call-fab{position:fixed;right:18px;bottom:18px;z-index:60;background:var(--accent);color:#fff;
            padding:14px 20px;border-radius:999px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.2);display:none}
  @media(max-width:860px){
    .g3,.g2,.contact-grid{grid-template-columns:1fr}
    .nav-links{display:none}
    .call-fab{display:inline-block}
    section{padding:48px 0}
  }
</style>
</head>
<body>

<!-- ============ HEADER ============ -->
<header>
  <div class="wrap nav">
    <div class="logo">${brief.ten}</div>
    <nav class="nav-links">
      <a href="#dich-vu">Dịch vụ</a>
      <a href="#vi-sao">Vì sao chọn</a>
      <a href="#bang-chung">Đánh giá</a>
      <a href="#faq">FAQ</a>
      <a class="btn" href="tel:${tel}">Gọi ngay</a>
    </nav>
  </div>
</header>

<!-- ============ 1. HERO ============ -->
<section class="hero">
  <div class="wrap">
    <p class="eyebrow">${brief.nganh}</p>
    <h1>[Headline: Giúp [khách] đạt [kết quả mơ ước] mà không [nỗi sợ/công sức] — ${brief.ten}]</h1>
    <p class="sub">[Subhead 1 câu: làm gì · cho ai · kết quả gì, rõ trong 5 giây.]</p>
    <a class="btn" href="#lien-he">[CTA chính: Đặt lịch / Nhận tư vấn]</a>
    &nbsp;
    <a class="btn btn-ghost" href="tel:${tel}">Gọi ${brief.sdt}</a>
    <div class="trust">
      <span><b>[4.9★]</b> [trên 200+ đánh giá]</span>
      <span><b>[X năm]</b> kinh nghiệm</span>
      <span><b>[X.000+]</b> khách hài lòng</span>
    </div>
  </div>
</section>

<!-- ============ 2. NỖI ĐAU ============ -->
<section>
  <div class="wrap">
    <p class="eyebrow">Bạn có đang gặp?</p>
    <h2>[Gọi đúng nỗi đau lớn nhất của khách]</h2>
    <div class="grid g3" style="margin-top:26px">
      <div class="card"><h3>[Nỗi đau 1]</h3><p>[Mô tả cảm giác/hệ quả thật khách đang chịu.]</p></div>
      <div class="card"><h3>[Nỗi đau 2]</h3><p>[Mô tả.]</p></div>
      <div class="card"><h3>[Nỗi đau 3]</h3><p>[Mô tả.]</p></div>
    </div>
  </div>
</section>

<!-- ============ 3. DỊCH VỤ / OFFER ============ -->
<section id="dich-vu" class="soft">
  <div class="wrap">
    <p class="eyebrow">Giải pháp</p>
    <h2>Dịch vụ của ${brief.ten}</h2>
    <div class="grid g3" style="margin-top:26px">${serviceCards}
    </div>
  </div>
</section>

<!-- ============ 4. VÌ SAO CHỌN ============ -->
<section id="vi-sao">
  <div class="wrap">
    <p class="eyebrow">Khác biệt</p>
    <h2>Vì sao chọn chúng tôi</h2>
    <div class="grid g2" style="margin-top:26px">
      <div class="card"><h3>[USP 1]</h3><p>[Bằng chứng cho "khả năng đạt được": số liệu, quy trình, chứng nhận.]</p></div>
      <div class="card"><h3>[USP 2]</h3><p>[Bằng chứng.]</p></div>
      <div class="card"><h3>[USP 3]</h3><p>[Bằng chứng.]</p></div>
      <div class="card"><h3>[USP 4]</h3><p>[Bằng chứng.]</p></div>
    </div>
  </div>
</section>

<!-- ============ 5. BẰNG CHỨNG XÃ HỘI ============ -->
<section id="bang-chung" class="soft">
  <div class="wrap">
    <p class="eyebrow">Khách nói gì</p>
    <h2>Bằng chứng thật</h2>
    <div class="grid g3" style="margin-top:26px">
      <div class="quote"><p>"[Testimonial thật — đừng bịa]"</p><div class="who">— [Tên khách], [bối cảnh]</div></div>
      <div class="quote"><p>"[Testimonial 2]"</p><div class="who">— [Tên khách]</div></div>
      <div class="quote"><p>"[Testimonial 3]"</p><div class="who">— [Tên khách]</div></div>
    </div>
  </div>
</section>

<!-- ============ 6. QUY TRÌNH ============ -->
<section>
  <div class="wrap">
    <p class="eyebrow">Dễ như 1-2-3</p>
    <h2>Quy trình làm việc</h2>
    <div class="steps" style="margin-top:20px;max-width:760px">
      <div class="step"><div><h3>[Bước 1]</h3><p>[Mô tả ngắn, giảm công sức cảm nhận.]</p></div></div>
      <div class="step"><div><h3>[Bước 2]</h3><p>[Mô tả.]</p></div></div>
      <div class="step"><div><h3>[Bước 3]</h3><p>[Mô tả.]</p></div></div>
    </div>
  </div>
</section>

<!-- ============ 7. ĐẢO NGƯỢC RỦI RO ============ -->
<section class="soft">
  <div class="wrap">
    <div class="promise">
      <h2>[Cam kết / Bảo hành]</h2>
      <p style="max-width:620px;margin:10px auto 0">[Đảo ngược rủi ro rõ ràng: hoàn tiền / làm lại / bảo hành X — để khách an tâm xuống tiền.]</p>
    </div>
  </div>
</section>

<!-- ============ 8. FAQ ============ -->
<section id="faq">
  <div class="wrap" style="max-width:780px">
    <p class="eyebrow">Giải đáp</p>
    <h2>Câu hỏi thường gặp</h2>
    <div style="margin-top:18px">
      <details open><summary>[Câu hỏi 1?]</summary><p>[Trả lời gỡ phản đối.]</p></details>
      <details><summary>[Câu hỏi 2?]</summary><p>[Trả lời.]</p></details>
      <details><summary>[Câu hỏi 3?]</summary><p>[Trả lời.]</p></details>
      <details><summary>[Câu hỏi 4?]</summary><p>[Trả lời.]</p></details>
    </div>
  </div>
</section>

<!-- ============ 9. CTA CUỐI ============ -->
<section>
  <div class="wrap">
    <div class="band">
      <h2>[CTA mạnh: Sẵn sàng [kết quả mơ ước]?]</h2>
      <p style="margin:8px 0 22px">[1 câu thúc đẩy hành động.]</p>
      <a class="btn" href="tel:${tel}">Gọi ngay ${brief.sdt}</a>
    </div>
  </div>
</section>

<!-- ============ 10. LIÊN HỆ ============ -->
<section id="lien-he" class="soft">
  <div class="wrap">
    <p class="eyebrow">Liên hệ</p>
    <h2>Để lại thông tin — chúng tôi gọi lại</h2>
    <div class="contact-grid" style="margin-top:24px">
      <form class="card" onsubmit="alert('Cảm ơn! [CHƯA NỐI LEAD — xem ghi chú dưới]');return false;">
        <input class="field" placeholder="Họ và tên" required>
        <input class="field" placeholder="Số điện thoại" required>
        <textarea class="field" rows="3" placeholder="Nhu cầu của bạn"></textarea>
        <button class="btn" type="submit" style="width:100%">Gửi yêu cầu</button>
        <!-- TODO: nối form tới nơi nhận lead (email/CRM/Lark Base). Hiện mới chỉ báo cảm ơn. -->
      </form>
      <div class="card">
        <div class="info-row"><b>Hotline:</b><a href="tel:${tel}">${brief.sdt}</a></div>
        <div class="info-row"><b>Địa chỉ:</b><span>[Địa chỉ + map]</span></div>
        <div class="info-row"><b>Giờ làm:</b><span>[VD: 8:00–20:00 mỗi ngày]</span></div>
        <div class="info-row"><b>Phản hồi:</b><span>[VD: trong 15 phút]</span></div>
      </div>
    </div>
  </div>
</section>

<footer>
  <div class="wrap">© ${new Date().getFullYear()} ${brief.ten}. [Ngành: ${brief.nganh}.] Mọi quyền được bảo lưu.</div>
</footer>

<a class="call-fab" href="tel:${tel}">📞 Gọi ngay</a>

</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(outDir, 'brief.json'), JSON.stringify(brief, null, 2), 'utf8');

console.log('✅ Đã sinh khung website:');
console.log('   ' + path.join(outDir, 'index.html'));
console.log('   ' + path.join(outDir, 'brief.json'));
console.log('');
console.log('➡️  BƯỚC TIẾP: AI thay 100% placeholder [ ... ] bằng nội dung THẬT (xem SKILL.md Bước 4).');
console.log('   Xem trước:  open "' + path.join(outDir, 'index.html') + '"');
console.log('   Deploy:     dùng skill hmh-AIOS-deploy-cloudflare → deploy.mjs --dir "' + outDir + '" --name "' + slug + '"');
