import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/admin_provider.dart';
import 'providers/app_state.dart';
import 'providers/auth_provider.dart';
import 'providers/meeting_provider.dart';
import 'providers/analytics_provider.dart';
import 'providers/pv_provider.dart';
import 'providers/notification_provider.dart';
import 'router.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AdminProvider()),
        ChangeNotifierProvider(create: (_) => MeetingProvider()),
        ChangeNotifierProvider(create: (_) => AnalyticsProvider()),
        ChangeNotifierProvider(create: (_) => PVProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: const MeetingAIApp(),
    ),
  );
}


class MeetingAIApp extends StatelessWidget {
  const MeetingAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    return MaterialApp.router(
      title: 'Meeting AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: appState.darkMode ? ThemeMode.dark : ThemeMode.light,
      routerConfig: appRouter,
    );
  }
}
