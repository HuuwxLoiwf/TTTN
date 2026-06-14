import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/workspace_provider.dart';

class StatsGrid extends StatelessWidget {
  const StatsGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ws = context.watch<WorkspaceProvider>();
    final isDark = theme.brightness == Brightness.dark;

    final currentWorkspace = ws.currentWorkspace;
    if (currentWorkspace == null) return const SizedBox.shrink();

    final projects = currentWorkspace.projects;
    final allTasks = projects.expand((p) => p.tasks).toList();
    final now = DateTime.now();

    final stats = {
      'Total Projects': {
        'value': projects.length,
        'icon': Icons.folder_open,
        'color': Colors.blue,
        'subtitle': 'projects in ${currentWorkspace.name}',
      },
      'Completed Projects': {
        'value': projects.where((p) => p.status == 'COMPLETED').length,
        'icon': Icons.check_circle,
        'color': Colors.green,
        'subtitle': 'of ${projects.length} total',
      },
      'My Tasks': {
        'value': allTasks.where((t) => t.assigneeId == 'user_1').length,
        'icon': Icons.people,
        'color': Colors.purple,
        'subtitle': 'assigned to me',
      },
      'Overdue': {
        'value':
            allTasks
                .where((t) => t.dueDate.isBefore(now) && t.status != 'DONE')
                .length,
        'icon': Icons.warning_amber,
        'color': Colors.amber,
        'subtitle': 'need attention',
      },
    };

    final screenWidth = MediaQuery.of(context).size.width;
    int crossAxisCount;
    if (screenWidth < 768) {
      crossAxisCount = 1;
    } else if (screenWidth < 1024) {
      crossAxisCount = 2;
    } else if (screenWidth < 1400) {
      crossAxisCount = 3;
    } else {
      crossAxisCount = 4;
    }

    return GridView(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 2.2,
      ),
      children:
          stats.entries.map((entry) {
            return Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF18181B) : Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color:
                      isDark
                          ? const Color(0xFF27272A)
                          : const Color(0xFFE5E7EB),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        entry.key,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.textTheme.bodySmall?.color?.withValues(
                            alpha: 0.6,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${entry.value['value']}',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        entry.value['subtitle'] as String,
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: (entry.value['color'] as Color).withValues(
                        alpha: 0.1,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      entry.value['icon'] as IconData,
                      color: entry.value['color'] as Color,
                      size: 20,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
    );
  }
}
