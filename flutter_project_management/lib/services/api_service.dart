import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/workspace.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../models/comment.dart';
import '../models/department.dart';
import '../models/subtask.dart';
import '../models/time_log.dart';
import '../models/project_message.dart';
import '../models/notification.dart';
import '../models/file_item.dart';
import '../models/audit_log.dart';

class ApiService {
  static const String _baseUrl = 'http://localhost:5000/api';

  String? _token;
  String? _currentUserId;

  String? get currentUserId => _currentUserId;

  void setToken(String? token) {
    _token = token;
    _currentUserId = _extractUserId(token);
  }

  // Giải mã 'sub' từ JWT (Clerk userId) mà không cần thư viện ngoài.
  String? _extractUserId(String? token) {
    if (token == null) return null;
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      var payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      while (payload.length % 4 != 0) {
        payload += '=';
      }
      final decoded = json.decode(utf8.decode(base64.decode(payload)));
      return decoded['sub'] as String?;
    } catch (_) {
      return null;
    }
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<List<Workspace>> getWorkspaces() async {
    final res = await http.get(Uri.parse('$_baseUrl/workspaces'), headers: _headers);
    if (res.statusCode == 200) {
      final list = json.decode(res.body) as List;
      return list.map((j) => Workspace.fromJson(j)).toList();
    }
    throw Exception('Failed to load workspaces: ${res.statusCode} ${res.body}');
  }

  Future<Workspace> getWorkspace(String id) async {
    final res = await http.get(Uri.parse('$_baseUrl/workspaces/$id'), headers: _headers);
    if (res.statusCode == 200) {
      return Workspace.fromJson(json.decode(res.body));
    }
    throw Exception('Failed to load workspace');
  }

  Future<Workspace> createWorkspace(Map<String, dynamic> data) async {
    final res = await http.post(Uri.parse('$_baseUrl/workspaces'),
        headers: _headers, body: json.encode(data));
    if (res.statusCode == 201) {
      return Workspace.fromJson(json.decode(res.body));
    }
    throw Exception('Failed to create workspace');
  }

  Future<Project> createProject(String workspaceId, Map<String, dynamic> data) async {
    final res = await http.post(
        Uri.parse('$_baseUrl/projects/workspace/$workspaceId'),
        headers: _headers,
        body: json.encode(data));
    if (res.statusCode == 201) {
      return Project.fromJson(json.decode(res.body));
    }
    throw Exception('Failed to create project');
  }

  Future<Project> updateProject(String id, Map<String, dynamic> data) async {
    final res = await http.put(Uri.parse('$_baseUrl/projects/$id'),
        headers: _headers, body: json.encode(data));
    if (res.statusCode == 200) {
      return Project.fromJson(json.decode(res.body));
    }
    throw Exception('Failed to update project');
  }

  Future<void> deleteProject(String id) async {
    final res = await http.delete(Uri.parse('$_baseUrl/projects/$id'), headers: _headers);
    if (res.statusCode != 200) throw Exception('Failed to delete project');
  }

  Future<Task> createTask(String projectId, Map<String, dynamic> data) async {
    final res = await http.post(
        Uri.parse('$_baseUrl/tasks/project/$projectId'),
        headers: _headers,
        body: json.encode(data));
    if (res.statusCode == 201) {
      return Task.fromJson(json.decode(res.body));
    }
    throw Exception('Failed to create task');
  }

  Future<Task> updateTask(String id, Map<String, dynamic> data) async {
    final res = await http.put(Uri.parse('$_baseUrl/tasks/$id'),
        headers: _headers, body: json.encode(data));
    if (res.statusCode == 200) {
      return Task.fromJson(json.decode(res.body));
    }
    throw Exception('Failed to update task');
  }

  Future<void> deleteTask(String id) async {
    final res = await http.delete(Uri.parse('$_baseUrl/tasks/$id'), headers: _headers);
    if (res.statusCode != 200) throw Exception('Failed to delete task');
  }

  Future<void> bulkDeleteTasks(List<String> ids) async {
    final res = await http.post(Uri.parse('$_baseUrl/tasks/bulk-delete'),
        headers: _headers, body: json.encode({'ids': ids}));
    if (res.statusCode != 200) throw Exception('Failed to delete tasks');
  }

