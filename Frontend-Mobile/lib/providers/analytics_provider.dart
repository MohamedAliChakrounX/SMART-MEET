// AnalyticsProvider for Meeting Behavioral Analytics State

import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/analytics_service.dart';

class AnalyticsProvider extends ChangeNotifier {
  final AnalyticsService _analyticsService;

  List<TalkTimeEntry> _talkTimeDistribution = [];
  List<TalkTimeEntry> get talkTimeDistribution => _talkTimeDistribution;

  List<SpeakerData> _speakers = [];
  List<SpeakerData> get speakers => _speakers;

  String _meetingDynamics = '';
  String get meetingDynamics => _meetingDynamics;

  Map<String, dynamic> _summaryMetrics = {};
  Map<String, dynamic> get summaryMetrics => _summaryMetrics;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  // AI Interpretation fields
  bool _isInterpreting = false;
  bool get isInterpreting => _isInterpreting;

  String _interpretStep = 'Analyse comportementale en cours...';
  String get interpretStep => _interpretStep;

  String? _error;
  String? get error => _error;

  // Helper to check if interpretation already exists
  bool get hasInterpretation =>
      _meetingDynamics.isNotEmpty || _speakers.any((s) => s.profileSummary.isNotEmpty);

  // Raw fetched API response payload to send to the interpretation route
  Map<String, dynamic> _rawAnalyticsPayload = {};
  Map<String, dynamic>? get rawAnalyticsData => _rawAnalyticsPayload.isEmpty ? null : _rawAnalyticsPayload;

  AnalyticsProvider({AnalyticsService? analyticsService})
      : _analyticsService = analyticsService ?? AnalyticsService();

  /// Loads meeting analytics from Symfony REST API
  Future<void> loadAnalytics(String meetingId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _analyticsService.fetchAnalytics(meetingId);
      _rawAnalyticsPayload = (data['raw_response'] as Map<String, dynamic>?) ?? data;
      _talkTimeDistribution = data['talk_time_distribution'] as List<TalkTimeEntry>;
      _speakers = data['speakers'] as List<SpeakerData>;
      _meetingDynamics = (data['meeting_dynamics'] ?? '').toString();
      _summaryMetrics = (data['summary_metrics'] as Map<String, dynamic>?) ?? {};
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Triggers AI behavioral interpretation (POST /meetings/{id}/analytics/interpret)
  Future<void> startInterpretationJob(String meetingId) async {
    if (meetingId.isEmpty) return;
    _isInterpreting = true;
    _interpretStep = 'Initialisation de l\'interprétation...';
    _error = null;
    notifyListeners();

    try {
      await _analyticsService.startInterpretation(meetingId, _rawAnalyticsPayload);
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      _isInterpreting = false;
      notifyListeners();
    }
  }

  /// Polls the AI interpretation progress (GET /meetings/{id}/analytics/interpret)
  /// Returns true if finished, false if pending.
  Future<bool> pollInterpretationJob(String meetingId) async {
    try {
      final statusData = await _analyticsService.fetchInterpretationStatus(meetingId);
      final status = statusData['status']?.toString().toLowerCase() ?? 'pending';

      if (status == 'done') {
        _isInterpreting = false;
        // ── Persist to Symfony so it survives Flask restarts ──────────────────
        // This means future page loads will get interpretation from Symfony's DB
        // via GET /analytics, and hasInterpretation will be true → no re-generation.
        final result = statusData['result'];
        if (result is Map<String, dynamic>) {
          await _analyticsService.saveInterpretationToSymfony(meetingId, result);
        }
        // Reload all metrics & interpretation data
        await loadAnalytics(meetingId);
        return true;
      } else if (status == 'error') {
        _error = statusData['error']?.toString() ?? 'L\'analyse comportementale a échoué.';
        _isInterpreting = false;
        notifyListeners();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Cancels active interpretation state
  void cancelInterpretation() {
    _isInterpreting = false;
    notifyListeners();
  }
}
