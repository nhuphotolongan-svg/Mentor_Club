---
name: nha-may-pheu
description: >
  Tổ hợp AI "Nhà máy phễu" — nhận đầu bài (sản phẩm/giá/đối tượng/mục tiêu) rồi điều phối đội trợ lý AI chạy đủ 10 bước phễu: research → nỗi đau → lead magnet → bìa → ebook → leadpage → đổ data Lark Base → email giao hàng → nurture 10 ngày → content. Chế độ bán tự động với 3 chốt duyệt (sau research, sau ebook, sau leadpage). Deploy leadpage + form + nurture + pixel mở mail qua Cloudflare Worker, gửi mail qua SMTP.
  Dùng khi người dùng muốn chạy trọn một chiến dịch phễu bán hàng tự động, xây hệ thống thu lead + nuôi dưỡng, nhân bản chiến dịch mới, hoặc "chạy nhà máy phễu cho sản phẩm X".
  Kích hoạt khi có từ: nhà máy phễu, tổ hợp AI funnel, chạy chiến dịch phễu, lead magnet tự động, nhân bản chiến dịch, leadpage + nurture, phễu trọn gói.
---

# Skill: Tổ hợp AI "Nhà máy phễu"

Nhận đầu bài → đội AI tự chạy 10 bước → ra một chiến dịch phễu LIVE (trang thu lead + ebook + email giao + nurture 10 ngày + content).

> ⚠️ **Skill này KHÔNG chứa bí mật.** Mọi giá trị riêng (Base token, App ID/Secret, domain, hộp thư SMTP, link Zalo, KV id) đều do **người dùng cung cấp qua "Phiếu đầu bài"** (`phieu-dau-bai.md`) hoặc nạp dạng secret trên Cloudflare. KHÔNG hard-code bất kỳ token/tài khoản nào vào skill hay vào code sinh ra. Trước khi chạy, đọc `phieu-dau-bai.md` mà người dùng đã điền.

## 0. Quy tắc bảo mật (đọc đầu tiên)
- KHÔNG bao giờ tự nhập / đọc / in ra mật khẩu, App Secret, SMTP pass. Nếu thiếu → **dừng và hướng dẫn người dùng tự nạp** bằng `npx wrangler secret put <TÊN>`.
- KHÔNG ghi token/secret vào file artifact, log, hay transcript.
- Mọi Base token / App ID / domain / hộp thư lấy từ **Phiếu đầu bài người dùng điền**, không lấy từ ví dụ trong skill.

## 1. Kiến trúc vận hành
- 1 Giám đốc điều phối (main agent) + đội ~11 chuyên viên AI (mỗi AI = 1 subagent + 1 skill chuyên môn nếu có).
- **CÁCH CHẠY THẬT (quan trọng):** KHÔNG dựa vào tool Workflow (subagent trong workflow không chắc gọi được skill con). Thay vào đó main agent đóng vai Giám đốc, **spawn từng AI bằng Agent tool (`general-purpose`, có WebSearch + các skill marketing)**, tuần tự/song song theo phase, dừng ở chốt hỏi `AskUserQuestion`.
- Bàn giao bằng artifact file trong `output/<chiến-dịch>/` (đánh số `01..10` + `README`). Nếu người dùng có Bảng điều phối Lark Base thì cập nhật trạng thái; không có cũng chạy được.
- Chế độ **BÁN TỰ ĐỘNG** (mặc định): 3 chốt duyệt (sau research, sau ebook, sau leadpage). Hoặc **TỰ ĐỘNG HOÀN TOÀN** nếu người dùng chọn (đánh đổi kiểm soát chất lượng).

## 2. Dây chuyền 10 bước
| # | Bước | Việc | Skill gợi ý (nếu có trong máy) |
|---|---|---|---|
| 1 | Chiến lược | Tính ngược phễu từ mục tiêu doanh thu → số lead/khách cần | kế hoạch tài chính / mục tiêu tài chính |
| 2 | Research | WebSearch THẬT nỗi đau + đối thủ + ngôn ngữ khách | research thị trường |
| 3 | Mồi câu | ≥20 ý tưởng lead magnet → chọn 1 (chấm điểm) | lead magnet |
| 4 | Bìa | Ảnh bìa + mockup ebook | infographic / thiết kế |
| 5 | Ebook | Ebook PDF có cấu trúc + CTA | ebook |
| 6 | Leadpage | Trang đích (HTML host Cloudflare **hoặc** Ladipage) + form 3 trường | leadpage / web dịch vụ |
| 7 | Data | Tạo bảng **Leads** + **Email Nurture 10 ngày** trong Lark Base | lark-base |
| 8 | Email giao | Email tặng ebook + nút Zalo + pixel đo mở | email SMTP |
| 9 | Nurture | 10 email Day1→Day10 nuôi dưỡng | content / email |
| 10 | Content | Bài đăng mạng xã hội kéo traffic về phễu | content đa kênh |

