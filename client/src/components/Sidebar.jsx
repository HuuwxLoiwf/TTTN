import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useUser } from '../context/AuthContext'
import MyTasksSidebar from './MyTasksSidebar'
import ProjectSidebar from './ProjectsSidebar'
import WorkspaceDropdown from './WorkspaceDropdown'
import { FolderOpenIcon, LayoutDashboardIcon, SettingsIcon, UsersIcon, ListTodoIcon, ShieldCheckIcon, UserCheckIcon, Trash2Icon, BarChart3Icon, CpuIcon } from 'lucide-react'

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {

    const { user } = useUser();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace);
    // Là admin nếu là admin gốc hoặc ADMIN của workspace hiện tại
    const isAdmin = user?.email === "admin@umc.com" ||
        currentWorkspace?.members?.some((m) => m.userId === user?.id && m.role === "ADMIN");

    const menuItems = [
        { name: 'Bảng điều khiển', href: '/', icon: LayoutDashboardIcon },
        { name: 'Công việc của tôi', href: '/my-tasks', icon: ListTodoIcon },
        { name: 'Dự án', href: '/projects', icon: FolderOpenIcon },
        { name: 'Nhóm', href: '/team', icon: UsersIcon },
        { name: 'Thiết bị', href: '/equipment', icon: CpuIcon },
        { name: 'Báo cáo', href: '/reports', icon: BarChart3Icon },
    ]

    // Các mục CHỈ admin mới thấy
    const adminItems = [
        { name: 'Duyệt tài khoản', href: '/pending-accounts', icon: UserCheckIcon },
        { name: 'Nhật ký kiểm toán', href: '/audit-log', icon: ShieldCheckIcon },
        { name: 'Thùng rác', href: '/trash', icon: Trash2Icon },
    ]

    const sidebarRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setIsSidebarOpen]);

    return (
        <div ref={sidebarRef} className={`z-10 bg-white dark:bg-canvas min-w-68 flex flex-col h-screen max-sm:absolute border-r border-gray-100 dark:border-hairline/25 shadow-sm transition-all duration-300 ${isSidebarOpen ? 'left-0' : '-left-full'} `} >
            <div className="px-6 py-6 border-b border-gray-100 dark:border-hairline/20 flex items-center gap-3">
                <div className="size-8 rounded-lg bg-m-blue-light flex items-center justify-center text-black font-extrabold text-lg shadow-spotify-md animate-pulse-glow overflow-hidden">
                    {currentWorkspace?.image_url
                        ? <img src={currentWorkspace.image_url} alt="Logo" className="size-full object-cover" />
                        : (currentWorkspace?.name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-ink tracking-tight">UMC SaaS</p>
                    <p className="text-[10px] text-gray-500 dark:text-muted uppercase tracking-[1px] font-semibold">Quản Lý Dự Án</p>
                </div>
            </div>
            <WorkspaceDropdown />
            <div className='flex-1 overflow-y-scroll no-scrollbar flex flex-col'>
                <div>
                    <div className='p-3 pl-0 pr-2 space-y-0.5'>
                        {menuItems.map((item) => (
                            <NavLink to={item.href} key={item.name} className={({ isActive }) => `relative flex items-center gap-3 py-2.5 pl-6 pr-4 rounded-r-full text-gray-800 dark:text-body cursor-pointer transition-all duration-200 font-bold text-sm ${isActive ? 'bg-gray-100/70 dark:bg-surface-elevated text-m-blue-light dark:text-ink pl-7' : 'hover:bg-gray-50 dark:hover:bg-surface-soft hover:text-gray-950 dark:hover:text-ink hover:pl-7'}`} >
                                {({ isActive }) => (
                                    <>
                                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-m-blue-light rounded-r" />}
                                        <item.icon size={16} className={isActive ? 'text-m-blue-light' : 'text-gray-500 dark:text-muted'} />
                                        <p className='text-sm truncate'>{item.name}</p>
                                    </>
                                )}
                            </NavLink>
                        ))}

                        {/* Mục chỉ dành cho admin */}
                        {isAdmin && (
                            <>
                                <p className="px-6 pt-4 pb-1 text-[10px] uppercase font-bold tracking-[1.5px] text-gray-400 dark:text-muted">Quản trị</p>
                                {adminItems.map((item) => (
                                    <NavLink to={item.href} key={item.name} className={({ isActive }) => `relative flex items-center gap-3 py-2.5 pl-6 pr-4 rounded-r-full text-gray-800 dark:text-body cursor-pointer transition-all duration-200 font-bold text-sm ${isActive ? 'bg-gray-100/70 dark:bg-surface-elevated text-m-blue-light dark:text-ink pl-7' : 'hover:bg-gray-50 dark:hover:bg-surface-soft hover:text-gray-950 dark:hover:text-ink hover:pl-7'}`} >
                                        {({ isActive }) => (
                                            <>
                                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-m-blue-light rounded-r" />}
                                                <item.icon size={16} className={isActive ? 'text-m-blue-light' : 'text-gray-500 dark:text-muted'} />
                                                <p className='text-sm truncate'>{item.name}</p>
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </>
                        )}

                        <NavLink to="/settings" className={({ isActive }) => `relative flex items-center gap-3 py-2.5 pl-6 pr-4 rounded-r-full text-gray-800 dark:text-body cursor-pointer transition-all duration-200 font-bold text-sm ${isActive ? 'bg-gray-100/70 dark:bg-surface-elevated text-m-blue-light dark:text-ink pl-7' : 'hover:bg-gray-50 dark:hover:bg-surface-soft hover:text-gray-950 dark:hover:text-ink hover:pl-7'}`}>
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-m-blue-light rounded-r" />}
                                    <SettingsIcon size={16} className={isActive ? 'text-m-blue-light' : 'text-gray-500 dark:text-muted'} />
                                    <p className='text-sm truncate'>Cài đặt</p>
                                </>
                            )}
                        </NavLink>
                    </div>
                    <MyTasksSidebar />
                    <ProjectSidebar />
                </div>
            </div>

        </div>
    )
}

export default Sidebar
