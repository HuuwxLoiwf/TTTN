import { useSelector } from "react-redux";
import { useUser } from "@clerk/clerk-react";
import { useDispatch } from "react-redux";
import { toggleTheme } from "../features/themeSlice";
import { SettingsIcon, User, Building2, MoonIcon, SunIcon } from "lucide-react";

export default function Settings() {
    const { user } = useUser();
    const dispatch = useDispatch();
    const { theme } = useSelector((state) => state.theme);
    const { currentWorkspace } = useSelector((state) => state.workspace);

    const myRole = currentWorkspace?.members?.find((m) => m.userId === user?.id)?.role || "—";

    const card = "rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6";

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <SettingsIcon className="size-6 text-blue-500" /> Cài đặt
                </h1>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">Thông tin tài khoản và tùy chọn</p>
            </div>

            {/* Hồ sơ cá nhân */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                    <User className="size-4" /> Hồ sơ cá nhân
                </h2>
                <div className="flex items-center gap-4">
                    <img src={user?.imageUrl} alt="" className="size-14 rounded-full" />
                    <div>
                        <p className="font-medium text-zinc-900 dark:text-white">{user?.fullName || user?.username}</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3">
                    Để đổi tên, ảnh đại diện hoặc mật khẩu, dùng menu tài khoản (góc trên phải).
                </p>
            </div>

            {/* Không gian làm việc */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                    <Building2 className="size-4" /> Không gian làm việc hiện tại
                </h2>
                <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Tên</span>
                    <span className="text-zinc-900 dark:text-white">{currentWorkspace?.name || "—"}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                    <span className="text-zinc-500 dark:text-zinc-400">Vai trò của bạn</span>
                    <span className="text-zinc-900 dark:text-white">{myRole}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                    <span className="text-zinc-500 dark:text-zinc-400">Số thành viên</span>
                    <span className="text-zinc-900 dark:text-white">{currentWorkspace?.members?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                    <span className="text-zinc-500 dark:text-zinc-400">Số dự án</span>
                    <span className="text-zinc-900 dark:text-white">{currentWorkspace?.projects?.length || 0}</span>
                </div>
            </div>

            {/* Giao diện */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Giao diện</h2>
                <button
                    onClick={() => dispatch(toggleTheme())}
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                    {theme === "light" ? <MoonIcon className="size-4" /> : <SunIcon className="size-4 text-yellow-400" />}
                    Chuyển sang chế độ {theme === "light" ? "tối" : "sáng"}
                </button>
            </div>
        </div>
    );
}
