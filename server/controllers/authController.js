import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../configs/prisma.js";
import { sendOtpEmail } from "../utils/emailService.js";

const JWT_SECRET = process.env.JWT_SECRET || "umc-dev-secret-change-me";
const JWT_EXPIRES = "7d";

const signToken = (userId) => jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

const publicUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    emailVerified: u.emailVerified,
});

const genOtp = () => String(Math.floor(100000 + Math.random() * 900000)); // 6 chữ số

// Đăng ký: tạo user (chưa xác minh) + gửi OTP
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name?.trim() || !email?.trim() || !password) {
            return res.status(400).json({ error: "Vui lòng nhập đủ tên, email, mật khẩu" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Email không hợp lệ" });
        }
        if (password.length < 4) {
            return res.status(400).json({ error: "Mật khẩu tối thiểu 4 ký tự" });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: "Email đã được đăng ký" });

        const hash = await bcrypt.hash(password, 10);
        const otp = genOtp();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

        await prisma.user.create({
            data: { name: name.trim(), email, password: hash, otpCode: otp, otpExpiresAt, emailVerified: false },
        });

        // Gửi OTP qua email (nếu cấu hình email). Nếu không, trả mã trong dev để test.
        const emailSent = await sendOtpEmail({ to: email, name, otp }).catch(() => false);

        res.status(201).json({
            message: "Đăng ký thành công. Vui lòng nhập mã OTP gửi tới email.",
            // Trong môi trường dev chưa cấu hình email, trả OTP để test:
            devOtp: emailSent ? undefined : otp,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xác minh OTP
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: "Không tìm thấy tài khoản" });
        if (user.emailVerified) return res.status(400).json({ error: "Tài khoản đã xác minh" });
        if (!user.otpCode || user.otpCode !== otp) return res.status(400).json({ error: "Mã OTP không đúng" });
        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            return res.status(400).json({ error: "Mã OTP đã hết hạn" });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, otpCode: null, otpExpiresAt: null },
        });

        // Đã xác minh email nhưng CHƯA đăng nhập được — phải chờ admin duyệt
        res.json({ message: "Xác minh email thành công. Tài khoản đang chờ quản trị viên duyệt.", pendingApproval: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Gửi lại OTP
export const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: "Không tìm thấy tài khoản" });
        if (user.emailVerified) return res.status(400).json({ error: "Tài khoản đã xác minh" });

        const otp = genOtp();
        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
        });
        const emailSent = await sendOtpEmail({ to: email, name: user.name, otp }).catch(() => false);
        res.json({ message: "Đã gửi lại OTP", devOtp: emailSent ? undefined : otp });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Đăng nhập
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        // Email chưa từng đăng ký
        if (!user || !user.password) {
            return res.status(404).json({ error: "Tài khoản chưa đăng ký", notRegistered: true });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: "Mật khẩu không đúng" });

        if (!user.emailVerified) {
            return res.status(403).json({ error: "Tài khoản chưa xác minh email", needVerify: true });
        }
        if (!user.approved) {
            return res.status(403).json({ error: "Tài khoản đang chờ quản trị viên duyệt" });
        }

        const token = signToken(user.id);
        res.json({ token, user: publicUser(user) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy thông tin user hiện tại (từ token)
export const me = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "Không tìm thấy tài khoản" });
        res.json(publicUser(user));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cập nhật hồ sơ (tên, ảnh)
export const updateProfile = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });
        const { name, image } = req.body;
        if (name !== undefined && !name.trim()) return res.status(400).json({ error: "Tên không được để trống" });

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(image !== undefined && { image }),
            },
        });
        res.json(publicUser(updated));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Đổi mật khẩu
export const changePassword = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 4) {
            return res.status(400).json({ error: "Mật khẩu mới tối thiểu 4 ký tự" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.password) return res.status(400).json({ error: "Tài khoản không có mật khẩu" });

        const ok = await bcrypt.compare(currentPassword || "", user.password);
        if (!ok) return res.status(400).json({ error: "Mật khẩu hiện tại không đúng" });

        const hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: userId }, data: { password: hash } });
        res.json({ message: "Đổi mật khẩu thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Kiểm tra user hiện tại có quyền duyệt tài khoản (là ADMIN của workspace nào đó, hoặc admin gốc)
const isSystemAdmin = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user?.email === "admin@umc.com") return true;
    const adminMembership = await prisma.workspaceMember.findFirst({
        where: { userId, role: "ADMIN" },
        select: { id: true },
    });
    return !!adminMembership;
};

// Danh sách tài khoản chờ duyệt (đã xác minh email nhưng chưa approved)
export const listPendingUsers = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId || !(await isSystemAdmin(userId))) {
            return res.status(403).json({ error: "Chỉ quản trị viên mới xem được" });
        }
        const users = await prisma.user.findMany({
            where: { approved: false, emailVerified: true },
            select: { id: true, name: true, email: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Duyệt tài khoản
export const approveUser = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId || !(await isSystemAdmin(userId))) {
            return res.status(403).json({ error: "Chỉ quản trị viên mới được duyệt" });
        }
        await prisma.user.update({ where: { id: req.params.id }, data: { approved: true } });
        res.json({ message: "Đã duyệt tài khoản" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Từ chối (xóa) tài khoản chờ duyệt
export const rejectUser = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId || !(await isSystemAdmin(userId))) {
            return res.status(403).json({ error: "Chỉ quản trị viên mới được từ chối" });
        }
        const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { approved: true } });
        if (target?.approved) return res.status(400).json({ error: "Không thể xóa tài khoản đã duyệt" });
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: "Đã từ chối và xóa tài khoản" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export { JWT_SECRET };
