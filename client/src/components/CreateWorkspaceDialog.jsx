import { useState } from 'react';
import { X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { addWorkspace } from '../features/workspaceSlice';
import toast from 'react-hot-toast';

const CreateWorkspaceDialog = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        setIsSubmitting(true);
        try {
            const token = await getToken();
            const workspace = await apiFetch(token, '/workspaces', {
                method: 'POST',
                body: formData,
            });
            dispatch(addWorkspace(workspace));
            toast.success('Đã tạo không gian làm việc!');
            setFormData({ name: '', description: '' });
            onClose();
        } catch (err) {
            toast.error('Tạo thất bại: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-surface-card w-full max-w-md rounded-lg shadow-spotify-lg">
                <div className="flex items-center justify-between p-5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-ink">
                        Tạo không gian làm việc mới
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-muted">
                        <X className="size-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 pt-0 space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-[1.5px] text-gray-700 dark:text-body mb-1">
                            Tên không gian làm việc <span className="text-m-red">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ví dụ: Công ty ABC"
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            className="w-full h-12 px-3 text-sm rounded bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink placeholder-gray-400 dark:placeholder-muted dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-[1.5px] text-gray-700 dark:text-body mb-1">
                            Mô tả
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Mô tả ngắn về không gian làm việc..."
                            value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded bg-white dark:bg-surface-elevated text-gray-900 dark:text-ink placeholder-gray-400 dark:placeholder-muted dark:shadow-spotify-inset focus:outline-none focus:outline-1 focus:outline-white resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-11 px-4 text-sm font-bold uppercase tracking-[1.4px] rounded-full border border-hairline-strong text-ink hover:bg-white/10 transition"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()}
                            className="h-11 px-4 text-sm font-bold uppercase tracking-[1.4px] rounded-full bg-m-blue-light text-black hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition"
                        >
                            {isSubmitting ? 'Đang tạo...' : 'Tạo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateWorkspaceDialog;
