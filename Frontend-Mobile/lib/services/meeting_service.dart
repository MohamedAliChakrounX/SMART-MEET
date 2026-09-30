// Meeting Service for Symfony REST API Endpoints

import '../config/api_config.dart';
import '../models/models.dart';
import 'api_client.dart';

class MeetingService {
  final ApiClient _apiClient;

  MeetingService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Fetches real meeting list from GET /api/v1/meetings
  Future<List<Meeting>> fetchMeetings({
    String? search,
    String? category,
    String? departmentId,
    String? teamId,
    String? projectId,
  }) async {
    final queryParams = <String, String>{};
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (category != null && category.isNotEmpty) queryParams['category'] = category;
    if (departmentId != null && departmentId.isNotEmpty) queryParams['departmentId'] = departmentId;
    if (teamId != null && teamId.isNotEmpty) queryParams['teamId'] = teamId;
    if (projectId != null && projectId.isNotEmpty) queryParams['projectId'] = projectId;

    final response = await _apiClient.get(
      ApiConfig.meetingsEndpoint,
      queryParams: queryParams.isNotEmpty ? queryParams : null,
    );

    List<dynamic> items = [];
    if (response is Map<String, dynamic>) {
      if (response.containsKey('data')) {
        items = response['data'] as List<dynamic>;
      } else if (response.containsKey('items')) {
        items = response['items'] as List<dynamic>;
      }
    } else if (response is List) {
      items = response;
    }

    return items.map((json) => Meeting.fromJson(Map<String, dynamic>.from(json))).toList();
  }

  /// Fetches all departments from GET /api/v1/admin/organisation/departments
  Future<List<OrgItem>> fetchDepartments() async {
    try {
      final response = await _apiClient.get(ApiConfig.departmentsEndpoint);
      final items = response is List ? response : (response is Map && response['data'] is List ? response['data'] : []);
      return (items as List).map((j) => OrgItem.fromJson(Map<String, dynamic>.from(j))).toList();
    } catch (_) {
      return [];
    }
  }

  /// Fetches all teams from GET /api/v1/admin/organisation/teams
  Future<List<OrgItem>> fetchTeams() async {
    try {
      final response = await _apiClient.get(ApiConfig.teamsEndpoint);
      final items = response is List ? response : (response is Map && response['data'] is List ? response['data'] : []);
      return (items as List).map((j) => OrgItem.fromJson(Map<String, dynamic>.from(j))).toList();
    } catch (_) {
      return [];
    }
  }

  /// Fetches all projects from GET /api/v1/admin/organisation/projects
  Future<List<OrgItem>> fetchProjects() async {
    try {
      final response = await _apiClient.get(ApiConfig.projectsEndpoint);
      final items = response is List ? response : (response is Map && response['data'] is List ? response['data'] : []);
      return (items as List).map((j) => OrgItem.fromJson(Map<String, dynamic>.from(j))).toList();
    } catch (_) {
      return [];
    }
  }

  /// Fetches meeting details from GET /api/v1/meetings/{id}
  Future<MeetingDetail> fetchMeetingDetail(String id) async {
    final response = await _apiClient.get(ApiConfig.meetingDetailEndpoint(id));
    if (response is Map<String, dynamic>) {
      return MeetingDetail.fromJson(response);
    }
    throw Exception('Failed to parse meeting detail');
  }

  /// Fetches transcript segments from GET /api/v1/meetings/{id}/transcript
  Future<List<TranscriptSegment>> fetchTranscript(String id) async {
    final response = await _apiClient.get(ApiConfig.meetingTranscriptEndpoint(id));

    List<dynamic> segments = [];
    if (response is Map<String, dynamic> && response.containsKey('segments')) {
      segments = response['segments'] as List<dynamic>;
    } else if (response is List) {
      segments = response;
    }

    return segments
        .map((json) => TranscriptSegment.fromJson(Map<String, dynamic>.from(json)))
        .toList();
  }

  /// Uploads audio recording via multipart to POST /api/v1/meetings/{id}/transcribe
  Future<Map<String, dynamic>> uploadAudio(String meetingId, String filePath) async {
    final response = await _apiClient.multipartUpload(
      ApiConfig.meetingTranscribeEndpoint(meetingId),
      filePath: filePath,
      fileField: 'file',
    );

    if (response is Map<String, dynamic>) {
      return response;
    }
    return {'status': 'ACCEPTED'};
  }

  /// Uploads a new meeting audio directly to POST /api/v1/meetings/upload
  Future<Map<String, dynamic>> uploadNewMeeting({
    required String filePath,
    required String fileName,
    String? projectId,
    String? title,
  }) async {
    final extraFields = <String, String>{};
    if (title != null && title.isNotEmpty) extraFields['title'] = title;
    if (projectId != null && projectId.isNotEmpty) extraFields['projectId'] = projectId;

    final response = await _apiClient.multipartUpload(
      ApiConfig.meetingUploadEndpoint,
      filePath: filePath,
      fileField: 'audio',
      fields: extraFields.isNotEmpty ? extraFields : null,
    );

    if (response is Map<String, dynamic>) {
      return response;
    }
    return {};
  }

  /// Fetches transcription status from Flask AI Server (GET /api/meetings/{id}/status)
  Future<Map<String, dynamic>> fetchTranscriptionStatus(String id) async {
    final response = await _apiClient.get('/meetings/$id/status');
    if (response is Map<String, dynamic>) {
      return response;
    }
    return {'status': 'pending', 'progress': 0};
  }

  /// Saves edited transcript to Flask AI Server (PUT /api/meetings/{id}/transcript)
  Future<void> updateTranscript(String id, List<TranscriptSegment> segments) async {
    final body = segments.map((s) => s.toJson()).toList();
    await _apiClient.put('/meetings/$id/transcript', body: body);
  }

  /// Translates transcript segments via POST /api/meetings/{id}/transcript/translate
  Future<List<TranscriptSegment>> translateTranscript(String meetingId, String targetLanguage, {List<TranscriptSegment>? segments}) async {
    final body = <String, dynamic>{
      'target_language': targetLanguage,
    };
    if (segments != null) {
      body['segments'] = segments.map((s) => s.toJson()).toList();
    }
    
    final response = await _apiClient.post(
      '/meetings/$meetingId/transcript/translate',
      body: body,
      timeout: const Duration(minutes: 3),
    );
    
    if (response is Map<String, dynamic> && response['segments'] is List) {
      final List raw = response['segments'];
      return raw.map((json) => TranscriptSegment.fromJson(Map<String, dynamic>.from(json))).toList();
    }
    return [];
  }

  /// Cancels/deletes the meeting or active job on the Flask AI Server
  Future<void> cancelMeeting(String id) async {
    await _apiClient.delete('/meetings/$id');
  }

  /// Deletes a meeting permanently from Symfony database (DELETE /api/v1/meetings/{id})
  Future<void> deleteMeeting(String id) async {
    await _apiClient.delete(ApiConfig.meetingDetailEndpoint(id));
  }

  /// Persists meeting data to Symfony database (POST /meetings/persist-ai-result)
  Future<Map<String, dynamic>> persistMeetingToSymfony(Map<String, dynamic> payload) async {
    final response = await _apiClient.post('/meetings/persist-ai-result', body: payload);
    if (response is Map<String, dynamic>) {
      return response;
    }
    throw Exception('Failed to persist meeting');
  }

  /// Renames a meeting ID on the Flask server
  Future<void> renameMeetingOnFlask(String oldId, String newUuid) async {
    await _apiClient.post('/meetings/$oldId/rename', body: {'new_id': newUuid});
  }
}
