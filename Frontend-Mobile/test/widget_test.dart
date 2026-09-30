import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:meeting_ai_mobile/main.dart';
import 'package:meeting_ai_mobile/providers/app_state.dart';
import 'package:meeting_ai_mobile/providers/auth_provider.dart';
import 'package:meeting_ai_mobile/providers/meeting_provider.dart';
import 'package:meeting_ai_mobile/providers/analytics_provider.dart';
import 'package:meeting_ai_mobile/providers/pv_provider.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame, wrapping it in MultiProvider just like in main.dart
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AppState()),
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => MeetingProvider()),
          ChangeNotifierProvider(create: (_) => AnalyticsProvider()),
          ChangeNotifierProvider(create: (_) => PVProvider()),
        ],
        child: const MeetingAIApp(),
      ),
    );
    // Basic verification that the app builds without crashing.
    expect(find.byType(MeetingAIApp), findsOneWidget);
  });
}
