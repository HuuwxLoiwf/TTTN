import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/workspace_provider.dart';

class ProjectsSidebar extends StatefulWidget {
  final void Function(String, {String tab}) onProjectTap;

  const ProjectsSidebar({super.key, required this.onProjectTap});

  @override
  State<ProjectsSidebar> createState() => _ProjectsSidebarState();
}

class _ProjectsSidebarState extends State<ProjectsSidebar> {
  final Set<String> _expanded = {};

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ws = context.watch<WorkspaceProvider>();

    final projects = ws.currentWorkspace?.projects ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text('PROJECTS',
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontSize: 11,
                      letterSpacing: 1,
                      color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.6),
                    ),
                    overflow: TextOverflow.ellipsis),
              ),
              const Icon(Icons.arrow_forward, size: 14),
            ],
          ),
        ),
        ...projects.map((p) {
          final isExpanded = _expanded.contains(p.id);
          final subItems = [
            _SubItem(
                icon: Icons.list_alt,
                label: 'Tasks',
                tab: 'tasks'),
            _SubItem(
                icon: Icons.bar_chart,
                label: 'Analytics',
                tab: 'analytics'),
            _SubItem(
                icon: Icons.calendar_month,
                label: 'Calendar',
                tab: 'calendar'),
            _SubItem(
                icon: Icons.settings,
                label: 'Settings',
                tab: 'settings'),
          ];

          return Column(
            children: [
              InkWell(
                onTap: () => setState(() {
                  if (isExpanded) {
                    _expanded.remove(p.id);
                  } else {
                    _expanded.add(p.id);
                  }
                }),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      Icon(
                        isExpanded
                            ? Icons.keyboard_arrow_down
                            : Icons.keyboard_arrow_right,
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Colors.blue,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          p.name,
                          style: theme.textTheme.bodySmall,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (isExpanded)
                ...subItems.map((s) {
                  return InkWell(
                    onTap: () =>
                        widget.onProjectTap(p.id, tab: s.tab),
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.only(
                          left: 48, top: 4, bottom: 4, right: 16),
                      child: Row(
                        children: [
                          Icon(s.icon, size: 12),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(s.label,
                                style: theme.textTheme.bodySmall
                                    ?.copyWith(fontSize: 12),
                                overflow: TextOverflow.ellipsis),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
            ],
          );
        }),
      ],
    );
  }
}

class _SubItem {
  final IconData icon;
  final String label;
  final String tab;

  const _SubItem({
    required this.icon,
    required this.label,
    required this.tab,
  });
}
