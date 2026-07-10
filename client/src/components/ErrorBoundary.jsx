import { Component } from "react";

/**
 * Bắt lỗi render của cây con để tránh MÀN HÌNH TRẮNG toàn ứng dụng.
 * Khi một component con ném lỗi lúc render, thay vì trắng trang,
 * hiển thị thông báo + nút thử lại / tải lại.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("[ErrorBoundary]", error, info);
    }

    reset = () => this.setState({ hasError: false, error: null });

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center p-6 bg-white dark:bg-canvas">
                    <p className="text-lg font-bold text-m-red">Đã xảy ra lỗi hiển thị</p>
                    <p className="text-sm text-gray-500 dark:text-body max-w-md">
                        {this.state.error?.message || "Một phần giao diện gặp sự cố."}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={this.reset} className="px-5 py-2.5 rounded-full bg-m-blue-light text-black hover:brightness-110 text-sm font-bold transition">
                            Thử lại
                        </button>
                        <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-full bg-surface-elevated text-gray-700 dark:text-body text-sm font-bold hover:bg-gray-100 dark:hover:bg-white/10 transition">
                            Tải lại trang
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
