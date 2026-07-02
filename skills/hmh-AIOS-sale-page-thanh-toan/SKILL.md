---
name: hmh-AIOS-sale-page-thanh-toan
description: >
  Dựng trọn HỆ THỐNG SALE PAGE TỰ ĐỘNG THANH TOÁN chạy 24/7 — không cần server riêng, không cần kỹ sư.
  Luồng: Khách điền form → Lark Base lưu lead (pending) → trang thanh toán tự sinh mã QR VietQR →
  khách chuyển khoản → Sepay phát hiện → webhook cập nhật Lark (paid) → email chúc mừng tự gửi qua
  Lark SMTP → Zalo báo mentor qua Smax.ai → trang thanh toán tự nhảy "thành công" nhờ poll mỗi 4 giây.
  Toàn bộ host MIỄN PHÍ trên Cloudflare Pages + Functions (serverless). Skill có script scaffold.mjs sinh
  nguyên project từ 1 brief (tên khoá · giá · màu · ngân hàng · số TK · tên chủ TK): ra index.html, trang
  /thanh-toan/ (VietQR + polling), 3 API (submit / payment-callback / check-payment), lib Lark + SMTP qua
  cloudflare:sockets + Smax, wrangler.toml, và file SECRETS hướng dẫn nạp bí mật (tự sinh SEPAY_API_KEY).
  Order_id format X3+8 số là khoá khớp đơn. Bí mật chỉ để trong secrets/.env, KHÔNG lưu memory. Sau khi
  dựng, deploy + gắn domain bằng skill anh em hmh-AIOS-deploy-cloudflare. Dùng khi người dùng muốn: làm
  sale page có thanh toán tự động, trang bán khoá học tự thu tiền, web chuyển khoản VietQR xác nhận tự động,
  tích hợp Sepay webhook, dựng phễu thu tiền, bàn giao hệ thống bán hàng tự động cho học viên/khách. Kích
  hoạt khi có từ: sale page tự động thanh toán, trang thanh toán tự động, vietqr tự sinh, webhook sepay,
  sepay xác nhận chuyển khoản, bán khoá học tự động, thu tiền tự động, order_id X3, cloudflare pages thanh toán,
  email tự gửi sau thanh toán, zalo báo đơn smax, hệ thống sale page X3, AIOS-sale-page-thanh-toan.
---

# Skill: Hệ Thống Sale Page Tự Động Thanh Toán

Biến một đầu bài khoá học/dịch vụ thành **một hệ thống bán hàng tự chạy 24/7**: khách tự đăng ký → tự nhận QR → tự chuyển khoản → hệ thống **tự xác nhận, tự gửi email, tự báo Zalo**. Không server riêng, không developer trực — Cloudflare Pages + Functions lo phần chạy, Lark Base làm CRM + soạn email.

> Đây là bản port SOP *"Xây Dựng Hệ Thống Sale Page Tự Động Hoàn Chỉnh"* (khoá X3) của mentor Hoàng Minh Hóa.
> Skill này lo phần **DỰNG + TÍCH HỢP**. Phần **đưa lên mạng + gắn tên miền** → dùng `hmh-AIOS-deploy-cloudflare`.

---

## 1. Hệ thống làm gì (luồng end-to-end)

```
Khách điền form  →  /api/submit  →  Lark Base lưu lead (pending) + sinh order_id (X3 + 8 số)
       →  redirect /thanh-toan/?order=...  →  hiện QR VietQR (có sẵn số tiền + nội dung = order_id)
       →  Khách chuyển khoản  →  Sepay phát hiện  →  POST /api/payment-callback
       →  verify Apikey → match /X3\d{8}/ → tìm record → cập nhật payment_status = paid
       →  (nền) gửi email qua Lark SMTP  +  ping Zalo mentor qua Smax.ai
       →  trang /thanh-toan/ đang poll /api/check-payment mỗi 4s → tự hiện "Thành công"
```

Chi phí vận hành ~ **$0** (Cloudflare Pages, Lark, Sepay, Smax gói cơ bản đều free; chỉ tốn domain ~300k/năm nếu muốn).

