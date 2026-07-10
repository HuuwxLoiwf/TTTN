// Các field user AN TOÀN để trả về client (KHÔNG bao gồm password, otpCode, resetToken...).
// Dùng thay cho `include: { user: true }` để tránh rò rỉ dữ liệu nhạy cảm + giảm payload.
export const userSelect = {
    id: true,
    name: true,
    email: true,
    image: true,
};

// Quan hệ user lồng nhau dạng select (member.user, task.assignee, project.owner)
export const userRelation = { select: userSelect };
