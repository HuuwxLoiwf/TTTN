import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster } from "react-hot-toast";
import { Loader2Icon } from "lucide-react";
import Layout from "./pages/Layout";

// Lazy load các trang để giảm kích thước bundle ban đầu (đặc biệt ProjectDetails dùng recharts)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const Team = lazy(() => import("./pages/Team"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const TaskDetails = lazy(() => import("./pages/TaskDetails"));
const MyTasks = lazy(() => import("./pages/MyTasks"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Settings = lazy(() => import("./pages/Settings"));

const PageLoader = () => (
    <div className="flex items-center justify-center h-[60vh]">
        <Loader2Icon className="size-7 text-blue-500 animate-spin" />
    </div>
);

const App = () => {
    return (
        <>
            <Toaster />
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                    <Route path="team" element={<Suspense fallback={<PageLoader />}><Team /></Suspense>} />
                    <Route path="projects" element={<Suspense fallback={<PageLoader />}><Projects /></Suspense>} />
                    <Route path="my-tasks" element={<Suspense fallback={<PageLoader />}><MyTasks /></Suspense>} />
                    <Route path="audit-log" element={<Suspense fallback={<PageLoader />}><AuditLog /></Suspense>} />
                    <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
                    <Route path="projectsDetail" element={<Suspense fallback={<PageLoader />}><ProjectDetails /></Suspense>} />
                    <Route path="taskDetails" element={<Suspense fallback={<PageLoader />}><TaskDetails /></Suspense>} />
                </Route>
            </Routes>
        </>
    );
};

export default App;
