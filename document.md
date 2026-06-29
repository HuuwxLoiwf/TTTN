# UMC Quản Lý Dự Án — Tài Liệu Hệ Thống

> Tài liệu phân tích kiến trúc, chức năng và luồng hoạt động của nền tảng quản lý dự án (Project Management SaaS).
> Phạm vi: **Server (Node/Express)**, **Client Web (React)**, và **App di động (Flutter)**.

---

## 1. Tổng quan

**UMC Quản Lý Dự Án** là một nền tảng quản lý dự án đa người thuê (multi-tenant SaaS) giúp các nhóm tổ chức công việc theo:

```
Workspace (Không gian làm việc / Tổ chức)
  └── Department (Phòng ban)
        └── Project (Dự án)
              └── Task (Công việc)
                    └── Subtask (Công việc con) / Comment / File / TimeLog
```

Mỗi **Workspace** tương ứng với một tổ chức (Clerk Organization). Người dùng đăng nhập qua **Clerk**, mọi dữ liệu được phân quyền theo vai trò thành viên trong workspace.

### Tính năng chính
- Quản lý nhiều workspace, phòng ban, dự án, công việc theo cấp bậc.
- Phân quyền 4 vai trò: **ADMIN / MANAGER / MEMBER / VIEWER** (RBAC).
- Bảng Kanban kéo-thả, danh sách công việc, lịch, biểu đồ Gantt (Timeline).
- **Realtime** (Socket.io): cập nhật task, bình luận, thông báo, chat nhóm, tiến độ dự án.
- Chat nhóm theo dự án (có đính kèm file, @mention, tóm tắt AI).
- Quy trình duyệt thành viên dự án (Member Request: PENDING/APPROVED/REJECTED).
- Quản lý tài liệu (upload local hoặc Cloudinary) + quy trình duyệt file (Đạt/Chưa đạt).
- Theo dõi thời gian (Time tracking), checklist công việc con (Subtask).
- Thông báo trong app + email; nhắc hạn công việc tự động.
- Báo cáo & xuất file: CSV, PDF; biểu đồ phân tích (Recharts), Burndown.
- Nhật ký hoạt động (Activity) + Nhật ký kiểm toán (Audit Log, chỉ ADMIN).
- Tích hợp **AI (Google Gemini)**: tóm tắt thảo luận, phân tích rủi ro dự án.

---

## 2. Kiến trúc tổng thể

```
                         ┌───────────────────────────────┐
                         │           Clerk                │
                         │  (Auth + Organizations)        │
                         └───────────────┬───────────────┘
                                         │ webhooks (user/org)
                                         ▼
   ┌──────────────┐   REST /api    ┌──────────────────────┐   Prisma   ┌──────────────┐
   │  Web Client  │◄──────────────►│   Express Server      │◄──────────►│ Neon Postgres│
   │  (React)     │   Socket.io    │   (Node, port 5000)   │            │              │
   │              │◄──────────────►│   + Socket.io + Inngest│           └──────────────┘
   └──────────────┘                └──────────┬────────────┘
                                              │
   ┌──────────────┐   REST /api               │ tích hợp ngoài:
   │ Flutter App  │◄──────────────────────────┤  • Gemini (AI)
   │ (Mobile)     │                           │  • Cloudinary / disk (file)
   └──────────────┘                           │  • Nodemailer (email)
                                              └  • Inngest (đồng bộ Clerk → DB)
```

### Ngăn xếp công nghệ (Tech Stack)

| Tầng | Công nghệ |
|------|-----------|
| **Frontend Web** | React 19, Redux Toolkit, React Router 7, Vite 7, Tailwind CSS v4, Recharts, jsPDF, lucide-react, react-hot-toast |
| **Backend** | Node.js, Express 5, Socket.io 4, Prisma 6 (ORM), Inngest (webhook), Multer (upload), Nodemailer (email) |
| **Database** | PostgreSQL (Neon serverless, qua `@prisma/adapter-neon`) |
| **Auth** | Clerk (`@clerk/clerk-react` ở client, `@clerk/backend` verifyToken ở server) |
| **Realtime** | Socket.io (websocket + polling) |
| **AI** | Google Gemini (`@google/genai`, model `gemini-2.0-flash`) |
| **Lưu trữ file** | Disk cục bộ (`/uploads`) hoặc Cloudinary (tự động nếu có env) |
| **Mobile** | Flutter (Dart) — gọi cùng REST API |

