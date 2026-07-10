import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRightIcon, SettingsIcon, KanbanIcon, ChartColumnIcon, CalendarIcon, ArrowRightIcon } from 'lucide-react';
import { useSelector } from 'react-redux';

const ProjectSidebar = () => {

    const location = useLocation();

    const [expandedProjects, setExpandedProjects] = useState(new Set());
    const [searchParams] = useSearchParams();

    const projects = useSelector(
        (state) => state?.workspace?.currentWorkspace?.projects || []
    );

    const getProjectSubItems = (projectId) => [
        { title: 'Công việc', icon: KanbanIcon, url: `/projectsDetail?id=${projectId}&tab=tasks` },
        { title: 'Phân tích', icon: ChartColumnIcon, url: `/projectsDetail?id=${projectId}&tab=analytics` },
        { title: 'Lịch', icon: CalendarIcon, url: `/projectsDetail?id=${projectId}&tab=calendar` },
        { title: 'Cài đặt', icon: SettingsIcon, url: `/projectsDetail?id=${projectId}&tab=settings` }
    ];

    const toggleProject = (id) => {
        const newSet = new Set(expandedProjects);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setExpandedProjects(newSet);
    };

    return (
        <div className="mt-6 px-3">
            <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-xs font-bold text-gray-500 dark:text-muted">
                    Dự án
                </h3>
                <Link to="/projects">
                    <button className="size-5 rounded-full text-gray-500 dark:text-muted hover:text-gray-900 dark:hover:text-ink hover:bg-gray-100 dark:hover:bg-surface-elevated flex items-center justify-center transition-colors duration-200">
                        <ArrowRightIcon className="size-3" />
                    </button>
                </Link>
            </div>

            <div className="space-y-1 px-3">
                {projects.map((project) => (
                    <div key={project.id}>
                        <button onClick={() => toggleProject(project.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-full transition-colors duration-200 text-gray-700 dark:text-body hover:bg-gray-100 dark:hover:bg-surface-soft hover:text-gray-900 dark:hover:text-ink" >
                            <ChevronRightIcon className={`size-3 text-gray-500 dark:text-muted transition-transform duration-200 ${expandedProjects.has(project.id) && 'rotate-90'}`} />
                            <div className="size-2 rounded-full bg-bmw-blue" />
                            <span className="truncate max-w-40 text-sm">{project.name}</span>
                        </button>

                        {expandedProjects.has(project.id) && (
                            <div className="ml-5 mt-1 space-y-1 border-l border-gray-200 dark:border-hairline">
                                {getProjectSubItems(project.id).map((subItem) => {
                                    // checking if the current path matches the sub-item's URL
                                    const isActive =
                                        location.pathname === `/projectsDetail` &&
                                        searchParams.get('id') === project.id &&
                                        searchParams.get('tab') === subItem.title.toLowerCase();

                                    return (
                                        <Link key={subItem.title} to={subItem.url} className={`flex items-center gap-3 px-3 py-1.5 rounded-full transition-colors duration-200 text-xs ${isActive ? 'bg-gray-100 text-bmw-blue dark:bg-surface-elevated dark:text-bmw-blue' : 'text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-ink hover:bg-gray-100 dark:hover:bg-surface-soft'}`} >
                                            <subItem.icon className="size-3" />
                                            {subItem.title}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectSidebar;