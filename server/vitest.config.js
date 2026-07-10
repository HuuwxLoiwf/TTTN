import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        // DB Neon ở xa → mỗi test có thể chậm, nới timeout
        testTimeout: 30000,
        hookTimeout: 60000,
        // Chạy tuần tự: các test dùng chung state (workspace/project/task tạo dần)
        fileParallelism: false,
    },
});