### Ngôn ngữ & Framework theo từng phần (chi tiết)

Hệ thống gồm **3 ứng dụng** dùng chung 1 backend. Tóm tắt "code bằng ngôn ngữ gì, framework gì":

| Phần | Ngôn ngữ | Framework / Runtime chính | Thư viện nền tảng |
|------|----------|---------------------------|-------------------|
| **Backend (API)** | **JavaScript** (Node.js ≥18, ES Modules) | **Express 5** trên Node.js | Prisma (ORM), Socket.io (realtime), Inngest, Multer, Nodemailer |
| **Frontend Web** | **JavaScript / JSX** | **React 19** (build bằng **Vite 7**) | Redux Toolkit (state), React Router 7 (định tuyến), Tailwind CSS v4 (giao diện) |
| **Mobile** | **Dart** (SDK ^3.7.0) | **Flutter** | Provider (state), http (gọi API), intl, flutter_svg |
| **Database** | SQL | **PostgreSQL** (Neon serverless) | truy cập qua Prisma + `@prisma/adapter-neon` |
| **Auth (dịch vụ ngoài)** | — | **Clerk** | `@clerk/clerk-react` (web), `@clerk/express`/`verifyToken` (server) |

**Chi tiết:**

- **Backend** — viết bằng **JavaScript thuần** chạy trên **Node.js** (không phải TypeScript), dùng cú pháp ES Modules (`import/export`, `"type": "module"`). Framework HTTP là **Express 5**. (Xem mục 3.0 để biết đầy đủ thư viện.)
- **Frontend Web** — viết bằng **JavaScript + JSX**, framework UI là **React 19**, công cụ build/dev-server là **Vite 7** (đọc `vite.config.js`: plugin `@vitejs/plugin-react` + `@tailwindcss/vite`, proxy `/api`, `/uploads`, `/socket.io` → cổng 5000). State quản lý bằng **Redux Toolkit**, định tuyến bằng **React Router 7**, giao diện bằng **Tailwind CSS v4**.
- **Mobile** — viết bằng **Dart**, framework là **Flutter** (Material Design). Quản lý state bằng **Provider**, gọi REST API bằng gói **http** (xem `pubspec.yaml` và `lib/app.dart`: `MaterialApp` + `ChangeNotifierProvider` ThemeProvider).
- **Database** — **PostgreSQL** lưu trên **Neon** (serverless), thao tác qua **Prisma ORM**.
- **Xác thực** — không tự code, dùng dịch vụ **Clerk** (đăng nhập + tổ chức), đồng bộ về DB qua webhook **Inngest**.

---

## 3. Backend — Cấu trúc & luồng xử lý

### 3.0. Ngôn ngữ & thư viện backend (code bằng gì)

- **Ngôn ngữ:** JavaScript (Node.js, yêu cầu `node >= 18`), dùng **ES Modules** (`"type": "module"` — cú pháp `import/export`).
- **Framework web:** Express 5.

#### Thư viện chạy thật (dependencies)

| Thư viện | Phiên bản | Dùng để làm gì | Dùng ở đâu |
|----------|-----------|----------------|------------|
| **express** | ^5.2.1 | Framework HTTP, định tuyến, middleware | `server.js`, toàn bộ `routes/` |
| **@prisma/client** | ^6.19.3 | ORM truy vấn CSDL (Prisma Client) | `configs/prisma.js`, mọi controller |
| **prisma** | ^6.19.3 | CLI/engine sinh client, `db push`, schema | dev/build (`postinstall`) |
| **@prisma/adapter-neon** | ^7.8.0 | Adapter kết nối Neon Postgres (serverless driver) | `configs/prisma.js` |
| **ws** | ^8.20.0 | WebSocket cho Neon serverless driver | nền tảng cho adapter Neon |
| **@clerk/express** | ^2.1.14 | Tích hợp Clerk; dùng `verifyToken` xác thực JWT | `server.js` (middleware auth) |
| **socket.io** | ^4.8.3 | Realtime hai chiều (room project/user/workspace) | `socket.js`, các controller emit |
| **inngest** | ^4.3.0 | Nhận webhook Clerk, đồng bộ user/organization → DB | `inngest/index.js`, `server.js` |
| **multer** | ^2.1.1 | Nhận upload file dạng multipart/form-data | `controllers/fileController.js`, `routes/files.js` |
| **cloudinary** | ^2.10.0 | Lưu file lên Cloudinary (nếu có cấu hình env) | `controllers/fileController.js` |
| **nodemailer** | ^8.0.11 | Gửi email (giao việc, thông báo) | `utils/emailService.js` |
| **@google/genai** | ^2.8.0 | Gọi Google Gemini cho tính năng AI | `controllers/aiController.js` |
| **cors** | ^2.8.6 | Cho phép truy cập chéo nguồn (CORS) | `server.js` |
| **dotenv** | ^17.4.2 | Nạp biến môi trường từ file `.env` | `server.js` (`import 'dotenv/config'`) |
| **express-rate-limit** | (cài thêm) | Giới hạn tần suất gọi API (300 req/15 phút/IP) | `server.js` |
| **jsonwebtoken / @clerk/backend** | (qua Clerk) | Xác minh JWT (`verifyToken`) | `server.js` |

