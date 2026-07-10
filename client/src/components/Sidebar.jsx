import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useUser } from '../context/AuthContext'
import MyTasksSidebar from './MyTasksSidebar'
import ProjectSidebar from './ProjectsSidebar'
import WorkspaceDropdown from './WorkspaceDropdown'
import { FolderOpenIcon, LayoutDashboardIcon, SettingsIcon, UsersIcon, ListTodoIcon, ShieldCheckIcon, UserCheckIcon, Trash2Icon, BarChart3Icon } from 'lucide-react'

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
        <div ref={sidebarRef} className={`z-10 bg-white dark:bg-canvas min-w-68 flex flex-col h-screen max-sm:absolute transition-all ${isSidebarOpen ? 'left-0' : '-left-full'} `} >
            <div className="px-5 py-4">
                <p className="text-sm font-bold text-gray-900 dark:text-ink tracking-tight">UMC</p>
                <p className="text-xs text-gray-500 dark:text-muted">Quản Lý Dự Án</p>
            </div>
            <WorkspaceDropdown />
            <div className='flex-1 overflow-y-scroll no-scrollbar flex flex-col'>
                <div>
                    <div className='p-3'>
                        {menuItems.map((item) => (
                            <NavLink to={item.href} key={item.name} className={({ isActive }) => `flex items-center gap-3 py-2.5 px-4 rounded-full text-gray-800 dark:text-body cursor-pointer transition-all font-bold text-sm ${isActive ? 'bg-gray-100 dark:bg-surface-elevated dark:text-ink' : 'hover:bg-gray-50 dark:hover:bg-surface-soft'}`} >
                                <item.icon size={16} />
                                <p className='text-sm truncate'>{item.name}</p>
                            </NavLink>
                        ))}

                        {/* Mục chỉ dành cho admin */}
                        {isAdmin && (
                            <>
                                <p className="px-4 pt-3 pb-1 text-[11px] uppercase font-bold tracking-[1.4px] text-gray-400 dark:text-muted">Quản trị</p>
                                {adminItems.map((item) => (
                                    <NavLink to={item.href} key={item.name} className={({ isActive }) => `flex items-center gap-3 py-2.5 px-4 rounded-full text-gray-800 dark:text-body cursor-pointer transition-all font-bold text-sm ${isActive ? 'bg-gray-100 dark:bg-surface-elevated dark:text-ink' : 'hover:bg-gray-50 dark:hover:bg-surface-soft'}`} >
                                        <item.icon size={16} />
                                        <p className='text-sm truncate'>{item.name}</p>
                                    </NavLink>
                                ))}
                            </>
                        )}

                        <NavLink to="/settings" className={({ isActive }) => `flex w-full items-center gap-3 py-2.5 px-4 rounded-full text-gray-800 dark:text-body cursor-pointer transition-all mt-1 font-bold text-sm ${isActive ? 'bg-gray-100 dark:bg-surface-elevated dark:text-ink' : 'hover:bg-gray-50 dark:hover:bg-surface-soft'}`}>
                            <SettingsIcon size={16} />
                            <p className='text-sm truncate'>Cài đặt</p>
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
