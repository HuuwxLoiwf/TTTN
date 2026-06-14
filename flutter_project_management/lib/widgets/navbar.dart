import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';

class Navbar extends StatelessWidget {
  final VoidCallback onMenuTap;
  final void Function(String) onSearch;

  const Navbar({
    super.key,
    required this.onMenuTap,
    required this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 500;
        return Container(
          padding: EdgeInsets.symmetric(
            horizontal: isWide ? 24 : 12,
            vertical: 12,
          ),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF111113) : Colors.white,
            border: Border(
              bottom: BorderSide(
                color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB),
              ),
            ),
          ),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.menu),
                onPressed: onMenuTap,
                style: IconButton.styleFrom(
                  backgroundColor: isDark ? const Color(0xFF18181B) : Colors.grey.shade100,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              if (isWide) ...[
                const SizedBox(width: 16),
                Expanded(
                  child: TextField(
                    onChanged: onSearch,
                    decoration: InputDecoration(
                      hintText: 'Search projects, tasks...',
                      prefixIcon: const Icon(Icons.search, size: 16),
                      isDense: true,
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFD1D5DB),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 24),
              ],
              const Spacer(),
              IconButton(
                icon: Icon(
                  isDark ? Icons.light_mode : Icons.dark_mode,
                  color: isDark ? Colors.amber : Colors.grey,
                ),
                onPressed: () => themeProvider.toggleTheme(),
                style: IconButton.styleFrom(
                  backgroundColor: isDark ? const Color(0xFF18181B) : Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(
                      color: isDark ? const Color(0xFF27272A) : const Color(0xFFE5E7EB),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              CircleAvatar(
                radius: 16,
                backgroundColor: Colors.grey.shade300,
                child: const Icon(Icons.person, size: 18),
              ),
            ],
          ),
        );
      },
    );
  }
}
