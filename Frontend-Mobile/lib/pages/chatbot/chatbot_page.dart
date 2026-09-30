import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';

import '../../models/chatbot_models.dart';
import '../../services/chatbot_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/conversations_drawer.dart';
import '../../widgets/meetings_drawer.dart';
import '../../widgets/dashboard_chart_widget.dart';

class ChatbotPage extends StatefulWidget {
  const ChatbotPage({super.key});

  @override
  State<ChatbotPage> createState() => _ChatbotPageState();
}

class _ChatbotPageState extends State<ChatbotPage> {
  final ChatbotService _chatbotService = ChatbotService();
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  final AudioRecorder _audioRecorder = AudioRecorder();

  // State
  List<ChatMessage> _messages = [];
  List<ChatConversation> _conversations = [];
  List<ChatMeeting> _meetings = [];
  String? _activeConversationId;
  bool _isLoading = false;
  bool _isRecording = false;

  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  int get _selectedMeetingCount => _meetings.where((m) => m.selected).length;
  List<String> get _selectedMeetingIds =>
      _meetings.where((m) => m.selected).map((m) => m.id).toList();

  final List<Map<String, dynamic>> _quickSuggestions = [
    {
      'title': 'Décisions récentes',
      'desc': 'Quelles sont les décisions clés prises lors des dernières réunions ?',
      'icon': Icons.lightbulb_outline_rounded,
    },
    {
      'title': 'Statistiques & Participation',
      'desc': 'Affiche un graphique sur le temps de parole et les prises de parole.',
      'icon': Icons.bar_chart_rounded,
    },
    {
      'title': 'Actions en attente',
      'desc': 'Quelles sont les prochaines étapes et tâches assignées ?',
      'icon': Icons.assignment_outlined,
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    _audioRecorder.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() => _isLoading = true);

    // 1. Load meetings from backend
    try {
      final meetings = await _chatbotService.getChatMeetings();
      if (mounted) {
        setState(() {
          _meetings = meetings;
        });
      }
    } catch (_) {}

    // 2. Load past conversations history
    try {
      final history = await _chatbotService.getHistory();
      if (mounted) {
        setState(() {
          _conversations = history;
        });
      }
    } catch (_) {}

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _selectConversation(String convId) async {
    setState(() {
      _activeConversationId = convId;
      _isLoading = true;
    });

    try {
      final msgs = await _chatbotService.getConversation(convId);
      if (mounted) {
        setState(() {
          _messages = msgs;
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _startNewConversation() {
    setState(() {
      _activeConversationId = null;
      _messages = [];
      _inputCtrl.clear();
    });
  }

  Future<void> _deleteConversation(String convId) async {
    final success = await _chatbotService.deleteConversation(convId);
    if (success && mounted) {
      setState(() {
        _conversations.removeWhere((c) => c.id == convId || c.sessionId == convId);
        if (_activeConversationId == convId) {
          _startNewConversation();
        }
      });
    }
  }

  Future<void> _sendMessage(String text) async {
    final query = text.trim();
    if (query.isEmpty || _isLoading) return;

    _inputCtrl.clear();

    final userMsg = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sender: 'user',
      text: query,
      createdAt: DateTime.now(),
    );

    setState(() {
      _messages.add(userMsg);
      _isLoading = true;
    });
    _scrollToBottom();

    final botReply = await _chatbotService.sendMessage(
      message: query,
      conversationId: _activeConversationId,
      meetingIds: _selectedMeetingIds,
    );

    if (mounted) {
      setState(() {
        _messages.add(botReply);
        _isLoading = false;
      });
      _scrollToBottom();

      // Refresh conversation list in background
      _chatbotService.getHistory().then((history) {
        if (mounted) setState(() => _conversations = history);
      }).catchError((_) {});
    }
  }

  Future<void> _toggleRecording() async {
    if (_isRecording) {
      try {
        final path = await _audioRecorder.stop();
        setState(() => _isRecording = false);
        if (path != null && File(path).existsSync()) {
          setState(() => _isLoading = true);
          final transcript = await _chatbotService.transcribeAudio(path);
          if (transcript != null && transcript.isNotEmpty) {
            _inputCtrl.text = transcript;
            _sendMessage(transcript);
          } else {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Transcription audio indisponible')),
              );
            }
          }
          setState(() => _isLoading = false);
        }
      } catch (e) {
        setState(() {
          _isRecording = false;
          _isLoading = false;
        });
      }
    } else {
      final hasPermission = await _audioRecorder.hasPermission();
      if (!hasPermission) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Permission microphone requise')),
          );
        }
        return;
      }

      final tempDir = await getTemporaryDirectory();
      final filePath = '${tempDir.path}/chat_voice_${DateTime.now().millisecondsSinceEpoch}.m4a';

      await _audioRecorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc),
        path: filePath,
      );

