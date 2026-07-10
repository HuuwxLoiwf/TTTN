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
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-ink mb-1"> Chào mừng trở lại, {user?.name || 'Bạn'} </h1>
                    <p className="text-gray-500 dark:text-body text-sm font-light"> Đây là những gì đang diễn ra với dự án của bạn hôm nay </p>
                </div>

                <div className="flex items-center gap-3">
                    <WorkspaceReportButton />
                    <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-6 py-3 text-sm uppercase font-bold tracking-[1.4px] rounded-full bg-m-blue-light text-black hover:scale-105 transition" >
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
