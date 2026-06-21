import 'package:flutter/material.dart';
import '../models/subtask.dart';
import '../services/api_service.dart';

class SubtaskChecklist extends StatefulWidget {
  final String taskId;
  const SubtaskChecklist({super.key, required this.taskId});

  @override
  State<SubtaskChecklist> createState() => _SubtaskChecklistState();
}

class _SubtaskChecklistState extends State<SubtaskChecklist> {
  final _controller = TextEditingController();
  List<Subtask> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final items = await apiService.getSubtasks(widget.taskId);
      setState(() => _items = items);
    } catch (_) {}
  }

  Future<void> _add() async {
    final title = _controller.text.trim();
    if (title.isEmpty) return;
    try {
      final s = await apiService.createSubtask(widget.taskId, title);
      setState(() {
        _items.add(s);
        _controller.clear();
      });
    } catch (_) {}
  }

  Future<void> _toggle(Subtask s) async {
    setState(() {
      final i = _items.indexOf(s);
      _items[i] = Subtask(id: s.id, taskId: s.taskId, title: s.title, done: !s.done);
    });
    try {
      await apiService.toggleSubtask(s.id, !s.done);
    } catch (_) {
      _load();
    }
  }

  Future<void> _delete(Subtask s) async {
    setState(() => _items.remove(s));
    try {
      await apiService.deleteSubtask(s.id);
    } catch (_) {
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final done = _items.where((i) => i.done).length;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.checklist, size: 18),
              const SizedBox(width: 8),
              const Text('Việc nhỏ', style: TextStyle(fontWeight: FontWeight.w600)),
              const Spacer(),
              if (_items.isNotEmpty) Text('$done/${_items.length}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
            ]),
            ..._items.map((s) => Row(
                  children: [
                    Checkbox(value: s.done, onChanged: (_) => _toggle(s)),
                    Expanded(
                      child: Text(s.title,
                          style: TextStyle(decoration: s.done ? TextDecoration.lineThrough : null, color: s.done ? Colors.grey : null)),
                    ),
                    IconButton(icon: const Icon(Icons.delete_outline, size: 18), onPressed: () => _delete(s)),
                  ],
                )),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: const InputDecoration(hintText: 'Thêm việc nhỏ...', isDense: true),
                  onSubmitted: (_) => _add(),
                ),
              ),
              IconButton(icon: const Icon(Icons.add), onPressed: _add),
            ]),
          ],
        ),
      ),
    );
  }
}
