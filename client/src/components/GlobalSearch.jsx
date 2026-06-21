import { useState, useMemo, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { SearchIcon, FolderOpen, ListTodo } from "lucide-react";

const GlobalSearch = () => {
    const navigate = useNavigate();
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q || !currentWorkspace?.projects) return { projects: [], tasks: [] };

        const projects = currentWorkspace.projects
            .filter((p) => p.name?.toLowerCase().includes(q))
            .slice(0, 5);

        const tasks = [];
        for (const p of currentWorkspace.projects) {
            for (const t of p.tasks || []) {
                if (t.title?.toLowerCase().includes(q)) {
                    tasks.push({ ...t, projectId: p.id, projectName: p.name });
                }
                if (tasks.length >= 6) break;
            }
            if (tasks.length >= 6) break;
        }
        return { projects, tasks };
    }, [query, currentWorkspace]);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const goProject = (id) => {
        setOpen(false);
        setQuery("");
        navigate(`/projectsDetail?id=${id}&tab=tasks`);
    };
    const goTask = (t) => {
        setOpen(false);
        setQuery("");
        navigate(`/taskDetails?projectId=${t.projectId}&taskId=${t.id}`);
    };

    const hasResults = results.projects.length > 0 || results.tasks.length > 0;

    return (
        <div className="relative flex-1 max-w-sm" ref={ref}>
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3.5" />
            <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="Tìm kiếm dự án, công việc..."
                className="pl-8 pr-4 py-2 w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
            />

            {open && query.trim() && (
                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                    {!hasResults ? (
                        <p className="px-3 py-4 text-sm text-gray-400 dark:text-zinc-500 text-center">Không tìm thấy kết quả</p>
                    ) : (
                        <>
                            {results.projects.length > 0 && (
                                <div>
                                    <p className="px-3 pt-2 pb-1 text-[11px] uppercase font-semibold text-gray-400 dark:text-zinc-500">Dự án</p>
                                    {results.projects.map((p) => (
                                        <button key={p.id} onClick={() => goProject(p.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                                            <FolderOpen className="size-4 text-blue-500 flex-shrink-0" />
                                            <span className="truncate">{p.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {results.tasks.length > 0 && (
                                <div>
                                    <p className="px-3 pt-2 pb-1 text-[11px] uppercase font-semibold text-gray-400 dark:text-zinc-500">Công việc</p>
                                    {results.tasks.map((t) => (
                                        <button key={t.id} onClick={() => goTask(t)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                                            <ListTodo className="size-4 text-green-500 flex-shrink-0" />
                                            <span className="truncate flex-1">{t.title}</span>
                                            <span className="text-xs text-gray-400 dark:text-zinc-500 truncate max-w-24">{t.projectName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
