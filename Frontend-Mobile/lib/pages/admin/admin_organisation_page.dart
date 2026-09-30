import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../models/admin_models.dart';
import '../../providers/admin_provider.dart';
import '../../theme/app_theme.dart';

class AdminOrganisationPage extends StatefulWidget {
  const AdminOrganisationPage({super.key});

  @override
  State<AdminOrganisationPage> createState() => _AdminOrganisationPageState();
}

class _AdminOrganisationPageState extends State<AdminOrganisationPage> {
  String? _expandedDeptId;
  String? _expandedTeamId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().loadAllData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final adminProvider = context.watch<AdminProvider>();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'Organisation',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 17),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: () => adminProvider.loadAllData(),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: adminProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => adminProvider.loadAllData(),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Top Summary & Actions
                  _buildHeaderActions(context, adminProvider, isDark),
                  const SizedBox(height: 16),

                  if (adminProvider.error != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              adminProvider.error!,
                              style: GoogleFonts.inter(color: Colors.red, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Departments List
                  if (adminProvider.departments.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 16),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF111827) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
                        ),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(Icons.apartment_outlined, size: 48, color: Colors.grey[400]),
                            const SizedBox(height: 12),
                            Text(
                              'Aucun département trouvé.',
                              style: GoogleFonts.inter(color: Colors.grey[500], fontSize: 14),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton.icon(
                              onPressed: () => _openDeptDialog(context, adminProvider),
                              icon: const Icon(Icons.add, size: 16),
                              label: const Text('Créer un département'),
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryBlue),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ...adminProvider.departments.map((dept) {
                      final deptTeams = adminProvider.getTeamsForDepartment(dept.id);
                      final isDeptExpanded = _expandedDeptId == dept.id;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF111827) : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
                          ),
                        ),
                        child: Column(
                          children: [
                            // Department Row
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _expandedDeptId = isDeptExpanded ? null : dept.id;
                                  _expandedTeamId = null;
                                });
                              },
                              borderRadius: BorderRadius.circular(14),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryBlue.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Icon(
                                        Icons.apartment_rounded,
                                        color: AppTheme.primaryBlue,
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Flexible(
                                                child: Text(
                                                  dept.name,
                                                  style: GoogleFonts.inter(
                                                    fontWeight: FontWeight.w700,
                                                    fontSize: 14,
                                                    color: isDark ? Colors.white : const Color(0xFF111827),
                                                  ),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Colors.grey.withValues(alpha: 0.15),
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Text(
                                                  '${deptTeams.length} équipe${deptTeams.length != 1 ? 's' : ''}',
                                                  style: GoogleFonts.inter(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w600,
                                                    color: isDark ? Colors.grey[300] : Colors.grey[700],
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          if (dept.description.isNotEmpty) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              dept.description,
                                              style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[500]),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.add, size: 18),
                                          visualDensity: VisualDensity.compact,
                                          tooltip: 'Ajouter une équipe',
                                          onPressed: () => _openTeamDialog(context, adminProvider, preselectedDeptId: dept.id),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.edit_outlined, size: 18),
                                          visualDensity: VisualDensity.compact,
                                          tooltip: 'Modifier',
                                          onPressed: () => _openDeptDialog(context, adminProvider, dept: dept),
                                        ),
                                        IconButton(
                                          icon: Icon(Icons.delete_outline, size: 18, color: Colors.red[400]),
                                          visualDensity: VisualDensity.compact,
                                          tooltip: 'Supprimer',
                                          onPressed: () => _confirmDeleteDept(context, adminProvider, dept),
                                        ),
                                        Icon(
                                          isDeptExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                          color: Colors.grey[400],
                                          size: 20,
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            // Teams inside Department (when expanded)
                            if (isDeptExpanded) ...[
                              const Divider(height: 1),
                              Container(
                                color: isDark ? const Color(0xFF0F172A).withValues(alpha: 0.5) : const Color(0xFFF9FAFB),
                                child: Column(
                                  children: [
                                    if (deptTeams.isEmpty)
                                      Padding(
                                        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                                        child: Column(
                                          children: [
                                            Text(
                                              'Aucune équipe dans ce département.',
                                              style: GoogleFonts.inter(color: Colors.grey[500], fontSize: 12),
                                            ),
                                            TextButton.icon(
                                              onPressed: () => _openTeamDialog(context, adminProvider, preselectedDeptId: dept.id),
                                              icon: const Icon(Icons.add, size: 16),
                                              label: const Text('Créer une équipe'),
                                            ),
                                          ],
                                        ),
                                      )
                                    else
                                      ...deptTeams.map((team) {
                                        final teamUsers = adminProvider.getUsersForTeam(team.id);
                                        final teamProjects = adminProvider.getProjectsForTeam(team.id);
                                        final isTeamExpanded = _expandedTeamId == team.id;

                                        return Column(
                                          children: [
                                            InkWell(
                                              onTap: () {
                                                setState(() {
                                                  _expandedTeamId = isTeamExpanded ? null : team.id;
                                                });
                                              },
                                              child: Padding(
                                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                                child: Row(
                                                  children: [
                                                    Container(
                                                      width: 32,
                                                      height: 32,
                                                      decoration: BoxDecoration(
                                                        color: const Color(0xFF10B981).withValues(alpha: 0.12),
                                                        borderRadius: BorderRadius.circular(8),
                                                      ),
                                                      child: const Icon(
                                                        Icons.group_outlined,
                                                        color: Color(0xFF10B981),
                                                        size: 17,
                                                      ),
                                                    ),
                                                    const SizedBox(width: 10),
                                                    Expanded(
                                                      child: Column(
                                                        crossAxisAlignment: CrossAxisAlignment.start,
                                                        children: [
                                                          Text(
                                                            team.name,
                                                            style: GoogleFonts.inter(
                                                              fontWeight: FontWeight.w600,
                                                              fontSize: 13,
                                                              color: isDark ? Colors.white : const Color(0xFF111827),
                                                            ),
                                                          ),
                                                          if (team.description.isNotEmpty)
                                                            Text(
                                                              team.description,
                                                              style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[500]),
                                                              maxLines: 1,
                                                              overflow: TextOverflow.ellipsis,
                                                            ),
                                                          const SizedBox(height: 4),
                                                          Wrap(
                                                            spacing: 4,
                                                            runSpacing: 4,
                                                            children: [
                                                              Container(
                                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                                                decoration: BoxDecoration(
                                                                  border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
                                                                  borderRadius: BorderRadius.circular(4),
                                                                ),
                                                                child: Text(
                                                                  '${teamUsers.length} membre${teamUsers.length != 1 ? 's' : ''}',
                                                                  style: GoogleFonts.inter(fontSize: 10, color: Colors.grey[600]),
                                                                ),
                                                              ),
                                                              if (teamProjects.isNotEmpty)
                                                                Container(
                                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                                                  decoration: BoxDecoration(
                                                                    border: Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.3)),
                                                                    borderRadius: BorderRadius.circular(4),
                                                                  ),
                                                                  child: Text(
                                                                    '${teamProjects.length} projet${teamProjects.length != 1 ? 's' : ''}',
                                                                    style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF8B5CF6)),
                                                                  ),
                                                                ),
                                                            ],
                                                          ),
                                                        ],
                                                      ),
                                                    ),
                                                    Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        IconButton(
                                                          icon: const Icon(Icons.add, size: 16),
                                                          visualDensity: VisualDensity.compact,
                                                          tooltip: 'Ajouter projet',
                                                          onPressed: () => _openProjectDialog(context, adminProvider, preselectedTeamId: team.id),
                                                        ),
                                                        IconButton(
                                                          icon: const Icon(Icons.edit_outlined, size: 16),
                                                          visualDensity: VisualDensity.compact,
                                                          onPressed: () => _openTeamDialog(context, adminProvider, team: team),
                                                        ),
                                                        IconButton(
                                                          icon: Icon(Icons.delete_outline, size: 16, color: Colors.red[400]),
                                                          visualDensity: VisualDensity.compact,
                                                          onPressed: () => _confirmDeleteTeam(context, adminProvider, team),
                                                        ),
                                                        Icon(
                                                          isTeamExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                                          color: Colors.grey[400],
                                                          size: 18,
                                                        ),
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),

                                            // Projects inside Team (when team expanded)
                                            if (isTeamExpanded) ...[
                                              Container(
                                                padding: const EdgeInsets.only(left: 32, right: 16, top: 8, bottom: 12),
                                                color: isDark ? const Color(0xFF0B0F19) : const Color(0xFFF3F4F6),
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Row(
                                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                      children: [
                                                        Text(
                                                          'PROJETS ASSOCIÉS',
                                                          style: GoogleFonts.inter(
                                                            fontSize: 10,
                                                            fontWeight: FontWeight.w700,
                                                            color: Colors.grey[500],
                                                            letterSpacing: 0.5,
                                                          ),
                                                        ),
                                                        TextButton.icon(
                                                          onPressed: () => _openProjectDialog(context, adminProvider, preselectedTeamId: team.id),
                                                          icon: const Icon(Icons.add, size: 14),
                                                          label: Text('Ajouter', style: GoogleFonts.inter(fontSize: 11)),
                                                          style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                                                        ),
                                                      ],
                                                    ),
                                                    if (teamProjects.isEmpty)
                                                      Padding(
                                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                                        child: Text(
                                                          'Aucun projet associé à cette équipe.',
                                                          style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[500]),
                                                        ),
                                                      )
                                                    else
                                                      ...teamProjects.map((proj) {
                                                        final otherTeams = proj.teamIds
                                                            .where((tId) => tId != team.id)
                                                            .map((tId) => adminProvider.getTeamById(tId)?.name)
                                                            .whereType<String>()
                                                            .toList();

                                                        return Container(
                                                          margin: const EdgeInsets.only(bottom: 6),
                                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                                          decoration: BoxDecoration(
                                                            color: isDark ? const Color(0xFF1F2937) : Colors.white,
                                                            borderRadius: BorderRadius.circular(8),
                                                            border: Border.all(
                                                              color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB),
                                                            ),
                                                          ),
                                                          child: Row(
                                                            children: [
                                                              const Icon(Icons.folder_outlined, size: 16, color: Color(0xFF8B5CF6)),
                                                              const SizedBox(width: 8),
                                                              Expanded(
                                                                child: Column(
                                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                                  children: [
                                                                    Text(
                                                                      proj.name,
                                                                      style: GoogleFonts.inter(
                                                                        fontWeight: FontWeight.w600,
                                                                        fontSize: 12,
                                                                      ),
                                                                    ),
                                                                    if (proj.description.isNotEmpty)
                                                                      Text(
                                                                        proj.description,
                                                                        style: GoogleFonts.inter(fontSize: 10, color: Colors.grey[500]),
                                                                        maxLines: 1,
                                                                        overflow: TextOverflow.ellipsis,
                                                                      ),
                                                                    if (otherTeams.isNotEmpty)
                                                                      Padding(
                                                                        padding: const EdgeInsets.only(top: 2),
                                                                        child: Wrap(
                                                                          spacing: 4,
                                                                          children: otherTeams.map((tName) => Container(
                                                                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                                                            decoration: BoxDecoration(
                                                                              color: const Color(0xFF8B5CF6).withValues(alpha: 0.1),
                                                                              borderRadius: BorderRadius.circular(3),
                                                                            ),
                                                                            child: Text(
                                                                              tName,
                                                                              style: GoogleFonts.inter(fontSize: 9, color: const Color(0xFF8B5CF6)),
                                                                            ),
                                                                          )).toList(),
                                                                        ),
                                                                      ),
                                                                  ],
                                                                ),
                                                              ),
                                                              IconButton(
                                                                icon: const Icon(Icons.edit_outlined, size: 15),
                                                                visualDensity: VisualDensity.compact,
                                                                onPressed: () => _openProjectDialog(context, adminProvider, project: proj),
                                                              ),
                                                              IconButton(
                                                                icon: Icon(Icons.delete_outline, size: 15, color: Colors.red[400]),
                                                                visualDensity: VisualDensity.compact,
                                                                onPressed: () => _confirmDeleteProject(context, adminProvider, proj),
                                                              ),
                                                            ],
                                                          ),
                                                        );
                                                      }),
                                                  ],
                                                ),
                                              ),
                                            ],
                                            const Divider(height: 1, indent: 48),
                                          ],
                                        );
                                      }),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }

  Widget _buildHeaderActions(BuildContext context, AdminProvider adminProvider, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Structure Organisationnelle',
          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        Text(
          'Gérez les départements, équipes et projets. Touchez pour explorer la hiérarchie.',
          style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[500]),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _openProjectDialog(context, adminProvider),
                icon: const Icon(Icons.folder_open, size: 16),
                label: Text('Projet', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () => _openDeptDialog(context, adminProvider),
                icon: const Icon(Icons.add, size: 16, color: Colors.white),
                label: Text('Département', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.white)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryBlue,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ==========================================
  // DIALOGS & CONFIRMATIONS
  // ==========================================

  void _openDeptDialog(BuildContext context, AdminProvider provider, {AdminDepartment? dept}) {
    final messenger = ScaffoldMessenger.of(context);
    final nameCtrl = TextEditingController(text: dept?.name ?? '');
    final descCtrl = TextEditingController(text: dept?.description ?? '');
    final isEditing = dept != null;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          isEditing ? 'Modifier le département' : 'Créer un département',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: InputDecoration(
                labelText: 'Nom du département *',
                hintText: 'Ex: Technologie, Marketing...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descCtrl,
              maxLines: 2,
              decoration: InputDecoration(
                labelText: 'Description',
                hintText: 'Courte description...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx);

              bool success;
              if (isEditing) {
                success = await provider.updateDepartment(
                  dept.id,
                  name: nameCtrl.text,
                  description: descCtrl.text,
                );
              } else {
                success = await provider.addDepartment(
                  name: nameCtrl.text,
                  description: descCtrl.text,
                );
              }

              messenger.showSnackBar(
                SnackBar(
                  content: Text(success
                      ? (isEditing ? 'Département mis à jour' : 'Département créé')
                      : (provider.error ?? 'Une erreur est survenue')),
                  backgroundColor: success ? const Color(0xFF10B981) : Colors.red,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryBlue),
            child: const Text('Sauvegarder', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _openTeamDialog(
    BuildContext context,
    AdminProvider provider, {
    AdminTeam? team,
    String? preselectedDeptId,
  }) {
    final messenger = ScaffoldMessenger.of(context);
    final nameCtrl = TextEditingController(text: team?.name ?? '');
    final descCtrl = TextEditingController(text: team?.description ?? '');
    String selectedDeptId = team?.departmentId ?? preselectedDeptId ?? (provider.departments.isNotEmpty ? provider.departments.first.id : '');
    final isEditing = team != null;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDlg) => AlertDialog(
          title: Text(
            isEditing ? 'Modifier l\'équipe' : 'Créer une équipe',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(
                  labelText: "Nom de l'équipe *",
                  hintText: 'Ex: Frontend, Backend, DevOps...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: selectedDeptId.isNotEmpty ? selectedDeptId : null,
                decoration: InputDecoration(
                  labelText: 'Département *',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
                items: provider.departments.map((d) {
                  return DropdownMenuItem(
                    value: d.id,
                    child: Text(d.name, style: GoogleFonts.inter(fontSize: 13)),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setStateDlg(() => selectedDeptId = val);
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: 'Description',
                  hintText: 'Courte description...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty || selectedDeptId.isEmpty) return;
                Navigator.pop(ctx);

                bool success;
                if (isEditing) {
                  success = await provider.updateTeam(
                    team.id,
                    name: nameCtrl.text,
                    description: descCtrl.text,
                    departmentId: selectedDeptId,
                  );
                } else {
                  success = await provider.addTeam(
                    name: nameCtrl.text,
                    description: descCtrl.text,
                    departmentId: selectedDeptId,
                  );
                }

                messenger.showSnackBar(
                  SnackBar(
                    content: Text(success
                        ? (isEditing ? 'Équipe mise à jour' : 'Équipe créée')
                        : (provider.error ?? 'Une erreur est survenue')),
                    backgroundColor: success ? const Color(0xFF10B981) : Colors.red,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryBlue),
              child: const Text('Sauvegarder', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _openProjectDialog(
    BuildContext context,
    AdminProvider provider, {
    AdminProject? project,
    String? preselectedTeamId,
  }) {
    final messenger = ScaffoldMessenger.of(context);
    final nameCtrl = TextEditingController(text: project?.name ?? '');
    final descCtrl = TextEditingController(text: project?.description ?? '');
    List<String> selectedTeamIds = List<String>.from(
      project?.teamIds ?? (preselectedTeamId != null ? [preselectedTeamId] : []),
    );
    final isEditing = project != null;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDlg) => AlertDialog(
          title: Text(
            isEditing ? 'Modifier le projet' : 'Créer un projet',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700),
          ),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(
                    labelText: 'Nom du projet *',
                    hintText: 'Ex: Refonte Mobile, Sprint Q3...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: 'Description',
                    hintText: 'Courte description...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Équipes impliquées',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Container(
                  constraints: const BoxConstraints(maxHeight: 140),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: provider.teams.isEmpty
                      ? const Center(child: Text('Aucune équipe disponible.'))
                      : ListView(
                          shrinkWrap: true,
                          children: provider.teams.map((t) {
                            final isChecked = selectedTeamIds.contains(t.id);
                            return CheckboxListTile(
                              value: isChecked,
                              dense: true,
                              title: Text(t.name, style: GoogleFonts.inter(fontSize: 13)),
                              onChanged: (val) {
                                setStateDlg(() {
                                  if (val == true) {
                                    selectedTeamIds.add(t.id);
                                  } else {
                                    selectedTeamIds.remove(t.id);
                                  }
                                });
                              },
                            );
                          }).toList(),
                        ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty) return;
                Navigator.pop(ctx);

                bool success;
                if (isEditing) {
                  success = await provider.updateProject(
                    project.id,
                    name: nameCtrl.text,
                    description: descCtrl.text,
                    teamIds: selectedTeamIds,
                  );
                } else {
                  success = await provider.addProject(
                    name: nameCtrl.text,
                    description: descCtrl.text,
                    teamIds: selectedTeamIds,
                  );
                }

                messenger.showSnackBar(
                  SnackBar(
                    content: Text(success
                        ? (isEditing ? 'Projet mis à jour' : 'Projet créé')
                        : (provider.error ?? 'Une erreur est survenue')),
                    backgroundColor: success ? const Color(0xFF10B981) : Colors.red,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryBlue),
              child: const Text('Sauvegarder', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteDept(BuildContext context, AdminProvider provider, AdminDepartment dept) {
    final messenger = ScaffoldMessenger.of(context);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Supprimer le département', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('Voulez-vous vraiment supprimer "${dept.name}" ? Cette action est irréversible.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await provider.deleteDepartment(dept.id);
              messenger.showSnackBar(
                SnackBar(
                  content: Text(success ? 'Département supprimé' : (provider.error ?? 'Erreur')),
                  backgroundColor: success ? Colors.red[700] : Colors.red,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red[700]),
            child: const Text('Supprimer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteTeam(BuildContext context, AdminProvider provider, AdminTeam team) {
    final messenger = ScaffoldMessenger.of(context);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text("Supprimer l'équipe", style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('Voulez-vous vraiment supprimer "${team.name}" ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await provider.deleteTeam(team.id);
              messenger.showSnackBar(
                SnackBar(
                  content: Text(success ? 'Équipe supprimée' : (provider.error ?? 'Erreur')),
                  backgroundColor: success ? Colors.red[700] : Colors.red,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red[700]),
            child: const Text('Supprimer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteProject(BuildContext context, AdminProvider provider, AdminProject project) {
    final messenger = ScaffoldMessenger.of(context);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Supprimer le projet', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('Voulez-vous vraiment supprimer "${project.name}" ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await provider.deleteProject(project.id);
              messenger.showSnackBar(
                SnackBar(
                  content: Text(success ? 'Projet supprimé' : (provider.error ?? 'Erreur')),
                  backgroundColor: success ? Colors.red[700] : Colors.red,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red[700]),
            child: const Text('Supprimer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