> Ghi chú: ba thư viện báo cáo & PDF/biểu đồ (jspdf, jspdf-autotable, recharts) nằm ở **frontend**, không thuộc backend.

#### Thư viện phát triển (devDependencies)

| Thư viện | Phiên bản | Dùng để làm gì |
|----------|-----------|----------------|
| **nodemon** | ^3.1.14 | Tự khởi động lại server khi sửa code (`npm run server`) |
| **tsx** | ^4.21.0 | (chưa dùng tới — nằm trong danh sách dọn dẹp) |

#### Script npm (`server/package.json`)

| Script | Lệnh | Mục đích |
|--------|------|----------|
| `postinstall` | `npx prisma generate` | Sinh Prisma Client ngay sau khi cài |
| `start` | `prisma generate && node server.js` | Chạy production |
| `server` | `nodemon server.js` | Chạy dev (hot reload) |

### 3.1. Cấu trúc thư mục `server/`

```
server/
├── server.js              # Điểm vào: Express app, middleware auth, đăng ký routes
├── socket.js              # Khởi tạo Socket.io + helper emitToProject/User/Workspace
├── configs/prisma.js      # Khởi tạo Prisma Client (Neon adapter)
├── prisma/schema.prisma   # Định nghĩa schema CSDL
├── inngest/index.js       # Đồng bộ Clerk webhooks → DB (user, organization)
├── middleware/authz.js    # requireAuth, requireMember (RBAC)
├── utils/
│   ├── notify.js          # notifyUser, logActivity, logAudit, notifyMentions
│   └── emailService.js    # Gửi email (nodemailer)
├── routes/                # 14 file route ↔ controller
└── controllers/           # Logic nghiệp vụ
```

### 3.2. Pipeline của một request

`server.js` xử lý request theo thứ tự:

1. **`express.json()`** + **`cors`** (origin lấy từ `CLIENT_URL`, mặc định phản chiếu mọi origin).
2. **Rate limiting**: 300 request / 15 phút / IP cho mọi route `/api/*` (trừ webhook Inngest).
3. **Xác thực JWT thủ công** (middleware toàn cục): đọc `Authorization: Bearer <token>`, gọi `verifyToken` của Clerk (cho phép lệch giờ 10 phút), gán `req.auth = { userId, sessionId }`. Nếu không có/sai token → `req.auth.userId = null` (không chặn ngay, để route tự quyết).
4. **Static** `/uploads/*` (chỉ chạy local, không chạy trên Vercel serverless).
5. Định tuyến tới các router `/api/*`.

> Lưu ý môi trường: code có các guard `process.env.VERCEL` để tương thích serverless (tắt Socket.io & static file). Theo quyết định triển khai hiện tại, hệ thống **chạy cục bộ** (backend `npm run server`, client `npm run dev`), realtime hoạt động đầy đủ.

### 3.3. Xác thực & phân quyền (RBAC)

Phân quyền tập trung tại [`middleware/authz.js`](server/middleware/authz.js):

- **`requireAuth`** — chỉ yêu cầu đã đăng nhập (`req.auth.userId` tồn tại).
- **`requireMember({ from, param, role })`** — middleware factory:
  - `from`: nguồn để suy ra `workspaceId` — `'workspace' | 'project' | 'task' | 'comment' | 'department'`. Ví dụ `from: 'task'` sẽ truy ngược task → project → workspace.
  - Kiểm tra user có là thành viên workspace không (nếu không → **403**).
  - `role`: chuỗi hoặc mảng vai trò được phép (ví dụ `['ADMIN','MANAGER']`).
  - **VIEWER chỉ được GET** — mọi thao tác ghi (POST/PUT/DELETE) bị chặn 403.
  - Gán `req.workspaceId`, `req.memberRole` (và `req.commentOwnerId` khi `from: 'comment'`) để controller tái sử dụng.