  Future<List<Comment>> getComments(String taskId) async {
    final res =
        await http.get(Uri.parse('$_baseUrl/comments/task/$taskId'), headers: _headers);
    if (res.statusCode == 200) {
      final list = json.decode(res.body) as List;
      return list.map((j) => Comment.fromJson(j)).toList();
    }
    throw Exception('Failed to load comments');
  }

  Future<Comment> createComment(String taskId, String content) async {
    final res = await http.post(Uri.parse('$_baseUrl/comments/task/$taskId'),
        headers: _headers, body: json.encode({'content': content}));
    if (res.statusCode == 201) {
      return Comment.fromJson(json.decode(res.body));
    }
    throw Exception('Failed to create comment');
  }

  Future<void> inviteMember(String workspaceId, String email, {String role = 'MEMBER'}) async {
    final res = await http.post(
        Uri.parse('$_baseUrl/workspaces/$workspaceId/members'),
        headers: _headers,
        body: json.encode({'email': email, 'role': role}));
    if (res.statusCode != 201) throw Exception('Failed to invite member');
  }

  Future<void> addProjectMember(String projectId, String email) async {
    final res = await http.post(
        Uri.parse('$_baseUrl/projects/$projectId/members'),
        headers: _headers,
        body: json.encode({'email': email}));
    if (res.statusCode != 201) throw Exception('Failed to add member');
  }

  Future<void> updateMemberRole(String workspaceId, String memberId, String role) async {
    final res = await http.put(
        Uri.parse('$_baseUrl/workspaces/$workspaceId/members/$memberId'),
        headers: _headers,
        body: json.encode({'role': role}));
    if (res.statusCode != 200) throw Exception('Failed to update role');
  }

  Future<void> removeMember(String workspaceId, String memberId) async {
    final res = await http.delete(
        Uri.parse('$_baseUrl/workspaces/$workspaceId/members/$memberId'),
        headers: _headers);
    if (res.statusCode != 200) throw Exception('Failed to remove member');
  }

  // ===== Phòng ban =====
  Future<List<Department>> getDepartments(String workspaceId) async {
    final res = await http.get(Uri.parse('$_baseUrl/departments/workspace/$workspaceId'), headers: _headers);
    if (res.statusCode == 200) {
      return (json.decode(res.body) as List).map((j) => Department.fromJson(j)).toList();
    }
    throw Exception('Failed to load departments');
  }

  Future<Department> createDepartment(String workspaceId, String name) async {
    final res = await http.post(Uri.parse('$_baseUrl/departments/workspace/$workspaceId'),
        headers: _headers, body: json.encode({'name': name}));
    if (res.statusCode == 201) return Department.fromJson(json.decode(res.body));
    throw Exception('Failed to create department');
  }

  Future<void> deleteDepartment(String id) async {
    final res = await http.delete(Uri.parse('$_baseUrl/departments/$id'), headers: _headers);
    if (res.statusCode != 200) throw Exception('Failed to delete department');
  }

  // ===== Subtask =====
  Future<List<Subtask>> getSubtasks(String taskId) async {
    final res = await http.get(Uri.parse('$_baseUrl/subtasks/task/$taskId'), headers: _headers);
    if (res.statusCode == 200) {
      return (json.decode(res.body) as List).map((j) => Subtask.fromJson(j)).toList();
    }
    throw Exception('Failed to load subtasks');
  }

  Future<Subtask> createSubtask(String taskId, String title) async {
    final res = await http.post(Uri.parse('$_baseUrl/subtasks/task/$taskId'),
        headers: _headers, body: json.encode({'title': title}));
    if (res.statusCode == 201) return Subtask.fromJson(json.decode(res.body));
    throw Exception('Failed to create subtask');
  }

  Future<void> toggleSubtask(String id, bool done) async {
    final res = await http.put(Uri.parse('$_baseUrl/subtasks/$id'),
        headers: _headers, body: json.encode({'done': done}));
    if (res.statusCode != 200) throw Exception('Failed to update subtask');
  }

  Future<void> deleteSubtask(String id) async {
    final res = await http.delete(Uri.parse('$_baseUrl/subtasks/$id'), headers: _headers);
    if (res.statusCode != 200) throw Exception('Failed to delete subtask');
  }

  // ===== Time tracking =====
  Future<Map<String, dynamic>> getTimeLogs(String taskId) async {
    final res = await http.get(Uri.parse('$_baseUrl/time-logs/task/$taskId'), headers: _headers);
    if (res.statusCode == 200) {
      final data = json.decode(res.body);
      return {
        'logs': (data['logs'] as List).map((j) => TimeLog.fromJson(j)).toList(),
        'totalMinutes': data['totalMinutes'] ?? 0,
      };
    }
    throw Exception('Failed to load time logs');
  }

