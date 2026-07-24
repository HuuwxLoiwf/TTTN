import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { setWorkspaces, setCurrentWorkspace } from "../features/workspaceSlice";

const InviteMemberDialog = ({ isDialogOpen, setIsDialogOpen }) => {

    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        role: "MEMBER",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentWorkspace) return;
        setIsSubmitting(true);
        try {
            const token = await getToken();
            await apiFetch(token, `/workspaces/${currentWorkspace.id}/members`, {
                method: 'POST',
                body: formData,
            });
            // Cập nhật lại danh sách để thành viên mới hiện NGAY (không cần F5)
            const workspaces = await apiFetch(token, "/workspaces");
            dispatch(setWorkspaces(workspaces));
            dispatch(setCurrentWorkspace(currentWorkspace.id));

            setIsDialogOpen(false);
            setFormData({ email: "", role: "MEMBER" });
            toast.success("Đã thêm thành viên!");
        } catch (err) {
            toast.error("Thêm thành viên thất bại: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-surface-card rounded-lg p-6 w-full max-w-md text-gray-900 dark:text-ink shadow-spotify-lg">
                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UserPlus className="size-5 text-gray-900 dark:text-ink" /> Mời thành viên
                    </h2>
                    {currentWorkspace && (
                        <p className="text-sm text-gray-700 dark:text-body mt-1">
                            Mời vào không gian làm việc: <span className="text-bmw-blue">{currentWorkspace.name}</span>
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">
                            Địa chỉ email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-muted w-4 h-4" />
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Nhập địa chỉ email" className="pl-10 mt-1 w-full h-12 rounded bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink text-sm placeholder-gray-400 dark:placeholder-muted dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white" required />
                        </div>
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-[1.5px] text-gray-600 dark:text-body">Vai trò</label>
                        <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full h-12 rounded bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink px-3 mt-1 dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white text-sm" >
                            {/* Không có ADMIN: mỗi workspace chỉ có 1 Quản trị viên (chủ sở hữu) */}
                            <option value="MANAGER">Quản lý — quản lý dự án & phòng ban</option>
                            <option value="MEMBER">Thành viên — làm việc bình thường</option>
                        </select>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsDialogOpen(false)} className="h-11 px-5 text-sm font-bold uppercase tracking-[1.4px] rounded-full border border-hairline-strong text-ink hover:bg-white/10 transition" >
                            Hủy
                        </button>
                        <button type="submit" disabled={isSubmitting || !currentWorkspace} className="h-11 px-5 text-sm font-bold uppercase tracking-[1.4px] rounded-full bg-m-blue-light text-black hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition" >
                            {isSubmitting ? "Đang gửi..." : "Gửi lời mời"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteMemberDialog;
