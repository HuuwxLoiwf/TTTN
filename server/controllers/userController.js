import prisma from '../configs/prisma.js';

export const syncUser = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, email, image } = req.body;
    try {
        const user = await prisma.user.upsert({
            where: { id: userId },
            update: {
                name: name || 'User',
                email: email || '',
                image: image || '',
            },
            create: {
                id: userId,
                name: name || 'User',
                email: email || '',
                image: image || '',
            },
        });
        res.json(user);
    } catch (error) {
        console.error('syncUser error:', error);
        res.status(500).json({ error: error.message });
    }
};
