import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

const post = async (path, body) => {
    const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra");
    return data;
};

export default function AuthPage() {
    const { loginWithToken } = useAuth();
    const [mode, setMode] = useState("login"); // login | register | verify | forgot | reset | 2fa
    const [form, setForm] = useState({ name: "", email: "", password: "", otp: "", resetToken: "" });
    const [busy, setBusy] = useState(false);

    // Mở link đặt lại mật khẩu từ email (?reset=token)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("reset");
        if (t) {
            setForm((f) => ({ ...f, resetToken: t }));
            setMode("reset");
        }
    }, []);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const handleForgot = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const data = await post("/auth/forgot-password", { email: form.email });
            toast.success("Nếu email tồn tại, liên kết đặt lại đã được gửi.", { duration: 6000 });
            if (data.devResetToken) {
                setForm((f) => ({ ...f, resetToken: data.devResetToken }));
                toast(`Token (dev): ${data.devResetToken}`, { duration: 12000 });
                setMode("reset");
            } else {
                setMode("login");
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await post("/auth/reset-password", { token: form.resetToken, newPassword: form.password });
            toast.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");
            window.history.replaceState({}, "", window.location.pathname); // xóa ?reset khỏi URL
            setForm((f) => ({ ...f, password: "", resetToken: "" }));
            setMode("login");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const data = await post("/auth/login", { email: form.email, password: form.password });
            // Tài khoản bật 2FA: cần bước 2 — nhập OTP gửi qua email
            if (data.twoFactorRequired) {
                toast.success("Nhập mã OTP đã gửi tới email để hoàn tất đăng nhập", { duration: 6000 });
                if (data.devOtp) toast(`Mã OTP (dev): ${data.devOtp}`, { duration: 12000 });
                setMode("2fa");
                return;
            }
            loginWithToken(data.token, data.user);
            toast.success("Đăng nhập thành công");
        } catch (err) {
            if (err.message.includes("chưa xác minh")) {
                toast.error("Tài khoản chưa xác minh. Vui lòng nhập OTP.");
                setMode("verify");
            } else if (err.message.includes("chưa đăng ký")) {
                toast.error("Tài khoản chưa đăng ký. Vui lòng đăng ký trước.");
                setMode("register");
            } else {
                toast.error(err.message);
            }
        } finally {
            setBusy(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        // Chỉ cho phép email công ty @umc.com (chống tài khoản rác) — báo sớm phía client
        if (!/@umc\.com$/i.test(form.email.trim())) {
            toast.error("Chỉ email công ty (@umc.com) mới được đăng ký tài khoản");
            return;
        }
        setBusy(true);
        try {
            const data = await post("/auth/register", { name: form.name, email: form.email, password: form.password });
            toast.success("Đăng ký thành công! Nhập mã OTP.");
            if (data.devOtp) toast(`Mã OTP (dev): ${data.devOtp}`, { duration: 10000 });
            setMode("verify");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await post("/auth/verify-otp", { email: form.email, otp: form.otp });
            // Xác minh xong nhưng phải chờ admin duyệt → quay về đăng nhập
            toast.success("Xác minh thành công! Tài khoản đang chờ quản trị viên duyệt.", { duration: 6000 });
            setMode("login");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    // Bước 2 của đăng nhập khi bật 2FA
    const handle2fa = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const data = await post("/auth/verify-2fa", { email: form.email, otp: form.otp });
            loginWithToken(data.token, data.user);
            toast.success("Đăng nhập thành công");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const resend = async () => {
        try {
            const data = await post("/auth/resend-otp", { email: form.email });
            toast.success("Đã gửi lại OTP");
            if (data.devOtp) toast(`Mã OTP (dev): ${data.devOtp}`, { duration: 10000 });
        } catch (err) {
            toast.error(err.message);
        }
    };

    const inputCls = "w-full px-4 py-3 rounded bg-surface-elevated text-ink placeholder-muted text-sm border-none shadow-spotify-inset focus:outline-none transition";
    const btnCls = "w-full h-12 rounded-full bg-m-blue-light text-black text-sm font-bold uppercase tracking-[1.4px] hover:scale-[1.03] hover:bg-[#1fdf64] transition disabled:opacity-40 disabled:hover:scale-100";
    const headCls = "text-lg font-bold text-center text-ink mb-2";
    const linkCls = "text-ink hover:text-m-blue-light hover:underline font-bold";

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-canvas p-4">
            {/* Nền — album-art style ambient glow, achromatic ngoại trừ điểm nhấn xanh Spotify */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1f1f1f] to-canvas" />
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(30,215,96,0.15), transparent 50%)" }} />

            {/* Thẻ đăng nhập */}
            <div className="relative">
                <div>
                    <div className="w-[22rem] max-w-full bg-surface-card rounded-lg p-8 shadow-spotify-lg">
                        <div className="text-center mb-6">
                            <p className="font-bold text-3xl text-ink tracking-tight">UMC</p>
                            <p className="text-body text-sm mt-1">Hệ thống Quản Lý Dự Án</p>
                        </div>

                {mode === "login" && (
                    <form onSubmit={handleLogin} className="space-y-3">
                        <h2 className={headCls}>Đăng nhập</h2>
                        <input type="email" placeholder="Email" value={form.email} onChange={set("email")} className={inputCls} required />
                        <input type="password" placeholder="Mật khẩu" value={form.password} onChange={set("password")} className={inputCls} required />
                        <button type="submit" disabled={busy} className={btnCls}>
                            {busy ? "Đang đăng nhập..." : "Đăng nhập"}
                        </button>
                        <div className="text-center">
                            <button type="button" onClick={() => setMode("forgot")} className={"text-xs " + linkCls}>Quên mật khẩu?</button>
                        </div>
                        <p className="text-center text-sm text-body">
                            Chưa có tài khoản?{" "}
                            <button type="button" onClick={() => setMode("register")} className={linkCls}>Đăng ký</button>
                        </p>
                    </form>
                )}

                {mode === "forgot" && (
                    <form onSubmit={handleForgot} className="space-y-3">
                        <h2 className={headCls}>Quên mật khẩu</h2>
                        <p className="text-xs text-center text-body">Nhập email để nhận liên kết đặt lại mật khẩu.</p>
                        <input type="email" placeholder="Email" value={form.email} onChange={set("email")} className={inputCls} required />
                        <button type="submit" disabled={busy} className={btnCls}>
                            {busy ? "Đang gửi..." : "Gửi liên kết đặt lại"}
                        </button>
                        <p className="text-center text-sm text-body">
                            <button type="button" onClick={() => setMode("login")} className={linkCls}>← Quay lại đăng nhập</button>
                        </p>
                    </form>
                )}

                {mode === "reset" && (
                    <form onSubmit={handleReset} className="space-y-3">
                        <h2 className={headCls}>Đặt lại mật khẩu</h2>
                        <p className="text-xs text-center text-body">Nhập mật khẩu mới cho tài khoản của bạn.</p>
                        {!form.resetToken && (
                            <input placeholder="Token đặt lại" value={form.resetToken} onChange={set("resetToken")} className={inputCls} required />
                        )}
                        <input type="password" placeholder="Mật khẩu mới" value={form.password} onChange={set("password")} className={inputCls} required />
                        <button type="submit" disabled={busy} className={btnCls}>
                            {busy ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
                        </button>
                        <p className="text-center text-sm text-body">
                            <button type="button" onClick={() => setMode("login")} className={linkCls}>← Quay lại đăng nhập</button>
                        </p>
                    </form>
                )}

                {mode === "register" && (
                    <form onSubmit={handleRegister} className="space-y-3">
                        <h2 className={headCls}>Đăng ký</h2>
                        <input placeholder="Họ tên" value={form.name} onChange={set("name")} className={inputCls} required />
                        <input type="email" placeholder="Email công ty (@umc.com)" value={form.email} onChange={set("email")} className={inputCls} required />
                        <p className="text-xs text-muted -mt-1">Chỉ email công ty <b>@umc.com</b> mới được đăng ký.</p>
                        <input type="password" placeholder="Mật khẩu" value={form.password} onChange={set("password")} className={inputCls} required />
                        <button type="submit" disabled={busy} className={btnCls}>
                            {busy ? "Đang đăng ký..." : "Đăng ký"}
                        </button>
                        <p className="text-center text-sm text-body">
                            Đã có tài khoản?{" "}
                            <button type="button" onClick={() => setMode("login")} className={linkCls}>Đăng nhập</button>
                        </p>
                    </form>
                )}

                {mode === "2fa" && (
                    <form onSubmit={handle2fa} className="space-y-3">
                        <h2 className={headCls}>Bảo mật 2 lớp</h2>
                        <p className="text-xs text-center text-body">Nhập mã OTP đã gửi tới {form.email}</p>
                        <input placeholder="Mã OTP (6 số)" value={form.otp} onChange={set("otp")} className={inputCls + " text-center tracking-widest"} required autoFocus />
                        <button type="submit" disabled={busy} className={btnCls}>
                            {busy ? "Đang xác minh..." : "Hoàn tất đăng nhập"}
                        </button>
                        <p className="text-center text-sm text-body">
                            <button type="button" onClick={() => setMode("login")} className={linkCls}>← Quay lại đăng nhập</button>
                        </p>
                    </form>
                )}

                {mode === "verify" && (
                    <form onSubmit={handleVerify} className="space-y-3">
                        <h2 className={headCls}>Xác minh email</h2>
                        <p className="text-xs text-center text-body">Nhập mã OTP gửi tới {form.email}</p>
                        <input placeholder="Mã OTP (6 số)" value={form.otp} onChange={set("otp")} className={inputCls + " text-center tracking-widest"} required />
                        <button type="submit" disabled={busy} className={btnCls}>
                            {busy ? "Đang xác minh..." : "Xác minh"}
                        </button>
                        <div className="flex justify-between text-sm text-body">
                            <button type="button" onClick={() => setMode("login")} className="hover:underline text-body-strong">← Quay lại</button>
                            <button type="button" onClick={resend} className={linkCls}>Gửi lại mã</button>
                        </div>
                    </form>
                )}
                    </div>
                </div>
            </div>
        </div>
    );
}
