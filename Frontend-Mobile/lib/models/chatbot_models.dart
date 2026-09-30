// Models for ChatBot AI Assistant
import 'dart:convert';
import 'package:intl/intl.dart';

class ChatSource {
  final String meetingId;
  final String meetingTitle;
  final String chunkType;
  final double? similarity;

  ChatSource({
    required this.meetingId,
    required this.meetingTitle,
    this.chunkType = 'transcript',
    this.similarity,
  });

  factory ChatSource.fromJson(dynamic json) {
    if (json is String) {
      return ChatSource(
        meetingId: '',
        meetingTitle: json,
      );
    }
    if (json is Map<String, dynamic>) {
      return ChatSource(
        meetingId: json['meeting_id']?.toString() ?? '',
        meetingTitle: json['meeting_title']?.toString() ?? json['title']?.toString() ?? 'Réunion',
        chunkType: json['chunk_type']?.toString() ?? 'transcript',
        similarity: json['similarity'] is num ? (json['similarity'] as num).toDouble() : null,
      );
    }
    return ChatSource(meetingId: '', meetingTitle: json.toString());
  }

  Map<String, dynamic> toJson() => {
        'meeting_id': meetingId,
        'meeting_title': meetingTitle,
        'chunk_type': chunkType,
        'similarity': similarity,
      };
}

class SpeakerStat {
  final String speaker;
  final double speaking;
  final double initiated;
  final double received;

  SpeakerStat({
    required this.speaker,
    required this.speaking,
    required this.initiated,
    required this.received,
  });

  factory SpeakerStat.fromJson(Map<String, dynamic> json) {
    return SpeakerStat(
      speaker: json['speaker']?.toString() ?? 'Participant',
      speaking: (json['speaking'] is num) ? (json['speaking'] as num).toDouble() : 0.0,
      initiated: (json['initiated'] is num) ? (json['initiated'] as num).toDouble() : 0.0,
      received: (json['received'] is num) ? (json['received'] as num).toDouble() : 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'speaker': speaker,
        'speaking': speaking,
        'initiated': initiated,
        'received': received,
      };
}

class ChatMessage {
  final String id;
  final String sender; // 'user' | 'assistant'
  final String text;
  final DateTime createdAt;
  final List<ChatSource>? sources;
  final Map<String, dynamic>? dashboardConfig;
  final List<SpeakerStat>? speakerStats;
  final bool isPending;

  ChatMessage({
    required this.id,
    required this.sender,
    required this.text,
    required this.createdAt,
    this.sources,
    this.dashboardConfig,
    this.speakerStats,
    this.isPending = false,
  });

  bool get isUser => sender == 'user';

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    List<ChatSource>? parsedSources;
    if (json['sources'] is List) {
      parsedSources = (json['sources'] as List)
          .map((s) => ChatSource.fromJson(s))
          .toList();
    }

    Map<String, dynamic>? parsedDashboard;
    List<SpeakerStat>? parsedSpeakerStats;

    // Parse metadata if present
    dynamic metadata = json['metadata'];
    if (metadata is String) {
      try {
        metadata = jsonDecode(metadata);
      } catch (_) {}
    }

    if (metadata is Map<String, dynamic>) {
      if (metadata['dashboard_spec'] is Map<String, dynamic>) {
        parsedDashboard = metadata['dashboard_spec'];
      } else if (metadata['dashboard_config'] is Map<String, dynamic>) {
        parsedDashboard = metadata['dashboard_config'];
      }
      if (metadata['sources'] is List && parsedSources == null) {
        parsedSources = (metadata['sources'] as List)
            .map((s) => ChatSource.fromJson(s))
            .toList();
      }
      if (metadata['speaker_stats'] is List) {
        parsedSpeakerStats = (metadata['speaker_stats'] as List)
            .map((s) => SpeakerStat.fromJson(s as Map<String, dynamic>))
            .toList();
      }
    }

    if (json['dashboard_spec'] is Map<String, dynamic>) {
      parsedDashboard = json['dashboard_spec'];
    } else if (json['dashboard_config'] is Map<String, dynamic>) {
      parsedDashboard = json['dashboard_config'];
    }

    if (json['speaker_stats'] is List) {
      parsedSpeakerStats = (json['speaker_stats'] as List)
          .map((s) => SpeakerStat.fromJson(s as Map<String, dynamic>))
          .toList();
    }

    // If dashboard config contains speaker participation data, extract speaker stats
    if (parsedDashboard != null && parsedSpeakerStats == null) {
      parsedSpeakerStats = _extractSpeakerStatsFromDashboard(parsedDashboard);
    }

    return ChatMessage(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      sender: json['role']?.toString() == 'user' || json['sender']?.toString() == 'user' ? 'user' : 'assistant',
      text: json['response_text']?.toString() ?? json['content']?.toString() ?? json['response']?.toString() ?? json['text']?.toString() ?? '',
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
      sources: parsedSources,
      dashboardConfig: parsedDashboard,
      speakerStats: parsedSpeakerStats,
      isPending: false,
    );
  }

