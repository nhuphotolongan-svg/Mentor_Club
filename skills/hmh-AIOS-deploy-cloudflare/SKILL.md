---
name: hmh-AIOS-deploy-cloudflare
description: >
  Đưa một file index.html (vd output của hmh-mkt-web-dich-vu hoặc web cá nhân) LÊN MẠNG thành website
  công khai có SSL, hosting miễn phí trên Cloudflare Pages, rồi gắn TÊN MIỀN RIÊNG. Deploy ra link
  *.pages.dev tự động hoàn toàn (chỉ cần npx wrangler login 1 lần). Gắn domain đã sở hữu vào Pages +
  tạo bản ghi CNAME qua Cloudflare API (vì wrangler CLI chưa hỗ trợ custom domain — issue #11772).
  Có script deploy.mjs (tạo project Pages nếu chưa có → wrangler pages deploy → in link) và add-domain.mjs
  (gọi API gắn domain + DNS). Token chỉ để trong .env, không lưu memory. Mọi lệnh grounded từ docs Cloudflare
  gốc. Dùng khi người dùng muốn: đưa web lên mạng, deploy lên Cloudflare Pages, lấy link công khai cho web,
  gắn tên miền riêng vào web, cập nhật lại web đã deploy, bàn giao web cho khách. Kích hoạt khi có từ:
  deploy web, đưa web lên mạng, cloudflare pages, gắn domain, gắn tên miền, link pages.dev, xuất web ra link,
  hosting miễn phí, wrangler login, AIOS-deploy-cloudflare, cập nhật web đã deploy.
---

# Skill: Xuất web lên mạng qua Cloudflare (Pages + Domain)

Biến một file `index.html` thành **website có link công khai, chạy SSL, có thể gắn tên miền riêng**. Hosting miễn phí trên hạ tầng toàn cầu của Cloudflare.

> Đây là nửa sau của quy trình. Nửa đầu (DỰNG web) là skill `hmh-mkt-web-dich-vu`.

---

## 1. Nguồn / Grounded (đứng trên docs chính chủ)
Mọi lệnh dưới đây lấy từ docs Cloudflare gốc (không đoán):
- **Deploy Pages — Direct Upload:** `wrangler pages project create` + `wrangler pages deploy`.
- **Custom domain Pages:** wrangler CLI chưa hỗ trợ thêm custom domain ([issue #11772](https://github.com/cloudflare/workers-sdk/issues/11772)) → phải qua **Dashboard hoặc API**.
- **DNS / Zone API:** tạo CNAME qua `POST /zones/{zone}/dns_records`.

---

## 2. NĂNG LỰC THẬT (nói thẳng — cái gì tự động, cái gì cần tay người)

| Việc | Mức tự động | Điều kiện |
|---|---|---|
| Deploy web → link `*.pages.dev` | ✅ Tự động hoàn toàn | `npx wrangler login` 1 lần (mở trình duyệt) |
| Gắn domain ĐÃ SỞ HỮU (subdomain) vào Pages | ⚠️ Bán tự động | Domain là zone trên Cloudflare + API token (Pages edit + DNS edit) |
| Gắn apex (vd `tenmien.com`) | ⚠️ Bán tự động | Nameservers domain phải trỏ về Cloudflare |
| MUA domain mới | 🔶 Cần tay người | Cloudflare Registrar cần payment method; nên thao tác lần đầu trên Dashboard |

Lưu ý: Cloudflare không bán mọi đuôi (vd `.vn` không có) → muốn `.vn` phải mua ở nhà đăng ký VN rồi trỏ nameservers về Cloudflare.

---

## 3. Tiền điều kiện
- **Node + wrangler:** gọi `npx wrangler` (tự tải lần đầu). Trên máy này Node qua nvm `~/.nvm/versions/node/v24.16.0/bin/`.
- **Đăng nhập 1 lần:** `npx wrangler login` (OAuth, mở trình duyệt, **bấm Allow NGAY trong ~1 phút**). Kiểm tra: `npx wrangler whoami`.
- **Cho custom domain qua API:** tạo API token ở Dashboard (My Profile → API Tokens) quyền **Account · Cloudflare Pages · Edit** + **Zone · DNS · Edit**. Lưu vào `.env`: `CF_API_TOKEN`, `CF_ACCOUNT_ID`, (tùy) `CF_ZONE_ID`. **KHÔNG lưu token vào memory.**

> macOS: dùng `npx` (không phải `npx.cmd` như bản Windows). Đường dẫn web có dấu cách/tiếng Việt vẫn deploy được; chỉ cần `--name` là kebab-case ASCII.

---

## 4. Quy trình thực thi

### Bước 1 — Deploy web ra link công khai (luôn làm được)
```bash
# Đăng nhập 1 lần (người dùng tự bấm Allow):  npx wrangler login
node ~/.claude/skills/hmh-AIOS-deploy-cloudflare/scripts/deploy.mjs \
  --dir "output/2026-06-24-web-ten-dn" \
  --name "ten-dn"
```
Script tự: kiểm tra đăng nhập → tạo project Pages nếu chưa có → `wrangler pages deploy` → in link `https://ten-dn.pages.dev`.

### Bước 2 — (Tuỳ chọn) Gắn domain riêng đã sở hữu
```bash
# cần CF_API_TOKEN + CF_ACCOUNT_ID (+ CF_ZONE_ID cho subdomain) trong .env
node ~/.claude/skills/hmh-AIOS-deploy-cloudflare/scripts/add-domain.mjs \
  --project "ten-dn" \
  --domain "web.tenmien.com"
```
Script gọi Cloudflare API gắn domain vào Pages + tạo CNAME `web → ten-dn.pages.dev` (proxied). SSL cấp tự động vài phút.
- **Apex** (`tenmien.com`): cần nameservers trỏ về Cloudflare trước; script báo nếu zone chưa sẵn sàng.
- **Fallback không token:** Dashboard → Workers & Pages → chọn project → Custom domains → Set up a domain (3 click), SSL tự động.

### Bước 3 — Cập nhật lại web sau này
Sửa `index.html` → chạy lại Bước 1 (cùng `--name`). Mỗi lần deploy ra 1 bản; link domain luôn trỏ bản mới nhất.

### Bước 4 — Ghi nhận
Ghi link live vào file `.md` của output tương ứng + `log.md`. Nếu là tài sản dùng lại (project name + domain) → lưu memory dự án (**KHÔNG lưu token**).

---

## 5. Scripts
- `scripts/deploy.mjs` — deploy thư mục web lên Cloudflare Pages, in link.
- `scripts/add-domain.mjs` — gắn custom domain vào Pages + tạo DNS qua API.
- `.env.example` — mẫu khai báo `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_ZONE_ID`.

## 6. Lưu ý / gotcha (từ lần chạy thật)
- ⚠️ **Deploy là hành động RA NGOÀI (công khai)** → luôn xác nhận với người dùng trước khi chạy thật.
- `wrangler login` cần trình duyệt (OAuth tương tác) — **không chạy được headless**; để người dùng tự login 1 lần, bấm Allow ngay (chậm là TIMEOUT).
- **Login & deploy phải cùng một môi trường/terminal** — khác `XDG_CONFIG_HOME` ⇒ wrangler đọc nhầm config ⇒ "not authenticated". Đừng đi dò file token.
- **Custom domain KHÔNG gắn được bằng wrangler CLI** (issue #11772) → dùng API (`add-domain.mjs`).
- **522 / SSL pending ngay sau khi gắn domain là BÌNH THƯỜNG** — Cloudflare cấp chứng chỉ mất ~5–15 phút rồi domain chuyển active. Đừng tưởng hỏng; đợi rồi mở lại.
- **Link `*.pages.dev` dùng được NGAY** kể cả khi domain riêng đang chờ SSL → gửi link này trước.
- **Bảo mật token:** chỉ để trong `.env` (đã gitignore). Nếu lỡ lộ (dán qua chat/ảnh) → vào `dash.cloudflare.com/profile/api-tokens` thu hồi & tạo lại. Tuyệt đối không in token ra log.

## 7. Output
Bám CLAUDE.md: link live + ghi chú lưu trong thư mục output của web đó; cập nhật `index.md` + `log.md`.
