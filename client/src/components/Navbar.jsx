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
        <div className="w-full sticky top-0 z-40 bg-white/70 dark:bg-canvas/75 backdrop-blur-md px-6 xl:px-16 py-3 border-b border-gray-100 dark:border-hairline/20 flex-shrink-0 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
                {/* Left section */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Sidebar Trigger */}
                    <button onClick={() => setIsSidebarOpen((prev) => !prev)} className="sm:hidden size-9 rounded-full flex items-center justify-center transition-colors text-gray-700 dark:text-ink hover:bg-gray-100 dark:hover:bg-surface-elevated" >
                        <PanelLeft size={20} />
                    </button>

                    {/* Search */}
                    <GlobalSearch />
                </div>

                {/* Right section */}
                <div className="flex items-center gap-3">

                    {/* Theme Toggle */}
                    <button onClick={() => dispatch(toggleTheme())} className="size-9 rounded-full flex items-center justify-center bg-white dark:bg-surface-elevated transition hover:scale-105 active:scale-95">
                        {
                            theme === "light"
                                ? (<MoonIcon className="size-4 text-gray-800 dark:text-gray-200" />)
                                : (<SunIcon className="size-4 text-m-warning" />)
                        }
                    </button>

                    {/* Notifications */}
                    <NotificationBell />

                    {/* User menu */}
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setMenuOpen((v) => !v)} className="size-9 rounded-full bg-surface-elevated text-ink text-sm font-bold flex items-center justify-center overflow-hidden hover:scale-105 transition">
                            {user?.image ? <img src={user.image} alt="" className="size-full object-cover" /> : initial}
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-surface-elevated rounded z-50 py-1 shadow-spotify-lg">
                                <div className="px-3 py-2 border-b border-hairline/30">
                                    <p className="text-sm font-bold text-ink truncate">{user?.name}</p>
                                    <p className="text-xs text-muted truncate">{user?.email}</p>
                                </div>
                                <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-white/10">
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
