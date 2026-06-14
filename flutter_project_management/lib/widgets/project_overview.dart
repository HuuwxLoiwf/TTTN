import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/workspace_provider.dart';
import 'package:intl/intl.dart';

class ProjectOverview extends StatelessWidget {
  const ProjectOverview({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ws = context.watch<WorkspaceProvider>();
    final isDark = theme.brightness == Brightness.dark;

    final projects = ws.currentWorkspace?.projects ?? [];

    final statusColors = {
      'PLANNING': const Color(0xFFA1A1AA),
      'ACTIVE': const Color(0xFF22C55E),
      'ON_HOLD': const Color(0xFFF59E0B),
      'COMPLETED': const Color(0xFF3B82F6),
      'CANCELLED': const Color(0xFFEF4444),
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
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Project Overview',
                    style: theme.textTheme.titleSmall,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                TextButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.arrow_forward, size: 14),
                    label: const Text('View all'),
                  ),
              ],
            ),
          ),
          if (projects.isEmpty)
            const Padding(
              padding: EdgeInsets.all(48),
              child: Center(child: Text('No projects yet')),
            )
          else
            ...projects.take(5).map((p) {
              return InkWell(
                onTap: () {},
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color:
                            isDark
                                ? const Color(0xFF27272A)
                                : const Color(0xFFE5E7EB),
                      ),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  p.name,
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  p.description ?? 'No description',
                                  style: theme.textTheme.bodySmall,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: (statusColors[p.status] ?? Colors.grey)
                                  .withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              p.status.replaceAll('_', ' '),
                              style: TextStyle(
                                fontSize: 11,
                                color: statusColors[p.status],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          if (p.members.isNotEmpty) ...[
                            const Icon(Icons.people, size: 12),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                '${p.members.length} members',
                                style: theme.textTheme.bodySmall,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 16),
                          ],
                          if (p.endDate != null) ...[
                            const Icon(Icons.calendar_today, size: 12),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                DateFormat('MMM d, yyyy').format(p.endDate!),
                                style: theme.textTheme.bodySmall,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: p.progress / 100,
                                backgroundColor:
                                    isDark
                                        ? const Color(0xFF27272A)
                                        : Colors.grey.shade200,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${p.progress}%',
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
