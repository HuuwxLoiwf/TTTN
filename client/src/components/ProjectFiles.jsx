import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { UploadCloud, File, Trash2, Download, FileImage, FileText, FileArchive } from "lucide-react";
import { apiFetch } from "../lib/api";
import { format } from "date-fns";

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
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
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

                const res = await fetch(`/api/files/upload`, {
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

    return (
        <div className="space-y-6">
            {/* Upload Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragOver
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
            >
                <UploadCloud className={`size-10 mx-auto mb-3 ${dragOver ? "text-blue-500" : "text-zinc-400 dark:text-zinc-500"}`} />
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {uploading ? "Đang tải lên..." : "Kéo file vào đây hoặc click để chọn"}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Hỗ trợ mọi loại file, tối đa 10MB mỗi file</p>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            </div>

            {/* File List */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Tài liệu dự án ({files.length})
                </h3>

                {loading ? (
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4">Đang tải...</p>
                ) : files.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400 dark:text-zinc-500">
                        <File className="size-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Chưa có tài liệu nào</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {files.map((file) => {
                            const Icon = getFileIcon(file.fileName);
                            return (
                                <div
                                    key={file.id}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex-shrink-0">
                                        <Icon className="size-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{file.fileName}</p>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                            {file.uploader?.name || file.uploader?.email} &bull; {format(new Date(file.createdAt), "dd/MM/yyyy HH:mm")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <a
                                            href={file.fileUrl}
                                            download={file.fileName}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 transition-colors"
                                        >
                                            <Download className="size-4" />
                                        </a>
                                        <button
                                            onClick={() => handleDelete(file.id)}
                                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectFiles;
