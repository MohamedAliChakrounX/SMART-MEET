// MeetingProvider for Flutter Meeting State Management

import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/meeting_service.dart';
import '../services/temporary_meeting_storage.dart';

class MeetingProvider extends ChangeNotifier {
  final MeetingService _meetingService;

  List<Meeting> _meetings = [];
  List<Meeting> get meetings => _meetings;

  MeetingDetail? _selectedMeetingDetail;
  MeetingDetail? get selectedMeetingDetail => _selectedMeetingDetail;

  List<TranscriptSegment> _currentTranscript = [];
  List<TranscriptSegment> get currentTranscript => _currentTranscript;

  // Organisation lists (departments / teams / projects)
  List<OrgItem> _departments = [];
  List<OrgItem> get departments => _departments;

  List<OrgItem> _teams = [];
  List<OrgItem> get teams => _teams;

  List<OrgItem> _projects = [];
  List<OrgItem> get projects => _projects;

  bool _orgLoading = false;
  bool get orgLoading => _orgLoading;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isUploading = false;
  bool get isUploading => _isUploading;

  String? _error;
  String? get error => _error;

  String? _activeMeetingId;
  String? get activeMeetingId => _activeMeetingId;

  final Map<String, String> _meetingProjects = {};

  MeetingProvider({MeetingService? meetingService})
      : _meetingService = meetingService ?? MeetingService();

