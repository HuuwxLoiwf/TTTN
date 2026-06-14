import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../providers/workspace_provider.dart';
import '../screens/task_details_screen.dart';

class ProjectTasks extends StatefulWidget {
  final Project project;

  const ProjectTasks({super.key, required this.project});

  @override
  State<ProjectTasks> createState() => _ProjectTasksState();
}

class _ProjectTasksState extends State<ProjectTasks> {
  String _statusFilter = '';
  String _typeFilter = '';
  String _priorityFilter = '';
  String _assigneeFilter = '';
  final Set<String> _selectedTasks = {};

  List<Task> get _filteredTasks {
    return widget.project.tasks.where((t) {
      final statusMatch =
          _statusFilter.isEmpty || t.status == _statusFilter;
      final typeMatch = _typeFilter.isEmpty || t.type == _typeFilter;
      final priorityMatch =
          _priorityFilter.isEmpty || t.priority == _priorityFilter;
      final assigneeMatch = _assigneeFilter.isEmpty ||
          t.assignee?.name == _assigneeFilter;
      return statusMatch && typeMatch && priorityMatch && assigneeMatch;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final ws = context.watch<WorkspaceProvider>();

    final assignees = widget.project.tasks
        .map((t) => t.assignee?.name)
        .whereType<String>()
        .toSet()
        .toList();

    final hasFilters = _statusFilter.isNotEmpty ||
        _typeFilter.isNotEmpty ||
        _priorityFilter.isNotEmpty ||
        _assigneeFilter.isNotEmpty;

    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
            _FilterDropdown(
              value: _statusFilter,
              label: 'All Statuses',
              items: const [
                DropdownMenuItem(value: '', child: Text('All Statuses')),
                DropdownMenuItem(value: 'TODO', child: Text('To Do')),
                DropdownMenuItem(
                    value: 'IN_PROGRESS', child: Text('In Progress')),
                DropdownMenuItem(value: 'DONE', child: Text('Done')),
              ],
              onChanged: (v) => setState(() => _statusFilter = v),
            ),
            const SizedBox(width: 8),
            _FilterDropdown(
              value: _typeFilter,
              label: 'All Types',
              items: const [
                DropdownMenuItem(value: '', child: Text('All Types')),
                DropdownMenuItem(value: 'TASK', child: Text('Task')),
                DropdownMenuItem(value: 'BUG', child: Text('Bug')),
                DropdownMenuItem(value: 'FEATURE', child: Text('Feature')),
                DropdownMenuItem(
                    value: 'IMPROVEMENT', child: Text('Improvement')),
                DropdownMenuItem(value: 'OTHER', child: Text('Other')),
              ],
              onChanged: (v) => setState(() => _typeFilter = v),
            ),
            const SizedBox(width: 8),
            _FilterDropdown(
              value: _priorityFilter,
              label: 'All Priorities',
              items: const [
                DropdownMenuItem(value: '', child: Text('All Priorities')),
                DropdownMenuItem(value: 'LOW', child: Text('Low')),
                DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                DropdownMenuItem(value: 'HIGH', child: Text('High')),
              ],
              onChanged: (v) => setState(() => _priorityFilter = v),
            ),
            const SizedBox(width: 8),
            _FilterDropdown(
              value: _assigneeFilter,
              label: 'All Assignees',
              items: [
                const DropdownMenuItem(
                    value: '', child: Text('All Assignees')),
                ...assignees.map((a) =>
                    DropdownMenuItem(value: a, child: Text(a))),
              ],
              onChanged: (v) => setState(() => _assigneeFilter = v),
            ),
            if (hasFilters) ...[
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: () => setState(() {
                  _statusFilter = '';
                  _typeFilter = '';
                  _priorityFilter = '';
                  _assigneeFilter = '';
                }),
                icon: const Icon(Icons.close, size: 14),
                label: const Text('Reset'),
              ),
            ],
            if (_selectedTasks.isNotEmpty) ...[
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: () {
                  ws.deleteTask(_selectedTasks.toList());
                  setState(() => _selectedTasks.clear());
                },
                icon: const Icon(Icons.delete, size: 14),
                label: Text('Delete (${_selectedTasks.length})'),
                style: TextButton.styleFrom(foregroundColor: Colors.red),
              ),
            ],
          ],
        ),
      ),
      const SizedBox(height: 16),
        Expanded(
          child: _filteredTasks.isEmpty
              ? Center(
                  child: Text('No tasks found',
                      style: theme.textTheme.bodySmall))
              : ListView.builder(
                  itemCount: _filteredTasks.length,
                  itemBuilder: (_, i) {
                    final t = _filteredTasks[i];
                    final typeColors = {
                      'BUG': Colors.red,
                      'FEATURE': Colors.blue,
                      'TASK': Colors.green,
                      'IMPROVEMENT': Colors.purple,
                      'OTHER': Colors.amber,
                    };
                    final priorityBgColors = {
                      'LOW': Colors.red.withValues(alpha: 0.1),
                      'MEDIUM': Colors.blue.withValues(alpha: 0.1),
                      'HIGH': Colors.green.withValues(alpha: 0.1),
                    };
                    final priorityTextColors = {
                      'LOW': Colors.red,
                      'MEDIUM': Colors.blue,
                      'HIGH': Colors.green,
                    };

                    return Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: isDark
                                ? const Color(0xFF27272A)
                                : const Color(0xFFE5E7EB),
                          ),
                        ),
                      ),
                      child: InkWell(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => TaskDetailsScreen(
                                projectId: widget.project.id,
                                taskId: t.id,
                              ),
                            ),
                          );
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          child: Row(
                            children: [
                              Checkbox(
                                value: _selectedTasks.contains(t.id),
                                onChanged: (v) {
                                  setState(() {
                                    if (v == true) {
                                      _selectedTasks.add(t.id);
                                    } else {
                                      _selectedTasks.remove(t.id);
                                    }
                                  });
                                },
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                flex: 2,
                                child: Text(t.title,
                                    style: theme.textTheme.bodyMedium),
                              ),
                              Expanded(
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.bug_report,
                                      size: 14,
                                      color: typeColors[t.type] ?? Colors.grey,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(t.type,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color:
                                              typeColors[t.type] ?? Colors.grey,
                                        )),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: priorityBgColors[t.priority],
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    t.priority,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: priorityTextColors[t.priority],
                                    ),
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 120,
                                child: DropdownButton<String>(
                                  value: t.status,
                                  underline: const SizedBox(),
                                  isDense: true,
                                  items: const [
                                    DropdownMenuItem(
                                        value: 'TODO', child: Text('To Do')),
                                    DropdownMenuItem(
                                        value: 'IN_PROGRESS',
                                        child: Text('In Progress')),
                                    DropdownMenuItem(
                                        value: 'DONE', child: Text('Done')),
                                  ],
                                  onChanged: (v) {
                                    if (v != null) {
                                      final updated = Task(
                                        id: t.id,
                                        projectId: t.projectId,
                                        title: t.title,
                                        description: t.description,
                                        status: v,
                                        type: t.type,
                                        priority: t.priority,
                                        assigneeId: t.assigneeId,
                                        dueDate: t.dueDate,
                                        assignee: t.assignee,
                                      );
                                      ws.updateTask(updated);
                                    }
                                  },
                                ),
                              ),
                              SizedBox(
                                width: 120,
                                child: Row(
                                  children: [
                                    if (t.assignee != null) ...[
                                      CircleAvatar(
                                          radius: 10,
                                          backgroundColor:
                                              Colors.grey.shade400),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(t.assignee!.name,
                                            style:
                                                theme.textTheme.bodySmall),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              SizedBox(
                                width: 100,
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.calendar_today,
                                      size: 12,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      DateFormat('dd MMM')
                                          .format(t.dueDate),
                                      style: theme.textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _FilterDropdown extends StatelessWidget {
  final String value;
  final String label;
  final List<DropdownMenuItem<String>> items;
  final ValueChanged<String> onChanged;

  const _FilterDropdown({
    required this.value,
    required this.label,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButton<String>(
      value: value.isEmpty ? null : value,
      hint: Text(label, style: const TextStyle(fontSize: 13)),
      underline: const SizedBox(),
      items: items,
      onChanged: (v) => onChanged(v ?? ''),
    );
  }
}