  static List<SpeakerStat>? _extractSpeakerStatsFromDashboard(Map<String, dynamic> dashboard) {
    try {
      final data = dashboard['data'];
      if (data is Map<String, dynamic>) {
        final labels = data['labels'];
        final datasets = data['datasets'];
        if (labels is List && datasets is List && datasets.isNotEmpty) {
          final List<SpeakerStat> stats = [];
          final speakingData = datasets.isNotEmpty && datasets[0]['data'] is List ? datasets[0]['data'] as List : [];
          final initiatedData = datasets.length > 1 && datasets[1]['data'] is List ? datasets[1]['data'] as List : [];
          final receivedData = datasets.length > 2 && datasets[2]['data'] is List ? datasets[2]['data'] as List : [];

          for (int i = 0; i < labels.length; i++) {
            final speaker = labels[i]?.toString() ?? 'Speaker ${i + 1}';
            final speaking = i < speakingData.length && speakingData[i] is num ? (speakingData[i] as num).toDouble() : 0.0;
            final initiated = i < initiatedData.length && initiatedData[i] is num ? (initiatedData[i] as num).toDouble() : 0.0;
            final received = i < receivedData.length && receivedData[i] is num ? (receivedData[i] as num).toDouble() : 0.0;
            stats.add(SpeakerStat(
              speaker: speaker,
              speaking: speaking,
              initiated: initiated,
              received: received,
            ));
          }
          if (stats.isNotEmpty) return stats;
        }
      }
    } catch (_) {}
    return null;
  }

  ChatMessage copyWith({
    String? id,
    String? sender,
    String? text,
    DateTime? createdAt,
    List<ChatSource>? sources,
    Map<String, dynamic>? dashboardConfig,
    List<SpeakerStat>? speakerStats,
    bool? isPending,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      sender: sender ?? this.sender,
      text: text ?? this.text,
      createdAt: createdAt ?? this.createdAt,
      sources: sources ?? this.sources,
      dashboardConfig: dashboardConfig ?? this.dashboardConfig,
      speakerStats: speakerStats ?? this.speakerStats,
      isPending: isPending ?? this.isPending,
    );
  }
}

class ChatConversation {
  final String id;
  final String sessionId;
  final String title;
  final DateTime? lastActivity;
  final String? lastMessage;

  ChatConversation({
    required this.id,
    required this.sessionId,
    required this.title,
    this.lastActivity,
    this.lastMessage,
  });

  factory ChatConversation.fromJson(Map<String, dynamic> json) {
    final sid = json['session_id']?.toString() ?? json['conversation_id']?.toString() ?? json['id']?.toString() ?? '';
    final lastMsg = json['last_message']?.toString();
    final title = json['title']?.toString() ?? (lastMsg != null && lastMsg.isNotEmpty ? lastMsg : 'Conversation');

    DateTime? activity;
    if (json['last_activity'] != null) {
      activity = DateTime.tryParse(json['last_activity'].toString());
    } else if (json['updated_at'] != null) {
      activity = DateTime.tryParse(json['updated_at'].toString());
    }

    return ChatConversation(
      id: sid,
      sessionId: sid,
      title: title,
      lastActivity: activity,
      lastMessage: lastMsg,
    );
  }
}

class ChatMeeting {
  final String id;
  final String title;
  final DateTime? startAt;
  final String status;
  final String? description;
  final String? projectName;
  final List<String> teamNames;
  final List<String> departmentNames;
  bool selected;

  ChatMeeting({
    required this.id,
    required this.title,
    this.startAt,
    this.status = 'COMPLETED',
    this.description,
    this.projectName,
    this.teamNames = const [],
    this.departmentNames = const [],
    this.selected = false,
  });

  String get formattedDate {
    if (startAt == null) return '';
    try {
      return DateFormat('d MMM yyyy', 'fr_FR').format(startAt!);
    } catch (_) {
      return DateFormat('d MMM yyyy').format(startAt!);
    }
  }

  factory ChatMeeting.fromJson(Map<String, dynamic> json, {bool defaultSelected = false}) {
    DateTime? parsedDate;
    if (json['start_at'] != null) {
      parsedDate = DateTime.tryParse(json['start_at'].toString());
    } else if (json['date'] != null) {
      parsedDate = DateTime.tryParse(json['date'].toString());
    }

    String? projName;
    if (json['project'] is Map) {
      projName = json['project']['name']?.toString();
    } else if (json['project_name'] != null) {
      projName = json['project_name'].toString();
    }

    List<String> teams = [];
    if (json['teams'] is List) {
      for (var t in json['teams']) {
        if (t is Map && t['name'] != null) {
          teams.add(t['name'].toString());
        } else if (t is String) {
          teams.add(t);
        }
      }
    }

    List<String> depts = [];
    if (json['departments'] is List) {
      for (var d in json['departments']) {
        if (d is Map && d['name'] != null) {
          depts.add(d['name'].toString());
        } else if (d is String) {
          depts.add(d);
        }
      }
    }

    return ChatMeeting(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? json['name']?.toString() ?? 'Réunion',
      startAt: parsedDate,
      status: json['status']?.toString().toUpperCase() ?? 'COMPLETED',
      description: json['description']?.toString(),
      projectName: projName,
      teamNames: teams,
      departmentNames: depts,
      selected: defaultSelected,
    );
  }
}
