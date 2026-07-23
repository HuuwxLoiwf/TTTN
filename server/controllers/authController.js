import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../configs/prisma.js";
import { sendOtpEmail, sendResetPasswordEmail } from "../utils/emailService.js";

const JWT_SECRET = process.env.JWT_SECRET || "umc-dev-secret-change-me";
const JWT_EXPIRES = "7d";

const signToken = (userId) => jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

const publicUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    emailVerified: u.emailVerified,
    twoFactorEnabled: u.twoFactorEnabled,
});

const genOtp = () => String(Math.floor(100000 + Math.random() * 900000)); // 6 chữ số

// CHÍNH SÁCH MẬT KHẨU: tối thiểu 8 ký tự, phải có cả chữ và số
const validatePassword = (pw) => {
    if (!pw || pw.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
    if (!/[a-zA-Z]/.test(pw)) return "Mật khẩu phải chứa ít nhất 1 chữ cái";
    if (!/[0-9]/.test(pw)) return "Mật khẩu phải chứa ít nhất 1 chữ số";
    return null;
};

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
        // Chỉ cho phép đăng ký bằng email công ty @umc.com (chống tài khoản rác).
        // Chỉ áp dụng khi ĐĂNG KÝ MỚI; tài khoản cũ khác domain vẫn đăng nhập bình thường.
        if (!/@umc\.com$/i.test(email.trim())) {
            return res.status(400).json({ error: "Chỉ email công ty (@umc.com) mới được đăng ký tài khoản" });
        }
        const pwErr = validatePassword(password);
        if (pwErr) return res.status(400).json({ error: pwErr });

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

        // BẢO MẬT 2 LỚP (2FA): nếu bật, chưa cấp token ngay — gửi OTP qua email
        if (user.twoFactorEnabled) {
            const otp = genOtp();
            await prisma.user.update({
                where: { id: user.id },
                data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
            });
            const emailSent = await sendOtpEmail({ to: user.email, name: user.name, otp }).catch(() => false);
            return res.json({
                twoFactorRequired: true,
                message: "Nhập mã OTP đã gửi tới email để hoàn tất đăng nhập",
                devOtp: emailSent ? undefined : otp,
            });
        }

        const token = signToken(user.id);
        res.json({ token, user: publicUser(user) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xác minh OTP bước 2 của đăng nhập 2FA → cấp token
export const verify2fa = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({ error: "Tài khoản không hợp lệ" });
        }
        if (!user.otpCode || user.otpCode !== otp) {
            return res.status(400).json({ error: "Mã OTP không đúng" });
        }
        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            return res.status(400).json({ error: "Mã OTP đã hết hạn — hãy đăng nhập lại" });
        }
        if (!user.approved || !user.emailVerified) {
            return res.status(403).json({ error: "Tài khoản chưa đủ điều kiện đăng nhập" });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: null, otpExpiresAt: null },
        });
        const token = signToken(user.id);
        res.json({ token, user: publicUser(user) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Bật / tắt bảo mật 2 lớp (2FA qua email OTP)
export const update2fa = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) return res.status(401).json({ error: "Chưa đăng nhập" });
        const { enabled } = req.body;
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: !!enabled },
        });
        res.json(publicUser(updated));
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
        const pwErr = validatePassword(newPassword);
        if (pwErr) return res.status(400).json({ error: pwErr });

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

// Quên mật khẩu: tạo token đặt lại, gửi link qua email.
// Luôn trả về message chung (không tiết lộ email có tồn tại hay không).
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email?.trim()) return res.status(400).json({ error: "Vui lòng nhập email" });

        const user = await prisma.user.findUnique({ where: { email } });
        const genericMsg = { message: "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi." };

        // Không tiết lộ email tồn tại; user chưa có mật khẩu (clerk cũ) cũng vẫn cho đặt
        if (!user) return res.json(genericMsg);

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 phút

        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken: tokenHash, resetTokenExpiry },
        });

        const emailSent = await sendResetPasswordEmail({ to: email, name: user.name, token: rawToken }).catch(() => false);

        // Dev (chưa cấu hình email): trả token để test
        res.json({ ...genericMsg, devResetToken: emailSent ? undefined : rawToken });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Đặt lại mật khẩu bằng token
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token) return res.status(400).json({ error: "Thiếu token đặt lại" });
        const pwErr = validatePassword(newPassword);
        if (pwErr) return res.status(400).json({ error: pwErr });

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const user = await prisma.user.findFirst({
            where: { resetToken: tokenHash, resetTokenExpiry: { gt: new Date() } },
        });
        if (!user) return res.status(400).json({ error: "Liên kết không hợp lệ hoặc đã hết hạn" });

        const hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hash, resetToken: null, resetTokenExpiry: null },
        });

        res.json({ message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập." });
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
