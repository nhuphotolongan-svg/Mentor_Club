---
name: hmh-mkt-web-dich-vu
description: >
  Dựng WEBSITE NGÀNH DỊCH VỤ chuẩn chuyển đổi (không chỉ đẹp — mà RA KHÁCH) từ một đầu bài doanh
  nghiệp: tên · ngành · dịch vụ · khách + nỗi đau · USP · cam kết · SĐT. Sinh ra 1 file index.html
  tự chứa, responsive, mobile-first theo blueprint 10 khối dẫn mắt (Hero → Nỗi đau → Offer đóng khung
  giá trị → Vì sao chọn → Bằng chứng → Quy trình → Đảo ngược rủi ro → FAQ → CTA → Liên hệ). Tri thức
  nền chắt từ guru web thế giới: Alex Hormozi (Phương trình Giá trị), Ran Segall/Flux (quy trình + định
  giá theo giá trị), Michał Malewicz (phân cấp > cái đẹp), Payton Clark Smith (đóng gói dịch vụ web local).
  Có script scaffold.mjs sinh khung + brief.json. Sau khi dựng xong, đưa web lên mạng bằng skill anh em
  hmh-AIOS-deploy-cloudflare. Dùng khi người dùng muốn: làm landing/website cho spa, thẩm mỹ, nha khoa,
  luật, kế toán, xây dựng, coaching, agency, BĐS dịch vụ, sửa chữa, studio chụp ảnh…; cần trang ra khách;
  đóng gói dịch vụ làm web đi bán cho khách. Kích hoạt khi có từ: dựng website dịch vụ, làm web bán hàng,
  landing page dịch vụ, web chuẩn chuyển đổi, web ra khách, scaffold web, trang dịch vụ, web spa/nha khoa,
  mkt-web-dich-vu, làm web cho khách.
---

# Skill: Dựng Website Ngành Dịch Vụ (chuẩn chuyển đổi)

Biến đầu bài một doanh nghiệp dịch vụ thành **một website hoàn chỉnh, hiện đại, tối ưu chuyển đổi** — đứng trên vai các guru web design hàng đầu thế giới. Mục tiêu không phải "trang web đẹp" mà là **trang web ra khách**.

> Skill này lo phần **DỰNG** web (ra `index.html`). Khi cần đưa lên mạng + gắn tên miền → chuyển sang `hmh-AIOS-deploy-cloudflare`.

---

## 1. Triết lý gốc & Nguồn (đứng trên vai người khổng lồ)

Tri thức nền chắt từ research thật — chi tiết + trích dẫn ở `references/tri-thuc-guru.md`. 5 trụ cột:

- **Alex Hormozi — Phương trình Giá trị.** Mọi headline/offer phải tối đa (Kết quả mơ ước × Khả năng tin đạt được) và tối thiểu (Thời gian chờ × Công sức bỏ ra); luôn có **đảo ngược rủi ro** (bảo hành/cam kết). Nguồn: *$100M Offers*.
- **Ran Segall / Flux Academy — Quy trình & định giá theo giá trị.** Web design = trò chuyện → chiến lược → art direction → dựng → launch; nắm chắc 4 nền tảng: phân cấp, màu, chữ, bố cục. Định giá theo tầng giá trị (brochure / thu lead / cỗ máy chuyển đổi).
- **Michał Malewicz — Phân cấp quan trọng hơn cái đẹp.** "Đẹp ≠ chuyển đổi". Thiết kế bằng *hierarchy strips*, mỗi khối một tiêu điểm, dẫn mắt theo thứ tự đọc.
- **Cấu trúc web dịch vụ chuẩn.** Trang chủ nói rõ *làm gì – cho ai – kết quả gì* trong 5 giây; niềm tin là tiền tệ (testimonial/kết quả/badge); 1 CTA rõ mỗi trang; liên hệ phải dễ (click-to-call, map, giờ làm); **mobile-first** (>60% traffic local từ điện thoại).
- **Payton Clark Smith — Đóng gói dịch vụ web cho doanh nghiệp địa phương.** SEO bám sẵn từ đầu; gói hoá dịch vụ; bán kèm hợp đồng bảo trì.

---

## 2. Khi nào dùng / KHÔNG dùng

**Dùng khi:** làm website/landing cho một doanh nghiệp dịch vụ (spa, thẩm mỹ, luật, kế toán, xây dựng, nha khoa, coaching, agency, BĐS dịch vụ, sửa chữa, giáo dục, studio chụp ảnh…); cần trang ra khách chứ không chỉ đẹp; đóng gói dịch vụ làm web đi bán.

**KHÔNG dùng (chuyển skill khác):**
- Landing phễu bán một sản phẩm/khoá học → `nha-may-pheu` (leadpage + nurture).
- Bài blog chuẩn SEO / đăng WordPress → `viet-bai-seo-chuan`.
- E-commerce nhiều SKU (giỏ hàng, thanh toán) → cân nhắc WordPress/Shopify; skill này chỉ lo marketing site.

---

## 3. Tiền điều kiện

- **Node ≥ 18** để chạy `scaffold.mjs`. Trên máy này Node qua nvm: `~/.nvm/versions/node/v24.16.0/bin/node` (nếu `node` không có trên PATH, gọi bằng đường dẫn đầy đủ hoặc `source ~/.nvm/nvm.sh`).
- Bản HTML tự chứa — **không cần API/auth gì thêm**.
- Xem trước: mở `index.html` bằng trình duyệt là đủ.

