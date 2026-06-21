import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/project.dart';
import '../models/department.dart';
import '../providers/workspace_provider.dart';
import '../services/api_service.dart';
import '../widgets/project_card.dart';
import '../widgets/department_manager.dart';
import 'project_details_screen.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  String _searchTerm = '';
  String _statusFilter = 'ALL';
  String _priorityFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ws = context.watch<WorkspaceProvider>();
    final projects = ws.currentWorkspace?.projects ?? [];

    final filtered = projects.where((p) {
      final matchesSearch = _searchTerm.isEmpty ||
          p.name.toLowerCase().contains(_searchTerm.toLowerCase()) ||
          (p.description?.toLowerCase().contains(_searchTerm.toLowerCase()) ?? false);
      final matchesStatus = _statusFilter == 'ALL' || p.status == _statusFilter;
      final matchesPriority =
          _priorityFilter == 'ALL' || p.priority == _priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    }).toList();

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Projects',
                      style: theme.textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text('Manage and track your projects',
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.textTheme.bodySmall?.color
                              ?.withValues(alpha: 0.6))),
                ],
              ),
              FilledButton.icon(
                onPressed: () =>
                    _showCreateProjectDialog(context),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('New Project'),
                style: FilledButton.styleFrom(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8))),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              SizedBox(
                width: 300,
                child: TextField(
                  onChanged: (v) => setState(() => _searchTerm = v),
                  decoration: InputDecoration(
                    hintText: 'Search projects...',
                    prefixIcon:
                        const Icon(Icons.search, size: 18),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              DropdownButton<String>(
                value: _statusFilter,
                underline: const SizedBox(),
                items: const [
                  DropdownMenuItem(value: 'ALL', child: Text('All Status')),
                  DropdownMenuItem(value: 'ACTIVE', child: Text('Active')),
                  DropdownMenuItem(value: 'PLANNING', child: Text('Planning')),
                  DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                  DropdownMenuItem(value: 'ON_HOLD', child: Text('On Hold')),
                  DropdownMenuItem(value: 'CANCELLED', child: Text('Cancelled')),
                ],
                onChanged: (v) => setState(() => _statusFilter = v!),
              ),
              const SizedBox(width: 12),
              DropdownButton<String>(
                value: _priorityFilter,
                underline: const SizedBox(),
                items: const [
                  DropdownMenuItem(value: 'ALL', child: Text('All Priority')),
                  DropdownMenuItem(value: 'HIGH', child: Text('High')),
                  DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                  DropdownMenuItem(value: 'LOW', child: Text('Low')),
                ],
                onChanged: (v) => setState(() => _priorityFilter = v!),
              ),
            ],
          ),
          const SizedBox(height: 24),
          if (filtered.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 64),
                child: Column(
                  children: [
                    Icon(Icons.folder_open,
                        size: 64,
                        color: theme.textTheme.bodySmall?.color
                            ?.withValues(alpha: 0.3)),
                    const SizedBox(height: 16),
                    Text('No projects found',
                        style: theme.textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Text('Create your first project to get started',
                        style: theme.textTheme.bodySmall),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: () =>
                          _showCreateProjectDialog(context),
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Create Project'),
                    ),
                  ],
                ),
              ),
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.1,
              ),
              itemCount: filtered.length,
              itemBuilder: (_, i) => ProjectCard(
                project: filtered[i],
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ProjectDetailsScreen(
                        projectId: filtered[i].id,
                        initialTab: 'tasks',
                      ),
                    ),
                  );
                },
              ),
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
  String? _departmentId;
  List<Department> _departments = [];

  @override
  void initState() {
    super.initState();
    _loadDepartments();
  }

  Future<void> _loadDepartments() async {
    final ws = context.read<WorkspaceProvider>().currentWorkspace;
    if (ws == null) return;
    try {
      final d = await apiService.getDepartments(ws.id);
      if (mounted) setState(() => _departments = d);
    } catch (_) {}
  }

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
              color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB)),
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
                  Text('Create New Project',
                      style: theme.textTheme.titleMedium),
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
                        DropdownMenuItem(value: 'PLANNING', child: Text('Planning')),
                        DropdownMenuItem(value: 'ACTIVE', child: Text('Active')),
                        DropdownMenuItem(value: 'ON_HOLD', child: Text('On Hold')),
                        DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                        DropdownMenuItem(value: 'CANCELLED', child: Text('Cancelled')),
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
                        DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
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
                    child: DropdownButtonFormField<String>(
                      value: _departmentId,
                      decoration: const InputDecoration(labelText: 'Phòng ban *'),
                      items: _departments
                          .map((d) => DropdownMenuItem(value: d.id, child: Text(d.name)))
                          .toList(),
                      onChanged: (v) => setState(() => _departmentId = v),
                      validator: (v) => v == null ? 'Bắt buộc chọn phòng ban' : null,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Quản lý phòng ban',
                    icon: const Icon(Icons.business),
                    onPressed: () async {
                      final ws = context.read<WorkspaceProvider>().currentWorkspace;
                      if (ws == null) return;
                      await showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        builder: (_) => DepartmentManagerSheet(workspaceId: ws.id),
                      );
                      _loadDepartments();
                    },
                  ),
                ],
              ),
              if (_departments.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 4),
                  child: Text('Chưa có phòng ban. Bấm nút tòa nhà để tạo trước.',
                      style: TextStyle(fontSize: 12, color: Colors.orange)),
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
                        decoration:
                            const InputDecoration(labelText: 'Start Date'),
                        child: Text(_startDate != null
                            ? '${_startDate!.day}/${_startDate!.month}/${_startDate!.year}'
                            : 'Select date'),
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
                        decoration:
                            const InputDecoration(labelText: 'End Date'),
                        child: Text(_endDate != null
                            ? '${_endDate!.day}/${_endDate!.month}/${_endDate!.year}'
                            : 'Select date'),
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
                        ws.addProject(Project(
                          id: 'proj_${DateTime.now().millisecondsSinceEpoch}',
                          name: _nameController.text,
                          description: _descController.text,
                          priority: _priority,
                          status: _status,
                          startDate: _startDate,
                          endDate: _endDate,
                          teamLead: apiService.currentUserId ?? '',
                          workspaceId: ws.currentWorkspace?.id ?? '',
                        ), departmentId: _departmentId);
                        Navigator.pop(context);
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
