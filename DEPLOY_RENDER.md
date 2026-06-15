# Hướng dẫn deploy — Backend (Render, free) + Client (Vercel)

Backend chạy trên **Render** (gói free, có WebSocket → chat/thông báo realtime hoạt động).
Client chạy trên **Vercel**.

> ⚠️ Lưu ý gói FREE của Render:
> - Service **ngủ sau ~15 phút** không có request → request đầu tiên sau đó phải đợi ~30–50s khởi động lại. Bình thường với demo/đồ án.
> - Ổ đĩa **ephemeral**: file upload **mất khi service restart/ngủ**. Muốn giữ file lâu dài → dùng Cloudinary (làm sau).

---

## A. Deploy Backend lên Render

### Cách 1 — Dùng render.yaml (tự động, khuyến nghị)
Repo đã có sẵn file `render.yaml` ở gốc, trỏ vào thư mục `server`.
1. Vào https://render.com → đăng nhập bằng GitHub.
2. **New +** → **Blueprint**.
3. Chọn repo **`HuuwxLoiwf/TTTN`**.
4. Render đọc `render.yaml` → tạo sẵn service **tttn-backend**.
5. Nó sẽ hỏi điền các biến môi trường (xem bảng bên dưới) → điền → **Apply**.

### Cách 2 — Tạo Web Service thủ công
1. **New +** → **Web Service** → chọn repo `TTTN`.
2. Cấu hình:
   - **Root Directory**: `server`   ← QUAN TRỌNG
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start`
   - **Plan**: Free
3. Thêm biến môi trường (mục Environment) → bảng dưới.
4. **Create Web Service**.

### Biến môi trường (Environment Variables)
Lấy giá trị y hệt từ Vercel backend cũ (Settings → Environment Variables):

| Biến | Lấy từ đâu |
|------|-----------|
| `DATABASE_URL` | Neon (pooled) — giống Vercel |
| `DIRECT_URL` | Neon (direct) — giống Vercel |
| `CLERK_SECRET_KEY` | Clerk |
| `CLERK_PUBLISHABLE_KEY` | Clerk |
| `CLIENT_URL` | URL client Vercel (điền sau khi deploy client) |
| `EMAIL_USER` / `EMAIL_PASS` | (tùy chọn) gửi email |

> KHÔNG đặt biến `VERCEL`. Code dùng cờ đó để tắt Socket.io/upload — trên Render không
> được có nó thì mọi thứ mới bật.

### Lấy domain backend
Sau khi deploy xong, Render cho domain dạng `https://tttn-backend.onrender.com`.
→ Mở `https://tttn-backend.onrender.com/api/debug` để kiểm tra env nạp đúng chưa
(thấy `{"hasSecretKey":true,"hasDatabase":true,...}` là ok).

---

## B. Deploy Client lên Vercel
1. Vercel → **New Project** → chọn repo `TTTN`.
2. **Root Directory**: `client`
3. Biến môi trường:
   | Biến | Giá trị |
   |------|---------|
   | `VITE_API_URL` | Domain Render, ví dụ `https://tttn-backend.onrender.com` (KHÔNG có `/api` cuối) |
   | `VITE_CLERK_PUBLISHABLE_KEY` | Publishable key Clerk (nếu client cần) |
4. Deploy → lấy domain client.

## C. Nối lại sau khi có domain client
- **Render**: cập nhật `CLIENT_URL` = domain Vercel (cho CORS).
- **Clerk Dashboard**: thêm domain Vercel vào danh sách cho phép.
- **Inngest**: webhook trỏ tới `https://tttn-backend.onrender.com/api/inngest`.

---

## D. Kiểm tra sau deploy
1. Mở client → đăng nhập.
2. Tạo dự án, kéo Kanban → tiến độ tự cập nhật.
3. Tab **Thảo luận** mở 2 trình duyệt → chat realtime.
4. Tab **Tài liệu** → upload (nhớ: file mất khi service ngủ trên gói free).
5. Chuông thông báo nhảy số khi được giao task.
