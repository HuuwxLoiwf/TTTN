# Hướng dẫn hoàn thiện báo cáo ĐATN

> **DÙNG FILE: `BaoCao_DATN_UMC_v2.doc`** (bản mới nhất — 2 sinh viên, ~60-68 trang).
> File `BaoCao_DATN_UMC.doc` cũ là bản 1 sinh viên, có thể xóa.
> File `BaoCao_DATN_UMC_v2.html` là bản nguồn để chỉnh sửa bằng công cụ — giữ lại nếu còn nhờ Claude sửa tiếp.

Bản thảo theo đúng Quy định 345/QĐ-ĐHKTCN (Phụ lục II): Times New Roman 13,
giãn dòng 1.2, cách đoạn 6pt, lề 3-2-2-2cm, header/footer 1cm, đề mục đúng
Bảng 1.1, bảng kiểu 3 dòng, trích dẫn Vancouver [1]-[12].

**Quy mô hiện tại:** ~16.700 từ, 28 hình, 16 bảng
→ ước tính **60-68 trang nội dung chính** sau khi chèn đủ ảnh (yêu cầu tối thiểu 40).

## Bước 1 — Mở và lưu thành .docx
1. Mở `BaoCao_DATN_UMC_v2.doc` bằng Word (hỏi xác nhận định dạng → Yes).
2. File → Save As → **Word Document (.docx)**.

## Bước 2 — Điền thông tin nhóm (các chỗ chữ ĐỎ)
- `[HỌ VÀ TÊN SINH VIÊN 1]` — MSSV 2211004 (đã điền sẵn MSSV).
- `[HỌ VÀ TÊN SINH VIÊN 2]` — MSSV 2211040 (đã điền sẵn MSSV).
- `[HỌC VỊ. HỌ TÊN CBHD]` — bìa phụ, cam đoan, cảm ơn.
- `[CHÈN LOGO TRƯỜNG CTUT]` — Insert → Pictures.
- Phụ lục E (bảng phân công 2 SV): điều chỉnh cột "Người thực hiện" theo thực tế.
- Nếu tên đề tài đăng ký khác → sửa đồng bộ ở bìa chính, bìa phụ, trang xác nhận,
  cam đoan, tóm lược.

## Bước 3 — CÁCH CHÈN ẢNH VÀO KHUNG NÉT ĐỨT (và bỏ khung)
Mỗi vị trí ảnh trong file là một đoạn văn có **viền nét đứt** chứa dòng chữ mô tả.
Làm 3 thao tác cho từng ảnh:
1. **Bôi đen toàn bộ dòng chữ trong khung** (VD: *[CHÈN HÌNH: khung kết quả
   Phân tích AI...]*) rồi gõ Delete — con trỏ vẫn nằm trong khung.
2. **Insert → Pictures → This Device** → chọn ảnh đã chụp. Ảnh sẽ nằm đúng vị
   trí đó, canh giữa sẵn.
3. **Xóa viền nét đứt:** để con trỏ ngay tại đoạn chứa ảnh → thẻ **Home** →
   nhóm Paragraph → bấm mũi tên cạnh nút **Borders** (ô vuông kẻ khung) →
   chọn **No Border**. Viền đứt biến mất, còn lại ảnh sạch.
   - Nếu chữ mô tả màu đỏ phía trên khung (dòng hướng dẫn vẽ sơ đồ) còn sót →
     xóa luôn dòng đó.
4. Ảnh quá to/nhỏ: kéo góc ảnh hoặc Picture Format → Width ≈ 14-15 cm.

Mẹo nhanh: nếu ngại xóa viền từng ảnh, cứ chèn ảnh đè lên chữ trong khung —
viền đứt chỉ là đường trang trí, in ra vẫn chấp nhận được; nhưng xóa viền sẽ đẹp hơn.