**4 vai trò** (enum `WorkspaceRole`): `ADMIN`, `MANAGER`, `MEMBER`, `VIEWER`.

| Hành động | Quyền yêu cầu |
|-----------|---------------|
| Tạo/sửa/xóa workspace, mời/đổi vai trò/xóa thành viên | ADMIN |
| Xóa dự án, tạo/sửa/xóa phòng ban | ADMIN, MANAGER |
| Tạo/sửa dự án, tạo/sửa công việc, bình luận | MEMBER trở lên |
| Đổi **trạng thái** công việc | **Chỉ ADMIN** (kiểm tra trong `updateTask`) |
| Xem audit log | ADMIN |
| Mọi thao tác ghi | KHÔNG phải VIEWER |

### 3.4. Đồng bộ Clerk → DB (Inngest)

[`inngest/index.js`](server/inngest/index.js) lắng nghe webhook từ Clerk và đồng bộ vào Postgres:

- `clerk/user.created|updated|deleted` → tạo/cập nhật/xóa `User`.
- `clerk/organization.created` → tạo `Workspace` + thêm người tạo làm `WorkspaceMember` vai trò **ADMIN**.
- `clerk/organization.updated|deleted` → cập nhật/xóa `Workspace`.

Ngoài ra client còn gọi `POST /api/users/sync` mỗi lần đăng nhập (upsert user) để đảm bảo ràng buộc khóa ngoại hoạt động ngay cả khi webhook chưa kịp chạy.

### 3.5. Realtime (Socket.io)

[`socket.js`](server/socket.js) định nghĩa 3 loại "phòng" (room):

| Room | Mục đích | Sự kiện phát |
|------|----------|---------------|
| `project:{id}` | Trong 1 dự án | `task:created`, `task:updated`, `task:deleted`, `tasks:bulkDeleted`, `comment:added`, `projectMessage:new`, `project:progress` |
| `user:{id}` | Thông báo cá nhân | `notification:new` |
| `workspace:{id}` | Bảng tin hoạt động | `activity:new` |

Client emit `join:project`, `join:user`, `join:workspace` để vào phòng. Controller dùng helper `emitToProject / emitToUser / emitToWorkspace` để đẩy realtime.

### 3.6. Tiện ích chéo (`utils/notify.js`)

- **`notifyUser`** — tạo `Notification` trong DB + emit `notification:new` (bỏ qua nếu tự thông báo cho chính mình).
- **`logActivity`** — ghi bảng `Activity` (tự resolve `workspaceId` từ `projectId`) + emit `activity:new`.
- **`logAudit`** — ghi `AuditLog` chi tiết (action CREATE/UPDATE/DELETE, entityType, thay đổi từng trường dạng JSON `{field: {old, new}}`).
- **`notifyMentions`** — quét `@email`/`@tên` trong nội dung bình luận/chat, thông báo cho thành viên dự án được nhắc đến.

---

## 4. Mô hình dữ liệu (Prisma Schema)

Nguồn: [`server/prisma/schema.prisma`](server/prisma/schema.prisma)

### 4.1. Các bảng (models)

