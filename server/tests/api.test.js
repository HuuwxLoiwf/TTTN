/**
 * Bộ test tích hợp API — chạy trên Express app thật + DB thật (Neon).
 * Dữ liệu test dùng email @umc-test.local riêng biệt, dọn sạch trong afterAll
 * (xóa user test → cascade xóa toàn bộ workspace/project/task liên quan).
 *
 * Chạy: npm test  (trong thư mục server/)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../server.js";
import prisma from "../configs/prisma.js";
import { JWT_SECRET } from "../controllers/authController.js";

const ts = Date.now();
const EMAIL_A = `test-a-${ts}@umc-test.local`;   // chủ workspace (ADMIN)
const EMAIL_B = `test-b-${ts}@umc-test.local`;   // người ngoài → sau thành VIEWER
const EMAIL_REG = `test-reg-${ts}@umc-test.local`; // test luồng đăng ký

let userA, userB, tokenA, tokenB;
let workspaceId, departmentId, projectId;
let taskA, taskB, taskC;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
    const hash = await bcrypt.hash("test1234", 10);
    userA = await prisma.user.create({
        data: { name: "Test A", email: EMAIL_A, password: hash, emailVerified: true, approved: true },
    });
    userB = await prisma.user.create({
        data: { name: "Test B", email: EMAIL_B, password: hash, emailVerified: true, approved: true },
    });
    tokenA = jwt.sign({ sub: userA.id }, JWT_SECRET);
    tokenB = jwt.sign({ sub: userB.id }, JWT_SECRET);
});

afterAll(async () => {
    // Xóa user test → cascade dọn toàn bộ dữ liệu liên quan
    await prisma.user.deleteMany({ where: { email: { in: [EMAIL_A, EMAIL_B, EMAIL_REG] } } });
    await prisma.$disconnect();
});

describe("Xác thực (auth)", () => {
    it("đăng ký thiếu trường → 400", async () => {
        const res = await request(app).post("/api/auth/register").send({ email: EMAIL_REG });
        expect(res.status).toBe(400);
    });

    it("đăng ký email sai định dạng → 400", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ name: "X", email: "khong-phai-email", password: "1234" });
        expect(res.status).toBe(400);
    });

    it("đăng ký mật khẩu yếu (không đủ 8 ký tự chữ+số) → 400", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ name: "Weak", email: EMAIL_REG, password: "1234" });
        expect(res.status).toBe(400);
    });

    it("đăng ký hợp lệ → 201 + OTP dev, xác minh OTP → chờ duyệt", async () => {
        const reg = await request(app)
            .post("/api/auth/register")
            .send({ name: "Reg", email: EMAIL_REG, password: "test1234" });
        expect(reg.status).toBe(201);
        expect(reg.body.devOtp).toBeTruthy(); // email chưa cấu hình → trả OTP để test

        const verify = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email: EMAIL_REG, otp: reg.body.devOtp });
        expect(verify.status).toBe(200);
        expect(verify.body.pendingApproval).toBe(true);
    });

    it("đăng nhập khi CHƯA được duyệt → 403", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: EMAIL_REG, password: "test1234" });
        expect(res.status).toBe(403);
    });

    it("đăng nhập đúng (đã duyệt) → 200 + token, không lộ password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: EMAIL_A, password: "test1234" });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeTruthy();
        expect(res.body.user.password).toBeUndefined();
    });

    it("gọi API không có token → 401", async () => {
        const res = await request(app).get("/api/workspaces");
        expect(res.status).toBe(401);
    });
});

describe("Workspace / Dự án / Phân quyền", () => {
    it("tạo workspace → 201, người tạo là ADMIN", async () => {
        const res = await request(app)
            .post("/api/workspaces")
            .set(auth(tokenA))
            .send({ name: `WS Test ${ts}` });
        expect(res.status).toBe(201);
        workspaceId = res.body.id;
        const me = res.body.members.find((m) => m.userId === userA.id);
        expect(me.role).toBe("ADMIN");
    });

    it("tạo dự án KHÔNG có phòng ban → 400", async () => {
        const res = await request(app)
            .post(`/api/projects/workspace/${workspaceId}`)
            .set(auth(tokenA))
            .send({ name: "Dự án thiếu phòng ban" });
        expect(res.status).toBe(400);
    });

    it("tạo phòng ban + dự án hợp lệ → 201", async () => {
        const dept = await request(app)
            .post(`/api/departments/workspace/${workspaceId}`)
            .set(auth(tokenA))
            .send({ name: `Phòng Test ${ts}` });
        expect(dept.status).toBe(201);
        departmentId = dept.body.id;

        const proj = await request(app)
            .post(`/api/projects/workspace/${workspaceId}`)
            .set(auth(tokenA))
            .send({ name: "Dự án Test", departmentId });
        expect(proj.status).toBe(201);
        projectId = proj.body.id;
    });

    it("người NGOÀI workspace xem dự án → 403 (chống IDOR)", async () => {
        const res = await request(app).get(`/api/projects/${projectId}`).set(auth(tokenB));
        expect(res.status).toBe(403);
    });

    it("VIEWER chỉ được xem, không được tạo task → 403", async () => {
        // Mời userB làm VIEWER
        const invite = await request(app)
            .post(`/api/workspaces/${workspaceId}/members`)
            .set(auth(tokenA))
            .send({ email: EMAIL_B, role: "VIEWER" });
        expect(invite.status).toBe(201);

        // VIEWER đọc được dự án
        const read = await request(app).get(`/api/projects/${projectId}`).set(auth(tokenB));
        expect(read.status).toBe(200);

        // VIEWER không tạo được task
        const write = await request(app)
            .post(`/api/tasks/project/${projectId}`)
            .set(auth(tokenB))
            .send({ title: "Task của viewer" });
        expect(write.status).toBe(403);
    });
});

describe("Công việc / Tiến độ / Phụ thuộc", () => {
    it("tạo task → 201 và xuất hiện trong danh sách", async () => {
        const res = await request(app)
            .post(`/api/tasks/project/${projectId}`)
            .set(auth(tokenA))
            .send({ title: "Task A" });
        expect(res.status).toBe(201);
        taskA = res.body;

        const list = await request(app).get(`/api/tasks/project/${projectId}`).set(auth(tokenA));
        expect(list.body.some((t) => t.id === taskA.id)).toBe(true);
    });

    it("task tiêu đề rỗng → 400", async () => {
        const res = await request(app)
            .post(`/api/tasks/project/${projectId}`)
            .set(auth(tokenA))
            .send({ title: "   " });
        expect(res.status).toBe(400);
    });

    it("hoàn thành 100% task → progress=100 và dự án tự COMPLETED", async () => {
        const upd = await request(app)
            .put(`/api/tasks/${taskA.id}`)
            .set(auth(tokenA))
            .send({ status: "DONE" });
        expect(upd.status).toBe(200);

        const proj = await request(app).get(`/api/projects/${projectId}`).set(auth(tokenA));
        expect(proj.body.progress).toBe(100);
        expect(proj.body.status).toBe("COMPLETED");
    });

    it("chặn DONE khi việc tiên quyết chưa xong + chặn vòng lặp phụ thuộc", async () => {
        const b = await request(app).post(`/api/tasks/project/${projectId}`).set(auth(tokenA)).send({ title: "Task B" });
        const c = await request(app).post(`/api/tasks/project/${projectId}`).set(auth(tokenA)).send({ title: "Task C" });
        taskB = b.body;
        taskC = c.body;

        // C phụ thuộc B
        const dep = await request(app)
            .post(`/api/dependencies/task/${taskC.id}`)
            .set(auth(tokenA))
            .send({ dependsOnId: taskB.id });
        expect(dep.status).toBe(201);

        // C không thể DONE khi B chưa xong
        const done = await request(app).put(`/api/tasks/${taskC.id}`).set(auth(tokenA)).send({ status: "DONE" });
        expect(done.status).toBe(400);

        // B phụ thuộc ngược lại C → vòng lặp → 400
        const cycle = await request(app)
            .post(`/api/dependencies/task/${taskB.id}`)
            .set(auth(tokenA))
            .send({ dependsOnId: taskC.id });
        expect(cycle.status).toBe(400);
    });
});

describe("Thùng rác (soft-delete)", () => {
    it("xóa task → biến khỏi danh sách, nằm trong thùng rác, khôi phục lại được", async () => {
        const del = await request(app).delete(`/api/tasks/${taskB.id}`).set(auth(tokenA));
        expect(del.status).toBe(200);

        // Không còn trong danh sách task
        const list = await request(app).get(`/api/tasks/project/${projectId}`).set(auth(tokenA));
        expect(list.body.some((t) => t.id === taskB.id)).toBe(false);

        // Có trong thùng rác
        const trash = await request(app).get(`/api/trash/workspace/${workspaceId}`).set(auth(tokenA));
        expect(trash.status).toBe(200);
        expect(trash.body.tasks.some((t) => t.id === taskB.id)).toBe(true);

        // Khôi phục
        const restore = await request(app).put(`/api/trash/task/${taskB.id}/restore`).set(auth(tokenA));
        expect(restore.status).toBe(200);
        const list2 = await request(app).get(`/api/tasks/project/${projectId}`).set(auth(tokenA));
        expect(list2.body.some((t) => t.id === taskB.id)).toBe(true);
    });

    it("VIEWER không xem được thùng rác → 403", async () => {
        const res = await request(app).get(`/api/trash/workspace/${workspaceId}`).set(auth(tokenB));
        expect(res.status).toBe(403);
    });
});

describe("An toàn dữ liệu trả về", () => {
    it("payload workspace KHÔNG chứa password/otp/resetToken của user", async () => {
        const res = await request(app).get("/api/workspaces").set(auth(tokenA));
        expect(res.status).toBe(200);
        const raw = JSON.stringify(res.body);
        expect(raw).not.toContain('"password"');
        expect(raw).not.toContain('"otpCode"');
        expect(raw).not.toContain('"resetToken"');
    });
});
