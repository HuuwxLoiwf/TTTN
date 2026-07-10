# HỆ THỐNG QUẢN LÝ DỰ ÁN UMC — CHỨC NĂNG & LUỒNG HOẠT ĐỘNG CHI TIẾT

> **Đề tài:** Xây dựng ứng dụng web quản lí dự án công ty UMC — Nhóm: Dương Hữu Lời & Từ Hữu Trí.
> Tài liệu này tổng hợp **toàn bộ chức năng** và **luồng hoạt động** của hệ thống, dựa trên việc đọc trực tiếp mã nguồn server + client.

---

## PHẦN A — TỔNG QUAN

### A.1. Hệ thống là gì
Ứng dụng web quản lý dự án & cộng tác nhóm nhiều người thuê (multi-tenant), tổ chức công việc theo cấu trúc phân cấp:

```
Không gian làm việc (Workspace)  ← 1 tổ chức
   └── Phòng ban (Department)
         └── Dự án (Project)
               └── Giai đoạn (Phase) ─── Công việc (Task)
                                             ├── Công việc con (Subtask - checklist)
                                             ├── Phụ thuộc (Dependency)
                                             ├── Bình luận (Comment)
                                             ├── Tệp đính kèm (File)
                                             └── Nhật ký thời gian (TimeLog)
```

### A.2. Kiến trúc & công nghệ

| Thành phần | Công nghệ |
|-----------|-----------|
| **Backend** | Node.js + **Express 5**, cổng 5000 |
| **Cơ sở dữ liệu** | **PostgreSQL** (Neon serverless) qua **Prisma ORM** |
| **Xác thực** | **Tự quản lý**: JWT (jsonwebtoken) + bcrypt + OTP email (KHÔNG dùng Clerk) |
| **Realtime** | **Socket.io** (3 loại phòng: dự án / người dùng / workspace) |
| **Frontend Web** | **React 19** + Redux Toolkit + React Router 7 + Vite + Tailwind CSS v4 |
| **AI** | Google **Gemini** (gemini-2.0-flash) — tóm tắt & phân tích |
| **Lưu file** | Ổ đĩa local `/uploads` hoặc **Cloudinary** (nếu cấu hình) |
| **Email** | Nodemailer (OTP, giao việc, bình luận, @mention, đặt lại mật khẩu) |
| **Mobile** | Flutter (dùng chung REST API) |

### A.3. Phân quyền — 4 vai trò (RBAC)

| Vai trò | Quyền hạn |
|---------|-----------|
| **ADMIN** | Toàn quyền workspace: quản lý thành viên/vai trò, phòng ban, **đổi trạng thái công việc**, duyệt tài liệu, duyệt tài khoản, thùng rác, xem audit log |
| **MANAGER** | Quản lý dự án & phòng ban, tạo/xóa dự án, thùng rác, duyệt yêu cầu thành viên |
| **MEMBER** | Tạo/sửa công việc, bình luận, ghi giờ, thảo luận nhóm (trong dự án mình tham gia) |
| **VIEWER** | **Chỉ xem** — mọi thao tác ghi (POST/PUT/DELETE) đều bị chặn |

**Cơ chế phân quyền 2 tầng** (middleware `authz.js`):
1. **`requireMember`** — kiểm tra là thành viên **workspace** (suy `workspaceId` từ nhiều nguồn: project/task/comment/subtask/phase/dependency/timelog/file). Gắn `req.workspaceId`, `req.memberRole`.
2. **`requireProjectMember`** — kiểm tra là thành viên **dự án** (chặt hơn). ADMIN/MANAGER workspace và trưởng dự án được bỏ qua. Áp dụng cho sửa task, thêm phụ thuộc.

---

## PHẦN B — CHỨC NĂNG THEO NHÓM

### B.1. Xác thực & Quản lý tài khoản (`/api/auth`)

Hệ thống **tự quản lý đăng nhập** (không phụ thuộc dịch vụ ngoài). Có rate-limit riêng 20 request/15 phút chống dò mật khẩu.

