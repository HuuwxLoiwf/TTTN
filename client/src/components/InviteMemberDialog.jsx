import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

const InviteMemberDialog = ({ isDialogOpen, setIsDialogOpen }) => {

    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
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
            setIsDialogOpen(false);
            setFormData({ email: "", role: "MEMBER" });
            toast.success("Gửi lời mời thành công!");
        } catch (err) {
            toast.error("Gửi lời mời thất bại: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200">
                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UserPlus className="size-5 text-zinc-900 dark:text-zinc-200" /> Mời thành viên
                    </h2>
                    {currentWorkspace && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-400">
                            Mời vào không gian làm việc: <span className="text-blue-600 dark:text-blue-400">{currentWorkspace.name}</span>
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                            Địa chỉ email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 w-4 h-4" />
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Nhập địa chỉ email" className="pl-10 mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 py-2 focus:outline-none focus:border-blue-500" required />
                        </div>
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">Vai trò</label>
                        <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 py-2 px-3 mt-1 focus:outline-none focus:border-blue-500 text-sm" >
                            <option value="ADMIN">Quản trị viên — toàn quyền</option>
                            <option value="MANAGER">Quản lý — quản lý dự án & phòng ban</option>
                            <option value="MEMBER">Thành viên — làm việc bình thường</option>
                            <option value="VIEWER">Người xem — chỉ xem</option>
                        </select>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsDialogOpen(false)} className="px-5 py-2 rounded text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" >
                            Hủy
                        </button>
                        <button type="submit" disabled={isSubmitting || !currentWorkspace} className="px-5 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white disabled:opacity-50 hover:opacity-90 transition" >
                            {isSubmitting ? "Đang gửi..." : "Gửi lời mời"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteMemberDialog;
