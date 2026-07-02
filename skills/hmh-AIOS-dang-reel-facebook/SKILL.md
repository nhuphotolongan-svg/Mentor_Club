---
name: hmh-AIOS-dang-reel-facebook
description: >
  Tự động ĐĂNG VIDEO REEL LÊN FACEBOOK PAGE theo LỊCH trong Lark Base — không cần mở Facebook,
  không qua Anycross (nên không dính trần dung lượng video). Mô hình giống máy đăng ảnh Fanpage:
  Lark Base là nguồn sự thật → LaunchAgent quét mỗi 2 phút → tải video đính kèm về máy → upload
  phân mảnh (3 pha) lên FB Graph API video_reels → cập nhật record sang "Đã đăng" + Link Reel
  (hoặc "Lỗi" + ghi chú vào Log). Đăng HEADLESS qua Page Access Token dài hạn (~60 ngày). Có
  lockfile chống chạy chồng, cổng "Lịch đăng" (hẹn giờ), tự thử lại lỗi tạm thời, phân loại lỗi
  vĩnh viễn vs tạm thời. Bản macOS dùng LaunchAgent (kèm bộ cài Windows gốc để chuyển giao học viên
  Windows). Dùng khi người dùng muốn: đăng Reel Facebook hẹn giờ, lên lịch đăng Reel, đăng tay 1
  Reel từ bảng Lark, dựng/sửa tác vụ tự đăng Reel, đổi token Facebook, hoặc chuyển giao hệ thống
  đăng Reel cho học viên/khách. Kích hoạt khi có từ: đăng reel facebook, đăng reel hẹn giờ, lên lịch
  reel, tự động đăng reel, máy đăng reel, post reel facebook, FB video_reels, page access token reel,
  đăng reel từ lark base, HOA Dang Reel, đổi token facebook reel.
---

# Skill: Đăng video Reel Facebook hẹn giờ từ Lark Base

Biến một bảng Lark thành **máy đăng Reel tự động**: kéo video vào bảng, đặt giờ, đến hẹn hệ thống tự
upload lên Facebook Page và ghi **Link Reel** ngược lại bảng. Chạy nền 24/7 bằng LaunchAgent (macOS)
hoặc Scheduled Task (Windows), **headless** qua Page Access Token — không cần connector claude.ai.

> Luồng: **Lark Base (video + lịch + caption) → quét mỗi 2 phút → tải video → FB Graph `video_reels` (3 pha) → cập nhật Lark Base.**

Đây là **bản đóng gói chuyển giao** của anh Hóa (mentor). Bản gốc là bộ cài Windows (`.bat`/`.ps1`/`.vbs`);
skill này **đã port sang macOS** (LaunchAgent thay Task Scheduler). Xem bộ nhớ [[reel-facebook-system]]
và anh em [[youtube-auto-post]] (cùng kiến trúc).

---

## Nguồn / chuẩn gốc (Luật 2a)

Grounded từ **Facebook Graph API — Video Reels** (Meta):
- Upload Reel **3 pha**: `upload_phase=start` (lấy `video_id` + `upload_url`) → upload binary
  (header `Authorization: OAuth <token>`, `offset`, `file_size`) → `upload_phase=finish`
  (`video_state=PUBLISHED`, `description`).
- Lấy permalink: poll `GET /{video_id}?fields=status,permalink_url` tới khi `ready/PUBLISHED`.
- Quyền token: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`. **Page Access
  Token dài hạn** hết hạn ~60 ngày → tới hạn dán token mới vào `config.local.json`.
- Yêu cầu video Reel: MP4 **dọc 9:16**, dài **3–90 giây**.

---

## Khi nào dùng / KHÔNG dùng

- **DÙNG:** đăng Reel Facebook theo lịch Lark; đăng ngay 1 Reel; dựng lại/sửa LaunchAgent quét Base;
  đổi token Facebook; chuyển giao máy đăng Reel cho khách (Windows hoặc macOS).
- **KHÔNG dùng:** đăng **video YouTube/Shorts** (→ [[hmh-AIOS-dang-video-youtube]]); đăng **ảnh**
  Fanpage hẹn giờ; **dựng/cắt** video. Skill này chỉ ĐĂNG Reel đã có sẵn trong bảng.

---

## Tiền điều kiện

| Hạng mục | Giá trị / cách lấy |
|----------|--------------------|
| Lark App dùng chung | `cli_a736cbaaa63bd010` ("ADS → LARK") — đã có scope base + drive. Nạp qua `lark-cli` đã đăng nhập sẵn trên máy này (`lark-cli --version` = 1.0.47 OK). |
| Lark Base | `BASE_TOKEN` + `TABLE_ID` lấy từ link Base `https://.../base/<token>?table=<tblXXX>`. Base mẫu mentor: `Ahs4bAY2ZaUc6jscpykl4Vynglb`. |
| Facebook | `FB_PAGE_ID` + `FB_PAGE_TOKEN` (Page Access Token dài hạn) — admin cấp cho từng page. |
| Toolchain | Node (`node -v`) + `lark-cli` đã `auth login`. Cả hai đã có sẵn trên máy. |

