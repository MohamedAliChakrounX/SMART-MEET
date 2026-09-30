import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/chatbot_models.dart';
import '../theme/app_theme.dart';

class MeetingsDrawer extends StatefulWidget {
  final List<ChatMeeting> meetings;
  final ValueChanged<String> onToggle;
  final VoidCallback onCheckAll;
  final VoidCallback onUncheckAll;
  final VoidCallback onClose;

  const MeetingsDrawer({
    super.key,
    required this.meetings,
    required this.onToggle,
    required this.onCheckAll,
    required this.onUncheckAll,
    required this.onClose,
  });

  @override
  State<MeetingsDrawer> createState() => _MeetingsDrawerState();
}

class _MeetingsDrawerState extends State<MeetingsDrawer> {
  String _searchQuery = '';
  DateTime? _startDate;
  DateTime? _endDate;
  String _selectedDept = '';
  String _selectedTeam = '';
  String _selectedProj = '';

  List<String> get _uniqueDepts {
    final depts = <String>{};
    for (final m in widget.meetings) {
      depts.addAll(m.departmentNames);
    }
    return depts.toList()..sort();
  }

  List<String> get _uniqueTeams {
    final teams = <String>{};
    for (final m in widget.meetings) {
      teams.addAll(m.teamNames);
    }
    return teams.toList()..sort();
  }

  List<String> get _uniqueProjects {
    final projs = <String>{};
    for (final m in widget.meetings) {
      if (m.projectName != null && m.projectName!.isNotEmpty) {
        projs.add(m.projectName!);
      }
    }
    return projs.toList()..sort();
  }

