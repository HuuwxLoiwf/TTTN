// Tạo tài khoản admin mặc định: admin@umc.com / admin
// Chạy: node seedAdmin.js
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './configs/prisma.js';

const ADMIN_EMAIL = 'admin@umc.com';
const ADMIN_PASSWORD = 'admin';

const run = async () => {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const user = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: { password: hash, emailVerified: true },
        create: {
            name: 'Quản trị viên',
            email: ADMIN_EMAIL,
            password: hash,
            emailVerified: true,
            image: '',
        },
    });

    // Đảm bảo admin là ADMIN trong mọi workspace mà họ là thành viên
    await prisma.workspaceMember.updateMany({
        where: { userId: user.id },
        data: { role: 'ADMIN' },
    });

    console.log('✓ Đã tạo/cập nhật admin:');
    console.log('  Email:   ', ADMIN_EMAIL);
    console.log('  Mật khẩu:', ADMIN_PASSWORD);
    console.log('  User ID: ', user.id);
    process.exit(0);
};

run().catch((e) => {
    console.error('Lỗi seed admin:', e.message);
    process.exit(1);
});
