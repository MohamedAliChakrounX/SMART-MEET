// PV Service for Summary and Action Items REST Endpoints

import '../config/api_config.dart';
import '../models/models.dart';
import 'api_client.dart';

class PVService {
  final ApiClient _apiClient;

  PVService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Fetches PV summary from GET /api/meetings/{id}/summary or /api/summaries/{id}
  /// Returns a map with 'hasSummary', 'summary', 'action_items', 'decisions', 'pvData'.
  Future<Map<String, dynamic>> fetchSummary(String meetingId) async {
    dynamic response;
    try {
      response = await _apiClient.get('/summaries/$meetingId');
    } catch (e) {
      // 404 = no summary generated yet
      return {'hasSummary': false};
    }

    if (response == null) return {'hasSummary': false};

    List<ActionItem> actionItems = [];
    String summaryText = '';
    List<String> decisions = [];
    Map<String, dynamic> pvData = {};

    if (response is Map<String, dynamic>) {
      pvData = response;

      final content = response['content'];
      if (content is String) {
        summaryText = content;
      } else if (content is Map<String, dynamic>) {
        summaryText = content['executiveOverview']?.toString() ??
            content['summary']?.toString() ??
            content['overview']?.toString() ?? '';

        final nextSteps = content['nextSteps'] ?? content['actionItems'] ?? content['action_items'];
        if (nextSteps is List) {
          actionItems = nextSteps
              .map((json) => ActionItem.fromJson(Map<String, dynamic>.from(json)))
              .toList();
        }

        final keyDecisions = content['keyDecisions'] ?? content['decisions'];
        if (keyDecisions is List) {
          decisions = keyDecisions.map((e) => e.toString()).toList();
        }
      } else {
        summaryText = response['summary']?.toString() ?? '';
      }

      if (actionItems.isEmpty) {
        final rawItems = response['action_items'] ?? response['actionItems'];
        if (rawItems is List) {
          actionItems = rawItems
              .map((json) => ActionItem.fromJson(Map<String, dynamic>.from(json)))
              .toList();
        }
      }

      if (decisions.isEmpty) {
        final rawDecisions = response['decisions'] ?? response['keyDecisions'];
        if (rawDecisions is List) {
          decisions = rawDecisions.map((e) => e.toString()).toList();
        }
      }
    }

    // Consider the summary valid if we got any content at all
    final hasSummary = summaryText.isNotEmpty || actionItems.isNotEmpty || pvData.isNotEmpty;

    return {
      'hasSummary': hasSummary,
      'summary': summaryText,
      'action_items': actionItems,
      'decisions': decisions,
      'pvData': pvData,
    };
  }

  /// Starts PV generation via POST /api/meetings/{id}/generate-summary with custom options
  Future<void> startGenerateSummary(
    String meetingId, {
    String language = 'default',
    String? model,
    String? format,
  }) async {
    await _apiClient.post(
      '/meetings/$meetingId/generate-summary',
      body: {
        'language': language,
        if (model != null) 'model': model,
        if (format != null) 'format': format,
      },
    );
  }

  /// Polls generation progress via GET /api/meetings/{id}/summary-status
  Future<Map<String, dynamic>> fetchSummaryStatus(String meetingId) async {
    final response = await _apiClient.get('/meetings/$meetingId/summary-status');
    if (response is Map<String, dynamic>) return response;
    return {'status': 'pending', 'progress': 0};
  }

  /// Updates action item status (PENDING → COMPLETED)
  Future<void> updateActionItemStatus(String actionItemId, String status) async {
    await _apiClient.put(
      '/action-items/$actionItemId',
      body: {'status': status},
    );
  }

  /// Updates the summary document on the backend (PUT /summaries/{meetingId})
  Future<Map<String, dynamic>> updateSummary(
    String meetingId, {
    required String summaryText,
    required List<ActionItem> actionItems,
    required List<String> decisions,
    String? title,
    String? date,
    String? startTime,
    String? endTime,
    String? location,
    String? facilitator,
  }) async {
    final nextSteps = actionItems.map((item) {
      return {
        'id': item.id,
        'action': item.task,
        'responsible': item.assignee,
        'dueDate': item.dueDate,
        'status': item.status,
      };
    }).toList();

    final body = {
      if (title != null) 'title': title,
      'content': {
        'executiveOverview': summaryText,
        'nextSteps': nextSteps,
        'keyDecisions': decisions,
        if (date != null) 'date': date,
        if (startTime != null) 'startTime': startTime,
        if (endTime != null) 'endTime': endTime,
        if (location != null) 'location': location,
        if (facilitator != null) 'facilitator': facilitator,
      }
    };

    final response = await _apiClient.put('/summaries/$meetingId', body: body);
    if (response is Map<String, dynamic>) return response;
    return {};
  }

  /// Returns downloadable PDF URL
  String getExportPdfUrl(String meetingId) {
    return '${ApiConfig.baseUrl}${ApiConfig.exportPdfEndpoint(meetingId)}';
  }
}