---

## 2. Kiến trúc & file (đã code sẵn — grounded, không bịa)

Scaffold sinh ra project:
```
<slug>/
├── index.html                      ← Sale page (form: tên/SĐT/email/lĩnh vực)
├── thanh-toan/index.html           ← Trang QR VietQR + poll 4s
├── functions/api/
│   ├── submit.js                   ← onRequestPost: tạo order_id, lưu Lark (pending), CORS
│   ├── payment-callback.js         ← onRequestPost: webhook Sepay → paid → email + Zalo (waitUntil)
│   └── check-payment.js            ← onRequestGet: trả {paid:true/false} cho trang poll
├── lib/
│   ├── lark.js                     ← token + create/find/update record + get email template
│   ├── smtp.js                     ← SMTP Lark 465 qua cloudflare:sockets (implicit TLS)
│   ├── email.js                    ← markdown nhẹ → HTML email đẹp, điền {{name}}...
│   └── smax.js                     ← bắn Zalo qua Smax.ai API Trigger
├── wrangler.toml                   ← name + nodejs_compat + [vars] thương hiệu
├── .dev.vars.example               ← mẫu biến cho chạy local
├── .gitignore                      ← chặn commit .env/.dev.vars/SECRETS
├── brief.json                      ← brief đã chốt
└── SECRETS.local.txt               ← lệnh nạp secrets + SEPAY_API_KEY tự sinh (KHÔNG commit)
```

---

## 3. Năng lực thật (cái gì tự động, cái gì cần tay người MỘT lần)

| Việc | Mức | Điều kiện |
|---|---|---|
| Sinh toàn bộ code project | ✅ Tự động | `node scaffold.mjs` |
| Deploy lên Cloudflare Pages | ✅ Tự động | `wrangler login` 1 lần (qua `hmh-AIOS-deploy-cloudflare`) |
| Xác nhận thanh toán, email, Zalo | ✅ Tự động 24/7 | đã nạp secrets + webhook Sepay |
| Tạo Lark App / Base / lấy token | 🔶 Tay người 1 lần | trên dashboard Lark |
| Đăng ký Sepay + nối ngân hàng | 🔶 Tay người 1 lần | trên sepay.vn |
| Nối Zalo cá nhân vào Smax | 🔶 Tay người 1 lần (tuỳ chọn) | trên smax.ai |
| Mua + trỏ domain | 🔶 Tay người 1 lần (tuỳ chọn) | nhà đăng ký + Cloudflare |

---

## 4. Quy trình thực thi

### Bước 0 — Lấy brief
Hỏi/đối chiếu đủ: **tên khoá · giá (VND) · màu chủ đạo · mô tả ngắn · mã ngân hàng · số tài khoản · tên chủ TK (HOA, không dấu)**. Tham khảo `assets/brief.example.json`.

### Bước 1 — Sinh project
```bash
node ~/.claude/skills/hmh-AIOS-sale-page-thanh-toan/scripts/scaffold.mjs \
  --ten "Khóa X3 Marketing" --slug "x3-marketing" --gia 497000 --mau "#E11D48" \
  --bank MB --stk 9978276815 --chutk "HOANG MINH HOA"
# hoặc: --brief duong-dan/brief.json
```
Ra `output/<ngày>-salepage-<slug>/`. Script tự sinh `SEPAY_API_KEY` và in ra (ghi vào `SECRETS.local.txt`).
> Sau khi sinh, **đọc lại nội dung sale page và tinh chỉnh** cho đúng giọng/USP của khách (template chỉ là khung khởi đầu — phần thuyết phục do bạn viết, tham khảo skill `hmh-mkt-web-dich-vu`).

