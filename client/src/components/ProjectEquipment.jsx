import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Cpu } from "lucide-react";
import { apiFetch } from "../lib/api";

const STATUS_VI = { AVAILABLE: "Sẵn sàng", IN_USE: "Đang dùng", MAINTENANCE: "Bảo trì", BROKEN: "Hỏng" };
const STATUS_CLS = {
    AVAILABLE: "bg-m-success/15 text-m-success",
    IN_USE: "bg-bmw-blue/15 text-bmw-blue",
    MAINTENANCE: "bg-m-warning/15 text-m-warning",
    BROKEN: "bg-m-red/15 text-m-red",
};

// Chỉ đọc: liệt kê thiết bị đang gán cho dự án. Quản lý (thêm/gán/trả) ở trang Thiết bị.
const ProjectEquipment = ({ projectId }) => {
    const { getToken } = useAuth();
    const [equipments, setEquipments] = useState([]);

    useEffect(() => {
        if (!projectId) return;
        (async () => {
            try {
                const token = await getToken();
                const data = await apiFetch(token, `/equipment/project/${projectId}`);
                setEquipments(Array.isArray(data) ? data : []);
            } catch {
                setEquipments([]);
            }
        })();
    }, [projectId]);

    if (equipments.length === 0) {
        return (
            <div className="text-center py-10 text-gray-400 dark:text-muted">
                <Cpu className="size-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chưa có thiết bị nào được gán cho dự án này.</p>
                <p className="text-xs mt-1">Gán thiết bị ở trang <b>Thiết bị</b> (menu bên trái).</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-muted">
                {equipments.length} thiết bị đang phục vụ dự án. Quản lý gán/trả tại trang <b>Thiết bị</b>.
            </p>
            {equipments.map((eq) => (
                <div key={eq.id} className="flex items-center gap-3 bg-surface-card rounded-lg p-3">
                    {eq.imageUrl
                        ? <img src={eq.imageUrl} alt="" className="size-9 rounded-lg object-cover bg-surface-elevated flex-shrink-0" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        : <span className="size-9 rounded-full bg-surface-elevated flex items-center justify-center flex-shrink-0"><Cpu className="size-4 text-bmw-blue" /></span>}
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 dark:text-body-strong truncate">{eq.name}</div>
                        <div className="text-xs text-gray-400 dark:text-muted font-mono">{eq.code}</div>
                    </div>
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_CLS[eq.status]}`}>
                        {STATUS_VI[eq.status]}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default ProjectEquipment;
