import prisma from "../configs/prisma.js";

// Danh sách phòng ban của workspace
export const getDepartments = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const departments = await prisma.department.findMany({
            where: { workspaceId },
            include: { _count: { select: { projects: true } } },
            orderBy: { name: "asc" },
        });
        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Tạo phòng ban (chỉ ADMIN — requireMember role ADMIN ở route)
export const createDepartment = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { name, description } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: "Tên phòng ban là bắt buộc" });

        const department = await prisma.department.create({
            data: { workspaceId, name: name.trim(), description: description || null },
        });
        res.status(201).json(department);
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ error: "Phòng ban này đã tồn tại" });
        }
        res.status(500).json({ error: error.message });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const department = await prisma.department.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description }),
            },
        });
        res.json(department);
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ error: "Tên phòng ban đã tồn tại" });
        }
        res.status(500).json({ error: error.message });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        // Dự án thuộc phòng ban sẽ tự set departmentId = null (onDelete: SetNull)
        await prisma.department.delete({ where: { id } });
        res.json({ message: "Đã xóa phòng ban" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
