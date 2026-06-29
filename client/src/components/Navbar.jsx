import { useState, useRef, useEffect } from 'react'
import { PanelLeft, LogOut } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleTheme } from '../features/themeSlice'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useAuth, useUser } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import GlobalSearch from './GlobalSearch'

const Navbar = ({ setIsSidebarOpen }) => {

    const dispatch = useDispatch();
    const { theme } = useSelector(state => state.theme);
    const { user } = useUser();
    const { signOut } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const initial = (user?.name || user?.email || "?")[0].toUpperCase();

    return (
        <div className="w-full bg-white/70 dark:bg-white/5 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 px-6 xl:px-16 py-3 flex-shrink-0">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
                {/* Left section */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Sidebar Trigger */}
                    <button onClick={() => setIsSidebarOpen((prev) => !prev)} className="sm:hidden p-2 rounded-lg transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800" >
                        <PanelLeft size={20} />
                    </button>

                    {/* Search */}
                    <GlobalSearch />
                </div>

                {/* Right section */}
                <div className="flex items-center gap-3">

                    {/* Theme Toggle */}
                    <button onClick={() => dispatch(toggleTheme())} className="size-8 flex items-center justify-center bg-white dark:bg-zinc-800 shadow rounded-lg transition hover:scale-105 active:scale-95">
                        {
                            theme === "light"
                                ? (<MoonIcon className="size-4 text-gray-800 dark:text-gray-200" />)
                                : (<SunIcon className="size-4 text-yellow-400" />)
                        }
                    </button>

                    {/* Notifications */}
                    <NotificationBell />

                    {/* User menu */}
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setMenuOpen((v) => !v)} className="size-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center overflow-hidden">
                            {user?.image ? <img src={user.image} alt="" className="size-full object-cover" /> : initial}
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 py-1">
                                <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-800">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{user?.email}</p>
                                </div>
                                <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-800">
                                    <LogOut className="size-4" /> Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Navbar
