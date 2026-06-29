import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { setWorkspaces, setCurrentWorkspace, setLoading } from '../features/workspaceSlice'
import { apiFetch } from '../lib/api'
import { Loader2Icon } from 'lucide-react'
import { useUser, useAuth } from '../context/AuthContext'
import AuthPage from './AuthPage'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()

    useEffect(() => {
        dispatch(loadTheme())
    }, [])

    useEffect(() => {
        if (!isLoaded || !user) return;

        const loadWorkspaces = async () => {
            dispatch(setLoading(true));
            try {
                const token = await getToken();
                const workspaces = await apiFetch(token, '/workspaces');
                dispatch(setWorkspaces(workspaces));
                const savedId = localStorage.getItem('currentWorkspaceId');
                if (savedId && workspaces.find((w) => w.id === savedId)) {
                    dispatch(setCurrentWorkspace(savedId));
                } else if (workspaces.length > 0) {
                    dispatch(setCurrentWorkspace(workspaces[0].id));
                }
            } catch (e) {
                console.error('Không thể tải không gian làm việc:', e);
            } finally {
                dispatch(setLoading(false));
            }
        };

        loadWorkspaces();
    }, [isLoaded, user])

    if (!isLoaded) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )

    if (!user) {
        return <AuthPage />
    }

    if (loading) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )

    return (
        <div className="relative flex text-gray-900 dark:text-slate-100 bg-gray-50 dark:bg-[#060a18] min-h-screen">
            {/* Nền trang trí gradient động + blob cho TOÀN màn hình */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-indigo-500/5 dark:to-indigo-900/20" />
                <div className="absolute -top-40 -left-32 w-[30rem] h-[30rem] rounded-full bg-blue-400/20 dark:bg-blue-600/20 blur-3xl animate-blob" />
                <div className="absolute top-1/2 -right-32 w-[30rem] h-[30rem] rounded-full bg-indigo-400/20 dark:bg-indigo-600/20 blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute -bottom-40 left-1/3 w-[26rem] h-[26rem] rounded-full bg-purple-400/15 dark:bg-purple-600/20 blur-3xl animate-blob animation-delay-4000" />
            </div>

            <div className="relative z-10 flex w-full">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 flex flex-col h-screen">
                    <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                    <div className="flex-1 h-full overflow-y-scroll p-6 xl:p-10 xl:px-16">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Layout
