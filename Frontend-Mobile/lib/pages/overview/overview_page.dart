import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/app_state.dart';
import '../../providers/meeting_provider.dart';
import '../../theme/app_theme.dart';

class OverviewPage extends StatefulWidget {
  const OverviewPage({super.key});

  @override
  State<OverviewPage> createState() => _OverviewPageState();
}

class _OverviewPageState extends State<OverviewPage> {
  int _activeSection = 0;
  final _scrollController = ScrollController();
  final _sectionKeys = List.generate(3, (_) => GlobalKey());

  static const _sections = ['Vue d\'ensemble', 'Analytics', 'Transcription'];
  static const _sectionIcons = [
    Icons.dashboard_outlined,
    Icons.bar_chart_outlined,
    Icons.text_snippet_outlined
  ];

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final appState = context.watch<AppState>();
    final meetingProvider = context.watch<MeetingProvider>();

    final detail = meetingProvider.selectedMeetingDetail;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => context.go('/archive'),
        ),
        title: Text('Aperçu du PV',
            style:
                GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 17)),
        actions: [
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
          // Section tab bar
          Container(
            color: isDark ? const Color(0xFF111827) : Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: List.generate(_sections.length, (i) {
                  final isActive = _activeSection == i;
                  return GestureDetector(
                    onTap: () {
                      setState(() => _activeSection = i);
                      final ctx = _sectionKeys[i].currentContext;
                      if (ctx != null) {
                        Scrollable.ensureVisible(ctx,
                            duration: const Duration(milliseconds: 400),
                            curve: Curves.easeInOut,
                            alignment: 0.1);
                      }
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isActive
                            ? AppTheme.primaryBlue
                            : (isDark
                                ? const Color(0xFF1F2937)
                                : const Color(0xFFF1F5F9)),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Icon(_sectionIcons[i],
                              size: 14,
                              color: isActive
                                  ? Colors.white
                                  : (isDark
                                      ? Colors.grey[500]
                                      : Colors.grey[600])),
                          const SizedBox(width: 6),
                          Text(
                            _sections[i],
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isActive
                                  ? Colors.white
                                  : (isDark
                                      ? Colors.grey[500]
                                      : Colors.grey[600]),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),

          // Scrollable content
          Expanded(
            child: meetingProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    children: [
                      // ── Section 1: Meeting Info ──
                      _SectionCard(
                        key: _sectionKeys[0],
                        isDark: isDark,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Wrap(
                                    spacing: 8,
                                    runSpacing: 4,
                                    children: [
                                      _CategoryBadge('Meeting Detail',
                                          color: AppTheme.primaryBlue),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Text(
                              detail?.title ?? 'Revue de Réunion',
                              style: GoogleFonts.inter(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: isDark
                                      ? Colors.white
                                      : const Color(0xFF111827)),
                            ),
                            const SizedBox(height: 16),
                            Divider(
                                color: isDark
                                    ? const Color(0xFF1F2937)
                                    : const Color(0xFFE5E7EB)),
                            const SizedBox(height: 12),
                            Wrap(spacing: 20, runSpacing: 10, children: [
                              _MetaItem(Icons.calendar_today_outlined,
                                  detail?.date ?? 'Date', isDark),
                              _MetaItem(Icons.access_time_outlined,
                                  '${detail?.startTime ?? ''} - ${detail?.endTime ?? ''}', isDark),
                              _MetaItem(Icons.location_on_outlined,
                                  detail?.location ?? 'Lieu', isDark),
                            ]),
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: () =>
                                    context.push('/summary?hideSteps=true'),
                                icon: const Icon(Icons.arrow_forward, size: 16),
                                label: Text('Voir le PV détaillé',
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.w600, fontSize: 13)),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 13),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // ── Section 2: Behavioral Analytics Link ──
                      _SectionCard(
                        key: _sectionKeys[1],
                        isDark: isDark,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Analytics de la Réunion',
                                style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: isDark
                                        ? Colors.white
                                        : const Color(0xFF111827))),
                            const SizedBox(height: 8),
                            Text(
                              'Consultez la répartition du temps de parole, le sentiment et le profil des intervenants.',
                              style: GoogleFonts.inter(
                                  fontSize: 12, color: Colors.grey[500]),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: () => context.go('/analytics'),
                                icon: const Icon(Icons.arrow_forward, size: 16),
                                label: Text('Ouvrir les Analytics',
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.w600, fontSize: 13)),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 13),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // ── Section 3: Transcription Link ──
                      _SectionCard(
                        key: _sectionKeys[2],
                        isDark: isDark,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Transcription complète',
                                style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: isDark
                                        ? Colors.white
                                        : const Color(0xFF111827))),
                            const SizedBox(height: 8),
                            Text(
                              'Accédez à l\'intégralité du texte transcrit et horodaté.',
                              style: GoogleFonts.inter(
                                  fontSize: 12, color: Colors.grey[500]),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: () =>
                                    context.push('/transcription?hideSteps=true'),
                                icon: const Icon(Icons.arrow_forward, size: 16),
                                label: Text('Ouvrir la Transcription',
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.w600, fontSize: 13)),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 13),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12)),
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
        ],
      ),
    );
  }
}

class _MetaItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDark;
  const _MetaItem(this.icon, this.label, this.isDark);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: Colors.grey[400]),
        const SizedBox(width: 4),
        Text(label,
            style: GoogleFonts.inter(
                fontSize: 12,
                color: isDark ? Colors.grey[400] : Colors.grey[600])),
      ],
    );
  }
}

class _CategoryBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _CategoryBadge(this.label, {required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label,
          style: GoogleFonts.inter(
              fontSize: 11, fontWeight: FontWeight.w600, color: color)),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final Widget child;
  final bool isDark;
  const _SectionCard({super.key, required this.child, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
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
