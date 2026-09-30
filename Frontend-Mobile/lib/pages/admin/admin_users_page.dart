import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../models/admin_models.dart';
import '../../providers/admin_provider.dart';
import '../../theme/app_theme.dart';

class AdminUsersPage extends StatefulWidget {
  const AdminUsersPage({super.key});

  @override
  State<AdminUsersPage> createState() => _AdminUsersPageState();
}

class _AdminUsersPageState extends State<AdminUsersPage> {
  String _searchQuery = '';
  final TextEditingController _searchCtrl = TextEditingController();
  String? _expandedUserId;
  AdminUserPermissions? _localPerms;
  bool _isSavingPerms = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().loadAllData();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Color _roleColor(String role) {
    switch (role) {
      case 'ROLE_ADMIN':
        return const Color(0xFFEF4444);
      case 'ROLE_MANAGER':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF10B981);
    }
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'Admin';
      case 'ROLE_MANAGER':
        return 'Manager';
      default:
        return 'Utilisateur';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final adminProvider = context.watch<AdminProvider>();

    final filteredUsers = adminProvider.users.where((u) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return u.fullName.toLowerCase().contains(q) || u.email.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'Utilisateurs & Permissions',
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
          : Column(
              children: [
                // Top Search & Create User
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _searchCtrl,
                              onChanged: (val) => setState(() => _searchQuery = val),
                              decoration: InputDecoration(
                                hintText: 'Rechercher un utilisateur...',
                                hintStyle: GoogleFonts.inter(fontSize: 13, color: Colors.grey[500]),
                                prefixIcon: Icon(Icons.search, size: 20, color: Colors.grey[400]),
                                suffixIcon: _searchQuery.isNotEmpty
                                    ? IconButton(
                                        icon: Icon(Icons.clear, size: 18, color: Colors.grey[400]),
                                        onPressed: () {
                                          _searchCtrl.clear();
                                          setState(() => _searchQuery = '');
                                        },
                                      )
                                    : null,
                                filled: true,
                                fillColor: isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          ElevatedButton.icon(
                            onPressed: () => _openUserDialog(context, adminProvider),
                            icon: const Icon(Icons.person_add_alt_1, size: 16, color: Colors.white),
                            label: Text(
                              'Créer',
                              style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.white),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryBlue,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '${filteredUsers.length} utilisateur${filteredUsers.length > 1 ? 's' : ''}',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primaryBlue,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Users List
                Expanded(
                  child: filteredUsers.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.people_outline, size: 48, color: Colors.grey[400]),
                              const SizedBox(height: 12),
                              Text(
                                adminProvider.users.isEmpty
                                    ? 'Aucun utilisateur trouvé'
                                    : 'Aucun résultat pour "$_searchQuery"',
                                style: GoogleFonts.inter(color: Colors.grey[500], fontSize: 14),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          itemCount: filteredUsers.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final user = filteredUsers[index];
                            final team = adminProvider.getTeamById(user.teamId);
                            final dept = adminProvider.getDepartmentById(team?.departmentId);
                            final isExpanded = _expandedUserId == user.id;
                            final initial = user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : 'U';

                            return Container(
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF111827) : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
                                ),
                              ),
                              child: Column(
                                children: [
                                  // User Row
                                  InkWell(
                                    onTap: () {
                                      setState(() {
                                        if (isExpanded) {
                                          _expandedUserId = null;
                                          _localPerms = null;
                                        } else {
                                          _expandedUserId = user.id;
                                          _localPerms = adminProvider.getUserPermissions(user.id).clone();
                                        }
                                      });
                                    },
                                    borderRadius: BorderRadius.circular(14),
                                    child: Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Row(
                                        children: [
                                          CircleAvatar(
                                            radius: 20,
                                            backgroundColor: AppTheme.primaryBlue.withValues(alpha: 0.15),
                                            child: Text(
                                              initial,
                                              style: GoogleFonts.inter(
                                                fontWeight: FontWeight.w700,
                                                color: AppTheme.primaryBlue,
                                                fontSize: 14,
                                              ),
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
                                                        user.fullName,
                                                        style: GoogleFonts.inter(
                                                          fontWeight: FontWeight.w600,
                                                          fontSize: 14,
                                                          color: isDark ? Colors.white : const Color(0xFF111827),
                                                        ),
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                    const SizedBox(width: 6),
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                      decoration: BoxDecoration(
                                                        color: _roleColor(user.role).withValues(alpha: 0.12),
                                                        borderRadius: BorderRadius.circular(4),
                                                      ),
                                                      child: Text(
                                                        _roleLabel(user.role),
                                                        style: GoogleFonts.inter(
                                                          fontSize: 9,
                                                          fontWeight: FontWeight.w700,
                                                          color: _roleColor(user.role),
                                                        ),
                                                      ),
                                                    ),
                                                    if (!user.isActive) ...[
                                                      const SizedBox(width: 4),
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                                        decoration: BoxDecoration(
                                                          color: Colors.grey.withValues(alpha: 0.2),
                                                          borderRadius: BorderRadius.circular(4),
                                                        ),
                                                        child: Text(
                                                          'Désactivé',
                                                          style: GoogleFonts.inter(fontSize: 9, color: Colors.grey[500]),
                                                        ),
                                                      ),
                                                    ],
                                                  ],
                                                ),
                                                Text(
                                                  user.email,
                                                  style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[500]),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                                if (team != null) ...[
                                                  const SizedBox(height: 3),
                                                  Row(
                                                    children: [
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                                        decoration: BoxDecoration(
                                                          color: const Color(0xFF10B981).withValues(alpha: 0.1),
                                                          borderRadius: BorderRadius.circular(4),
                                                        ),
                                                        child: Text(
                                                          team.name,
                                                          style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF10B981)),
                                                        ),
                                                      ),
                                                      if (dept != null) ...[
                                                        const SizedBox(width: 4),
                                                        Text('•', style: TextStyle(color: Colors.grey[400], fontSize: 10)),
                                                        const SizedBox(width: 4),
                                                        Text(dept.name, style: GoogleFonts.inter(fontSize: 10, color: Colors.grey[500])),
                                                      ],
                                                    ],
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              IconButton(
                                                icon: const Icon(Icons.edit_outlined, size: 18),
                                                visualDensity: VisualDensity.compact,
                                                onPressed: () => _openUserDialog(context, adminProvider, user: user),
                                              ),
                                              IconButton(
                                                icon: Icon(Icons.delete_outline, size: 18, color: Colors.red[400]),
                                                visualDensity: VisualDensity.compact,
                                                onPressed: () => _confirmDeleteUser(context, adminProvider, user),
                                              ),
                                              Icon(
                                                isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                                color: Colors.grey[400],
                                                size: 20,
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),

                                  // Permissions Panel (when user expanded)
                                  if (isExpanded && _localPerms != null) ...[
                                    const Divider(height: 1),
                                    Container(
                                      padding: const EdgeInsets.all(14),
                                      color: isDark ? const Color(0xFF0F172A).withValues(alpha: 0.5) : const Color(0xFFF9FAFB),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              const Icon(Icons.security, size: 16, color: AppTheme.primaryBlue),
                                              const SizedBox(width: 8),
                                              Text(
                                                'Permissions de ${user.fullName}',
                                                style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 12),

                                          // 1. Upload Meeting
                                          _buildPermCard(
                                            title: 'Upload de Meeting',
                                            icon: Icons.upload_file,
                                            isDark: isDark,
                                            children: [
                                              _buildPermSwitch(
                                                label: 'Uploader un meeting',
                                                subLabel: 'Génère transcription, PV et analytics',
                                                value: _localPerms!.canUploadMeeting,
                                                onChanged: (v) => setState(() => _localPerms!.canUploadMeeting = v),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 10),

                                          // 2. Team Level
                                          _buildPermCard(
                                            title: 'Niveau Équipe (${team?.name ?? "N/A"})',
                                            icon: Icons.group,
                                            isDark: isDark,
                                            children: [
                                              _buildPermSwitch(
                                                label: 'Transcriptions',
                                                value: _localPerms!.canViewTeamTranscription,
                                                onChanged: (v) => setState(() => _localPerms!.canViewTeamTranscription = v),
                                              ),
                                              const Divider(height: 8),
                                              _buildPermSwitch(
                                                label: 'PV (Procès-Verbal)',
                                                value: _localPerms!.canViewTeamPV,
                                                onChanged: (v) => setState(() => _localPerms!.canViewTeamPV = v),
                                              ),
                                              const Divider(height: 8),
                                              _buildPermSwitch(
                                                label: 'Analytics (personnelle)',
                                                value: _localPerms!.canViewTeamBehaviorAnalytics,
                                                onChanged: (v) => setState(() => _localPerms!.canViewTeamBehaviorAnalytics = v),
                                              ),
                                              const Divider(height: 8),
                                              _buildPermSwitch(
                                                label: 'Analytics (des autres)',
                                                value: _localPerms!.canViewTeamOthersBehavior,
                                                onChanged: (v) => setState(() => _localPerms!.canViewTeamOthersBehavior = v),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 10),

                                          // 3. Department Level
                                          _buildPermCard(
                                            title: 'Niveau Département (${dept?.name ?? "N/A"})',
                                            icon: Icons.apartment,
                                            isDark: isDark,
                                            children: [
                                              _buildPermSwitch(
                                                label: 'Transcriptions',
                                                value: _localPerms!.canViewDeptTranscription,
                                                onChanged: (v) => setState(() => _localPerms!.canViewDeptTranscription = v),
                                              ),
                                              const Divider(height: 8),
                                              _buildPermSwitch(
                                                label: 'PV (Procès-Verbal)',
                                                value: _localPerms!.canViewDeptPV,
                                                onChanged: (v) => setState(() => _localPerms!.canViewDeptPV = v),
                                              ),
                                              const Divider(height: 8),
                                              _buildPermSwitch(
                                                label: 'Analytics (personnelle)',
                                                value: _localPerms!.canViewDeptBehaviorAnalytics,
                                                onChanged: (v) => setState(() => _localPerms!.canViewDeptBehaviorAnalytics = v),
                                              ),
                                              const Divider(height: 8),
                                              _buildPermSwitch(
                                                label: 'Analytics (des autres)',
                                                value: _localPerms!.canViewDeptOthersBehavior,
                                                onChanged: (v) => setState(() => _localPerms!.canViewDeptOthersBehavior = v),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 14),

                                          // Save Button
                                          Align(
                                            alignment: Alignment.centerRight,
                                            child: ElevatedButton.icon(
                                              onPressed: _isSavingPerms
                                                  ? null
                                                  : () async {
                                                      final messenger = ScaffoldMessenger.of(context);
                                                      setState(() => _isSavingPerms = true);
                                                      final success = await adminProvider.saveUserPermissions(
                                                        user.id,
                                                        _localPerms!,
                                                      );
                                                      setState(() => _isSavingPerms = false);

                                                      messenger.showSnackBar(
                                                        SnackBar(
                                                          content: Text(success
                                                              ? 'Permissions sauvegardées avec succès'
                                                              : (adminProvider.error ?? 'Erreur de sauvegarde')),
                                                          backgroundColor: success ? const Color(0xFF10B981) : Colors.red,
                                                          behavior: SnackBarBehavior.floating,
                                                        ),
                                                      );
                                                    },
                                              icon: _isSavingPerms
                                                  ? const SizedBox(
                                                      width: 14,
                                                      height: 14,
                                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                                    )
                                                  : const Icon(Icons.save, size: 16, color: Colors.white),
                                              label: Text(
                                                'Sauvegarder les permissions',
                                                style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 12, color: Colors.white),
                                              ),
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: AppTheme.primaryBlue,
                                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildPermCard({
    required String title,
    required IconData icon,
    required bool isDark,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: AppTheme.primaryBlue),
              const SizedBox(width: 6),
              Text(
                title,
                style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );
  }

  Widget _buildPermSwitch({
    required String label,
    String? subLabel,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500)),
              if (subLabel != null)
                Text(subLabel, style: GoogleFonts.inter(fontSize: 10, color: Colors.grey[500])),
            ],
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          activeTrackColor: AppTheme.primaryBlue,
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      ],
    );
  }

  // ==========================================
  // USER DIALOGS & ACTIONS
  // ==========================================

  void _openUserDialog(BuildContext context, AdminProvider provider, {AdminUser? user}) {
    final messenger = ScaffoldMessenger.of(context);
    final firstCtrl = TextEditingController(text: user?.firstName ?? '');
    final lastCtrl = TextEditingController(text: user?.lastName ?? '');
    final emailCtrl = TextEditingController(text: user?.email ?? '');
    final passCtrl = TextEditingController();
    String selectedRole = user?.role ?? 'ROLE_USER';
    String? selectedTeamId = user?.teamId ?? (provider.teams.isNotEmpty ? provider.teams.first.id : null);
    final isEditing = user != null;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDlg) => AlertDialog(
          title: Text(
            isEditing ? "Modifier l'utilisateur" : 'Créer un utilisateur',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: firstCtrl,
                        decoration: InputDecoration(
                          labelText: 'Prénom *',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: lastCtrl,
                        decoration: InputDecoration(
                          labelText: 'Nom *',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: 'Email *',
                    hintText: 'nom@entreprise.com',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: passCtrl,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: isEditing ? 'Mot de passe (optionnel)' : 'Mot de passe *',
                    hintText: '••••••••',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: selectedRole,
                  decoration: InputDecoration(
                    labelText: 'Rôle *',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'ROLE_USER', child: Text('Utilisateur standard')),
                    DropdownMenuItem(value: 'ROLE_MANAGER', child: Text('Manager')),
                    DropdownMenuItem(value: 'ROLE_ADMIN', child: Text('Administrateur')),
                  ],
                  onChanged: (val) {
                    if (val != null) setStateDlg(() => selectedRole = val);
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: selectedTeamId,
                  decoration: InputDecoration(
                    labelText: 'Équipe principale',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Aucune équipe')),
                    ...provider.teams.map((t) => DropdownMenuItem(
                          value: t.id,
                          child: Text(t.name, style: GoogleFonts.inter(fontSize: 13)),
                        )),
                  ],
                  onChanged: (val) {
                    setStateDlg(() => selectedTeamId = val);
                  },
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
                if (firstCtrl.text.trim().isEmpty ||
                    lastCtrl.text.trim().isEmpty ||
                    emailCtrl.text.trim().isEmpty ||
                    (!isEditing && passCtrl.text.isEmpty)) {
                  return;
                }
                Navigator.pop(ctx);

                bool success;
                if (isEditing) {
                  success = await provider.updateUser(
                    user.id,
                    firstName: firstCtrl.text,
                    lastName: lastCtrl.text,
                    email: emailCtrl.text,
                    password: passCtrl.text.isNotEmpty ? passCtrl.text : null,
                    role: selectedRole,
                    teamId: selectedTeamId,
                  );
                } else {
                  success = await provider.addUser(
                    firstName: firstCtrl.text,
                    lastName: lastCtrl.text,
                    email: emailCtrl.text,
                    password: passCtrl.text,
                    role: selectedRole,
                    teamId: selectedTeamId,
                  );
                }

                messenger.showSnackBar(
                  SnackBar(
                    content: Text(success
                        ? (isEditing ? 'Utilisateur mis à jour' : 'Utilisateur créé')
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

  void _confirmDeleteUser(BuildContext context, AdminProvider provider, AdminUser user) {
    final messenger = ScaffoldMessenger.of(context);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text("Supprimer l'utilisateur", style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('Voulez-vous vraiment supprimer "${user.fullName}" ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await provider.deleteUser(user.id);
              messenger.showSnackBar(
                SnackBar(
                  content: Text(success ? 'Utilisateur supprimé' : (provider.error ?? 'Erreur')),
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
