import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/file_item.dart';
import '../services/api_service.dart';

class ProjectFiles extends StatefulWidget {
  final String projectId;
  final bool canReview;
  const ProjectFiles({super.key, required this.projectId, this.canReview = false});

  @override
  State<ProjectFiles> createState() => _ProjectFilesState();
}

class _ProjectFilesState extends State<ProjectFiles> {
  List<FileItem> _files = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final files = await apiService.getFiles(widget.projectId);
      setState(() {
        _files = files;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _review(FileItem f, String status) async {
    String? note;
    if (status == 'REJECTED') {
      note = await _askNote();
    }
    try {
      await apiService.reviewFile(f.id, status, note);
      _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(status == 'APPROVED' ? 'Đã đánh giá: Đạt' : 'Đã đánh giá: Chưa đạt')),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi: $e')));
    }
  }

  Future<String?> _askNote() {
    final c = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Ghi chú: cần làm lại gì?'),
        content: TextField(controller: c, maxLines: 3),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, ''), child: const Text('Bỏ qua')),
          ElevatedButton(onPressed: () => Navigator.pop(context, c.text), child: const Text('Xác nhận')),
        ],
      ),
    );
  }

  Color _statusColor(String s) => s == 'APPROVED'
      ? Colors.green
      : s == 'REJECTED'
          ? Colors.red
          : Colors.orange;

  String _statusLabel(String s) => s == 'APPROVED'
      ? 'Đạt yêu cầu'
      : s == 'REJECTED'
          ? 'Chưa đạt'
          : 'Chờ duyệt';

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_files.isEmpty) return const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('Chưa có tài liệu nào')));
    return ListView.builder(
      itemCount: _files.length,
      itemBuilder: (_, i) {
        final f = _files[i];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Icon(Icons.insert_drive_file, color: Colors.blue),
                  const SizedBox(width: 8),
                  Expanded(child: Text(f.fileName, style: const TextStyle(fontWeight: FontWeight.w500))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: _statusColor(f.reviewStatus).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)),
                    child: Text(_statusLabel(f.reviewStatus), style: TextStyle(fontSize: 11, color: _statusColor(f.reviewStatus))),
                  ),
                ]),
                Text('${f.uploader?.name ?? ""} · ${DateFormat('dd/MM/yyyy HH:mm').format(f.createdAt)}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
                if (f.reviewStatus == 'REJECTED' && f.reviewNote != null)
                  Container(
                    margin: const EdgeInsets.only(top: 6),
                    padding: const EdgeInsets.all(8),
                    color: Colors.red.withValues(alpha: 0.08),
                    child: Text('Cần làm lại: ${f.reviewNote}', style: const TextStyle(fontSize: 12, color: Colors.red)),
                  ),
                if (widget.canReview)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Row(children: [
                      ElevatedButton.icon(
                        onPressed: () => _review(f, 'APPROVED'),
                        icon: const Icon(Icons.check, size: 16),
                        label: const Text('Đạt'),
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, visualDensity: VisualDensity.compact),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () => _review(f, 'REJECTED'),
                        icon: const Icon(Icons.close, size: 16),
                        label: const Text('Chưa đạt'),
                        style: OutlinedButton.styleFrom(foregroundColor: Colors.red, visualDensity: VisualDensity.compact),
                      ),
                    ]),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
