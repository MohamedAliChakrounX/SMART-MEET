import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/chatbot_models.dart';
import '../theme/app_theme.dart';

class ConversationsDrawer extends StatelessWidget {
  final List<ChatConversation> conversations;
  final String? activeId;
  final ValueChanged<String> onSelect;
  final VoidCallback onNew;
  final ValueChanged<String>? onDelete;
  final VoidCallback onClose;

  const ConversationsDrawer({
    super.key,
    required this.conversations,
    required this.activeId,
    required this.onSelect,
    required this.onNew,
    this.onDelete,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Drawer(
      backgroundColor: isDark ? const Color(0xFF111827) : Colors.white,
      width: MediaQuery.of(context).size.width * 0.82,
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  const Icon(
                    Icons.chat_bubble_outline_rounded,
                    color: AppTheme.primaryBlue,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Conversations',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: onClose,
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
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
            ),

            // New Conversation Button
            Padding(
              padding: const EdgeInsets.all(14),
              child: InkWell(
                onTap: () {
                  onNew();
                  onClose();
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.add_rounded,
                        size: 18,
                        color: isDark ? Colors.white70 : const Color(0xFF334155),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Nouveau',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : const Color(0xFF334155),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Conversations List
            Expanded(
              child: conversations.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.chat_bubble_outline_rounded,
                              size: 36,
                              color: isDark ? Colors.grey[700] : const Color(0xFFCBD5E1),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Aucune conversation',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: isDark ? Colors.grey[500] : const Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      itemCount: conversations.length,
                      itemBuilder: (context, index) {
                        final conv = conversations[index];
                        final isActive = conv.id == activeId || conv.sessionId == activeId;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          decoration: BoxDecoration(
                            color: isActive
                                ? (isDark ? const Color(0xFF1E3A8A).withValues(alpha: 0.3) : const Color(0xFFEFF6FF))
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            border: isActive
                                ? Border.all(
                                    color: isDark ? const Color(0xFF1E3A8A) : const Color(0xFFBFDBFE),
                                  )
                                : null,
                          ),
                          child: ListTile(
                            dense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            leading: Icon(
                              Icons.chat_bubble_outline_rounded,
                              size: 16,
                              color: isActive
                                  ? AppTheme.primaryBlue
                                  : (isDark ? Colors.grey[500] : const Color(0xFF94A3B8)),
                            ),
                            title: Text(
                              conv.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                                color: isActive
                                    ? AppTheme.primaryBlue
                                    : (isDark ? Colors.grey[200] : const Color(0xFF334155)),
                              ),
                            ),
                            trailing: onDelete != null
                                ? IconButton(
                                    icon: Icon(
                                      Icons.delete_outline_rounded,
                                      size: 16,
                                      color: isDark ? Colors.grey[600] : const Color(0xFF94A3B8),
                                    ),
                                    onPressed: () => onDelete!(conv.id),
                                    tooltip: 'Supprimer',
                                  )
                                : null,
                            onTap: () {
                              onSelect(conv.id);
                              onClose();
                            },
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
}
