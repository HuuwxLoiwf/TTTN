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

    const currentHour = new Date().getHours();
    let greeting = "Chào mừng trở lại";
    if (currentHour < 12) greeting = "Chào buổi sáng";
    else if (currentHour < 18) greeting = "Chào buổi chiều";
    else greeting = "Chào buổi tối";

    const formattedDate = new Intl.DateTimeFormat('vi-VN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }).format(new Date());

    return (
        <div className='max-w-6xl mx-auto animate-slideup'>
            {/* Banner chào mừng cao cấp */}
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-surface-card border border-gray-100 dark:border-hairline/15 p-6 sm:p-8 shadow-spotify-md dark:shadow-spotify-lg mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-m-blue-light/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-10 w-40 h-40 bg-m-blue-light/5 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[2px] text-m-blue-light font-bold">Bảng điều khiển</p>
                    <h1 className="text-2xl sm:text-3.5xl font-black text-gray-900 dark:text-ink tracking-tight">
                        {greeting}, {user?.name || 'Bạn'}!
                    </h1>
                    <p className="text-gray-500 dark:text-body text-sm font-medium">
                        Hôm nay là <span className="text-gray-700 dark:text-ink font-bold">{formattedDate}</span>. Hãy xem tiến độ dự án của bạn hôm nay.
                    </p>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-3">
                    <WorkspaceReportButton />
                    <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-6 py-3 text-xs uppercase font-bold tracking-[1.5px] rounded-full bg-m-blue-light text-black hover:scale-105 hover:bg-[#20e268] active:scale-95 shadow-spotify-md hover:shadow-[0_0_20px_rgba(30,215,96,0.4)] transition duration-200" >
                        <Plus size={14} /> Dự án mới
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
