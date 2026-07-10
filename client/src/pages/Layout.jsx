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
import ErrorBoundary from '../components/ErrorBoundary'

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
        <div className='flex items-center justify-center h-screen bg-white dark:bg-canvas'>
            <Loader2Icon className="size-7 text-ink animate-spin" />
        </div>
    )

    if (!user) {
        return <AuthPage />
    }

    if (loading) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-canvas'>
            <Loader2Icon className="size-7 text-ink animate-spin" />
        </div>
    )

    return (
        <div className="relative flex text-gray-900 dark:text-ink bg-gray-50 dark:bg-canvas min-h-screen">
            <div className="relative z-10 flex w-full">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 flex flex-col h-screen">
                    <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                    <div className="flex-1 h-full overflow-y-scroll p-6 xl:p-10 xl:px-16">
                        <ErrorBoundary>
                            <Outlet />
                        </ErrorBoundary>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Layout
