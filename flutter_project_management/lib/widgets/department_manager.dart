import 'package:flutter/material.dart';
import '../models/department.dart';
import '../services/api_service.dart';

class DepartmentManagerSheet extends StatefulWidget {
  final String workspaceId;
  const DepartmentManagerSheet({super.key, required this.workspaceId});

  @override
  State<DepartmentManagerSheet> createState() => _DepartmentManagerSheetState();
}

class _DepartmentManagerSheetState extends State<DepartmentManagerSheet> {
  final _controller = TextEditingController();
  List<Department> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final items = await apiService.getDepartments(widget.workspaceId);
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _add() async {
    final name = _controller.text.trim();
    if (name.isEmpty) return;
    try {
      final d = await apiService.createDepartment(widget.workspaceId, name);
      setState(() {
        _items.add(d);
        _controller.clear();
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi: $e')));
    }
  }

  Future<void> _delete(Department d) async {
    try {
      await apiService.deleteDepartment(d.id);
      setState(() => _items.remove(d));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: const [
              Icon(Icons.business, size: 20),
              SizedBox(width: 8),
              Text('Quản lý phòng ban', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: const InputDecoration(hintText: 'Tên phòng ban (VD: Phòng IT)', isDense: true, border: OutlineInputBorder()),
                  onSubmitted: (_) => _add(),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(onPressed: _add, child: const Text('Thêm')),
            ]),
            const SizedBox(height: 12),
            if (_loading)
              const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()))
            else if (_items.isEmpty)
              const Padding(padding: EdgeInsets.all(16), child: Text('Chưa có phòng ban nào'))
            else
              ..._items.map((d) => ListTile(
                    dense: true,
                    title: Text(d.name),
                    subtitle: Text('${d.projectCount} dự án'),
                    trailing: IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => _delete(d)),
                  )),
          ],
        ),
      ),
    );
  }
}
