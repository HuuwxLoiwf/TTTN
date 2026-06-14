import 'package:flutter/material.dart';
import '../models/project.dart';
import 'package:intl/intl.dart';

class ProjectSettings extends StatefulWidget {
  final Project project;

  const ProjectSettings({super.key, required this.project});

  @override
  State<ProjectSettings> createState() => _ProjectSettingsState();
}

class _ProjectSettingsState extends State<ProjectSettings> {
  late TextEditingController _nameController;
  late TextEditingController _descController;
  late String _status;
  late String _priority;
  late DateTime? _startDate;
  late DateTime? _endDate;
  late double _progress;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.project.name);
    _descController =
        TextEditingController(text: widget.project.description ?? '');
    _status = widget.project.status;
    _priority = widget.project.priority;
    _startDate = widget.project.startDate;
    _endDate = widget.project.endDate;
    _progress = widget.project.progress.toDouble();
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

    final inputStyle = BoxDecoration(
      color: isDark ? const Color(0xFF111113) : Colors.white,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(
        color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFD1D5DB),
      ),
    );

    return SingleChildScrollView(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF18181B) : Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color:
                      isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Project Details',
                      style: theme.textTheme.titleMedium),
                  const SizedBox(height: 24),
                  _buildField('Project Name',
                      TextField(controller: _nameController)),
                  const SizedBox(height: 16),
                  _buildField(
                    'Description',
                    TextField(
                      controller: _descController,
                      maxLines: 3,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _buildField(
                          'Status',
                          DropdownButtonFormField<String>(
                            value: _status,
                            decoration: const InputDecoration(
                                border: InputBorder.none),
                            items: const [
                              DropdownMenuItem(
                                  value: 'PLANNING', child: Text('Planning')),
                              DropdownMenuItem(
                                  value: 'ACTIVE', child: Text('Active')),
                              DropdownMenuItem(
                                  value: 'ON_HOLD', child: Text('On Hold')),
                              DropdownMenuItem(
                                  value: 'COMPLETED',
                                  child: Text('Completed')),
                              DropdownMenuItem(
                                  value: 'CANCELLED',
                                  child: Text('Cancelled')),
                            ],
                            onChanged: (v) =>
                                setState(() => _status = v!),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildField(
                          'Priority',
                          DropdownButtonFormField<String>(
                            value: _priority,
                            decoration: const InputDecoration(
                                border: InputBorder.none),
                            items: const [
                              DropdownMenuItem(
                                  value: 'LOW', child: Text('Low')),
                              DropdownMenuItem(
                                  value: 'MEDIUM', child: Text('Medium')),
                              DropdownMenuItem(
                                  value: 'HIGH', child: Text('High')),
                            ],
                            onChanged: (v) =>
                                setState(() => _priority = v!),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _buildField(
                          'Start Date',
                          InkWell(
                            onTap: () async {
                              final d = await showDatePicker(
                                context: context,
                                initialDate: _startDate ?? DateTime.now(),
                                firstDate: DateTime(2020),
                                lastDate: DateTime(2030),
                              );
                              if (d != null) setState(() => _startDate = d);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 14),
                              decoration: inputStyle,
                              child: Text(
                                _startDate != null
                                    ? DateFormat('yyyy-MM-dd')
                                        .format(_startDate!)
                                    : 'Select date',
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildField(
                          'End Date',
                          InkWell(
                            onTap: () async {
                              final d = await showDatePicker(
                                context: context,
                                initialDate: _endDate ?? DateTime.now(),
                                firstDate: DateTime(2020),
                                lastDate: DateTime(2030),
                              );
                              if (d != null) setState(() => _endDate = d);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 14),
                              decoration: inputStyle,
                              child: Text(
                                _endDate != null
                                    ? DateFormat('yyyy-MM-dd')
                                        .format(_endDate!)
                                    : 'Select date',
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildField(
                    'Progress: ${_progress.toInt()}%',
                    Slider(
                      value: _progress,
                      min: 0,
                      max: 100,
                      divisions: 20,
                      onChanged: (v) => setState(() => _progress = v),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.save, size: 16),
                      label: const Text('Save Changes'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 24),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF18181B) : Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFF27272A)
                      : const Color(0xFFE5E7EB),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Team Members',
                          style: theme.textTheme.titleMedium),
                      IconButton(
                        icon: const Icon(Icons.add),
                        onPressed: () {},
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ...widget.project.members.map((m) {
                    final name = m.user?.name ?? 'Unknown';
                    final isLead =
                        m.userId == widget.project.teamLead;
                    return Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF111113)
                            : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment:
                            MainAxisAlignment.spaceBetween,
                        children: [
                          Text(name),
                          if (isLead)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                border: Border.all(
                                    color: isDark
                                        ? const Color(0xFF52525B)
                                        : const Color(0xFFD4D4D8)),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('Team Lead',
                                  style: TextStyle(fontSize: 11)),
                            ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildField(String label, Widget child) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: theme.textTheme.bodySmall?.copyWith(
                color: theme.textTheme.bodySmall?.color
                    ?.withValues(alpha: 0.6))),
        const SizedBox(height: 4),
        child,
      ],
    );
  }
}
