# Hướng dẫn deploy — Backend (Railway) + Client (Vercel)

Backend chạy trên **Railway** (có WebSocket + ổ đĩa → chat/thông báo realtime + upload file hoạt động).
Client chạy trên **Vercel**.

---

## A. Deploy Backend lên Railway

### 1. Tạo service
- Vào https://railway.app → **New Project** → **Deploy from GitHub repo** → chọn repo của bạn.
- **Root Directory**: đặt là `server` (vì code backend nằm trong thư mục `server/`).
- Railway tự chạy `npm install` (→ `postinstall` generate Prisma) rồi `npm start`.
- Không cần Dockerfile. Không cần đổi PORT (Railway tự cấp `PORT`, code đã đọc `process.env.PORT`).

### 2. Biến môi trường (Variables) trên Railway
Thêm các biến sau (lấy đúng giá trị đang dùng ở Vercel hiện tại):

| Biến | Giá trị |
|------|---------|
| `DATABASE_URL` | Connection string Neon (pooled) — giống Vercel |
| `DIRECT_URL` | Connection string Neon (direct) — giống Vercel |
| `CLERK_SECRET_KEY` | Secret key Clerk |
| `CLERK_PUBLISHABLE_KEY` | Publishable key Clerk |
| `CLIENT_URL` | URL client Vercel, ví dụ `https://your-app.vercel.app` (điền sau khi deploy client) |
| `EMAIL_USER` | (tùy chọn) email gửi thông báo |
| `EMAIL_PASS` | (tùy chọn) app password |
| `EMAIL_HOST` | (tùy chọn) mặc định smtp.gmail.com |
| `EMAIL_PORT` | (tùy chọn) mặc định 587 |

> **QUAN TRỌNG — KHÔNG** đặt biến `VERCEL` trên Railway. Code dùng cờ `VERCEL` để tắt
> Socket.io/upload/listen. Trên Railway biến này không có → mọi thứ tự bật lại.

### 3. Đẩy schema lên DB (chạy 1 lần, từ máy bạn)
Vì dự án dùng `prisma db push` (không có thư mục migrations), khi schema đổi cần chạy:
```bash
cd server
npx prisma db push
```
(Dùng chung Neon DB nên chỉ cần chạy 1 nơi — đã chạy rồi thì bỏ qua.)

### 4. Lấy domain backend
Sau khi deploy xong, Railway cho domain dạng `https://your-server.up.railway.app`.
→ Mở thử `https://your-server.up.railway.app/api/debug` để kiểm tra env đã nạp đúng chưa.

---

## B. Deploy Client lên Vercel

### 1. Tạo project Vercel
- **New Project** → chọn cùng repo.
- **Root Directory**: `client`
- Framework: Vite (tự nhận). Build command `npm run build`, output `dist`.

### 2. Biến môi trường trên Vercel (client)
| Biến | Giá trị |
|------|---------|
| `VITE_API_URL` | Domain backend Railway, ví dụ `https://your-server.up.railway.app` (KHÔNG có `/api` ở cuối) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Publishable key Clerk (nếu client dùng — kiểm tra main.jsx) |

> `VITE_API_URL` được dùng cho cả gọi API (`/api/...`) và kết nối Socket.io. Không thêm `/api`.

### 3. Sau khi có domain client
Quay lại Railway, cập nhật `CLIENT_URL` = domain Vercel để CORS cho phép.

---

## C. Clerk + Inngest
- **Clerk**: thêm domain client Vercel vào danh sách domain cho phép trong Clerk Dashboard.
- **Inngest**: webhook trỏ tới backend Railway: `https://your-server.up.railway.app/api/inngest`.

---

## D. Kiểm tra sau deploy
1. Mở client Vercel → đăng nhập (Clerk).
2. Tạo dự án, tạo task → kéo Kanban → tiến độ tự cập nhật.
3. Mở tab **Thảo luận** ở 2 trình duyệt → chat hiện realtime (xác nhận Socket.io chạy).
4. Tab **Tài liệu** → upload file → tải lại được (xác nhận ổ đĩa Railway).
5. Chuông thông báo nhảy số khi được giao task.

> Lưu ý ổ đĩa Railway: mặc định ổ đĩa ephemeral (mất khi redeploy). Nếu cần giữ file
> vĩnh viễn qua các lần deploy, gắn **Railway Volume** vào đường dẫn `server/uploads`,
> hoặc chuyển sang Cloudinary sau.
