import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { Plus, Search, FolderOpen } from "lucide-react";
import ProjectCard from "../components/ProjectCard";
import CreateProjectDialog from "../components/CreateProjectDialog";

export default function Projects() {

    // Lấy trực tiếp currentWorkspace để selector không tạo mảng mới mỗi render
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace);
    const projects = useMemo(() => currentWorkspace?.projects || [], [currentWorkspace]);

    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: "ALL",
        priority: "ALL",
        department: "ALL",
    });

    // Danh sách phòng ban xuất hiện trong các dự án
    const departments = useMemo(
        () => Array.from(
            new Map(projects.filter((p) => p.department).map((p) => [p.department.id, p.department])).values()
        ),
        [projects]
    );

    // Lọc dự án bằng useMemo (không setState → không vòng lặp vô hạn)
    const filteredProjects = useMemo(() => {
        let filtered = projects;
        if (searchTerm) {
            filtered = filtered.filter(
                (project) =>
                    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (filters.status !== "ALL") {
            filtered = filtered.filter((project) => project.status === filters.status);
        }
        if (filters.priority !== "ALL") {
            filtered = filtered.filter((project) => project.priority === filters.priority);
        }
        if (filters.department !== "ALL") {
            filtered = filtered.filter((project) => project.departmentId === filters.department);
        }
        return filtered;
    }, [projects, searchTerm, filters]);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-ink mb-1"> Dự án </h1>
                    <p className="text-gray-500 dark:text-body text-sm font-light"> Quản lý và theo dõi dự án của bạn </p>
                </div>
                <button onClick={() => setIsDialogOpen(true)} className="flex items-center px-6 py-3 text-sm uppercase font-bold tracking-[1.4px] rounded-full bg-m-blue-light text-black hover:scale-105 transition" >
                    <Plus className="size-4 mr-2" /> Dự án mới
                </button>
                <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-muted w-4 h-4" />
                    <input onChange={(e) => setSearchTerm(e.target.value)} value={searchTerm} className="w-full pl-10 text-sm pr-4 py-2.5 rounded-full bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink placeholder-gray-400 dark:placeholder-muted shadow-spotify-inset outline-none" placeholder="Tìm kiếm dự án..." />
                </div>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-4 py-2.5 rounded-full bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink text-sm shadow-spotify-inset outline-none" >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="PLANNING">Lên kế hoạch</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="ON_HOLD">Tạm dừng</option>
                    <option value="CANCELLED">Đã hủy</option>
                </select>
                <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="px-4 py-2.5 rounded-full bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink text-sm shadow-spotify-inset outline-none" >
                    <option value="ALL">Tất cả ưu tiên</option>
                    <option value="HIGH">Cao</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="LOW">Thấp</option>
                </select>
                <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} className="px-4 py-2.5 rounded-full bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink text-sm shadow-spotify-inset outline-none" >
                    <option value="ALL">Tất cả phòng ban</option>
                    {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-surface-elevated rounded-full flex items-center justify-center">
                            <FolderOpen className="w-12 h-12 text-gray-400 dark:text-muted" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-ink mb-1">
                            Không tìm thấy dự án
                        </h3>
                        <p className="text-gray-500 dark:text-body font-light mb-6 text-sm">
                            Tạo dự án đầu tiên để bắt đầu
                        </p>
                        <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-1.5 rounded-full bg-m-blue-light text-black hover:scale-105 px-6 py-3 mx-auto text-sm uppercase font-bold tracking-[1.4px] transition" >
                            <Plus className="size-4" />
                            Tạo dự án
                        </button>
                    </div>
                ) : (
                    filteredProjects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))
                )}
            </div>
        </div>
    );
}
