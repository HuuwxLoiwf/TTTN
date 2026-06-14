import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/project.dart';
import '../providers/workspace_provider.dart';
import '../widgets/stats_grid.dart';
import '../widgets/project_overview.dart';
import '../widgets/recent_activity.dart';
import '../widgets/tasks_summary.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome back, User',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Here's what's happening with your projects today",
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.textTheme.bodySmall?.color?.withValues(
                          alpha: 0.6,
                        ),
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              FilledButton.icon(
                onPressed: () => _showCreateProjectDialog(context),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('New Project'),
                style: FilledButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const StatsGrid(),
          const SizedBox(height: 32),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Expanded(
                flex: 2,
                child: Column(
                  children: [
                    ProjectOverview(),
                    SizedBox(height: 32),
                    RecentActivity(),
                  ],
                ),
              ),
              const SizedBox(width: 32),
              const Expanded(child: TasksSummary()),
            ],
          ),
        ],
      ),
    );
  }

  void _showCreateProjectDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => const CreateProjectDialogWidget(),
    );
  }
}

class CreateProjectDialogWidget extends StatefulWidget {
  const CreateProjectDialogWidget({super.key});

  @override
  State<CreateProjectDialogWidget> createState() =>
      _CreateProjectDialogWidgetState();
}

class _CreateProjectDialogWidgetState extends State<CreateProjectDialogWidget> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  String _status = 'PLANNING';
  String _priority = 'MEDIUM';
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        width: 500,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: theme.scaffoldBackgroundColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB),
          ),
        ),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Create New Project',
                    style: theme.textTheme.titleMedium,
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Project Name'),
                validator: (v) => v?.isEmpty == true ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  alignLabelWithHint: true,
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: const [
                        DropdownMenuItem(
                          value: 'PLANNING',
                          child: Text('Planning'),
                        ),
                        DropdownMenuItem(
                          value: 'ACTIVE',
                          child: Text('Active'),
                        ),
                        DropdownMenuItem(
                          value: 'ON_HOLD',
                          child: Text('On Hold'),
                        ),
                        DropdownMenuItem(
                          value: 'COMPLETED',
                          child: Text('Completed'),
                        ),
                        DropdownMenuItem(
                          value: 'CANCELLED',
                          child: Text('Cancelled'),
                        ),
                      ],
                      onChanged: (v) => setState(() => _status = v!),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _priority,
                      decoration: const InputDecoration(labelText: 'Priority'),
                      items: const [
                        DropdownMenuItem(value: 'LOW', child: Text('Low')),
                        DropdownMenuItem(
                          value: 'MEDIUM',
                          child: Text('Medium'),
                        ),
                        DropdownMenuItem(value: 'HIGH', child: Text('High')),
                      ],
                      onChanged: (v) => setState(() => _priority = v!),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now(),
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2030),
                        );
                        if (date != null) setState(() => _startDate = date);
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Start Date',
                        ),
                        child: Text(
                          _startDate != null
                              ? '${_startDate!.day}/${_startDate!.month}/${_startDate!.year}'
                              : 'Select date',
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now(),
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2030),
                        );
                        if (date != null) setState(() => _endDate = date);
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'End Date',
                        ),
                        child: Text(
                          _endDate != null
                              ? '${_endDate!.day}/${_endDate!.month}/${_endDate!.year}'
                              : 'Select date',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () {
                      if (_formKey.currentState!.validate()) {
                        final ws = context.read<WorkspaceProvider>();
                        ws.addProject(
                          Project(
                            id: 'proj_${DateTime.now().millisecondsSinceEpoch}',
                            name: _nameController.text,
                            description: _descController.text,
                            priority: _priority,
                            status: _status,
                            startDate: _startDate,
                            endDate: _endDate,
                            teamLead: 'user_1',
                            workspaceId: ws.currentWorkspace?.id ?? '',
                          ),
                        );
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Project created!')),
                        );
                      }
                    },
                    child: const Text('Create Project'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
