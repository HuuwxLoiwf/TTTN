import { useState } from "react";
import { format, isSameDay, isBefore, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { CalendarIcon, Clock, User, ChevronLeft, ChevronRight } from "lucide-react";

const typeColors = {
    BUG: "bg-m-red/15 text-m-red",
    FEATURE: "bg-m-blue-light/15 text-m-blue-light",
    TASK: "bg-m-success/15 text-m-success",
    IMPROVEMENT: "bg-m-info/15 text-m-info",
    OTHER: "bg-m-warning/15 text-m-warning",
};

const priorityBorders = {
    LOW: "border-zinc-300 dark:border-hairline",
    MEDIUM: "border-m-warning",
    HIGH: "border-m-red",
};

const ProjectCalendar = ({ tasks }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const today = new Date();
    const getTasksForDate = (date) => tasks.filter((task) => isSameDay(task.due_date, date));

    const upcomingTasks = tasks
        .filter((task) => task.due_date && !isBefore(task.due_date, today) && task.status !== "DONE")
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5);

    const overdueTasks = tasks.filter((task) => task.due_date && isBefore(task.due_date, today) && task.status !== "DONE");

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });


    const handleMonthChange = (direction) => {
        setCurrentMonth((prev) => (direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)));
    };

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2 ">
                <div className="bg-white dark:bg-surface-card rounded-lg border border-gray-200 dark:border-transparent p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-gray-900 dark:text-ink text-sm font-bold flex gap-2 items-center max-sm:hidden">
                            <CalendarIcon className="size-5" /> Lịch công việc
                        </h2>
                        <div className="flex gap-2 items-center">
                            <button onClick={() => handleMonthChange("prev")} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-surface-elevated">
                                <ChevronLeft className="size-5 text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-ink" />
                            </button>
                            <span className="text-gray-900 dark:text-ink text-sm font-bold">{format(currentMonth, "MMMM yyyy")}</span>
                            <button onClick={() => handleMonthChange("next")} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-surface-elevated">
                                <ChevronRight className="size-5 text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-ink" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 text-xs text-gray-600 dark:text-muted mb-2 text-center uppercase tracking-[1px]">
                        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                            <div key={day}>{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {daysInMonth.map((day) => {
                            const dayTasks = getTasksForDate(day);
                            const isSelected = isSameDay(day, selectedDate);
                            const hasOverdue = dayTasks.some((t) => t.status !== "DONE" && isBefore(t.due_date, today));

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDate(day)}
                                    className={`sm:h-14 flex flex-col items-center justify-center text-sm rounded-lg border
                                    ${isSelected ? "bg-bmw-blue/10 text-bmw-blue dark:text-bmw-blue border-bmw-blue" : dayTasks.length > 0 ? "bg-bmw-blue/5 text-gray-900 dark:bg-surface-elevated dark:text-body border-transparent hover:bg-gray-100 dark:hover:bg-surface-soft" : "bg-gray-50 text-gray-900 dark:bg-surface-soft dark:text-body border-transparent hover:bg-gray-100 dark:hover:bg-surface-elevated"}
                                    ${hasOverdue ? "border-m-red" : ""}`}
                                >
                                    <span>{format(day, "d")}</span>
                                    {dayTasks.length > 0 && (
                                        <span className="text-[10px] px-1.5 rounded-full bg-bmw-blue/20 text-bmw-blue">{dayTasks.length} cv</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tasks for Selected Day */}
                {getTasksForDate(selectedDate).length > 0 && (
                    <div className="bg-white dark:bg-surface-card rounded-lg border border-gray-200 dark:border-transparent mt-6 p-4">
                        <h3 className="text-gray-900 dark:text-ink text-sm font-bold mb-3">
                            Công việc ngày {format(selectedDate, "dd/MM/yyyy")}
                        </h3>
                        <div className="space-y-3">
                            {getTasksForDate(selectedDate).map((task) => (
                                <div
                                    key={task.id}
                                    className={`bg-gray-50 dark:bg-surface-soft hover:bg-gray-100 dark:hover:bg-surface-elevated transition rounded-lg p-4 border-l-4 ${priorityBorders[task.priority]}`}
                                >
                                    <div className="flex justify-between mb-2">
                                        <h4 className="text-gray-900 dark:text-ink font-medium">{task.title}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${typeColors[task.type]}`}>
                                            {task.type}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-600 dark:text-muted">
                                        <span>Ưu tiên: {task.priority.toLowerCase()}</span>
                                        {task.assignee && (
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {task.assignee.name || task.assignee.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
                {/* Upcoming Tasks */}
                <div className="bg-white dark:bg-surface-card rounded-lg border border-gray-200 dark:border-transparent p-4">
                    <h3 className="text-gray-900 dark:text-ink text-sm font-bold flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4" /> Công việc sắp đến hạn
                    </h3>
                    {upcomingTasks.length === 0 ? (
                        <p className="text-gray-500 dark:text-muted text-sm text-center">Không có công việc sắp đến hạn</p>
                    ) : (
                        <div className="space-y-2">
                            {upcomingTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="bg-gray-50 dark:bg-surface-soft hover:bg-gray-100 dark:hover:bg-surface-elevated rounded-lg p-3 transition"
                                >
                                    <div className="flex justify-between items-start text-sm">
                                        <span className="text-gray-900 dark:text-ink">{task.title}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[task.type]}`}>
                                            {task.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-muted">{format(task.due_date, "dd/MM")}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Overdue Tasks */}
                {overdueTasks.length > 0 && (
                    <div className="bg-white dark:bg-canvas rounded-lg border border-m-red border-l-4 p-4">
                        <h3 className="text-m-red text-sm font-bold flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4" /> Công việc quá hạn ({overdueTasks.length})
                        </h3>
                        <div className="space-y-2">
                            {overdueTasks.slice(0, 5).map((task) => (
                                <div key={task.id} className="bg-red-50 dark:bg-m-red/10 hover:bg-red-100 dark:hover:bg-m-red/20 rounded-lg p-3 transition" >
                                    <div className="flex justify-between text-sm text-gray-900 dark:text-ink">
                                        <span>{task.title}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-m-red/15 text-m-red">
                                            {task.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-m-red">
                                        Hạn: {format(task.due_date, "dd/MM")}
                                    </p>
                                </div>
                            ))}
                            {overdueTasks.length > 5 && (
                                <p className="text-xs text-gray-500 dark:text-muted text-center">
                                    +{overdueTasks.length - 5} công việc khác
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectCalendar;