## 3. Hạ tầng Lark Base (do người dùng cung cấp)
- Người dùng cấp **Base token** (của Base họ tự tạo) trong Phiếu đầu bài. AI có thể tự tạo Base + bảng nếu người dùng chưa có.
- Mỗi chiến dịch: bảng **Leads** + bảng **"Email Nurture 10 ngày"** (cùng Base, hoặc dùng chung Base + cột "Chiến dịch" để lọc).
- Thao tác Base qua `lark-cli` (`base +table-create`, `base +record-batch-create/update`...) bằng danh nghĩa người dùng (họ đã `lark-cli auth login`).

## 4. Leadpage + form + nurture (Cloudflare Worker)
Trang HTML tĩnh KHÔNG tự ghi Lark Base được (CORS + cần token). Dùng **Cloudflare Worker relay**. AI **tự sinh `worker.js` mới mỗi chiến dịch** (không bê code cũ có giá trị riêng). Hợp đồng Worker:

- **`POST /submit`** `{name,phone,email}` → lấy `tenant_access_token` bằng `LARK_APP_ID`/`LARK_APP_SECRET` → tạo record bảng Leads (set `Ngày đăng ký=now`, `Trạng thái="Chưa gửi"`, `Nguồn=<SOURCE_TAG>`) → gửi ebook qua SMTP → đổi trạng thái `"Đã gửi"` → trả link nhóm Zalo.
- **`GET /open?d=N&r=<recordId>`** → trả pixel 1×1; **dedup qua KV** (binding `OPENS`, key `d:r`); cập nhật `Số đã gửi`/`Số đã mở` + `Tỉ lệ mở email` (field percentage = opened/sent). `d=0` = email giao ebook (đánh dấu lead "Đã mở email giao" + thời điểm).
- **`cron "0 1 * * *"`** (08:00 giờ VN) → gửi email nurture đến hạn theo `Ngày đăng ký` + `Ngày nurture hiện tại`, nhúng pixel `/open?d=N`.
- **`GET /run-nurture?key=<KEY>[&test=email]`** → chạy nurture thủ công (key do người dùng đặt, không hard-code).
- Cần **1 Lark Custom App** scope `bitable:app`, đã publish, được thêm làm **cộng tác viên quyền Sửa** của Base. Host quốc tế `open.larksuite.com`.
- **Custom domain:** gắn qua `wrangler.toml [[routes]] custom_domain=true` rồi `npx wrangler deploy` (OAuth `npx wrangler login` của người dùng đủ quyền tạo DNS+SSL). Xem `wrangler.toml.mau`.

### Secret cần nạp (người dùng tự chạy `npx wrangler secret put`)
```
LARK_APP_ID   LARK_APP_SECRET   SMTP_USER   SMTP_PASS
FROM_NAME     ZALO_LINK         LINK_KHOA (tuỳ chọn)
```
Mẹo nạp không lộ: `printf '%s' "<giá trị>" | npx wrangler secret put <TÊN>` (giá trị không in ra transcript). AI KHÔNG tự làm bước này.

## 5. NHÂN BẢN chiến dịch mới (nhanh)
1. Đọc Phiếu đầu bài mới → đặt `LEADS_TABLE`/`NURTURE_TABLE`/`SOURCE_TAG`/`BASE_URL`/subdomain mới.
2. Sinh `worker.js` + `wrangler.toml` mới (tên worker `leadpage-<tên>`, KV id của người dùng).
3. Tạo 2 bảng mới (Leads + Nurture) trong Base người dùng.
4. Đổ 10 email nurture từ file `09-nurture-10-ngay.md` bằng parser. **Regex parser phải khớp** `#{2,4}\s*EMAIL\s*[—-]\s*(?:NG[ÀA]Y|DAY)\s*(\d+)`; kiểm tra tạo đúng **10 record** trước khi tiếp.
5. Người dùng nạp lại secret → `npx wrangler deploy` (gắn custom domain ngay lần deploy đầu).

## 6. Gotcha thực chiến (giữ lại để không vấp)
- Trang tĩnh không tự ghi Base (CORS+token) → bắt buộc qua Worker.
- CLI không xuất được link chia sẻ công khai của Form gốc Lark → dùng Worker thay Form.
- Test `/submit` ngay sau khi set secret có thể báo `auth Lark: invalid param` vì secret chưa propagate → chờ vài giây test lại.
- Tỉ lệ mở > 100% nếu đếm thô → **bắt buộc dedup qua KV**.
- Worker ghi Base bị từ chối → App **chưa là cộng tác viên quyền Sửa** của Base.
- Subdomain không lên trang của mình → còn bản ghi DNS cũ → gỡ trước khi gắn Custom Domain.
- Đo mở email chỉ tính khi app email tải ảnh (Apple Mail Privacy sẽ không tính).
- Số liệu uy tín / testimonial **phải thật**, không bịa.
- Dọn record test khỏi bảng thật sau khi nghiệm thu.

## 7. Liên quan
Các skill con (nếu có trong máy người dùng): research thị trường, lead magnet, leadpage/web dịch vụ, lark-base, email SMTP, content đa kênh. Mọi output theo quy tắc **1 thư mục / 1 kết quả**.

---
*Bản skill bàn giao — sạch bí mật. Đi kèm tài liệu vận hành cho người: xem SOP "Nhà máy phễu" trên Wiki và `phieu-dau-bai.md`.*