| Chức năng | Endpoint | Luồng chi tiết |
|-----------|----------|----------------|
| **Đăng ký** | `POST /auth/register` | Validate tên/email/mật khẩu (≥4 ký tự) → kiểm tra email chưa tồn tại → **bcrypt hash** mật khẩu → sinh **OTP 6 số** (hạn 10 phút) → tạo user (`emailVerified=false`) → gửi OTP qua email. Nếu chưa cấu hình email, trả `devOtp` để test. |
| **Xác minh OTP** | `POST /auth/verify-otp` | So khớp OTP + kiểm tra hạn → đặt `emailVerified=true`, xóa OTP. **Chưa cho đăng nhập ngay** — báo "đang chờ quản trị viên duyệt". |
| **Gửi lại OTP** | `POST /auth/resend-otp` | Sinh OTP mới, gia hạn 10 phút, gửi lại. |
| **Đăng nhập** | `POST /auth/login` | Tìm user → **bcrypt.compare** mật khẩu → kiểm tra `emailVerified` (nếu chưa → cờ `needVerify`) → kiểm tra `approved` (nếu chưa → "chờ duyệt") → ký **JWT** (hết hạn 7 ngày) trả về token + thông tin user. |
| **Lấy thông tin** | `GET /auth/me` | Từ token → trả hồ sơ (không kèm mật khẩu). |
| **Cập nhật hồ sơ** | `PUT /auth/profile` | Đổi tên / ảnh đại diện. |
| **Đổi mật khẩu** | `PUT /auth/change-password` | Xác minh mật khẩu hiện tại → hash mật khẩu mới. |
| **Quên mật khẩu** | `POST /auth/forgot-password` | Sinh token ngẫu nhiên (lưu **hash SHA-256**, hạn 30 phút) → gửi link email. **Luôn trả message trung tính** (không tiết lộ email có tồn tại). |
| **Đặt lại mật khẩu** | `POST /auth/reset-password` | Hash token gửi lên → tìm user có token còn hạn → đặt mật khẩu mới, xóa token. |
| **Duyệt tài khoản** | `GET /auth/pending-users`, `PUT .../:id/approve`, `DELETE .../:id` | **Chỉ system admin** (email `admin@umc.com` hoặc ADMIN của workspace bất kỳ). Xem danh sách chờ, duyệt (`approved=true`) hoặc từ chối (xóa tài khoản chưa duyệt). |

**Luồng đăng ký hoàn chỉnh:**
```
Đăng ký → nhận OTP qua email → xác minh OTP → (chờ admin duyệt) → admin duyệt → mới đăng nhập được
```
→ 3 lớp bảo vệ: xác minh email + duyệt thủ công + JWT.

### B.2. Không gian làm việc & Thành viên (`/api/workspaces`)

| Chức năng | Endpoint | Quyền | Ghi chú |
|-----------|----------|-------|---------|
| Danh sách workspace của tôi | `GET /workspaces` | Đăng nhập | Nạp lồng toàn bộ dự án + task (đã lọc bỏ mục trong thùng rác `deletedAt`) |
| Chi tiết | `GET /workspaces/:id` | Thành viên | |
| Tạo | `POST /workspaces` | Đăng nhập | Người tạo tự thành **ADMIN**, tự sinh `slug` |
| Sửa / Xóa | `PUT/DELETE /workspaces/:id` | ADMIN | |
| Mời thành viên | `POST /workspaces/:id/members` | ADMIN | Người được mời **phải đã có tài khoản**; thông báo + ghi hoạt động |
| Đổi vai trò | `PUT /workspaces/:id/members/:memberId` | ADMIN | Không cho hạ cấp chủ sở hữu workspace |
| Xóa thành viên | `DELETE /workspaces/:id/members/:memberId` | ADMIN | |

### B.3. Phòng ban (`/api/departments`)

| Chức năng | Endpoint | Quyền |
|-----------|----------|-------|
| Danh sách | `GET /departments/workspace/:workspaceId` | Thành viên |
| Tạo / Sửa / Xóa | `POST/PUT/DELETE` | ADMIN, MANAGER |

Tên phòng ban **không trùng** trong cùng workspace. Xóa phòng ban → dự án chỉ bị gỡ liên kết (không xóa).

### B.4. Dự án (`/api/projects`)

