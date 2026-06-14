import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/workspace_provider.dart';

class RecentActivity extends StatelessWidget {
  const RecentActivity({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ws = context.watch<WorkspaceProvider>();
    final isDark = theme.brightness == Brightness.dark;

    final tasks = ws.currentWorkspace?.projects
            .expand((p) => p.tasks)
            .toList() ??
        [];

    final typeIcons = {
      'BUG': Icons.bug_report,
      'FEATURE': Icons.bolt,
      'TASK': Icons.check_box,
      'IMPROVEMENT': Icons.forum,
      'OTHER': Icons.message,
    };

    final typeColors = {
      'BUG': Colors.red,
      'FEATURE': Colors.blue,
      'TASK': Colors.green,
      'IMPROVEMENT': Colors.amber,
      'OTHER': Colors.purple,
    };

    final statusColors = {
      'TODO': const Color(0xFFA1A1AA),
      'IN_PROGRESS': const Color(0xFFF59E0B),
      'DONE': const Color(0xFF22C55E),
    };

    return Container(
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
            padding: const EdgeInsets.all(16),
            child: Text('Recent Activity',
                style: theme.textTheme.titleSmall),
          ),
          if (tasks.isEmpty)
            const Padding(
              padding: EdgeInsets.all(48),
              child: Center(child: Text('No recent activity')),
            )
          else
            ...tasks.map((t) {
              final icon = typeIcons[t.type] ?? Icons.check_box;
              final iconColor = typeColors[t.type] ?? Colors.grey;
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: isDark
                          ? const Color(0xFF27272A)
                          : const Color(0xFFE5E7EB),
                    ),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF27272A)
                            : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(icon, size: 16, color: iconColor),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment:
                                MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(t.title,
                                    style: theme.textTheme.bodyMedium
                                        ?.copyWith(
                                            fontWeight: FontWeight.w500)),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: (statusColors[t.status] ??
                                          Colors.grey)
                                      .withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  t.status.replaceAll('_', ' '),
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: statusColors[t.status],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Text(t.type,
                                  style: theme.textTheme.bodySmall),
                              const SizedBox(width: 16),
                              if (t.assignee != null) ...[
                                CircleAvatar(
                                    radius: 8,
                                    backgroundColor: Colors.grey.shade400),
                                const SizedBox(width: 4),
                                Text(t.assignee!.name,
                                    style: theme.textTheme.bodySmall),
                                const SizedBox(width: 16),
                              ],
                              Text(
                                DateFormat('MMM d, h:mm a')
                                    .format(t.updatedAt),
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}
