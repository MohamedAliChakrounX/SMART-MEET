import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../models/models.dart';
import '../../providers/analytics_provider.dart';
import '../../providers/app_state.dart';
import '../../providers/meeting_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/pv_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/interactive_loading_widget.dart';
import '../../l10n/l10n.dart';

class RefineSummaryPage extends StatefulWidget {
  const RefineSummaryPage({super.key});

  @override
  State<RefineSummaryPage> createState() => _RefineSummaryPageState();
}

class _RefineSummaryPageState extends State<RefineSummaryPage> {
  Timer? _pollTimer;
  late TextEditingController _titleController;
  late TextEditingController _dateController;
  late TextEditingController _timeStartController;
  late TextEditingController _timeEndController;
  late TextEditingController _locationController;
  late TextEditingController _facilitatorController;
  bool _controllersInitialized = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _dateController = TextEditingController();
    _timeStartController = TextEditingController();
    _timeEndController = TextEditingController();
    _locationController = TextEditingController();
    _facilitatorController = TextEditingController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final meetingId = context.read<MeetingProvider>().activeMeetingId ?? '';
      _startLoad(meetingId);
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _titleController.dispose();
    _dateController.dispose();
    _timeStartController.dispose();
    _timeEndController.dispose();
    _locationController.dispose();
    _facilitatorController.dispose();
    super.dispose();
  }

  Future<void> _startLoad(String meetingId) async {
    final pvProvider = context.read<PVProvider>();
    await pvProvider.loadSummary(meetingId);
    if (mounted && pvProvider.isGenerating) {
      _startPolling(meetingId);
    }
  }

  void _startPolling(String meetingId) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (!mounted) { timer.cancel(); return; }
      final pvProvider = context.read<PVProvider>();
      final notifProvider = context.read<NotificationProvider>();
      final done = await pvProvider.pollGenerateStatus(
        meetingId,
        onCompleted: () {
          notifProvider.notify(
            title: 'Procès-Verbal Généré ✓',
            message: 'Votre PV est prêt à être révisé et enregistré.',
            type: AppNotificationType.success,
          );
        },
        onError: () {
          notifProvider.notify(
            title: 'Erreur de Génération',
            message: 'La génération du PV a échoué. Veuillez réessayer.',
            type: AppNotificationType.error,
          );
        },
      );
      if (done) timer.cancel();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final appState = context.watch<AppState>();
    final pvProvider = context.watch<PVProvider>();
    final meetingProvider = context.watch<MeetingProvider>();

    final hideSteps =
        GoRouterState.of(context).uri.queryParameters['hideSteps'] == 'true';

    final detail = meetingProvider.selectedMeetingDetail;
    final pvContent = pvProvider.pvData['content'];

    // Initialize controllers once data is available
    if (!_controllersInitialized && (detail != null || pvProvider.pvData.isNotEmpty)) {
      final String initialTitle = detail?.title ?? pvProvider.pvData['title'] ?? '';
      final String initialDate = pvContent?['date'] ?? detail?.date ?? pvProvider.pvData['date'] ?? '';
      final String initialStart = pvContent?['startTime'] ?? detail?.startTime ?? '09:00';
      final String initialEnd = pvContent?['endTime'] ?? detail?.endTime ?? '10:00';
      final String initialLoc = pvContent?['location'] ?? detail?.location ?? 'Salle SFM';
      final String initialFac = pvContent?['facilitator'] ?? detail?.facilitator ?? 'Animateur';

      _titleController.text = initialTitle;
      _dateController.text = initialDate;
      _timeStartController.text = initialStart;
      _timeEndController.text = initialEnd;
      _locationController.text = initialLoc;
      _facilitatorController.text = initialFac;
      _controllersInitialized = true;
    }

    // Retrieve participants list from matching meeting
    final activeMeetingId = meetingProvider.activeMeetingId;
    final activeMeeting = meetingProvider.meetings.firstWhere(
      (m) => m.id == activeMeetingId,
      orElse: () => const Meeting(
          id: '',
          title: '',
          category: '',
          date: '',
          duration: '',
          description: '',
          participants: [],
          starred: false),
    );

    // Dynamic participants list from multiple fallback sources
    final List<String> participants = [];
    if (detail != null && detail.participants.isNotEmpty) {
      participants.addAll(detail.participants);
    } else if (activeMeeting.participants.isNotEmpty) {
      participants.addAll(activeMeeting.participants);
    } else if (pvProvider.pvData['participants'] is List) {
      final list = pvProvider.pvData['participants'] as List;
      for (var item in list) {
        if (item is Map) {
          final name = item['name']?.toString() ?? '';
          if (name.isNotEmpty) participants.add(name);
        } else if (item is String) {
          participants.add(item);
        }
      }
    }

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Procès-Verbal',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 17),
        ),
        actions: [
          if (!hideSteps) const _StepIndicator(currentStep: 3),
          const SizedBox(width: 4),
          // Open settings sidebar (parameters for regeneration)
          if (activeMeetingId != null)
            Builder(
              builder: (ctx) => IconButton(
                icon: const Icon(Icons.tune, size: 22),
                tooltip: 'Paramètres de régénération',
                onPressed: () => Scaffold.of(ctx).openEndDrawer(),
              ),
            ),
          IconButton(
            icon: Icon(
                appState.darkMode
                    ? Icons.light_mode_outlined
                    : Icons.dark_mode_outlined,
                size: 20),
            onPressed: appState.toggleDarkMode,
          ),
          const SizedBox(width: 8),
        ],
      ),
      // Slide-out sidebar with PV generation parameters
      endDrawer: activeMeetingId != null
          ? Drawer(
              width: MediaQuery.of(context).size.width * 0.82,
              child: _RegenerationSettingsPanel(
                activeMeetingId: activeMeetingId,
                pvProvider: pvProvider,
                onRegenerateStarted: () {
                  Navigator.of(context).pop(); // close drawer
                  _startPolling(activeMeetingId);
                },
              ),
            )
          : null,
      body: _isSaving
          ? InteractiveLoadingWidget(
              progress: 0.0,
              stepLabel: context.l10n('loading_saving_step'),
              title: context.l10n('loading_saving'),
              subtitle: context.l10n('loading_saving_sub'),
              cancelLabel: context.l10n('loading_cancel').toUpperCase(),
              onCancel: () {},
            )
          : pvProvider.isLoading
              ? const Center(child: CircularProgressIndicator())
              : pvProvider.isGenerating
                  ? _buildGeneratingView(pvProvider)
                  : SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _MeetingHeader(
                        titleController: _titleController,
                        dateController: _dateController,
                        timeStartController: _timeStartController,
                        timeEndController: _timeEndController,
                        locationController: _locationController,
                        facilitatorController: _facilitatorController,
                      ),
                      const SizedBox(height: 20),
                      _ParticipantsSection(participants: participants),
                      const SizedBox(height: 20),
                      _ExecutiveSummary(summaryText: pvProvider.summaryText),
                      const SizedBox(height: 20),
                      _DecisionsSection(decisions: pvProvider.decisions),
                      const SizedBox(height: 20),
                      _ActionsSection(actionItems: pvProvider.actionItems),
                      const SizedBox(height: 100),
                    ],
                  ),
                ),
      bottomNavigationBar: _isSaving || hideSteps || pvProvider.isGenerating
          ? null
          : Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.scaffoldBackgroundColor,
                border: Border(top: BorderSide(color: theme.dividerColor)),
              ),
              child: ElevatedButton(
                onPressed: () async {
                  // Instantly show the loading overlay — eliminates flicker back to form
                  setState(() => _isSaving = true);

                  final meetingId = meetingProvider.activeMeetingId ?? '';

                  // 1. Save edits to Flask/Symfony
                  final success = await pvProvider.saveSummaryToServer(
                    meetingId,
                    title: _titleController.text,
                    date: _dateController.text,
                    startTime: _timeStartController.text,
                    endTime: _timeEndController.text,
                    location: _locationController.text,
                    facilitator: _facilitatorController.text,
                  );

                  if (!context.mounted) return;

                  if (!success) {
                    setState(() => _isSaving = false);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(pvProvider.error ?? 'Erreur de sauvegarde.'),
                        backgroundColor: Colors.red[700],
                      ),
                    );
                    return;
                  }

                  // 2. Persist to Symfony DB if not yet a UUID (new Flask meeting)
                  final analyticsProvider = context.read<AnalyticsProvider>();
                  if (analyticsProvider.rawAnalyticsData == null && meetingId.isNotEmpty) {
                    try {
                      await analyticsProvider.loadAnalytics(meetingId);
                    } catch (_) {}
                  }

                  final newUuid = await meetingProvider.persistActiveMeetingToSymfony(
                    title: _titleController.text,
                    date: _dateController.text,
                    summaryText: pvProvider.summaryText,
                    decisions: pvProvider.decisions,
                    actionItems: pvProvider.actionItems,
                    pvData: pvProvider.pvData,
                    participants: participants,
                    analytics: analyticsProvider.rawAnalyticsData ?? {},
                  );

                  if (!context.mounted) return;

                  if (newUuid != null) {
                    context.read<NotificationProvider>().notify(
                      title: context.l10n('pv_saved'),
                      message: context.l10n('pv_saved_msg'),
                      type: AppNotificationType.success,
                    );
                  }

                  // 3. Navigate directly to behavioral analytics
                  context.go('/analytics');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryBlue,
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle_outline, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(context.l10n('pv_validate'),
                        style: GoogleFonts.inter(
                            color: Colors.white, fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildGeneratingView(dynamic pvProvider) {
    final l = context.l10n;
    return InteractiveLoadingWidget(
      progress: (pvProvider.generateProgress as double).clamp(0.0, 1.0),
      stepLabel: pvProvider.generateStep as String,
      title: l('loading_pv'),
      subtitle: l('loading_pv_sub'),
      cancelLabel: l('loading_cancel').toUpperCase(),
      onCancel: () {
        _pollTimer?.cancel();
        pvProvider.cancelGeneration();
      },
    );
  }
}

class _MeetingHeader extends StatelessWidget {
  final TextEditingController titleController;
  final TextEditingController dateController;
  final TextEditingController timeStartController;
  final TextEditingController timeEndController;
  final TextEditingController locationController;
  final TextEditingController facilitatorController;

  const _MeetingHeader({
    required this.titleController,
    required this.dateController,
    required this.timeStartController,
    required this.timeEndController,
    required this.locationController,
    required this.facilitatorController,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'PROCÈS-VERBAL OFFICIEL',
                  style: GoogleFonts.inter(
                    color: AppTheme.primaryBlue,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              Text(
                'SFM',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.primaryBlue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Editable Title Field
          TextFormField(
            controller: titleController,
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : const Color(0xFF111827),
            ),
            decoration: const InputDecoration(
              border: InputBorder.none,
              hintText: 'Titre de la réunion',
              contentPadding: EdgeInsets.zero,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Code: FOR-01-SFM-2026  |  Version: 01',
            style: GoogleFonts.inter(color: Colors.grey[500], fontSize: 10),
          ),
          const Divider(height: 24),
          
          // Details Grid (made of sleek editable text boxes)
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 2.8,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            children: [
              _HeaderInputField(
                label: 'DATE',
                controller: dateController,
                icon: Icons.calendar_today_outlined,
                onTap: () async {
                  final DateTime? picked = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime(2020),
                    lastDate: DateTime(2030),
                  );
                  if (picked != null) {
                    dateController.text = picked.toIso8601String().substring(0, 10);
                  }
                },
              ),
              _HeaderInputField(
                label: 'HEURE DÉBUT',
                controller: timeStartController,
                icon: Icons.access_time_outlined,
                onTap: () async {
                  final TimeOfDay? picked = await showTimePicker(
                    context: context,
                    initialTime: const TimeOfDay(hour: 9, minute: 0),
                  );
                  if (picked != null) {
                    timeStartController.text = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
                  }
                },
              ),
              _HeaderInputField(
                label: 'HEURE FIN',
                controller: timeEndController,
                icon: Icons.access_time_filled_outlined,
                onTap: () async {
                  final TimeOfDay? picked = await showTimePicker(
                    context: context,
                    initialTime: const TimeOfDay(hour: 10, minute: 0),
                  );
                  if (picked != null) {
                    timeEndController.text = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
                  }
                },
              ),
              _HeaderInputField(
                label: 'LIEU',
                controller: locationController,
                icon: Icons.map_outlined,
              ),
              _HeaderInputField(
                label: 'FACILITATEUR',
                controller: facilitatorController,
                icon: Icons.person_outline,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeaderInputField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final IconData icon;
  final VoidCallback? onTap;

  const _HeaderInputField({
    required this.label,
    required this.controller,
    required this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB),
          width: 0.8,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, size: 14, color: AppTheme.primaryBlue),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 7,
                    fontWeight: FontWeight.w800,
                    color: Colors.grey[500],
                    letterSpacing: 0.5,
                  ),
                ),
                Expanded(
                  child: TextFormField(
                    controller: controller,
                    readOnly: onTap != null,
                    onTap: onTap,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.grey[200] : const Color(0xFF1F2937),
                    ),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                      isDense: true,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RegenerationSettingsPanel extends StatefulWidget {
  final String activeMeetingId;
  final dynamic pvProvider;
  final VoidCallback onRegenerateStarted;

  const _RegenerationSettingsPanel({
    required this.activeMeetingId,
    required this.pvProvider,
    required this.onRegenerateStarted,
  });

  @override
  State<_RegenerationSettingsPanel> createState() => _RegenerationSettingsPanelState();
}

class _RegenerationSettingsPanelState extends State<_RegenerationSettingsPanel> {
  String _selectedModel = 'mistral:7b-instruct-q4_K_M';
  String _selectedLanguage = 'default';
  String _selectedFormat = 'standard';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    final cardBg = isDark ? const Color(0xFF1E293B) : Colors.white;

    return Container(
      color: bg,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Modern Gradient Drawer Header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 24, 12, 20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primaryBlue, const Color(0xFF1D4ED8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.tune, color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Configuration IA',
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SidebarSectionLabel('MODÈLE IA'),
                    const SizedBox(height: 10),
                    ..._buildRadioGroup<String>(
                      values: const [
                        ('mistral:7b-instruct-q4_K_M', 'Mistral 7B', 'Précis, modèle par défaut'),
                        ('qwen3:4b', 'Qwen 3 4B', 'Rapide et économe'),
                        ('llama3:8b', 'LLaMA 3 8B', 'Polyvalent, exhaustif'),
                      ],
                      selected: _selectedModel,
                      onChanged: (v) => setState(() => _selectedModel = v),
                      isDark: isDark,
                      cardBg: cardBg,
                    ),
                    const SizedBox(height: 24),
                    _SidebarSectionLabel('LANGUE DU PV'),
                    const SizedBox(height: 10),
                    ..._buildRadioGroup<String>(
                      values: const [
                        ('default', 'Langue d\'origine', 'Conserve la langue parlée'),
                        ('FR', 'Français', 'Génère le document en français'),
                        ('EN', 'English', 'Génère le document en anglais'),
                      ],
                      selected: _selectedLanguage,
                      onChanged: (v) => setState(() => _selectedLanguage = v),
                      isDark: isDark,
                      cardBg: cardBg,
                    ),
                    const SizedBox(height: 24),
                    _SidebarSectionLabel('FORMAT DE SORTIE'),
                    const SizedBox(height: 10),
                    ..._buildRadioGroup<String>(
                      values: const [
                        ('court', 'Court', 'Synthétique et concis'),
                        ('standard', 'Standard', 'Équilibré et complet'),
                        ('detaille', 'Détaillé', 'Riche en détails d\'interventions'),
                      ],
                      selected: _selectedFormat,
                      onChanged: (v) => setState(() => _selectedFormat = v),
                      isDark: isDark,
                      cardBg: cardBg,
                    ),
                    const SizedBox(height: 32),
                    Container(
                      decoration: BoxDecoration(
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryBlue.withOpacity(0.3),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          )
                        ],
                      ),
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          widget.onRegenerateStarted();
                          widget.pvProvider.generateSummary(
                            widget.activeMeetingId,
                            language: _selectedLanguage,
                            model: _selectedModel,
                            format: _selectedFormat,
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryBlue,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        icon: const Icon(Icons.refresh_rounded, color: Colors.white, size: 18),
                        label: Text(
                          'RÉGÉNÉRER LE PV',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildRadioGroup<T>({
    required List<(T, String, String)> values,
    required T selected,
    required ValueChanged<T> onChanged,
    required bool isDark,
    required Color cardBg,
  }) {
    return values.map((entry) {
      final (val, title, subtitle) = entry;
      final isSelected = val == selected;
      return GestureDetector(
        onTap: () => onChanged(val),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.primaryBlue.withOpacity(isDark ? 0.15 : 0.06)
                : cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected
                  ? AppTheme.primaryBlue
                  : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected ? AppTheme.primaryBlue : (isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1)),
                    width: 2,
                  ),
                  color: isSelected ? AppTheme.primaryBlue : Colors.transparent,
                ),
                child: isSelected
                    ? const Icon(Icons.check, color: Colors.white, size: 12)
                    : null,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: isDark ? Colors.white : const Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }).toList();
  }
}

class _HeaderInfoItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _HeaderInfoItem({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey[400]),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                    fontSize: 8,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey[500],
                    letterSpacing: 0.5),
              ),
              Text(
                value,
                style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).brightness == Brightness.dark
                        ? Colors.grey[300]
                        : const Color(0xFF1F2937)),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ParticipantsSection extends StatelessWidget {
  final List<String> participants;
  const _ParticipantsSection({required this.participants});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'PARTICIPANTS',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Colors.grey[500],
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 10),
          if (participants.isEmpty)
            Text(
              'Aucun participant enregistré.',
              style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[500]),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: participants.map((p) {
                return Chip(
                  avatar: CircleAvatar(
                    backgroundColor: AppTheme.primaryBlue.withOpacity(0.15),
                    child: Text(
                      p.isNotEmpty ? p[0].toUpperCase() : 'P',
                      style: GoogleFonts.inter(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primaryBlue),
                    ),
                  ),
                  label: Text(
                    p,
                    style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.grey[300] : const Color(0xFF374151)),
                  ),
                  backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF3F4F6),
                  side: BorderSide.none,
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }
}

class _ExecutiveSummary extends StatefulWidget {
  final String summaryText;
  const _ExecutiveSummary({required this.summaryText});

  @override
  State<_ExecutiveSummary> createState() => _ExecutiveSummaryState();
}

class _ExecutiveSummaryState extends State<_ExecutiveSummary> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.summaryText);
  }

  @override
  void didUpdateWidget(covariant _ExecutiveSummary oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.summaryText != widget.summaryText && _controller.text != widget.summaryText) {
      _controller.text = widget.summaryText;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'SYNTHÈSE DE LA RÉUNION',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey[500],
                  letterSpacing: 1,
                ),
              ),
              Icon(Icons.edit_note, size: 16, color: Colors.grey[400]),
            ],
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _controller,
            maxLines: null,
            style: GoogleFonts.inter(
              height: 1.6,
              fontSize: 13,
              color: isDark ? Colors.grey[300] : Colors.grey[700],
            ),
            decoration: const InputDecoration(
              border: InputBorder.none,
              hintText: 'Saisir le résumé de la réunion...',
              contentPadding: EdgeInsets.zero,
            ),
            onChanged: (val) {
              context.read<PVProvider>().updateLocalSummaryText(val);
            },
          ),
        ],
      ),
    );
  }
}

