import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/task.dart';

class ProjectCalendar extends StatelessWidget {
  final List<Task> tasks;

  const ProjectCalendar({super.key, required this.tasks});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final now = DateTime.now();
    final firstDay = DateTime(now.year, now.month, 1);
    final lastDay = DateTime(now.year, now.month + 1, 0);
    final daysInMonth = lastDay.day;
    final firstWeekday = firstDay.weekday % 7;

    final statusColors = {
      'TODO': const Color(0xFFA1A1AA),
      'IN_PROGRESS': const Color(0xFFF59E0B),
      'DONE': const Color(0xFF22C55E),
    };

    final taskMap = <int, List<Task>>{};
    for (var t in tasks) {
      final d = t.dueDate;
      if (d.month == now.month && d.year == now.year) {
        taskMap.putIfAbsent(d.day, () => []).add(t);
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          DateFormat('MMMM yyyy').format(now),
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            crossAxisSpacing: 4,
            mainAxisSpacing: 4,
            childAspectRatio: 0.9,
          ),
          itemCount: 42,
          itemBuilder: (_, i) {
            final day = i - firstWeekday + 1;
            if (day < 1 || day > daysInMonth) {
              return const SizedBox.shrink();
            }
            final dayTasks = taskMap[day] ?? [];

            return Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: day == now.day
                    ? theme.colorScheme.primary.withValues(alpha: 0.1)
                    : null,
                borderRadius: BorderRadius.circular(6),
                border: day == now.day
                    ? Border.all(color: theme.colorScheme.primary)
                    : null,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$day',
                    style: TextStyle(
                      fontWeight:
                          day == now.day ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                  ),
                  ...dayTasks.take(2).map((t) {
                    return Container(
                      height: 4,
                      width: double.infinity,
                      margin: const EdgeInsets.only(top: 2),
                      decoration: BoxDecoration(
                        color: statusColors[t.status] ?? Colors.grey,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    );
                  }),
                  if (dayTasks.length > 2)
                    Text(
                      '+${dayTasks.length - 2}',
                      style: TextStyle(
                        fontSize: 9,
                        color: theme.textTheme.bodySmall?.color
                            ?.withValues(alpha: 0.6),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}
