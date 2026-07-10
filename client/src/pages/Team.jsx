import { useEffect, useState } from "react";
import { UsersIcon, Search, UserPlus, Shield, Activity, Trash2 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth, useUser } from "../context/AuthContext";
import toast from "react-hot-toast";
import InviteMemberDialog from "../components/InviteMemberDialog";
import { apiFetch } from "../lib/api";
import { setWorkspaceMember, removeWorkspaceMember } from "../features/workspaceSlice";

// Mỗi workspace chỉ có MỘT Quản trị viên (chủ sở hữu) — admin chỉ được
// gán tối đa tới Quản lý, không thăng cấp thêm ADMIN thứ hai.
const ROLE_OPTIONS = [
    { value: "MANAGER", label: "Quản lý" },
    { value: "MEMBER", label: "Thành viên" },
    { value: "VIEWER", label: "Người xem" },
];

const Team = () => {

    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { user: currentUser } = useUser();
    const [tasks, setTasks] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const projects = currentWorkspace?.projects || [];

    const isAdmin = currentWorkspace?.members?.some((m) => m.userId === currentUser?.id && m.role === "ADMIN");

    const handleRoleChange = async (member, role) => {
        try {
            const token = await getToken();
            const updated = await apiFetch(token, `/workspaces/${currentWorkspace.id}/members/${member.id}`, {
                method: "PUT",
                body: { role },
            });
            dispatch(setWorkspaceMember(updated));
            setUsers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role } : m)));
            toast.success("Đã cập nhật vai trò");
        } catch (err) {
            toast.error("Cập nhật thất bại: " + err.message);
        }
    };

    // Đặt đơn giá giờ công (VNĐ/giờ) — dùng tính chi phí nhân công trong Báo cáo
    const handleRateChange = async (member, rateStr) => {
        try {
            const token = await getToken();
            const updated = await apiFetch(token, `/workspaces/${currentWorkspace.id}/members/${member.id}`, {
                method: "PUT",
                body: { hourlyRate: rateStr === "" ? null : Number(rateStr) },
            });
            dispatch(setWorkspaceMember(updated));
            setUsers((prev) => prev.map((m) => (m.id === member.id ? { ...m, hourlyRate: updated.hourlyRate } : m)));
            toast.success("Đã cập nhật đơn giá giờ công");
        } catch (err) {
            toast.error("Cập nhật thất bại: " + err.message);
        }
    };

    const handleRemove = async (member) => {
        if (!window.confirm(`Gỡ ${member.user?.name || member.user?.email} khỏi không gian làm việc?`)) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/workspaces/${currentWorkspace.id}/members/${member.id}`, { method: "DELETE" });
            dispatch(removeWorkspaceMember(member.id));
            setUsers((prev) => prev.filter((m) => m.id !== member.id));
            toast.success("Đã gỡ thành viên");
        } catch (err) {
            toast.error("Gỡ thất bại: " + err.message);
        }
    };

    const filteredUsers = users.filter(
        (user) =>
            user?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        setUsers(currentWorkspace?.members || []);
        setTasks(currentWorkspace?.projects?.reduce((acc, project) => [...acc, ...project.tasks], []) || []);
    }, [currentWorkspace]);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-ink mb-1">Nhóm</h1>
                    <p className="text-gray-500 dark:text-body text-sm font-light">
                        Quản lý thành viên nhóm và đóng góp của họ
                    </p>
                </div>
                <button onClick={() => setIsDialogOpen(true)} className="flex items-center px-6 py-3 text-sm uppercase font-bold tracking-[1.4px] rounded-full bg-m-blue-light text-black hover:scale-105 transition" >
                    <UserPlus className="w-4 h-4 mr-2" /> Mời thành viên
                </button>
                <InviteMemberDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-4">
                {/* Total Members */}
                <div className="max-sm:w-full bg-white dark:bg-surface-card rounded-lg p-6 hover:shadow-spotify-md transition">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-xs uppercase font-bold tracking-[1.4px] text-gray-500 dark:text-muted">Tổng thành viên</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-ink">{users.length}</p>
                        </div>
                        <div className="p-3 rounded-full bg-surface-elevated">
                            <UsersIcon className="size-4 text-m-blue-light" />
                        </div>
                    </div>
                </div>

                {/* Active Projects */}
                <div className="max-sm:w-full bg-white dark:bg-surface-card rounded-lg p-6 hover:shadow-spotify-md transition">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-xs uppercase font-bold tracking-[1.4px] text-gray-500 dark:text-muted">Dự án đang hoạt động</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-ink">
                                {projects.filter((p) => p.status !== "CANCELLED" && p.status !== "COMPLETED").length}
                            </p>
                        </div>
                        <div className="p-3 rounded-full bg-surface-elevated">
                            <Activity className="size-4 text-m-success" />
                        </div>
                    </div>
                </div>

                {/* Total Tasks */}
                <div className="max-sm:w-full bg-white dark:bg-surface-card rounded-lg p-6 hover:shadow-spotify-md transition">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-xs uppercase font-bold tracking-[1.4px] text-gray-500 dark:text-muted">Tổng công việc</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-ink">{tasks.length}</p>
                        </div>
                        <div className="p-3 rounded-full bg-surface-elevated">
                            <Shield className="size-4 text-m-blue-dark" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-muted size-3" />
                <input placeholder="Tìm kiếm thành viên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full text-sm rounded-full bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink placeholder-gray-400 dark:placeholder-muted py-2.5 shadow-spotify-inset focus:outline-none" />
            </div>

            {/* Team Members */}
            <div className="w-full">
                {filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-surface-elevated rounded-full flex items-center justify-center">
                            <UsersIcon className="w-12 h-12 text-gray-400 dark:text-muted" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-ink mb-2">
                            {users.length === 0
                                ? "Chưa có thành viên nào"
                                : "Không tìm thấy thành viên"}
                        </h3>
                        <p className="text-gray-500 dark:text-body font-light mb-6">
                            {users.length === 0
                                ? "Mời thành viên để bắt đầu cộng tác"
                                : "Hãy thử thay đổi từ khóa tìm kiếm"}
                        </p>
                    </div>
                ) : (
                    <div className="max-w-4xl w-full">
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto rounded-lg bg-white dark:bg-surface-card shadow-spotify-md">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-hairline">
                                <thead className="bg-gray-50 dark:bg-surface-soft">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left font-bold text-xs uppercase tracking-[1.4px] text-gray-500 dark:text-muted">
                                            Tên
                                        </th>
                                        <th className="px-6 py-2.5 text-left font-bold text-xs uppercase tracking-[1.4px] text-gray-500 dark:text-muted">
                                            Email
                                        </th>
                                        <th className="px-6 py-2.5 text-left font-bold text-xs uppercase tracking-[1.4px] text-gray-500 dark:text-muted">
                                            Vai trò
                                        </th>
                                        {isAdmin && (
                                            <th className="px-6 py-2.5 text-left font-bold text-xs uppercase tracking-[1.4px] text-gray-500 dark:text-muted">Thao tác</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-hairline">
                                    {filteredUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-gray-50 dark:hover:bg-surface-soft transition-colors"
                                        >
                                            <td className="px-6 py-2.5 whitespace-nowrap flex items-center gap-3">
                                                <img
                                                    src={user.user.image}
                                                    alt={user.user.name}
                                                    className="size-7 rounded-full bg-gray-200 dark:bg-surface-elevated"
                                                />
                                                <span className="text-sm text-gray-800 dark:text-ink truncate">
                                                    {user.user?.name || "Unknown User"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-muted font-light">
                                                {user.user.email}
                                            </td>
                                            <td className="px-6 py-2.5 whitespace-nowrap">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.role === "ADMIN"
                                                            ? "bg-m-blue-dark/15 text-m-blue-dark"
                                                            : "bg-surface-elevated text-gray-700 dark:text-body"
                                                        }`}
                                                >
                                                    {user.role || "User"}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-2.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {user.userId === currentUser?.id ? (
                                                            <span className="text-xs text-gray-400 dark:text-muted">Bạn</span>
                                                        ) : user.role === "ADMIN" ? (
                                                            <span className="text-xs text-gray-400 dark:text-muted">Chủ sở hữu</span>
                                                        ) : (
                                                            <>
                                                                <select
                                                                    value={user.role}
                                                                    onChange={(e) => handleRoleChange(user, e.target.value)}
                                                                    className="text-xs rounded-full dark:bg-surface-elevated text-gray-900 dark:text-ink px-3 py-1.5 shadow-spotify-inset outline-none"
                                                                >
                                                                    {ROLE_OPTIONS.map((o) => (
                                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                                    ))}
                                                                </select>
                                                                <button onClick={() => handleRemove(user)} className="size-8 flex items-center justify-center rounded-full text-gray-400 dark:text-muted hover:text-m-red hover:bg-m-red/10 transition">
                                                                    <Trash2 className="size-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {/* Đơn giá giờ công — Enter để lưu */}
                                                        <input
                                                            type="number" min="0" step="1000"
                                                            defaultValue={user.hourlyRate ?? ""}
                                                            placeholder="đ/giờ"
                                                            title="Đơn giá giờ công (VNĐ/giờ) — nhấn Enter để lưu"
                                                            onKeyDown={(e) => { if (e.key === "Enter") handleRateChange(user, e.target.value); }}
                                                            onBlur={(e) => { if (String(user.hourlyRate ?? "") !== e.target.value) handleRateChange(user, e.target.value); }}
                                                            className="w-24 text-xs rounded-full dark:bg-surface-elevated text-gray-900 dark:text-ink px-3 py-1.5 shadow-spotify-inset outline-none"
                                                        />
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="p-4 rounded-lg bg-white dark:bg-surface-card shadow-spotify-md"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <img
                                            src={user.user.image}
                                            alt={user.user.name}
                                            className="size-9 rounded-full bg-gray-200 dark:bg-surface-elevated"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-ink">
                                                {user.user?.name || "Unknown User"}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-muted font-light">
                                                {user.user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.role === "ADMIN"
                                                    ? "bg-m-blue-dark/15 text-m-blue-dark"
                                                    : "bg-surface-elevated text-gray-700 dark:text-body"
                                                }`}
                                        >
                                            {user.role || "User"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
};

export default Team;
