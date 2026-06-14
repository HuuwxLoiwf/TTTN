import 'project.dart';

class WorkspaceMember {
  final String id;
  final String userId;
  final String workspaceId;
  final String message;
  final String role;
  final dynamic user;

  WorkspaceMember({
    required this.id,
    required this.userId,
    required this.workspaceId,
    this.message = '',
    this.role = 'MEMBER',
    this.user,
  });

  factory WorkspaceMember.fromJson(Map<String, dynamic> json) {
    return WorkspaceMember(
      id: json['id'],
      userId: json['userId'],
      workspaceId: json['workspaceId'],
      message: json['message'] ?? '',
      role: json['role'] ?? 'MEMBER',
      user: json['user'],
    );
  }
}

class Workspace {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String ownerId;
  final String imageUrl;
  final List<WorkspaceMember> members;
  final List<Project> projects;

  Workspace({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    required this.ownerId,
    this.imageUrl = '',
    this.members = const [],
    this.projects = const [],
  });

  factory Workspace.fromJson(Map<String, dynamic> json) {
    return Workspace(
      id: json['id'],
      name: json['name'],
      slug: json['slug'],
      description: json['description'],
      ownerId: json['ownerId'],
      imageUrl: json['image_url'] ?? '',
      members: (json['members'] as List<dynamic>?)
              ?.map((m) => WorkspaceMember.fromJson(m))
              .toList() ??
          [],
      projects: (json['projects'] as List<dynamic>?)
              ?.map((p) => Project.fromJson(p))
              .toList() ??
          [],
    );
  }
}
