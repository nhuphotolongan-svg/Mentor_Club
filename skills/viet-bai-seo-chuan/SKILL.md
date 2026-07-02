---
name: viet-bai-seo-chuan
description: >
  Viết bài blog chuẩn SEO để lên top Google: từ một brief (từ khoá chính/phụ, outline, meta, internal/external link)
  ra một bài HTML hoàn chỉnh đúng Checklist SEO (headline có số + lợi ích, sapo chứa từ khoá trong 100 từ đầu,
  heading rải từ khoá, alt ảnh chứa từ khoá, mật độ ~1.5-2%, kết luận + 2 CTA gắn UTM). Tuỳ chọn đăng lên
  WordPress qua REST API (Application Password) và cập nhật lịch nội dung.
  Dùng khi người dùng muốn viết bài chuẩn SEO cho website, lên bài blog đúng từ khoá, viết content trụ, hoặc đăng bài lên WordPress.
  Kích hoạt khi có từ: viết bài seo, bài blog chuẩn seo, seo web writer, viết content chuẩn seo, đăng wordpress, từ khoá lên top, checklist viết bài blog.
---

# Skill: Viết bài blog chuẩn SEO (và tuỳ chọn đăng WordPress)

Biến một **brief từ khoá** thành **bài blog chuẩn SEO** đủ sức lên top Google, đúng giọng chuyên gia,
đủ ảnh và đúng vị trí từ khoá. Tuỳ chọn đăng thẳng lên WordPress của bạn.

> ⚠️ **Skill này KHÔNG chứa thông tin riêng của ai.** Mọi giá trị riêng (URL website, tài khoản WordPress,
> Application Password, Lark Base token, đường dẫn máy) đều do **bạn cung cấp qua `phieu-bai-viet.md` hoặc file
> `.env` riêng**. KHÔNG hard-code bất kỳ domain/tài khoản/mật khẩu nào vào skill hay code sinh ra.

## 0. Quy tắc bảo mật
- KHÔNG tự nhập / in ra Application Password hay token. Thiếu → **dừng và hướng dẫn người dùng tự điền** vào `.env`.
- Mọi domain/tài khoản lấy từ cấu hình người dùng, không lấy từ ví dụ trong skill.

## 1. Tri thức nền (đọc TRƯỚC khi viết)
**Đọc [references/seo-blog-checklist.md](references/seo-blog-checklist.md) trước.** Đó là checklist 9 khối + bảng
vị trí từ khoá + gate xanh Yoast. Grounded từ Yoast SEO, Brian Dean/Backlinko, nguyên lý headline của Ogilvy.

## 2. Đầu vào — Brief bài viết
Lấy brief từ `phieu-bai-viet.md` người dùng điền (hoặc người dùng dán trực tiếp). Các trường:

| Trường | Vai trò |
|---|---|
| Tiêu đề / Từ khoá chính | H1 + focus keyword |
| Từ khoá phụ | H2/H3 + FAQ |
| Outline | Cấu trúc H1/H2/H3 |
| Meta Title / Meta Description | thẻ SEO (Title ≤60, Desc 120-156 ký tự) |
| URL Slug | đường dẫn sạch chứa từ khoá |
| Internal links / External (web mạnh) | link nội bộ + 1 link ngoài uy tín |
| Alt text ảnh | alt chứa từ khoá chính |
| Số từ mục tiêu | độ dài (mặc định ~1500-2000) |
| Danh mục / Tag | phân loại WordPress |

## 3. QUY TRÌNH VIẾT (Claude làm theo)

### Bước 1 — (khuyến nghị) Nghiên cứu đối thủ
Xem top 10 Google cho từ khoá chính (WebSearch) → ghi nhận cấu trúc, độ dài, góc tiếp cận → đặt mục tiêu viết tốt hơn.

