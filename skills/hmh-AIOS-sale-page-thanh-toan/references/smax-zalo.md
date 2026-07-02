# Smax.ai — Thông báo Zalo cho mentor khi có đơn

> Tuỳ chọn. Bỏ qua cả nhóm biến `SMAX_*` thì hệ thống vẫn chạy đủ (chỉ thiếu ping Zalo).

## Smax.ai là gì
Nền tảng automation **Zalo cá nhân** — gửi tin nhắn Zalo tự động **không cần Zalo OA**.

## Cấu hình
1. Đăng ký https://smax.ai → kết nối Zalo cá nhân của mentor.
2. Tạo **Bot Trigger** mới:
   - Loại: **API Trigger**.
   - Hành động: Gửi tin nhắn đến **chính mình** (mentor).
   - Template: `Đơn mới! {{name}} ({{phone}}) - {{industry}} - Mã: {{order_id}}`.
3. Lấy **Trigger URL** + **Bearer Token**.

## 4 biến cần lấy (→ secrets)
| Biến | Lấy ở đâu |
|---|---|
| `SMAX_TRIGGER_URL` | `https://api.smax.ai/public/bizs/<slug>/triggers/<id>` |
| `SMAX_TOKEN` | Smax.ai → API Settings (Bearer Token) |
| `SMAX_CUSTOMER_PID` | URL khi vào nhắn tin: `pid=zlwXXXXXXX` |
| `SMAX_PAGE_ID` | URL kênh Zalo cá nhân: `/messaging/pages/<PAGE_ID>/` |

## Cấu trúc request (đã code sẵn trong `lib/smax.js`)
```js
POST <SMAX_TRIGGER_URL>
Headers: { Authorization: "Bearer <SMAX_TOKEN>", "Content-Type": "application/json" }
Body: {
  customer: { id: <SMAX_CUSTOMER_PID>, page_id: <SMAX_PAGE_ID> },
  attrs: [
    { name: "name",     value: ... },
    { name: "phone",    value: ... },
    { name: "industry", value: ... },
    { name: "order_id", value: ... }
  ]
}
```
Gọi trong `payment-callback.js` ở bước nền (`waitUntil`) sau khi đơn đã `paid`.
