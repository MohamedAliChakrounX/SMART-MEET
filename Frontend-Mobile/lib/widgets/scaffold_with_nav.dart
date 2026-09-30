import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../l10n/l10n.dart';
import '../theme/app_theme.dart';
import '../widgets/notification_banner.dart';

class ScaffoldWithNav extends StatelessWidget {
  final Widget child;
  const ScaffoldWithNav({super.key, required this.child});

  static const _tabs = [
    '/archive',
    '/upload',
    '/settings',
  ];

  int _locationIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith('/transcription') ||
        location.startsWith('/summary') ||
        location.startsWith('/overview')) {
      return 1; // Highlight Upload (Nouvelle) tab
    }
    final idx = _tabs.indexWhere((t) => location.startsWith(t));
    return idx < 0 ? 0 : idx;
  }

  @override
  Widget build(BuildContext context) {
    // Watch AppState so nav labels rebuild on language change
    context.watch<AppState>();
    final l = context.l10n;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final activeIndex = _locationIndex(context);

    final navItems = [
      _NavItemData(
        route: '/archive',
        label: l('nav_archive'),
        icon: Icons.inventory_2_outlined,
        activeIcon: Icons.inventory_2_rounded,
      ),
      _NavItemData(
        route: '/upload',
        label: l('nav_upload'),
        icon: Icons.note_add_outlined,
        activeIcon: Icons.note_add_rounded,
      ),
      _NavItemData(
        route: '/settings',
        label: l('nav_settings'),
        icon: Icons.settings_outlined,
        activeIcon: Icons.settings_rounded,
      ),
    ];

    return NotificationBannerWrapper(
      child: Scaffold(
        body: child,
        bottomNavigationBar: Padding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.of(context).padding.bottom + 10),
          child: _ModernFloatingBottomNav(
            isDark: isDark,
            items: navItems,
            activeIndex: activeIndex,
            onTabSelected: (index) {
              if (index >= 0 && index < _tabs.length) {
                context.go(_tabs[index]);
              }
            },
          ),
        ),
      ),
    );
  }
}

class _NavItemData {
  final String route;
  final String label;
  final IconData icon;
  final IconData activeIcon;

  const _NavItemData({
    required this.route,
    required this.label,
    required this.icon,
    required this.activeIcon,
  });
}

class _ModernFloatingBottomNav extends StatelessWidget {
  final bool isDark;
  final List<_NavItemData> items;
  final int activeIndex;
  final ValueChanged<int> onTabSelected;

  const _ModernFloatingBottomNav({
    required this.isDark,
    required this.items,
    required this.activeIndex,
    required this.onTabSelected,
  });

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(9999),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? Colors.black.withValues(alpha: 0.45)
                    : const Color(0xFF94A3B8).withValues(alpha: 0.35),
                blurRadius: 20,
                offset: const Offset(0, 8),
                spreadRadius: -2,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(9999),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
              child: Container(
                padding: const EdgeInsets.all(4.5),
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xFF0F172A).withValues(alpha: 0.88)
                      : Colors.white.withValues(alpha: 0.88),
                  borderRadius: BorderRadius.circular(9999),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.12)
                        : const Color(0xFFE2E8F0).withValues(alpha: 0.75),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.max,
                  children: List.generate(items.length, (index) {
                    final item = items[index];
                    final isActive = index == activeIndex;

                    return Expanded(
                      child: GestureDetector(
                        onTap: () => onTabSelected(index),
                        behavior: HitTestBehavior.opaque,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 280),
                          curve: Curves.easeOutCubic,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: isActive
                                ? AppTheme.primaryBlue
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(9999),
                            boxShadow: isActive
                                ? [
                                    BoxShadow(
                                      color: AppTheme.primaryBlue.withValues(alpha: 0.3),
                                      blurRadius: 10,
                                      offset: const Offset(0, 3),
                                    ),
                                  ]
                                : null,
                          ),
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  isActive ? item.activeIcon : item.icon,
                                  size: 18,
                                  color: isActive
                                      ? Colors.white
                                      : (isDark
                                          ? const Color(0xFF94A3B8)
                                          : const Color(0xFF64748B)),
                                ),
                                AnimatedSize(
                                  duration: const Duration(milliseconds: 250),
                                  curve: Curves.easeOutCubic,
                                  child: isActive
                                      ? Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const SizedBox(width: 5),
                                            Text(
                                              item.label,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: GoogleFonts.inter(
                                                fontSize: 12.0,
                                                fontWeight: FontWeight.w600,
                                                color: Colors.white,
                                                letterSpacing: 0.1,
                                              ),
                                            ),
                                          ],
                                        )
                                      : const SizedBox.shrink(),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ),
          ),
        ),
    );
  }
}

