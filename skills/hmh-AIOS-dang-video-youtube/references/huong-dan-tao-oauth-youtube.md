---
type: output
title: Hướng dẫn click-by-click tạo OAuth YouTube (mở cổng đăng video)
created: 2026-06-17
tags: [youtube, oauth, google-cloud, huong-dan, dang-video]
sources: []
---

# Hướng dẫn tạo "chìa khoá" để Claude đăng video lên YouTube

> Câu hỏi gốc: "chưa biết làm mở cổng YouTube tạo OAuth — hướng dẫn từng bước."

Mục tiêu: lấy được **1 file `client_secret.json`** đưa cho hệ thống. Làm **1 lần duy nhất**, xong dùng mãi mãi.
Toàn bộ mất khoảng **10–15 phút**. Anh chỉ cần 1 trình duyệt + tài khoản Google **đang sở hữu kênh YouTube** muốn đăng.

⚠️ QUAN TRỌNG: Suốt quá trình, hãy **đăng nhập đúng tài khoản Google của kênh YouTube** anh muốn đăng video. Nếu Chrome đang nhiều tài khoản, nên mở **cửa sổ ẩn danh** rồi đăng nhập đúng 1 tài khoản cho chắc.

---

## BƯỚC 1 — Tạo "dự án" trên Google Cloud (3 phút)

1. Mở: **https://console.cloud.google.com/**
2. Lần đầu vào sẽ hỏi đồng ý điều khoản → tick đồng ý → **Agree and Continue**.
3. Trên thanh trên cùng, bấm vào ô **chọn dự án** (cạnh chữ "Google Cloud", thường ghi "Select a project").
4. Cửa sổ hiện ra → bấm **NEW PROJECT** (góc trên phải).
5. Đặt tên dự án, ví dụ: `Dang Video YouTube` → bấm **CREATE**.
6. Đợi ~10 giây. Khi xong, bấm lại ô chọn dự án và **chọn đúng dự án vừa tạo** (góc trên phải phải hiện tên dự án này thì mới đúng).

✅ Xong bước 1 khi: góc trên cùng đang hiển thị tên dự án `Dang Video YouTube`.

---

## BƯỚC 2 — Bật "YouTube Data API v3" (2 phút)

API này là cái cho phép phần mềm tải video lên kênh.

1. Mở thẳng link (đảm bảo đang ở đúng dự án): **https://console.cloud.google.com/apis/library/youtube.googleapis.com**
2. Trang "YouTube Data API v3" hiện ra → bấm nút xanh **ENABLE** (Bật).
3. Đợi vài giây cho nó bật xong.

✅ Xong bước 2 khi: nút đổi từ "ENABLE" thành "MANAGE" (Quản lý).

---

## BƯỚC 3 — Khai báo "màn hình xin quyền" (OAuth consent screen) (5 phút)

Đây là phần khai báo ứng dụng để Google biết ai đang xin quyền.

1. Mở: **https://console.cloud.google.com/auth/overview**
   (Hoặc menu trái ☰ → **APIs & Services** → **OAuth consent screen** / **Google Auth Platform**.)
2. Nếu lần đầu, bấm **GET STARTED** (Bắt đầu).
3. Điền các ô:
   - **App name** (Tên ứng dụng): `Dang Video YouTube` (gõ gì cũng được).
   - **User support email**: chọn email của anh trong danh sách.
4. Bấm **NEXT**. Phần **Audience** (Đối tượng): chọn **External** (Bên ngoài) → **NEXT**.
5. Phần **Contact Information**: nhập lại email của anh → **NEXT**.
6. Tick đồng ý điều khoản → bấm **CREATE** / **Continue**.

### 3b. ĐẶT SANG CHẾ ĐỘ "PRODUCTION" — RẤT QUAN TRỌNG ⚠️

Đây là mẹo tránh lỗi "7 ngày phải đăng nhập lại". Nếu để chế độ "Testing", chìa khoá hết hạn sau 7 ngày — rất phiền.

