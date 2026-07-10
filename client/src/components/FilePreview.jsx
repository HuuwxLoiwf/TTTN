import { XIcon, Download } from "lucide-react";

const getExt = (name = "") => name.split(".").pop().toLowerCase();
const isImage = (name) => ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(getExt(name));
const isPdf = (name) => getExt(name) === "pdf";

export const canPreview = (name) => isImage(name) || isPdf(name);

/**
 * Modal xem trước file (ảnh/PDF) ngay trong app, không cần tải về.
 * file: { fileName, fileUrl }
 */
const FilePreview = ({ file, onClose }) => {
    if (!file) return null;
    const image = isImage(file.fileName);
    const pdf = isPdf(file.fileName);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-surface-card rounded-lg shadow-spotify-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Thanh tiêu đề */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-hairline dark:border-hairline">
                    <p className="text-sm font-medium text-ink dark:text-ink truncate">{file.fileName}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={file.fileUrl} download={file.fileName} target="_blank" rel="noreferrer" className="p-2 rounded-full text-m-blue-light hover:bg-white/10 transition-colors" title="Tải về">
                            <Download className="size-4" />
                        </a>
                        <button onClick={onClose} className="p-2 rounded-full text-m-red hover:bg-white/10 transition-colors" title="Đóng">
                            <XIcon className="size-5" />
                        </button>
                    </div>
                </div>

                {/* Nội dung xem trước */}
                <div className="flex-1 overflow-auto bg-surface-soft dark:bg-surface-soft flex items-center justify-center min-h-[60vh]">
                    {image && (
                        <img src={file.fileUrl} alt={file.fileName} className="max-w-full max-h-[80vh] object-contain" />
                    )}
                    {pdf && (
                        <iframe src={file.fileUrl} title={file.fileName} className="w-full h-[80vh]" />
                    )}
                    {!image && !pdf && (
                        <div className="text-center text-muted dark:text-muted p-8">
                            <p>Không thể xem trực tiếp loại file này.</p>
                            <a href={file.fileUrl} download target="_blank" rel="noreferrer" className="text-m-blue-light hover:underline text-sm mt-2 inline-block">Tải về để xem</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilePreview;