### Bước 2 — Dựng hạ tầng tay người (1 lần) — xem `references/`
1. **Lark** (`references/lark-base-crm-email.md`): tạo Custom App → bật `bitable:app` → Publish → lấy App ID/Secret; tạo Base bảng `Leads` (+ tuỳ chọn `Email Templates`); **cấp Editor app vào Base**; lấy Base Token + Table ID.
2. **Sepay** (`references/sepay-vietqr.md`): đăng ký → nối ngân hàng → tạo webhook trỏ `/api/payment-callback`, Apikey = `SEPAY_API_KEY`.
3. **Email**: tạo **Application Password** trong Lark (Settings → Security) → `SMTP_USER` + `SMTP_PASS`.
4. **Zalo (tuỳ chọn)** (`references/smax-zalo.md`): nối Zalo cá nhân vào Smax → lấy 4 biến `SMAX_*`.

### Bước 3 — Deploy
Bàn giao cho skill `hmh-AIOS-deploy-cloudflare`, hoặc trực tiếp:
```bash
cd "output/<ngày>-salepage-<slug>"
wrangler pages project create <slug>
wrangler pages deploy .
```
Ra link `https://<slug>.pages.dev`.

### Bước 4 — Nạp secrets (chạy các lệnh trong `SECRETS.local.txt`)
```bash
wrangler pages secret put LARK_APP_ID --project-name <slug>
# ... (LARK_APP_SECRET, LARK_BASE_TOKEN, LARK_TABLE_ID, SEPAY_API_KEY, SMTP_USER, SMTP_PASS, [SMAX_*])
```
Local test trước khi deploy: copy `.dev.vars.example` → `.dev.vars`, rồi `wrangler pages dev .`.

### Bước 5 — Nối webhook Sepay & test 1.000đ
Dán URL `https://<domain>/api/payment-callback` + Apikey vào Sepay → chuyển khoản thử **1.000đ** đúng nội dung = một order_id `pending` → soi **Real-time Logs** trên Cloudflare → record sang `paid`, trang poll hiện "Thành công", email + Zalo đến.

### Bước 6 — Go-live
Gắn domain riêng (qua `hmh-AIOS-deploy-cloudflare`), thay nội dung thật, kiểm tra lại checklist Bước 5 với số tiền thật.

---

## 5. Bảo mật (bắt buộc tuân thủ)
- **Mọi bí mật chỉ ở `wrangler secret` / `.dev.vars` / `SECRETS.local.txt`** (đã `.gitignore`). **TUYỆT ĐỐI không lưu token/secret vào memory**, không in ra log, không commit.
- `SEPAY_API_KEY` là mật khẩu giữa Sepay ↔ hệ thống → lộ thì sinh lại + cập nhật cả 2 phía.
- Deploy là hành động **RA NGOÀI (công khai)** → xác nhận với người dùng trước khi `wrangler pages deploy` thật.

## 6. Gotcha (từ thực tế Cloudflare + Lark + Sepay)
- **Tên cột Lark phải khớp 100%** với chuỗi trong code (`"Họ và tên"`, `"Số điện thoại"`, `order_id`, `payment_status`…) — lệch dấu là không tìm thấy record.
- **Quên cấp Editor app vào Base** ⇒ Lark API trả permission denied (91402). Triệu chứng: submit lỗi 500.
- **`nodejs_compat` + `compatibility_date`** phải có trong `wrangler.toml` để `cloudflare:sockets` (SMTP) chạy.
- **Idempotent**: callback bỏ qua nếu đã `paid` — Sepay có thể gửi lại webhook.
- **VietQR `accountName` viết HOA không dấu** đúng tên ngân hàng; sai tên vẫn ra QR nhưng gây nghi ngờ cho khách.
- **Trang `/thanh-toan/` cần `?order=`**: vào thẳng không có param sẽ không poll được — luôn tới từ redirect của form.
- **Lark quốc tế = `open.larksuite.com`** (đã set trong `lib/lark.js`); nếu dùng Feishu (TQ) đổi sang `open.feishu.cn`.

## 7. Output
Bám CLAUDE.md: ghi link live + ghi chú vào thư mục `output/...` tương ứng; cập nhật `index.md` + `log.md` của wiki nếu liên quan. Tài sản dùng lại (slug, domain, table IDs) lưu memory dự án — **không kèm secret**.
