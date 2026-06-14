import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/workspace_provider.dart';

class TasksSummary extends StatelessWidget {
  const TasksSummary({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ws = context.watch<WorkspaceProvider>();
    final isDark = theme.brightness == Brightness.dark;

    final projects = ws.currentWorkspace?.projects ?? [];
    final allTasks = projects.expand((p) => p.tasks).toList();
    final now = DateTime.now();

    final myTasks = allTasks.where((t) => t.assigneeId == 'user_1').toList();
    final overdueTasks =
        allTasks.where((t) => t.dueDate.isBefore(now) && t.status != 'DONE').toList();
    final inProgressTasks =
        allTasks.where((t) => t.status == 'IN_PROGRESS').toList();

    final sections = [
      _SectionData(
        title: 'My Tasks',
        count: myTasks.length,
        icon: Icons.person,
        color: Colors.green,
        items: myTasks,
      ),
      _SectionData(
        title: 'Overdue',
        count: overdueTasks.length,
        icon: Icons.warning_amber,
        color: Colors.red,
        items: overdueTasks,
      ),
      _SectionData(
        title: 'In Progress',
        count: inProgressTasks.length,
        icon: Icons.access_time,
        color: Colors.blue,
        items: inProgressTasks,
      ),
    ];

    return Column(
      children: sections.map((section) {
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF18181B) : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF27272A)
                            : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(section.icon, size: 16, color: section.color),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(section.title,
                          style: theme.textTheme.bodyMedium
                              ?.copyWith(fontWeight: FontWeight.w500)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: section.color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text('${section.count}',
                          style: TextStyle(
                              fontSize: 12, color: section.color)),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: section.items.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Text('No ${section.title.toLowerCase()}',
                              style: theme.textTheme.bodySmall),
                        ),
                      )
                    : Column(
                        children: section.items.take(3).map((t) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xFF111113)
                                  : Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(t.title,
                                    style: theme.textTheme.bodySmall
                                        ?.copyWith(
                                            fontWeight: FontWeight.w500)),
                                const SizedBox(height: 4),
                                Text('${t.type} \u2022 ${t.priority} priority',
                                    style: theme.textTheme.bodySmall
                                        ?.copyWith(fontSize: 12)),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _SectionData {
  final String title;
  final int count;
  final IconData icon;
  final Color color;
  final List items;

  _SectionData({
    required this.title,
    required this.count,
    required this.icon,
    required this.color,
    required this.items,
  });
}