1. Vẫn ở trang **Google Auth Platform**, vào mục **Audience** (menu trái).
2. Tìm phần **Publishing status** (Trạng thái xuất bản). Nếu đang là **Testing**:
   - Bấm **PUBLISH APP** (Xuất bản ứng dụng) → xác nhận **CONFIRM**.
   - Trạng thái đổi thành **In production**. ✅
3. *(Google có thể nói cần "xác minh" — KHÔNG SAO. Vì mình tự dùng cho kênh của mình, lát nữa khi đăng nhập sẽ có 1 màn hình cảnh báo "chưa xác minh", chỉ cần bấm "Advanced → Go to ... (unsafe)" để vào. Hoàn toàn an toàn vì đây là app của chính anh.)*

✅ Xong bước 3 khi: Publishing status = **In production**.

---

## BƯỚC 4 — Tạo "chìa khoá" OAuth Client (Desktop) (3 phút)

1. Mở: **https://console.cloud.google.com/auth/clients**
   (Hoặc menu trái → **APIs & Services** → **Credentials**.)
2. Bấm **+ CREATE CREDENTIALS** (trên cùng) → chọn **OAuth client ID**.
3. Ô **Application type** (Loại ứng dụng): chọn **Desktop app** (Ứng dụng máy tính).
   - ⚠️ Phải chọn đúng **Desktop app**, KHÔNG chọn Web application.
4. **Name**: gõ `Desktop YouTube Uploader` (tên gì cũng được).
5. Bấm **CREATE**.
6. Hiện cửa sổ "OAuth client created" → bấm **DOWNLOAD JSON** (Tải JSON).
   - File tải về tên dạng `client_secret_xxxxxxx.json`.

✅ Xong bước 4 khi: anh có 1 file `.json` trong thư mục Downloads.

---

## BƯỚC 5 — Giao file cho hệ thống (1 phút)

1. Đổi tên file vừa tải thành: **`client_secret.json`**
2. Copy nó vào thư mục: `H:\HOÁ TRI THỨC\.secrets\`
3. Nhắn cho em: **"đã để client_secret.json vào .secrets rồi"**

Sau đó em sẽ:
- Chạy script đăng nhập 1 lần → mở trình duyệt → anh bấm cho phép (đúng tài khoản kênh) → hệ thống lấy được "vé thông hành" (refresh token) và lưu vào `.secrets\youtube.env`.
- Từ đó hệ thống tự đăng video, **không cần đăng nhập lại nữa**.

---

## Tóm tắt 5 bước (in ra dán màn hình)

| Bước | Làm gì | Link nhanh |
|---|---|---|
| 1 | Tạo project | console.cloud.google.com |
| 2 | Bật YouTube Data API v3 | .../apis/library/youtube.googleapis.com |
| 3 | Khai báo consent + đặt **Production** | .../auth/overview |
| 4 | Tạo **OAuth client → Desktop app** → tải JSON | .../auth/clients |
| 5 | Đổi tên `client_secret.json` → bỏ vào `.secrets\` | (trên máy) |

---

## Câu hỏi thường gặp

**"Google bắt xác minh ứng dụng, tôi có cần làm không?"**
→ Không, với mục đích tự đăng cho kênh của mình. Khi đăng nhập gặp màn hình "Google hasn't verified this app", bấm **Advanced** → **Go to Dang Video YouTube (unsafe)** → tiếp tục. An toàn vì là app của chính anh.

**"Tôi có nhiều kênh / Brand Account thì sao?"**
→ Đăng nhập tài khoản Google sở hữu kênh đó. Khi cho phép quyền, Google sẽ hỏi chọn kênh nào (nếu có Brand Account). Chọn đúng kênh muốn đăng.

**"Mỗi ngày đăng được bao nhiêu?"**
→ Mặc định ~6 video/ngày (gộp cả video dài + Shorts). Cần nhiều hơn thì xin Google nâng quota (em hỗ trợ sau).

**"File client_secret.json có phải mật khẩu không?"**
→ Coi như chìa khoá nhà — đừng đăng công khai/gửi cho người lạ. Để yên trong `.secrets\` là an toàn.
