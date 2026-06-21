class Subtask {
  final String id;
  final String taskId;
  final String title;
  final bool done;

  Subtask({required this.id, required this.taskId, required this.title, this.done = false});

  factory Subtask.fromJson(Map<String, dynamic> json) => Subtask(
        id: json['id'],
        taskId: json['taskId'],
        title: json['title'],
        done: json['done'] ?? false,
      );
}
