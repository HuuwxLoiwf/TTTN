import 'user.dart';
import 'task.dart';

class ProjectMember {
  final String id;
  final String userId;
  final String projectId;
  final User? user;

  ProjectMember({
    required this.id,
    required this.userId,
    required this.projectId,
    this.user,
  });

  factory ProjectMember.fromJson(Map<String, dynamic> json) {
    return ProjectMember(
      id: json['id'],
      userId: json['userId'],
      projectId: json['projectId'],
      user: json['user'] != null ? User.fromJson(json['user']) : null,
    );
  }
}

class Project {
  final String id;
  final String name;
  final String? description;
  final String priority;
  final String status;
  final DateTime? startDate;
  final DateTime? endDate;
  final String teamLead;
  final String workspaceId;
  final int progress;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<ProjectMember> members;
  final List<Task> tasks;
  final User? owner;

  Project({
    required this.id,
    required this.name,
    this.description,
    this.priority = 'MEDIUM',
    this.status = 'ACTIVE',
    this.startDate,
    this.endDate,
    required this.teamLead,
    required this.workspaceId,
    this.progress = 0,
    DateTime? createdAt,
    DateTime? updatedAt,
    this.members = const [],
    this.tasks = const [],
    this.owner,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      priority: json['priority'] ?? 'MEDIUM',
      status: json['status'] ?? 'ACTIVE',
      startDate: json['start_date'] != null
          ? DateTime.parse(json['start_date'])
          : null,
      endDate:
          json['end_date'] != null ? DateTime.parse(json['end_date']) : null,
      teamLead: json['team_lead'],
      workspaceId: json['workspaceId'],
      progress: json['progress'] ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : DateTime.now(),
      members: (json['members'] as List<dynamic>?)
              ?.map((m) => ProjectMember.fromJson(m))
              .toList() ??
          [],
      tasks: (json['tasks'] as List<dynamic>?)
              ?.map((t) => Task.fromJson(t))
              .toList() ??
          [],
      owner:
          json['owner'] != null ? User.fromJson(json['owner']) : null,
    );
  }
}
