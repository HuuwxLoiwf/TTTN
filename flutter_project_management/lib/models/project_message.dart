import 'user.dart';

class ProjectMessage {
  final String id;
  final String projectId;
  final String userId;
  final String content;
  final String? fileUrl;
  final String? fileName;
  final DateTime createdAt;
  final User? user;

  ProjectMessage({
    required this.id,
    required this.projectId,
    required this.userId,
    required this.content,
    this.fileUrl,
    this.fileName,
    required this.createdAt,
    this.user,
  });

  factory ProjectMessage.fromJson(Map<String, dynamic> json) => ProjectMessage(
        id: json['id'],
        projectId: json['projectId'],
        userId: json['userId'],
        content: json['content'] ?? '',
        fileUrl: json['fileUrl'],
        fileName: json['fileName'],
        createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
        user: json['user'] != null ? User.fromJson(json['user']) : null,
      );
}
