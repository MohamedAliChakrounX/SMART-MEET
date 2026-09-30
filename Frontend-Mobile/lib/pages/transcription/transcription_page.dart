import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:just_audio/just_audio.dart';
import '../../config/api_config.dart';
import '../../models/models.dart';
import '../../providers/app_state.dart';
import '../../providers/meeting_provider.dart';
import '../../providers/notification_provider.dart';
import '../../services/token_storage.dart';
import '../../theme/app_theme.dart';
import '../../widgets/interactive_loading_widget.dart';
import '../../l10n/l10n.dart';

class TranscriptionPage extends StatefulWidget {
  const TranscriptionPage({super.key});

  @override
  State<TranscriptionPage> createState() => _TranscriptionPageState();
}

class _TranscriptionPageState extends State<TranscriptionPage> {
  Timer? _statusTimer;
  bool _isProcessing = true;
  double _progress = 0.0;
  String _stepLabel = 'Queued — waiting for processing...';
  String? _errorMessage;

  // Audio Player variables
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isPlaying = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;
  // Tracks the meeting ID for which audio was loaded.
  // Null means no audio has been loaded yet.
  // When navigating between archive meetings, if this differs from
  // the current activeMeetingId, audio is reloaded for the new meeting.
  String? _loadedAudioMeetingId;

  // Toggle for speaker stats
  bool _showStats = false;

  // Stream subscriptions
  StreamSubscription<PlayerState>? _playerStateSubscription;
  StreamSubscription<Duration?>? _durationSubscription;
  StreamSubscription<Duration>? _positionSubscription;

