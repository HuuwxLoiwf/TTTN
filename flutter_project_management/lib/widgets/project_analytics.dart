import 'package:flutter/material.dart';
import '../models/project.dart';
import '../models/task.dart';

class ProjectAnalytics extends StatelessWidget {
  final List<Task> tasks;
  final Project project;

  const ProjectAnalytics({
    super.key,
    required this.tasks,
    required this.project,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final totalTasks = tasks.length;
    final todoCount = tasks.where((t) => t.status == 'TODO').length;
    final inProgressCount =
        tasks.where((t) => t.status == 'IN_PROGRESS').length;
    final doneCount = tasks.where((t) => t.status == 'DONE').length;

    final typeCounts = <String, int>{};
    for (var t in tasks) {
      typeCounts[t.type] = (typeCounts[t.type] ?? 0) + 1;
    }

    final typeColors = {
      'BUG': Colors.red,
      'FEATURE': Colors.blue,
      'TASK': Colors.green,
      'IMPROVEMENT': Colors.purple,
      'OTHER': Colors.amber,
    };

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Analytics', style: theme.textTheme.titleMedium),
          const SizedBox(height: 24),
          Row(
            children: [
              _AnalyticsCard(
                title: 'Progress',
                value: '${project.progress}%',
                color: Colors.blue,
              ),
              const SizedBox(width: 16),
              _AnalyticsCard(
                title: 'Total Tasks',
                value: '$totalTasks',
                color: Colors.grey,
              ),
              const SizedBox(width: 16),
              _AnalyticsCard(
                title: 'Done',
                value: '$doneCount',
                color: Colors.green,
              ),
              const SizedBox(width: 16),
              _AnalyticsCard(
                title: 'In Progress',
                value: '$inProgressCount',
                color: Colors.amber,
              ),
              const SizedBox(width: 16),
              _AnalyticsCard(
                title: 'To Do',
                value: '$todoCount',
                color: Colors.grey,
              ),
            ],
          ),
          const SizedBox(height: 32),
          Text('Task Distribution by Type',
              style: theme.textTheme.titleSmall),
          const SizedBox(height: 16),
          ...typeCounts.entries.map((entry) {
            final total = tasks.length;
            final pct = total > 0 ? (entry.value / total * 100) : 0.0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: typeColors[entry.key] ?? Colors.grey,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(entry.key),
                        ],
                      ),
                      Text('${entry.value} (${pct.toStringAsFixed(1)}%)'),
                    ],
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: pct / 100,
                      backgroundColor: isDark
                          ? const Color(0xFF27272A)
                          : Colors.grey.shade200,
                      color: typeColors[entry.key],
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 32),
          Text('Status Distribution', style: theme.textTheme.titleSmall),
          const SizedBox(height: 16),
          Row(
            children: [
              _StatusBar(
                label: 'To Do',
                count: todoCount,
                total: totalTasks,
                color: Colors.grey,
              ),
              const SizedBox(width: 8),
              _StatusBar(
                label: 'In Progress',
                count: inProgressCount,
                total: totalTasks,
                color: Colors.amber,
              ),
              const SizedBox(width: 8),
              _StatusBar(
                label: 'Done',
                count: doneCount,
                total: totalTasks,
                color: Colors.green,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AnalyticsCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;

  const _AnalyticsCard({
    required this.title,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF18181B) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB),
          ),
        ),
        child: Column(
          children: [
            Text(title, style: theme.textTheme.bodySmall),
            const SizedBox(height: 8),
            Text(value,
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}

class _StatusBar extends StatelessWidget {
  final String label;
  final int count;
  final int total;
  final Color color;

  const _StatusBar({
    required this.label,
    required this.count,
    required this.total,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final pct = total > 0 ? (count / total * 100) : 0.0;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF18181B) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB),
          ),
        ),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              height: 120,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  '${pct.toStringAsFixed(0)}%',
                  style: theme.textTheme.headlineMedium
                      ?.copyWith(fontWeight: FontWeight.bold, color: color),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text('$count $label', style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
