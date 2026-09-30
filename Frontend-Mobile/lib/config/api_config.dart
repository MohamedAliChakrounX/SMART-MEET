// API Environment & Configuration Constants for Meeting AI Mobile

import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  // Base host IP for local development on physical devices or emulators
  static const String _hostIp = String.fromEnvironment('HOST_IP', defaultValue: '192.168.100.16');
  static const String _defaultHostAndroid = 'http://$_hostIp:8000';
  static const String _defaultHostIosWeb = 'http://127.0.0.1:8000';

  // Flask AI server port (runs alongside Symfony)
  static const int _flaskPort = 5001;

  // ChatBot Flask microservice port
  static const int _chatbotPort = 5002;

  static String get baseUrl {
    if (kIsWeb) {
      return '$_defaultHostIosWeb/api/v1';
    }
    if (Platform.isAndroid) {
      return '$_defaultHostAndroid/api/v1';
    }
    return '$_defaultHostIosWeb/api/v1';
  }

  /// Base URL for the Flask AI server (port 5001)
  static String get flaskBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:$_flaskPort/api';
    }
    if (Platform.isAndroid) {
      return 'http://$_hostIp:$_flaskPort/api';
    }
    return 'http://localhost:$_flaskPort/api';
  }

  /// Base URL for the ChatBot Flask server (port 5002)
  static String get chatbotBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:$_chatbotPort/api';
    }
    if (Platform.isAndroid) {
      return 'http://$_hostIp:$_chatbotPort/api';
    }
    return 'http://localhost:$_chatbotPort/api';
  }

  // Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String profileEndpoint = '/auth/me';
  static const String meetingsEndpoint = '/meetings';
  static const String meetingUploadEndpoint = '/meetings/upload';
  static String meetingDetailEndpoint(String id) => '/meetings/$id';
  static String meetingTranscriptEndpoint(String id) => '/meetings/$id/transcript';
  static String meetingTranscribeEndpoint(String id) => '/meetings/$id/transcribe';
  static String meetingAnalyticsEndpoint(String id) => '/meetings/$id/analytics';
  static String meetingSummaryEndpoint(String id) => '/summaries/$id';
  /// Symfony export route: GET /api/v1/meetings/{meetingId}/export/{format}
  static String exportEndpoint(String meetingId, String format) => '/meetings/$meetingId/export/$format';
  // Keep legacy alias
  static String exportPdfEndpoint(String id) => exportEndpoint(id, 'pdf');

  // Organisation filter endpoints
  static const String departmentsEndpoint = '/admin/organisation/departments';
  static const String teamsEndpoint = '/admin/organisation/teams';
  static const String projectsEndpoint = '/admin/organisation/projects';

  // Request timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration uploadTimeout = Duration(minutes: 5);
}
