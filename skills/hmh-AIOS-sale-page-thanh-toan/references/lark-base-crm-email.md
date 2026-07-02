# Lark Base — CRM lưu lead + Template email + SMTP

## 1. Tạo Lark Developer App
1. https://open.larksuite.com/ → **Create App → Custom App**.
2. Tên: `<Tên dự án> Backend`.
3. **Permissions** → bật: `bitable:app` (đọc/ghi Base). (Có thể thêm `bitable:app:readonly`.)
4. **Credentials** → lưu **App ID** + **App Secret** (→ `LARK_APP_ID`, `LARK_APP_SECRET`).
5. **Publish** app (tạo Release version) thì quyền mới hiệu lực.

## 2. Bảng `Leads` (CRM)
| Cột | Loại | Ghi chú |
|---|---|---|
| Họ và tên | Text | |
| Số điện thoại | Text | |
| Email | Text | |
| Lĩnh vực kinh doanh | Text | field tuỳ chỉnh — đổi tên thì sửa cả `submit.js` |
| order_id | Text | khoá tra cứu |
| payment_status | Text | `pending` / `paid` |
| Ngày đăng ký | DateTime | tự động (Created time) |

- Lấy **Base Token** từ URL: `larksuite.com/base/<BASE_TOKEN>` → `LARK_BASE_TOKEN`.
- Lấy **Table ID**: API Explorer Lark (list tables) hoặc URL view `?table=<TABLE_ID>` → `LARK_TABLE_ID`.
- ⚠️ **Tên cột trong code phải khớp 100%** với Lark (kể cả dấu). Code dùng: `"Họ và tên"`, `"Số điện thoại"`, `"Email"`, `"Lĩnh vực kinh doanh"`, `order_id`, `payment_status`.

## 3. Bảng `Email Templates` (tuỳ chọn — mentor sửa email không cần đụng code)
| Cột | Ví dụ |
|---|---|
| key | `x3_registration` (khoá tra cứu) |
| subject | `Chào mừng {{name}} đến với Khóa X3!` |
| body | nội dung dài, dùng biến `{{name}}`, `{{industry}}`, `{{order_id}}` |

- Body hỗ trợ markdown nhẹ: `**đậm**`, `- bullet`, dòng trống = ngắt đoạn → `buildHtml()` tự convert HTML đẹp.
- Lấy Table ID bảng này → `LARK_TEMPLATE_TABLE_ID`. Không set thì hệ thống dùng email mặc định.

## 4. Cấp quyền App vào Base
Mở Base → **`...` → Share / Add members** → tìm app vừa tạo → cấp **Editor**. (Không bước này: API trả 91402/permission denied.)

## 5. SMTP gửi mail qua Lark (miễn phí)
- Host `smtp.larksuite.com`, Port `465` (SSL ngầm).
- User = email Lark (`SMTP_USER`, vd `mentor@domain.net`).
- Pass = **Application Password** (`SMTP_PASS`): Lark → **Settings → Security → App Passwords → Create**.
- `lib/smtp.js` mở TCP qua `cloudflare:sockets` (`secureTransport:"on"`) → `AUTH LOGIN` → gửi HTML. Subject có dấu được mã hoá MIME UTF-8.

## 6. Lỗi hay gặp
| Triệu chứng | Nguyên nhân |
|---|---|
| `code 99991663 / token invalid` | sai App ID/Secret hoặc chưa Publish app |
| `permission denied / 91402` | quên cấp Editor app vào Base |
| record không tìm thấy theo order_id | sai `LARK_TABLE_ID` hoặc tên cột `order_id` khác |
| email không tới | sai App Password, hoặc chưa bật App Password trong Lark |
