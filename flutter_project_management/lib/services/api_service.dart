import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/workspace.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../models/comment.dart';

class ApiService {
  static const String _baseUrl = 'http://localhost:5000/api';

  String? _token;

  void setToken(String? token) {
    _token = token;
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
}

final apiService = ApiService();
