import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/project_message.dart';
import '../services/api_service.dart';

class ProjectChat extends StatefulWidget {
  final String projectId;
  const ProjectChat({super.key, required this.projectId});

  @override
  State<ProjectChat> createState() => _ProjectChatState();
}

class _ProjectChatState extends State<ProjectChat> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  List<ProjectMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _summary;
  bool _summarizing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await apiService.getMessages(widget.projectId);
      setState(() {
        _messages = data['messages'];
        _loading = false;
      });
      _scrollToBottom();
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      final msg = await apiService.sendMessage(widget.projectId, text);
      setState(() {
        _messages.add(msg);
        _controller.clear();
      });
      _scrollToBottom();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi: $e')));
    } finally {
      setState(() => _sending = false);
    }
  }

  Future<void> _summarize() async {
    setState(() => _summarizing = true);
    try {
      final s = await apiService.summarizeDiscussion(widget.projectId);
      setState(() => _summary = s);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('AI: $e')));
    } finally {
      setState(() => _summarizing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            const Icon(Icons.forum, size: 18, color: Colors.blue),
            const SizedBox(width: 8),
            const Text('Thảo luận nhóm', style: TextStyle(fontWeight: FontWeight.w600)),
            const Spacer(),
            TextButton.icon(
              onPressed: _summarizing ? null : _summarize,
              icon: const Icon(Icons.auto_awesome, size: 16),
              label: Text(_summarizing ? 'Đang tóm tắt...' : 'Tóm tắt AI'),
            ),
          ],
        ),
        if (_summary != null)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.purple.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.purple.withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Icon(Icons.auto_awesome, size: 14, color: Colors.purple),
                  const SizedBox(width: 4),
                  const Text('Tóm tắt AI', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.purple)),
                  const Spacer(),
                  GestureDetector(onTap: () => setState(() => _summary = null), child: const Text('Đóng', style: TextStyle(fontSize: 12))),
                ]),
                const SizedBox(height: 4),
                Text(_summary!),
              ],
            ),
          ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _messages.isEmpty
                  ? const Center(child: Text('Chưa có tin nhắn. Bắt đầu trò chuyện!'))
                  : ListView.builder(
                      controller: _scroll,
                      itemCount: _messages.length,
                      itemBuilder: (_, i) {
                        final m = _messages[i];
                        return Align(
                          alignment: Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.symmetric(vertical: 4),
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${m.user?.name ?? m.user?.email ?? "?"} · ${DateFormat('HH:mm').format(m.createdAt)}',
                                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                const SizedBox(height: 2),
                                if (m.content.isNotEmpty) Text(m.content),
                                if (m.fileUrl != null)
                                  Row(mainAxisSize: MainAxisSize.min, children: [
                                    const Icon(Icons.attach_file, size: 14, color: Colors.blue),
                                    Flexible(child: Text(m.fileName ?? 'Tệp', style: const TextStyle(color: Colors.blue))),
                                  ]),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                decoration: const InputDecoration(hintText: 'Nhập tin nhắn...', isDense: true, border: OutlineInputBorder()),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _sending ? null : _send,
              icon: const Icon(Icons.send),
              color: Colors.blue,
            ),
          ],
        ),
      ],
    );
  }
}