| Chức năng | Endpoint | Quyền | Luồng |
|-----------|----------|-------|-------|
| Danh sách theo workspace | `GET /projects/workspace/:workspaceId` | Thành viên | |
| Chi tiết | `GET /projects/:id` | Thành viên | |
| **Tạo** | `POST /projects/workspace/:workspaceId` | Thành viên | Validate tên (≤200) + **bắt buộc phòng ban** + **ngày bắt đầu ≥ hôm nay**. Người tạo là trưởng dự án (`team_lead`) + thành viên đầu tiên. Thêm nhiều thành viên qua email. Ghi Activity + Audit. |
| Sửa | `PUT /projects/:id` | Thành viên | Ghi **audit từng trường thay đổi** (name/status/priority: old→new) |
| **Xóa** | `DELETE /projects/:id` | ADMIN, MANAGER | Soft-delete → vào thùng rác |
| Thêm thành viên | `POST /projects/:id/members` | Thành viên | Theo email; thông báo + ghi hoạt động |
| Xóa thành viên | `DELETE /projects/:id/members/:memberId` | Thành viên | |

**Tiến độ dự án** (`progress`) = `% công việc ở trạng thái DONE`, **tự tính lại** mỗi khi tạo/đổi trạng thái/xóa công việc (`recalcProjectProgress`), rồi phát realtime.

### B.5. Công việc (`/api/tasks`)

| Chức năng | Endpoint | Quyền | Luồng chi tiết |
|-----------|----------|-------|----------------|
| Danh sách | `GET /tasks/project/:projectId` | Thành viên WS | |
| Chi tiết | `GET /tasks/:id` | Thành viên WS | Kèm bình luận |
| **Tạo** | `POST /tasks/project/:projectId` | Thành viên **dự án** | Validate tiêu đề (≤200). Mặc định gán cho người tạo. → emit `task:created` → tính lại tiến độ → ghi Activity → **thông báo + email** người được giao. |
| **Sửa** | `PUT /tasks/:id` | Thành viên **dự án** | **Đổi trạng thái chỉ ADMIN** (chặn nếu `memberRole ≠ ADMIN`). → emit `task:updated`, thông báo người mới được giao, nếu đổi status thì ghi Activity + tính lại tiến độ. |
| **Xóa** | `DELETE /tasks/:id` | Thành viên **dự án** | Soft-delete → thùng rác |
| **Xóa hàng loạt** | `POST /tasks/bulk-delete` | Đăng nhập | **Lọc lại** chỉ task thuộc workspace mà user là thành viên (chống xóa chéo) |

Công việc có: trạng thái (TODO/IN_PROGRESS/REVIEW/DONE), loại (TASK/BUG/FEATURE/IMPROVEMENT/OTHER), độ ưu tiên (LOW/MEDIUM/HIGH), người thực hiện, hạn chót, giai đoạn.

### B.6. Công việc con — Checklist (`/api/subtasks`)

CRUD checklist trong một công việc: `GET/POST /subtasks/task/:taskId`, `PUT/DELETE /subtasks/:id`. Mỗi mục có cờ `done`. Giao diện cập nhật lạc quan (optimistic).

### B.7. Phụ thuộc công việc (`/api/dependencies`)

Chức năng nâng cao mô hình hóa **"việc A phải xong trước việc B"**.

| Chức năng | Endpoint | Luồng |
|-----------|----------|-------|
| Xem phụ thuộc | `GET /dependencies/task/:taskId` | Trả `dependsOn` (việc tiên quyết) + `blocking` (việc đang bị task này chặn) |
| **Thêm** | `POST /dependencies/task/:taskId` | Kiểm tra: không tự phụ thuộc, **cùng dự án**, và **không tạo vòng lặp** (thuật toán **BFS** `wouldCreateCycle`). |
| Xóa | `DELETE /dependencies/:depId` | |

→ Nếu còn việc tiên quyết chưa DONE, giao diện hiển thị **cảnh báo khóa** "Chưa thể hoàn thành".

### B.8. Giai đoạn dự án (`/api/phases`)

Chia dự án thành các giai đoạn (Phase), gán công việc vào giai đoạn. `GET/POST /phases/project/:projectId`, `PUT/DELETE /phases/:id`. Mỗi giai đoạn có **tiến độ riêng** = % task DONE trong giai đoạn.

### B.9. Bình luận (`/api/comments`)

| Chức năng | Endpoint | Luồng |
|-----------|----------|-------|
| Xem | `GET /comments/task/:taskId` | |
| **Thêm** | `POST /comments/task/:taskId` | → emit `comment:added` (realtime) → ghi Activity → **quét @mention** thông báo người được nhắc → thông báo + **email** người được giao task. |
| Xóa | `DELETE /comments/:id` | Chỉ **tác giả** hoặc **ADMIN** |

### B.10. Chat nhóm dự án (`/api/project-messages`)

