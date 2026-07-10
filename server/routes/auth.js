import { Router } from "express";
import { register, verifyOtp, resendOtp, login, verify2fa, update2fa, me, updateProfile, changePassword, forgotPassword, resetPassword, listPendingUsers, approveUser, rejectUser } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authz.js";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/verify-2fa", verify2fa); // bước 2 của đăng nhập khi bật 2FA
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, me);
router.put("/profile", requireAuth, updateProfile);
router.put("/change-password", requireAuth, changePassword);
router.put("/2fa", requireAuth, update2fa); // bật/tắt bảo mật 2 lớp

// Duyệt tài khoản (chỉ admin — controller tự kiểm tra)
router.get("/pending-users", requireAuth, listPendingUsers);
router.put("/pending-users/:id/approve", requireAuth, approveUser);
router.delete("/pending-users/:id", requireAuth, rejectUser);

export default router;
