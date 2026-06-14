import nodemailer from 'nodemailer';

const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

const APP_NAME = 'UMC Quản Lý Dự Án';
const APP_URL = process.env.CLIENT_URL || 'http://localhost:5173';

export const sendTaskAssignedEmail = async ({ to, taskTitle, projectName, dueDate, assigneeName }) => {
    const transporter = createTransporter();
    if (!transporter) return; // email not configured, skip silently

    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('vi-VN') : 'Chưa xác định';
    await transporter.sendMail({
        from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
        to,
        subject: `[${APP_NAME}] Bạn được giao công việc: ${taskTitle}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #2563eb;">🔔 Bạn có công việc mới!</h2>
                <p>Xin chào <strong>${assigneeName || to}</strong>,</p>
                <p>Bạn vừa được giao một công việc mới trong dự án <strong>${projectName}</strong>.</p>
                <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
                    <tr><td style="padding:8px; color:#6b7280;">Công việc:</td><td style="padding:8px;"><strong>${taskTitle}</strong></td></tr>
                    <tr style="background:#f9fafb;"><td style="padding:8px; color:#6b7280;">Dự án:</td><td style="padding:8px;">${projectName}</td></tr>
                    <tr><td style="padding:8px; color:#6b7280;">Hạn chót:</td><td style="padding:8px; color:#dc2626;">${dueDateStr}</td></tr>
                </table>
                <a href="${APP_URL}" style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; border-radius:6px; text-decoration:none;">Xem chi tiết</a>
                <p style="color:#9ca3af; margin-top:24px; font-size:12px;">${APP_NAME} &bull; Hệ thống quản lý dự án</p>
            </div>
        `,
    });
};

export const sendCommentNotificationEmail = async ({ to, commenterName, taskTitle, commentContent }) => {
    const transporter = createTransporter();
    if (!transporter) return;

    await transporter.sendMail({
        from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
        to,
        subject: `[${APP_NAME}] Bình luận mới trên công việc: ${taskTitle}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #2563eb;">💬 Bình luận mới</h2>
                <p><strong>${commenterName}</strong> đã bình luận trên công việc <strong>${taskTitle}</strong>:</p>
                <blockquote style="border-left: 4px solid #2563eb; padding: 8px 16px; margin: 16px 0; background: #f1f5f9; border-radius: 4px;">
                    ${commentContent}
                </blockquote>
                <a href="${APP_URL}" style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; border-radius:6px; text-decoration:none;">Xem công việc</a>
                <p style="color:#9ca3af; margin-top:24px; font-size:12px;">${APP_NAME}</p>
            </div>
        `,
    });
};