### Bước 2 — Viết bài HTML chuẩn SEO
Tạo `output/YYYY-MM-DD-bai-seo/<slug>.html` — **chỉ phần thân bài** (không cần `<html>`/`<head>`), tuân thủ checklist:
- **H1**: từ khoá chính ở đầu, có số + lợi ích + lời hứa.
- **Sapo**: từ khoá chính trong **100 từ đầu** (tốt nhất câu 1), có neo móc (câu hỏi sốc / kết quả / câu chuyện).
- **Heading H2/H3** theo Outline; rải từ khoá chính/phụ; mỗi heading hấp dẫn/tò mò.
- **Mật độ từ khoá ~1.5-2%**, độ dài **≥ số từ mục tiêu**, đoạn 3-5 dòng.
- **Ảnh thân bài**: placeholder `__IMG1__`, `__IMG2__`… trong `src`, bọc `<figure><img src="__IMG1__" alt="<từ khoá chính ...>"><figcaption>…</figcaption></figure>`. **Alt BẮT BUỘC chứa từ khoá chính.** (Khi đăng, thay placeholder bằng URL ảnh thật; ảnh #1 = featured.)
- **Internal links**: 2-3 link nội bộ (anchor chứa từ khoá). **External**: 1 link "web mạnh" cùng chủ đề.
- **Kết luận** < 200 từ, không ý mới, truyền cảm hứng + câu cuối dễ nhớ.
- **2 CTA** (giữa + cuối) gắn UTM: `?utm_source=blog&utm_medium=post&utm_campaign=<slug>&utm_content=cta-giua-bai|cta-cuoi-bai`.
- **CẤM**: ký tự em dash "—", emoji, viết kiểu tin báo/trích báo.
- Rà mục "RÀ CUỐI TRƯỚC KHI PUBLISH" trong checklist trước khi đăng.

### Bước 3 — (tuỳ chọn) Đăng lên WordPress
Đăng **headless qua WordPress REST API** bằng **Application Password** (KHÔNG cần connector trình duyệt).
Cấu hình của bạn để trong `.env` (không commit, không dán vào chat):
```
WP_URL=https://website-cua-ban.com
WP_USER=<tên đăng nhập WP>
WP_APP_PASSWORD=<chuỗi 24 ký tự Application Password>
```
> **Tạo Application Password:** wp-admin → Users → Profile → Application Passwords → tạo tên "Claude SEO" →
> copy chuỗi 24 ký tự dán vào `.env`.

Trình tự đăng (Claude tự sinh script hoặc gọi REST trực tiếp):
1. **Upload ảnh** `POST /wp-json/wp/v2/media` (set `alt_text` chứa từ khoá), lấy media id + URL. *(Nếu site chặn upload binary qua WAF 403, dùng plugin upload-by-JSON hoặc upload tay trong wp-admin — KHÔNG tìm cách lách WAF.)*
2. **Thay placeholder** `__IMGk__` bằng URL ảnh thật; ảnh #1 set làm **featured image**.
3. **Tạo bài** `POST /wp-json/wp/v2/posts` status `publish`: title, content, slug, excerpt (= meta description), categories, tags.
4. **Yoast focus keyword** (nếu site mở `show_in_rest` cho `_yoast_wpseo_*`): set qua meta; nếu chưa thì on-page SEO trong nội dung vẫn đủ để ranking, đặt focus keyword tay khi cần gate xanh.
5. **Verify** mở URL bài thật → status `publish` → mới báo "đã đăng".

### Bước 4 — Lưu output
Tạo `output/YYYY-MM-DD-bai-seo/YYYY-MM-DD-bai-seo.md`: brief đã dùng, link đã đăng, ảnh, trạng thái.

## 4. (Tuỳ chọn) Lấy brief từ lịch nội dung Lark Base
Nếu bạn quản lý lịch bài bằng Lark Base: cấu hình `BASE_TOKEN` + `TABLE_ID` của **Base của bạn** trong `.env`,
rồi dùng `lark-cli` đọc bài "Chờ viết" đến hạn → lấy brief + tải ảnh → viết → đăng → cập nhật trạng thái "Đã đăng" + link.
*(Phần này tuỳ chọn; skill chạy tốt chỉ với một brief dán tay.)*

## 5. Gotcha thực chiến
- **WordPress connector trình duyệt KHÔNG dùng cho tự động** — luôn đi REST API + Application Password.
- **Yoast focus keyword qua REST** chỉ "ăn" nếu site đăng ký `show_in_rest` cho meta Yoast (thường cần mu-plugin nhỏ). Không có vẫn đăng được, on-page SEO trong bài là thứ quyết định ranking.
- **Ảnh > 2MB** nên loại/nén. Không có ảnh thì bài vẫn đăng (text-only) nhưng nên bổ sung ảnh sau.
- **Site chặn upload file qua WAF (403)** là chuyện thường — dùng đường upload-by-JSON của plugin hoặc upload tay, KHÔNG lách WAF.
- Nếu chạy tự động theo lịch (scheduled task), tách **đọc lịch** + **đăng** ra chạy thẳng bằng `node`, chỉ để bước **viết** cho AI (tránh cổng duyệt quyền chặn lệnh khi headless). File script lưu **UTF-8 có BOM** trên Windows PowerShell 5.1.

## 6. Liên quan
Ghép cặp với một skill **research từ khoá** (giai đoạn trước: tạo brief) nếu có. Mọi output theo quy tắc **1 thư mục / 1 kết quả**.

---
*Bản skill bàn giao — sạch bí mật. Checklist SEO lõi ở `references/seo-blog-checklist.md`.*