| Chức năng | Endpoint | Luồng |
|-----------|----------|-------|
| Lịch sử (phân trang) | `GET /project-messages/project/:projectId?before=<ISO>` | Trả 30 tin/lần theo con trỏ thời gian (cuộn lên tải tin cũ), cờ `hasMore` |
| **Gửi tin** | `POST /project-messages/project/:projectId` | Cho phép **đính kèm file** (fileUrl/fileName). → emit `projectMessage:new` → quét @mention. |

### B.11. Yêu cầu & duyệt thành viên dự án (`/api/member-requests`)

| Chức năng | Endpoint | Luồng |
|-----------|----------|-------|
| Danh sách yêu cầu | `GET /member-requests/project/:projectId` | |
| **Tạo yêu cầu** | `POST /member-requests/project/:projectId` | Kiểm tra chưa là thành viên, chưa có yêu cầu PENDING → tạo yêu cầu → **thông báo trưởng dự án + tất cả ADMIN**. |
| **Duyệt** | `PUT /member-requests/:id/approve` | Chỉ ADMIN/trưởng dự án. Kiểm tra người được duyệt còn thuộc workspace → tạo `ProjectMember` → thông báo + ghi hoạt động. |
| **Từ chối** | `PUT /member-requests/:id/reject` | Kèm ghi chú lý do → thông báo người bị từ chối. |

### B.12. Tài liệu (`/api/files`)

| Chức năng | Endpoint | Luồng chi tiết |
|-----------|----------|----------------|
| Danh sách | `GET /files?projectId=` hoặc `?taskId=` | Kiểm tra là thành viên workspace |
| **Upload** | `POST /files/upload` (multipart) | **Whitelist** loại file (ảnh/pdf/doc/xls/ppt/txt/csv/nén), **giới hạn 10MB**. Lưu **Cloudinary** (nếu có env) hoặc **ổ đĩa**. Tài liệu **chung dự án** chỉ admin/trưởng dự án được up; user thường đính kèm vào công việc. File của admin/lead **tự động ĐẠT**. |
| **Duyệt file** | `PUT /files/:id/review` | Chỉ ADMIN/trưởng dự án: APPROVED / REJECTED + ghi chú → **thông báo người upload** + ghi hoạt động. |
| Xóa | `DELETE /files/:id` | Người upload, ADMIN, hoặc trưởng dự án. Xóa cả file vật lý (nếu ở đĩa). |

### B.13. Theo dõi thời gian (`/api/time-logs`)

| Chức năng | Endpoint | Ghi chú |
|-----------|----------|---------|
| Xem theo task | `GET /time-logs/task/:taskId` | Kèm tổng số phút |
| Ghi giờ | `POST /time-logs/task/:taskId` | Số phút > 0, có ghi chú + ngày làm |
| **Báo cáo dự án** | `GET /time-logs/project/:projectId/report` | Tổng giờ **nhóm theo người**, sắp xếp giảm dần |
| Xóa | `DELETE /time-logs/:id` | Chỉ **chủ sở hữu** bản ghi |

### B.14. Thông báo (`/api/notifications`)

| Chức năng | Endpoint | Ghi chú |
|-----------|----------|---------|
| Danh sách | `GET /notifications` | 30 mới nhất |
| **Nhắc hạn tự động** | `GET /notifications/check-due` | Quét task của tôi due ≤24h hoặc quá hạn & chưa DONE → tạo thông báo (**chống trùng 12h**). Gọi khi mở app. |
| Đánh dấu đã đọc | `PUT /notifications/:id/read`, `/read-all` | Chỉ thông báo của mình |

### B.15. Nhật ký hoạt động & Kiểm toán (`/api/activities`)

| Chức năng | Endpoint | Quyền |
|-----------|----------|-------|
| Bảng tin hoạt động | `GET /activities/workspace/:workspaceId` | Thành viên |
| Xóa hoạt động | `DELETE /activities/:id` | ADMIN |
| **Nhật ký kiểm toán** | `GET /activities/audit/:workspaceId` | **ADMIN** — ghi chi tiết CREATE/UPDATE/DELETE/RESTORE/PURGE + thay đổi từng trường (old→new) |

### B.16. Thùng rác (`/api/trash`)

| Chức năng | Endpoint | Quyền |
|-----------|----------|-------|
| Danh sách đã xóa | `GET /trash/workspace/:workspaceId` | ADMIN, MANAGER |
| Khôi phục | `PUT /trash/project|task/:id/restore` | ADMIN, MANAGER |
| Xóa vĩnh viễn | `DELETE /trash/project|task/:id` | ADMIN, MANAGER |

