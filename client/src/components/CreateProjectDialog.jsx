import { useState, useEffect } from "react";
import { XIcon, Building2 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { addProject } from "../features/workspaceSlice";
import DepartmentManager from "./DepartmentManager";

const CreateProjectDialog = ({ isDialogOpen, setIsDialogOpen }) => {

    const { currentWorkspace } = useSelector((state) => state.workspace);
    const dispatch = useDispatch();
    const { getToken } = useAuth();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "",
        end_date: "",
        team_members: [],
        team_lead: "",
        departmentId: "",
        progress: 0,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [memberEmail, setMemberEmail] = useState("");
    const [departments, setDepartments] = useState([]);
    const [showDeptManager, setShowDeptManager] = useState(false);

    const fetchDepartments = async () => {
        if (!currentWorkspace?.id) return;
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/departments/workspace/${currentWorkspace.id}`);
            setDepartments(data);
        } catch {
            /* silent */
        }
    };

    useEffect(() => {
        if (isDialogOpen) fetchDepartments();
    }, [isDialogOpen, currentWorkspace?.id]);

    const addTeamMember = () => {
        const input = memberEmail.trim();
        if (!input) return;
        // Phải đúng định dạng email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
            toast.error("Email không hợp lệ");
            return;
        }
        // Chỉ cho phép email đã thuộc workspace (so khớp không phân biệt hoa/thường)
        const match = currentWorkspace?.members?.find(
            (m) => m.user.email.toLowerCase() === input.toLowerCase()
        );
        if (!match) {
            toast.error("Email này chưa thuộc không gian làm việc. Hãy mời họ vào workspace trước.");
            return;
        }
        // Dùng email gốc trong DB để backend khớp chính xác
        const email = match.user.email;
        if (formData.team_members.includes(email)) {
            toast.error("Thành viên đã được thêm");
            return;
        }
        setFormData((prev) => ({ ...prev, team_members: [...prev.team_members, email] }));
        setMemberEmail("");
    };

    const today = new Date().toISOString().split("T")[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentWorkspace) return;
        // Bắt buộc chọn phòng ban
        if (!formData.departmentId) {
            toast.error("Vui lòng chọn phòng ban cho dự án");
            return;
        }
        // Chặn ngày bắt đầu trong quá khứ
        if (formData.start_date && formData.start_date < today) {
            toast.error("Ngày bắt đầu không được trước ngày hôm nay");
            return;
        }
        if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
            toast.error("Ngày kết thúc phải sau ngày bắt đầu");
            return;
        }
        setIsSubmitting(true);
        try {
            const token = await getToken();
            const project = await apiFetch(token, `/projects/workspace/${currentWorkspace.id}`, {
                method: 'POST',
                body: formData,
            });
            dispatch(addProject(project));
            setIsDialogOpen(false);
            setFormData({ name: "", description: "", status: "PLANNING", priority: "MEDIUM", start_date: "", end_date: "", team_members: [], team_lead: "", departmentId: "", progress: 0 });
            setMemberEmail("");
            toast.success("Tạo dự án thành công!");
        } catch (err) {
            toast.error("Tạo dự án thất bại: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeTeamMember = (email) => {
        setFormData((prev) => ({ ...prev, team_members: prev.team_members.filter(m => m !== email) }));
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50 p-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg text-zinc-900 dark:text-zinc-200 relative max-h-[90vh] overflow-y-auto">
                <button className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => setIsDialogOpen(false)} >
                    <XIcon className="size-5" />
                </button>

                <h2 className="text-xl font-medium mb-1">Tạo dự án mới</h2>
                {currentWorkspace && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                        Trong không gian làm việc: <span className="text-blue-600 dark:text-blue-400">{currentWorkspace.name}</span>
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Project Name */}
                    <div>
                        <label className="block text-sm mb-1">Tên dự án</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nhập tên dự án" className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" required />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm mb-1">Mô tả</label>
                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả dự án của bạn" className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm h-20" />
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Trạng thái</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" >
                                <option value="PLANNING">Lên kế hoạch</option>
                                <option value="ACTIVE">Đang hoạt động</option>
                                <option value="COMPLETED">Hoàn thành</option>
                                <option value="ON_HOLD">Tạm dừng</option>
                                <option value="CANCELLED">Đã hủy</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Độ ưu tiên</label>
                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" >
                                <option value="LOW">Thấp</option>
                                <option value="MEDIUM">Trung bình</option>
                                <option value="HIGH">Cao</option>
                            </select>
                        </div>
                    </div>

                    {/* Phòng ban */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm">Phòng ban <span className="text-red-500">*</span></label>
                            <button type="button" onClick={() => setShowDeptManager(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                <Building2 className="size-3" /> Quản lý
                            </button>
                        </div>
                        <select required value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm">
                            <option value="">-- Chọn phòng ban --</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        {departments.length === 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Chưa có phòng ban. Bấm "Quản lý" để tạo trước khi tạo dự án.
                            </p>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Ngày bắt đầu</label>
                            <input type="date" value={formData.start_date} min={today} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Ngày kết thúc</label>
                            <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} min={formData.start_date} className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" />
                        </div>
                    </div>

                    {/* Lead */}
                    <div>
                        <label className="block text-sm mb-1">Trưởng dự án</label>
                        <select value={formData.team_lead} onChange={(e) => setFormData({ ...formData, team_lead: e.target.value, team_members: e.target.value ? [...new Set([...formData.team_members, e.target.value])] : formData.team_members, })} className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" >
                            <option value="">Chưa có</option>
                            {currentWorkspace?.members?.map((member) => (
                                <option key={member.user.email} value={member.user.email}>
                                    {member.user.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Team Members */}
                    <div>
                        <label className="block text-sm mb-1">Thành viên nhóm</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="email"
                                list="workspace-member-emails"
                                value={memberEmail}
                                onChange={(e) => setMemberEmail(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addTeamMember();
                                    }
                                }}
                                placeholder="Nhập email thành viên..."
                                className="flex-1 px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                            />
                            <button type="button" onClick={addTeamMember} className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-sm whitespace-nowrap" >
                                Thêm
                            </button>
                        </div>
                        {/* Gợi ý email từ thành viên workspace */}
                        <datalist id="workspace-member-emails">
                            {currentWorkspace?.members
                                ?.filter((m) => !formData.team_members.includes(m.user.email))
                                .map((member) => (
                                    <option key={member.user.email} value={member.user.email} />
                                ))}
                        </datalist>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Chỉ thêm được email đã thuộc không gian làm việc.</p>

                        {formData.team_members.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.team_members.map((email) => (
                                    <div key={email} className="flex items-center gap-1 bg-blue-200/50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md text-sm" >
                                        {email}
                                        <button type="button" onClick={() => removeTeamMember(email)} className="ml-1 hover:bg-blue-300/30 dark:hover:bg-blue-500/30 rounded" >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 text-sm">
                        <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800" >
                            Hủy
                        </button>
                        <button type="submit" disabled={isSubmitting || !currentWorkspace} className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white dark:text-zinc-200 disabled:opacity-50" >
                            {isSubmitting ? "Đang tạo..." : "Tạo dự án"}
                        </button>
                    </div>
                </form>
            </div>

            <DepartmentManager isOpen={showDeptManager} setIsOpen={setShowDeptManager} onChange={fetchDepartments} />
        </div>
    );
};

export default CreateProjectDialog;
