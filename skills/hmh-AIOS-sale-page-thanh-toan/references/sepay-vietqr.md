# Sepay + VietQR — Nhận tiền & xác nhận tự động

## 1. order_id là "khoá" của cả hệ thống
- Format: **`X3` + 8 chữ số** (vd `X312345678`).
- Regex match trong nội dung CK: `/X3\d{8}/i`.
- Sinh ở `/api/submit` (`"X3" + 8 số ngẫu nhiên`), lưu vào Lark cột `order_id`.
- Khách **bắt buộc** chuyển khoản đúng nội dung = order_id → VietQR đã điền sẵn nên khách không phải gõ tay.

## 2. VietQR — QR động có sẵn số tiền + nội dung
```
https://img.vietqr.io/image/<BANK_CODE>-<SO_TK>-compact2.png
    ?amount=<SO_TIEN>
    &addInfo=<ORDER_ID>
    &accountName=<TEN_CHU_TK_URLENCODED>
```
- `BANK_CODE`: mã ngân hàng VietQR (MB, VCB, TCB, ACB, BIDV, VPB…). Tra tại napas/vietqr.
- `accountName`: viết **HOA, không dấu** (tên đăng ký ngân hàng).
- Trang `/thanh-toan/` tự ghép URL này từ query `?order=` → render `<img>`.

## 3. Webhook Sepay
1. https://sepay.vn → đăng ký → thêm tài khoản ngân hàng (MB/VCB/TCB…).
2. **Webhooks → Thêm webhook:**
   - URL: `https://<domain>/api/payment-callback`
   - Method: `POST`
   - Event: **Biến động số dư mới** (có tiền vào).
   - API Key: dán đúng giá trị `SEPAY_API_KEY` (đã sinh bởi scaffold, nằm trong `SECRETS.local.txt`).
3. Sepay gửi header `Authorization: Apikey <SEPAY_API_KEY>` → callback verify khớp mới xử lý.

## 4. Payload Sepay (các field hay dùng)
| Field | Ý nghĩa |
|---|---|
| `transferType` | `"in"` = tiền vào (chỉ xử lý cái này) |
| `transferAmount` | số tiền |
| `content` / `description` | nội dung CK — chứa order_id |
| `referenceCode` / `code` | mã tham chiếu giao dịch |

`payment-callback.js` gộp `content + description + code` rồi match regex → lấy order_id.

## 5. Idempotency (chống xử lý trùng)
- Trước khi cập nhật: đọc record, nếu `payment_status === "paid"` → **bỏ qua** (Sepay có thể gửi lại).
- Chỉ cập nhật `paid` **một lần**, rồi mới bắn email/Zalo.

## 6. Test thật
- Chuyển khoản **1.000đ** với nội dung = một order_id test đang `pending`.
- Xem Cloudflare Dashboard → project → **Functions → Real-time Logs** để soi callback.
- Kỳ vọng: record sang `paid` → trang `/thanh-toan/` (đang poll) tự hiện màn thành công.