  List<ChatMeeting> get _filteredMeetings {
    return widget.meetings.filter((m) {
      // 1. Text Search
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchTitle = m.title.toLowerCase().contains(q);
        final matchDesc = m.description?.toLowerCase().contains(q) ?? false;
        if (!matchTitle && !matchDesc) return false;
      }

      // 2. Date filters
      if (_startDate != null && m.startAt != null) {
        if (m.startAt!.isBefore(_startDate!)) return false;
      }
      if (_endDate != null && m.startAt != null) {
        final endOfDay = DateTime(_endDate!.year, _endDate!.month, _endDate!.day, 23, 59, 59);
        if (m.startAt!.isAfter(endOfDay)) return false;
      }

      // 3. Dept filter
      if (_selectedDept.isNotEmpty) {
        if (!m.departmentNames.contains(_selectedDept)) return false;
      }

      // 4. Team filter
      if (_selectedTeam.isNotEmpty) {
        if (!m.teamNames.contains(_selectedTeam)) return false;
      }

      // 5. Proj filter
      if (_selectedProj.isNotEmpty) {
        if (m.projectName != _selectedProj) return false;
      }

      return true;
    }).toList();
  }

  Future<void> _pickDate(BuildContext context, bool isStart) async {
    final initialDate = isStart ? (_startDate ?? DateTime.now()) : (_endDate ?? DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
      locale: const Locale('fr', 'FR'),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filtered = _filteredMeetings;

    return Drawer(
      backgroundColor: isDark ? const Color(0xFF111827) : Colors.white,
      width: MediaQuery.of(context).size.width * 0.88,
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  const Icon(
                    Icons.filter_list_rounded,
                    color: AppTheme.primaryBlue,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Sélection Réunions',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: widget.onClose,
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withValues(alpha: 0.05) : const Color(0xFFF1F5F9),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.close_rounded,
                        size: 16,
                        color: isDark ? Colors.grey[400] : const Color(0xFF64748B),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Divider(
              height: 1,
              thickness: 0.5,
              color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
            ),

            // Filter Controls
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Search field
                  Container(
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1F2937) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB),
                      ),
                    ),
                    child: TextField(
                      onChanged: (val) => setState(() => _searchQuery = val),
                      style: GoogleFonts.inter(fontSize: 13),
                      decoration: InputDecoration(
                        isDense: true,
                        hintText: 'Rechercher une réunion…',
                        hintStyle: GoogleFonts.inter(
                          fontSize: 12.5,
                          color: isDark ? Colors.grey[500] : const Color(0xFF94A3B8),
                        ),
                        prefixIcon: Icon(
                          Icons.search_rounded,
                          size: 18,
                          color: isDark ? Colors.grey[400] : const Color(0xFF94A3B8),
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Date range picker row
                  Row(
                    children: [
                      Expanded(
                        child: _buildDateButton(
                          label: 'Date début',
                          date: _startDate,
                          onTap: () => _pickDate(context, true),
                          onClear: () => setState(() => _startDate = null),
                          isDark: isDark,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildDateButton(
                          label: 'Date fin',
                          date: _endDate,
                          onTap: () => _pickDate(context, false),
                          onClear: () => setState(() => _endDate = null),
                          isDark: isDark,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Dropdown filters row
                  Row(
                    children: [
                      Expanded(
                        child: _buildDropdown(
                          value: _selectedDept,
                          hint: 'Département',
                          items: _uniqueDepts,
                          onChanged: (v) => setState(() => _selectedDept = v ?? ''),
                          isDark: isDark,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: _buildDropdown(
                          value: _selectedTeam,
                          hint: 'Équipe',
                          items: _uniqueTeams,
                          onChanged: (v) => setState(() => _selectedTeam = v ?? ''),
                          isDark: isDark,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: _buildDropdown(
                          value: _selectedProj,
                          hint: 'Projet',
                          items: _uniqueProjects,
                          onChanged: (v) => setState(() => _selectedProj = v ?? ''),
                          isDark: isDark,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Action buttons: Tout cocher / Tout décocher
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: widget.onCheckAll,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xFF1E3A8A).withValues(alpha: 0.3)
                                  : const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Tout cocher (${widget.meetings.length})',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.primaryBlue,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: InkWell(
                          onTap: widget.onUncheckAll,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xFF1F2937)
                                  : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Tout décocher',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.grey[400] : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Divider(
              height: 1,
              thickness: 0.5,
              color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
            ),

            // Meetings List
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Text(
                        'Aucune réunion trouvée',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: isDark ? Colors.grey[500] : const Color(0xFF94A3B8),
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final meeting = filtered[index];
                        final isSelected = meeting.selected;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? (isDark ? const Color(0xFF1E3A8A).withValues(alpha: 0.2) : const Color(0xFFEFF6FF))
                                : (isDark ? const Color(0xFF1F2937) : Colors.white),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? (isDark ? AppTheme.primaryBlue : const Color(0xFFBFDBFE))
                                  : (isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB)),
                              width: isSelected ? 1.2 : 1.0,
                            ),
                          ),
                          child: InkWell(
                            onTap: () => widget.onToggle(meeting.id),
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Custom checkbox
                                  Container(
                                    width: 18,
                                    height: 18,
                                    margin: const EdgeInsets.only(top: 2, right: 10),
                                    decoration: BoxDecoration(
                                      color: isSelected ? AppTheme.primaryBlue : Colors.transparent,
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(
                                        color: isSelected
                                            ? AppTheme.primaryBlue
                                            : (isDark ? const Color(0xFF64748B) : const Color(0xFFCBD5E1)),
                                        width: 1.5,
                                      ),
                                    ),
                                    child: isSelected
                                        ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
                                        : null,
                                  ),

                                  // Details
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          meeting.title,
                                          style: GoogleFonts.inter(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: isSelected
                                                ? AppTheme.primaryBlue
                                                : (isDark ? Colors.white : const Color(0xFF1E293B)),
                                          ),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 5),
                                        Row(
                                          children: [
                                            Icon(
                                              Icons.calendar_today_rounded,
                                              size: 11,
                                              color: isDark ? Colors.grey[400] : const Color(0xFF94A3B8),
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              meeting.formattedDate.isNotEmpty ? meeting.formattedDate : 'Non datée',
                                              style: GoogleFonts.inter(
                                                fontSize: 11,
                                                color: isDark ? Colors.grey[400] : const Color(0xFF64748B),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                              decoration: BoxDecoration(
                                                color: meeting.status == 'COMPLETED'
                                                    ? const Color(0xFFFEF3C7)
                                                    : const Color(0xFFE2E8F0),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                meeting.status,
                                                style: GoogleFonts.inter(
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w700,
                                                  letterSpacing: 0.5,
                                                  color: meeting.status == 'COMPLETED'
                                                      ? const Color(0xFFB45309)
                                                      : const Color(0xFF475569),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDateButton({
    required String label,
    required DateTime? date,
    required VoidCallback onTap,
    required VoidCallback onClear,
    required bool isDark,
  }) {
    final dateStr = date != null ? DateFormat('dd/MM/yyyy').format(date) : '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 9.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
            color: isDark ? Colors.grey[400] : const Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 3),
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    dateStr.isNotEmpty ? dateStr : 'jj/mm/aaaa',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      color: dateStr.isNotEmpty
                          ? (isDark ? Colors.white : const Color(0xFF1E293B))
                          : (isDark ? Colors.grey[500] : const Color(0xFF94A3B8)),
                    ),
                  ),
                ),
                if (dateStr.isNotEmpty)
                  GestureDetector(
                    onTap: onClear,
                    child: Icon(
                      Icons.clear_rounded,
                      size: 13,
                      color: isDark ? Colors.grey[400] : const Color(0xFF94A3B8),
                    ),
                  )
                else
                  Icon(
                    Icons.calendar_month_rounded,
                    size: 14,
                    color: isDark ? Colors.grey[400] : const Color(0xFF94A3B8),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown({
    required String value,
    required String hint,
    required List<String> items,
    required ValueChanged<String?> onChanged,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value.isEmpty ? null : value,
          hint: Text(
            hint,
            style: GoogleFonts.inter(
              fontSize: 11,
              color: isDark ? Colors.grey[400] : const Color(0xFF64748B),
            ),
            overflow: TextOverflow.ellipsis,
          ),
          isExpanded: true,
          icon: Icon(
            Icons.keyboard_arrow_down_rounded,
            size: 16,
            color: isDark ? Colors.grey[400] : const Color(0xFF64748B),
          ),
          style: GoogleFonts.inter(
            fontSize: 11,
            color: isDark ? Colors.white : const Color(0xFF1E293B),
          ),
          dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          items: [
            DropdownMenuItem(
              value: '',
              child: Text(
                'Tous ($hint)',
                style: GoogleFonts.inter(fontSize: 11, color: isDark ? Colors.grey[400] : const Color(0xFF64748B)),
              ),
            ),
            ...items.map(
              (i) => DropdownMenuItem(
                value: i,
                child: Text(i, overflow: TextOverflow.ellipsis),
              ),
            ),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }
}

extension _IterableExtension<T> on Iterable<T> {
  Iterable<T> filter(bool Function(T) test) sync* {
    for (final element in this) {
      if (test(element)) {
        yield element;
      }
    }
  }
}
