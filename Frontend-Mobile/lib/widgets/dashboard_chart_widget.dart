import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/chatbot_models.dart';

class DashboardChartWidget extends StatelessWidget {
  final List<SpeakerStat> stats;
  final Map<String, dynamic>? config;
  final VoidCallback? onDownload;

  const DashboardChartWidget({
    super.key,
    required this.stats,
    this.config,
    this.onDownload,
  });

  static const Color colorSpeaking = Color(0xFF7BA7DC);
  static const Color colorInitiated = Color(0xFFF7C39B);
  static const Color colorReceived = Color(0xFF6DBAAC);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final displayStats = stats.isNotEmpty
        ? stats
        : [
            SpeakerStat(speaker: 'Speaker A', speaking: 35, initiated: 2, received: 0),
            SpeakerStat(speaker: 'Speaker B', speaking: 21.5, initiated: 1, received: 1),
            SpeakerStat(speaker: 'Speaker C', speaking: 20, initiated: 1, received: 1),
            SpeakerStat(speaker: 'Speaker D', speaking: 15, initiated: 0, received: 2),
            SpeakerStat(speaker: 'Speaker E', speaking: 8, initiated: 1, received: 1),
          ];

    double maxVal = 35.0;
    for (final s in displayStats) {
      if (s.speaking > maxVal) maxVal = s.speaking;
      if (s.initiated > maxVal) maxVal = s.initiated;
      if (s.received > maxVal) maxVal = s.received;
    }
    // Round up to nearest 5
    maxVal = ((maxVal / 5).ceil() * 5).toDouble();
    if (maxVal < 35) maxVal = 35.0;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'DASHBOARD',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              InkWell(
                onTap: onDownload ??
                    () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Graphique exporté avec succès'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withValues(alpha: 0.05) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.download_rounded,
                    size: 16,
                    color: isDark ? Colors.grey[400] : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Legend
          Wrap(
            spacing: 12,
            runSpacing: 6,
            children: [
              _buildLegendItem('Temps de parole (%)', colorSpeaking, isDark),
              _buildLegendItem('Interruptions initiées', colorInitiated, isDark),
              _buildLegendItem('Interruptions subies', colorReceived, isDark),
            ],
          ),
          const SizedBox(height: 16),

          // Horizontal Grouped Bars Chart
          Column(
            children: displayStats.map((stat) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Speaker Label
                    SizedBox(
                      width: 72,
                      child: Text(
                        stat.speaker,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Bar rows
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildHorizontalBar(stat.speaking, maxVal, colorSpeaking),
                          const SizedBox(height: 2.5),
                          _buildHorizontalBar(stat.initiated, maxVal, colorInitiated),
                          const SizedBox(height: 2.5),
                          _buildHorizontalBar(stat.received, maxVal, colorReceived),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 4),

          // X-Axis ticks
          Padding(
            padding: const EdgeInsets.only(left: 80),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [0, 5, 10, 15, 20, 25, 30, 35].map((val) {
                return Text(
                  val.toString(),
                  style: GoogleFonts.inter(
                    fontSize: 9.5,
                    color: isDark ? Colors.grey[600] : const Color(0xFF94A3B8),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color, bool isDark) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 14,
          height: 9,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10.5,
            color: isDark ? Colors.grey[400] : const Color(0xFF475569),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildHorizontalBar(double value, double maxVal, Color color) {
    final double fraction = (value / maxVal).clamp(0.0, 1.0);

    return LayoutBuilder(
      builder: (context, constraints) {
        final double width = (constraints.maxWidth * fraction).clamp(2.0, constraints.maxWidth);
        return Container(
          height: 6,
          width: width,
          decoration: BoxDecoration(
            color: color,
            borderRadius: const BorderRadius.only(
              topRight: Radius.circular(3),
              bottomRight: Radius.circular(3),
            ),
          ),
        );
      },
    );
  }
}
