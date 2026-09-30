// Analytics Service for Symfony Meeting Analytics Endpoints

import '../config/api_config.dart';
import '../models/models.dart';
import 'api_client.dart';

class AnalyticsService {
  final ApiClient _apiClient;

  AnalyticsService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Fetches speaker analytics data from GET /api/v1/meetings/{id}/analytics
  Future<Map<String, dynamic>> fetchAnalytics(String meetingId) async {
    final response = await _apiClient.get(ApiConfig.meetingAnalyticsEndpoint(meetingId));

    List<TalkTimeEntry> talkTimeDistribution = [];
    List<SpeakerData> speakers = [];

    if (response is Map<String, dynamic>) {
      // 2. Parse speakers data
      dynamic rawSpeakers = response['speakers'];
      final otherMetrics = response['otherMetrics'] as Map<String, dynamic>?;
      final interpSpeakers = response['interpretation'] is Map<String, dynamic>
          ? (response['interpretation']['speakers'] as Map<String, dynamic>?)
          : null;

      // Adapter for flat Flask structures or missing 'speakers' key
      if (rawSpeakers == null || (rawSpeakers is List && rawSpeakers.isEmpty)) {
        final Map<String, dynamic> source = otherMetrics ?? response;
        final List<String> computedKeys = [];

        const metadataKeys = {
          'meetingId',
          'summaryMetrics',
          'talkTimeData',
          'radarData',
          'speakers',
          'interpretation',
          'ai_interpretation',
          'talk_time_distribution',
          'raw_response'
        };

        source.forEach((key, val) {
          if (!metadataKeys.contains(key) && val is Map) {
            computedKeys.add(key);
          }
        });

        if (computedKeys.isEmpty && interpSpeakers != null && interpSpeakers.isNotEmpty) {
          computedKeys.addAll(interpSpeakers.keys);
        }

        rawSpeakers = computedKeys;
      }

      if (rawSpeakers is List) {
        for (var item in rawSpeakers) {
          if (item is Map<String, dynamic>) {
            // Merge interpretation data for this speaker if available
            Map<String, dynamic> merged = Map<String, dynamic>.from(item);
            final speakerName = item['name'] ?? item['speaker'] ?? '';
            if (interpSpeakers != null && interpSpeakers.containsKey(speakerName)) {
              merged.addAll(Map<String, dynamic>.from(interpSpeakers[speakerName]));
            }
            speakers.add(SpeakerData.fromJson(merged));
          } else if (item is String) {
            final Map<String, dynamic> merged = {'name': item};
            
            // For Flask meetings, speaker metrics are directly at response[item]
            final speakerMetrics = (otherMetrics != null && otherMetrics.containsKey(item))
                ? otherMetrics[item]
                : response[item];

            if (speakerMetrics is Map) {
              merged.addAll(Map<String, dynamic>.from(speakerMetrics));
            }

            if (interpSpeakers != null && interpSpeakers.containsKey(item)) {
              merged.addAll(Map<String, dynamic>.from(interpSpeakers[item]));
            }
            speakers.add(SpeakerData.fromJson(merged));
          }
        }
      }

      // 1. Parse talk time distribution
      final rawTalkTime = response['talkTimeData'] ?? response['talk_time_distribution'];
      if (rawTalkTime is List && rawTalkTime.isNotEmpty) {
        talkTimeDistribution = rawTalkTime.map((json) {
          final map = Map<String, dynamic>.from(json);
          // Standardize 'speaker' to 'name' for TalkTimeEntry model compatibility
          if (map.containsKey('speaker') && !map.containsKey('name')) {
            map['name'] = map['speaker'];
          }
          return TalkTimeEntry.fromJson(map);
        }).toList();
      } else if (speakers.isNotEmpty) {
        // Fallback: Dynamically generate talk time entries from speakers list
        // low saturation colors matching UI design
        final colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
        for (var i = 0; i < speakers.length; i++) {
          final s = speakers[i];
          talkTimeDistribution.add(TalkTimeEntry(
            name: s.name,
            value: s.talkTime,
            color: colors[i % colors.length],
          ));
        }
      }
    }

    return {
      'talk_time_distribution': talkTimeDistribution,
      'speakers': speakers,
      'meeting_dynamics': response['interpretation'] is Map
          ? (response['interpretation']['meeting_dynamics'] ?? '')
          : '',
      'summary_metrics': response['summaryMetrics'] is Map
          ? Map<String, dynamic>.from(response['summaryMetrics'])
          : <String, dynamic>{},
      // Raw response forwarded to interpretation endpoint as-is
      'raw_response': response is Map<String, dynamic> ? response : <String, dynamic>{},
    };
  }

  /// Starts behavioral interpretation via POST /api/meetings/{id}/analytics/interpret
  /// Routes to Flask AI server (regardless of whether meetingId is UUID or numeric).
  Future<void> startInterpretation(String meetingId, Map<String, dynamic> analyticsPayload) async {
    await _apiClient.post(
      '/meetings/$meetingId/analytics/interpret',
      body: {'analytics_data': analyticsPayload},
    );
  }

  /// Polls interpretation status via GET /api/meetings/{id}/analytics/interpret
  Future<Map<String, dynamic>> fetchInterpretationStatus(String meetingId) async {
    final response = await _apiClient.get('/meetings/$meetingId/analytics/interpret');
    if (response is Map<String, dynamic>) return response;
    return {'status': 'pending'};
  }

  /// Saves interpretation result to Symfony DB via PUT /meetings/{id}/analytics/interpretation
  /// This persists the Flask AI result into the behavioral_interpretation table so that
  /// subsequent GET /analytics requests return it directly from Symfony (no re-generation needed).
  Future<void> saveInterpretationToSymfony(
      String meetingId, Map<String, dynamic> interpretation) async {
    try {
      await _apiClient.put(
        '/meetings/$meetingId/analytics/interpretation',
        body: {'interpretation': interpretation},
      );
    } catch (e) {
      // Non-fatal: if Symfony save fails, interpretation is still cached in Flask's JobStore
      // for this session. It will be re-generated on next cold start.
      // ignore: avoid_print
      print('[AnalyticsService] Failed to persist interpretation to Symfony: $e');
    }
  }
}
