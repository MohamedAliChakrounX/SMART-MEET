import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:meeting_ai_mobile/pages/admin/admin_dashboard_page.dart';
import 'package:meeting_ai_mobile/pages/auth/login_page.dart';
import 'package:meeting_ai_mobile/pages/archive_library/archive_library_page.dart';
import 'package:meeting_ai_mobile/pages/upload/upload_page.dart';
import 'package:meeting_ai_mobile/pages/transcription/transcription_page.dart';
import 'package:meeting_ai_mobile/pages/refine_summary/refine_summary_page.dart';
import 'package:meeting_ai_mobile/pages/overview/overview_page.dart';
import 'package:meeting_ai_mobile/pages/behavioral_analytics/behavioral_analytics_page.dart';
import 'package:meeting_ai_mobile/pages/settings/settings_page.dart';
import 'package:meeting_ai_mobile/pages/chatbot/chatbot_page.dart';
import 'package:meeting_ai_mobile/providers/auth_provider.dart';
import 'package:meeting_ai_mobile/widgets/scaffold_with_nav.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/archive',
  redirect: (BuildContext context, GoRouterState state) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final loggingIn = state.matchedLocation == '/login';

    if (authProvider.status == AuthStatus.uninitialized) {
      return null;
    }

    if (!authProvider.isAuthenticated && !loggingIn) {
      return '/login';
    }

    if (authProvider.isAuthenticated && loggingIn) {
      return '/archive';
    }

    return null;
  },
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginPage(),
    ),
    GoRoute(
      path: '/admin',
      builder: (context, state) => const AdminDashboardPage(),
    ),
    GoRoute(
      path: '/admin/organisation',
      builder: (context, state) => const AdminDashboardPage(initialIndex: 0),
    ),
    GoRoute(
      path: '/admin/users',
      builder: (context, state) => const AdminDashboardPage(initialIndex: 1),
    ),
    GoRoute(
      path: '/chatbot',
      builder: (context, state) => const ChatbotPage(),
    ),
    ShellRoute(
      builder: (context, state, child) => ScaffoldWithNav(child: child),
      routes: [
        GoRoute(
          path: '/archive',
          pageBuilder: (context, state) =>
              const NoTransitionPage(child: ArchiveLibraryPage()),
        ),
        GoRoute(
          path: '/upload',
          pageBuilder: (context, state) =>
              const NoTransitionPage(child: UploadPage()),
        ),
        GoRoute(
          path: '/analytics',
          pageBuilder: (context, state) =>
              const NoTransitionPage(child: BehavioralAnalyticsPage()),
        ),
        GoRoute(
          path: '/settings',
          pageBuilder: (context, state) =>
              const NoTransitionPage(child: SettingsPage()),
        ),
        GoRoute(
          path: '/transcription',
          pageBuilder: (context, state) =>
              const NoTransitionPage(child: TranscriptionPage()),
        ),
        GoRoute(
          path: '/summary',
          pageBuilder: (context, state) =>
              const NoTransitionPage(child: RefineSummaryPage()),
        ),
        GoRoute(
          path: '/overview',
          pageBuilder: (context, state) =>
              const NoTransitionPage(child: OverviewPage()),
        ),
      ],
    ),
  ],
  errorBuilder: (context, state) => const Scaffold(
    body: Center(child: Text('Page not found')),
  ),
);


