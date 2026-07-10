import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { useAuth, useUser } from "../context/AuthContext";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";

const AddProjectMember = ({ isDialogOpen, setIsDialogOpen }) => {

    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');

    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const { getToken } = useAuth();
    const { user } = useUser();

    const project = currentWorkspace?.projects.find((p) => p.id === id);
    const projectMembersEmails = project?.members.map((member) => member.user.email) || [];

    // Admin workspace hoặc trưởng dự án → thêm thẳng; còn lại → gửi yêu cầu duyệt
    const isWsAdmin = currentWorkspace?.members?.some(
        (m) => m.userId === user?.id && m.role === "ADMIN"
    );
    const isLead = project?.team_lead === user?.id;
    const canAddDirectly = isWsAdmin || isLead;

    const [email, setEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!project) return;
        setIsAdding(true);
        try {
            const token = await getToken();
            if (canAddDirectly) {
                await apiFetch(token, `/projects/${project.id}/members`, {
                    method: 'POST',
                    body: { email },
                });
                toast.success("Thêm thành viên thành công!");
            } else {
                await apiFetch(token, `/member-requests/project/${project.id}`, {
                    method: 'POST',
                    body: { email },
                });
                toast.success("Đã gửi yêu cầu thêm thành viên. Chờ quản trị viên duyệt.");
            }
            setIsDialogOpen(false);
            setEmail('');
        } catch (err) {
            toast.error("Thất bại: " + err.message);
        } finally {
            setIsAdding(false);
        }
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="rounded-lg bg-white dark:bg-surface-card shadow-spotify-lg p-6 w-full max-w-md text-ink dark:text-body">
                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 dark:text-ink">
                        <UserPlus className="size-5 text-ink dark:text-ink" /> {canAddDirectly ? "Thêm thành viên dự án" : "Yêu cầu thêm thành viên"}
                    </h2>
                    {project && (
                        <p className="text-sm text-body dark:text-muted mt-1">
                            {canAddDirectly ? "Thêm vào dự án" : "Gửi yêu cầu cho dự án"}: <span className="text-m-blue-light">{project.name}</span>
                        </p>
                    )}
                    {!canAddDirectly && (
                        <p className="text-xs text-m-warning mt-1">
                            Bạn không phải quản trị viên — yêu cầu sẽ được gửi tới quản trị viên/trưởng dự án để duyệt.
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email select */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-xs font-bold text-ink dark:text-body-strong">
                            Chọn thành viên
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted dark:text-muted w-4 h-4" />
                            <select value={email} onChange={(e) => setEmail(e.target.value)} className="rounded pl-10 mt-1 w-full bg-white dark:bg-surface-elevated dark:shadow-spotify-inset text-ink dark:text-ink text-sm py-2 focus:outline-none" required >
                                <option value="">Chọn thành viên</option>
                                {currentWorkspace?.members
                                    .filter((member) => !projectMembersEmails.includes(member.user.email))
                                    .map((member) => (
                                        <option key={member.user.id} value={member.user.email}> {member.user.email} </option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsDialogOpen(false)} className="rounded-full px-5 py-2 text-sm font-bold text-ink dark:text-body hover:bg-surface-soft dark:hover:bg-surface-elevated transition" >
                            Hủy
                        </button>
                        <button type="submit" disabled={isAdding || !project || !email} className="rounded-full px-5 py-2 text-sm font-bold bg-m-blue-light text-black hover:bg-m-blue-dark disabled:opacity-50 transition" >
                            {isAdding ? "Đang xử lý..." : canAddDirectly ? "Thêm thành viên" : "Gửi yêu cầu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProjectMember;
