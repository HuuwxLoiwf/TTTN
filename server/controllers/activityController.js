import prisma from "../configs/prisma.js";

export const getActivities = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const activities = await prisma.activity.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createActivity = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { workspaceId } = req.params;
    const { action, entityType, entityId } = req.body;

    const activity = await prisma.activity.create({
      data: { workspaceId, userId, action, entityType, entityId },
      include: { user: true },
    });
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
