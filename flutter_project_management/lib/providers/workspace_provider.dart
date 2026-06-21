import 'package:flutter/foundation.dart';
import '../models/workspace.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../models/comment.dart';
import '../services/api_service.dart';

class WorkspaceProvider extends ChangeNotifier {
  List<Workspace> _workspaces = [];
  Workspace? _currentWorkspace;
  bool _loading = false;
  List<Comment> _comments = [];

  List<Workspace> get workspaces => _workspaces;
  Workspace? get currentWorkspace => _currentWorkspace;
  bool get loading => _loading;
  List<Comment> get comments => _comments;

  Future<void> loadWorkspaces() async {
    _loading = true;
    notifyListeners();
    try {
      _workspaces = await apiService.getWorkspaces();
      if (_workspaces.isNotEmpty) {
        _currentWorkspace = _workspaces.first;
      }
    } catch (e) {
      debugPrint('loadWorkspaces error: $e');
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> setCurrentWorkspace(String id) async {
    try {
      _currentWorkspace = await apiService.getWorkspace(id);
      notifyListeners();
    } catch (e) {
      debugPrint('setCurrentWorkspace error: $e');
    }
  }

  Future<void> addProject(Project project, {String? departmentId}) async {
    try {
      final created = await apiService.createProject(
        _currentWorkspace!.id,
        {
          'name': project.name,
          'description': project.description,
          'priority': project.priority,
          'status': project.status,
          'start_date': project.startDate?.toIso8601String(),
          'end_date': project.endDate?.toIso8601String(),
          'departmentId': departmentId,
          'team_members': [],
        },
      );
      _currentWorkspace = Workspace(
        id: _currentWorkspace!.id,
        name: _currentWorkspace!.name,
        slug: _currentWorkspace!.slug,
        description: _currentWorkspace!.description,
        ownerId: _currentWorkspace!.ownerId,
        imageUrl: _currentWorkspace!.imageUrl,
        members: _currentWorkspace!.members,
        projects: [..._currentWorkspace!.projects, created],
      );
      notifyListeners();
    } catch (e) {
      debugPrint('addProject error: $e');
    }
  }

  Future<void> addTask(Task task) async {
    try {
      final created = await apiService.createTask(
        task.projectId,
        {
          'title': task.title,
          'description': task.description,
          'type': task.type,
          'priority': task.priority,
          'status': task.status,
          'assigneeId': task.assigneeId,
          'due_date': task.dueDate.toIso8601String(),
        },
      );
      _updateProjectTasks(task.projectId, (tasks) => [...tasks, created]);
      notifyListeners();
    } catch (e) {
      debugPrint('addTask error: $e');
    }
  }

  Future<void> updateTask(Task task) async {
    try {
      final updated = await apiService.updateTask(task.id, {
        'title': task.title,
        'description': task.description,
        'status': task.status,
        'type': task.type,
        'priority': task.priority,
        'assigneeId': task.assigneeId,
        'due_date': task.dueDate.toIso8601String(),
      });
      _updateProjectTasks(task.projectId, (tasks) =>
          tasks.map((t) => t.id == updated.id ? updated : t).toList());
      notifyListeners();
    } catch (e) {
      debugPrint('updateTask error: $e');
    }
  }

  Future<void> deleteTask(List<String> taskIds) async {
    if (taskIds.isEmpty) return;
    try {
      if (taskIds.length == 1) {
        await apiService.deleteTask(taskIds.first);
      } else {
        await apiService.bulkDeleteTasks(taskIds);
      }
      for (final p in _currentWorkspace!.projects) {
        final hasMatch = p.tasks.any((t) => taskIds.contains(t.id));
        if (hasMatch) {
          _updateProjectTasks(p.id,
              (tasks) => tasks.where((t) => !taskIds.contains(t.id)).toList());
        }
      }
      notifyListeners();
    } catch (e) {
      debugPrint('deleteTask error: $e');
    }
  }

  Future<void> loadComments(String taskId) async {
    try {
      _comments = await apiService.getComments(taskId);
      notifyListeners();
    } catch (e) {
      debugPrint('loadComments error: $e');
    }
  }

  Future<void> addComment(Comment comment) async {
    try {
      final created = await apiService.createComment(
        comment.taskId,
        comment.content,
      );
      _comments.insert(0, created);
      notifyListeners();
    } catch (e) {
      debugPrint('addComment error: $e');
    }
  }

  void _updateProjectTasks(
      String projectId, List<Task> Function(List<Task>) updater) {
    final updatedProjects = _currentWorkspace!.projects.map((p) {
      if (p.id == projectId) {
        return Project(
          id: p.id,
          name: p.name,
          description: p.description,
          priority: p.priority,
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate,
          teamLead: p.teamLead,
          workspaceId: p.workspaceId,
          progress: p.progress,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          members: p.members,
          tasks: updater(p.tasks),
          owner: p.owner,
        );
      }
      return p;
    }).toList();

    _currentWorkspace = Workspace(
      id: _currentWorkspace!.id,
      name: _currentWorkspace!.name,
      slug: _currentWorkspace!.slug,
      description: _currentWorkspace!.description,
      ownerId: _currentWorkspace!.ownerId,
      imageUrl: _currentWorkspace!.imageUrl,
      members: _currentWorkspace!.members,
      projects: updatedProjects,
    );
  }
}