  @override
  void initState() {
    super.initState();
    _initAudio();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startStatusPolling();
    });
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    _playerStateSubscription?.cancel();
    _durationSubscription?.cancel();
    _positionSubscription?.cancel();
    _audioPlayer.dispose();
    super.dispose();
  }

  void _startStatusPolling() {
    final meetingProvider = context.read<MeetingProvider>();
    final id = meetingProvider.activeMeetingId;

    if (id == null || id.isEmpty) {
      setState(() {
        _isProcessing = false;
        _errorMessage = 'No active meeting ID found.';
      });
      return;
    }

    final hideSteps =
        GoRouterState.of(context).uri.queryParameters['hideSteps'] == 'true';

    if (hideSteps) {
      setState(() {
        _isProcessing = false;
        _progress = 1.0;
      });
      meetingProvider.loadTranscript(id).then((_) {
        _loadAudioSource();
      });
      return;
    }

    _pollStatus(id);
    _statusTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      _pollStatus(id);
    });
  }

  Future<void> _pollStatus(String id) async {
    final meetingProvider = context.read<MeetingProvider>();
    final data = await meetingProvider.getTranscriptionStatus(id);

    if (!mounted) return;

    final status = data['status']?.toString().toLowerCase() ?? 'pending';
    final progressVal = (data['progress'] as num?)?.toDouble() ?? 0.0;
    final step = data['step']?.toString() ?? 'Processing...';

    setState(() {
      _progress = progressVal / 100.0;
      _stepLabel = step;
    });

    if (status == 'done') {
      _statusTimer?.cancel();
      setState(() {
        _isProcessing = false;
        _progress = 1.0;
      });
      await meetingProvider.loadTranscript(id);
      await _loadAudioSource();
      if (mounted) {
        context.read<NotificationProvider>().notify(
          title: 'Transcription Terminée ✓',
          message: 'La transcription est prête. Vous pouvez la consulter.',
          type: AppNotificationType.success,
        );
      }
    } else if (status == 'error') {
      _statusTimer?.cancel();
      setState(() {
        _isProcessing = false;
        _errorMessage = data['errorMessage']?.toString() ?? 'An error occurred during processing.';
      });
      if (mounted) {
        context.read<NotificationProvider>().notify(
          title: 'Erreur de Transcription',
          message: _errorMessage ?? 'Une erreur est survenue lors du traitement.',
          type: AppNotificationType.error,
        );
      }
    }
  }

  void _renameSpeaker(String oldName) {
    final textController = TextEditingController(text: oldName);

    showDialog(
      context: context,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final cardBg = isDark ? const Color(0xFF1E293B) : Colors.white;
        final inputBg = isDark ? const Color(0xFF0F172A) : const Color(0xFFF3F4F6);

        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
                  blurRadius: 24,
                  offset: const Offset(0, 12),
                )
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryBlue.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.drive_file_rename_outline_rounded,
                        color: AppTheme.primaryBlue,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Modifier le Nom',
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF1E293B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'Renommer "$oldName" pour toutes ses interventions dans cette réunion.',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: textController,
                  autofocus: true,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontWeight: FontWeight.w600,
                  ),
                  decoration: InputDecoration(
                    labelText: 'Nouveau Nom',
                    labelStyle: GoogleFonts.inter(
                      fontSize: 12,
                      color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    ),
                    filled: true,
                    fillColor: inputBg,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: AppTheme.primaryBlue, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text(
                        'Annuler',
                        style: GoogleFonts.inter(
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryBlue,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () {
                        final newName = textController.text.trim();
                        Navigator.pop(context);
                        if (newName.isNotEmpty && newName != oldName) {
                          _commitSpeakerRename(oldName, newName);
                        }
                      },
                      child: Text(
                        'Enregistrer',
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _commitSpeakerRename(String oldName, String newName) {
    final meetingProvider = context.read<MeetingProvider>();
    final currentList = meetingProvider.currentTranscript;

    final updated = currentList.map((seg) {
      if (seg.speaker == oldName) {
        return TranscriptSegment(
          id: seg.id,
          speaker: newName,
          speakerColor: seg.speakerColor,
          timeStart: seg.timeStart,
          timeEnd: seg.timeEnd,
          text: seg.text,
        );
      }
      return seg;
    }).toList();

    meetingProvider.updateLocalTranscript(updated);
    meetingProvider.saveTranscriptToServer().then((success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              success ? 'Speaker renamed successfully and saved to server!' : 'Rename saved locally, server update failed.',
            ),
            backgroundColor: success ? const Color(0xFF10B981) : Colors.amber[800],
            duration: const Duration(seconds: 2),
          ),
        );
      }
    });
  }

  Color _hexColor(String hex) {
    final h = hex.replaceAll('#', '');
    try {
      return Color(int.parse('FF$h', radix: 16));
    } catch (_) {
      return AppTheme.primaryBlue;
    }
  }

  void _initAudio() {
    _playerStateSubscription = _audioPlayer.playerStateStream.listen((state) {
      if (mounted) {
        setState(() {
          _isPlaying = state.playing;
        });
      }
    });

    _durationSubscription = _audioPlayer.durationStream.listen((d) {
      if (mounted && d != null) {
        setState(() {
          _duration = d;
        });
      }
    });

    _positionSubscription = _audioPlayer.positionStream.listen((p) {
      if (mounted) {
        setState(() {
          _position = p;
        });
      }
    });
  }

  Future<void> _loadAudioSource() async {
    final meetingProvider = context.read<MeetingProvider>();
    final id = meetingProvider.activeMeetingId;
    if (id == null || id.isEmpty) {
      if (kDebugMode) print('[AudioPlayer] No activeMeetingId — cannot load audio.');
      return;
    }

    // Skip reload if audio for this exact meeting is already loaded.
    if (_loadedAudioMeetingId == id) {
      if (kDebugMode) print('[AudioPlayer] Audio already loaded for meeting $id — skipping.');
      return;
    }

    // Capture all context-dependent values BEFORE any await so we don't
    // access BuildContext across async gaps (use_build_context_synchronously).
    final bool isArchiveView =
        GoRouterState.of(context).uri.queryParameters['hideSteps'] == 'true';
    final String? localPath =
        isArchiveView ? null : context.read<AppState>().audioFilePath;

    // Reset audio state before loading the new source so the UI shows 0:00
    // only momentarily before the real duration arrives.
    if (mounted) {
      setState(() {
        _duration = Duration.zero;
        _position = Duration.zero;
        _isPlaying = false;
        _loadedAudioMeetingId = null;
      });
    }
    await _audioPlayer.stop();

    if (!isArchiveView) {
      // 1. Fresh upload/live processing: try local file path first.
      if (localPath != null && localPath.isNotEmpty) {
        final f = File(localPath);
        if (f.existsSync()) {
          try {
            if (kDebugMode) print('[AudioPlayer] Loading from local file: $localPath');
            await _audioPlayer.setFilePath(localPath);
            if (mounted) setState(() => _loadedAudioMeetingId = id);
            return;
          } catch (e) {
            if (kDebugMode) print('[AudioPlayer] Local file failed: $e — falling back to Flask.');
          }
        }
      }
    } else {
      if (kDebugMode) {
        print('[AudioPlayer] Archive view — skipping local path, streaming from Flask for meeting $id');
      }
    }

    // 2. Stream from Flask using the meeting's own ID (UUID after archiving).
    //    Pass the JWT Bearer token in the HTTP headers so Flask can authenticate
    //    the request if authentication middleware is ever added, and to match
    //    the same auth headers used for all other API calls.
    final String audioUrl = '${ApiConfig.flaskBaseUrl}/meetings/$id/audio';
    try {
      if (kDebugMode) print('[AudioPlayer] Loading from Flask: $audioUrl');

      final token = await TokenStorage().getToken();
      final headers = <String, String>{
        'Accept': 'audio/*',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      };

      final source = AudioSource.uri(
        Uri.parse(audioUrl),
        headers: headers,
      );
      await _audioPlayer.setAudioSource(source);
      if (mounted) setState(() => _loadedAudioMeetingId = id);
    } catch (e) {
      if (kDebugMode) print('[AudioPlayer] Flask stream failed: $e');
    }
  }

  Duration _parseTimeToDuration(String timeStr) {
    try {
      final parts = timeStr.split(':');
      if (parts.length == 2) {
        final minutes = int.parse(parts[0]);
        final seconds = int.parse(parts[1]);
        return Duration(minutes: minutes, seconds: seconds);
      } else if (parts.length == 3) {
        final hours = int.parse(parts[0]);
        final minutes = int.parse(parts[1]);
        final seconds = int.parse(parts[2]);
        return Duration(hours: hours, minutes: minutes, seconds: seconds);
      }
    } catch (_) {}
    return Duration.zero;
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes.toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  void _seekToRelativePosition(double localX, double totalWidth) {
    if (_duration.inMilliseconds == 0) return;
    final double pct = (localX / totalWidth).clamp(0.0, 1.0);
    final Duration dest = Duration(milliseconds: (pct * _duration.inMilliseconds).toInt());
    _audioPlayer.seek(dest);
  }

  void _seekToSegment(String timeStart) {
    final Duration dest = _parseTimeToDuration(timeStart);
    _audioPlayer.seek(dest);
    _audioPlayer.play();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final appState = context.watch<AppState>();
    final meetingProvider = context.watch<MeetingProvider>();

    final hideSteps =
        GoRouterState.of(context).uri.queryParameters['hideSteps'] == 'true';

    final transcriptList = meetingProvider.currentTranscript;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () {
            _statusTimer?.cancel();
            context.pop();
          },
        ),
        title: Text(
          'Transcription',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 17),
        ),
        actions: [
          if (!hideSteps) const _StepIndicator(currentStep: 2),
          const SizedBox(width: 8),
          IconButton(
            icon: Icon(
                appState.darkMode
                    ? Icons.light_mode_outlined
                    : Icons.dark_mode_outlined,
                size: 20),
            onPressed: appState.toggleDarkMode,
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Processing view or transcript view ──
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: _errorMessage != null
                  ? _buildErrorView(isDark)
                  : _isProcessing
                      ? _buildProcessingView(isDark)
                      : _buildTranscriptView(theme, isDark, transcriptList, hideSteps),
            ),
          ),
        ],
      ),
    );
  }

  // Error screen
  Widget _buildErrorView(bool isDark) {
    return Center(
      key: const ValueKey('error'),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.error_outline, color: Colors.red, size: 48),
            ),
            const SizedBox(height: 16),
            Text(
              'Transcription Failed',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : const Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? 'An error occurred.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: Colors.grey[500],
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _errorMessage = null;
                  _isProcessing = true;
                });
                _startStatusPolling();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryBlue,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
              label: Text(
                'Retry',
                style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Premium processing/loading view with touch interaction and cancellation
  Widget _buildProcessingView(bool isDark) {
    final meetingProvider = context.read<MeetingProvider>();
    final l = context.l10n;
    return InteractiveLoadingWidget(
      key: const ValueKey('processing'),
      progress: _progress,
      stepLabel: _stepLabel,
      title: l('loading_transcription'),
      subtitle: l('loading_transcription_sub'),
      cancelLabel: l('loading_cancel').toUpperCase(),
      processingLabel: l('loading_exists'),
      onCancel: () async {
        _statusTimer?.cancel();
        await meetingProvider.cancelActiveMeeting();
        if (mounted) {
          context.pop();
        }
      },
    );
  }

  // Transcript displaying view
  Widget _buildTranscriptView(
    ThemeData theme,
    bool isDark,
    List<TranscriptSegment> transcriptList,
    bool hideSteps,
  ) {
    final meetingProvider = context.watch<MeetingProvider>();
    return Column(
      key: const ValueKey('transcript'),
      children: [
        // Audio player bar (functional player)
        LayoutBuilder(
          builder: (context, constraints) {
            final double playerWidth = (constraints.maxWidth - 36 - 12 - 32).clamp(10.0, 1000.0);
            final double progress = _duration.inMilliseconds > 0 
                ? (_position.inMilliseconds / _duration.inMilliseconds).clamp(0.0, 1.0)
                : 0.0;
            final activeBars = (progress * 50).toInt();

            return Container(
              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      if (_isPlaying) {
                        _audioPlayer.pause();
                      } else {
                        _audioPlayer.play();
                      }
                    },
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryBlue,
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryBlue.withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Icon(
                        _isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTapDown: (details) {
                            _seekToRelativePosition(details.localPosition.dx, playerWidth);
                          },
                          onHorizontalDragUpdate: (details) {
                            _seekToRelativePosition(details.localPosition.dx, playerWidth);
                          },
                          child: Row(
                            children: List.generate(50, (i) {
                              final h = (10.0 + ((i * 7) % 22)).clamp(6.0, 28.0);
                              return Expanded(
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 1),
                                  height: h,
                                  decoration: BoxDecoration(
                                    color: i < activeBars 
                                        ? AppTheme.primaryBlue 
                                        : (isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                              );
                            }),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _formatDuration(_position),
                              style: GoogleFonts.robotoMono(
                                fontSize: 10,
                                color: isDark ? Colors.grey[400] : Colors.grey[600],
                              ),
                            ),
                            Text(
                              _formatDuration(_duration),
                              style: GoogleFonts.robotoMono(
                                fontSize: 10,
                                color: isDark ? Colors.grey[500] : Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),

        // Collapsible Statistics panel
        _buildStatsSection(isDark, theme, transcriptList),

        // Stats row (Metadata and translate action)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF111827) : Colors.white,
            border: Border(bottom: BorderSide(color: theme.dividerColor)),
          ),
          child: Row(
            children: [
              _StatChip(
                icon: Icons.chat_bubble_outline,
                label: '${transcriptList.length} segments',
                isDark: isDark,
              ),
              const SizedBox(width: 8),
              _StatChip(
                icon: Icons.check_circle_outline,
                label: 'AI Ready',
                color: Colors.green[600],
                isDark: isDark,
              ),
              const Spacer(),
              if (meetingProvider.isTranslating)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12.0),
                  child: SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryBlue),
                  ),
                )
              else
                PopupMenuButton<String>(
                  icon: const Icon(Icons.g_translate_outlined, size: 18, color: AppTheme.primaryBlue),
                  tooltip: 'Traduire la transcription',
                  onSelected: (lang) async {
                    final success = await meetingProvider.translateCurrentTranscript(lang);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(success ? 'Transcription traduite avec succès !' : 'La traduction a échoué.'),
                          backgroundColor: success ? const Color(0xFF10B981) : Colors.red[700],
                        ),
                      );
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(value: 'fr', child: Text('Traduire en Français')),
                    const PopupMenuItem(value: 'en', child: Text('Translate to English')),
                  ],
                ),
            ],
          ),
        ),

        // Transcript list
        Expanded(
          child: transcriptList.isEmpty
              ? Center(
                  child: Text(
                    'Aucune transcription disponible.',
                    style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600]),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  itemCount: transcriptList.length,
                  itemBuilder: (context, i) {
                    final seg = transcriptList[i];
                    final color = _hexColor(seg.speakerColor);

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 20),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Speaker profile / interactive name
                          SizedBox(
                            width: 85,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                InkWell(
                                  onTap: () => _renameSpeaker(seg.speaker),
                                  borderRadius: BorderRadius.circular(6),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: color.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: color.withOpacity(0.3), width: 0.5),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Flexible(
                                          child: Text(
                                            seg.speaker.toUpperCase(),
                                            style: GoogleFonts.inter(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w800,
                                              color: color,
                                              letterSpacing: 0.5,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 2),
                                        Icon(Icons.edit, size: 8, color: color),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  seg.timeStart,
                                  style: GoogleFonts.robotoMono(
                                    fontSize: 9,
                                    color: isDark ? Colors.grey[600] : Colors.grey[400],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: InkWell(
                              onTap: () => _seekToSegment(seg.timeStart),
                              borderRadius: const BorderRadius.only(
                                topRight: Radius.circular(12),
                                bottomLeft: Radius.circular(12),
                                bottomRight: Radius.circular(12),
                              ),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF1F2937) : const Color(0xFFF8FAFC),
                                  borderRadius: const BorderRadius.only(
                                    topRight: Radius.circular(12),
                                    bottomLeft: Radius.circular(12),
                                    bottomRight: Radius.circular(12),
                                  ),
                                  border: Border(left: BorderSide(color: color, width: 2.5)),
                                ),
                                child: Text(
                                  seg.text,
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    height: 1.5,
                                    color: isDark ? Colors.grey[300] : const Color(0xFF374151),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),

        // Bottom action bar
        if (!hideSteps)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF111827) : Colors.white,
              border: Border(top: BorderSide(color: theme.dividerColor)),
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  _statusTimer?.cancel();
                  context.push('/summary${hideSteps ? '?hideSteps=true' : ''}');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryBlue,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                icon: const Icon(Icons.auto_awesome, color: Colors.white, size: 16),
                label: Text(
                  'Generate Summary',
                  style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildStatsSection(bool isDark, ThemeData theme, List<TranscriptSegment> transcriptList) {
    if (transcriptList.isEmpty) return const SizedBox.shrink();

    // Compute stats
    int totalWords = 0;
    int totalDurationSeconds = 0;
    final Map<String, SpeakerStats> statsMap = {};

    for (final seg in transcriptList) {
      final name = seg.speaker.trim();
      if (name.isEmpty) continue;
      
      final wordCount = seg.text.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
      final start = _parseTimeToDuration(seg.timeStart).inSeconds;
      final end = _parseTimeToDuration(seg.timeEnd).inSeconds;
      final duration = (end - start).clamp(0, 86400);

      totalWords += wordCount;
      totalDurationSeconds += duration;

      if (statsMap.containsKey(name)) {
        statsMap[name]!.words += wordCount;
        statsMap[name]!.durationSeconds += duration;
      } else {
        statsMap[name] = SpeakerStats(
          name: name,
          color: _hexColor(seg.speakerColor),
          words: wordCount,
          durationSeconds: duration,
        );
      }
    }

    final sortedStats = statsMap.values.toList()
      ..sort((a, b) => b.durationSeconds.compareTo(a.durationSeconds));

    final totalDurStr = _formatDuration(Duration(seconds: totalDurationSeconds));

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B).withOpacity(0.5) : Colors.white,
        border: Border(bottom: BorderSide(color: theme.dividerColor)),
      ),
      child: Column(
        children: [
          // Header toggle row
          InkWell(
            onTap: () {
              setState(() {
                _showStats = !_showStats;
              });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Icon(
                    Icons.analytics_outlined,
                    size: 16,
                    color: AppTheme.primaryBlue,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Statistiques générales',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                  const Spacer(),
                  // Short preview if collapsed
                  if (!_showStats) ...[
                    Text(
                      '${sortedStats.length} Intervenants | $totalWords Mots',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Icon(
                    _showStats ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    size: 18,
                    color: Colors.grey[500],
                  ),
                ],
              ),
            ),
          ),
          
          // Expanded panel
          if (_showStats)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // High-level summary row
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A).withOpacity(0.5) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? const Color(0xFF334155).withOpacity(0.5) : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildSummaryItem(
                          isDark: isDark,
                          label: 'Intervenants',
                          value: '${sortedStats.length}',
                          icon: Icons.people_outline_rounded,
                        ),
                        _buildDivider(isDark),
                        _buildSummaryItem(
                          isDark: isDark,
                          label: 'Total Mots',
                          value: '$totalWords',
                          icon: Icons.text_fields_rounded,
                        ),
                        _buildDivider(isDark),
                        _buildSummaryItem(
                          isDark: isDark,
                          label: 'Durée Totale',
                          value: totalDurStr,
                          icon: Icons.timer_outlined,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Per-speaker contribution header
                  Text(
                    'Contribution des intervenants',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.grey[400] : Colors.grey[700],
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  
                  // Speaker stats bars list
                  ...sortedStats.map((stats) {
                    final int wordPct = totalWords > 0 ? ((stats.words / totalWords) * 100).round() : 0;
                    final int durPct = totalDurationSeconds > 0 ? ((stats.durationSeconds / totalDurationSeconds) * 100).round() : 0;
                    final String durStr = _formatDuration(Duration(seconds: stats.durationSeconds));

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: stats.color,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  stats.name.toUpperCase(),
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : const Color(0xFF1F2937),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(
                                '$durStr ($durPct%)',
                                style: GoogleFonts.robotoMono(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.grey[300] : const Color(0xFF374151),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text(
                                '${stats.words} mots ($wordPct%)',
                                style: GoogleFonts.robotoMono(
                                  fontSize: 10,
                                  color: Colors.grey[500],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          // Custom progress bar
                          Container(
                            height: 5,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                              borderRadius: BorderRadius.circular(3),
                            ),
                            alignment: Alignment.centerLeft,
                            child: FractionallySizedBox(
                              widthFactor: totalDurationSeconds > 0 
                                  ? (stats.durationSeconds / totalDurationSeconds).clamp(0.0, 1.0)
                                  : 0.0,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: stats.color,
                                  borderRadius: BorderRadius.circular(3),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem({
    required bool isDark,
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Column(
      children: [
        Icon(icon, size: 14, color: Colors.grey[500]),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.robotoMono(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 9,
            color: Colors.grey[500],
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildDivider(bool isDark) {
    return Container(
      height: 24,
      width: 1,
      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  final bool isDark;
  const _StatChip({
    required this.icon,
    required this.label,
    this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? (isDark ? Colors.grey[400]! : Colors.grey[600]!);
    return Row(
      children: [
        Icon(icon, size: 13, color: c),
        const SizedBox(width: 4),
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 12, color: c, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}

class _StepIndicator extends StatelessWidget {
  final int currentStep;
  const _StepIndicator({required this.currentStep});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: const BoxDecoration(
            color: AppTheme.primaryBlue,
            shape: BoxShape.circle,
          ),
          child: const Center(
            child: Text(
              '2',
              style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }
}

class SpeakerStats {
  final String name;
  final Color color;
  int words;
  int durationSeconds;

  SpeakerStats({
    required this.name,
    required this.color,
    this.words = 0,
    this.durationSeconds = 0,
  });
}
