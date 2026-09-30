import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../../models/models.dart';
import '../../providers/app_state.dart';
import '../../providers/auth_provider.dart';
import '../../providers/meeting_provider.dart';
import '../../services/token_storage.dart';
import '../../theme/app_theme.dart';
import '../../config/api_config.dart';
import '../../l10n/l10n.dart';
import '../../widgets/chatbot_bubble.dart';

class ArchiveLibraryPage extends StatefulWidget {
  const ArchiveLibraryPage({super.key});

  @override
  State<ArchiveLibraryPage> createState() => _ArchiveLibraryPageState();
}

class _ArchiveLibraryPageState extends State<ArchiveLibraryPage> {
  String _searchQuery = '';

  // Organisation filters
  String? _selectedDeptId;
  String? _selectedTeamId;
  String? _selectedProjectId;

  // Date filters
  DateTime? _creationDateFilter;
  DateTime? _uploadDateFilter;

  // Duration filter: 'all', '<5', '5-15', '15-30', '>30'
  String _durationFilter = 'all';

  // Visibility of advanced filter panel
  bool _showFilters = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final mp = context.read<MeetingProvider>();
      mp.loadMeetings();
      mp.loadOrgFilters();
    });
  }

  void _applyFilters() {
    context.read<MeetingProvider>().loadMeetings(
          search: _searchQuery,
          departmentId: _selectedDeptId,
          teamId: _selectedTeamId,
          projectId: _selectedProjectId,
        );
  }

  void _clearFilters() {
    setState(() {
      _searchQuery = '';
      _selectedDeptId = null;
      _selectedTeamId = null;
      _selectedProjectId = null;
      _creationDateFilter = null;
      _uploadDateFilter = null;
      _durationFilter = 'all';
    });
    context.read<MeetingProvider>().loadMeetings();
  }

  bool get _hasActiveFilters =>
      _selectedDeptId != null ||
      _selectedTeamId != null ||
      _selectedProjectId != null ||
      _creationDateFilter != null ||
      _uploadDateFilter != null ||
      _durationFilter != 'all' ||
      _searchQuery.isNotEmpty;

  List<Meeting> _getFilteredMeetings(List<Meeting> allMeetings) {
    final filtered = allMeetings.where((m) {
      // 1. Text query filter
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchTitle = m.title.toLowerCase().contains(q);
        final matchDesc = m.description.toLowerCase().contains(q);
        final matchCat = m.category.toLowerCase().contains(q);
        final matchParticipants = m.participants.any((p) => p.toLowerCase().contains(q));
        final matchDate = m.formattedCreationDate.contains(q) || m.formattedUploadDate.contains(q);
        if (!matchTitle && !matchDesc && !matchCat && !matchParticipants && !matchDate) {
          return false;
        }
      }

      // 2. Audio creation date filter
      if (_creationDateFilter != null) {
        final target = '${_creationDateFilter!.year.toString().padLeft(4, '0')}-${_creationDateFilter!.month.toString().padLeft(2, '0')}-${_creationDateFilter!.day.toString().padLeft(2, '0')}';
        final d = m.date;
        if (!d.startsWith(target)) {
          final dt = DateTime.tryParse(d);
          if (dt == null ||
              dt.year != _creationDateFilter!.year ||
              dt.month != _creationDateFilter!.month ||
              dt.day != _creationDateFilter!.day) {
            return false;
          }
        }
      }

      // 3. Audio upload date filter
      if (_uploadDateFilter != null) {
        final target = '${_uploadDateFilter!.year.toString().padLeft(4, '0')}-${_uploadDateFilter!.month.toString().padLeft(2, '0')}-${_uploadDateFilter!.day.toString().padLeft(2, '0')}';
        final d = m.createdAt.isNotEmpty ? m.createdAt : m.date;
        if (!d.startsWith(target)) {
          final dt = DateTime.tryParse(d);
          if (dt == null ||
              dt.year != _uploadDateFilter!.year ||
              dt.month != _uploadDateFilter!.month ||
              dt.day != _uploadDateFilter!.day) {
            return false;
          }
        }
      }

      // 4. Duration filter
      if (_durationFilter != 'all') {
        int durationInMinutes = 0;
        if (m.durationMinutes != null && m.durationMinutes! > 0) {
          durationInMinutes = m.durationMinutes!;
        } else if (m.durationSeconds != null && m.durationSeconds! > 0) {
          durationInMinutes = (m.durationSeconds! / 60).ceil();
        } else {
          final raw = m.duration;
          if (raw.contains(':')) {
            final parts = raw.split(':');
            final sec = parts.fold<int>(0, (prev, e) => prev * 60 + (int.tryParse(e) ?? 0));
            durationInMinutes = (sec / 60).ceil();
          } else {
            final numMatch = RegExp(r'\d+').firstMatch(raw);
            if (numMatch != null) {
              durationInMinutes = int.tryParse(numMatch.group(0)!) ?? 0;
            }
          }
        }

        switch (_durationFilter) {
          case '<5':
            if (durationInMinutes > 5) return false;
            break;
          case '5-15':
            if (durationInMinutes < 5 || durationInMinutes > 15) return false;
            break;
          case '15-30':
            if (durationInMinutes < 15 || durationInMinutes > 30) return false;
            break;
          case '>30':
            if (durationInMinutes <= 30) return false;
            break;
        }
      }

      return true;
    }).toList();

    // Sort by date/time descending (most recent first)
    filtered.sort((a, b) {
      final dateA = DateTime.tryParse(a.createdAt.isNotEmpty ? a.createdAt : a.date) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final dateB = DateTime.tryParse(b.createdAt.isNotEmpty ? b.createdAt : b.date) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return dateB.compareTo(dateA); // Descending
    });

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final appState = context.watch<AppState>();
    final authProvider = context.watch<AuthProvider>();
    final meetingProvider = context.watch<MeetingProvider>();

    // Filtered list according to all active criteria
    final displayedMeetings = _getFilteredMeetings(meetingProvider.meetings);

    // Teams visible depending on selected department
    final visibleTeams = _selectedDeptId != null
        ? meetingProvider.teams.where((t) => t.parentId == _selectedDeptId).toList()
        : meetingProvider.teams;

    // Projects visible depending on selected team
    final visibleProjects = _selectedTeamId != null
        ? meetingProvider.projects.where((p) => p.parentId == _selectedTeamId).toList()
        : meetingProvider.projects;

    final userInitials = authProvider.currentUser != null
        ? '${authProvider.currentUser!.firstName.isNotEmpty ? authProvider.currentUser!.firstName[0] : ''}${authProvider.currentUser!.lastName.isNotEmpty ? authProvider.currentUser!.lastName[0] : ''}'
        : 'JD';

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Image.asset(
          'assets/images/SFM-logo.png',
          height: 32,
          fit: BoxFit.contain,
        ),
        actions: [
          IconButton(
            icon: Icon(
              appState.darkMode
                  ? Icons.light_mode_outlined
                  : Icons.dark_mode_outlined,
              color: isDark ? Colors.white70 : Colors.grey[600],
            ),
            onPressed: appState.toggleDarkMode,
          ),
          CircleAvatar(
            radius: 16,
            backgroundColor: AppTheme.primaryBlue.withValues(alpha: 0.15),
            child: Text(
              userInitials.isEmpty ? 'U' : userInitials,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppTheme.primaryBlue,
              ),
            ),
          ),
          IconButton(
            icon: Icon(Icons.logout, color: isDark ? Colors.white70 : Colors.grey[600]),
            onPressed: () async {
              await context.read<AuthProvider>().logout();
              if (context.mounted) context.go('/login');
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Header ──
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.l10n('archive_title'),
                              style: GoogleFonts.inter(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : const Color(0xFF111827),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${displayedMeetings.length} ${context.l10n('archive_meetings_label')} · ${displayedMeetings.where((m) => m.starred).length} ${context.l10n('archive_starred_label')}',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Filter toggle button
                      Stack(
                        children: [
                          IconButton(
                            icon: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 200),
                              child: Icon(
                                _showFilters
                                    ? Icons.filter_list_off
                                    : Icons.filter_list,
                                key: ValueKey(_showFilters),
                                color: _hasActiveFilters
                                    ? AppTheme.primaryBlue
                                    : (isDark ? Colors.white70 : Colors.grey[600]),
                              ),
                            ),
                            onPressed: () => setState(() => _showFilters = !_showFilters),
                          ),
                          if (_hasActiveFilters)
                            Positioned(
                              right: 8,
                              top: 8,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppTheme.primaryBlue,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // ── Search bar ──
                  TextField(
                    controller: TextEditingController(text: _searchQuery),
                    onChanged: (v) {
                      _searchQuery = v;
                      _applyFilters();
                    },
                    style: GoogleFonts.inter(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: context.l10n('archive_search'),
                      prefixIcon: const Icon(Icons.search, size: 18),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 16),
                              onPressed: () {
                                setState(() => _searchQuery = '');
                                _applyFilters();
                              },
                            )
                          : null,
                    ),
                  ),

                  // ── Filter Panel (expandable) ──
                  AnimatedSize(
                    duration: const Duration(milliseconds: 280),
                    curve: Curves.easeInOut,
                    child: _showFilters
                        ? _buildFilterPanel(
                            isDark: isDark,
                            meetingProvider: meetingProvider,
                            visibleTeams: visibleTeams,
                            visibleProjects: visibleProjects,
                          )
                        : const SizedBox.shrink(),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),

          // ── Meeting list / states ──
          if (meetingProvider.isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (meetingProvider.error != null)
            SliverFillRemaining(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(
                    meetingProvider.error!,
                    style: TextStyle(color: Colors.red.shade400),
                  ),
                ),
              ),
            )
          else if (displayedMeetings.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.inbox_outlined, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 12),
                    Text(
                      context.l10n('archive_no_meetings'),
                      style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600]),
                    ),
                    if (_hasActiveFilters) ...[
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _clearFilters,
                        child: Text(context.l10n('clear_filter')),
                      ),
                    ],
                  ],
                ),
              ),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, i) => _MeetingCard(meeting: displayedMeetings[i]),
                childCount: displayedMeetings.length,
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 160)),
        ],
      ),

          // ── Chatbot floating bubble (fixed position) ──
          const Positioned(
            right: 16,
            bottom: 25,
            child: ChatBotFloatingBubble(),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterPanel({
    required bool isDark,
    required MeetingProvider meetingProvider,
    required List<OrgItem> visibleTeams,
    required List<OrgItem> visibleProjects,
  }) {
    final cardColor = isDark ? const Color(0xFF111827) : Colors.white;
    final borderColor = isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB);

    return Container(
      margin: const EdgeInsets.only(top: 12, bottom: 4),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2))
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.tune_outlined, size: 15, color: AppTheme.primaryBlue),
              const SizedBox(width: 6),
              Text(
                context.l10n('archive_org_filters'),
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.primaryBlue,
                ),
              ),
              const Spacer(),
              if (_hasActiveFilters)
                GestureDetector(
                  onTap: _clearFilters,
                  child: Text(
                    context.l10n('archive_clear_all'),
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: Colors.red[400],
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // ── Date Filters Row ──
          Row(
            children: [
              Expanded(
                child: _DateField(
                  isDark: isDark,
                  label: context.l10n('archive_filter_date_creation'),
                  icon: Icons.mic_none_outlined,
                  value: _creationDateFilter,
                  activeColor: AppTheme.primaryBlue,
                  onChanged: (val) {
                    setState(() => _creationDateFilter = val);
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _DateField(
                  isDark: isDark,
                  label: context.l10n('archive_filter_date_upload'),
                  icon: Icons.cloud_upload_outlined,
                  value: _uploadDateFilter,
                  activeColor: const Color(0xFF10B981),
                  onChanged: (val) {
                    setState(() => _uploadDateFilter = val);
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Audio Duration Filter ──
          Text(
            context.l10n('archive_filter_duration'),
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.grey[400] : Colors.grey[700],
            ),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _buildDurationChip('all', context.l10n('archive_duration_all'), isDark),
              _buildDurationChip('<5', context.l10n('archive_duration_short'), isDark),
              _buildDurationChip('5-15', context.l10n('archive_duration_medium'), isDark),
              _buildDurationChip('15-30', context.l10n('archive_duration_long'), isDark),
              _buildDurationChip('>30', context.l10n('archive_duration_very_long'), isDark),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, thickness: 0.5),
          const SizedBox(height: 12),

          // ── Department dropdown ──
          _OrgDropdown(
            isDark: isDark,
            label: context.l10n('archive_filter_dept'),
            icon: Icons.business_outlined,
            value: _selectedDeptId,
            items: meetingProvider.departments,
            onChanged: (val) {
              setState(() {
                _selectedDeptId = val;
                _selectedTeamId = null;
                _selectedProjectId = null;
              });
              _applyFilters();
            },
          ),
          const SizedBox(height: 10),

          // ── Team dropdown ──
          _OrgDropdown(
            isDark: isDark,
            label: context.l10n('archive_filter_team'),
            icon: Icons.group_outlined,
            value: _selectedTeamId,
            items: meetingProvider.departments.isEmpty ? meetingProvider.teams : visibleTeams,
            enabled: meetingProvider.teams.isNotEmpty,
            onChanged: (val) {
              setState(() {
                _selectedTeamId = val;
                _selectedProjectId = null;
                if (val != null) {
                  final teamMatches = meetingProvider.teams.where((t) => t.id == val);
                  if (teamMatches.isNotEmpty && teamMatches.first.parentId != null) {
                    _selectedDeptId = teamMatches.first.parentId;
                  }
                }
              });
              _applyFilters();
            },
          ),
          const SizedBox(height: 10),

          // ── Project dropdown ──
          _OrgDropdown(
            isDark: isDark,
            label: context.l10n('archive_filter_project'),
            icon: Icons.folder_outlined,
            value: _selectedProjectId,
            items: meetingProvider.teams.isEmpty ? meetingProvider.projects : visibleProjects,
            enabled: meetingProvider.projects.isNotEmpty,
            onChanged: (val) {
              setState(() {
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
              });
              _applyFilters();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildDurationChip(String key, String label, bool isDark) {
    final isSelected = _durationFilter == key;
    return GestureDetector(
      onTap: () {
        setState(() => _durationFilter = key);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primaryBlue
              : (isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6)),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? AppTheme.primaryBlue
                : (isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB)),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected
                ? Colors.white
                : (isDark ? Colors.grey[300] : Colors.grey[700]),
          ),
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────
// Reusable date filter widget
// ────────────────────────────────────────────────────────────────
class _DateField extends StatelessWidget {
  final bool isDark;
  final String label;
  final IconData icon;
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final Color? activeColor;

  const _DateField({
    required this.isDark,
    required this.label,
    required this.icon,
    required this.value,
    required this.onChanged,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFD1D5DB);
    final fillColor = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final labelColor = isDark ? Colors.grey[400]! : Colors.grey[600]!;
    final resolvedColor = activeColor ?? AppTheme.primaryBlue;

    final formatted = value != null
        ? '${value!.day.toString().padLeft(2, '0')}/${value!.month.toString().padLeft(2, '0')}/${value!.year}'
        : context.l10n('archive_filter_date_hint');

    return GestureDetector(
      onTap: () async {
        final now = DateTime.now();
        final picked = await showDatePicker(
          context: context,
          initialDate: value ?? now,
          firstDate: DateTime(2020),
          lastDate: DateTime(2030),
          builder: (context, child) {
            return Theme(
              data: Theme.of(context).copyWith(
                colorScheme: Theme.of(context).colorScheme.copyWith(
                      primary: resolvedColor,
                    ),
              ),
              child: child!,
            );
          },
        );
        if (picked != null) {
          onChanged(picked);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: fillColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: value != null ? resolvedColor : borderColor,
            width: value != null ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: 15, color: value != null ? resolvedColor : labelColor),
            const SizedBox(width: 6),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.inter(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      color: labelColor,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 1),
                  Text(
                    formatted,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: value != null ? FontWeight.w700 : FontWeight.normal,
                      color: value != null
                          ? resolvedColor
                          : labelColor,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (value != null)
              GestureDetector(
                onTap: () => onChanged(null),
                child: Icon(Icons.close, size: 14, color: Colors.grey[500]),
              ),
          ],
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────
// Reusable org filter dropdown
// ────────────────────────────────────────────────────────────────
class _OrgDropdown extends StatelessWidget {
  final bool isDark;
  final String label;
  final IconData icon;
  final String? value;
  final List<OrgItem> items;
  final bool enabled;
  final ValueChanged<String?> onChanged;

  const _OrgDropdown({
    required this.isDark,
    required this.label,
    required this.icon,
    required this.value,
    required this.items,
    required this.onChanged,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFD1D5DB);
    final fillColor = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final labelColor = isDark ? Colors.grey[400]! : Colors.grey[600]!;

    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      isDense: true,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.inter(fontSize: 12, color: labelColor),
        prefixIcon: Icon(icon, size: 16, color: labelColor),
        filled: true,
        fillColor: fillColor,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 1.5),
        ),
      ),
      style: GoogleFonts.inter(
        fontSize: 13,
        color: isDark ? Colors.white : const Color(0xFF111827),
      ),
      dropdownColor: isDark ? const Color(0xFF1F2937) : Colors.white,
      items: [
        DropdownMenuItem<String>(
          value: null,
          child: Text('All', style: GoogleFonts.inter(fontSize: 13, color: labelColor)),
        ),
        ...items.map((item) => DropdownMenuItem<String>(
              value: item.id,
              child: Text(
                item.name,
                style: GoogleFonts.inter(fontSize: 13),
                overflow: TextOverflow.ellipsis,
              ),
            )),
      ],
      onChanged: enabled ? onChanged : null,
    );
  }
}

// ────────────────────────────────────────────────────────────────
// Meeting card
// ────────────────────────────────────────────────────────────────
class _MeetingCard extends StatelessWidget {
  final Meeting meeting;
  const _MeetingCard({required this.meeting});

  Color _categoryColor(String cat) {
    switch (cat.toUpperCase()) {
      case 'PRODUCT DEV':
        return const Color(0xFF3B82F6);
      case 'SALES':
        return const Color(0xFF10B981);
      case 'STRATEGY':
        return const Color(0xFF8B5CF6);
      case 'MARKETING':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF6B7280);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final isTemporary = RegExp(r'^\d{9}$').hasMatch(meeting.id) ||
        meeting.status.toLowerCase() == 'processing';

    void handleViewMeeting() {
      context.read<AppState>().setAudioFile(null);
      if (isTemporary) {
        context.read<MeetingProvider>().setActiveMeetingId(meeting.id);
        context.push('/transcription');
      } else {
        context.read<MeetingProvider>().selectMeeting(meeting.id);
        context.go('/overview');
      }
    }

    return GestureDetector(
      onTap: handleViewMeeting,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isDark
                ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                : [Colors.white, const Color(0xFFF8FAFC)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark
                ? const Color(0xFF334155).withValues(alpha: 0.4)
                : const Color(0xFFE2E8F0),
            width: 1,
          ),
          boxShadow: isDark
              ? []
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: _categoryColor(meeting.category).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    meeting.category.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: _categoryColor(meeting.category),
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                if (isTemporary) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                        width: 0.8,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(
                          width: 8,
                          height: 8,
                          child: CircularProgressIndicator(
                            strokeWidth: 1.5,
                            color: Color(0xFFF59E0B),
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          'En cours',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFFD97706),
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryBlue.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.timer_outlined, size: 10, color: AppTheme.primaryBlue),
                        const SizedBox(width: 4),
                        Text(
                          meeting.duration,
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primaryBlue,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const Spacer(),
                if (meeting.starred)
                  const Icon(Icons.star, size: 16, color: Color(0xFFF59E0B)),
                const SizedBox(width: 4),
                PopupMenuButton<String>(
                  icon: Icon(Icons.more_vert,
                      size: 18,
                      color: isDark ? Colors.grey[500] : Colors.grey[400]),
                  color: isDark ? const Color(0xFF1F2937) : Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  onSelected: (value) {
                    if (value == 'view') {
                      handleViewMeeting();
                    } else if (value == 'delete') {
                      _confirmDelete(context, isDark);
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: 'view',
                      child: Row(
                        children: [
                          Icon(
                            isTemporary ? Icons.play_arrow_outlined : Icons.remove_red_eye_outlined,
                            size: 16,
                            color: AppTheme.primaryBlue,
                          ),
                          const SizedBox(width: 10),
                          Text(
                            isTemporary ? 'Reprendre le traitement' : context.l10n('overview_all'),
                            style: GoogleFonts.inter(fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          const Icon(Icons.delete_outline,
                              size: 16, color: Color(0xFFEF4444)),
                          const SizedBox(width: 10),
                          Text(
                            context.l10n('archive_delete'),
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: const Color(0xFFEF4444),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              meeting.title.trim().isEmpty ? 'Réunion sans titre' : meeting.title,
              style: GoogleFonts.inter(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
                letterSpacing: 0.1,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 10),

            // ── Audio Metadata Row (Clean and minimal) ──
            Row(
              children: [
                Icon(
                  Icons.calendar_today_outlined,
                  size: 12,
                  color: AppTheme.primaryBlue.withValues(alpha: 0.75),
                ),
                const SizedBox(width: 5),
                Text(
                  meeting.formattedCreationDate,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 4,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
                Icon(
                  Icons.cloud_upload_outlined,
                  size: 13,
                  color: const Color(0xFF10B981).withValues(alpha: 0.85),
                ),
                const SizedBox(width: 5),
                Text(
                  meeting.formattedUploadDate,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: isDark ? const Color(0xFFA7F3D0) : const Color(0xFF047857),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // ── Summary Container Box ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF1E293B).withValues(alpha: 0.3)
                    : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                isTemporary
                    ? 'Transcription en cours... Le PV et les points clés de la réunion seront générés une fois l\'analyse terminée.'
                    : (meeting.description.trim().isEmpty
                        ? 'Aucune description ou résumé disponible pour cette réunion.'
                        : meeting.description),
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: isDark ? Colors.grey[400] : Colors.grey[700],
                  height: 1.5,
                  fontStyle: (isTemporary || meeting.description.trim().isEmpty)
                      ? FontStyle.italic
                      : FontStyle.normal,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 16),
            const Divider(height: 1, thickness: 0.5),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildParticipantAvatars(meeting.participants, isDark, isTemporary),
                ),
                GestureDetector(
                  onTap: handleViewMeeting,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isTemporary
                          ? const Color(0xFFD97706)
                          : AppTheme.primaryBlue,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: (isTemporary ? const Color(0xFFD97706) : AppTheme.primaryBlue).withValues(alpha: 0.2),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isTemporary ? Icons.play_arrow_rounded : Icons.remove_red_eye_outlined,
                          size: 15,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          isTemporary ? 'Reprendre' : 'Consulter',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (!isTemporary) ...[
                  const SizedBox(width: 8),
                  _DownloadButton(isDark: isDark, meetingId: meeting.id),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Shows a confirmation dialog before deleting the meeting.
  void _confirmDelete(BuildContext context, bool isDark) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: isDark ? const Color(0xFF1F2937) : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.delete_outline,
                    color: Color(0xFFEF4444), size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  ctx.l10n('archive_delete_confirm_title'),
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : const Color(0xFF111827),
                  ),
                ),
              ),
            ],
          ),
          content: Text(
            ctx.l10n('archive_delete_confirm_body'),
            style: GoogleFonts.inter(
              fontSize: 13,
              color: isDark ? Colors.grey[300] : Colors.grey[700],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text(
                ctx.l10n('cancel'),
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
              onPressed: () async {
                Navigator.of(ctx).pop();
                final provider = context.read<MeetingProvider>();
                final success = await provider.deleteMeeting(meeting.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Row(
                        children: [
                          Icon(
                            success ? Icons.check_circle_outline : Icons.error_outline,
                            color: Colors.white,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              success
                                  ? context.l10n('archive_delete_success')
                                  : context.l10n('archive_delete_error'),
                              style: GoogleFonts.inter(fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                      backgroundColor: success
                          ? const Color(0xFF10B981)
                          : const Color(0xFFEF4444),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      margin: const EdgeInsets.all(12),
                      duration: const Duration(seconds: 3),
                    ),
                  );
                }
              },
              child: Text(
                ctx.l10n('delete'),
                style: GoogleFonts.inter(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildParticipantAvatars(List<String> participantNames, bool isDark, bool isTemporary) {
    if (participantNames.isEmpty) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.people_outline_rounded,
            size: 14,
            color: isDark ? Colors.grey[500] : Colors.grey[400],
          ),
          const SizedBox(width: 6),
          Text(
            isTemporary ? 'Analyse des locuteurs...' : 'Pas de participants',
            style: GoogleFonts.inter(
              fontSize: 11,
              color: isDark ? Colors.grey[500] : Colors.grey[500],
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    }

    final List<Color> colorsPool = [
      const Color(0xFF3B82F6), // Blue
      const Color(0xFF10B981), // Emerald
      const Color(0xFFF59E0B), // Amber
      const Color(0xFFEC4899), // Pink
      const Color(0xFF8B5CF6), // Purple
      const Color(0xFF06B6D4), // Cyan
    ];

    final avatarData = participantNames.asMap().entries.map((entry) {
      final name = entry.value;
      final initials = name.trim().isNotEmpty
          ? name.trim().split(' ').map((e) => e[0]).take(2).join()
          : 'P';
      final colorIndex = entry.key % colorsPool.length;
      return {
        'initials': initials,
        'color': colorsPool[colorIndex],
      };
    }).toList();

    return SizedBox(
      height: 28,
      width: (avatarData.length > 5 ? 5 : avatarData.length) * 18.0 + 10,
      child: Stack(
        children: List.generate(
          avatarData.length > 5 ? 5 : avatarData.length,
          (index) {
            return Positioned(
              left: index * 18.0,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: avatarData[index]['color'] as Color,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isDark ? const Color(0xFF111827) : Colors.white,
                    width: 2,
                  ),
                ),
                child: Center(
                  child: Text(
                    avatarData[index]['initials'] as String,
                    style: GoogleFonts.inter(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}


class _DownloadButton extends StatefulWidget {
  final bool isDark;
  final String meetingId;
  const _DownloadButton({required this.isDark, required this.meetingId});

  @override
  State<_DownloadButton> createState() => _DownloadButtonState();
}

class _DownloadButtonState extends State<_DownloadButton> {
  bool _isDownloading = false;

  Future<void> _download(String format) async {
    setState(() => _isDownloading = true);
    try {
      // Build full URL using the same base URL as ApiConfig
      final baseUrl = ApiConfig.baseUrl;
      final path = ApiConfig.exportEndpoint(widget.meetingId, format);
      final uri = Uri.parse('$baseUrl$path');

      // Retrieve auth token from secure storage
      final storage = TokenStorage();
      final token = await storage.getToken();

      final response = await http.get(
        uri,
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'Accept': '*/*',
        },
      ).timeout(const Duration(minutes: 2));

      if (response.statusCode == 200) {
        // Save to local temp directory
        final dir = await getTemporaryDirectory();
        final ext = {
          'pdf': 'pdf',
          'word': 'docx',
          'excel': 'xlsx',
          'csv': 'csv',
        }[format] ?? format;
        final file = File('${dir.path}/pv_${widget.meetingId}.$ext');
        await file.writeAsBytes(response.bodyBytes);

        // Open the file
        final result = await OpenFile.open(file.path);
        if (result.type != ResultType.done && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Impossible d\'ouvrir le fichier: ${result.message}'),
              backgroundColor: Colors.orange[700],
            ),
          );
        }
      } else if (response.statusCode == 422) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Aucun PV disponible pour cette réunion.'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erreur lors du téléchargement: ${response.statusCode}'),
              backgroundColor: Colors.red[700],
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: ${e.toString()}'),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isDownloading) {
      return Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: widget.isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }
    return PopupMenuButton<String>(
      offset: const Offset(0, -180),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: widget.isDark ? const Color(0xFF1F2937) : Colors.white,
      elevation: 4,
      onSelected: _download,
      itemBuilder: (context) => const [
        PopupMenuItem<String>(
          value: 'pdf',
          child: Row(
            children: [
              Icon(Icons.picture_as_pdf, color: Colors.red, size: 18),
              SizedBox(width: 8),
              Text('Exporter PDF'),
            ],
          ),
        ),
        PopupMenuItem<String>(
          value: 'word',
          child: Row(
            children: [
              Icon(Icons.description, color: Colors.blue, size: 18),
              SizedBox(width: 8),
              Text('Exporter Word'),
            ],
          ),
        ),
        PopupMenuItem<String>(
          value: 'excel',
          child: Row(
            children: [
              Icon(Icons.table_chart, color: Colors.green, size: 18),
              SizedBox(width: 8),
              Text('Exporter Excel'),
            ],
          ),
        ),
      ],
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: widget.isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          Icons.file_download_outlined,
          size: 18,
          color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
        ),
      ),
    );
  }
}
