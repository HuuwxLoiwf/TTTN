import prisma from "../configs/prisma.js";

// Lấy danh sách phụ thuộc của 1 task: task này phụ thuộc vào những task nào (dependsOn)
// + những task nào đang chờ task này (dependents).
export const getDependencies = async (req, res) => {
    try {
        const { taskId } = req.params;
        const [dependencies, dependents] = await Promise.all([
            prisma.taskDependency.findMany({
                where: { taskId, dependsOn: { deletedAt: null } }, // ẩn task tiên quyết đã vào thùng rác
                include: { dependsOn: { select: { id: true, title: true, status: true } } },
            }),
            prisma.taskDependency.findMany({
                where: { dependsOnId: taskId, task: { deletedAt: null } },
                include: { task: { select: { id: true, title: true, status: true } } },
            }),
        ]);
        res.json({
            dependsOn: dependencies.map((d) => ({ depId: d.id, ...d.dependsOn })),
            blocking: dependents.map((d) => ({ depId: d.id, ...d.task })),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Kiểm tra có tạo thành vòng lặp không: dependsOnId có (gián tiếp) phụ thuộc lại taskId không?
const wouldCreateCycle = async (taskId, dependsOnId) => {
    // BFS từ dependsOnId theo chiều "phụ thuộc vào" — nếu chạm taskId thì có vòng
    const visited = new Set();
    let frontier = [dependsOnId];
    while (frontier.length) {
        const deps = await prisma.taskDependency.findMany({
            where: { taskId: { in: frontier } },
            select: { dependsOnId: true },
        });
        const next = [];
        for (const d of deps) {
            if (d.dependsOnId === taskId) return true;
            if (!visited.has(d.dependsOnId)) {
                visited.add(d.dependsOnId);
                next.push(d.dependsOnId);
            }
        }
        frontier = next;
    }
    return false;
};

// Thêm phụ thuộc: task (taskId) phụ thuộc vào dependsOnId
export const addDependency = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { dependsOnId } = req.body;

        if (!dependsOnId) return res.status(400).json({ error: "Thiếu công việc tiên quyết" });
        if (dependsOnId === taskId) return res.status(400).json({ error: "Công việc không thể phụ thuộc chính nó" });

        // Hai task phải cùng dự án
        const [task, dep] = await Promise.all([
            prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } }),
            prisma.task.findUnique({ where: { id: dependsOnId }, select: { projectId: true } }),
        ]);
        if (!task || !dep) return res.status(404).json({ error: "Công việc không tồn tại" });
        if (task.projectId !== dep.projectId) {
            return res.status(400).json({ error: "Chỉ liên kết phụ thuộc trong cùng dự án" });
        }

        if (await wouldCreateCycle(taskId, dependsOnId)) {
            return res.status(400).json({ error: "Liên kết này tạo thành vòng lặp phụ thuộc" });
        }

        const created = await prisma.taskDependency.create({
            data: { taskId, dependsOnId },
            include: { dependsOn: { select: { id: true, title: true, status: true } } },
        });
        res.status(201).json({ depId: created.id, ...created.dependsOn });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ error: "Phụ thuộc này đã tồn tại" });
        }
        res.status(500).json({ error: error.message });
    }
};

// Xóa phụ thuộc theo id bản ghi
export const removeDependency = async (req, res) => {
    try {
        const { depId } = req.params;
        await prisma.taskDependency.delete({ where: { id: depId } });
        res.json({ message: "Đã xóa phụ thuộc" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