---

## 4. Quy trình thực thi

### Bước 1 — Lấy đầu bài (brief)
Hỏi (hoặc suy từ yêu cầu) tối thiểu các trường sau, rồi lưu thành `brief.json`:

| Trường | Ý nghĩa | Bắt buộc |
|---|---|---|
| `ten` | Tên doanh nghiệp/thương hiệu | ✅ |
| `nganh` | Ngành dịch vụ (vd "nha khoa thẩm mỹ") | ✅ |
| `dich_vu[]` | Danh sách dịch vụ chính (mỗi cái → 1 khối) | ✅ |
| `khach_hang` | Khách mục tiêu + nỗi đau lớn nhất | ✅ |
| `usp` | Khác biệt / lý do chọn (proof "khả năng đạt được") | nên có |
| `ket_qua` | Kết quả mơ ước khách muốn (Dream Outcome) | nên có |
| `cta` | Hành động mong muốn (gọi/đặt lịch/để SĐT) | ✅ |
| `lien_he` | SĐT (click-to-call), địa chỉ, giờ làm, map | ✅ |
| `proof` | Testimonial, số liệu, logo, chứng nhận | nên có |
| `bao_hanh` | Cam kết/đảm bảo (đảo ngược rủi ro) | nên có |
| `thuong_hieu` | Màu chủ đạo, tông giọng, logo | tùy |

### Bước 2 — Soạn kiến trúc trang theo blueprint
Đọc `references/blueprint-trang-dich-vu.md`. Mặc định trang chủ gồm **10 khối** theo đúng thứ tự dẫn mắt + value-framing:
Hero → Nỗi đau → Dịch vụ/Offer → Vì sao chọn → Bằng chứng xã hội → Quy trình 3–4 bước → Đảo ngược rủi ro → FAQ → CTA cuối → Liên hệ.

### Bước 3 — Scaffold khung dự án
```bash
node ~/.claude/skills/hmh-mkt-web-dich-vu/scripts/scaffold.mjs --brief "đường-dẫn/brief.json"
# hoặc nhanh:
node ~/.claude/skills/hmh-mkt-web-dich-vu/scripts/scaffold.mjs \
  --ten "Nha khoa ABC" --slug "nha-khoa-abc" --mau "#0E7C7B" --sdt "0978276815" --nganh "nha khoa thẩm mỹ"
```
→ sinh `output/YYYY-MM-DD-web-<slug>/index.html` (khung 10 khối, đã wiring sẵn) + copy `brief.json`.

### Bước 4 — VIẾT NỘI DUNG THẬT (phần AI làm, KHÔNG để placeholder)
Đổ nội dung grounded vào từng khối, thay 100% placeholder `[ ]`:
- **Headline (Hormozi):** *Giúp [khách] đạt [kết quả mơ ước] mà không [nỗi sợ/công sức]* — rõ ràng, không khẩu hiệu mơ hồ, không chơi chữ.
- **Copy:** ngắn, mỗi khối một ý, mỗi khối một CTA. Tông giọng theo `thuong_hieu`.
- **Tiếng Việt sạch:** không icon rác, câu rõ nghĩa.
- **Thiết kế (Flux/Malewicz):** phân cấp rõ (cỡ chữ/đậm/khoảng trắng), 1 màu nhấn cho CTA, ≤ 2 font, ảnh thật ngành (Unsplash nếu chưa có — ghi rõ "ảnh minh hoạ").
- **Mobile-first:** menu, nút gọi nổi (sticky call), form ngắn.

### Bước 5 — Xem trước & kiểm chất lượng
Mở `index.html` bằng trình duyệt (macOS: `open "output/.../index.html"`). Chạy **checklist chuyển đổi**: trong 5s hiểu làm gì–cho ai–kết quả? · mỗi khối 1 tiêu điểm? · CTA nổi bật & lặp lại? · có bằng chứng? · có đảo ngược rủi ro? · click-to-call chạy? · đọc tốt trên điện thoại?

### Bước 6 — Lưu output (BẮT BUỘC theo CLAUDE.md)
Mọi file trong `output/YYYY-MM-DD-web-<slug>/`: `index.html`, `brief.json`, ảnh/asset, + 1 file markdown chính ghi lại đầu bài + quyết định thiết kế + guru đã áp. Cập nhật `index.md` + `log.md`.

### Bước 7 — Đưa web LÊN MẠNG
Khi cần link công khai + tên miền → chuyển sang **`hmh-AIOS-deploy-cloudflare`**: deploy thư mục output ra `*.pages.dev`, rồi gắn domain riêng.

---

## 5. Tham chiếu
- `references/tri-thuc-guru.md` — kho tri thức gốc + trích dẫn (đọc khi cần chiều sâu).
- `references/blueprint-trang-dich-vu.md` — blueprint 10 khối + mẫu copy + checklist.
- `scripts/scaffold.mjs` — sinh khung dự án website responsive.

## 6. Lưu ý / gotcha
- **Không để placeholder trong bản giao** — scaffold chỉ là khung; Bước 4 phải thay 100% nội dung thật.
- Ảnh: fallback Unsplash, ghi rõ "ảnh minh hoạ".
- **Đẹp mà không chuyển đổi là hỏng** (Malewicz) — luôn chạy checklist Bước 5 trước khi coi là xong.
- Đừng nhồi mọi dịch vụ vào 1 trang nếu khách cần SEO → tách trang con.