Điền 4 trường vào [scripts/config.local.json](scripts/config.local.json) trước khi go-live.

---

## Cấu trúc bảng Lark (đúng tên field)

| Field | Vai trò |
|-------|---------|
| **TT Reel** (single select) | Cổng kích hoạt: `Chờ đăng` = đăng · `Đã đăng` · `Lỗi` |
| **Ảnh/video** (attachment) | Video MP4 dọc 9:16, 3–90s |
| **Nội dung** (text) | Caption |
| **Hastag** (text) | Hashtag, nối sau caption |
| **Lịch đăng** (datetime) | Hẹn giờ; để trống = đăng ngay |
| **Link Reel** (text) | Hệ thống ghi permalink sau khi đăng |
| **Log đăng Reel** (text) | Hệ thống ghi kết quả / lý do lỗi / số lần RETRY |

> Đổi tên field cho khách: sửa object `F` đầu [scripts/post-reels.js](scripts/post-reels.js).

---

## Quy trình deploy macOS (go-live)

```bash
cd ~/.claude/skills/hmh-AIOS-dang-reel-facebook/scripts

# 1. Đảm bảo lark-cli đã đăng nhập (1 lần / máy)
lark-cli auth login --recommend          # nếu chưa đăng nhập

# 2. Điền config: BASE_TOKEN, TABLE_ID, FB_PAGE_ID, FB_PAGE_TOKEN
#    (mở config.local.json, dán 4 giá trị)

# 3. Chạy thử KHÔNG đăng thật (kiểm tra đọc Base + đếm dòng "Chờ đăng")
node post-reels.js --dry-run

# 4. Đăng thật 1 lượt
node post-reels.js

# 5. Bật chạy nền mỗi 2 phút (LaunchAgent)
bash register-task-mac.sh
```

Quản lý agent:
```bash
launchctl start  com.nhu.reel-facebook-autopost   # chạy ngay
launchctl list | grep reel-facebook               # trạng thái
launchctl unload ~/Library/LaunchAgents/com.nhu.reel-facebook-autopost.plist  # tắt
```
Log chạy: `logs/run.log`.

---

## Vận hành (mỗi ngày)

Trong Base: đính video vào **Ảnh/video**, viết **Nội dung** (+ **Hastag**), chọn **Lịch đăng** (nếu
hẹn giờ), đặt **TT Reel = `Chờ đăng`**. Trong ~2 phút (hoặc đúng giờ hẹn) máy tự đăng, đổi
**TT Reel → `Đã đăng`** và điền **Link Reel**. Lỗi → **TT Reel → `Lỗi`**, lý do ở **Log đăng Reel**.
Máy phải đang bật (không cần đăng nhập màn hình).

## Xử lý lỗi thường gặp

| Hiện tượng | Xử lý |
|---|---|
| Log ghi `OAuthException / code 190 / token expired` | Token FB hết hạn (~60 ngày) → dán token mới vào `config.local.json` (mục `FB_PAGE_TOKEN`). |
| Lỗi định dạng / độ dài | Cắt video 3–90s, xuất MP4 dọc 9:16, đăng lại. |
| `Chờ đăng` mà không lên | Chưa tới **Lịch đăng**, hoặc máy/agent đang tắt (`launchctl list \| grep reel-facebook`). |
| Đăng lại 1 bài | Đặt lại **TT Reel = Chờ đăng**. |

Lỗi **tạm thời** (mạng/FB 5xx) tự thử lại tới `MAX_RETRY` (mặc định 3), giữ `Chờ đăng`. Lỗi
**vĩnh viễn** (token/định dạng/độ dài) → chuyển `Lỗi` ngay, không thử lại.

---

## Chuyển giao học viên

- **Học viên macOS:** copy thư mục `scripts/` (trừ `windows/`), điền config, chạy `register-task-mac.sh`.
- **Học viên Windows:** dùng nguyên bộ cài gốc trong [scripts/windows/](scripts/windows/) — bấm đúp
  `CAI-DAT.bat`. ⚠️ ADMIN điền `APP_SECRET` vào `windows/_app.json` trước khi gửi (file nhạy cảm,
  không public).
- Hướng dẫn chi tiết: [references/huong-dan-hoc-vien.md](references/huong-dan-hoc-vien.md) (học viên),
  [references/readme-admin.md](references/readme-admin.md) (admin).

---

## Giới hạn đã biết
- Phương án **quét ẩn** (ngó Base mỗi 2 phút), không phải event-driven — tạo automation Lark qua API
  trên base lớn bị timeout; nếu cần realtime, tạo automation thủ công trong Base UI.
- Mỗi khách 1 máy + 1 Base + 1 token riêng. Không dùng chung token giữa các page khác nhau.
- Bản port macOS thay Task Scheduler bằng LaunchAgent; logic đăng (`post-reels.js`) giữ nguyên bản gốc.
