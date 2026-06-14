import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/workspace_provider.dart';

class MyTasksSidebar extends StatefulWidget {
  final void Function(String, String) onTaskTap;

  const MyTasksSidebar({super.key, required this.onTaskTap});

  @override
  State<MyTasksSidebar> createState() => _MyTasksSidebarState();
}

class _MyTasksSidebarState extends State<MyTasksSidebar> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ws = context.watch<WorkspaceProvider>();
    final isDark = theme.brightness == Brightness.dark;

    final projects = ws.currentWorkspace?.projects ?? [];
    final myTasks = projects
        .expand((p) => p.tasks)
        .where((t) => t.assigneeId == 'user_1')
        .toList();

    final statusDotColors = {
      'DONE': Colors.green,
      'IN_PROGRESS': Colors.amber,
      'TODO': Colors.grey,
    };

    return Column(
      children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Icon(Icons.check_box, size: 16),
                const SizedBox(width: 8),
                Flexible(
                  child: Text('My Tasks',
                      style: theme.textTheme.bodySmall
                          ?.copyWith(fontWeight: FontWeight.w500),
                      overflow: TextOverflow.ellipsis),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color:
                        isDark ? const Color(0xFF27272A) : Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text('${myTasks.length}',
                      style: const TextStyle(fontSize: 11)),
                ),
                const Spacer(),
                Icon(
                  _expanded
                      ? Icons.keyboard_arrow_down
                      : Icons.keyboard_arrow_right,
                  size: 16,
                ),
              ],
            ),
          ),
        ),
        if (_expanded)
          ...myTasks.map((t) {
            return InkWell(
              onTap: () =>
                  widget.onTaskTap(t.projectId, t.id),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 6),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: statusDotColors[t.status] ?? Colors.grey,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t.title,
                              style: theme.textTheme.bodySmall
                                  ?.copyWith(fontSize: 12),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                          Text(t.status.replaceAll('_', ' '),
                              style: theme.textTheme.bodySmall
                                  ?.copyWith(fontSize: 10)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
