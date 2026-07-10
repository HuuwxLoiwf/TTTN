import { useState, useEffect, useRef } from "react";
import { useAuth, useUser } from "../context/AuthContext";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { UploadCloud, File, Trash2, Download, FileImage, FileText, FileArchive, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import { apiFetch, API_BASE_URL } from "../lib/api";
import { format } from "date-fns";
import FilePreview, { canPreview } from "./FilePreview";

const reviewBadge = {
    PENDING: { label: "Chờ duyệt", cls: "bg-m-warning/15 text-m-warning", Icon: Clock },
    APPROVED: { label: "Đạt yêu cầu", cls: "bg-m-success/15 text-m-success", Icon: CheckCircle2 },
    REJECTED: { label: "Chưa đạt", cls: "bg-m-red/15 text-m-red", Icon: XCircle },
};

const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return FileImage;
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
    return FileText;
};

const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ProjectFiles = ({ projectId }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { currentWorkspace } = useSelector((state) => state.workspace);

    // Admin workspace hoặc trưởng dự án mới được đánh giá tài liệu
    const project = currentWorkspace?.projects?.find((p) => p.id === projectId);
    const isAdmin = currentWorkspace?.members?.some((m) => m.userId === user?.id && m.role === "ADMIN");
    const canReview = isAdmin || project?.team_lead === user?.id;

    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const fileInputRef = useRef(null);

    const fetchFiles = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/files?projectId=${projectId}`);
            setFiles(data);
        } catch (e) {
            toast.error("Không thể tải danh sách file");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFiles(); }, [projectId]);

    const handleUpload = async (selectedFiles) => {
        if (!selectedFiles.length) return;
        setUploading(true);
        const token = await getToken();
        let successCount = 0;

        for (const file of selectedFiles) {
            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("projectId", projectId);

                const res = await fetch(`${API_BASE_URL}/files/upload`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
                if (!res.ok) throw new Error(await res.text());
                const uploaded = await res.json();
                setFiles((prev) => [uploaded, ...prev]);
                successCount++;
            } catch (err) {
                toast.error(`Lỗi upload ${file.name}: ${err.message}`);
            }
        }

        if (successCount > 0) toast.success(`Đã tải lên ${successCount} file`);
        setUploading(false);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        handleUpload(files);
        e.target.value = "";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        handleUpload(files);
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm("Bạn có chắc muốn xóa file này?")) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/files/${fileId}`, { method: "DELETE" });
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
            toast.success("Đã xóa file");
        } catch (err) {
            toast.error("Xóa thất bại: " + err.message);
        }
    };

    const handleReview = async (fileId, reviewStatus) => {
        let reviewNote = "";
        if (reviewStatus === "REJECTED") {
            reviewNote = window.prompt("Ghi chú: cần thực hiện lại những gì?") ?? "";
        }
        try {
            const token = await getToken();
            const updated = await apiFetch(token, `/files/${fileId}/review`, {
                method: "PUT",
                body: { reviewStatus, reviewNote },
            });
            setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...updated } : f)));
            toast.success(reviewStatus === "APPROVED" ? "Đã đánh giá: Đạt" : "Đã đánh giá: Chưa đạt");
        } catch (err) {
            toast.error("Đánh giá thất bại: " + err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Upload Zone — chỉ admin/trưởng dự án (tài liệu chung của dự án).
                User thường upload tài liệu công việc của mình ở chi tiết task. */}
            {canReview ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                        dragOver
                            ? "border-bmw-blue bg-bmw-blue/10"
                            : "border-hairline hover:border-bmw-blue hover:bg-surface-card"
                    }`}
                >
                    <UploadCloud className={`size-10 mx-auto mb-3 ${dragOver ? "text-bmw-blue" : "text-zinc-400 dark:text-muted"}`} />
                    <p className="text-sm font-medium text-zinc-700 dark:text-body">
                        {uploading ? "Đang tải lên..." : "Kéo file vào đây hoặc click để chọn"}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-muted mt-1">Tài liệu chung cho cả dự án · tối đa 10MB mỗi file</p>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                </div>
            ) : (
                <div className="bg-surface-card rounded-lg p-4 text-center text-sm text-zinc-500 dark:text-muted">
                    Tài liệu chung của dự án (chỉ quản trị viên/trưởng dự án đăng tải). Bạn có thể đính kèm tài liệu công việc trong từng công việc của mình.
                </div>
            )}

            {/* File List */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-700 dark:text-body-strong">
                    Tài liệu dự án ({files.length})
                </h3>

                {loading ? (
                    <p className="text-sm text-zinc-400 dark:text-muted text-center py-4">Đang tải...</p>
                ) : files.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400 dark:text-muted">
                        <File className="size-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Chưa có tài liệu nào</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {files.map((file) => {
                            const Icon = getFileIcon(file.fileName);
                            const badge = reviewBadge[file.reviewStatus] || reviewBadge.PENDING;
                            const BadgeIcon = badge.Icon;
                            return (
                                <div
                                    key={file.id}
                                    className="p-3 rounded-lg bg-surface-card hover:bg-surface-elevated transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="size-9 rounded-full bg-surface-elevated flex items-center justify-center flex-shrink-0">
                                            <Icon className="size-5 text-bmw-blue dark:text-bmw-blue" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-zinc-900 dark:text-ink truncate">{file.fileName}</p>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${badge.cls}`}>
                                                    <BadgeIcon className="size-3" /> {badge.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-400 dark:text-muted">
                                                {file.uploader?.name || file.uploader?.email} &bull; {format(new Date(file.createdAt), "dd/MM/yyyy HH:mm")}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {canPreview(file.fileName) && (
                                                <button
                                                    onClick={() => setPreviewFile(file)}
                                                    className="p-2 rounded-full hover:bg-white/10 text-zinc-500 dark:text-muted hover:text-bmw-blue transition-colors"
                                                    title="Xem trực tiếp"
                                                >
                                                    <Eye className="size-4" />
                                                </button>
                                            )}
                                            <a
                                                href={file.fileUrl}
                                                download={file.fileName}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 rounded-full hover:bg-white/10 text-zinc-500 dark:text-muted transition-colors"
                                            >
                                                <Download className="size-4" />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-m-red dark:hover:text-m-red transition-colors"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Ghi chú đánh giá (nếu chưa đạt) */}
                                    {file.reviewStatus === "REJECTED" && file.reviewNote && (
                                        <p className="mt-2 ml-12 text-xs text-m-red bg-m-red/10 rounded-lg px-2 py-1">
                                            <strong>Cần làm lại:</strong> {file.reviewNote}
                                        </p>
                                    )}

                                    {/* Nút đánh giá — chỉ admin/trưởng dự án, và CHỈ với file chưa duyệt.
                                        File do admin up tự "Đạt" nên không hiện nút. */}
                                    {canReview && file.reviewStatus !== "APPROVED" && (
                                        <div className="mt-2 ml-12 flex gap-2">
                                            <button
                                                onClick={() => handleReview(file.id, "APPROVED")}
                                                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-m-success/15 text-m-success hover:bg-m-success hover:text-black transition-colors"
                                            >
                                                <CheckCircle2 className="size-3.5" /> Đạt
                                            </button>
                                            <button
                                                onClick={() => handleReview(file.id, "REJECTED")}
                                                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-m-red/15 text-m-red hover:bg-m-red hover:text-white transition-colors"
                                            >
                                                <XCircle className="size-3.5" /> Chưa đạt
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
        </div>
    );
};

export default ProjectFiles;
