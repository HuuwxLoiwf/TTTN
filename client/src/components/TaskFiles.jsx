import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Paperclip, Trash2, Download, FileText, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch, API_BASE_URL } from "../lib/api";
import FilePreview, { canPreview } from "./FilePreview";

const TaskFiles = ({ taskId }) => {
    const { getToken } = useAuth();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const inputRef = useRef(null);

    const fetchFiles = async () => {
        try {
            const token = await getToken();
            const data = await apiFetch(token, `/files?taskId=${taskId}`);
            setFiles(data);
        } catch {
            /* silent */
        }
    };

    useEffect(() => {
        if (taskId) fetchFiles();
    }, [taskId]);

    const handleUpload = async (e) => {
        const selected = Array.from(e.target.files || []);
        e.target.value = "";
        if (!selected.length) return;
        setUploading(true);
        const token = await getToken();
        let ok = 0;
        for (const file of selected) {
            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("taskId", taskId);
                const res = await fetch(`${API_BASE_URL}/files/upload`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
                if (!res.ok) throw new Error(await res.text());
                const uploaded = await res.json();
                setFiles((prev) => [uploaded, ...prev]);
                ok++;
            } catch (err) {
                toast.error(`Lỗi ${file.name}: ${err.message}`);
            }
        }
        if (ok > 0) toast.success(`Đã đính kèm ${ok} file`);
        setUploading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xóa file đính kèm này?")) return;
        try {
            const token = await getToken();
            await apiFetch(token, `/files/${id}`, { method: "DELETE" });
            setFiles((prev) => prev.filter((f) => f.id !== id));
        } catch (err) {
            toast.error("Xóa thất bại: " + err.message);
        }
    };

    return (
        <div className="p-4 rounded-lg bg-white dark:bg-surface-card">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-ink">
                    <Paperclip className="size-4" /> Tệp đính kèm ({files.length})
                </h3>
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs font-bold rounded-full px-3 py-1.5 bg-m-blue-light text-black hover:bg-m-blue-dark disabled:opacity-50 transition"
                >
                    {uploading ? "Đang tải..." : "+ Thêm file"}
                </button>
                <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />
            </div>

            {files.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-muted text-center py-2">Chưa có tệp đính kèm</p>
            ) : (
                <div className="space-y-1.5">
                    {files.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg dark:bg-surface-soft text-sm">
                            <span className="flex items-center justify-center rounded-full bg-surface-elevated size-7 flex-shrink-0">
                                <FileText className="size-3.5 text-m-blue-light" />
                            </span>
                            <span className="flex-1 truncate text-gray-800 dark:text-body-strong">{f.fileName}</span>
                            {canPreview(f.fileName) && (
                                <button onClick={() => setPreviewFile(f)} className="rounded-full p-1.5 text-gray-400 dark:text-muted hover:text-m-blue-light hover:bg-surface-elevated" title="Xem trực tiếp">
                                    <Eye className="size-4" />
                                </button>
                            )}
                            <a href={f.fileUrl} target="_blank" rel="noreferrer" className="rounded-full p-1.5 text-gray-400 dark:text-muted hover:text-m-blue-light hover:bg-surface-elevated">
                                <Download className="size-4" />
                            </a>
                            <button onClick={() => handleDelete(f.id)} className="rounded-full p-1.5 text-gray-400 dark:text-muted hover:text-m-red hover:bg-surface-elevated">
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
        </div>
    );
};

export default TaskFiles;