class _SidebarSectionLabel extends StatelessWidget {
  final String text;
  const _SidebarSectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: GoogleFonts.inter(
        fontSize: 10,
        fontWeight: FontWeight.w800,
        color: AppTheme.primaryBlue,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _DecisionsSection extends StatelessWidget {
  final List<String> decisions;
  const _DecisionsSection({required this.decisions});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pvProvider = context.read<PVProvider>();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.bookmark_added_outlined, color: Color(0xFF10B981), size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'DÉCISIONS CLÉS & POINTS TRAITÉS',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey[500],
                    letterSpacing: 1,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (decisions.isEmpty)
            Text(
              'Aucune décision clé consignée.',
              style: GoogleFonts.inter(
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                  color: Colors.grey[500]),
            )
          else
            ...decisions.asMap().entries.map((entry) {
              final index = entry.key;
              final decision = entry.value;
              return _EditableDecisionRow(
                key: ValueKey('decision_$index'),
                index: index,
                text: decision,
                isDark: isDark,
                onChanged: (val) {
                  final list = List<String>.from(pvProvider.decisions);
                  list[index] = val;
                  pvProvider.updateLocalDecisions(list);
                },
                onDelete: () {
                  final list = List<String>.from(pvProvider.decisions);
                  list.removeAt(index);
                  pvProvider.updateLocalDecisions(list);
                },
              );
            }),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: () {
              final list = List<String>.from(pvProvider.decisions);
              list.add('');
              pvProvider.updateLocalDecisions(list);
            },
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF10B981),
              backgroundColor: const Color(0xFF10B981).withOpacity(0.08),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.add, size: 16),
            label: Text(
              'Ajouter une décision',
              style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _EditableDecisionRow extends StatefulWidget {
  final int index;
  final String text;
  final bool isDark;
  final ValueChanged<String> onChanged;
  final VoidCallback onDelete;

  const _EditableDecisionRow({
    super.key,
    required this.index,
    required this.text,
    required this.isDark,
    required this.onChanged,
    required this.onDelete,
  });

  @override
  State<_EditableDecisionRow> createState() => _EditableDecisionRowState();
}

class _EditableDecisionRowState extends State<_EditableDecisionRow> {
  late TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.text);
  }

