import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/project.dart';
import '../providers/workspace_provider.dart';
import '../widgets/project_tasks.dart';
import '../widgets/project_calendar.dart';
import '../widgets/project_analytics.dart';
import '../widgets/project_settings.dart';
import '../widgets/create_task_dialog.dart';

class ProjectDetailsScreen extends StatefulWidget {
  final String projectId;
  final String initialTab;

  const ProjectDetailsScreen({
    super.key,
    required this.projectId,
    this.initialTab = 'tasks',
  });

  @override
  State<ProjectDetailsScreen> createState() => _ProjectDetailsScreenState();
}

class _ProjectDetailsScreenState extends State<ProjectDetailsScreen> {
  late String _activeTab;
  bool _showCreateTask = false;

  @override
  void initState() {
    super.initState();
    _activeTab = widget.initialTab;
  }

  @override
  Widget build(BuildContext context) {
    final ws = context.watch<WorkspaceProvider>();
    final project = ws.currentWorkspace?.projects
        .where((p) => p.id == widget.projectId)
        .firstOrNull;

    if (project == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Project not found')),
        body: const Center(child: Text('Project not found')),
      );
    }

    final tasks = project.tasks;

    final statusColors = {
      'PLANNING': const Color(0xFFA1A1AA),
      'ACTIVE': const Color(0xFF22C55E),
      'ON_HOLD': const Color(0xFFF59E0B),
      'COMPLETED': const Color(0xFF3B82F6),
      'CANCELLED': const Color(0xFFEF4444),
    };

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Flexible(child: Text(project.name, overflow: TextOverflow.ellipsis)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
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
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilledButton.icon(
              onPressed: () => setState(() => _showCreateTask = true),
              icon: const Icon(Icons.add, size: 16),
              label: const Text('New Task'),
              style: FilledButton.styleFrom(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _InfoCard(
                    label: 'Total Tasks',
                    value: '${tasks.length}',
                    color: Colors.white),
                const SizedBox(width: 12),
                _InfoCard(
                    label: 'Completed',
                    value:
                        '${tasks.where((t) => t.status == 'DONE').length}',
                    color: Colors.green),
                const SizedBox(width: 12),
                _InfoCard(
                    label: 'In Progress',
                    value:
                        '${tasks.where((t) => t.status == 'IN_PROGRESS' || t.status == 'TODO').length}',
                    color: Colors.amber),
                const SizedBox(width: 12),
                _InfoCard(
                    label: 'Team Members',
                    value: '${project.members.length}',
                    color: Colors.blue),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _TabButton(
                  label: 'Tasks',
                  icon: Icons.list_alt,
                  isActive: _activeTab == 'tasks',
                  onTap: () => setState(() => _activeTab = 'tasks'),
                ),
                const SizedBox(width: 4),
                _TabButton(
                  label: 'Calendar',
                  icon: Icons.calendar_month,
                  isActive: _activeTab == 'calendar',
                  onTap: () => setState(() => _activeTab = 'calendar'),
                ),
                const SizedBox(width: 4),
                _TabButton(
                  label: 'Analytics',
                  icon: Icons.bar_chart,
                  isActive: _activeTab == 'analytics',
                  onTap: () => setState(() => _activeTab = 'analytics'),
                ),
                const SizedBox(width: 4),
                _TabButton(
                  label: 'Settings',
                  icon: Icons.settings,
                  isActive: _activeTab == 'settings',
                  onTap: () => setState(() => _activeTab = 'settings'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: _buildTabContent(project),
            ),
          ],
        ),
      ),
      floatingActionButton: _showCreateTask
          ? CreateTaskDialog(
              projectId: widget.projectId,
              onClose: () => setState(() => _showCreateTask = false),
            )
          : null,
    );
  }

  Widget _buildTabContent(Project project) {
    switch (_activeTab) {
      case 'calendar':
        return ProjectCalendar(tasks: project.tasks);
      case 'analytics':
        return ProjectAnalytics(tasks: project.tasks, project: project);
      case 'settings':
        return ProjectSettings(project: project);
      default:
        return ProjectTasks(project: project);
    }
  }
}

class _InfoCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _InfoCard({
    required this.label,
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
              color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.textTheme.bodySmall?.color
                        ?.withValues(alpha: 0.6))),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(value,
                    style: theme.textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.bold)),
                Icon(Icons.bolt, color: color, size: 16),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.icon,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? (isDark ? const Color(0xFF27272A) : Colors.grey.shade100)
              : null,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14),
            const SizedBox(width: 6),
            Text(label, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
