---
name: dua-skill-len-git
description: Đóng gói một Claude skill (có script chạy được) thành dịch vụ gọi qua HTTP trên GitHub Actions, để nhân bản và chuyển giao cho khách nhanh. Dùng khi cần đưa một skill lên git, tạo workflow trigger HTTP (repository_dispatch), tách secret ra GitHub Secrets, và sinh mẫu HTTP cho Lark Base / Postman / curl.
---

# Đưa Claude skill lên Git → gọi qua HTTP (bàn giao khách)

Biến một skill có **script chạy headless** (Node/Python) thành endpoint gọi qua HTTP:
GitHub Actions chạy script trên cloud, kích hoạt bằng `repository_dispatch`. **Không cần
máy khách bật, không cần Claude Desktop, không cần server riêng.**

## Khi nào dùng
- Khách muốn bấm/hẹn lịch là skill tự chạy mà không phải mở máy.
- Cần nhân bản 1 skill cho nhiều khách, mỗi khách 1 bộ token riêng.
- Nối skill vào automation của Lark Base (action "Gửi yêu cầu HTTP").

## Điều kiện tiên quyết (BẮT BUỘC kiểm tra trước)
Skill phải có **script deterministic chạy không tương tác**:
- ✅ Dùng API trực tiếp (REST + app/tenant token, hoặc API key).
- ❌ KHÔNG dùng công cụ cần đăng nhập tương tác (vd `lark-cli auth login`, OAuth qua
  trình duyệt) — CI không đăng nhập tay được. Nếu skill dùng kiểu này, phải **viết lại
  engine sang REST API + app token** trước (xem ghi chú "lark-cli" cuối file).

## Quy trình 6 bước

### 1. Xác định engine + runtime
Tìm file script chạy được (vd `post-reels-api.js`, `seed_category.py`). Xác định runtime:
- Node → workflow dùng `actions/setup-node`.
- Python → `actions/setup-python` + `pip install <deps>`.

### 2. Tách secret ra biến môi trường (QUAN TRỌNG NHẤT)
Mọi giá trị bí mật **hardcode trong script phải đổi sang đọc từ `env`**, KHÔNG để lộ khi commit.
- Node: `process.env.X || '<default-không-bí-mật>'`; bí mật thì `process.env.X` (không default).
- Python: `os.environ["X"]` cho bí mật; `os.environ.get("X", "<default>")` cho không bí mật.
- Phân loại: **Bí mật** = app_secret, page_token, api_key → GitHub **Secrets** (bắt buộc qua env).
  **Không bí mật** = app_id, base_token, table_id, page_id, url → để default hoặc truyền qua body.
- Thêm guard: thiếu secret → in lỗi rõ ràng + `exit 1`.
- **Verify trước khi commit:** `grep -c "<chuỗi-secret-thật>" <file>` phải ra **0**.

### 3. Tạo workflow GitHub Actions
Copy template trong `templates/` (chọn node hoặc python), sửa:
- `types: [<event_type>]` — tên sự kiện gọi qua HTTP (vd `dang-reel`, `seed-bai-viet`).
- Bước chạy script (đường dẫn tới engine).
- `env:` — map Secrets + cho phép `client_payload.*` ghi đè giá trị không bí mật.
Đặt tại `.github/workflows/<event_type>.yml`.

### 4. Đưa lên Git
```bash
git init -b main                 # nếu chưa phải repo
git config user.email "<email>"; git config user.name "<name>"
git add <đường-dẫn-skill> .github/workflows/<event_type>.yml .gitignore
# CHỈ add file skill + workflow. KHÔNG add dữ liệu riêng tư (raw/, wiki/) hay file
# chứa secret (_app.json, config.local.json, .env).
git commit -m "..."
git remote add origin https://github.com/<user>/<repo>.git   # nếu chưa có
git push -u origin main
```
`.gitignore` nên có: `output/  __pycache__/  *.pyc  .env  node_modules/`.

### 5. Cấu hình Secrets/Variables trên GitHub
Repo → Settings → Secrets and variables → Actions:
- **Secrets:** các giá trị bí mật (app_secret, page_token...).
- **Variables (tùy chọn):** giá trị không bí mật mặc định nếu không truyền qua body.
- Nhiều skill dùng chung 1 app → tái dùng Secret đã có (vd `LARK_APP_SECRET`).

### 6. Sinh mẫu HTTP + nghiệm thu
- **Token gọi:** GitHub PAT **classic**, scope `repo` (fine-grained phải có Contents: RW).
- **Mẫu (curl/Postman/Lark):**
  ```
  POST https://api.github.com/repos/<user>/<repo>/dispatches
  Authorization: Bearer <PAT>
  Accept: application/vnd.github+json
  Content-Type: application/json
  Body: {"event_type":"<event_type>","client_payload":{...}}
  ```
- **Đúng = HTTP 204.** Kiểm tra tab **Actions** → log step → dòng kết quả.
- Test trước bằng `--dry-run` (nếu script hỗ trợ) hoặc chạy khâu rủi ro riêng (vd tải file).

## Bàn giao khách (nhân bản nhanh)
Mỗi khách thường cần bộ token riêng nhưng dùng chung code:
1. Khách fork/dùng chung repo, hoặc bạn tạo repo riêng cho khách.
2. Khách (hoặc bạn) điền **Secrets** riêng của họ → KHÔNG sửa code.
3. Giá trị khác nhau giữa các khách (base_token, table_id, page_id) → truyền qua
   **`client_payload`** trong request của họ, KHÔNG hardcode.
4. Gửi khách: link repo + mẫu HTTP + hướng dẫn lấy PAT/token. Mẫu handoff ở
   `templates/HUONG-DAN-KHACH.md`.

## Bài học quan trọng (đã gặp thực tế)
- **lark-cli không chạy CI:** bản dùng `lark-cli --as user` cần login tương tác → phải
  port sang REST `tenant_access_token` (`/auth/v3/tenant_access_token/internal`). Tải file
  đính kèm: `/drive/v1/medias/{file_token}/download?extra={"bitablePerm":{"tableId":...}}`
  (app phải có quyền Drive).
- **GitHub dispatch KHÔNG đọc query string** — dữ liệu phải nằm trong body `client_payload`.
- **repository_dispatch tối thiểu** cần PAT classic scope `repo` (403 nếu fine-grained thiếu
  Contents: Read and write).
- **Lark Bitable kiểu cột:** DateTime ghi bằng **epoch milliseconds** (số), không phải chuỗi;
  URL/hyperlink ghi dạng `{"link","text"}`; lookup/công thức là chỉ đọc.
- **Cron GitHub Actions** tối thiểu ~5 phút và có thể trễ; cần đúng phút → dùng Lark webhook.
- **Token hết hạn:** FB Page Token ~60 ngày → chỉ cập nhật lại Secret, không sửa code.
- **Bảo mật:** secret từng hardcode/lộ → khuyên khách **rotate** sau khi dựng xong.

## File trong skill
- `templates/workflow-node.yml` — mẫu workflow cho engine Node.
- `templates/workflow-python.yml` — mẫu workflow cho engine Python.
- `templates/HUONG-DAN-KHACH.md` — mẫu hướng dẫn gửi khách.
