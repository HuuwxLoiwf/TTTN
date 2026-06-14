import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/task.dart';
import '../providers/workspace_provider.dart';

class CreateTaskDialog extends StatefulWidget {
  final String projectId;
  final VoidCallback onClose;

  const CreateTaskDialog({
    super.key,
    required this.projectId,
    required this.onClose,
  });

  @override
  State<CreateTaskDialog> createState() => _CreateTaskDialogState();
}

class _CreateTaskDialogState extends State<CreateTaskDialog> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  String _type = 'TASK';
  String _priority = 'MEDIUM';
  String _status = 'TODO';
  String _assigneeId = '';
  DateTime? _dueDate;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ws = context.read<WorkspaceProvider>();

    final project = ws.currentWorkspace?.projects
        .where((p) => p.id == widget.projectId)
        .firstOrNull;
    final members = project?.members ?? [];

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      title: const Text('Create New Task'),
      content: SizedBox(
        width: 450,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _titleController,
                  decoration:
                      const InputDecoration(labelText: 'Title'),
                  validator: (v) =>
                      v?.isEmpty == true ? 'Required' : null,
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
                        value: _type,
                        decoration:
                            const InputDecoration(labelText: 'Type'),
                        items: const [
                          DropdownMenuItem(
                              value: 'TASK', child: Text('Task')),
                          DropdownMenuItem(
                              value: 'BUG', child: Text('Bug')),
                          DropdownMenuItem(
                              value: 'FEATURE', child: Text('Feature')),
                          DropdownMenuItem(
                              value: 'IMPROVEMENT',
                              child: Text('Improvement')),
                          DropdownMenuItem(
                              value: 'OTHER', child: Text('Other')),
                        ],
                        onChanged: (v) => setState(() => _type = v!),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _priority,
                        decoration:
                            const InputDecoration(labelText: 'Priority'),
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
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _assigneeId.isEmpty ? null : _assigneeId,
                        decoration: const InputDecoration(
                            labelText: 'Assignee'),
                        items: [
                          const DropdownMenuItem(
                              value: '', child: Text('Unassigned')),
                          ...members.map((m) => DropdownMenuItem(
                              value: m.userId,
                              child: Text(m.user?.name ?? 'Unknown'))),
                        ],
                        onChanged: (v) =>
                            setState(() => _assigneeId = v ?? ''),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _status,
                        decoration:
                            const InputDecoration(labelText: 'Status'),
                        items: const [
                          DropdownMenuItem(
                              value: 'TODO', child: Text('To Do')),
                          DropdownMenuItem(
                              value: 'IN_PROGRESS',
                              child: Text('In Progress')),
                          DropdownMenuItem(
                              value: 'DONE', child: Text('Done')),
                        ],
                        onChanged: (v) =>
                            setState(() => _status = v!),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: () async {
                    final d = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime(2030),
                    );
                    if (d != null) setState(() => _dueDate = d);
                  },
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Due Date',
                      prefixIcon: Icon(Icons.calendar_month, size: 18),
                    ),
                    child: Text(
                      _dueDate != null
                          ? '${_dueDate!.day}/${_dueDate!.month}/${_dueDate!.year}'
                          : 'Select date',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: widget.onClose,
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              ws.addTask(Task(
                id: 'task_${DateTime.now().millisecondsSinceEpoch}',
                projectId: widget.projectId,
                title: _titleController.text,
                description: _descController.text,
                type: _type,
                priority: _priority,
                status: _status,
                assigneeId: _assigneeId,
                dueDate: _dueDate ?? DateTime.now(),
              ));
              widget.onClose();
            }
          },
          child: const Text('Create Task'),
        ),
      ],
    );
  }
}
