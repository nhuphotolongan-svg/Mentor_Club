---
name: hmh-AIOS-dang-video-youtube
description: >
  Tự động ĐĂNG VIDEO LÊN YOUTUBE (cả video dài & Shorts) theo LỊCH trong Lark Base — không cần
  mở YouTube Studio. Mô hình giống máy đăng ảnh Fanpage: Lark Base là nguồn sự thật → Scheduled Task
  quét mỗi 1 phút → tải video đính kèm → upload resumable lên YouTube (set tiêu đề/mô tả/tags/thumbnail/
  playlist/chế độ công khai) → cập nhật record sang "Đã đăng" + Link video (hoặc "Lỗi" + ghi chú). Đăng
  HEADLESS qua YouTube Data API v3 + OAuth (refresh token sống lâu nhờ app Production). Có lockfile chống
  chạy chồng, tự dừng khi chạm quota. Dùng khi người dùng muốn: đăng video YouTube hẹn giờ, lên lịch đăng
  Shorts/video dài, dựng/sửa tác vụ HMH-YouTube-AutoPost, lấy OAuth YouTube, đăng tay 1 video từ bảng Lark,
  hoặc chuyển giao hệ thống đăng YouTube cho học viên/khách. Kích hoạt khi có từ: đăng video youtube,
  đăng youtube hẹn giờ, lên lịch youtube, đăng shorts, upload youtube tự động, lịch đăng youtube,
  HMH-YouTube-AutoPost, oauth youtube, client_secret youtube, refresh token youtube, đăng video từ lark base.
---

# Skill: Đăng video YouTube hẹn giờ từ Lark Base

Biến một bảng Lark thành **máy đăng YouTube tự động**: kéo video vào bảng, đặt giờ, đến hẹn hệ thống tự
upload lên kênh và ghi Link video ngược lại bảng. Đăng được **cả video dài lẫn Shorts**, chạy nền 24/7
bằng Scheduled Task, **không cần connector claude.ai** (headless qua OAuth của chính chủ kênh).

> Luồng: **Lark Base (video + lịch + metadata) → quét mỗi phút → tải video → upload YouTube Data API v3 → cập nhật Lark Base.**

Hệ thống đang chạy thật của anh Hóa: `output/2026-06-17-dang-video-youtube/` (kênh "Hoàng Minh Hóa",
3490 sub, đã upload thật PASS). Skill này là **bản đóng gói chuyển giao** — bộ script + hướng dẫn để
deploy lại sạch trên máy/khách mới. Xem chi tiết bộ nhớ [[youtube-auto-post]].

---

## Nguồn / chuẩn gốc (Luật 2a)

Grounded từ tài liệu chính thức **YouTube Data API v3** (Google):
- `videos.insert` part `snippet,status` — upload **resumable** (chống đứt mạng), `categoryId` mặc định
  `22` (People & Blogs), `selfDeclaredMadeForKids:false`.
- Chế độ riêng tư chuẩn API: `public` / `unlisted` / `private`; lịch công khai dùng `status.publishAt`
  (ISO time, bắt buộc `privacyStatus=private`).
- **Quota**: mỗi `videos.insert` tốn **1.600 đơn vị**, hạn mặc định **10.000/ngày** → ~6 video/ngày.
  Vượt → cần xin **YouTube API Audit** (Google nâng quota).
- OAuth 2.0 Desktop app + `access_type=offline` + `prompt=consent` để lấy **refresh_token**; đặt app
  **Production** để token không hết hạn 7 ngày (kiểu Testing).
- `#Shorts` trong mô tả + video dọc ≤ 3 phút → YouTube tự xếp là Shorts.

---

## Khi nào dùng / KHÔNG dùng

- **DÙNG:** đăng video/Shorts YouTube theo lịch Lark; đăng ngay 1 video; dựng lại/sửa task
  `HMH-YouTube-AutoPost`; lấy OAuth YouTube lần đầu; chuyển giao máy đăng YouTube cho khách.
