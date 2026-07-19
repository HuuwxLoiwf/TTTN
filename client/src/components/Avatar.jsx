// Avatar dùng chung: có ảnh thật thì hiện ảnh, không thì hiện chữ cái đầu
// trên nền màu. Tránh lỗi <img src=""> hiện icon "ảnh vỡ" của trình duyệt
// (User.image mặc định là chuỗi rỗng).

// Bảng màu nền ổn định theo tên (cùng tên → cùng màu)
const COLORS = [
    "bg-bmw-blue/20 text-bmw-blue",
    "bg-m-success/20 text-m-success",
    "bg-m-warning/20 text-m-warning",
    "bg-m-red/20 text-m-red",
    "bg-purple-500/20 text-purple-400",
    "bg-pink-500/20 text-pink-400",
];

const pickColor = (key = "") => {
    let sum = 0;
    for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return COLORS[sum % COLORS.length];
};

const initialOf = (name, email) => {
    const src = (name || email || "?").trim();
    return src.charAt(0).toUpperCase() || "?";
};

// size: class kích thước (mặc định size-7). textClass: cỡ chữ initial.
const Avatar = ({ src, name, email, size = "size-7", textClass = "text-xs", className = "" }) => {
    const base = `${size} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`;
    if (src) {
        return (
            <span className={`${base} bg-gray-200 dark:bg-surface-elevated`}>
                <img src={src} alt={name || email || ""} className="size-full object-cover" />
            </span>
        );
    }
    return (
        <span className={`${base} font-bold ${textClass} ${pickColor(name || email)}`} title={name || email || ""}>
            {initialOf(name, email)}
        </span>
    );
};

export default Avatar;
