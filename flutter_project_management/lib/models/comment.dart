import 'user.dart';

class Comment {
  final String id;
  final String content;
  final String userId;
  final String taskId;
  final DateTime createdAt;
  final User? user;

  Comment({
    required this.id,
    required this.content,
    required this.userId,
    required this.taskId,
    DateTime? createdAt,
    this.user,
  }) : createdAt = createdAt ?? DateTime.now();

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'],
      content: json['content'],
      userId: json['userId'],
      taskId: json['taskId'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      user: json['user'] != null ? User.fromJson(json['user']) : null,
    );
  }
}
