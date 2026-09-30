// PVProvider for Summary Document and Action Items State Management

import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/pv_service.dart';

class PVProvider extends ChangeNotifier {
  final PVService _pvService;

  String _summaryText = '';
  String get summaryText => _summaryText;

  List<ActionItem> _actionItems = [];
  List<ActionItem> get actionItems => _actionItems;

  List<String> _decisions = [];
  List<String> get decisions => _decisions;

  // Raw full PV data (for sections like title, participants, etc.)
  Map<String, dynamic> _pvData = {};
  Map<String, dynamic> get pvData => _pvData;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  // Progress for generation polling
  bool _isGenerating = false;
  bool get isGenerating => _isGenerating;

  double _generateProgress = 0.0;
  double get generateProgress => _generateProgress;

  String _generateStep = 'Initialisation...';
  String get generateStep => _generateStep;

  String? _error;
  String? get error => _error;

  PVProvider({PVService? pvService}) : _pvService = pvService ?? PVService();

  /// Full flow: Try to fetch existing summary. If none, auto-generate.
  Future<void> loadSummary(String meetingId) async {
    if (meetingId.isEmpty) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _pvService.fetchSummary(meetingId);
      if (result['hasSummary'] == true) {
        _applyResult(result);
        _isLoading = false;
        notifyListeners();
      } else {
        // No summary yet — auto-start generation
        _isLoading = false;
        notifyListeners();
        await generateSummary(meetingId);
      }
    } catch (e) {
      // On 404 or any error, try generating
      _isLoading = false;
      notifyListeners();
      await generateSummary(meetingId);
    }
  }

  /// Triggers PV generation (POST /meetings/{id}/generate-summary)
  Future<void> generateSummary(
    String meetingId, {
    String language = 'default',
    String? model,
    String? format,
  }) async {
    _isGenerating = true;
    _generateProgress = 0.0;
    _generateStep = 'Initialisation...';
    _error = null;
    notifyListeners();

    try {
      await _pvService.startGenerateSummary(
        meetingId,
        language: language,
        model: model,
        format: format,
      );
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      _isGenerating = false;
      notifyListeners();
    }
  }

  /// Cancels generation and resets active provider state
  void cancelGeneration() {
    _isGenerating = false;
    _generateProgress = 0.0;
    _generateStep = '';
    _error = null;
    notifyListeners();
  }

  /// Polls the PV generation status (GET /meetings/{id}/summary-status)
  /// Returns true if done, false if still generating.
  /// Call [onCompleted] when PV is ready and [onError] when failed.
  Future<bool> pollGenerateStatus(
    String meetingId, {
    VoidCallback? onCompleted,
    VoidCallback? onError,
  }) async {
    try {
      final status = await _pvService.fetchSummaryStatus(meetingId);
      final state = status['status']?.toString() ?? 'pending';
      final progress = (status['progress'] as num?)?.toDouble() ?? 0.0;
      final step = status['step']?.toString() ?? '';

      _generateProgress = progress / 100.0;
      if (step.isNotEmpty) _generateStep = step;
      notifyListeners();

      if (state == 'done' && status['pv'] != null) {
        _isGenerating = false;
        // Extract the generated PV from the status response
        final pvMap = status['pv'] as Map<String, dynamic>? ?? {};
        _applyPvData(pvMap);
        notifyListeners();
        onCompleted?.call();
        return true;
      } else if (state == 'error') {
        _error = status['error']?.toString() ?? 'Generation failed.';
        _isGenerating = false;
        notifyListeners();
        onError?.call();
        return true; // done (with error)
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  void _applyResult(Map<String, dynamic> result) {
    _summaryText = (result['summary'] as String?) ?? '';
    _actionItems = (result['action_items'] as List<ActionItem>?) ?? [];
    _decisions = (result['decisions'] as List<String>?) ?? [];
    _pvData = (result['pvData'] as Map<String, dynamic>?) ?? {};
  }

  void _applyPvData(Map<String, dynamic> pv) {
    _pvData = pv;
    final content = pv['content'];
    if (content is Map<String, dynamic>) {
      _summaryText = content['executiveOverview']?.toString() ??
          content['summary']?.toString() ??
          content['overview']?.toString() ?? '';

      final nextSteps = content['nextSteps'] ?? content['actionItems'];
      if (nextSteps is List) {
        _actionItems = nextSteps
            .map((json) => ActionItem.fromJson(Map<String, dynamic>.from(json)))
            .toList();
      }
      final keyDecisions = content['keyDecisions'] ?? content['decisions'];
      if (keyDecisions is List) {
        _decisions = keyDecisions.map((e) => e.toString()).toList();
      }
    } else {
      _summaryText = pv['summary']?.toString() ?? '';
    }
  }

  /// Toggles status of an action item
  Future<void> toggleActionItemStatus(int index) async {
    if (index < 0 || index >= _actionItems.length) return;

    final item = _actionItems[index];
    final newStatus = item.status == 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    _actionItems[index] = ActionItem(
      id: item.id,
      task: item.task,
      assignee: item.assignee,
      dueDate: item.dueDate,
      status: newStatus,
    );
    notifyListeners();

    try {
      await _pvService.updateActionItemStatus(item.id, newStatus);
    } catch (_) {
      _actionItems[index] = item;
      notifyListeners();
    }
  }

  /// Locally updates the executive summary text
  void updateLocalSummaryText(String value) {
    _summaryText = value;
    notifyListeners();
  }

  /// Locally updates the list of action items
  void updateLocalActionItems(List<ActionItem> items) {
    _actionItems = items;
    notifyListeners();
  }

  /// Locally updates the list of decisions
  void updateLocalDecisions(List<String> items) {
    _decisions = items;
    notifyListeners();
  }

  /// Persists the locally updated summary document to the server
  Future<bool> saveSummaryToServer(
    String meetingId, {
    String? title,
    String? date,
    String? startTime,
    String? endTime,
    String? location,
    String? facilitator,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _pvService.updateSummary(
        meetingId,
        summaryText: _summaryText,
        actionItems: _actionItems,
        decisions: _decisions,
        title: title,
        date: date,
        startTime: startTime,
        endTime: endTime,
        location: location,
        facilitator: facilitator,
      );
      if (result.isNotEmpty) {
        _applyPvData(result);
      }
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  String getExportPdfUrl(String meetingId) => _pvService.getExportPdfUrl(meetingId);
}