  @override
  void didUpdateWidget(covariant _EditableDecisionRow old) {
    super.didUpdateWidget(old);
    if (old.text != widget.text && _ctrl.text != widget.text) {
      _ctrl.text = widget.text;
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Padding(
            padding: EdgeInsets.only(right: 8),
            child: Icon(Icons.check_circle, color: Color(0xFF10B981), size: 14),
          ),
          Expanded(
            child: TextFormField(
              controller: _ctrl,
              maxLines: null,
              style: GoogleFonts.inter(
                fontSize: 13,
                height: 1.4,
                color: widget.isDark ? Colors.grey[300] : Colors.grey[700],
              ),
              decoration: InputDecoration(
                border: InputBorder.none,
                hintText: 'Saisir une décision...',
                hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
                contentPadding: EdgeInsets.zero,
                isDense: true,
              ),
              onChanged: widget.onChanged,
            ),
          ),
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            icon: const Icon(Icons.delete_outline, size: 16, color: Colors.red),
            onPressed: widget.onDelete,
          ),
        ],
      ),
    );
  }
}

class _ActionsSection extends StatelessWidget {
  final List<ActionItem> actionItems;
  const _ActionsSection({required this.actionItems});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pvProvider = context.watch<PVProvider>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.assignment_turned_in_outlined,
                color: AppTheme.primaryBlue, size: 20),
            const SizedBox(width: 8),
            Text(
              'PLAN D\'ACTION & SUIVI',
              style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : const Color(0xFF111827)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (actionItems.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Text('Aucune action enregistrée.',
                style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600])),
          )
        else
          ...actionItems.asMap().entries.map((e) => _ActionCard(
                item: e.value,
                index: e.key,
              )),
        const SizedBox(height: 8),
        TextButton.icon(
          onPressed: () {
            final list = List<ActionItem>.from(pvProvider.actionItems);
            list.add(ActionItem(
              id: 'new_${DateTime.now().millisecondsSinceEpoch}',
              task: '',
              assignee: 'TBD',
              dueDate: DateTime.now().toIso8601String().substring(0, 10),
              status: 'En cours',
            ));
            pvProvider.updateLocalActionItems(list);
          },
          style: TextButton.styleFrom(
            foregroundColor: AppTheme.primaryBlue,
            backgroundColor: AppTheme.primaryBlue.withOpacity(0.08),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          icon: const Icon(Icons.add, size: 16),
          label: Text(
            'Ajouter une action',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13),
          ),
        ),
      ],
    );
  }
}

