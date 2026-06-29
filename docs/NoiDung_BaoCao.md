# NỘI DUNG BÁO CÁO — PHÂN TÍCH & THIẾT KẾ HỆ THỐNG QUẢN LÝ DỰ ÁN

> Tài liệu này cung cấp phần thuyết minh cho bốn biểu đồ UML của hệ thống (Use Case, Trình tự, Hoạt động, Lớp).
> Các biểu đồ tương ứng được lưu dưới dạng tệp `.drawio` trong thư mục `docs/diagrams/`, có thể mở và chỉnh sửa trực tiếp tại [https://app.diagrams.net](https://app.diagrams.net).
>
> **Lưu ý về tính nguyên gốc:** Toàn bộ nội dung dưới đây được biên soạn dựa trên việc đọc và phân tích trực tiếp mã nguồn của chính dự án (Prisma schema, các controller, middleware phân quyền, lớp realtime). Cách diễn đạt là do người viết tự trình bày lại, không sao chép từ nguồn bên ngoài.

---

## Mở đầu

Hệ thống Quản lý Dự án (UMC) là một ứng dụng web nhiều người thuê (multi-tenant) cho phép các tổ chức tổ chức công việc theo cấu trúc phân cấp: *Không gian làm việc → Phòng ban → Dự án → Công việc*. Phần này mô tả hệ thống dưới bốn góc nhìn mô hình hóa khác nhau nhằm làm rõ: hệ thống phục vụ ai và làm được gì (Use Case), các thành phần phối hợp xử lý một yêu cầu ra sao theo thời gian (Trình tự), trình tự rẽ nhánh của một nghiệp vụ điển hình (Hoạt động), và cấu trúc dữ liệu nền tảng (Lớp).

---

## 1. Biểu đồ Use Case

**Tệp:** `docs/diagrams/1_usecase.drawio`

### 1.1. Mục đích
Biểu đồ Use Case khái quát các nhóm chức năng mà hệ thống cung cấp và xác định những đối tượng (tác nhân) tương tác với từng chức năng. Đây là cái nhìn ở mức cao, tập trung vào *"hệ thống làm được gì cho ai"* thay vì *"làm như thế nào"*.

### 1.2. Các tác nhân
Hệ thống áp dụng cơ chế phân quyền bốn cấp gắn với từng thành viên trong không gian làm việc:

| Tác nhân | Vai trò | Đặc điểm quyền hạn |
|----------|---------|---------------------|
| **Quản trị viên (ADMIN)** | Người quản lý cao nhất của không gian làm việc | Toàn quyền: quản lý thành viên, phòng ban, **đổi trạng thái công việc**, xem nhật ký kiểm toán, duyệt tài liệu |
| **Quản lý (MANAGER)** | Quản lý cấp trung | Tạo/xóa dự án, quản lý phòng ban, duyệt yêu cầu thành viên, xem báo cáo |
| **Thành viên (MEMBER)** | Người thực thi công việc | Tạo/sửa công việc, bình luận, ghi thời gian, tham gia thảo luận nhóm |
| **Người xem (VIEWER)** | Quan sát viên | Chỉ được xem; mọi thao tác ghi đều bị từ chối |
| **Clerk** (tác nhân hệ thống) | Dịch vụ xác thực bên ngoài | Đảm nhận đăng nhập/đăng ký và quản lý tổ chức |
| **Gemini AI** (tác nhân hệ thống) | Dịch vụ trí tuệ nhân tạo | Tóm tắt thảo luận và phân tích rủi ro dự án |

### 1.3. Các use case tiêu biểu
Các chức năng được nhóm theo lĩnh vực nghiệp vụ: quản lý không gian làm việc và thành viên; quản lý phòng ban và dự án; quản lý công việc (tạo, đổi trạng thái, checklist, bình luận, theo dõi thời gian); cộng tác (chat nhóm, thông báo, yêu cầu/duyệt thành viên, duyệt tài liệu); và báo cáo (xuất CSV/PDF, phân tích AI, nhật ký kiểm toán).

Hai quan hệ `<<include>>` đáng chú ý phản ánh đúng hành vi trong mã nguồn:
- *Quản lý công việc* **bao hàm** *Nhận thông báo*: mỗi khi giao việc, hệ thống tự sinh thông báo cho người được giao.
- *Chat nhóm* **bao hàm** *Tóm tắt bằng AI*: nội dung thảo luận là đầu vào cho chức năng tóm tắt của Gemini.

### 1.4. Điểm nhấn thiết kế
Việc giới hạn quyền **đổi trạng thái công việc** cho riêng ADMIN là một quyết định nghiệp vụ có chủ đích nhằm kiểm soát luồng phê duyệt tiến độ — được hiện thực bằng kiểm tra vai trò ngay trong tầng controller, không chỉ ở giao diện.

---

## 2. Biểu đồ Trình tự (Sequence)

**Tệp:** `docs/diagrams/2_sequence_task.drawio`
**Kịch bản minh họa:** *Tạo và cập nhật công việc theo thời gian thực (realtime).*

### 2.1. Mục đích
Biểu đồ trình tự thể hiện thứ tự trao đổi thông điệp giữa các đối tượng tham gia khi thực thi một chức năng cụ thể, qua đó làm rõ cách các tầng (giao diện, máy chủ, phân quyền, nghiệp vụ, cơ sở dữ liệu, realtime) phối hợp.

### 2.2. Các đối tượng tham gia
Người dùng (trình duyệt), React Client, máy chủ Express, lớp trung gian phân quyền `requireMember`, controller xử lý công việc, lớp truy cập dữ liệu Prisma/PostgreSQL, máy chủ Socket.io, và các client khác đang mở cùng dự án.

### 2.3. Diễn giải luồng
1. Người dùng nhập thông tin và nhấn nút tạo công việc.
2. React Client gửi yêu cầu `POST /api/tasks/project/:id`, đính kèm mã thông báo JWT do Clerk cấp.
3. Máy chủ xác minh JWT, lấy được định danh người dùng.
4. Lớp phân quyền kiểm tra người dùng có phải là thành viên của không gian làm việc và có đủ vai trò hay không.
5. Controller kiểm tra tính hợp lệ của dữ liệu (tiêu đề bắt buộc, độ dài tối đa).
6–7. Công việc được ghi vào cơ sở dữ liệu; nếu không chỉ định người làm, hệ thống mặc định gán cho người tạo.
8. Máy chủ phát sự kiện `task:created` tới "phòng" của dự án qua Socket.io.
9–10. Hệ thống **tính lại tiến độ dự án** theo tỷ lệ phần trăm công việc đã hoàn thành rồi phát sự kiện `project:progress`.
11–12. Ghi nhật ký hoạt động và gửi thông báo cho người được giao việc (kèm sự kiện realtime tới phòng cá nhân của người đó).
13–14. Trả phản hồi 201 về cho client gọi; giao diện cập nhật trạng thái cục bộ.
15. Nhờ cơ chế phòng theo dự án, **mọi client khác đang mở dự án** đều nhận được cập nhật mà không cần tải lại trang.

### 2.4. Điểm nhấn thiết kế
Tính realtime được hiện thực bằng mô hình "phòng" (room) của Socket.io theo ba phạm vi: theo dự án, theo người dùng và theo không gian làm việc. Nhờ đó, một thao tác đơn lẻ có thể đồng thời cập nhật bảng công việc, thanh tiến độ và chuông thông báo của nhiều người dùng khác nhau.

---

## 3. Biểu đồ Hoạt động (Activity)

**Tệp:** `docs/diagrams/3_activity_task.drawio`
**Kịch bản minh họa:** *Tạo và cập nhật công việc.*

### 3.1. Mục đích
Biểu đồ hoạt động mô tả dòng điều khiển của một nghiệp vụ, bao gồm các điểm rẽ nhánh quyết định và các hoạt động có thể diễn ra song song.

### 3.2. Diễn giải luồng
Sau khi người dùng nhập liệu và gửi yêu cầu, hệ thống lần lượt đi qua **ba cổng kiểm tra**:
1. **Token hợp lệ?** — nếu không, trả lỗi 401 (chưa đăng nhập) và dừng.
2. **Là thành viên không gian làm việc?** — nếu không, trả lỗi 403 (không đủ quyền).
3. **Dữ liệu hợp lệ?** — nếu tiêu đề rỗng hoặc quá dài, trả lỗi 400.

Khi vượt qua cả ba cổng, công việc được lưu vào cơ sở dữ liệu. Tiếp đó là một khối **xử lý song song** (fork–join) gồm ba nhánh diễn ra đồng thời: (a) phát sự kiện realtime tạo công việc; (b) tính lại và phát tiến độ dự án; (c) ghi nhật ký hoạt động và gửi thông báo cho người được giao. Sau khi cả ba nhánh hoàn tất, hệ thống trả kết quả về cho client gọi, đồng thời các client khác trong dự án cập nhật giao diện.

### 3.3. Điểm nhấn thiết kế
Việc tách phần "tác dụng phụ" (thông báo, ghi nhật ký, phát realtime) thành các nhánh song song giúp phản hồi tới người dùng không bị chậm bởi các tác vụ phụ trợ — đặc biệt các thao tác như gửi email được thực thi theo kiểu "gửi đi rồi quên" (fire-and-forget).

---

## 4. Biểu đồ Lớp (Class)

**Tệp:** `docs/diagrams/4_class.drawio`

### 4.1. Mục đích
Biểu đồ lớp mô tả cấu trúc dữ liệu nền tảng của hệ thống: các thực thể, thuộc tính và mối quan hệ giữa chúng. Vì hệ thống dùng ORM Prisma trên PostgreSQL, mỗi lớp tương ứng với một bảng dữ liệu, các quan hệ tương ứng với khóa ngoại.

### 4.2. Các thực thể chính và quan hệ

- **User** — người dùng (định danh đồng bộ từ Clerk). Một người dùng có thể thuộc nhiều không gian làm việc, được giao nhiều công việc, viết nhiều bình luận.
- **Workspace** — không gian làm việc (tương ứng một tổ chức). Chứa nhiều phòng ban, dự án, thành viên, bản ghi hoạt động và kiểm toán.
- **WorkspaceMember** — bảng trung gian nối *User* với *Workspace*, mang thuộc tính `role` quyết định toàn bộ cơ chế phân quyền.
- **Department** — phòng ban thuộc một không gian làm việc; tên phòng ban là duy nhất trong cùng không gian.
- **Project** — dự án thuộc một không gian làm việc và (tùy chọn) một phòng ban; lưu thuộc tính `progress` được hệ thống tự cập nhật theo tỷ lệ công việc hoàn thành.
- **ProjectMember** — bảng trung gian nối *User* với *Project*.
- **Task** — công việc thuộc một dự án, có thể gán cho một người (`assignee`), mang trạng thái, loại, độ ưu tiên và hạn chót.
- **Subtask, Comment, TimeLog** — các thực thể con của *Task*: danh mục việc nhỏ, bình luận và bản ghi thời gian làm việc.
- **File** — tài liệu gắn với dự án hoặc công việc, có trạng thái duyệt (`reviewStatus`).
- **ProjectMessage** — tin nhắn trong kênh thảo luận của dự án, có thể đính kèm tệp.
- **ProjectMemberRequest** — yêu cầu tham gia dự án với ba trạng thái: chờ duyệt, chấp nhận, từ chối.
- **Notification, Activity, AuditLog** — lần lượt là thông báo cá nhân, dòng hoạt động của không gian làm việc, và nhật ký kiểm toán chi tiết (lưu cả giá trị cũ/mới khi thay đổi).

### 4.3. Đặc điểm quan hệ
Phần lớn quan hệ là *một–nhiều* (ví dụ: một dự án có nhiều công việc). Hai quan hệ *nhiều–nhiều* (User–Workspace và User–Project) được hiện thực thông qua các bảng trung gian *WorkspaceMember* và *ProjectMember*. Các ràng buộc xóa lan truyền (cascade) bảo đảm tính toàn vẹn: xóa một dự án sẽ xóa theo toàn bộ công việc, tệp và tin nhắn liên quan; trong khi xóa phòng ban chỉ gỡ liên kết (đặt về rỗng) chứ không xóa dự án.

---

## Kết luận

Bốn biểu đồ trên bổ trợ lẫn nhau để mô tả hệ thống một cách toàn diện: Use Case xác định phạm vi chức năng và phân quyền; Trình tự và Hoạt động làm rõ cơ chế xử lý realtime đặc trưng của hệ thống thông qua một nghiệp vụ cốt lõi; còn biểu đồ Lớp đặt nền tảng dữ liệu cho mọi chức năng. Điểm thiết kế xuyên suốt là sự kết hợp giữa phân quyền chặt chẽ ở tầng máy chủ và cập nhật thời gian thực tới nhiều người dùng, mang lại trải nghiệm cộng tác đồng bộ.

---

## Phụ lục — Hướng dẫn mở biểu đồ trên draw.io

1. Truy cập [https://app.diagrams.net](https://app.diagrams.net) (hoặc mở ứng dụng draw.io desktop).
2. Chọn **File → Open From → Device…** rồi chọn tệp `.drawio` trong thư mục `docs/diagrams/`.
3. Có thể chỉnh sửa kéo–thả trực tiếp; để xuất hình cho báo cáo, dùng **File → Export as → PNG/PDF** (nên chọn độ phân giải cao và nền trắng).

| Biểu đồ | Tệp |
|---------|-----|
| Use Case | `docs/diagrams/1_usecase.drawio` |
| Trình tự (Sequence) | `docs/diagrams/2_sequence_task.drawio` |
| Hoạt động (Activity) | `docs/diagrams/3_activity_task.drawio` |
| Lớp (Class) | `docs/diagrams/4_class.drawio` |
