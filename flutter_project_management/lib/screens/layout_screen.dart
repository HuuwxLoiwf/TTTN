import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/workspace_provider.dart';
import '../widgets/sidebar.dart';
import '../widgets/navbar.dart';
import 'dashboard_screen.dart';
import 'projects_screen.dart';
import 'project_details_screen.dart';
import 'task_details_screen.dart';
import 'team_screen.dart';

class LayoutScreen extends StatefulWidget {
  const LayoutScreen({super.key});

  @override
  State<LayoutScreen> createState() => _LayoutScreenState();
}

class _LayoutScreenState extends State<LayoutScreen> {
  int _currentIndex = 0;
  bool _isSidebarOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WorkspaceProvider>().loadWorkspaces();
    });
  }

  final List<Widget> _screens = [
    const DashboardScreen(),
    const ProjectsScreen(),
    const TeamScreen(),
  ];

  void _navigateToPage(int index) {
    setState(() {
      _currentIndex = index;
      _isSidebarOpen = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final workspaceProvider = Provider.of<WorkspaceProvider>(context);

    if (workspaceProvider.loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                Navbar(
                  onMenuTap: () =>
                      setState(() => _isSidebarOpen = !_isSidebarOpen),
                  onSearch: (query) {},
                ),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      if (constraints.maxWidth >= 768) {
                        return Row(
                          children: [
                            SizedBox(
                              width: 260,
                              child: Sidebar(
                                isOpen: true,
                                onClose: () {},
                                currentIndex: _currentIndex,
                                onNavigate: _navigateToPage,
                                onProjectTap: _navigateToProjectDetails,
                                onTaskTap: _navigateToTaskDetails,
                              ),
                            ),
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: _screens[_currentIndex],
                              ),
                            ),
                          ],
                        );
                      }
                      return Padding(
                        padding: const EdgeInsets.all(16),
                        child: _screens[_currentIndex],
                      );
                    },
                  ),
                ),
              ],
            ),
            if (_isSidebarOpen)
              GestureDetector(
                onTap: () => setState(() => _isSidebarOpen = false),
                child: Container(color: Colors.black54),
              ),
            if (_isSidebarOpen)
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                child: Sidebar(
                  isOpen: _isSidebarOpen,
                  onClose: () => setState(() => _isSidebarOpen = false),
                  currentIndex: _currentIndex,
                  onNavigate: _navigateToPage,
                  onProjectTap: _navigateToProjectDetails,
                  onTaskTap: _navigateToTaskDetails,
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _navigateToProjectDetails(String projectId, {String tab = 'tasks'}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProjectDetailsScreen(
          projectId: projectId,
          initialTab: tab,
        ),
      ),
    );
  }

  void _navigateToTaskDetails(String projectId, String taskId) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TaskDetailsScreen(
          projectId: projectId,
          taskId: taskId,
        ),
      ),
    );
  }
}
