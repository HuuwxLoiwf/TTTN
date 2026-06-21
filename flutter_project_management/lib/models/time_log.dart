import 'user.dart';

class TimeLog {
  final String id;
  final String taskId;
  final String userId;
  final int minutes;
  final String? note;
  final DateTime workDate;
  final User? user;

  TimeLog({
    required this.id,
    required this.taskId,
    required this.userId,
    required this.minutes,
    this.note,
    required this.workDate,
    this.user,
  });

  factory TimeLog.fromJson(Map<String, dynamic> json) => TimeLog(
        id: json['id'],
        taskId: json['taskId'],
        userId: json['userId'],
        minutes: json['minutes'] ?? 0,
        note: json['note'],
        workDate: json['workDate'] != null ? DateTime.parse(json['workDate']) : DateTime.now(),
        user: json['user'] != null ? User.fromJson(json['user']) : null,
      );
}