  Future<TimeLog> createTimeLog(String taskId, int minutes, String? note) async {
    final res = await http.post(Uri.parse('$_baseUrl/time-logs/task/$taskId'),
        headers: _headers, body: json.encode({'minutes': minutes, 'note': note}));
    if (res.statusCode == 201) return TimeLog.fromJson(json.decode(res.body));
    throw Exception('Failed to create time log');
  }

  // ===== Chat nhóm dự án =====
  Future<Map<String, dynamic>> getMessages(String projectId, {String? before}) async {
    final uri = Uri.parse('$_baseUrl/project-messages/project/$projectId${before != null ? '?before=$before' : ''}');
    final res = await http.get(uri, headers: _headers);
    if (res.statusCode == 200) {
      final data = json.decode(res.body);
      return {
        'messages': (data['messages'] as List).map((j) => ProjectMessage.fromJson(j)).toList(),
        'hasMore': data['hasMore'] ?? false,
      };
    }
    throw Exception('Failed to load messages');
  }

  Future<ProjectMessage> sendMessage(String projectId, String content) async {
    final res = await http.post(Uri.parse('$_baseUrl/project-messages/project/$projectId'),
        headers: _headers, body: json.encode({'content': content}));
    if (res.statusCode == 201) return ProjectMessage.fromJson(json.decode(res.body));
    throw Exception('Failed to send message');
  }

  // ===== Thông báo =====
  Future<List<AppNotification>> getNotifications() async {
    final res = await http.get(Uri.parse('$_baseUrl/notifications'), headers: _headers);
    if (res.statusCode == 200) {
      return (json.decode(res.body) as List).map((j) => AppNotification.fromJson(j)).toList();
    }
    throw Exception('Failed to load notifications');
  }

  Future<void> markAllNotificationsRead() async {
    await http.put(Uri.parse('$_baseUrl/notifications/read-all'), headers: _headers);
  }

  Future<void> checkDueTasks() async {
    await http.get(Uri.parse('$_baseUrl/notifications/check-due'), headers: _headers);
  }

  // ===== Tài liệu =====
  Future<List<FileItem>> getFiles(String projectId) async {
    final res = await http.get(Uri.parse('$_baseUrl/files?projectId=$projectId'), headers: _headers);
    if (res.statusCode == 200) {
      return (json.decode(res.body) as List).map((j) => FileItem.fromJson(j)).toList();
    }
    throw Exception('Failed to load files');
  }

  Future<void> reviewFile(String id, String reviewStatus, String? note) async {
    final res = await http.put(Uri.parse('$_baseUrl/files/$id/review'),
        headers: _headers, body: json.encode({'reviewStatus': reviewStatus, 'reviewNote': note}));
    if (res.statusCode != 200) throw Exception('Failed to review file');
  }

  Future<void> deleteFile(String id) async {
    final res = await http.delete(Uri.parse('$_baseUrl/files/$id'), headers: _headers);
    if (res.statusCode != 200) throw Exception('Failed to delete file');
  }

  // ===== AI =====
  Future<String> summarizeDiscussion(String projectId) async {
    final res = await http.get(Uri.parse('$_baseUrl/ai/summarize/$projectId'), headers: _headers);
    if (res.statusCode == 200) return json.decode(res.body)['summary'] ?? '';
    throw Exception(json.decode(res.body)['error'] ?? 'AI lỗi');
  }

  Future<String> analyzeProject(String projectId) async {
    final res = await http.get(Uri.parse('$_baseUrl/ai/analyze/$projectId'), headers: _headers);
    if (res.statusCode == 200) return json.decode(res.body)['analysis'] ?? '';
    throw Exception(json.decode(res.body)['error'] ?? 'AI lỗi');
  }

  // ===== Audit log =====
  Future<List<AuditLog>> getAuditLogs(String workspaceId) async {
    final res = await http.get(Uri.parse('$_baseUrl/activities/audit/$workspaceId'), headers: _headers);
    if (res.statusCode == 200) {
      return (json.decode(res.body) as List).map((j) => AuditLog.fromJson(j)).toList();
    }
    throw Exception('Failed to load audit logs');
  }
}

final apiService = ApiService();
