import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/task.dart';

/// Gantt timeline đơn giản: mỗi task là 1 thanh từ ngày tạo → hạn chót.
class ProjectGantt extends StatelessWidget {
  final List<Task> tasks;
  const ProjectGantt({super.key, required this.tasks});

  static const _statusColor = {
    'TODO': Color(0xFFA1A1AA),
    'IN_PROGRESS': Color(0xFFF59E0B),
    'REVIEW': Color(0xFF8B5CF6),
    'DONE': Color(0xFF22C55E),
  };

  @override
  Widget build(BuildContext context) {
    final withDates = tasks;
    if (withDates.isEmpty) {
      return const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('Chưa có công việc nào có hạn chót.')));
    }

    final starts = withDates.map((t) => t.createdAt).toList();
    final ends = withDates.map((t) => t.dueDate).toList();
    final minDate = starts.reduce((a, b) => a.isBefore(b) ? a : b);
    final maxDate = ends.reduce((a, b) => a.isAfter(b) ? a : b);
    final totalDays = maxDate.difference(minDate).inDays.clamp(1, 100000);

    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(DateFormat('dd/MM/yyyy').format(minDate), style: const TextStyle(fontSize: 12, color: Colors.grey)),
            Text('$totalDays ngày', style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ]),
        ),
        ...withDates.map((t) {
          final offset = t.createdAt.difference(minDate).inDays.clamp(0, totalDays);
          final span = t.dueDate.difference(t.createdAt).inDays.clamp(1, totalDays);
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                SizedBox(width: 110, child: Text(t.title, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13))),
                Expanded(
                  child: LayoutBuilder(builder: (_, c) {
                    final w = c.maxWidth;
                    return Stack(children: [
                      Container(height: 22, decoration: BoxDecoration(color: Colors.grey.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4))),
                      Positioned(
                        left: w * offset / totalDays,
                        child: Container(
                          height: 22,
                          width: (w * span / totalDays).clamp(24, w),
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 4),
                          decoration: BoxDecoration(color: _statusColor[t.status] ?? Colors.blue, borderRadius: BorderRadius.circular(4)),
                          child: Text(DateFormat('dd/MM').format(t.dueDate), style: const TextStyle(fontSize: 10, color: Colors.white)),
                        ),
                      ),
                    ]);
                  }),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
