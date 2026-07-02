---
name: hmh-mkt-research-youtube
description: >
  Research video YouTube theo chủ đề, lọc và xếp hạng theo điều kiện lượt xem (view) cao và số người đăng ký (subscriber) của kênh.
  Dùng YouTube Data API v3 thật (không đoán mò) qua script Node có sẵn, lấy thống kê thực: views, subs, like, comment, tuổi video; tính chỉ số outlier (views/subs), tốc độ view/ngày, tỉ lệ tương tác.
  Dùng khi người dùng muốn tìm video YouTube viral theo chủ đề, phân tích kênh đối thủ, săn chủ đề content đang hút view, tìm video "vượt cỡ kênh", nghiên cứu nội dung trước khi làm video.
  Kích hoạt khi có từ: research youtube, video youtube nhiều view, kênh nhiều sub, chủ đề viral youtube, tìm video theo chủ đề, phân tích youtube, săn trend youtube, video hot youtube, outlier video.
---

# Skill: Research Video YouTube theo View & Sub

Skill này gọi **YouTube Data API v3 thật** để tìm video theo chủ đề, lọc theo điều kiện **lượt xem tối thiểu** và **số người đăng ký kênh**, rồi xếp hạng theo các chỉ số nghiên cứu nội dung. Mọi số liệu là thật, không suy đoán.

## Tài nguyên

- Script: `scripts/yt-research.mjs` — chạy bằng **Node ≥ 18** (đã có `fetch` sẵn, không cần cài package).
- API key: đọc tự động từ `YOUTUBE_API_KEY` trong file `.env` ở thư mục gốc dự án (đã có sẵn). Có thể override bằng `--key`.

## Khi nào dùng

Khi người dùng muốn:
- Tìm video YouTube theo một/nhiều chủ đề, đạt ngưỡng view/sub nhất định.
- Phát hiện **video outlier** (view cao bất thường so với cỡ kênh) → tín hiệu chủ đề đang cộng hưởng.
- Tìm **kênh nhỏ nhưng có video viral** (`--max-subs`) → cơ hội học công thức content dễ sao chép.
- Nghiên cứu đối thủ/ngách trước khi sản xuất nội dung.

---

## Quy trình thực thi

### Bước 1 — Làm rõ đầu vào

Hỏi (hoặc tự suy từ yêu cầu) các thông số:

| Thông số | Ý nghĩa | Mặc định |
|---|---|---|
| **Chủ đề / từ khoá** | Có thể nhiều từ khoá | (bắt buộc) |
| **View tối thiểu** | `--min-views` | 0 |
| **Sub tối thiểu** | `--min-subs` | 0 |
| **Sub tối đa** | `--max-subs` (săn kênh nhỏ viral) | ∞ |
| **Quốc gia / ngôn ngữ** | `--region` / `--lang` | VN / vi |
| **Khoảng thời gian** | `--since` / `--until` (YYYY-MM-DD) | không giới hạn |
| **Số video quét** | `--max` (bội số 50) | 100 |
| **Sắp xếp output** | `--sort` | outlier |

Nếu người dùng chỉ nói "tìm video chủ đề X nhiều view nhiều sub" → đặt ngưỡng hợp lý (vd `--min-views 100000 --min-subs 50000`) và nói rõ ngưỡng đã chọn.

### Bước 2 — Chạy script

Luôn `cd` về thư mục gốc dự án để script tự tìm `.env`. Ví dụ:

```bash
cd "h:/HOÁ TRI THỨC" && node ".claude/skills/hmh-mkt-research-youtube/scripts/yt-research.mjs" \
  --query "kinh doanh online" \
  --min-views 100000 --min-subs 50000 \
  --max 100 --region VN --lang vi \
  --order viewCount --sort outlier \
  --out "output/2026-06-04-yt-kinh-doanh/ket-qua.json"
```

Tìm **nhiều chủ đề** cùng lúc: lặp lại `--query "A" --query "B"`.
Săn **kênh nhỏ viral**: `--min-views 200000 --max-subs 20000`.
Xem trợ giúp đầy đủ: `node ... --help`.

> **Quota:** mỗi trang search tốn 100 đơn vị (quét 100 video = 2 trang = 200), enrich stats ~vài đơn vị. Quota mặc định 10.000/ngày → đủ cho hàng chục lần research. Đừng đặt `--max` quá lớn không cần thiết.

### Bước 3 — Đọc & diễn giải kết quả

Script in ra **bảng markdown** (stdout) và lưu **JSON** (nếu có `--out`). Các cột:

- **Views / Subs** — số thật từ API.
- **Outlier = views / subs** — chỉ số quan trọng nhất cho research nội dung. >5 nghĩa là video kéo view gấp nhiều lần cỡ kênh → **chủ đề/góc tiêu đề này đang thắng**, đáng học theo.
- **V/ngày** — tốc độ tích view (views ÷ tuổi video), lọc bớt video cũ chỉ "tích góp lâu".
- **Eng%** — (like+comment)/view, đo mức tương tác.
- **Tuổi(ngày)** — video mới mà outlier/vpd cao = trend nóng hiện tại.

### Bước 4 — Tổng hợp thành báo cáo

Viết báo cáo gồm:
1. **Top video outlier** — bảng + nhận xét vì sao chúng thắng (góc tiêu đề, hook, format).
2. **Mẫu tiêu đề lặp lại** — các cụm từ/cấu trúc tiêu đề xuất hiện nhiều ở nhóm view cao.
3. **Kênh đáng theo dõi** — kênh xuất hiện nhiều lần / có nhiều outlier.
4. **Khoảng trống & cơ hội** — chủ đề con chưa ai làm tốt.
5. **Đề xuất ý tưởng video** dựa trên dữ liệu thật.

### Bước 5 — Lưu output (BẮT BUỘC theo CLAUDE.md)

- Tạo thư mục `output/YYYY-MM-DD-yt-<chủ-đề>/`.
- Lưu **tất cả** vào đó: file `.json` kết quả thô + file markdown báo cáo chính (`YYYY-MM-DD-yt-<chủ-đề>.md` có frontmatter `type: output`).
- Mở đầu báo cáo ghi lại câu hỏi gốc + các tham số đã dùng (để tái lập).
- Cập nhật `index.md` (mục Output) và ghi 1 dòng vào `log.md`:
  `## [YYYY-MM-DD] query | research youtube: <chủ đề>`
- Nếu tri thức đáng tái dùng (vd "công thức tiêu đề thắng ngành X", "danh sách kênh đối thủ") → nâng cấp thành trang trong `wiki/` và liên kết chéo.

---

## Lưu ý

- **Số liệu phải đến từ script**, không tự bịa view/sub. Nếu script lỗi quota/key, báo rõ cho người dùng.
- `subscriberCount` có thể bị kênh ẩn → hiển thị `—`; video đó vẫn giữ lại (không lọc theo sub).
- API `search` của YouTube giới hạn ~500 kết quả/truy vấn và `viewCount` order đôi khi xấp xỉ — để phủ rộng hơn, dùng nhiều `--query` biến thể từ khoá.
- Muốn so sánh trend theo thời gian, chạy lại với `--since` khác nhau và đối chiếu.