## Bước 4 — Đánh số trang (quy định: giữa, PHÍA TRÊN trang)
Phần đầu (cam đoan → danh mục bảng) đánh số La Mã i, ii, iii; từ LỜI MỞ ĐẦU
trở đi đánh số Ả Rập 1, 2, 3.
1. Đặt con trỏ ngay TRƯỚC chữ "LỜI MỞ ĐẦU" → Layout → Breaks → **Next Page**.
2. Insert → Page Number → **Top of Page → Plain Number 2** (giữa, phía trên).
3. Nháy đúp header trang LỜI MỞ ĐẦU → tắt **Link to Previous** →
   Format Page Numbers → định dạng `1,2,3` → Start at **1**.
4. Về section đầu → Format Page Numbers → chọn `i, ii, iii`.
5. Hai trang bìa không đánh số: tích **Different First Page**.

## Bước 5 — Mục lục, danh mục hình/bảng tự động
- Mục lục: xóa danh sách tĩnh ở trang MỤC LỤC → References → Table of Contents
  → Automatic Table 1 (các đề mục đã gán đúng Heading 1/2/3).
- Danh mục hình/bảng: đã có sẵn danh sách; sau khi chèn ảnh, cập nhật số trang thủ công,
  hoặc dùng Insert Caption + Insert Table of Figures nếu muốn tự động.

## Bước 6 — Checklist hình cần chèn (28 hình)

**Vẽ bằng draw.io (7 sơ đồ):**
- [ ] Hình 1.1 — Kiến trúc client-server 3 tầng
- [ ] Hình 1.2 — Sơ đồ giải pháp tổng thể
- [ ] Hình 2.1 — Use case tổng quát (5 tác nhân × 8 phân hệ)
- [ ] Hình 2.2 — Kiến trúc tổng thể chi tiết
- [ ] Hình 2.3 — ERD (gợi ý: prisma-erd-generator hoặc vẽ tay theo Bảng 2.5)
- [ ] Hình 2.4 — Lưu đồ phân quyền 2 tầng
- [ ] Hình 2.5 — Luồng cập nhật thời gian thực qua Socket.IO

**Chụp màn hình (21 hình):** đăng nhập; đăng ký+OTP; duyệt tài khoản; Dashboard;
phòng ban; danh sách dự án; Kanban; Lịch; Gantt; chi tiết công việc (việc con+
phụ thuộc+chấm công); chat nhóm; tài liệu+duyệt; phân tích+xuất báo cáo; kết quả AI;
chuông thông báo; audit log; thùng rác; **Công việc của tôi**; **tìm kiếm toàn cục**;
**ghép sáng/tối**; terminal `npm test` (18 passed).

Mẹo chụp: trình duyệt 100%, cửa sổ ~1280px để chữ trong ảnh không quá nhỏ khi in
(quy định: cỡ chữ trong hình ≥ cỡ chữ văn bản).

## Bước 7 — Kiểm tra cuối theo quy định
- [ ] Nội dung chính ≥ 40 trang (bản này đạt ~60-68 trang sau khi chèn hình) ✔
- [ ] Mỗi cấp đề mục có ≥ 2 mục con ✔ (đã bảo đảm)
- [ ] Nhắc bảng/hình kèm số hiệu ("xem Bảng 3.1", "(Hình 2.4)") ✔
- [ ] Bảng: tên TRÊN, canh trái; Hình: tên DƯỚI, canh giữa ✔
- [ ] In một mặt A4, bìa cứng XANH DƯƠNG; bìa phụ giấy trắng; kèm trang xác nhận BM 2.3
- [ ] Không tẩy xóa; chữ tiếng Việt đủ dấu ✔

## Ghi chú cho buổi bảo vệ
- Chạy lại kiểm thử trước hội đồng: `cd server && npm test` → 18/18 passed (Hình 3.21).
- Bảng 3.2 (28 ca thủ công) + Bảng 3.3 (8 lỗ hổng bảo mật tự vá) là điểm khác biệt —
  nên chuẩn bị demo giải thích IDOR và rò rỉ payload nếu hội đồng hỏi.
- Nhóm 2 người: phân công trong Phụ lục E, chỉnh theo thực tế trước khi nộp.
- Đặt JWT_SECRET trong server/.env trước khi nộp mã nguồn kèm báo cáo.