# PHIẾU ĐẦU BÀI — Nhà máy phễu

> Điền hết các ô `<...>` rồi đưa cho AI: *"Chạy nhà máy phễu theo phiếu đầu bài này."*
> Phần BÍ MẬT (App Secret, mật khẩu SMTP) **KHÔNG ghi vào đây** — tự nạp bằng `npx wrangler secret put` (xem cuối phiếu).

## 1. Sản phẩm & chiến dịch
- Tên sản phẩm/khóa bán phía sau: `<...>`
- Giá bán: `<...>`
- Link trang bán (LINK_KHOA): `<...>`
- Đối tượng khách (nghề / tuổi / nỗi đau): `<...>`
- Mục tiêu doanh thu/tháng: `<...>`
- Deadline / khai giảng: `<...>`

## 2. Hạ tầng (điền giá trị KHÔNG bí mật)
- Subdomain dùng cho chiến dịch: `<khoa1.ten-mien-cua-ban.com>`  (đã trên Cloudflare & đang rảnh? `<có/chưa>`)
- Lark Base token (Base của bạn): `<...>`
- Lark **App ID**: `cli_<...>`   *(App Secret nạp dạng secret, không ghi ở đây)*
- Hộp thư gửi (SMTP_USER): `<hello@ten-mien-cua-ban.com>`
- Tên hiển thị email (FROM_NAME): `<...>`
- KV namespace id (cho đo mở, tạo bằng `npx wrangler kv namespace create OPENS`): `<...>`
- Link nhóm Zalo (ZALO_LINK): `https://zalo.me/g/<...>`

## 3. Thương hiệu & nội dung
- Ảnh chân dung người dạy/thương hiệu: `<đường dẫn>`
- Testimonial THẬT (đã xin phép dùng tên/ảnh): `<...>`
- Con số uy tín THẬT (số học viên/khách): `<...>`
- Pháp nhân + liên hệ footer + link Chính sách bảo mật: `<...>`
- Giọng văn mẫu / quy tắc đặt tên thương hiệu (nếu có): `<...>`

## 4. Cấu hình chạy
- Chế độ: `<bán tự động (3 chốt) / tự động hoàn toàn>`
- Nền leadpage: `<HTML host Cloudflare / Ladipage>`
- Giờ cron gửi nurture: `<vd 08:00 VN>`

---
## Bí mật — tự nạp bằng lệnh (KHÔNG dán vào chat/phiếu)
```
npx wrangler secret put LARK_APP_SECRET
npx wrangler secret put SMTP_PASS
# và các secret còn lại: LARK_APP_ID, SMTP_USER, FROM_NAME, ZALO_LINK, LINK_KHOA
```