  /// Loads meeting list from Symfony REST API with optional organisation filters
  Future<void> loadMeetings({
    String? search,
    String? category,
    String? departmentId,
    String? teamId,
    String? projectId,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final synced = await _meetingService.fetchMeetings(
        search: search,
        category: category,
        departmentId: departmentId,
        teamId: teamId,
        projectId: projectId,
      );

      // Re-inject any Flask placeholder meetings (numeric 9-digit IDs) that are
      // not yet known to Symfony so they don't disappear on list refresh.
      final tempStorage = TemporaryMeetingStorage();
      final tempMeetings = await tempStorage.getMeetings();

      final flaskIds = RegExp(r'^\d{9}$');
      final combinedTemps = [
        ..._meetings.where((m) => flaskIds.hasMatch(m.id)),
        ...tempMeetings,
      ];
      final uniqueTemps = <String, Meeting>{};
      for (final m in combinedTemps) {
        uniqueTemps[m.id] = m;
      }

      final placeholders = uniqueTemps.values
          .where((m) => !synced.any((s) => s.id == m.id))
          .toList();

      _meetings = [...placeholders, ...synced];

      // Restore project mappings
      final projMap = await tempStorage.getMeetingProjects();
      _meetingProjects.addAll(projMap);
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetches departments, teams and projects from the organisation API
  Future<void> loadOrgFilters() async {
    if (_departments.isNotEmpty) return; // already loaded
    _orgLoading = true;
    notifyListeners();

    try {
      final results = await Future.wait([
        _meetingService.fetchDepartments(),
        _meetingService.fetchTeams(),
        _meetingService.fetchProjects(),
      ]);
      _departments = results[0];
      _teams = results[1];
      _projects = results[2];
    } catch (_) {
      // Silently ignore – filters remain empty
    } finally {
      _orgLoading = false;
      notifyListeners();
    }
  }

  void setActiveMeetingId(String? id) {
    _activeMeetingId = id;
    notifyListeners();
  }

  /// Selects active meeting and loads its details & transcript
  Future<void> selectMeeting(String meetingId) async {
    _activeMeetingId = meetingId;
    _isLoading = true;
    _error = null;
    notifyListeners();

    final isUuid = RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      caseSensitive: false,
    ).hasMatch(meetingId);

    try {
      if (isUuid) {
        _selectedMeetingDetail = await _meetingService.fetchMeetingDetail(meetingId);
        _currentTranscript = await _meetingService.fetchTranscript(meetingId);
      } else {
        // Flask temporary meeting (not yet in Symfony DB)
        _selectedMeetingDetail = null;
        try {
          _currentTranscript = await _meetingService.fetchTranscript(meetingId);
        } catch (_) {
          _currentTranscript = [];
        }
      }
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Deletes a meeting permanently via DELETE /api/v1/meetings/{id} on Symfony.
  /// For temporary Flask placeholders, removes directly from local storage.
  Future<bool> deleteMeeting(String meetingId) async {
    // Optimistic local removal
    final previousList = List<Meeting>.from(_meetings);
    _meetings = _meetings.where((m) => m.id != meetingId).toList();
    notifyListeners();

    final isUuid = RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      caseSensitive: false,
    ).hasMatch(meetingId);

    try {
      if (isUuid) {
        await _meetingService.deleteMeeting(meetingId);
      }

      // Also remove from Flask temp storage if it was a placeholder
      final tempStorage = TemporaryMeetingStorage();
      await tempStorage.removeMeeting(meetingId);

      // Clear selected meeting if it was the deleted one
      if (_activeMeetingId == meetingId) {
        _activeMeetingId = null;
        _selectedMeetingDetail = null;
        _currentTranscript = [];
      }

      // Sync list in background (no spinner)
      await loadMeetings();
      return true;
    } catch (e) {
      // Rollback on failure
      _meetings = previousList;
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  /// Uploads audio recording for an existing meeting
  Future<bool> uploadAudio(String meetingId, String filePath) async {
    _isUploading = true;
    _error = null;
    notifyListeners();

    try {
      await _meetingService.uploadAudio(meetingId, filePath);
      await loadMeetings(); // refresh list
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      return false;
    } finally {
      _isUploading = false;
      notifyListeners();
    }
  }

  /// Uploads a brand-new meeting audio (POST /api/v1/meetings/upload)
  Future<String?> uploadNewMeeting({
    required String filePath,
    required String fileName,
    String? title,
    String? projectId,
  }) async {
    _isUploading = true;
    _error = null;
    notifyListeners();

    // Derive a clean title: user-supplied > filename without extension
    final effectiveTitle = (title != null && title.isNotEmpty)
        ? title
        : fileName.replaceAll(RegExp(r'\.[^.]+$'), '');

    try {
      final result = await _meetingService.uploadNewMeeting(
        filePath: filePath,
        fileName: fileName,
        projectId: projectId,
        title: effectiveTitle,
      );
      final meetingId = result['meetingId']?.toString();
      // Use the title we sent (Flask may echo it back or not)
      final resolvedTitle = result['title']?.toString() ?? effectiveTitle;

      if (meetingId != null) {
        _activeMeetingId = meetingId;
        final tempStorage = TemporaryMeetingStorage();
        if (projectId != null) {
          _meetingProjects[meetingId] = projectId;
          final currentMap = await tempStorage.getMeetingProjects();
          currentMap[meetingId] = projectId;
          await tempStorage.saveMeetingProjects(currentMap);
        }

        final projName = projectId != null
            ? _projects.firstWhere((p) => p.id == projectId, orElse: () => const OrgItem(id: '', name: 'General')).name
            : 'General';

        // ── Inject a local placeholder so it appears in the archive immediately ──
        // Flask meetings are not in the Symfony DB, so loadMeetings() won't find
        // them. We prepend a synthetic Meeting so the UI shows it right away.
        final placeholder = Meeting(
          id: meetingId,
          title: resolvedTitle,
          category: projName,
          date: DateTime.now().toIso8601String(),
          duration: '—',
          description: 'Transcription en cours...',
          participants: const [],
          starred: false,
          status: 'processing',
        );

        // Save to secure storage
        await tempStorage.addMeeting(placeholder);

        // Remove any existing placeholder for the same ID, then prepend
        _meetings = [
          placeholder,
          ..._meetings.where((m) => m.id != meetingId),
        ];
        notifyListeners();

        // Refresh in background to get real Symfony data (if it gets synced)
        loadMeetings();
      }
      return meetingId;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      return null;
    } finally {
      _isUploading = false;
      notifyListeners();
    }
  }


  /// Manually loads / refreshes the transcript for the given meeting ID
  Future<void> loadTranscript(String meetingId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentTranscript = await _meetingService.fetchTranscript(meetingId);
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Locally updates the transcript segments list (e.g. when changing speaker names)
  void updateLocalTranscript(List<TranscriptSegment> updated) {
    _currentTranscript = updated;
    notifyListeners();
  }

  /// Saves the current transcript to the Flask AI server
  Future<bool> saveTranscriptToServer() async {
    if (_activeMeetingId == null) return false;
    _isLoading = true;
    notifyListeners();

    try {
      await _meetingService.updateTranscript(_activeMeetingId!, _currentTranscript);
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  bool _isTranslating = false;
  bool get isTranslating => _isTranslating;

  /// Translates the current transcript using the AI translation service
  Future<bool> translateCurrentTranscript(String targetLanguage) async {
    if (_activeMeetingId == null) return false;
    _isTranslating = true;
    _error = null;
    notifyListeners();

    try {
      final translated = await _meetingService.translateTranscript(
        _activeMeetingId!,
        targetLanguage,
        segments: _currentTranscript,
      );
      if (translated.isNotEmpty) {
        _currentTranscript = translated;
        _error = null;
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      return false;
    } finally {
      _isTranslating = false;
      notifyListeners();
    }
  }

  /// Cancels processing of the active meeting on the Flask AI Server
  Future<void> cancelActiveMeeting() async {
    if (_activeMeetingId == null) return;
    _isLoading = true;
    notifyListeners();

    try {
      await _meetingService.cancelMeeting(_activeMeetingId!);
      // Also remove it from local placeholder list if present
      _meetings = _meetings.where((m) => m.id != _activeMeetingId).toList();
      _activeMeetingId = null;
      _selectedMeetingDetail = null;
      _currentTranscript = [];
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetches transcription status from Flask AI Server (GET /api/meetings/{id}/status)
  Future<Map<String, dynamic>> getTranscriptionStatus(String id) async {
    try {
      return await _meetingService.fetchTranscriptionStatus(id);
    } catch (_) {
      return {'status': 'error', 'errorMessage': 'Failed to reach AI server'};
    }
  }

  /// Persists a newly completed Flask meeting to the Symfony database.
  /// Converts the active meeting from a temporary numeric ID to a Symfony UUID.
  Future<String?> persistActiveMeetingToSymfony({
    required String title,
    required String date,
    required String summaryText,
    required List<String> decisions,
    required List<ActionItem> actionItems,
    required dynamic pvData,
    required Map<String, dynamic> analytics,
    List<String>? participants,
  }) async {
    if (_activeMeetingId == null) return null;
    
    // Check if the current ID is already a UUID (already persisted)
    final uuidRegex = RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', caseSensitive: false);
    if (uuidRegex.hasMatch(_activeMeetingId!)) {
      return _activeMeetingId;
    }

    final projectId = _meetingProjects[_activeMeetingId];

    final effectiveParticipants = (participants != null && participants.isNotEmpty)
        ? participants
        : (_selectedMeetingDetail?.participants.isNotEmpty == true
            ? _selectedMeetingDetail!.participants
            : _currentTranscript
                .map((s) => s.speaker.trim())
                .where((s) => s.isNotEmpty)
                .toSet()
                .toList());

    int calculatedMinutes = 0;
    if (_currentTranscript.isNotEmpty) {
      int maxSec = 0;
      for (final seg in _currentTranscript) {
        int endSec = 0;
        final rawEnd = seg.timeEnd.trim();
        if (rawEnd.contains(':')) {
          final parts = rawEnd.split(':');
          endSec = parts.fold<int>(0, (prev, elem) => prev * 60 + (int.tryParse(elem) ?? 0));
        } else {
          endSec = int.tryParse(rawEnd) ?? 0;
        }
        if (endSec > maxSec) maxSec = endSec;
      }
      if (maxSec > 0) {
        calculatedMinutes = (maxSec / 60).ceil();
      }
    }

    final durationMinutes = calculatedMinutes > 0
        ? calculatedMinutes
        : (_selectedMeetingDetail?.duration != null
            ? int.tryParse(_selectedMeetingDetail!.duration) ?? 5
            : 5);

    try {
      final payload = {
        'title': title,
        'description': summaryText,
        'date': date,
        'durationMinutes': durationMinutes,
        'participants': effectiveParticipants,
        'transcript': _currentTranscript.map((s) => s.toJson()).toList(),
        'summary': {
          'title': title,
          'content': {
            'executiveOverview': summaryText,
            'nextSteps': actionItems.map((item) => {
              'id': item.id,
              'action': item.task,
              'responsible': item.assignee,
              'dueDate': item.dueDate,
              'status': item.status,
            }).toList(),
            'keyDecisions': decisions,
          },
          'focusAreas': pvData['focusAreas'] ?? [],
          'detailLevel': pvData['detailLevel'] ?? 'Medium',
        },
        'decisions': decisions,
        'actionItems': actionItems.map((item) => {
          'id': item.id,
          'action': item.task,
          'responsible': item.assignee,
          'dueDate': item.dueDate,
          'status': item.status,
        }).toList(),
        'analytics': analytics,
        'projectId': projectId,
      };

      final result = await _meetingService.persistMeetingToSymfony(payload);
      final newUuid = result['meetingId']?.toString();
      if (newUuid != null) {
        // Notify Flask to rename the meeting so that its audio file and job are mapped to the new UUID
        try {
          await _meetingService.renameMeetingOnFlask(_activeMeetingId!, newUuid);
        } catch (e) {
          if (kDebugMode) {
            print('[MeetingProvider] Failed to rename meeting on Flask: $e');
          }
        }

        // Remove from local temporary meetings storage
        final tempStorage = TemporaryMeetingStorage();
        await tempStorage.removeMeeting(_activeMeetingId!);

        // Remove the temporary numeric ID placeholder from the local meetings list
        _meetings = _meetings.where((m) => m.id != _activeMeetingId).toList();
        notifyListeners();

        // Update active meeting ID to the new UUID
        _activeMeetingId = newUuid;

        // Wait for the fresh Symfony list so the caller sees Completed status
        await loadMeetings();
        return newUuid;
      }
      return null;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      return null;
    }
  }
}
