import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/workspace_provider.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  String _searchTerm = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ws = context.watch<WorkspaceProvider>();
    final members = ws.currentWorkspace?.members ?? [];
    final projects = ws.currentWorkspace?.projects ?? [];
    final allTasks = projects.expand((p) => p.tasks).toList();

    final filtered =
        members.where((m) {
          final name =
              (m.user is Map ? (m.user as Map)['name'] : '') as String? ?? '';
          final email =
              (m.user is Map ? (m.user as Map)['email'] : '') as String? ?? '';
          return _searchTerm.isEmpty ||
              name.toLowerCase().contains(_searchTerm.toLowerCase()) ||
              email.toLowerCase().contains(_searchTerm.toLowerCase());
        }).toList();

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Team',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Manage team members and their contributions',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.textTheme.bodySmall?.color?.withValues(
                          alpha: 0.6,
                        ),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              FilledButton.icon(
                onPressed: () => _showInviteDialog(context),
                icon: const Icon(Icons.person_add, size: 16),
                label: const Text('Invite Member'),
                style: FilledButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _StatCard(
                icon: Icons.people,
                title: 'Total Members',
                value: '${members.length}',
                iconColor: Colors.blue,
              ),
              const SizedBox(width: 12),
              _StatCard(
                icon: Icons.trending_up,
                title: 'Active Projects',
                value:
                    '${projects.where((p) => p.status != 'CANCELLED' && p.status != 'COMPLETED').length}',
                iconColor: Colors.green,
              ),
              const SizedBox(width: 12),
              _StatCard(
                icon: Icons.shield,
                title: 'Total Tasks',
                value: '${allTasks.length}',
                iconColor: Colors.purple,
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: 400,
            child: TextField(
              onChanged: (v) => setState(() => _searchTerm = v),
              decoration: InputDecoration(
                hintText: 'Search team members...',
                prefixIcon: const Icon(Icons.search, size: 18),
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (filtered.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 64),
                child: Column(
                  children: [
                    Icon(
                      Icons.people_outline,
                      size: 64,
                      color: theme.textTheme.bodySmall?.color?.withValues(
                        alpha: 0.3,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      members.isEmpty
                          ? 'No team members yet'
                          : 'No members match your search',
                      style: theme.textTheme.titleMedium,
                    ),
                  ],
                ),
              ),
            )
          else
            ...filtered.map((m) {
              final name =
                  (m.user is Map ? (m.user as Map)['name'] : '') as String? ??
                  'Unknown';
              final email =
                  (m.user is Map ? (m.user as Map)['email'] : '') as String? ??
                  '';
              final role = m.role;
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.grey.shade300,
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  title: Text(name),
                  subtitle: Text(email),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color:
                          role == 'ADMIN'
                              ? Colors.purple.withValues(alpha: 0.1)
                              : Colors.grey.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      role,
                      style: TextStyle(
                        fontSize: 12,
                        color: role == 'ADMIN' ? Colors.purple : null,
                      ),
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  void _showInviteDialog(BuildContext context) {
    showDialog(
      context: context,
      builder:
          (_) => AlertDialog(
            title: const Text('Invite Member'),
            content: const TextField(
              decoration: InputDecoration(
                labelText: 'Email address',
                hintText: 'Enter email to invite',
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Send Invite'),
              ),
            ],
          ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final Color iconColor;

  const _StatCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF18181B) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.textTheme.bodySmall?.color?.withValues(
                      alpha: 0.6,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
          ],
        ),
      ),
    );
  }
}
