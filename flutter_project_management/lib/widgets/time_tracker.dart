import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/time_log.dart';
import '../services/api_service.dart';

String fmtDuration(int mins) {
  final h = mins ~/ 60;
  final m = mins % 60;
  if (h > 0 && m > 0) return '${h}h ${m}p';
  if (h > 0) return '${h}h';
  return '${m}p';
}

class TimeTracker extends StatefulWidget {
  final String taskId;
  const TimeTracker({super.key, required this.taskId});

  @override
  State<TimeTracker> createState() => _TimeTrackerState();
}

class _TimeTrackerState extends State<TimeTracker> {
  final _hours = TextEditingController();
  final _minutes = TextEditingController();
  final _note = TextEditingController();
  List<TimeLog> _logs = [];
  int _total = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await apiService.getTimeLogs(widget.taskId);
      setState(() {
        _logs = data['logs'];
        _total = data['totalMinutes'];
      });
    } catch (_) {}
  }

  Future<void> _add() async {
    final mins = (int.tryParse(_hours.text) ?? 0) * 60 + (int.tryParse(_minutes.text) ?? 0);
    if (mins <= 0) return;
    try {
      final log = await apiService.createTimeLog(widget.taskId, mins, _note.text.trim().isEmpty ? null : _note.text.trim());
      setState(() {
        _logs.insert(0, log);
        _total += mins;
        _hours.clear();
        _minutes.clear();
        _note.clear();
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.timer, size: 18),
              const SizedBox(width: 8),
              const Text('Thời gian làm việc', style: TextStyle(fontWeight: FontWeight.w600)),
              const Spacer(),
              Text(fmtDuration(_total), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              SizedBox(width: 60, child: TextField(controller: _hours, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Giờ', isDense: true))),
              const SizedBox(width: 8),
              SizedBox(width: 60, child: TextField(controller: _minutes, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Phút', isDense: true))),
              const SizedBox(width: 8),
              Expanded(child: TextField(controller: _note, decoration: const InputDecoration(hintText: 'Ghi chú', isDense: true))),
              IconButton(icon: const Icon(Icons.add), onPressed: _add),
            ]),
            const SizedBox(height: 4),
            ..._logs.map((l) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(children: [
                    Text(fmtDuration(l.minutes), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                    const SizedBox(width: 8),
                    Expanded(child: Text(l.user?.name ?? '', style: const TextStyle(fontSize: 12, color: Colors.grey))),
                    Text(DateFormat('dd/MM').format(l.workDate), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ]),
                )),
          ],
        ),
      ),
    );
  }
}
