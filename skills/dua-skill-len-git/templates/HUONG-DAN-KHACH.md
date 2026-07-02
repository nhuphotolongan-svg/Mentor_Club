# Hướng dẫn sử dụng (gửi khách)

Hệ thống chạy trên GitHub — **bạn không cần bật máy hay mở app**. Gọi 1 request HTTP là nó tự chạy.

## 1. Chuẩn bị token GitHub (PAT)
- Vào https://github.com/settings/tokens → **Generate new token (classic)**.
- Tích scope **`repo`** → Generate → copy chuỗi `ghp_...` (chỉ hiện 1 lần).

## 2. Khai báo token riêng của bạn
Repo → **Settings → Secrets and variables → Actions → New repository secret**. Thêm các secret:
| Tên | Giá trị bạn được cấp |
|---|---|
| `APP_SECRET` | _(điền)_ |
| `API_TOKEN` / `FB_PAGE_TOKEN` | _(điền)_ |

> Token là bí mật — không chia sẻ, không dán vào chat công khai.

## 3. Gọi chạy (HTTP)
Thay `<USER>/<REPO>`, `<PAT>`, và `<EVENT_TYPE>`:
```bash
curl -i -X POST https://api.github.com/repos/<USER>/<REPO>/dispatches \
  -H "Authorization: Bearer <PAT>" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"<EVENT_TYPE>","client_payload":{}}'
```
- Trả về **204** = đã nhận lệnh.
- Dán đúng request này vào action **"Gửi yêu cầu HTTP"** của Lark Base để tự động hóa.

## 4. Xem kết quả / log
Repo → tab **Actions** → bấm lần chạy mới nhất → mở step để xem log (`✔` thành công, `✖` lỗi).

## Lưu ý
- **Token hết hạn** (vd Facebook ~60 ngày): chỉ cần cập nhật lại Secret tương ứng, không sửa gì khác.
- Gặp lỗi đỏ trong Actions: mở step lỗi, copy dòng `Error:` gửi lại để được hỗ trợ.