| Model | Vai trò | Quan hệ chính |
|-------|---------|----------------|
| **User** | Người dùng (id = Clerk user id) | có nhiều WorkspaceMember, Task, Comment... |
| **Workspace** | Tổ chức / không gian làm việc | có nhiều Member, Project, Department, Activity, AuditLog |
| **Department** | Phòng ban (trong workspace) | thuộc Workspace, có nhiều Project. `@@unique([workspaceId, name])` |
| **WorkspaceMember** | Thành viên + vai trò | nối User↔Workspace, có `role`. `@@unique([userId, workspaceId])` |
| **Project** | Dự án | thuộc Workspace + Department, có `team_lead` (owner), `progress`, status, priority |
| **ProjectMember** | Thành viên dự án | nối User↔Project. `@@unique([userId, projectId])` |
| **ProjectMemberRequest** | Yêu cầu vào dự án | status PENDING/APPROVED/REJECTED |
| **ProjectMessage** | Tin nhắn chat nhóm dự án | có `fileUrl/fileName` (đính kèm) |
| **Task** | Công việc | thuộc Project, có assignee, status, type, priority, due_date |
| **Subtask** | Công việc con (checklist) | thuộc Task, có `done` |
| **TimeLog** | Bản ghi thời gian làm việc | thuộc Task + User, có `minutes`, `workDate` |
| **Comment** | Bình luận trên task | thuộc Task + User |
| **File** | Tài liệu | gắn Project hoặc Task, có `reviewStatus` (PENDING/APPROVED/REJECTED) |
| **Activity** | Nhật ký hoạt động (feed) | thuộc Workspace + User |
| **AuditLog** | Nhật ký kiểm toán | action/entityType/entityId/entityName/changes(JSON) |
| **Notification** | Thông báo cá nhân | thuộc User, có `isRead` |

### 4.2. Enum

- `WorkspaceRole`: ADMIN, MANAGER, MEMBER, VIEWER
- `TaskStatus`: TODO, IN_PROGRESS, REVIEW, DONE
- `TaskType`: TASK, BUG, FEATURE, IMPROVEMENT, OTHER
- `ProjectStatus`: ACTIVE, PLANNING, COMPLETED, ON_HOLD, CANCELLED
- `Priority`: LOW, MEDIUM, HIGH
- `RequestStatus` / `FileReviewStatus`: PENDING, APPROVED, REJECTED

> Cascade: xóa Workspace → xóa toàn bộ Project/Member/Department; xóa Project → xóa Task/File/Message; xóa Task → xóa Subtask/Comment/TimeLog. Xóa Department → `Project.departmentId = null` (SetNull).

---

## 5. API — Danh mục endpoint

Tất cả đặt dưới tiền tố `/api`. Cột "Quyền" mô tả middleware áp dụng.

### Users
| Method | Path | Quyền | Chức năng |
|--------|------|-------|-----------|
| POST | `/users/sync` | — | Upsert user vào DB khi đăng nhập |

### Workspaces
| Method | Path | Quyền | Chức năng |
|--------|------|-------|-----------|
| GET | `/workspaces` | auth | Danh sách workspace của tôi |
| GET | `/workspaces/:id` | member | Chi tiết workspace |
| POST | `/workspaces` | auth | Tạo workspace |
| PUT | `/workspaces/:id` | ADMIN | Sửa |
| DELETE | `/workspaces/:id` | ADMIN | Xóa |
| POST | `/workspaces/:id/members` | ADMIN | Mời thành viên |
| PUT | `/workspaces/:id/members/:memberId` | ADMIN | Đổi vai trò |
| DELETE | `/workspaces/:id/members/:memberId` | ADMIN | Xóa thành viên |

### Departments
| Method | Path | Quyền | Chức năng |
|--------|------|-------|-----------|
| GET | `/departments/workspace/:workspaceId` | member | Danh sách phòng ban |
| POST | `/departments/workspace/:workspaceId` | ADMIN/MANAGER | Tạo |
| PUT | `/departments/:id` | ADMIN/MANAGER | Sửa |
| DELETE | `/departments/:id` | ADMIN/MANAGER | Xóa |

### Projects
| Method | Path | Quyền | Chức năng |
|--------|------|-------|-----------|
| GET | `/projects/workspace/:workspaceId` | member | Danh sách dự án |
| GET | `/projects/:id` | project member | Chi tiết |
| POST | `/projects/workspace/:workspaceId` | member | Tạo (bắt buộc chọn phòng ban; ngày bắt đầu ≥ hôm nay) |
| PUT | `/projects/:id` | project member | Sửa (ghi audit thay đổi) |
| DELETE | `/projects/:id` | ADMIN/MANAGER | Xóa |
| POST | `/projects/:id/members` | project member | Thêm thành viên (theo email) |
| DELETE | `/projects/:id/members/:memberId` | project member | Xóa thành viên |

### Tasks
| Method | Path | Quyền | Chức năng |
|--------|------|-------|-----------|
| GET | `/tasks/project/:projectId` | member | Danh sách công việc |
| GET | `/tasks/:id` | member | Chi tiết (kèm bình luận) |
| POST | `/tasks/project/:projectId` | member | Tạo (mặc định gán cho người tạo) |
| PUT | `/tasks/:id` | member | Sửa (đổi **status** chỉ ADMIN) |
| DELETE | `/tasks/:id` | member | Xóa |
| POST | `/tasks/bulk-delete` | auth | Xóa nhiều (lọc theo workspace user là thành viên) |

