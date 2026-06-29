import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useUser } from '../context/AuthContext'
import StatsGrid from '../components/StatsGrid'
import ProjectOverview from '../components/ProjectOverview'
import RecentActivity from '../components/RecentActivity'
import TasksSummary from '../components/TasksSummary'
import CreateProjectDialog from '../components/CreateProjectDialog'
import WorkspaceReportButton from '../components/WorkspaceReportButton'
import DepartmentStats from '../components/DepartmentStats'

const Dashboard = () => {

    const { user } = useUser()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    return (
        <div className='max-w-6xl mx-auto'>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent mb-1"> Chào mừng trở lại, {user?.name || 'Bạn'} </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm"> Đây là những gì đang diễn ra với dự án của bạn hôm nay </p>
                </div>

                <div className="flex items-center gap-3">
                    <WorkspaceReportButton />
                    <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg shadow-blue-900/30 hover:from-blue-400 hover:to-indigo-500 transition active:scale-95" >
                        <Plus size={16} /> Dự án mới
                    </button>
                </div>

                <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            <StatsGrid />

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <ProjectOverview />
                    <RecentActivity />
                </div>
                <div className="space-y-8">
                    <TasksSummary />
                    <DepartmentStats />
                </div>
            </div>
        </div>
    )
}

export default Dashboard
