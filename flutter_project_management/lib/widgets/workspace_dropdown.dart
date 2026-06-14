import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/workspace_provider.dart';

class WorkspaceDropdown extends StatelessWidget {
  const WorkspaceDropdown({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ws = context.watch<WorkspaceProvider>();
    final isDark = theme.brightness == Brightness.dark;

    final current = ws.currentWorkspace;
    final count = ws.workspaces.length;

    return Container(
      margin: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF27272A) : Colors.grey.shade200,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Center(
              child: Text(
                current?.name.isNotEmpty == true
                    ? current!.name[0].toUpperCase()
                    : 'W',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  current?.name ?? 'Select Workspace',
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '$count workspace${count != 1 ? 's' : ''}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.6),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, size: 16),
        ],
      ),
    );
  }
}
