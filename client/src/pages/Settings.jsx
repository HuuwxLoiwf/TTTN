import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useUser, useAuth } from "../context/AuthContext";
import { toggleTheme } from "../features/themeSlice";
import { SettingsIcon, User, Building2, MoonIcon, SunIcon, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

export default function Settings() {
    const { user } = useUser();
    const { updateUser, getToken } = useAuth();
    const dispatch = useDispatch();
    const { theme } = useSelector((state) => state.theme);
    const { currentWorkspace } = useSelector((state) => state.workspace);

    const myRole = currentWorkspace?.members?.find((m) => m.userId === user?.id)?.role || "—";

    const [name, setName] = useState(user?.name || "");
    const [savingName, setSavingName] = useState(false);
    const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
    const [savingPwd, setSavingPwd] = useState(false);

    const card = "glass-card p-6";
    const inputCls = "w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm mt-1";

    const saveName = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSavingName(true);
        try {
            const token = await getToken();
            const updated = await apiFetch(token, "/auth/profile", { method: "PUT", body: { name } });
            updateUser(updated);
            toast.success("Đã cập nhật hồ sơ");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSavingName(false);
        }
    };

    const savePassword = async (e) => {
        e.preventDefault();
        if (pwd.next !== pwd.confirm) {
            toast.error("Mật khẩu xác nhận không khớp");
            return;
        }
        setSavingPwd(true);
        try {
            const token = await getToken();
            await apiFetch(token, "/auth/change-password", {
                method: "PUT",
                body: { currentPassword: pwd.current, newPassword: pwd.next },
            });
            toast.success("Đổi mật khẩu thành công");
            setPwd({ current: "", next: "", confirm: "" });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSavingPwd(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent mb-1 flex items-center gap-2">
                    <SettingsIcon className="size-6 text-blue-500" /> Cài đặt
                </h1>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">Thông tin tài khoản và tùy chọn</p>
            </div>

            {/* Hồ sơ — đổi tên */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                    <User className="size-4" /> Hồ sơ cá nhân
                </h2>
                <form onSubmit={saveName} className="space-y-3">
                    <div>
                        <label className="text-xs text-zinc-500 dark:text-zinc-400">Tên hiển thị</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 dark:text-zinc-400">Email (không đổi được)</label>
                        <input value={user?.email || ""} disabled className={inputCls + " opacity-60"} />
                    </div>
                    <button type="submit" disabled={savingName} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                        {savingName ? "Đang lưu..." : "Lưu hồ sơ"}
                    </button>
                </form>
            </div>

            {/* Đổi mật khẩu */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                    <Lock className="size-4" /> Đổi mật khẩu
                </h2>
                <form onSubmit={savePassword} className="space-y-3">
                    <input type="password" placeholder="Mật khẩu hiện tại" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} className={inputCls} required />
                    <input type="password" placeholder="Mật khẩu mới" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} className={inputCls} required />
                    <input type="password" placeholder="Xác nhận mật khẩu mới" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} className={inputCls} required />
                    <button type="submit" disabled={savingPwd} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                        {savingPwd ? "Đang đổi..." : "Đổi mật khẩu"}
                    </button>
                </form>
            </div>

            {/* Không gian làm việc */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                    <Building2 className="size-4" /> Không gian làm việc hiện tại
                </h2>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Tên</span><span className="text-zinc-900 dark:text-white">{currentWorkspace?.name || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Vai trò của bạn</span><span className="text-zinc-900 dark:text-white">{myRole}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Số thành viên</span><span className="text-zinc-900 dark:text-white">{currentWorkspace?.members?.length || 0}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Số dự án</span><span className="text-zinc-900 dark:text-white">{currentWorkspace?.projects?.length || 0}</span></div>
                </div>
            </div>

            {/* Giao diện */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Giao diện</h2>
                <button onClick={() => dispatch(toggleTheme())} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    {theme === "light" ? <MoonIcon className="size-4" /> : <SunIcon className="size-4 text-yellow-400" />}
                    Chuyển sang chế độ {theme === "light" ? "tối" : "sáng"}
                </button>
            </div>
        </div>
    );
}
