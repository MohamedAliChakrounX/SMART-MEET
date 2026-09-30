import 'dart:async';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../models/models.dart';
import '../../providers/app_state.dart';
import '../../providers/meeting_provider.dart';
import '../../theme/app_theme.dart';
import '../../l10n/l10n.dart';

class UploadPage extends StatefulWidget {
  const UploadPage({super.key});

  @override
  State<UploadPage> createState() => _UploadPageState();
}

class _UploadPageState extends State<UploadPage> {
  String? _selectedFileName;
  String? _selectedFilePath;
  bool _isRecording = false;
  int _recordingSeconds = 0;
  Timer? _timer;
  late final TextEditingController _titleController;

  // Organisation selection
  String? _selectedDeptId;
  String? _selectedTeamId;
  String? _selectedProjectId;

  String get _formattedTime {
    final m = _recordingSeconds ~/ 60;
    final s = _recordingSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  void _startRecording() {
    setState(() {
      _isRecording = true;
      _recordingSeconds = 0;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _recordingSeconds++);
    });
  }

  void _stopRecording() {
    _timer?.cancel();
    setState(() {
      _isRecording = false;
      _selectedFileName =
          'recording_${DateTime.now().toIso8601String().substring(0, 19)}.m4a';
    });
  }

  Future<void> _pickAudioFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.audio,
        allowMultiple: false,
      );

      if (result != null && result.files.single.path != null) {
        setState(() {
          _selectedFileName = result.files.single.name;
          _selectedFilePath = result.files.single.path;
        });
      }
    } catch (_) {
      setState(() {
        _selectedFileName = 'meeting_audio.mp3';
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MeetingProvider>().loadOrgFilters();
    });
  }

  Future<void> _handleNext() async {
    if (_selectedFileName == null) return;

    // Project selection is mandatory
    if (_selectedProjectId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Veuillez sélectionner un projet avant de continuer.'),
          backgroundColor: Colors.orange[700],
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }

    context.read<AppState>().setAudioFile(_selectedFilePath ?? _selectedFileName);
    final meetingProvider = context.read<MeetingProvider>();

    // Use the user-provided title, falling back to filename without extension
    final userTitle = _titleController.text.trim().isNotEmpty
        ? _titleController.text.trim()
        : (_selectedFileName != null
            ? _selectedFileName!.replaceAll(RegExp(r'\.[^.]+$'), '')
            : 'Réunion');

    if (_selectedFilePath != null) {
      // Upload brand new meeting (POST /api/v1/meetings/upload)
      final meetingId = await meetingProvider.uploadNewMeeting(
        filePath: _selectedFilePath!,
        fileName: _selectedFileName!,
        title: userTitle,
        projectId: _selectedProjectId,
      );

      if (mounted) {
        if (meetingId != null) {
          context.push('/transcription');
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                meetingProvider.error ?? 'Upload failed. Please try again.',
              ),
              backgroundColor: Colors.red[700],
            ),
          );
        }
      }
    } else {
      if (mounted) context.push('/transcription');
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final appState = context.watch<AppState>();
    final meetingProvider = context.watch<MeetingProvider>();

    // Compute visible teams / projects based on selection
    final visibleTeams = _selectedDeptId != null
        ? meetingProvider.teams.where((t) => t.parentId == _selectedDeptId).toList()
        : meetingProvider.teams;

    final visibleProjects = _selectedTeamId != null
        ? meetingProvider.projects.where((p) => p.parentId == _selectedTeamId).toList()
        : meetingProvider.projects;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => context.pop(),
        ),
        title: Text(
          context.l10n('upload_title'),
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 17),
        ),
        actions: [
          const _StepIndicator(currentStep: 1),
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
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Organisation Section (COMPACT, MANDATORY) ──
                  _CompactOrgSelector(
                    isDark: isDark,
                    meetingProvider: meetingProvider,
                    selectedDeptId: _selectedDeptId,
                    selectedTeamId: _selectedTeamId,
                    selectedProjectId: _selectedProjectId,
                    visibleTeams: visibleTeams,
                    visibleProjects: visibleProjects,
                    onDeptChanged: (val) => setState(() {
                      _selectedDeptId = val;
                      _selectedTeamId = null;
                      _selectedProjectId = null;
                    }),
                    onTeamChanged: (val) => setState(() {
                      _selectedTeamId = val;
                      _selectedProjectId = null;
                      if (val != null) {
                        final teamMatches = meetingProvider.teams.where((t) => t.id == val);
                        if (teamMatches.isNotEmpty && teamMatches.first.parentId != null) {
                          _selectedDeptId = teamMatches.first.parentId;
                        }
                      }
                    }),
                    onProjectChanged: (val) => setState(() {
                      _selectedProjectId = val;
                      if (val != null) {
                        final projMatches = meetingProvider.projects.where((p) => p.id == val);
                        if (projMatches.isNotEmpty && projMatches.first.parentId != null) {
                          final teamId = projMatches.first.parentId;
                          _selectedTeamId = teamId;
                          final teamMatches = meetingProvider.teams.where((t) => t.id == teamId);
                          if (teamMatches.isNotEmpty && teamMatches.first.parentId != null) {
                            _selectedDeptId = teamMatches.first.parentId;
                          }
                        }
                      }
                    }),
                  ),
                  const SizedBox(height: 20),

                  // ── Meeting Title Card ──
                  _SectionCard(
                    isDark: isDark,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.title_rounded,
                                  color: AppTheme.primaryBlue, size: 20),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Titre de la réunion',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: isDark
                                    ? Colors.white
                                    : const Color(0xFF111827),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        TextField(
                          controller: _titleController,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: isDark ? Colors.white : const Color(0xFF111827),
                          ),
                          decoration: InputDecoration(
                            hintText: 'Ex: Réunion de projet Q3, Stand-up lundi…',
                            hintStyle: GoogleFonts.inter(
                              fontSize: 13,
                              color: isDark ? Colors.grey[500] : Colors.grey[400],
                            ),
                            filled: true,
                            fillColor: isDark
                                ? const Color(0xFF1F2937)
                                : const Color(0xFFF9FAFB),
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 13),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(
                                color: isDark
                                    ? const Color(0xFF374151)
                                    : const Color(0xFFE5E7EB),
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(
                                color: isDark
                                    ? const Color(0xFF374151)
                                    : const Color(0xFFE5E7EB),
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(
                                color: AppTheme.primaryBlue,
                                width: 1.5,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Live Recording Card ──
                  _SectionCard(
                    isDark: isDark,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.red.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.mic,
                                  color: Colors.red, size: 20),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              context.l10n('upload_record_live'),
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: isDark
                                    ? Colors.white
                                    : const Color(0xFF111827),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF111827),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: List.generate(7, (i) {
                                  final heights = [
                                    12.0,
                                    20.0,
                                    32.0,
                                    40.0,
                                    32.0,
                                    20.0,
                                    12.0
                                  ];
                                  return AnimatedContainer(
                                    duration:
                                        Duration(milliseconds: 300 + i * 50),
                                    margin: const EdgeInsets.symmetric(
                                        horizontal: 2),
                                    width: 4,
                                    height: _isRecording
                                        ? heights[i] * (0.5 + (i % 3) * 0.3)
                                        : heights[i] * 0.5,
                                    decoration: BoxDecoration(
                                      color: _isRecording
                                          ? Colors.red
                                          : const Color(0xFF1E3A8A),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  );
                                }),
                              ),
                              const SizedBox(height: 16),
                              if (_isRecording) ...[
                                Text(
                                  _formattedTime,
                                  style: GoogleFonts.robotoMono(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                    letterSpacing: 4,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                GestureDetector(
                                  onTap: _stopRecording,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 28, vertical: 12),
                                    decoration: BoxDecoration(
                                      color: Colors.red[600],
                                      borderRadius: BorderRadius.circular(999),
                                      boxShadow: [
                                        BoxShadow(
                                            color: Colors.red.withValues(alpha: 0.4),
                                            blurRadius: 12,
                                            offset: const Offset(0, 4))
                                      ],
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                            width: 12,
                                            height: 12,
                                            decoration: const BoxDecoration(
                                                color: Colors.white,
                                                borderRadius: BorderRadius.all(
                                                    Radius.circular(2)))),
                                        const SizedBox(width: 8),
                                        Text(context.l10n('upload_record_stop'),
                                            style: GoogleFonts.inter(
                                                color: Colors.white,
                                                fontWeight: FontWeight.w600,
                                                fontSize: 14)),
                                      ],
                                    ),
                                  ),
                                ),
                              ] else ...[
                                GestureDetector(
                                  onTap: _startRecording,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 24, vertical: 11),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryBlue,
                                      borderRadius: BorderRadius.circular(999),
                                      boxShadow: [
                                        BoxShadow(
                                            color: AppTheme.primaryBlue
                                                .withValues(alpha: 0.5),
                                            blurRadius: 10,
                                            offset: const Offset(0, 3))
                                      ],
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(context.l10n('upload_record_start'),
                                            style: GoogleFonts.inter(
                                                color: Colors.white,
                                                fontWeight: FontWeight.w600,
                                                fontSize: 14)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Upload Card ──
                  _SectionCard(
                    isDark: isDark,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.cloud_upload_outlined,
                                  color: AppTheme.primaryBlue, size: 20),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              context.l10n('upload_audio_title'),
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: isDark
                                    ? Colors.white
                                    : const Color(0xFF111827),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        GestureDetector(
                          onTap: _pickAudioFile,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
                            decoration: BoxDecoration(
                              color: _selectedFileName != null
                                  ? AppTheme.primaryBlue.withValues(alpha: 0.06)
                                  : (isDark
                                      ? const Color(0xFF1F2937)
                                      : const Color(0xFFF9FAFB)),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: _selectedFileName != null
                                  ? AppTheme.primaryBlue
                                  : (isDark
                                      ? const Color(0xFF374151)
                                      : const Color(0xFFE5E7EB)),
                                width: _selectedFileName != null ? 1.5 : 1,
                              ),
                            ),
                            child: Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: _selectedFileName != null
                                        ? AppTheme.primaryBlue.withValues(alpha: 0.1)
                                        : (isDark
                                            ? const Color(0xFF374151)
                                            : Colors.white),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    _selectedFileName != null
                                        ? Icons.audio_file
                                        : Icons.cloud_upload_outlined,
                                    size: 24,
                                    color: _selectedFileName != null
                                        ? AppTheme.primaryBlue
                                        : (isDark
                                            ? Colors.grey[500]
                                            : Colors.grey[400]),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  _selectedFileName ?? context.l10n('upload_audio_tap'),
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: _selectedFileName != null
                                        ? (isDark
                                            ? Colors.white
                                            : const Color(0xFF111827))
                                        : (isDark
                                            ? Colors.grey[400]
                                            : Colors.grey[600]),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'MP3, WAV, M4A (Max 50MB)',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: isDark
                                        ? Colors.grey[600]
                                        : Colors.grey[500],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            decoration: BoxDecoration(
              color: theme.scaffoldBackgroundColor,
              border: Border(
                  top: BorderSide(color: theme.dividerColor, width: 0.5)),
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: meetingProvider.isUploading || _selectedFileName == null || _selectedProjectId == null
                    ? null
                    : _handleNext,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryBlue,
                  disabledBackgroundColor:
                      isDark ? const Color(0xFF1F2937) : Colors.grey[200],
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                icon: meetingProvider.isUploading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.arrow_forward,
                        color: Colors.white, size: 18),
                label: Text(
                  meetingProvider.isUploading ? context.l10n('upload_uploading') : context.l10n('upload_next'),
                  style: GoogleFonts.inter(
                    color: _selectedFileName != null
                        ? Colors.white
                        : (isDark ? Colors.grey[600] : Colors.grey[500]),
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final bool isDark;
  final Widget child;
  const _SectionCard({required this.isDark, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
      ),
      child: child,
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
            child: Text('1',
                style: TextStyle(
                    fontSize: 11,
                    color: Colors.white,
                    fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }
}

// ────────────────────────────────────────────────────────────────
// Compact Organisation Selector (top of page, project mandatory)
// ────────────────────────────────────────────────────────────────
class _CompactOrgSelector extends StatelessWidget {
  final bool isDark;
  final dynamic meetingProvider;
  final String? selectedDeptId;
  final String? selectedTeamId;
  final String? selectedProjectId;
  final List<OrgItem> visibleTeams;
  final List<OrgItem> visibleProjects;
  final ValueChanged<String?> onDeptChanged;
  final ValueChanged<String?> onTeamChanged;
  final ValueChanged<String?> onProjectChanged;

  const _CompactOrgSelector({
    required this.isDark,
    required this.meetingProvider,
    required this.selectedDeptId,
    required this.selectedTeamId,
    required this.selectedProjectId,
    required this.visibleTeams,
    required this.visibleProjects,
    required this.onDeptChanged,
    required this.onTeamChanged,
    required this.onProjectChanged,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);
    final cardColor = isDark ? const Color(0xFF111827) : Colors.white;
    const blue900 = Color(0xFF1E3A8A);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: blue900.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.business, color: blue900, size: 16),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  context.l10n('upload_organisation'),
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : const Color(0xFF111827),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 6),
              // Required badge on Project
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  context.l10n('upload_req_project'),
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: Colors.red[400],
                    letterSpacing: 0.3,
                  ),
                ),
              ),
            ],
          ),

          if (meetingProvider.orgLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            )
          else ...[
            const SizedBox(height: 12),

            // Row 1: Département + Équipe
            Row(
              children: [
                Expanded(
                  child: _MiniOrgDropdown(
                    isDark: isDark,
                    label: context.l10n('upload_department'),
                    icon: Icons.apartment_outlined,
                    value: selectedDeptId,
                    items: (meetingProvider.departments as List<OrgItem>),
                    onChanged: onDeptChanged,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _MiniOrgDropdown(
                    isDark: isDark,
                    label: context.l10n('upload_team'),
                    icon: Icons.group_outlined,
                    value: selectedTeamId,
                    items: visibleTeams,
                    enabled: visibleTeams.isNotEmpty || (meetingProvider.teams as List).isNotEmpty,
                    onChanged: onTeamChanged,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Row 2: Projet (full width, prominent, required)
            _MiniOrgDropdown(
              isDark: isDark,
              label: '${context.l10n('upload_project')} *',
              icon: Icons.folder_special_outlined,
              value: selectedProjectId,
              items: visibleProjects.isNotEmpty ? visibleProjects : (meetingProvider.projects as List<OrgItem>),
              isRequired: true,
              onChanged: onProjectChanged,
            ),
          ],
        ],
      ),
    );
  }
}

class _MiniOrgDropdown extends StatelessWidget {
  final bool isDark;
  final String label;
  final IconData icon;
  final String? value;
  final List<OrgItem> items;
  final ValueChanged<String?> onChanged;
  final bool enabled;
  final bool isRequired;

  const _MiniOrgDropdown({
    required this.isDark,
    required this.label,
    required this.icon,
    required this.value,
    required this.items,
    required this.onChanged,
    this.enabled = true,
    this.isRequired = false,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = isRequired && value == null
        ? Colors.red.withValues(alpha: 0.5)
        : (isDark ? const Color(0xFF374151) : const Color(0xFFD1D5DB));
    final fillColor = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final labelColor = isDark ? Colors.grey[400]! : Colors.grey[600]!;

    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.inter(fontSize: 11, color: labelColor),
        prefixIcon: Icon(icon, size: 16, color: isRequired ? const Color(0xFF1E3A8A) : Colors.grey[400]),
        filled: true,
        fillColor: fillColor,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: borderColor, width: isRequired && value == null ? 1.5 : 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 1.5),
        ),
      ),
      style: GoogleFonts.inter(
        fontSize: 12,
        color: isDark ? Colors.white : const Color(0xFF111827),
      ),
      dropdownColor: isDark ? const Color(0xFF1F2937) : Colors.white,
      items: [
        if (!isRequired)
          DropdownMenuItem<String>(
            value: null,
            child: Text('—', style: GoogleFonts.inter(fontSize: 12, color: labelColor)),
          ),
        ...items.map((item) => DropdownMenuItem<String>(
              value: item.id,
              child: Text(
                item.name,
                style: GoogleFonts.inter(fontSize: 12),
                overflow: TextOverflow.ellipsis,
              ),
            )),
      ],
      onChanged: enabled ? onChanged : null,
    );
  }
}