### Comments / Activities / Notifications
| Method | Path | Quyền | Chức năng |
|--------|------|-------|-----------|
| GET/POST | `/comments/task/:taskId` | member | Xem / thêm bình luận |
| DELETE | `/comments/:id` | comment owner/admin | Xóa bình luận |
| GET | `/activities/workspace/:workspaceId` | member | Bảng tin hoạt động |
| GET | `/activities/audit/:workspaceId` | ADMIN | Nhật ký kiểm toán |
| POST | `/activities/workspace/:workspaceId` | member | Ghi activity |
| GET | `/notifications` | auth | Thông báo của tôi |
| GET | `/notifications/check-due` | auth | Quét task sắp/quá hạn → tạo thông báo (dedup 12h) |
| PUT | `/notifications/:id/read`, `/read-all` | auth | Đánh dấu đã đọc |

### Files / Member Requests / Project Messages / Time Logs / Subtasks / AI
| Method | Path | Quyền | Chức năng |
|--------|------|-------|-----------|
| GET | `/files?projectId=` | auth | Danh sách file |
| POST | `/files/upload` | auth | Upload (multipart, whitelist loại file, ≤ giới hạn) |
| PUT | `/files/:id/review` | admin/lead | Duyệt file (Đạt/Chưa đạt) |
| DELETE | `/files/:id` | auth | Xóa |
| GET/POST | `/member-requests/project/:projectId` | member | Xem / gửi yêu cầu vào dự án |
| PUT | `/member-requests/:id/approve\|reject` | admin/lead | Duyệt/từ chối |
| GET/POST | `/project-messages/project/:projectId` | member | Chat nhóm (phân trang `?before`, 30/lần) |
| GET/POST | `/time-logs/task/:taskId` | member | Xem / ghi thời gian |
| GET | `/time-logs/project/:projectId/report` | member | Báo cáo giờ theo người |
| DELETE | `/time-logs/:id` | owner | Xóa bản ghi của mình |
| GET/POST/PUT/DELETE | `/subtasks/...` | member | CRUD checklist |
| GET | `/ai/summarize/:projectId` | member | Tóm tắt thảo luận (Gemini) |
| GET | `/ai/analyze/:projectId` | member | Phân tích rủi ro dự án (Gemini) |

> AI trả về **503** nếu chưa cấu hình `GEMINI_API_KEY` (graceful degradation).

---

## 6. Frontend Web — Cấu trúc & luồng

### 6.1. Cấu trúc `client/src/`

```
src/
├── main.jsx               # Bọc: BrowserRouter → ClerkProvider → Redux Provider → App
├── App.jsx                # Định tuyến (lazy load các trang)
├── app/store.js           # Redux store
├── features/
│   ├── workspaceSlice.js  # State trung tâm: workspaces, currentWorkspace
│   └── themeSlice.js      # Sáng/tối
├── lib/
│   ├── api.js             # apiFetch(token, path, opts) — wrapper fetch + JWT
│   └── socket.js          # getSocket() + join/leave room
├── pages/                 # Layout, Dashboard, Projects, ProjectDetails, TaskDetails,
│                          #   Team, MyTasks, AuditLog, Settings
└── components/            # ~40 component (Kanban, Gantt, Chat, Calendar, charts...)
```

### 6.2. Khởi động & nạp dữ liệu

1. [`main.jsx`](client/src/main.jsx) bọc app trong `ClerkProvider` (Clerk lo đăng nhập) + Redux.
2. [`Layout.jsx`](client/src/pages/Layout.jsx):
   - Nếu chưa đăng nhập → hiện `<SignIn/>` của Clerk.
   - Khi đã đăng nhập: gọi `POST /users/sync`, rồi `GET /workspaces`, lưu vào Redux. Chọn workspace từ `localStorage` (`currentWorkspaceId`) hoặc workspace đầu tiên.
3. Toàn bộ trang con render trong `<Outlet/>` (Sidebar + Navbar bao quanh).

### 6.3. Gọi API & realtime ở client

