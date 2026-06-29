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
        <div className="p-4 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                    <Paperclip className="size-4" /> Tệp đính kèm ({files.length})
                </h3>
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                    {uploading ? "Đang tải..." : "+ Thêm file"}
                </button>
                <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />
            </div>

            {files.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2">Chưa có tệp đính kèm</p>
            ) : (
                <div className="space-y-1.5">
                    {files.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-50 dark:bg-zinc-800/60 text-sm">
                            <FileText className="size-4 text-blue-500 flex-shrink-0" />
                            <span className="flex-1 truncate text-zinc-800 dark:text-zinc-200">{f.fileName}</span>
                            {canPreview(f.fileName) && (
                                <button onClick={() => setPreviewFile(f)} className="p-1 text-zinc-400 hover:text-blue-500" title="Xem trực tiếp">
                                    <Eye className="size-4" />
                                </button>
                            )}
                            <a href={f.fileUrl} target="_blank" rel="noreferrer" className="p-1 text-zinc-400 hover:text-blue-500">
                                <Download className="size-4" />
                            </a>
                            <button onClick={() => handleDelete(f.id)} className="p-1 text-zinc-400 hover:text-red-500">
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
