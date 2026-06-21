import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/audit_log.dart';
import '../providers/workspace_provider.dart';
import '../services/api_service.dart';

class AuditLogScreen extends StatefulWidget {
  const AuditLogScreen({super.key});

  @override
  State<AuditLogScreen> createState() => _AuditLogScreenState();
}

class _AuditLogScreenState extends State<AuditLogScreen> {
  List<AuditLog> _logs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final ws = context.read<WorkspaceProvider>().currentWorkspace;
    if (ws == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final logs = await apiService.getAuditLogs(ws.id);
      setState(() {
        _logs = logs;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  IconData _icon(String a) => a == 'CREATE'
      ? Icons.add_circle
      : a == 'DELETE'
          ? Icons.delete
          : Icons.edit;

  Color _color(String a) => a == 'CREATE'
      ? Colors.green
      : a == 'DELETE'
          ? Colors.red
          : Colors.blue;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nhật ký kiểm toán')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _logs.isEmpty
              ? const Center(child: Text('Chưa có bản ghi (hoặc bạn không phải quản trị viên)'))
              : ListView.builder(
                  itemCount: _logs.length,
                  itemBuilder: (_, i) {
                    final l = _logs[i];
                    return ListTile(
                      leading: Icon(_icon(l.action), color: _color(l.action)),
                      title: Text('${l.user?.name ?? l.user?.email ?? "?"} • ${l.entityName ?? l.entityType}'),
                      subtitle: Text(
                        '${l.action} ${l.entityType}'
                        '${l.changes != null && l.changes!.isNotEmpty ? "\n${l.changes!.entries.map((e) => "${e.key}: ${e.value['old']} → ${e.value['new']}").join(", ")}" : ""}',
                      ),
                      trailing: Text(DateFormat('dd/MM HH:mm').format(l.createdAt), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    );
                  },
                ),
    );
  }
}
