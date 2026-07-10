import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import CreateWorkspaceDialog from "./CreateWorkspaceDialog";

function WorkspaceDropdown() {

    const { workspaces } = useSelector((state) => state.workspace);
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const onSelectWorkspace = (organizationId) => {
        dispatch(setCurrentWorkspace(organizationId))
        setIsOpen(false);
        navigate('/')
    }

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative m-4" ref={dropdownRef}>
            <button onClick={() => setIsOpen(prev => !prev)} className="w-full flex items-center justify-between p-3 h-auto text-left rounded-lg border border-transparent hover:bg-gray-100 dark:hover:bg-surface-elevated transition-colors" >
                <div className="flex items-center gap-3">
                    <img src={currentWorkspace?.image_url || assets.workspace_img_default} alt={currentWorkspace?.name} className="w-8 h-8 rounded-full" />
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-800 dark:text-ink text-sm truncate">
                            {currentWorkspace?.name || "Chọn không gian làm việc"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-muted truncate">
                            {workspaces.length} không gian làm việc
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-muted flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 rounded-lg bg-white dark:bg-surface-elevated border border-gray-200 dark:border-transparent dark:shadow-spotify-lg top-full left-0 overflow-hidden">
                    <div className="p-2">
                        <p className="text-xs font-bold text-gray-500 dark:text-muted mb-2 px-2">
                            Không gian làm việc
                        </p>
                        {workspaces.map((ws) => (
                            <div key={ws.id} onClick={() => onSelectWorkspace(ws.id)} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-surface-soft" >
                                <img src={ws.image_url || assets.workspace_img_default} alt={ws.name} className="w-6 h-6 rounded-full" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-ink truncate">
                                        {ws.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-muted truncate">
                                        {ws.members?.length || 0} thành viên
                                    </p>
                                </div>
                                {currentWorkspace?.id === ws.id && (
                                    <Check className="w-4 h-4 text-bmw-blue flex-shrink-0" />
                                )}
                            </div>
                        ))}

                        {workspaces.length === 0 && (
                            <p className="text-xs text-muted text-center py-2">
                                Chưa có không gian làm việc
                            </p>
                        )}
                    </div>

                    <hr className="border-gray-200 dark:border-hairline" />

                    <div
                        className="p-2 cursor-pointer group hover:bg-gray-100 dark:hover:bg-surface-soft"
                        onClick={() => { setIsOpen(false); setShowCreateDialog(true); }}
                    >
                        <p className="flex items-center text-xs gap-2 my-1 w-full rounded-full font-bold text-bmw-blue">
                            <Plus className="w-4 h-4" /> Tạo không gian làm việc
                        </p>
                    </div>
                </div>
            )}

            <CreateWorkspaceDialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
        </div>
    );
}

export default WorkspaceDropdown;
