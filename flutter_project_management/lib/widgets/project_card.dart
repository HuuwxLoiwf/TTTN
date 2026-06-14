import 'package:flutter/material.dart';
import '../models/project.dart';

class ProjectCard extends StatelessWidget {
  final Project project;
  final VoidCallback? onTap;

  const ProjectCard({
    super.key,
    required this.project,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final statusColors = {
      'PLANNING': const Color(0xFFA1A1AA),
      'ACTIVE': const Color(0xFF22C55E),
      'ON_HOLD': const Color(0xFFF59E0B),
      'COMPLETED': const Color(0xFF3B82F6),
      'CANCELLED': const Color(0xFFEF4444),
    };

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(20),
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
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    project.name,
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    project.description ?? 'No description',
                    style: theme.textTheme.bodySmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: (statusColors[project.status] ?? Colors.grey)
                        .withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    project.status.replaceAll('_', ' '),
                    style: TextStyle(
                      fontSize: 11,
                      color: statusColors[project.status],
                    ),
                  ),
                ),
                Text(
                  '${project.priority} priority',
                  style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Text('Progress', style: theme.textTheme.bodySmall),
                const Spacer(),
                Text('${project.progress}%',
                    style: theme.textTheme.bodySmall),
              ],
            ),
            const SizedBox(height: 4),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: project.progress / 100,
                backgroundColor:
                    isDark ? const Color(0xFF27272A) : Colors.grey.shade200,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
