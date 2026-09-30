import 'dart:async';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../models/models.dart';
import '../../providers/analytics_provider.dart';
import '../../providers/app_state.dart';
import '../../providers/meeting_provider.dart';
import '../../services/analytics_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/interactive_loading_widget.dart';
import '../../l10n/l10n.dart';

class BehavioralAnalyticsPage extends StatefulWidget {
  const BehavioralAnalyticsPage({super.key});

  @override
  State<BehavioralAnalyticsPage> createState() =>
      _BehavioralAnalyticsPageState();
}

class _BehavioralAnalyticsPageState extends State<BehavioralAnalyticsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _touchedIndex = -1;
  Timer? _pollTimer;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final meetingId = context.read<MeetingProvider>().activeMeetingId ?? '';
      _startLoad(meetingId);
    });
  }

  Future<void> _startLoad(String meetingId) async {
    final provider = context.read<AnalyticsProvider>();
    await provider.loadAnalytics(meetingId);
    if (mounted && !provider.hasInterpretation) {
      await provider.startInterpretationJob(meetingId);
      if (mounted && provider.isInterpreting) {
        _startPolling(meetingId);
      }
    }
  }

  void _startPolling(String meetingId) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final provider = context.read<AnalyticsProvider>();
      final done = await provider.pollInterpretationJob(meetingId);
      if (done) timer.cancel();
    });
  }

  Future<void> _handleSaveAndNavigateToArchive() async {
    setState(() => _isSaving = true);
    final meetingId = context.read<MeetingProvider>().activeMeetingId ?? '';

    try {
      final analyticsProvider = context.read<AnalyticsProvider>();
      if (meetingId.isNotEmpty && analyticsProvider.rawAnalyticsData != null) {
        final interp = analyticsProvider.rawAnalyticsData!['interpretation'];
        if (interp is Map<String, dynamic>) {
          await AnalyticsService().saveInterpretationToSymfony(meetingId, interp);
        }
      }

      // Refresh meetings list in background
      if (mounted) {
        context.read<MeetingProvider>().loadMeetings();
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Analyse enregistrée avec succès',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                ),
              ],
            ),
            backgroundColor: AppTheme.emerald,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            duration: const Duration(seconds: 2),
          ),
        );

        context.go('/archive');
      }
    } catch (_) {
      if (mounted) {
        context.go('/archive');
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _pollTimer?.cancel();
    super.dispose();
  }

  Color _hexColor(String hex) {
    final h = hex.replaceAll('#', '');
    try {
      return Color(int.parse('FF$h', radix: 16));
    } catch (_) {
      return AppTheme.primaryBlue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final appState = context.watch<AppState>();
    final analyticsProvider = context.watch<AnalyticsProvider>();
    final meetingProvider = context.watch<MeetingProvider>();

    final title = meetingProvider.selectedMeetingDetail?.title ?? 'Analyse Comportementale';

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(context.l10n('analytics_title'),
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.w800, fontSize: 17)),
            Text(title,
                style:
                    GoogleFonts.inter(fontSize: 11, color: Colors.grey[400])),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
                appState.darkMode
                    ? Icons.light_mode_outlined
                    : Icons.dark_mode_outlined,
                size: 20),
            onPressed: appState.toggleDarkMode,
          ),
          if (!analyticsProvider.isInterpreting && !analyticsProvider.isLoading)
            IconButton(
              icon: Icon(
                Icons.bookmark_added_rounded,
                color: isDark ? const Color(0xFF60A5FA) : AppTheme.primaryBlue,
                size: 22,
              ),
              tooltip: 'Enregistrer et aller aux archives',
              onPressed: _isSaving ? null : _handleSaveAndNavigateToArchive,
            ),
        ],
      bottom: analyticsProvider.isInterpreting
          ? null
          : TabBar(
              controller: _tabController,
              labelStyle:
                  GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13),
              unselectedLabelStyle:
                  GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 13),
              indicatorColor: AppTheme.primaryBlue,
              labelColor: AppTheme.primaryBlue,
              unselectedLabelColor: Colors.grey[500],
              tabs: [
                Tab(text: context.l10n('analytics_tab_overview')),
                Tab(text: context.l10n('analytics_tab_speakers')),
              ],
            ),
      ),
      body: analyticsProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : analyticsProvider.isInterpreting
              ? _buildInterpretingProgressView(analyticsProvider)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _SummaryTab(
                        isDark: isDark,
                        touchedIndex: _touchedIndex,
                        onTouch: (i) => setState(() => _touchedIndex = i),
                        hexColor: _hexColor),
                    _SpeakersTab(isDark: isDark),
                  ],
                ),
      bottomNavigationBar: analyticsProvider.isInterpreting || analyticsProvider.isLoading
          ? null
          : Container(
              padding: EdgeInsets.fromLTRB(16, 10, 16, 12 + MediaQuery.of(context).padding.bottom),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF111827) : Colors.white,
                border: Border(
                  top: BorderSide(
                    color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
                    width: 0.5,
                  ),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.05),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _isSaving ? null : _handleSaveAndNavigateToArchive,
                  icon: _isSaving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.bookmark_added_rounded, size: 20),
                  label: Text(
                    _isSaving ? 'Enregistrement…' : 'Enregistrer',
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryBlue,
                    foregroundColor: Colors.white,
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildInterpretingProgressView(AnalyticsProvider provider) {
    final l = context.l10n;
    return InteractiveLoadingWidget(
      progress: 0.0,
      stepLabel: provider.interpretStep,
      title: l('analytics_interpreting'),
      subtitle: l('analytics_interpreting_sub'),
      cancelLabel: l('loading_cancel').toUpperCase(),
      onCancel: () {
        _pollTimer?.cancel();
        context.read<AnalyticsProvider>().cancelInterpretation();
        if (mounted) {
          context.pop();
        }
      },
    );
  }
}

