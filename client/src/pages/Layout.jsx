import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { setWorkspaces, setCurrentWorkspace, setLoading } from '../features/workspaceSlice'
import { apiFetch } from '../lib/api'
import { Loader2Icon } from 'lucide-react'
import { useUser, useAuth, SignIn } from '@clerk/clerk-react'

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
                // Sync user to DB first (upsert) so FK constraints work
                await apiFetch(token, '/users/sync', {
                    method: 'POST',
                    body: {
                        name: user.fullName || user.username || user.emailAddresses?.[0]?.emailAddress || 'User',
                        email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '',
                        image: user.imageUrl || '',
                    },
                });
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
        return (
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950 '>
                <SignIn/>
            </div>
        )
    }

    if (loading) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout
