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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md mx-4 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                        Tạo không gian làm việc mới
                    </h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                        <X className="size-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Tên không gian làm việc <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ví dụ: Công ty ABC"
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Mô tả
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Mô tả ngắn về không gian làm việc..."
                            value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()}
                            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