// ─── Summary Tab ────────────────────────────────────────────────────────────
class _SummaryTab extends StatelessWidget {
  final bool isDark;
  final int touchedIndex;
  final void Function(int) onTouch;
  final Color Function(String) hexColor;

  const _SummaryTab(
      {required this.isDark,
      required this.touchedIndex,
      required this.onTouch,
      required this.hexColor});

  @override
  Widget build(BuildContext context) {
    final analyticsProvider = context.watch<AnalyticsProvider>();
    final meetingProvider = context.watch<MeetingProvider>();
    final detail = meetingProvider.selectedMeetingDetail;

    final dynamicsText = analyticsProvider.meetingDynamics;
    final summaryMetrics = analyticsProvider.summaryMetrics;

    final talkTimeList = analyticsProvider.talkTimeDistribution.isNotEmpty
        ? analyticsProvider.talkTimeDistribution
        : [
            const TalkTimeEntry(name: 'Speaker A', value: 65, color: '#3B82F6'),
            const TalkTimeEntry(name: 'Speaker B', value: 35, color: '#10B981'),
          ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Meeting info bar
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF111827) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: isDark
                      ? const Color(0xFF1F2937)
                      : const Color(0xFFE5E7EB)),
            ),
            child: Row(
              children: [
                Expanded(
                    child: _InfoPill(Icons.calendar_today_outlined,
                        detail?.date ?? 'Aujourd\'hui', isDark)),
                Expanded(
                    child: _InfoPill(
                        Icons.access_time_outlined,
                        detail != null ? detail.formattedDuration : '—',
                        isDark)),
                Expanded(
                    child: _InfoPill(
                        Icons.people_outline, '${analyticsProvider.speakers.length} Participants', isDark)),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // AI Global Dynamics Card
          if (dynamicsText.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDark
                      ? [const Color(0xFF0F172A), const Color(0xFF1E1B4B)]
                      : [const Color(0xFFEFF6FF), const Color(0xFFEEF2FF)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: isDark
                        ? const Color(0xFF312E81)
                        : const Color(0xFFC7D2FE)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.auto_awesome,
                          color: Color(0xFF6366F1), size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'DYNAMIQUE GLOBALE DU GROUPE (IA)',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: isDark ? const Color(0xFFA5B4FC) : const Color(0xFF4338CA),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    dynamicsText,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      height: 1.5,
                      fontWeight: FontWeight.w400,
                      color: isDark ? const Color(0xFFE0E7FF) : const Color(0xFF1E1B4B),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Summary Metrics Grid (Engagement, Equilibre, etc.)
          if (summaryMetrics.isNotEmpty) ...[
            Text('MÉTRIQUES CLÉS DU GROUPE',
                style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey[500],
                    letterSpacing: 0.8)),
            const SizedBox(height: 10),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 2.2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              children: [
                _MetricCard(
                  title: 'Engagement',
                  value: '${summaryMetrics['engagement'] ?? 0}%',
                  icon: Icons.bolt_outlined,
                  iconColor: Colors.amber,
                  isDark: isDark,
                ),
                _MetricCard(
                  title: 'Équilibre',
                  value: '${summaryMetrics['balance'] ?? 0}%',
                  icon: Icons.balance_outlined,
                  iconColor: Colors.blue,
                  isDark: isDark,
                ),
                _MetricCard(
                  title: 'Interventions',
                  value: '${summaryMetrics['interventions'] ?? 0}',
                  icon: Icons.forum_outlined,
                  iconColor: Colors.green,
                  isDark: isDark,
                ),
                _MetricCard(
                  title: 'Interruptions',
                  value: '${summaryMetrics['interruptions'] ?? 0}',
                  icon: Icons.warning_amber_outlined,
                  iconColor: Colors.redAccent,
                  isDark: isDark,
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Talk Time Pie chart
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF111827) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: isDark
                      ? const Color(0xFF1F2937)
                      : const Color(0xFFE5E7EB)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('RÉPARTITION DU TEMPS DE PAROLE',
                    style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.grey[500],
                        letterSpacing: 0.8)),
                const SizedBox(height: 16),
                SizedBox(
                  height: 200,
                  child: Row(
                    children: [
                      Expanded(
                        child: PieChart(
                          PieChartData(
                            borderData: FlBorderData(show: false),
                            sectionsSpace: 2,
                            centerSpaceRadius: 36,
                            sections: talkTimeList.asMap().entries.map((e) {
                              final i = e.key;
                              final d = e.value;
                              final isTouched = i == touchedIndex;
                              return PieChartSectionData(
                                color: hexColor(d.color),
                                value: d.value,
                                title: isTouched ? '${d.value.toInt()}%' : '',
                                radius: isTouched ? 65 : 55,
                                titleStyle: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: talkTimeList
                            .map((e) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: Row(children: [
                                    Container(
                                        width: 10,
                                        height: 10,
                                        margin: const EdgeInsets.only(right: 6),
                                        decoration: BoxDecoration(
                                            color: hexColor(e.color),
                                            borderRadius:
                                                BorderRadius.circular(3))),
                                    Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(e.name,
                                              style: GoogleFonts.inter(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: isDark
                                                      ? Colors.grey[200]
                                                      : Colors.grey[800])),
                                          Text('${e.value.toInt()}%',
                                              style: GoogleFonts.inter(
                                                  fontSize: 11,
                                                  color: Colors.grey[500])),
                                        ]),
                                  ]),
                                ))
                            .toList(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

// ─── Speakers Tab ─────────────────────────────────────────────────────────
class _SpeakersTab extends StatefulWidget {
  final bool isDark;
  const _SpeakersTab({required this.isDark});

  @override
  State<_SpeakersTab> createState() => _SpeakersTabState();
}

class _SpeakersTabState extends State<_SpeakersTab> {
  int _selectedSpeaker = 0;

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final analyticsProvider = context.watch<AnalyticsProvider>();
    final speakers = analyticsProvider.speakers;

    if (speakers.isEmpty) {
      return const Center(child: Text('Aucune donnée de speaker disponible.'));
    }

    final speaker = speakers[_selectedSpeaker < speakers.length ? _selectedSpeaker : 0];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Speaker selector chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: speakers.asMap().entries.map((e) {
                final isSelected = _selectedSpeaker == e.key;
                return GestureDetector(
                  onTap: () => setState(() => _selectedSpeaker = e.key),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme.primaryBlue
                          : (isDark
                              ? const Color(0xFF1F2937)
                              : const Color(0xFFF1F5F9)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(children: [
                      CircleAvatar(
                        radius: 12,
                        backgroundColor: Colors.white.withValues(alpha: 0.2),
                        child: Text(e.value.initials,
                            style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: isSelected ? Colors.white : Colors.grey[700])),
                      ),
                      const SizedBox(width: 8),
                      Text(e.value.name,
                          style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? Colors.white : Colors.grey[700])),
                    ]),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          // Speaker header card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF111827) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: AppTheme.primaryBlue.withValues(alpha: 0.15),
                  child: Text(
                    speaker.initials,
                    style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primaryBlue),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        speaker.name,
                        style: GoogleFonts.inter(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF111827)),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          speaker.role,
                          style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primaryBlue),
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${speaker.talkTime.toInt()}%',
                      style: GoogleFonts.inter(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF111827)),
                    ),
                    Text(
                      'Temps de parole',
                      style: GoogleFonts.inter(fontSize: 10, color: Colors.grey[500]),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Primary Metrics Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF111827) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('INDICATEURS DE PAROLE & STRESS',
                    style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.grey[500],
                        letterSpacing: 0.8)),
                const SizedBox(height: 14),

                _ProgressBarMetric(
                  label: 'Monopolisation',
                  value: speaker.monopolization,
                  color: Colors.amber[700]!,
                  isDark: isDark,
                ),
                const SizedBox(height: 12),
                _ProgressBarMetric(
                  label: 'Niveau de stress vocale',
                  value: speaker.stress,
                  color: Colors.redAccent,
                  isDark: isDark,
                ),
                const SizedBox(height: 12),
                _ProgressBarMetric(
                  label: 'Fragmentation',
                  value: speaker.fragmentation,
                  color: Colors.blueGrey,
                  isDark: isDark,
                ),
                const Divider(height: 24),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _DetailStatPill(
                      label: 'Interventions',
                      value: '${speaker.interventions} tours',
                      icon: Icons.chat_bubble_outline,
                      isDark: isDark,
                    ),
                    _DetailStatPill(
                      label: 'Interruptions F/S',
                      value: '${speaker.interruptionsGiven} / ${speaker.interruptionsReceived}',
                      icon: Icons.block,
                      isDark: isDark,
                    ),
                    _DetailStatPill(
                      label: 'Durée moy.',
                      value: '${speaker.avgDuration.toStringAsFixed(1)}s',
                      icon: Icons.timer_outlined,
                      isDark: isDark,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // AI Profile & Psychological Analysis Card
          if (speaker.profileSummary.isNotEmpty || speaker.psychologicalAnalysis.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF111827) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.psychology, color: Color(0xFF10B981), size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'PROFIL IA & ANALYSE PSYCHOLOGIQUE',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF10B981),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  if (speaker.profileSummary.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      speaker.profileSummary,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.grey[200] : const Color(0xFF111827),
                      ),
                    ),
                  ],
                  if (speaker.psychologicalAnalysis.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      speaker.psychologicalAnalysis,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        height: 1.5,
                        color: isDark ? Colors.grey[300] : Colors.grey[700],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Vocal Signature Card
          if (speaker.vocalSignature.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF111827) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.graphic_eq, color: Colors.indigoAccent, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'SIGNATURE VOCALE',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Colors.indigoAccent,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    speaker.vocalSignature,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      height: 1.5,
                      color: isDark ? Colors.grey[300] : Colors.grey[700],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Strengths & Areas to Watch
          if (speaker.strengths.isNotEmpty || speaker.areasToWatch.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF111827) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (speaker.strengths.isNotEmpty) ...[
                    Row(
                      children: [
                        const Icon(Icons.check_circle_outline, color: Colors.green, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'FORCES',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ...speaker.strengths.map((s) => Padding(
                          padding: const EdgeInsets.only(left: 22, bottom: 4),
                          child: Text('• $s',
                              style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: isDark ? Colors.grey[300] : Colors.grey[700])),
                        )),
                    const SizedBox(height: 10),
                  ],
                  if (speaker.areasToWatch.isNotEmpty) ...[
                    Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: Colors.orangeAccent, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'AXES DE VIGILANCE',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Colors.orangeAccent,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ...speaker.areasToWatch.map((s) => Padding(
                          padding: const EdgeInsets.only(left: 22, bottom: 4),
                          child: Text('• $s',
                              style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: isDark ? Colors.grey[300] : Colors.grey[700])),
                        )),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // AI Recommendation Card
          if (speaker.recommendation.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFFDE68A)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.lightbulb_outline, color: Colors.amber, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'RECOMMANDATION IA',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Colors.amber[800],
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    speaker.recommendation,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      height: 1.5,
                      color: isDark ? Colors.grey[200] : const Color(0xFF78350F),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Communication Style Quote
          if (speaker.styleQuote.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF111827) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.format_quote, color: Colors.grey, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'STYLE DE COMMUNICATION',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '"${speaker.styleQuote}"',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontStyle: FontStyle.italic,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.grey[200] : const Color(0xFF111827),
                    ),
                  ),
                  if (speaker.styleDescription.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      speaker.styleDescription,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],

          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

// ─── Metric Card Helper Widget ────────────────────────────────────────────────
class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color iconColor;
  final bool isDark;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.iconColor,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF111827),
                  ),
                ),
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: Colors.grey[500],
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Progress Bar Metric Widget ──────────────────────────────────────────────
class _ProgressBarMetric extends StatelessWidget {
  final String label;
  final double value;
  final Color color;
  final bool isDark;

  const _ProgressBarMetric({
    required this.label,
    required this.value,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final pct = value.clamp(0.0, 100.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.grey[300] : Colors.grey[700],
              ),
            ),
            Text(
              '${pct.toInt()}%',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct / 100.0,
            minHeight: 6,
            backgroundColor: isDark ? const Color(0xFF1F2937) : const Color(0xFFF1F5F9),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}

// ─── Detail Stat Pill Widget ─────────────────────────────────────────────────
class _DetailStatPill extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final bool isDark;

  const _DetailStatPill({
    required this.label,
    required this.value,
    required this.icon,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Icon(icon, size: 12, color: Colors.grey[500]),
            const SizedBox(width: 4),
            Text(
              label,
              style: GoogleFonts.inter(fontSize: 10, color: Colors.grey[500]),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.grey[200] : const Color(0xFF111827),
          ),
        ),
      ],
    );
  }
}

class _InfoPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDark;
  const _InfoPill(this.icon, this.label, this.isDark);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppTheme.primaryBlue),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.grey[300] : Colors.grey[700],
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
