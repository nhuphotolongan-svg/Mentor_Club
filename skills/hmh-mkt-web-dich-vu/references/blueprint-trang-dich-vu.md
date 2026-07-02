# Blueprint: Trang dịch vụ chuẩn chuyển đổi (10 khối)

Thứ tự khối = thứ tự dẫn mắt (Malewicz) + đóng khung giá trị (Hormozi). Mỗi khối **một tiêu điểm, một CTA**.

| # | Khối | Mục tiêu | Mẫu copy |
|---|------|----------|----------|
| 1 | **Hero** | 5 giây hiểu *làm gì – cho ai – kết quả gì* | Headline: *Giúp [khách] đạt [kết quả mơ ước] mà không [nỗi sợ]* + subhead + CTA chính + dải tin cậy (rating/logo/"X khách") |
| 2 | **Nỗi đau** | Gọi đúng vấn đề khách đang chịu (agitate) | "Bạn có đang…?" — 3 nỗi đau cụ thể, ngôn ngữ của khách |
| 3 | **Dịch vụ / Offer** | Đóng khung Phương trình Giá trị | Mỗi dịch vụ: kết quả mơ ước · nhanh · dễ · đáng tin |
| 4 | **Vì sao chọn** | Khác biệt = bằng chứng "khả năng đạt được" | 3–4 USP, mỗi cái kèm proof (số liệu/quy trình/chứng nhận) |
| 5 | **Bằng chứng xã hội** | Niềm tin là tiền tệ | Testimonial thật, kết quả trước/sau, con số, badge — **không bịa** |
| 6 | **Quy trình 3–4 bước** | Giảm "công sức cảm nhận" | Bước 1 → 2 → 3, mỗi bước 1 câu |
| 7 | **Đảo ngược rủi ro** | Gỡ nỗi sợ xuống tiền | Cam kết/bảo hành rõ: hoàn tiền / làm lại / bảo hành X |
| 8 | **FAQ** | Gỡ phản đối còn lại | 4–6 câu hỏi thật khách hay hỏi (giá, thời gian, an toàn…) |
| 9 | **CTA cuối** | Một hành động mạnh | "Sẵn sàng [kết quả]?" + nút gọi/đặt lịch |
| 10 | **Liên hệ** | Liên hệ phải DỄ | click-to-call + form ngắn (tên/SĐT) + map + giờ làm + thời gian phản hồi |

## Nguyên tắc copy
- **Clarity > cleverness:** rõ ràng, không chơi chữ, không khẩu hiệu mơ hồ.
- **1 ý / khối, 1 CTA / khối**, tất cả CTA dẫn về cùng 1 hành động.
- Tiếng Việt sạch: không icon rác, câu rõ nghĩa, đúng chính tả.
- Tông giọng theo `thuong_hieu` trong brief.

## Nguyên tắc thiết kế (Flux + Malewicz)
- **Phân cấp rõ:** cỡ chữ/độ đậm/khoảng trắng tạo thứ tự đọc.
- **1 màu nhấn** duy nhất cho mọi CTA (biến `--accent`).
- **≤ 2 font.** Ảnh thật của ngành (Unsplash nếu chưa có — ghi "ảnh minh hoạ").
- **Mobile-first:** menu gọn, **sticky call button** (đã có sẵn `.call-fab`), form ngắn.

## Checklist trước khi coi là xong (Bước 5)
- [ ] Trong 5s hiểu làm gì – cho ai – kết quả gì?
- [ ] Đã thay 100% placeholder `[ ]` bằng nội dung thật?
- [ ] Mỗi khối 1 tiêu điểm? CTA nổi bật & lặp lại?
- [ ] Có bằng chứng (không bịa)? Có đảo ngược rủi ro?
- [ ] click-to-call bấm gọi được trên mobile?
- [ ] Form đã nối tới nơi nhận lead (hay mới chỉ báo cảm ơn — còn TODO)?
- [ ] Đọc tốt trên điện thoại (menu, nút, form)?
- [ ] Ảnh đã nén, tải nhanh, không vỡ?
