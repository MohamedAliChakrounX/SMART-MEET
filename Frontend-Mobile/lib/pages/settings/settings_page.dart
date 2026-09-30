import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/app_state.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../l10n/l10n.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final appState = context.watch<AppState>();
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.currentUser;
    final l = context.l10n;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          l('settings_title'),
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 17),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
        children: [
          if (user != null) ...[
            _buildHeader(l('settings_user')),
            Container(
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 24),
              decoration: BoxDecoration(
                color: AppTheme.primaryBlue.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.primaryBlue.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: AppTheme.primaryBlue,
                    child: Text(
                      user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : 'U',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName,
                          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          user.email,
                          style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[500]),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${l("settings_role")}: ${user.role}',
                          style: GoogleFonts.inter(fontSize: 11, color: AppTheme.primaryBlue, fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          if (user != null && user.role.contains('ADMIN')) ...[
            // ── ADMINISTRATION ──
            _buildHeader('ADMINISTRATION'),
            _buildSettingsTile(
              icon: Icons.admin_panel_settings,
              title: 'Portail Administrateur',
              subtitle: 'Gestion globale de l\'organisation et des utilisateurs',
              onTap: () => context.push('/admin'),
            ),
            _buildSettingsTile(
              icon: Icons.apartment_rounded,
              title: 'Organisation',
              subtitle: 'Départements, équipes et projets',
              onTap: () => context.push('/admin/organisation'),
            ),
            _buildSettingsTile(
              icon: Icons.people_alt_rounded,
              title: 'Utilisateurs & Permissions',
              subtitle: 'Comptes membres et gestion des accès',
              onTap: () => context.push('/admin/users'),
            ),
            const SizedBox(height: 12),
          ],

          // ── LANGUE ──
          _buildHeader(l('settings_language')),
          Container(
            margin: const EdgeInsets.only(bottom: 24),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.1)),
            ),
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
                      child: const Icon(Icons.language, size: 20, color: AppTheme.primaryBlue),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      l('settings_language_label'),
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: _LanguagePill(
                        label: '🇫🇷 Français',
                        selected: appState.language == 'fr',
                        onTap: () => appState.setLanguage('fr'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _LanguagePill(
                        label: '🇬🇧 English',
                        selected: appState.language == 'en',
                        onTap: () => appState.setLanguage('en'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // ── APPARENCE ──
          _buildHeader(l('settings_appearance')),
          _buildToggleTile(
            icon: appState.darkMode ? Icons.light_mode : Icons.dark_mode,
            title: l('settings_dark_mode'),
            subtitle: l('settings_dark_mode_sub'),
            value: appState.darkMode,
            onChanged: (v) => appState.toggleDarkMode(),
          ),
          const SizedBox(height: 24),

          // ── COMPTE ──
          _buildHeader(l('settings_account')),
          _buildSettingsTile(
            icon: Icons.notifications_none,
            title: l('settings_notifications'),
            subtitle: l('settings_notifications_sub'),
            onTap: () {},
          ),
          _buildSettingsTile(
            icon: Icons.logout,
            title: l('settings_logout'),
            subtitle: l('settings_logout_sub'),
            onTap: () async {
              await authProvider.logout();
              if (context.mounted) context.go('/login');
            },
          ),
          const SizedBox(height: 24),
          _buildHeader(l('settings_about')),
          _buildSettingsTile(
            icon: Icons.info_outline,
            title: l('settings_version'),
            subtitle: '1.0.0 (API Integrated)',
            onTap: () {},
          ),
          const SizedBox(height: 48),
          Center(
            child: Text(
              l('settings_footer'),
              style: GoogleFonts.inter(
                fontSize: 10,
                color: Colors.grey[500],
                fontWeight: FontWeight.w700,
                letterSpacing: 2,
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 12),
      child: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: AppTheme.primaryBlue,
          letterSpacing: 1.5,
        ),
      ),
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.1)),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.primaryBlue.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 20, color: AppTheme.primaryBlue),
        ),
        title: Text(
          title,
          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        subtitle: subtitle != null
            ? Text(
                subtitle,
                style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[500]),
              )
            : null,
        trailing: Icon(Icons.chevron_right, size: 20, color: Colors.grey[400]),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }

  Widget _buildToggleTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.1)),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.primaryBlue.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 20, color: AppTheme.primaryBlue),
        ),
        title: Text(
          title,
          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          subtitle,
          style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[500]),
        ),
        trailing: Switch(
          value: value,
          onChanged: onChanged,
          activeTrackColor: AppTheme.primaryBlue,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}

class _LanguagePill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _LanguagePill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primaryBlue : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppTheme.primaryBlue : Colors.grey.withValues(alpha: 0.3),
            width: 1.5,
          ),
        ),
        child: Center(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : Colors.grey[500],
            ),
          ),
        ),
      ),
    );
  }
}
