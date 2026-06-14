import 'user.dart';

class Task {
  final String id;
  final String projectId;
  final String title;
  final String? description;
  final String status;
  final String type;
  final String priority;
  final String assigneeId;
  final DateTime dueDate;
  final DateTime createdAt;
  final DateTime updatedAt;
  final User? assignee;

  Task({
    required this.id,
    required this.projectId,
    required this.title,
    this.description,
    this.status = 'TODO',
    this.type = 'TASK',
    this.priority = 'MEDIUM',
    required this.assigneeId,
    required this.dueDate,
    DateTime? createdAt,
    DateTime? updatedAt,
    this.assignee,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'],
      projectId: json['projectId'],
      title: json['title'],
      description: json['description'],
      status: json['status'] ?? 'TODO',
      type: json['type'] ?? 'TASK',
      priority: json['priority'] ?? 'MEDIUM',
      assigneeId: json['assigneeId'],
      dueDate: DateTime.parse(json['due_date']),
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : DateTime.now(),
      assignee: json['assignee'] != null
          ? User.fromJson(json['assignee'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'projectId': projectId,
      'title': title,
      'description': description,
      'status': status,
      'type': type,
      'priority': priority,
      'assigneeId': assigneeId,
      'due_date': dueDate.toIso8601String(),
    };
  }
}
