import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useUser, useAuth } from "../context/AuthContext";
import { toggleTheme } from "../features/themeSlice";
import { updateWorkspace } from "../features/workspaceSlice";
import { SettingsIcon, User, Building2, MoonIcon, SunIcon, Lock, ShieldCheck, Zap, Link2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

export default function Settings() {
    const { user } = useUser();
    const { updateUser, getToken } = useAuth();
    const dispatch = useDispatch();
    const { theme } = useSelector((state) => state.theme);
    const { currentWorkspace } = useSelector((state) => state.workspace);

    const myRole = currentWorkspace?.members?.find((m) => m.userId === user?.id)?.role || "—";
    const isAdmin = myRole === "ADMIN";

    const [name, setName] = useState(user?.name || "");
    const [savingName, setSavingName] = useState(false);
    const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
    const [savingPwd, setSavingPwd] = useState(false);

    // Bảo mật 2 lớp (2FA)
    const [twoFA, setTwoFA] = useState(!!user?.twoFactorEnabled);
    const [saving2fa, setSaving2fa] = useState(false);
    useEffect(() => setTwoFA(!!user?.twoFactorEnabled), [user?.twoFactorEnabled]);

    const toggle2fa = async () => {
        setSaving2fa(true);
        try {
            const token = await getToken();
            const updated = await apiFetch(token, "/auth/2fa", { method: "PUT", body: { enabled: !twoFA } });
            updateUser(updated);
            setTwoFA(updated.twoFactorEnabled);
            toast.success(updated.twoFactorEnabled ? "Đã bật bảo mật 2 lớp — lần đăng nhập tới sẽ cần OTP email" : "Đã tắt bảo mật 2 lớp");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving2fa(false);
        }
    };

    // Quản trị workspace: chính sách + automation + webhook (ADMIN)
    const wsSettings = currentWorkspace?.settings && typeof currentWorkspace.settings === "object" ? currentWorkspace.settings : {};
    const [policyTaskCreate, setPolicyTaskCreate] = useState(wsSettings?.policies?.taskCreate || "managers");
    const [autoNotifyDone, setAutoNotifyDone] = useState(!!wsSettings?.automations?.notifyOnDone);
    const [autoOverdue, setAutoOverdue] = useState(!!wsSettings?.automations?.dailyOverdueDigest);
    const [webhookUrl, setWebhookUrl] = useState(wsSettings?.automations?.webhookUrl || "");
    const [savingWs, setSavingWs] = useState(false);

    useEffect(() => {
        const s = currentWorkspace?.settings && typeof currentWorkspace.settings === "object" ? currentWorkspace.settings : {};
        setPolicyTaskCreate(s?.policies?.taskCreate || "managers");
        setAutoNotifyDone(!!s?.automations?.notifyOnDone);
        setAutoOverdue(!!s?.automations?.dailyOverdueDigest);
        setWebhookUrl(s?.automations?.webhookUrl || "");
    }, [currentWorkspace?.id]);

    const saveWorkspaceSettings = async () => {
        setSavingWs(true);
        try {
            const token = await getToken();
            const ws = await apiFetch(token, `/workspaces/${currentWorkspace.id}`, {
                method: "PUT",
                body: {
                    settings: {
                        policies: { taskCreate: policyTaskCreate },
                        automations: {
                            notifyOnDone: autoNotifyDone,
                            dailyOverdueDigest: autoOverdue,
                            webhookUrl: webhookUrl.trim(),
                        },
                    },
                },
            });
            dispatch(updateWorkspace(ws));
            toast.success("Đã lưu cấu hình workspace");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSavingWs(false);
        }
    };

    const card = "bg-white dark:bg-surface-card rounded-lg p-6 shadow-spotify-md";
    const inputCls = "w-full px-3 py-2 rounded bg-gray-50 dark:bg-surface-elevated text-gray-900 dark:text-ink text-sm mt-1 shadow-spotify-inset";

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-ink mb-1 flex items-center gap-2">
                    <SettingsIcon className="size-6 text-bmw-blue" /> Cài đặt
                </h1>
                <p className="text-gray-500 dark:text-body text-sm font-light">Thông tin tài khoản và tùy chọn</p>
            </div>

            {/* Hồ sơ — đổi tên */}
            <div className={card}>
                <h2 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-4 flex items-center gap-2">
                    <User className="size-4" /> Hồ sơ cá nhân
                </h2>
                <form onSubmit={saveName} className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 dark:text-muted">Tên hiển thị</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 dark:text-muted">Email (không đổi được)</label>
                        <input value={user?.email || ""} disabled className={inputCls + " opacity-60"} />
                    </div>
                    <button type="submit" disabled={savingName} className="px-5 py-2 rounded-full text-sm uppercase font-bold tracking-[1.4px] bg-m-blue-light text-black hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition">
                        {savingName ? "Đang lưu..." : "Lưu hồ sơ"}
                    </button>
                </form>
            </div>

            {/* Đổi mật khẩu */}
            <div className={card}>
                <h2 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-4 flex items-center gap-2">
                    <Lock className="size-4" /> Đổi mật khẩu
                </h2>
                <form onSubmit={savePassword} className="space-y-3">
                    <input type="password" placeholder="Mật khẩu hiện tại" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} className={inputCls} required />
                    <input type="password" placeholder="Mật khẩu mới" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} className={inputCls} required />
                    <input type="password" placeholder="Xác nhận mật khẩu mới" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} className={inputCls} required />
                    <button type="submit" disabled={savingPwd} className="px-5 py-2 rounded-full text-sm uppercase font-bold tracking-[1.4px] bg-m-blue-light text-black hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition">
                        {savingPwd ? "Đang đổi..." : "Đổi mật khẩu"}
                    </button>
                </form>
            </div>

            {/* Bảo mật 2 lớp (2FA) */}
            <div className={card}>
                <h2 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-2 flex items-center gap-2">
                    <ShieldCheck className="size-4" /> Bảo mật 2 lớp (2FA)
                </h2>
                <p className="text-xs text-gray-500 dark:text-muted font-light mb-3">
                    Khi bật, mỗi lần đăng nhập bạn phải nhập thêm mã OTP gửi tới email — an toàn hơn cho tài khoản.
                </p>
                <button onClick={toggle2fa} disabled={saving2fa}
                    className={`px-5 py-2 rounded-full text-sm uppercase font-bold tracking-[1.4px] transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${twoFA ? "border border-m-red text-m-red hover:bg-m-red hover:text-white" : "bg-m-blue-light text-black"}`}>
                    {saving2fa ? "Đang lưu..." : twoFA ? "Tắt bảo mật 2 lớp" : "Bật bảo mật 2 lớp"}
                </button>
                {twoFA && <span className="ml-3 text-xs text-m-success">Đang bật ✓</span>}
            </div>

            {/* Quản trị workspace — chỉ ADMIN */}
            {isAdmin && currentWorkspace && (
                <div className={card}>
                    <h2 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-4 flex items-center gap-2">
                        <Zap className="size-4 text-m-warning" /> Quản trị không gian làm việc (chính sách & tự động hóa)
                    </h2>
                    <div className="space-y-4">
                        {/* Chính sách quyền */}
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted">Ai được TẠO công việc?</label>
                            <select value={policyTaskCreate} onChange={(e) => setPolicyTaskCreate(e.target.value)} className={inputCls}>
                                <option value="managers">Chỉ Quản trị viên / Quản lý / Trưởng dự án (mặc định)</option>
                                <option value="members">Mọi thành viên của dự án</option>
                            </select>
                        </div>

                        {/* Automation */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={autoNotifyDone} onChange={(e) => setAutoNotifyDone(e.target.checked)} className="accent-m-blue-dark" />
                                Tự thông báo cho quản trị viên & trưởng dự án khi có công việc <b>Hoàn thành</b>
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={autoOverdue} onChange={(e) => setAutoOverdue(e.target.checked)} className="accent-m-blue-dark" />
                                Nhắc việc <b>quá hạn</b> hằng ngày cho người được giao (tự động mỗi 24h)
                            </label>
                        </div>

                        {/* Webhook */}
                        <div>
                            <label className="text-xs text-gray-500 dark:text-muted flex items-center gap-1">
                                <Link2 className="size-3" /> Webhook URL (Slack / Discord) — nhận thông báo sự kiện ra kênh chat công ty
                            </label>
                            <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://hooks.slack.com/services/... hoặc https://discord.com/api/webhooks/..."
                                className={inputCls} />
                        </div>

                        <button onClick={saveWorkspaceSettings} disabled={savingWs}
                            className="px-5 py-2 rounded-full text-sm uppercase font-bold tracking-[1.4px] bg-m-blue-light text-black hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition">
                            {savingWs ? "Đang lưu..." : "Lưu cấu hình workspace"}
                        </button>
                    </div>
                </div>
            )}

            {/* Không gian làm việc */}
            <div className={card}>
                <h2 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-4 flex items-center gap-2">
                    <Building2 className="size-4" /> Không gian làm việc hiện tại
                </h2>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500 dark:text-muted">Tên</span><span className="text-gray-900 dark:text-ink">{currentWorkspace?.name || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 dark:text-muted">Vai trò của bạn</span><span className="text-gray-900 dark:text-ink">{myRole}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 dark:text-muted">Số thành viên</span><span className="text-gray-900 dark:text-ink">{currentWorkspace?.members?.length || 0}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 dark:text-muted">Số dự án</span><span className="text-gray-900 dark:text-ink">{currentWorkspace?.projects?.length || 0}</span></div>
                </div>
            </div>

            {/* Giao diện */}
            <div className={card}>
                <h2 className="text-sm font-bold text-gray-700 dark:text-body-strong mb-4">Giao diện</h2>
                <button onClick={() => dispatch(toggleTheme())} className="flex items-center gap-2 px-5 py-2 rounded-full text-sm uppercase font-bold tracking-[1.4px] bg-gray-100 dark:bg-surface-elevated text-gray-900 dark:text-ink hover:scale-105 transition">
                    {theme === "light" ? <MoonIcon className="size-4" /> : <SunIcon className="size-4 text-m-warning" />}
                    Chuyển sang chế độ {theme === "light" ? "tối" : "sáng"}
                </button>
            </div>
        </div>
    );
}