→ Mục trong thùng rác **quá 30 ngày tự động bị xóa vĩnh viễn** (tiến trình `trashCleanup` chạy khi khởi động + mỗi 24h).

### B.17. Trí tuệ nhân tạo (`/api/ai`)

| Chức năng | Endpoint | Luồng |
|-----------|----------|-------|
| **Tóm tắt thảo luận** | `GET /ai/summarize/:projectId` | Gom tối đa 200 tin chat → gửi Gemini → trả tóm tắt tiếng Việt (điểm chính, quyết định, việc cần làm). |
| **Phân tích dự án** | `GET /ai/analyze/:projectId` | Gửi danh sách task + hạn chót → Gemini phân tích rủi ro trễ hạn, việc ưu tiên, gợi ý phân công. |

→ Nếu chưa cấu hình `GEMINI_API_KEY`, trả **503** (thông báo rõ ràng, không crash).

---

## PHẦN C — REALTIME (Socket.io)

Server dùng **3 loại phòng**; client tham gia phòng để nhận cập nhật tức thì:

| Phòng | Phạm vi | Sự kiện phát ra |
|-------|---------|-----------------|
| `project:{id}` | Trong 1 dự án | `task:created`, `task:updated`, `task:deleted`, `tasks:bulkDeleted`, `project:progress`, `comment:added`, `projectMessage:new` |
| `user:{id}` | Cá nhân | `notification:new` |
| `workspace:{id}` | Bảng tin | `activity:new` |

**Tiện ích chéo** (`utils/notify.js`):
- `notifyUser` — tạo thông báo + emit realtime (bỏ qua nếu tự thông báo cho mình).
- `logActivity` — ghi bảng tin + emit `activity:new`.
- `logAudit` — ghi nhật ký kiểm toán chi tiết.
- `notifyMentions` — quét `@email`/`@tên` → thông báo + email người được nhắc (chỉ thành viên dự án).

---

## PHẦN D — GIAO DIỆN NGƯỜI DÙNG (Client)

### D.1. Khởi động ứng dụng
```
main.jsx: BrowserRouter → AuthProvider → Redux Provider → App
  → App.jsx: 1 route cha "/" = Layout, các trang con lazy-load qua <Outlet/>
```

### D.2. Cổng xác thực (Layout.jsx)
- Đang kiểm tra token → spinner.
- Chưa đăng nhập → hiển thị **AuthPage** (đây chính là "route bảo vệ").
- Đã đăng nhập → nạp danh sách workspace vào Redux → hiển thị app (Sidebar + Navbar + nội dung).

### D.3. Trang AuthPage (state-machine 5 chế độ)
`login` ⇄ `register` → `verify` (OTP) ; `login` → `forgot` → `reset`. Xử lý lỗi thông minh (chưa xác minh → sang verify; chưa đăng ký → sang register). Mở link đặt lại mật khẩu từ email tự nhảy vào chế độ `reset`.

### D.4. Bản đồ màn hình

| Route | Trang | Chức năng |
|-------|-------|-----------|
| `/` | **Dashboard** | Thẻ thống kê, tổng quan dự án, hoạt động gần đây (realtime), thống kê theo phòng ban, xuất báo cáo CSV |
| `/projects` | **Projects** | Danh sách + tìm kiếm + lọc (trạng thái/ưu tiên/phòng ban), tạo dự án |
| `/projectsDetail` | **ProjectDetails** | Chi tiết dự án — **9 tab** (mục D.5) |
| `/taskDetails` | **TaskDetails** | Chi tiết công việc: thông tin, bình luận (realtime), tệp, checklist, phụ thuộc, ghi giờ |
| `/team` | **Team** | Quản lý thành viên workspace, đổi vai trò, mời thành viên |
| `/my-tasks` | **MyTasks** | Mọi công việc được giao cho tôi (xuyên dự án), sắp xếp theo hạn |
| `/pending-accounts` | **PendingAccounts** | Duyệt tài khoản chờ (admin) |
| `/trash` | **Trash** | Thùng rác — khôi phục/xóa vĩnh viễn (ADMIN/MANAGER) |
| `/audit-log` | **AuditLog** | Nhật ký kiểm toán (ADMIN) |
| `/settings` | **Settings** | Hồ sơ cá nhân, đổi mật khẩu, giao diện sáng/tối |