- **KHÔNG dùng:** đăng video lên **Fanpage** (→ [[hmh-AIOS-dang-bai-fanpage-hoa]] / [[reel-facebook-poster]]);
  đăng **ảnh** Fanpage hẹn giờ (→ [[hen-gio-dang-anh-fanpage]]); làm **kịch bản/dựng** video
  (→ [[hmh-mkt-shorts-youtube]], [[hmh-mkt-plan-short-video-edit]]). Skill này chỉ ĐĂNG video đã có sẵn.

---

## Tiền điều kiện

| Hạng mục | Giá trị / cách lấy |
|----------|--------------------|
| Lark Base | base_token `TaaEbHJg5aoz2Usw3mQlK9mQgUR` · table `tblpu3bAGohfC4Rt` ("Lịch đăng YouTube"). Đổi cho khách: env `YT_BASE_TOKEN` / `YT_TABLE_ID` trong [scripts/config.js](scripts/config.js) |
| OAuth client | `.secrets/client_secret.json` (OAuth **Desktop app**, dự án bật YouTube Data API v3, app **Production**). Cách tạo click-by-click: [references/huong-dan-tao-oauth-youtube.md](references/huong-dan-tao-oauth-youtube.md) |
| Refresh token | `.secrets/youtube-token.json` — sinh ra bằng `node auth.js` (1 lần). |
| Node | `C:\Program Files\nodejs` (không có sẵn trên PATH — thêm khi chạy). `npm install` trong `scripts/` để có `googleapis`. |
| lark-cli | đã cài & đăng nhập (xem [[lark-cli-setup]]). Gọi `node` trực tiếp vào `run.js` — KHÔNG spawn `.cmd` (EINVAL). |

---

## Bảng Lark "Lịch đăng YouTube" — 12 cột

| Cột | Vai trò | Ai điền |
|-----|---------|---------|
| **Tiêu đề** | Tiêu đề video (≤100 ký tự, tự cắt) | Người đăng |
| Mô tả | Description; Shorts tự thêm `#Shorts` nếu thiếu | // |
| Tags | Phân tách bằng dấu phẩy `,` | // |
| **Video** (đính kèm) | File video cần đăng — BẮT BUỘC | // |
| Thumbnail (đính kèm) | Ảnh đại diện (cần kênh đã xác minh SĐT) | // |
| **Loại** (select) | "Video dài" \| "Shorts" | // |
| Playlist | Playlist ID để thêm video (tùy chọn) | // |
| **Chế độ** (select) | "Công khai" \| "Không công khai" \| "Riêng tư" → `public/unlisted/private` | // |
| **Ngày giờ đăng** | Giờ máy (GMT+7). **Để trống = đăng ngay** lượt quét gần nhất | // |
| **Trạng thái** (select) | "Chờ đăng" → "Đang đăng" → "Đã đăng" / "Lỗi" | Hệ thống |
| Link video | URL video sau khi đăng | Hệ thống |
| Ghi chú lỗi | Nguyên nhân nếu "Lỗi" | Hệ thống |

> Cách dùng hằng ngày: thêm 1 dòng → điền Tiêu đề, kéo Video vào, chọn Loại + Chế độ, đặt Ngày giờ đăng,
> set **Trạng thái = "Chờ đăng"**. Đến giờ Task tự đăng. Lỗi → sửa xong đổi lại "Chờ đăng" để đăng lại.

---

## Quy trình A — CÀI ĐẶT lần đầu (1 lần / mỗi máy)

1. **Tạo OAuth client** theo [references/huong-dan-tao-oauth-youtube.md](references/huong-dan-tao-oauth-youtube.md)
   (Google Cloud → bật YouTube Data API v3 → consent screen **Production** → OAuth **Desktop app** → tải JSON).
   Đổi tên thành `client_secret.json`, bỏ vào `.secrets/`.
2. **Cài thư viện** (lấy `googleapis`):
   ```powershell
   cd "H:\HOÁ TRI THỨC\.claude\skills\hmh-AIOS-dang-video-youtube\scripts"
   npm install
   ```