      setState(() => _isRecording = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF111827) : Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 19,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Retour',
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF172554), AppTheme.primaryBlue],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryBlue.withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 10),
            Text(
              'Assistant IA',
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
        actions: [
          // Conversations drawer button
          IconButton(
            icon: Icon(
              Icons.chat_bubble_outline_rounded,
              size: 20,
              color: isDark ? Colors.white70 : AppTheme.primaryBlue,
            ),
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
            tooltip: 'Historique des conversations',
          ),

          // Meetings filter drawer button
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: Icon(
                  Icons.tune_rounded,
                  size: 20,
                  color: isDark ? Colors.white70 : AppTheme.primaryBlue,
                ),
                onPressed: () => _scaffoldKey.currentState?.openEndDrawer(),
                tooltip: 'Filtres réunions',
              ),
              if (_selectedMeetingCount > 0)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppTheme.primaryBlue,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '$_selectedMeetingCount',
                      style: GoogleFonts.inter(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 4),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(
            height: 1,
            thickness: 0.5,
            color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
          ),
        ),
      ),
      drawer: ConversationsDrawer(
        conversations: _conversations,
        activeId: _activeConversationId,
        onSelect: _selectConversation,
        onNew: _startNewConversation,
        onDelete: _deleteConversation,
        onClose: () => _scaffoldKey.currentState?.closeDrawer(),
      ),
      endDrawer: MeetingsDrawer(
        meetings: _meetings,
        onToggle: (id) {
          setState(() {
            for (final m in _meetings) {
              if (m.id == id) {
                m.selected = !m.selected;
                break;
              }
            }
          });
        },
        onCheckAll: () {
          setState(() {
            for (final m in _meetings) {
              m.selected = true;
            }
          });
        },
        onUncheckAll: () {
          setState(() {
            for (final m in _meetings) {
              m.selected = false;
            }
          });
        },
        onClose: () => _scaffoldKey.currentState?.closeEndDrawer(),
      ),
      body: Column(
        children: [
          // ─── Messages or Empty State ──────────────────────────────
          Expanded(
            child: _messages.isEmpty
                ? _buildEmptyState(isDark)
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    itemCount: _messages.length + (_isLoading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length && _isLoading) {
                        return _buildTypingIndicator(isDark);
                      }
                      final msg = _messages[index];
                      return _buildMessageItem(msg, isDark);
                    },
                  ),
          ),

          // ─── Bottom Chat Input Bar ────────────────────────────────
          _buildChatInput(isDark),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark
                    ? [const Color(0xFF1E3A8A).withValues(alpha: 0.3), const Color(0xFF172554)]
                    : [const Color(0xFFEFF6FF), const Color(0xFFDBEAFE)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
              border: Border.all(
                color: isDark ? const Color(0xFF1E3A8A) : const Color(0xFFBFDBFE),
                width: 1.5,
              ),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              size: 38,
              color: AppTheme.primaryBlue,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Assistant Réunions IA',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Posez vos questions sur vos réunions, demandez des synthèses, des décisions ou des analyses statistiques.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 12.5,
              height: 1.45,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 28),

          // Suggestions cards
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Suggestions rapides'.toUpperCase(),
              style: GoogleFonts.inter(
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: isDark ? Colors.grey[500] : const Color(0xFF94A3B8),
              ),
            ),
          ),
          const SizedBox(height: 10),

          ..._quickSuggestions.map((item) {
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF111827) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.02),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF1E3A8A).withValues(alpha: 0.25)
                        : const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    item['icon'] as IconData,
                    size: 18,
                    color: AppTheme.primaryBlue,
                  ),
                ),
                title: Text(
                  item['title'] as String,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                subtitle: Text(
                  item['desc'] as String,
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
                trailing: const Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 12,
                  color: Color(0xFF94A3B8),
                ),
                onTap: () => _sendMessage(item['desc'] as String),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildMessageItem(ChatMessage msg, bool isDark) {
    if (msg.isUser) {
      // User message: aligned right in blue-900
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                decoration: const BoxDecoration(
                  color: AppTheme.primaryBlue,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(18),
                    topRight: Radius.circular(18),
                    bottomLeft: Radius.circular(18),
                    bottomRight: Radius.circular(4),
                  ),
                ),
                child: Text(
                  msg.text,
                  style: GoogleFonts.inter(
                    fontSize: 13.5,
                    color: Colors.white,
                    height: 1.45,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Assistant message: stylish card
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF111827) : Colors.white,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(4),
                topRight: Radius.circular(18),
                bottomLeft: Radius.circular(18),
                bottomRight: Radius.circular(18),
              ),
              border: Border.all(
                color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              msg.text,
              style: GoogleFonts.inter(
                fontSize: 13.5,
                color: isDark ? const Color(0xFFF9FAFB) : const Color(0xFF1E293B),
                height: 1.5,
              ),
            ),
          ),

          // Sources pill badges
          if (msg.sources != null && msg.sources!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: msg.sources!.map((src) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1F2937) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark ? const Color(0xFF374151) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.description_outlined,
                        size: 13,
                        color: AppTheme.primaryBlue,
                      ),
                      const SizedBox(width: 5),
                      Flexible(
                        child: Text(
                          src.meetingTitle,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: isDark ? Colors.grey[300] : const Color(0xFF334155),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],

          // Attached Dashboard Chart
          if (msg.speakerStats != null && msg.speakerStats!.isNotEmpty)
            DashboardChartWidget(stats: msg.speakerStats!)
          else if (msg.dashboardConfig != null)
            DashboardChartWidget(
              stats: const [],
              config: msg.dashboardConfig,
            ),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator(bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF111827) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryBlue),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Réflexion en cours…',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: isDark ? Colors.grey[400] : const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChatInput(bool isDark) {
    return Container(
      padding: EdgeInsets.fromLTRB(14, 8, 14, 12 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Voice Dictation Button (Microphone)
          InkWell(
            onTap: _toggleRecording,
            borderRadius: BorderRadius.circular(22),
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: _isRecording
                    ? const Color(0xFFDC2626)
                    : (isDark ? const Color(0xFF1F2937) : const Color(0xFFF1F5F9)),
                shape: BoxShape.circle,
                border: Border.all(
                  color: _isRecording
                      ? const Color(0xFFDC2626)
                      : (isDark ? const Color(0xFF374151) : const Color(0xFFE2E8F0)),
                ),
              ),
              child: Icon(
                _isRecording ? Icons.stop_rounded : Icons.mic_rounded,
                color: _isRecording
                    ? Colors.white
                    : (isDark ? Colors.grey[300] : AppTheme.primaryBlue),
                size: 20,
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Expanding text input
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB),
                ),
              ),
              child: TextField(
                controller: _inputCtrl,
                maxLines: 4,
                minLines: 1,
                textInputAction: TextInputAction.send,
                onSubmitted: _sendMessage,
                onChanged: (_) => setState(() {}),
                style: GoogleFonts.inter(
                  fontSize: 13.5,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
                decoration: InputDecoration(
                  hintText: 'Posez votre question sur les réunions…',
                  hintStyle: GoogleFonts.inter(
                    fontSize: 13,
                    color: isDark ? Colors.grey[500] : const Color(0xFF94A3B8),
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Send button
          ValueListenableBuilder<TextEditingValue>(
            valueListenable: _inputCtrl,
            builder: (context, value, _) {
              final canSend = value.text.trim().isNotEmpty && !_isLoading;

              return InkWell(
                onTap: canSend ? () => _sendMessage(_inputCtrl.text) : null,
                borderRadius: BorderRadius.circular(22),
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: canSend
                        ? AppTheme.primaryBlue
                        : (isDark ? const Color(0xFF1F2937) : const Color(0xFFE5E7EB)),
                    shape: BoxShape.circle,
                    boxShadow: canSend
                        ? [
                            BoxShadow(
                              color: AppTheme.primaryBlue.withValues(alpha: 0.35),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: Icon(
                    Icons.send_rounded,
                    color: canSend
                        ? Colors.white
                        : (isDark ? Colors.grey[600] : const Color(0xFF94A3B8)),
                    size: 18,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