class _ActionCard extends StatefulWidget {
  final ActionItem item;
  final int index;
  const _ActionCard({required this.item, required this.index});

  @override
  State<_ActionCard> createState() => _ActionCardState();
}

class _ActionCardState extends State<_ActionCard> {
  late TextEditingController _taskController;
  late TextEditingController _assigneeController;

  @override
  void initState() {
    super.initState();
    _taskController = TextEditingController(text: widget.item.task);
    _assigneeController = TextEditingController(text: widget.item.assignee);
  }

  @override
  void didUpdateWidget(covariant _ActionCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.item.task != widget.item.task && _taskController.text != widget.item.task) {
      _taskController.text = widget.item.task;
    }
    if (oldWidget.item.assignee != widget.item.assignee && _assigneeController.text != widget.item.assignee) {
      _assigneeController.text = widget.item.assignee;
    }
  }

  @override
  void dispose() {
    _taskController.dispose();
    _assigneeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pvProvider = context.read<PVProvider>();

    // Normalize status values to show human friendly labels
    String displayStatus = 'En cours';
    if (widget.item.status == 'COMPLETED' || widget.item.status == 'Fait') {
      displayStatus = 'Fait';
    } else if (widget.item.status == 'PENDING' || widget.item.status == 'En attente') {
      displayStatus = 'En attente';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? const Color(0xFF1F2937) : Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'ACTION #${widget.index + 1}',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey[500],
                ),
              ),
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                onPressed: () {
                  final list = List<ActionItem>.from(pvProvider.actionItems);
                  list.removeAt(widget.index);
                  pvProvider.updateLocalActionItems(list);
                },
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: _taskController,
            maxLines: null,
            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
            decoration: const InputDecoration(
              labelText: 'Action / Tâche',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            ),
            onChanged: (val) {
              final list = List<ActionItem>.from(pvProvider.actionItems);
              list[widget.index] = ActionItem(
                id: widget.item.id,
                task: val,
                assignee: widget.item.assignee,
                dueDate: widget.item.dueDate,
                status: widget.item.status,
              );
              pvProvider.updateLocalActionItems(list);
            },
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _assigneeController,
                  style: GoogleFonts.inter(fontSize: 12),
                  decoration: const InputDecoration(
                    labelText: 'Responsable',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  ),
                  onChanged: (val) {
                    final list = List<ActionItem>.from(pvProvider.actionItems);
                    list[widget.index] = ActionItem(
                      id: widget.item.id,
                      task: widget.item.task,
                      assignee: val,
                      dueDate: widget.item.dueDate,
                      status: widget.item.status,
                    );
                    pvProvider.updateLocalActionItems(list);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final current = DateTime.tryParse(widget.item.dueDate) ?? DateTime.now();
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: current,
                      firstDate: DateTime(2000),
                      lastDate: DateTime(2100),
                    );
                    if (picked != null) {
                      final dateStr = picked.toIso8601String().substring(0, 10);
                      final list = List<ActionItem>.from(pvProvider.actionItems);
                      list[widget.index] = ActionItem(
                        id: widget.item.id,
                        task: widget.item.task,
                        assignee: widget.item.assignee,
                        dueDate: dateStr,
                        status: widget.item.status,
                      );
                      pvProvider.updateLocalActionItems(list);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: isDark ? const Color(0xFF374151) : Colors.grey[400]!),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          widget.item.dueDate.isEmpty ? 'Échéance' : widget.item.dueDate,
                          style: GoogleFonts.inter(fontSize: 12, color: widget.item.dueDate.isEmpty ? Colors.grey[500] : (isDark ? Colors.white : Colors.black)),
                        ),
                        const Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                'Statut : ',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey[500]),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    _buildStatusChip('En cours', Colors.blue, displayStatus == 'En cours'),
                    _buildStatusChip('Fait', Colors.green, displayStatus == 'Fait'),
                    _buildStatusChip('En attente', Colors.amber, displayStatus == 'En attente'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String label, MaterialColor colorFamily, bool isSelected) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = isSelected
        ? (isDark ? colorFamily[300]! : colorFamily[800]!)
        : (isDark ? Colors.grey[400]! : Colors.grey[600]!);
    final bgColor = isSelected
        ? (isDark ? colorFamily[900]!.withOpacity(0.3) : colorFamily[50]!)
        : Colors.transparent;
    final borderColor = isSelected
        ? (isDark ? colorFamily[700]! : colorFamily[200]!)
        : (isDark ? const Color(0xFF374151) : Colors.grey[300]!);

    return GestureDetector(
      onTap: () {
        final list = List<ActionItem>.from(context.read<PVProvider>().actionItems);
        list[widget.index] = ActionItem(
          id: widget.item.id,
          task: widget.item.task,
          assignee: widget.item.assignee,
          dueDate: widget.item.dueDate,
          status: label,
        );
        context.read<PVProvider>().updateLocalActionItems(list);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: borderColor, width: 1.5),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: color,
          ),
        ),
      ),
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
            child: Text('3',
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
