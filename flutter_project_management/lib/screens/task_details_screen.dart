import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../models/comment.dart';
import '../providers/workspace_provider.dart';

class TaskDetailsScreen extends StatefulWidget {
  final String projectId;
  final String taskId;

  const TaskDetailsScreen({
    super.key,
    required this.projectId,
    required this.taskId,
  });

  @override
  State<TaskDetailsScreen> createState() => _TaskDetailsScreenState();
}

class _TaskDetailsScreenState extends State<TaskDetailsScreen> {
  final _commentController = TextEditingController();
  final currentUserId = 'user_1';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WorkspaceProvider>().loadComments(widget.taskId);
    });
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ws = context.watch<WorkspaceProvider>();
    final isDark = theme.brightness == Brightness.dark;

    final project = ws.currentWorkspace?.projects
        .where((p) => p.id == widget.projectId)
        .firstOrNull;
    final task = project?.tasks
        .where((t) => t.id == widget.taskId)
        .firstOrNull;

    if (task == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Task not found')),
        body: const Center(child: Text('Task not found')),
      );
    }

    final comments = ws.comments;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Task Details'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 2,
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF18181B) : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: isDark
                          ? const Color(0xFF27272A)
                          : const Color(0xFFE5E7EB)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.forum, size: 20),
                        const SizedBox(width: 8),
                        Text('Task Discussion (${comments.length})',
                            style: theme.textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: comments.isEmpty
                          ? Center(
                              child: Text('No comments yet. Be the first!',
                                  style: theme.textTheme.bodySmall))
                          : ListView.builder(
                              itemCount: comments.length,
                              itemBuilder: (_, i) {
                                final c = comments[i];
                                final isMine = c.userId == currentUserId;
                                return Align(
                                  alignment: isMine
                                      ? Alignment.centerRight
                                      : Alignment.centerLeft,
                                  child: Container(
                                    constraints: BoxConstraints(
                                        maxWidth:
                                            MediaQuery.of(context).size.width *
                                                0.4),
                                    margin: const EdgeInsets.only(bottom: 12),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: isDark
                                          ? const Color(0xFF27272A)
                                          : Colors.grey.shade100,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                          color: isDark
                                              ? const Color(0xFF3F3F46)
                                              : const Color(0xFFE5E7EB)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            CircleAvatar(
                                              radius: 10,
                                              backgroundColor:
                                                  Colors.grey.shade400,
                                            ),
                                            const SizedBox(width: 6),
                                            Text(
                                                c.user?.name ?? 'Unknown',
                                                style: theme.textTheme.bodySmall
                                                    ?.copyWith(
                                                        fontWeight:
                                                            FontWeight.w600)),
                                            const SizedBox(width: 8),
                                            Text(
                                              DateFormat('dd MMM yyyy, HH:mm')
                                                  .format(c.createdAt),
                                              style: theme.textTheme.bodySmall
                                                  ?.copyWith(fontSize: 11),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(c.content),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _commentController,
                            decoration: const InputDecoration(
                              hintText: 'Write a comment...',
                              isDense: true,
                            ),
                            maxLines: 3,
                          ),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          onPressed: () {
                            final text = _commentController.text.trim();
                            if (text.isEmpty) return;
                            ws.addComment(Comment(
                              id: '',
                              content: text,
                              userId: currentUserId,
                              taskId: widget.taskId,
                            ));
                            _commentController.clear();
                          },
                          child: const Text('Post'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 24),
            Expanded(
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF18181B) : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: isDark
                              ? const Color(0xFF27272A)
                              : const Color(0xFFE5E7EB)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(task.title,
                            style: theme.textTheme.titleMedium),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: [
                            _TaskBadge(
                                label: task.status.replaceAll('_', ' '),
                                color: Colors.grey),
                            _TaskBadge(label: task.type, color: Colors.blue),
                            _TaskBadge(
                                label: task.priority, color: Colors.green),
                          ],
                        ),
                        if (task.description != null) ...[
                          const SizedBox(height: 12),
                          Text(task.description!,
                              style: theme.textTheme.bodySmall),
                        ],
                        const Divider(height: 24),
                        Row(
                          children: [
                            const Icon(Icons.person, size: 14),
                            const SizedBox(width: 6),
                            Text(task.assignee?.name ?? 'Unassigned'),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.calendar_today, size: 14),
                            const SizedBox(width: 6),
                            Text(DateFormat('dd MMM yyyy').format(task.dueDate)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (project != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF18181B) : Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: isDark
                                ? const Color(0xFF27272A)
                                : const Color(0xFFE5E7EB)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Project Details',
                              style: theme.textTheme.titleSmall),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.edit, size: 14),
                              const SizedBox(width: 4),
                              Text(project.name),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                              'Start: ${project.startDate != null ? DateFormat('dd MMM yyyy').format(project.startDate!) : 'N/A'}'),
                          const SizedBox(height: 4),
                          Text('Status: ${project.status.replaceAll('_', ' ')}  '
                              'Priority: ${project.priority}  '
                              'Progress: ${project.progress}%'),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskBadge extends StatelessWidget {
  final String label;
  final Color color;

  const _TaskBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(label,
          style: TextStyle(fontSize: 12, color: color)),
    );
  }
}
