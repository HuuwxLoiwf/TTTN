import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/notification.dart';
import '../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      await apiService.checkDueTasks();
      final items = await apiService.getNotifications();
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _markAll() async {
    await apiService.markAllNotificationsRead();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo'),
        actions: [TextButton(onPressed: _markAll, child: const Text('Đọc tất cả'))],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('Chưa có thông báo'))
              : ListView.separated(
                  itemCount: _items.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final n = _items[i];
                    return ListTile(
                      leading: Icon(Icons.notifications, color: n.isRead ? Colors.grey : Colors.blue),
                      title: Text(n.title, style: TextStyle(fontWeight: n.isRead ? FontWeight.normal : FontWeight.w600)),
                      subtitle: Text(n.message),
                      trailing: Text(DateFormat('dd/MM HH:mm').format(n.createdAt), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      tileColor: n.isRead ? null : Colors.blue.withValues(alpha: 0.05),
                    );
                  },
                ),
    );
  }
}
