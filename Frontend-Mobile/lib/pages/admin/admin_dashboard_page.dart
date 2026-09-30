import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'admin_organisation_page.dart';
import 'admin_users_page.dart';
import '../../theme/app_theme.dart';

class AdminDashboardPage extends StatefulWidget {
  final int initialIndex;

  const AdminDashboardPage({super.key, this.initialIndex = 0});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialIndex,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.primaryBlue.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.admin_panel_settings, size: 18, color: AppTheme.primaryBlue),
            ),
            const SizedBox(width: 10),
            Text(
              'Portail Administrateur',
              style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 17),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
              borderRadius: BorderRadius.circular(12),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                color: isDark ? AppTheme.primaryBlue : Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: isDark ? Colors.white : AppTheme.primaryBlue,
              unselectedLabelColor: Colors.grey[500],
              labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700),
              unselectedLabelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500),
              dividerHeight: 0,
              tabs: const [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.apartment_rounded, size: 15),
                      SizedBox(width: 6),
                      Text('Organisation'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_alt_rounded, size: 15),
                      SizedBox(width: 6),
                      Text('Utilisateurs'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          AdminOrganisationPage(),
          AdminUsersPage(),
        ],
      ),
    );
  }
}
