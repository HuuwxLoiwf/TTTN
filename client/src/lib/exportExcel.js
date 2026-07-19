import * as XLSX from "xlsx";

// Xuất một mảng object phẳng ra file .xlsx.
// rows: [{ "Cột A": giá trị, "Cột B": ... }], filename: tên file (không cần đuôi).
export const exportToExcel = (rows, filename = "bao-cao", sheetName = "Sheet1") => {
    if (!rows || rows.length === 0) {
        // vẫn tạo file rỗng để người dùng biết không có dữ liệu
        rows = [{ "Thông báo": "Không có dữ liệu" }];
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    // Tự canh độ rộng cột theo nội dung
    const cols = Object.keys(rows[0]).map((k) => {
        const maxLen = Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length));
        return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });
    ws["!cols"] = cols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
};
