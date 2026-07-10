/**
 * Gợi ý @mention: hiện danh sách thành viên khi người dùng gõ "@..." ở cuối ô nhập.
 * Dùng chung cho ô bình luận (TaskDetails) và chat nhóm (ProjectChat).
 *
 * Props:
 *  - text: nội dung ô nhập hiện tại
 *  - members: [{ user: {id, name, email, image} }] — thành viên dự án
 *  - onPick(newText): thay thế "@token" cuối bằng "@email " và trả text mới
 */
const MentionPicker = ({ text, members = [], onPick }) => {
    // Bắt token "@..." đang gõ dở ở cuối chuỗi (không chứa khoảng trắng)
    const match = /(^|\s)@([^\s@]*)$/.exec(text || "");
    if (!match) return null;

    const keyword = match[2].toLowerCase();
    const list = members
        .map((m) => m.user)
        .filter(Boolean)
        .filter((u) => {
            if (!keyword) return true;
            return (
                (u.email || "").toLowerCase().includes(keyword) ||
                (u.name || "").toLowerCase().includes(keyword)
            );
        })
        .slice(0, 6);

    if (list.length === 0) return null;

    const pick = (u) => {
        // Thay "@token" cuối bằng "@email " (backend nhận diện mention theo email)
        const newText = text.replace(/(^|\s)@([^\s@]*)$/, `$1@${u.email} `);
        onPick(newText);
    };

    return (
        <div className="absolute bottom-full left-0 mb-1 w-72 max-w-full rounded-lg shadow-spotify-lg bg-white dark:bg-surface-elevated z-30 overflow-hidden">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[1.5px] text-gray-500 dark:text-muted border-b border-hairline-strong dark:border-hairline">Nhắc thành viên</p>
            {list.map((u) => (
                <button
                    key={u.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 text-sm"
                >
                    {u.image ? (
                        <img src={u.image} alt="" className="size-6 rounded-full" />
                    ) : (
                        <span className="size-6 rounded-full bg-m-blue-light/20 text-m-blue-light text-[10px] flex items-center justify-center font-bold">
                            {(u.name || u.email || "?")[0].toUpperCase()}
                        </span>
                    )}
                    <span className="flex-1 min-w-0">
                        <span className="block truncate text-gray-900 dark:text-ink">{u.name || u.email}</span>
                        <span className="block truncate text-[11px] text-gray-400 dark:text-muted">{u.email}</span>
                    </span>
                </button>
            ))}
        </div>
    );
};

export default MentionPicker;
