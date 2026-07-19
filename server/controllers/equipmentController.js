import prisma from "../configs/prisma.js";
import { logActivity, logAudit } from "../utils/notify.js";

// Danh sách thiết bị của workspace (kèm dự án đang dùng)
export const getEquipments = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const equipments = await prisma.equipment.findMany({
            where: { workspaceId },
            include: { project: { select: { id: true, name: true } } },
            orderBy: { code: "asc" },
        });
        res.json(equipments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Thiết bị đang gán cho một dự án (hiển thị trong chi tiết dự án)
export const getProjectEquipments = async (req, res) => {
    try {
        const { projectId } = req.params;
        const equipments = await prisma.equipment.findMany({
            where: { projectId },
            orderBy: { code: "asc" },
        });
        res.json(equipments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Thêm thiết bị mới (ADMIN/MANAGER — route kiểm tra role)
export const createEquipment = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { name, code, status, note, imageUrl } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: "Tên thiết bị là bắt buộc" });
        if (!code?.trim()) return res.status(400).json({ error: "Mã thiết bị là bắt buộc" });

        const equipment = await prisma.equipment.create({
            data: {
                workspaceId,
                name: name.trim(),
                code: code.trim().toUpperCase(),
                status: status || "AVAILABLE",
                note: note || null,
                imageUrl: imageUrl?.trim() || "",
            },
        });

        logAudit({
            workspaceId,
            userId: req.auth?.userId,
            action: "CREATE",
            entityType: "EQUIPMENT",
            entityId: equipment.id,
            entityName: `${equipment.code} - ${equipment.name}`,
        });

        res.status(201).json(equipment);
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ error: "Mã thiết bị đã tồn tại trong không gian làm việc" });
        }
        res.status(500).json({ error: error.message });
    }
};

// Cập nhật thiết bị: thông tin, trạng thái, gán / trả về kho
export const updateEquipment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, status, note, projectId, imageUrl } = req.body;

        // Nếu gán vào dự án: dự án phải cùng workspace và chưa bị xóa
        if (projectId) {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { workspaceId: true, deletedAt: true, name: true },
            });
            if (!project || project.deletedAt) {
                return res.status(404).json({ error: "Dự án không tồn tại" });
            }
            if (project.workspaceId !== req.workspaceId) {
                return res.status(400).json({ error: "Dự án không thuộc không gian làm việc này" });
            }
        }

        const equipment = await prisma.equipment.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(code !== undefined && { code: code.trim().toUpperCase() }),
                ...(status !== undefined && { status }),
                ...(note !== undefined && { note: note || null }),
                ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() || "" }),
                // projectId: null = trả về kho; kèm auto-đổi trạng thái hợp lý
                ...(projectId !== undefined && {
                    projectId: projectId || null,
                    ...(status === undefined
                        ? { status: projectId ? "IN_USE" : "AVAILABLE" }
                        : {}),
                }),
            },
            include: { project: { select: { id: true, name: true } } },
        });

        if (projectId !== undefined) {
            logActivity({
                workspaceId: req.workspaceId,
                userId: req.auth?.userId,
                action: projectId
                    ? `đã gán thiết bị ${equipment.code} cho dự án ${equipment.project?.name || ""}`
                    : `đã trả thiết bị ${equipment.code} về kho`,
                entityType: "EQUIPMENT",
                entityId: equipment.id,
            });
        }

        res.json(equipment);
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ error: "Mã thiết bị đã tồn tại trong không gian làm việc" });
        }
        res.status(500).json({ error: error.message });
    }
};

// Xóa thiết bị (chỉ ADMIN — route kiểm tra role)
export const deleteEquipment = async (req, res) => {
    try {
        const { id } = req.params;
        const eq = await prisma.equipment.findUnique({
            where: { id },
            select: { code: true, name: true },
        });
        await prisma.equipment.delete({ where: { id } });
        logAudit({
            workspaceId: req.workspaceId,
            userId: req.auth?.userId,
            action: "DELETE",
            entityType: "EQUIPMENT",
            entityId: id,
            entityName: eq ? `${eq.code} - ${eq.name}` : id,
        });
        res.json({ message: "Đã xóa thiết bị" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