3. **Lấy refresh token** (mở trình duyệt, đăng nhập ĐÚNG tài khoản kênh; màn hình "chưa xác minh" →
   Advanced → Go to … (unsafe)):
   ```powershell
   node auth.js
   ```
   → in tên kênh đã kết nối + lưu `.secrets/youtube-token.json`.
4. **Đăng ký Task chạy nền mỗi phút** (tự định vị thư mục scripts):
   ```powershell
   powershell -ExecutionPolicy Bypass -File register-task.ps1
   ```

## Quy trình B — ĐĂNG TAY ngay 1 video (kiểm thử / chạy thủ công)

```powershell
cd "H:\HOÁ TRI THỨC\.claude\skills\hmh-AIOS-dang-video-youtube\scripts"
node scan-and-post.js
```
Quét bảng 1 lượt: đăng mọi record "Chờ đăng" đã đến hạn (cũ nhất trước), cập nhật trạng thái + Link.

## Quy trình C — VẬN HÀNH Task

```powershell
Start-ScheduledTask   -TaskName HMH-YouTube-AutoPost   # chạy ngay 1 lần
Disable-ScheduledTask -TaskName HMH-YouTube-AutoPost   # tạm tắt
Enable-ScheduledTask  -TaskName HMH-YouTube-AutoPost   # bật lại
Get-ScheduledTaskInfo -TaskName HMH-YouTube-AutoPost   # xem LastResult (0 = OK)
```
Nhật ký: [scripts/run.log](scripts/) — mỗi lượt ghi "Đang đăng / ĐÃ ĐĂNG / LỖI / chạm quota".

---

## 🍎 macOS (máy Thuần Như / NHƯ Photo) — đã PORT

Bộ này gốc viết cho Windows. Đã port cross-platform và **cài sẵn** tại
`~/.claude/skills/hmh-AIOS-dang-video-youtube/`. Thay đổi so với bản Windows:
- `config.js` tự dò `lark-cli` (env `YT_LARK_JS`), `ROOT` mặc định `~/.nhu-youtube-autopost`, `TMP_DIR` dùng `os.tmpdir()`.
- `auth.js` mở trình duyệt bằng `open` (macOS) thay cho `start`.
- **Thay `register-task.ps1` bằng [scripts/register-task-mac.sh](scripts/register-task-mac.sh)** → tạo LaunchAgent `com.nhu.youtube-autopost` quét mỗi 60 giây.

**Cài đặt trên macOS (4 bước):**
```bash
cd ~/.claude/skills/hmh-AIOS-dang-video-youtube/scripts
npm install --ignore-scripts                 # 1) googleapis (đã chạy sẵn)
# 2) Tạo OAuth Desktop app → client_secret.json bỏ vào ~/.nhu-youtube-autopost/.secrets/
node auth.js                                  # 3) lấy refresh token (login đúng kênh)
bash register-task-mac.sh                     # 4) chạy nền mỗi 60s (LaunchAgent)
```
Đăng tay test 1 lượt: `node scan-and-post.js`. Vận hành LaunchAgent:
```bash
launchctl list | grep com.nhu.youtube-autopost      # trạng thái
launchctl start com.nhu.youtube-autopost            # chạy ngay
launchctl unload ~/Library/LaunchAgents/com.nhu.youtube-autopost.plist   # tạm tắt
launchctl load  -w ~/Library/LaunchAgents/com.nhu.youtube-autopost.plist # bật lại
```
Truyền base/table riêng cho NHƯ Photo: `YT_BASE_TOKEN=... YT_TABLE_ID=... bash register-task-mac.sh`.

> ⚠️ **Scope Lark (bắt buộc trước khi go-live):** app lark-cli hiện thiếu quyền Base.
> Cần cấp cho app các scope `base:record:read`, `base:record:update` (ghi trạng thái/Link),
> và quyền tải đính kèm — đồng thời **thêm app làm cộng tác viên của bảng "Lịch đăng YouTube"**.
> Chưa có scope thì scanner chỉ báo `missing_scope: base:record:read` và không đăng được.