### D.5. Chi tiết dự án — 9 tab

| Tab | Nội dung |
|-----|----------|
| **Công việc** | Danh sách task, lọc + sắp xếp |
| **Giai đoạn** | Các Phase và tiến độ từng giai đoạn |
| **Kanban** | Bảng kéo-thả 4 cột theo trạng thái (đổi trạng thái = chỉ ADMIN) |
| **Lịch** | Task theo ngày hạn chót |
| **Timeline** | Biểu đồ Gantt (CSS, không cần thư viện) |
| **Phân tích** | Biểu đồ (Recharts), báo cáo giờ, xuất **CSV/PDF**, **phân tích AI** |
| **Tài liệu** | Danh sách file + badge duyệt (Đạt/Chưa đạt), upload, xem trước ảnh/PDF |
| **Thảo luận** | Chat nhóm realtime, đính kèm, @mention, **tóm tắt AI** |
| **Cài đặt** | Sửa/xóa dự án, quản lý thành viên, phòng ban, duyệt yêu cầu vào dự án |

### D.6. Quản lý trạng thái phía client
- **Redux (`workspaceSlice`)** là nguồn dữ liệu chính: `workspaces`, `currentWorkspace` (lồng dự án → task). Nhiều màn hình (Projects, MyTasks, Dashboard...) đọc **trực tiếp từ Redux**, không gọi lại API.
- Các sự kiện socket → dispatch cập nhật Redux → UI tự làm mới.

---

## PHẦN E — LUỒNG HOẠT ĐỘNG TIÊU BIỂU

### E.1. Từ đăng ký đến làm việc
```
1. Đăng ký (tên/email/mật khẩu) → nhận OTP email
2. Nhập OTP → xác minh email
3. Chờ quản trị viên duyệt tài khoản
4. Admin duyệt → đăng nhập (nhận JWT)
5. Nạp workspace → chọn không gian làm việc → vào Dashboard
```

### E.2. Vòng đời một công việc (realtime, minh họa cốt lõi)
```
Người dùng tạo task
  → POST /tasks (kiểm tra JWT → là thành viên workspace → là thành viên dự án → validate)
  → Lưu DB
  → [song song]  a) emit task:created → mọi client trong dự án cập nhật ngay
                 b) recalcProjectProgress → emit project:progress
                 c) ghi Activity + thông báo/email người được giao
  → Trả 201 cho client gọi
Đổi trạng thái (chỉ ADMIN): PUT /tasks/:id → emit task:updated → tính lại tiến độ → ghi Activity
```

### E.3. Cộng tác trong dự án
```
Chat nhóm → @mention thành viên → họ nhận thông báo + email → có thể "Tóm tắt AI" toàn bộ thảo luận
Bình luận trên task → realtime + thông báo người được giao
Upload tài liệu → admin/trưởng dự án duyệt Đạt/Chưa đạt → người upload nhận thông báo
```

### E.4. Quản trị & an toàn dữ liệu
```
Xóa dự án/công việc → vào Thùng rác (soft-delete) → khôi phục được → sau 30 ngày tự xóa hẳn
Mọi thay đổi quan trọng → ghi Nhật ký kiểm toán (ai, làm gì, đổi từ giá trị nào sang giá trị nào)
```

---

## PHẦN F — TÓM TẮT NHANH

- **Cây dữ liệu:** Workspace → Phòng ban → Dự án → (Giai đoạn) → Công việc → (Subtask/Phụ thuộc/Bình luận/File/Giờ).
- **Xác thực:** tự làm — JWT + bcrypt + OTP email + **duyệt tài khoản thủ công**.
- **Phân quyền:** 2 tầng (workspace + dự án), 4 vai trò; **đổi trạng thái task chỉ ADMIN**; VIEWER chỉ đọc.
- **Realtime:** Socket.io 3 phòng (dự án/người dùng/workspace).
- **An toàn dữ liệu:** soft-delete + thùng rác tự dọn 30 ngày + audit log chi tiết.
- **Nâng cao:** phụ thuộc công việc (chống vòng lặp), giai đoạn dự án, phân tích/tóm tắt bằng AI (Gemini).
- **Báo cáo:** CSV (workspace & dự án), PDF, biểu đồ, báo cáo giờ theo người.
- **3 client** dùng chung 1 REST API: Web (React), Mobile (Flutter).
