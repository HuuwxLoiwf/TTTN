import { useEffect, useState } from 'react';
import { CheckSquareIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useUser } from '../context/AuthContext';

function MyTasksSidebar() {

    const { user } = useUser();

    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [showMyTasks, setShowMyTasks] = useState(false);
    const [myTasks, setMyTasks] = useState([]);

    const toggleMyTasks = () => setShowMyTasks(prev => !prev);

    const getTaskStatusColor = (status) => {
        switch (status) {
            case 'DONE':
                return 'bg-m-success';
            case 'IN_PROGRESS':
                return 'bg-m-warning';
            case 'TODO':
                return 'bg-gray-500 dark:bg-muted';
            default:
                return 'bg-gray-400 dark:bg-muted';
        }
    };

    const fetchUserTasks = () => {
        const userId = user?.id || '';
        if (!userId || !currentWorkspace) return;
        const currentWorkspaceTasks = currentWorkspace.projects.flatMap((project) => {
            return project.tasks.filter((task) => task?.assigneeId === userId);
        });

        setMyTasks(currentWorkspaceTasks);
    }

    useEffect(() => {
        fetchUserTasks()
    }, [currentWorkspace])

    return (
        <div className="mt-6 px-3">
            <div onClick={toggleMyTasks} className="flex items-center justify-between px-3 py-2 rounded-full cursor-pointer hover:bg-gray-100 dark:hover:bg-surface-elevated" >
                <div className="flex items-center gap-2">
                    <CheckSquareIcon className="w-4 h-4 text-gray-500 dark:text-muted" />
                    <h3 className="text-xs font-bold text-gray-700 dark:text-muted">Công việc của tôi</h3>
                    <span className="bg-gray-200 dark:bg-surface-elevated text-gray-700 dark:text-body text-xs px-2 py-0.5 rounded-full">
                        {myTasks.length}
                    </span>
                </div>
                {showMyTasks ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-muted" />
                ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-muted" />
                )}
            </div>

            {showMyTasks && (
                <div className="mt-2 pl-2">
                    <div className="space-y-1">
                        {myTasks.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-500 dark:text-muted text-center">
                                Chưa có công việc nào
                            </div>
                        ) : (
                            myTasks.map((task, index) => (
                                <Link key={index} to={`/taskDetails?projectId=${task.projectId}&taskId=${task.id}`} className="w-full rounded-full block transition-all duration-200 text-gray-700 dark:text-body hover:bg-gray-100 dark:hover:bg-surface-elevated hover:text-black dark:hover:text-ink" >
                                    <div className="flex items-center gap-2 px-3 py-2 w-full min-w-0">
                                        <div className={`w-2 h-2 rounded-full ${getTaskStatusColor(task.status)} flex-shrink-0`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">
                                                {task.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-muted lowercase">
                                                {task.status.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyTasksSidebar;
