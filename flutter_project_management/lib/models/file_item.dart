import 'user.dart';

class FileItem {
  final String id;
  final String? projectId;
  final String? taskId;
  final String fileName;
  final String fileUrl;
  final String reviewStatus; // PENDING | APPROVED | REJECTED
  final String? reviewNote;
  final DateTime createdAt;
  final User? uploader;

  FileItem({
    required this.id,
    this.projectId,
    this.taskId,
    required this.fileName,
    required this.fileUrl,
    this.reviewStatus = 'PENDING',
    this.reviewNote,
    required this.createdAt,
    this.uploader,
  });

  factory FileItem.fromJson(Map<String, dynamic> json) => FileItem(
        id: json['id'],
        projectId: json['projectId'],
        taskId: json['taskId'],
        fileName: json['fileName'] ?? '',
        fileUrl: json['fileUrl'] ?? '',
        reviewStatus: json['reviewStatus'] ?? 'PENDING',
        reviewNote: json['reviewNote'],
        createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
        uploader: json['uploader'] != null ? User.fromJson(json['uploader']) : null,
      );
}
