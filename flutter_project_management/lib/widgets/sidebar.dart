import 'package:flutter/material.dart';
import 'workspace_dropdown.dart';
import 'my_tasks_sidebar.dart';
import 'projects_sidebar.dart';

class Sidebar extends StatelessWidget {
  final bool isOpen;
  final VoidCallback onClose;
  final int currentIndex;
  final void Function(int) onNavigate;
  final void Function(String, {String tab}) onProjectTap;
  final void Function(String, String) onTaskTap;

  const Sidebar({
    super.key,
    required this.isOpen,
    required this.onClose,
    required this.currentIndex,
    required this.onNavigate,
    required this.onProjectTap,
    required this.onTaskTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final menuItems = [
      _MenuItem(icon: Icons.dashboard, label: 'Dashboard', index: 0),
      _MenuItem(icon: Icons.folder_open, label: 'Projects', index: 1),
      _MenuItem(icon: Icons.people, label: 'Team', index: 2),
    ];

    return Container(
      width: 260,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111113) : Colors.white,
        border: Border(
          right: BorderSide(
            color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB),
          ),
        ),
      ),
      child: Column(
        children: [
          const WorkspaceDropdown(),
          Divider(
              color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB)),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    children: menuItems.map((item) {
                      final isActive = currentIndex == item.index;
                      return InkWell(
                        onTap: () => onNavigate(item.index),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: isActive
                                ? (isDark
                                    ? const Color(0xFF27272A)
                                    : Colors.grey.shade100)
                                : null,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Icon(item.icon,
                                  size: 16,
                                  color: isActive
                                      ? theme.colorScheme.primary
                                      : null),
                              const SizedBox(width: 12),
                              Flexible(
                                child: Text(item.label,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: isActive
                                          ? FontWeight.w500
                                          : FontWeight.normal,
                                    ),
                                    overflow: TextOverflow.ellipsis),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                MyTasksSidebar(onTaskTap: onTaskTap),
                ProjectsSidebar(onProjectTap: onProjectTap),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final int index;

  const _MenuItem({
    required this.icon,
    required this.label,
    required this.index,
  });
}
