import 'user.dart';

class AuditLog {
  final String id;
  final String action; // CREATE | UPDATE | DELETE
  final String entityType;
  final String? entityName;
  final Map<String, dynamic>? changes;
  final DateTime createdAt;
  final User? user;

  AuditLog({
    required this.id,
    required this.action,
    required this.entityType,
    this.entityName,
    this.changes,
    required this.createdAt,
    this.user,
  });

  factory AuditLog.fromJson(Map<String, dynamic> json) => AuditLog(
        id: json['id'],
        action: json['action'] ?? 'UPDATE',
        entityType: json['entityType'] ?? '',
        entityName: json['entityName'],
        changes: json['changes'] != null ? Map<String, dynamic>.from(json['changes']) : null,
        createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
        user: json['user'] != null ? User.fromJson(json['user']) : null,
      );
}