---

## Thành phần (scripts/)

| File | Vai trò |
|------|---------|
| [config.js](scripts/config.js) | base/table/field IDs, đường dẫn secret, scope, map chế độ. Override qua env `YT_ROOT/YT_BASE_TOKEN/YT_TABLE_ID` |
| [auth.js](scripts/auth.js) | **Chạy 1 lần** — OAuth loopback cổng 4119, ép `prompt=consent`, lưu refresh token |
| [youtube.js](scripts/youtube.js) | Upload resumable + thumbnail + playlist; map privacy; tự cắt title 100 ký tự, tags ≤60 |
| [lark.js](scripts/lark.js) | Đọc record (định dạng cột), tải attachment (cwd=destDir), cập nhật record (`+record-upsert`) |
| [scan-and-post.js](scripts/scan-and-post.js) | **Trái tim** — lọc record đến hạn, khóa "Đang đăng", đăng, ghi kết quả; lockfile 30 phút; dừng khi chạm quota |
| [register-task.ps1](scripts/register-task.ps1) | Đăng ký Task `HMH-YouTube-AutoPost` mỗi 1 phút, tự định vị `$PSScriptRoot` |
| [package.json](scripts/package.json) | dependency `googleapis` |

---

## Gotchas (đã gặp & cách xử lý)

- **lark-cli spawn `.cmd` EINVAL** (Node mới): gọi `node` trực tiếp vào
  `…@larksuite\cli\scripts\run.js` (`config.LARK_JS`).
- **`+record-list` định dạng CỘT**: `data.fields[]` (tên cột) ∥ `data.data[][]` (rows) ∥
  `data.record_id_list[]`; field select trả mảng `["x"]` → `rec.sel()` lấy phần tử đầu.
- **`+record-upsert`** payload là map field TRỰC TIẾP, KHÔNG bọc `{fields:…}`; có `--record-id` = update.
- **`+record-download-attachment --output`** từ chối path tuyệt đối ("unsafe output path") → chạy với
  `cwd=destDir` + `--output <tên-file>` (giữ khoảng trắng/tiếng Việt OK).
- **Scheduled Task `RepetitionDuration` = MaxValue** → lỗi XML out-of-range. BỎ `RepetitionDuration`,
  chỉ set `-RepetitionInterval 1 phút`.
- **File .ps1 chứa tiếng Việt** → PowerShell 5.1 parse lỗi (đọc ANSI) → giữ `Write-Host` ASCII.
- **auth.js "Google chưa xác minh"** là BÌNH THƯỜNG (app tự dùng) → Advanced → Go to … (unsafe).
- **Không nhận refresh_token** → thu hồi quyền tại myaccount.google.com/permissions rồi chạy lại
  `node auth.js` (đã ép `prompt=consent`).
- **Quota 10.000/ngày** (~6 video): scanner tự dừng khi gặp lỗi quota/403, để dành lượt sau.
- **Thumbnail tùy chỉnh** cần kênh đã xác minh số điện thoại; nếu fail không chặn upload.
- **Múi giờ**: "Ngày giờ đăng" hiểu theo giờ máy. Để base = GMT+7 cho khớp [[timezone-gmt7-vietnam]].

---

## Output

- Video lên kênh YouTube; **Link video** + **Trạng thái "Đã đăng"** ghi ngược vào bảng Lark.
- Khi chuyển giao khách mới: tạo bảng "Lịch đăng YouTube" (12 cột như trên), lấy OAuth riêng của khách,
  đổi `YT_BASE_TOKEN/YT_TABLE_ID`, chạy Quy trình A. Nâng cấp tri thức tái dùng vào wiki nếu cần.

Liên quan: [[youtube-auto-post]], [[base-mad-crm-index]], [[hen-gio-dang-anh-fanpage]],
[[reel-facebook-poster]], [[lark-cli-setup]], [[scheduled-task-hidden-window]].
