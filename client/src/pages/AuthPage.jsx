import { useState } from "react";
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
    const [mode, setMode] = useState("login"); // login | register | verify
    const [form, setForm] = useState({ name: "", email: "", password: "", otp: "" });
    const [busy, setBusy] = useState(false);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const handleLogin = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const data = await post("/auth/login", { email: form.email, password: form.password });
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

    const resend = async () => {
        try {
            const data = await post("/auth/resend-otp", { email: form.email });
            toast.success("Đã gửi lại OTP");
            if (data.devOtp) toast(`Mã OTP (dev): ${data.devOtp}`, { duration: 10000 });
        } catch (err) {
            toast.error(err.message);
        }
    };

    const inputCls = "w-full px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-transparent transition";
    const btnCls = "w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-900/50 transition disabled:opacity-50 active:scale-[0.98]";
    const headCls = "text-lg font-semibold text-center text-white mb-2";
    const linkCls = "text-blue-300 hover:text-blue-200 font-medium";

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-slate-950 p-4 perspective-1000">
            {/* Nền gradient động */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-blue-950 bg-animated-gradient" />

            {/* Các khối blob phát sáng trôi nổi */}
            <div className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-blue-600/30 blur-3xl animate-blob" />
            <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 rounded-full bg-indigo-600/30 blur-3xl animate-blob animation-delay-2000" />
            <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-purple-600/20 blur-3xl animate-blob animation-delay-4000" />

            {/* Khung lưới xoay 3D trang trí */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[36rem] h-[36rem] rounded-full border border-white/5 animate-spinslow" />
                <div className="absolute w-[28rem] h-[28rem] rounded-full border border-white/5 animate-spinslow" style={{ animationDirection: "reverse" }} />
                <div className="absolute w-[20rem] h-[20rem] rounded-full border border-white/10" />
            </div>

            {/* Thẻ đăng nhập glassmorphism (đứng yên, chỉ có viền sáng nhịp) */}
            <div className="relative">
                <div>
                    <div className="w-[22rem] max-w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8" style={{ animation: "glowpulse 5s ease-in-out infinite" }}>
                        <div className="text-center mb-6">
                            <p className="font-extrabold text-3xl bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent tracking-wide">UMC</p>
                            <p className="text-white/60 text-sm mt-1">Hệ thống Quản Lý Dự Án</p>
                        </div>

                {mode === "login" && (
                    <form onSubmit={handleLogin} className="space-y-3">
                        <h2 className={headCls}>Đăng nhập</h2>
                        <input type="email" placeholder="Email" value={form.email} onChange={set("email")} className={inputCls} required />
                        <input type="password" placeholder="Mật khẩu" value={form.password} onChange={set("password")} className={inputCls} required />
                        <button type="submit" disabled={busy} className={btnCls}>
                            {busy ? "Đang đăng nhập..." : "Đăng nhập"}
                        </button>
                        <p className="text-center text-sm text-white/60">
                            Chưa có tài khoản?{" "}
                            <button type="button" onClick={() => setMode("register")} className={linkCls}>Đăng ký</button>
                        </p>
                    </form>
                )}

                {mode === "register" && (
                    <form onSubmit={handleRegister} className="space-y-3">
                        <h2 className={headCls}>Đăng ký</h2>
                        <input placeholder="Họ tên" value={form.name} onChange={set("name")} className={inputCls} required />
                        <input type="email" placeholder="Email" value={form.email} onChange={set("email")} className={inputCls} required />
                        <input type="password" placeholder="Mật khẩu" value={form.password} onChange={set("password")} className={inputCls} required />
                        <button type="submit" disabled={busy} className={btnCls}>
                            {busy ? "Đang đăng ký..." : "Đăng ký"}
                        </button>
                        <p className="text-center text-sm text-white/60">
                            Đã có tài khoản?{" "}
                            <button type="button" onClick={() => setMode("login")} className={linkCls}>Đăng nhập</button>
                        </p>
                    </form>
                )}

                {mode === "verify" && (
                    <form onSubmit={handleVerify} className="space-y-3">
                        <h2 className={headCls}>Xác minh email</h2>
                        <p className="text-xs text-center text-white/60">Nhập mã OTP gửi tới {form.email}</p>
                        <input placeholder="Mã OTP (6 số)" value={form.otp} onChange={set("otp")} className={inputCls + " text-center tracking-widest"} required />
                        <button type="submit" disabled={busy} className={btnCls}>
                            {busy ? "Đang xác minh..." : "Xác minh"}
                        </button>
                        <div className="flex justify-between text-sm text-white/60">
                            <button type="button" onClick={() => setMode("login")} className="hover:underline text-white/70">← Quay lại</button>
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