- [`lib/api.js`](client/src/lib/api.js): `apiFetch(token, path, {method, body})` tự gắn `Authorization: Bearer <token>` (token lấy từ Clerk `getToken()`), parse JSON, ném lỗi tiếng Việt. Hằng `API_BASE_URL` dùng cho upload FormData.
- [`lib/socket.js`](client/src/lib/socket.js): singleton socket, helper `joinProject/joinUser/joinWorkspace`. Component lắng nghe sự kiện để cập nhật UI tức thì.
- **Redux ([`workspaceSlice`](client/src/features/workspaceSlice.js))** là nguồn dữ liệu chính ở client: `workspaces`, `currentWorkspace` cùng các reducer add/update/remove cho project, task, member, và `setProjectProgress` (đồng bộ từ sự kiện `project:progress`).

### 6.4. Bản đồ trang (routes)

| Route | Trang | Nội dung |
|-------|-------|----------|
| `/` | Dashboard | Tổng quan: thống kê, hoạt động gần đây, thống kê phòng ban, nút xuất báo cáo workspace |
| `/projects` | Projects | Danh sách dự án (lọc theo phòng ban), tạo dự án |
| `/projectsDetail` | ProjectDetails | Chi tiết 1 dự án — **các tab bên dưới** |
| `/taskDetails` | TaskDetails | Chi tiết công việc: mô tả, bình luận, subtask, time log |
| `/team` | Team | Quản lý thành viên workspace, vai trò, lời mời |
| `/my-tasks` | MyTasks | Mọi công việc được giao cho tôi (xuyên dự án) |
| `/audit-log` | AuditLog | Nhật ký kiểm toán (chỉ ADMIN) |
| `/settings` | Settings | Cài đặt cá nhân/workspace |

**Các tab trong ProjectDetails:** Công việc (list) · Kanban (kéo-thả) · Lịch (Calendar) · Timeline (Gantt) · Phân tích (Analytics + CSV/PDF + AI) · Tài liệu (Files + duyệt) · Thảo luận (Chat nhóm).

---

## 7. Các luồng nghiệp vụ quan trọng

### 7.1. Đăng nhập → vào hệ thống
```
User đăng nhập (Clerk UI)
  → Clerk webhook → Inngest → tạo User/Workspace trong DB (nếu là tổ chức mới)
  → Client: getToken() → POST /users/sync (đảm bảo user có trong DB)
  → GET /workspaces → nạp Redux → chọn currentWorkspace → render Dashboard
```

### 7.2. Tạo & vận hành công việc (Task) — realtime
```
Tạo task: POST /tasks/project/:projectId
  → tạo Task (mặc định assignee = người tạo)
  → emit task:created tới room project:{id}  ── mọi client trong dự án thấy ngay
  → recalcProjectProgress() → emit project:progress
  → logActivity (feed) + notifyUser assignee (+ email nếu cấu hình)

Đổi trạng thái (chỉ ADMIN): PUT /tasks/:id {status}
  → cập nhật → emit task:updated → recalc progress → logActivity
```
**Tiến độ dự án** = `% task ở trạng thái DONE`, tự tính lại mỗi khi tạo/đổi status/xóa task (`recalcProjectProgress`).

### 7.3. Thêm thành viên dự án có duyệt
```
ADMIN/Trưởng dự án: thêm trực tiếp (POST /projects/:id/members)
Thành viên thường:  tạo ProjectMemberRequest (PENDING)
  → admin/lead PUT /member-requests/:id/approve  → thêm vào ProjectMember + notify
                 hoặc /reject (kèm ghi chú)
```

### 7.4. Chat nhóm + AI
```
Gửi tin: POST /project-messages/project/:id (có thể kèm fileUrl)
  → lưu ProjectMessage → emit projectMessage:new → notifyMentions(@email)
Tải tin cũ: GET ...?before=<cursor> (phân trang 30 tin, không nhảy scroll)
Tóm tắt AI: GET /ai/summarize/:id → Gemini đọc tối đa 200 tin → trả tóm tắt tiếng Việt
```

### 7.5. Quản lý & duyệt tài liệu
```
Upload: POST /files/upload (multipart)
  → fileFilter whitelist (ảnh/pdf/doc/xls/ppt/zip; chặn .exe)
  → lưu Cloudinary (nếu có CLOUDINARY_* env) HOẶC disk /uploads
Duyệt: PUT /files/:id/review {reviewStatus, reviewNote} (admin/lead)
  → ProjectFiles hiển thị badge Đạt/Chưa đạt
```

### 7.6. Nhắc hạn công việc
```
NotificationBell (client) mount → GET /notifications/check-due
  → server quét task của tôi: due ≤ 24h hoặc đã quá hạn & chưa DONE
  → tạo Notification (chống trùng trong 12h)
```

---

## 8. Tích hợp ngoài & cấu hình môi trường

### Biến môi trường Server (`server/.env`)
| Biến | Bắt buộc | Mục đích |
|------|----------|----------|
| `DATABASE_URL`, `DIRECT_URL` | ✅ | Kết nối Neon Postgres (Prisma) |
| `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` | ✅ | Xác thực JWT (verifyToken) |
| `CLIENT_URL` | tùy | Origin CORS được phép (nhiều domain cách bằng dấu phẩy) |
| `PORT` | tùy | Mặc định 5000 |
| `EMAIL_USER`, `EMAIL_PASS` | tùy | Gửi email (Nodemailer) |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | tùy | Bật lưu file lên Cloudinary |
| `GEMINI_API_KEY` | tùy | Bật tính năng AI (lấy miễn phí ở aistudio.google.com) |
| `VERCEL` | tự sinh | Khi chạy serverless: tắt Socket.io + static |

### Biến môi trường Client (`client/.env`)
| Biến | Mục đích |
|------|----------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Khởi tạo Clerk ở frontend |
| `VITE_API_URL` | URL server khi production. Bỏ trống ở dev → Vite proxy `/api`, `/uploads`, `/socket.io` → `localhost:5000` |

### Bảo mật
- Rate limit 300 req/15 phút/IP trên `/api`.
- Phân quyền RBAC ở mọi route ghi (authz.js); VIEWER chỉ đọc.
- Validate đầu vào (độ dài tên dự án/tiêu đề task, ngày bắt đầu không trong quá khứ, phòng ban bắt buộc).
- `bulk-delete` lọc lại theo workspace user là thành viên (chống xóa chéo workspace).
- Whitelist loại file upload, chặn thực thi (.exe).

---

## 9. Ứng dụng di động (Flutter)

Thư mục [`flutter_project_management/`](flutter_project_management/) là client di động viết bằng **Flutter (Dart)**, gọi **cùng REST API** với web. Cấu trúc `lib/`:

```
lib/
├── main.dart        # Điểm vào ứng dụng
├── app.dart         # Cấu hình app / theme / routing
├── models/          # Model dữ liệu (Project, Task...)
├── providers/       # Quản lý state
├── services/        # Gọi API (HTTP) tới backend
├── screens/         # Các màn hình
└── widgets/         # Component dùng lại
```

App di động chia sẻ backend, mô hình dữ liệu và logic phân quyền với web; khác biệt chủ yếu ở tầng UI (Flutter widget thay vì React component).

---

## 10. Chạy dự án (local)

```bash
# Backend (port 5000)
cd server
npm install
npx prisma generate          # sinh Prisma Client
npx prisma db push           # đẩy schema lên Neon (không dùng thư mục migrations)
npm run server               # nodemon server.js

# Frontend Web (port 5173)
cd client
npm install
npm run dev                  # Vite, proxy /api → 5000

# (Tùy chọn) chạy cả hai từ gốc
./run.bat
```

> Realtime (Socket.io) hoạt động đầy đủ khi chạy local. Tin nhắn chat lưu trong DB (`ProjectMessage`). Tính năng AI cần thêm `GEMINI_API_KEY`.

---

## 11. Tóm tắt nhanh (cheat sheet)

- **Cây dữ liệu:** Workspace → Department → Project → Task → (Subtask/Comment/File/TimeLog).
- **Auth:** Clerk (frontend) + verifyToken (backend); user/org đồng bộ qua Inngest.
- **Phân quyền:** 4 vai trò; đổi status task chỉ ADMIN; VIEWER chỉ đọc; xóa dự án ADMIN/MANAGER.
- **Realtime:** 3 room (project/user/workspace) qua Socket.io.
- **AI:** Google Gemini — tóm tắt chat & phân tích dự án.
- **Lưu file:** disk hoặc Cloudinary; có quy trình duyệt file.
- **Tiến độ dự án:** % task DONE, tự tính lại.
- **3 client:** Web (React), Mobile (Flutter) — cùng một REST API.
