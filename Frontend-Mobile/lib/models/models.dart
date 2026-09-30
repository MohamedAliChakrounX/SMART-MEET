// Models for Meeting AI Mobile with JSON Serialization

class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? department;
  final String? avatarUrl;

  const User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.department,
    this.avatarUrl,
  });

  String get fullName => '$firstName $lastName'.trim().isEmpty ? email : '$firstName $lastName';

  factory User.fromJson(Map<String, dynamic> json) {
    // Symfony returns roles as an array: ['ROLE_USER', 'ROLE_MANAGER', ...]
    String role = 'ROLE_USER';
    final rolesRaw = json['roles'] ?? json['role'];
    if (rolesRaw is List && rolesRaw.isNotEmpty) {
      // Take the most specific role (last one, or first non-USER)
      role = (rolesRaw.firstWhere(
        (r) => r != 'ROLE_USER',
        orElse: () => rolesRaw.first,
      )).toString();
    } else if (rolesRaw is String) {
      role = rolesRaw;
    }

    return User(
      id: (json['id'] ?? '').toString(),
      email: json['email'] ?? '',
      firstName: json['first_name'] ?? json['firstName'] ?? '',
      lastName: json['last_name'] ?? json['lastName'] ?? '',
      role: role,
      department: json['department'],
      avatarUrl: json['avatar_url'] ?? json['avatarUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'first_name': firstName,
      'last_name': lastName,
      'role': role,
      'department': department,
      'avatar_url': avatarUrl,
    };
  }
}

class Meeting {
  final String id;
  final String title;
  final String category;
  final String date; // Date de création audio (startAt / date)
  final String createdAt; // Date d'upload audio (createdAt / uploadedAt)
  final String duration;
  final int? durationSeconds;
  final int? durationMinutes;
  final String description;
  final List<String> participants;
  final bool starred;
  final String status;

  const Meeting({
    required this.id,
    required this.title,
    required this.category,
    required this.date,
    this.createdAt = '',
    required this.duration,
    this.durationSeconds,
    this.durationMinutes,
    required this.description,
    required this.participants,
    required this.starred,
    this.status = 'COMPLETED',
  });

  /// Formats date string (ISO 8601 or YYYY-MM-DD) to readable format DD/MM/YYYY or DD/MM/YYYY HH:mm
  static String formatDisplayDate(String? raw) {
    if (raw == null || raw.trim().isEmpty || raw == '—') return '—';
    try {
      final s = raw.trim();
      final dt = DateTime.tryParse(s);
      if (dt != null) {
        final day = dt.day.toString().padLeft(2, '0');
        final month = dt.month.toString().padLeft(2, '0');
        final year = dt.year.toString();
        if (s.contains('T') || s.contains(':')) {
          final hour = dt.hour.toString().padLeft(2, '0');
          final min = dt.minute.toString().padLeft(2, '0');
          if (dt.hour != 0 || dt.minute != 0) {
            return '$day/$month/$year $hour:$min';
          }
        }
        return '$day/$month/$year';
      }
      final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(s);
      if (match != null) {
        return '${match.group(3)}/${match.group(2)}/${match.group(1)}';
      }
      return s;
    } catch (_) {
      return raw;
    }
  }

  String get formattedCreationDate => formatDisplayDate(date);
  String get formattedUploadDate => formatDisplayDate(createdAt.isNotEmpty ? createdAt : date);

  static String formatDurationString({
    dynamic rawDuration,
    dynamic durationMinutes,
    dynamic durationSeconds,
  }) {
    int? secs;
    if (durationSeconds != null) {
      if (durationSeconds is int) {
        secs = durationSeconds;
      } else if (durationSeconds is num) {
        secs = durationSeconds.toInt();
      } else {
        secs = int.tryParse(durationSeconds.toString());
      }
    }

    if (secs == null && rawDuration != null) {
      final s = rawDuration.toString().trim();
      if (RegExp(r'^\d+:\d+$').hasMatch(s)) {
        final parts = s.split(':');
        final m = int.tryParse(parts[0]) ?? 0;
        final sec = int.tryParse(parts[1]) ?? 0;
        secs = m * 60 + sec;
      } else if (RegExp(r'^\d+:\d+:\d+$').hasMatch(s)) {
        final parts = s.split(':');
        final h = int.tryParse(parts[0]) ?? 0;
        final m = int.tryParse(parts[1]) ?? 0;
        final sec = int.tryParse(parts[2]) ?? 0;
        secs = h * 3600 + m * 60 + sec;
      } else if (RegExp(r'^\d+$').hasMatch(s)) {
        final val = int.parse(s);
        secs = val > 120 ? val : val * 60;
      }
    }

    if (secs == null && durationMinutes != null) {
      final m = durationMinutes is int
          ? durationMinutes
          : int.tryParse(durationMinutes.toString());
      if (m != null) secs = m * 60;
    }

    if (secs != null && secs > 0) {
      final h = secs ~/ 3600;
      final m = (secs % 3600) ~/ 60;
      final sec = secs % 60;
      if (h > 0) {
        return m > 0 ? '${h}h ${m}m' : '${h}h';
      }
      if (m > 0) {
        return sec > 0 ? '${m}m ${sec.toString().padLeft(2, '0')}s' : '${m} min';
      }
      return '${sec}s';
    }

    if (rawDuration != null &&
        rawDuration.toString().isNotEmpty &&
        rawDuration.toString() != '—') {
      return rawDuration.toString();
    }
    return '0 min';
  }

  factory Meeting.fromJson(Map<String, dynamic> json) {
    // 1. Creation date (startAt or date)
    String dateStr = '';
    final rawStartAt = json['startAt'] ?? json['date'];
    if (rawStartAt != null) {
      dateStr = rawStartAt.toString();
    }

    // 2. Upload date (createdAt or uploadedAt)
    String createdStr = '';
    final rawCreatedAt = json['createdAt'] ?? json['uploadedAt'] ?? rawStartAt;
    if (rawCreatedAt != null) {
      createdStr = rawCreatedAt.toString();
    }
    if (dateStr.isEmpty && createdStr.isNotEmpty) {
      dateStr = createdStr;
    }

    // 3. Duration
    final durMinutes = json['durationMinutes'] is int
        ? json['durationMinutes'] as int
        : int.tryParse(json['durationMinutes']?.toString() ?? '');
    final durSeconds = json['durationSeconds'] is int
        ? json['durationSeconds'] as int
        : (json['duration_seconds'] is int
            ? json['duration_seconds'] as int
            : int.tryParse(json['durationSeconds']?.toString() ??
                json['duration_seconds']?.toString() ??
                ''));

    final durStr = formatDurationString(
      rawDuration: json['duration'],
      durationMinutes: durMinutes,
      durationSeconds: durSeconds,
    );

    return Meeting(
      id: (json['id'] ?? '').toString(),
      title: json['title'] ?? 'Untitled Meeting',
      category: json['category'] ??
          (json['project'] != null ? json['project']['name'] : 'General'),
      date: dateStr,
      createdAt: createdStr,
      duration: durStr,
      durationMinutes: durMinutes,
      durationSeconds: durSeconds,
      description: json['description'] ?? '',
      participants: (json['participants'] as List<dynamic>?)
              ?.map((e) => (e is String ? e : (e['name'] ?? '')).toString())
              .toList() ??
          [],
      starred: json['starred'] ?? json['isStarred'] ?? false,
      status: json['status'] ?? 'COMPLETED',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'category': category,
      'date': date,
      'createdAt': createdAt,
      'duration': duration,
      'durationMinutes': durationMinutes,
      'durationSeconds': durationSeconds,
      'description': description,
      'participants': participants,
      'starred': starred,
      'status': status,
    };
  }
}

class MeetingDetail {
  final String id;
  final String title;
  final String date;
  final String startTime;
  final String endTime;
  final String location;
  final String facilitator;
  final bool confidential;
  final List<String> participants;
  final String duration; // duration in minutes as a string

  const MeetingDetail({
    required this.id,
    required this.title,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.location,
    required this.facilitator,
    required this.confidential,
    this.participants = const [],
    required this.duration,
  });

  String get formattedDuration {
    final mins = int.tryParse(duration) ?? 30;
    final h = mins ~/ 60;
    final m = mins % 60;
    if (h > 0) {
      if (m > 0) {
        return '${h}h ${m}m';
      }
      return '${h}h';
    }
    return '${mins}m';
  }

  factory MeetingDetail.fromJson(Map<String, dynamic> json) {
    String dateStr = '';
    final rawStartAt = json['startAt'] ?? json['date'] ?? json['createdAt'];
    if (rawStartAt != null && rawStartAt.toString().length >= 10) {
      dateStr = rawStartAt.toString().substring(0, 10);
    }

    String startHour = '09:00';
    if (json['start_time'] != null) {
      startHour = json['start_time'].toString();
    } else if (json['startTime'] != null) {
      startHour = json['startTime'].toString();
    } else if (json['startAt'] != null && json['startAt'].toString().length >= 16) {
      startHour = json['startAt'].toString().substring(11, 16);
    }

    final durationVal = json['duration'] ?? json['durationMinutes'] ?? '30';

    return MeetingDetail(
      id: (json['id'] ?? '').toString(),
      title: json['title'] ?? '',
      date: dateStr,
      startTime: startHour,
      endTime: json['end_time'] ?? json['endTime'] ?? '10:00',
      location: json['location'] ?? 'Room A',
      facilitator: json['facilitator'] ?? 'Admin',
      confidential: json['confidential'] ?? false,
      participants: (json['participants'] as List<dynamic>?)
              ?.map((e) => (e is String ? e : (e['name'] ?? '')).toString())
              .toList() ??
          [],
      duration: durationVal.toString(),
    );
  }
}

class Participant {
  final String id;
  final String name;
  final String role;
  final String initials;
  final String color;
  final bool absent;

  const Participant({
    required this.id,
    required this.name,
    required this.role,
    required this.initials,
    required this.color,
    this.absent = false,
  });

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      id: (json['id'] ?? '').toString(),
      name: json['name'] ?? '',
      role: json['role'] ?? 'Participant',
      initials: json['initials'] ?? (json['name'] != null && json['name'].isNotEmpty ? json['name'][0] : 'P'),
      color: json['color'] ?? '#3B82F6',
      absent: json['absent'] ?? false,
    );
  }
}

class TranscriptSegment {
  final String id;
  final String speaker;
  final String speakerColor;
  final String timeStart;
  final String timeEnd;
  final String text;

  const TranscriptSegment({
    required this.id,
    required this.speaker,
    required this.speakerColor,
    required this.timeStart,
    required this.timeEnd,
    required this.text,
  });

  static String _formatSeconds(dynamic seconds) {
    if (seconds == null) return '00:00';
    if (seconds is num) {
      final totalSecs = seconds.toInt();
      final mins = (totalSecs ~/ 60).toString().padLeft(2, '0');
      final secs = (totalSecs % 60).toString().padLeft(2, '0');
      return '$mins:$secs';
    }
    return seconds.toString();
  }

  factory TranscriptSegment.fromJson(Map<String, dynamic> json) {
    return TranscriptSegment(
      id: (json['id'] ?? '').toString(),
      speaker: json['speaker'] ?? json['speakerName'] ?? 'Speaker',
      speakerColor: json['speaker_color'] ?? json['speakerColor'] ?? '#3B82F6',
      timeStart: _formatSeconds(json['time_start'] ?? json['timeStart']),
      timeEnd: _formatSeconds(json['time_end'] ?? json['timeEnd']),
      text: json['text'] ?? json['content'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'speaker': speaker,
      'speakerColor': speakerColor,
      'timeStart': timeStart,
      'timeEnd': timeEnd,
      'text': text,
    };
  }
}

class ActionItem {
  final String id;
  final String task;
  final String assignee;
  final String dueDate;
  final String status;

  const ActionItem({
    required this.id,
    required this.task,
    required this.assignee,
    required this.dueDate,
    required this.status,
  });

  factory ActionItem.fromJson(Map<String, dynamic> json) {
    String statusVal = 'PENDING';
    if (json['status'] != null) {
      statusVal = json['status'].toString();
    } else if (json['completed'] == true) {
      statusVal = 'COMPLETED';
    }

    return ActionItem(
      id: (json['id'] ?? '').toString(),
      task: json['task'] ?? json['action'] ?? json['description'] ?? '',
      assignee: json['assignee'] ?? json['responsible'] ?? json['assigneeName'] ?? json['owner'] ?? 'Unassigned',
      dueDate: json['due_date'] ?? json['dueDate'] ?? json['due'] ?? '',
      status: statusVal,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'task': task,
      'assignee': assignee,
      'due_date': dueDate,
      'status': status,
    };
  }
}

class SummaryMetric {
  final String label;
  final String value;

  const SummaryMetric({required this.label, required this.value});

  factory SummaryMetric.fromJson(Map<String, dynamic> json) {
    return SummaryMetric(
      label: json['label'] ?? '',
      value: json['value'] ?? '',
    );
  }
}

class TalkTimeEntry {
  final String name;
  final double value;
  final String color;

  const TalkTimeEntry({required this.name, required this.value, required this.color});

  factory TalkTimeEntry.fromJson(Map<String, dynamic> json) {
    return TalkTimeEntry(
      name: json['name'] ?? 'Speaker',
      value: (json['value'] ?? json['percentage'] ?? 0).toDouble(),
      color: json['color'] ?? '#3B82F6',
    );
  }
}

class SpeakerData {
  final String id;
  final String name;
  final String initials;
  final String role;
  final double talkTime;
  final double monopolization;
  final double stress;
  final double fragmentation;
  final int interventions;
  final int interruptionsGiven;
  final int interruptionsReceived;
  final double avgDuration;
  final String pitchVoice;
  final String energyVoice;
  final List<String> tags;
  final List<String> strengths;
  final List<String> areasToWatch;
  final String styleQuote;
  final String styleDescription;
  final String profileSummary;
  final String psychologicalAnalysis;
  final String vocalSignature;
  final String recommendation;

  const SpeakerData({
    required this.id,
    required this.name,
    required this.initials,
    required this.role,
    required this.talkTime,
    required this.monopolization,
    required this.stress,
    required this.fragmentation,
    required this.interventions,
    required this.interruptionsGiven,
    required this.interruptionsReceived,
    required this.avgDuration,
    required this.pitchVoice,
    required this.energyVoice,
    required this.tags,
    required this.strengths,
    required this.areasToWatch,
    required this.styleQuote,
    required this.styleDescription,
    this.profileSummary = '',
    this.psychologicalAnalysis = '',
    this.vocalSignature = '',
    this.recommendation = '',
  });

  factory SpeakerData.fromJson(Map<String, dynamic> json) {
    final nameVal = json['name'] ?? '';
    final initialsVal = json['initials'] ?? (nameVal.isNotEmpty ? nameVal[0] : 'S');
    final numInterventions = json['interventions'] ?? json['nombre_interventions'] ?? 0;
    final intGiven = json['interruptions_given'] ?? json['interruptionsGiven'] ?? json['interruptions_faites'] ?? 0;
    final intReceived = json['interruptions_received'] ?? json['interruptionsReceived'] ?? json['interruptions_subies'] ?? 0;

    return SpeakerData(
      id: json['id']?.toString() ?? nameVal,
      name: nameVal,
      initials: initialsVal,
      role: json['role'] ?? json['role_label'] ?? 'Intervenant',
      talkTime: (json['talk_time'] ?? json['talkTime'] ?? json['temps_de_parole_pct'] ?? 0).toDouble(),
      monopolization: (json['monopolization'] ?? json['monopolisation'] ?? 0).toDouble(),
      stress: (json['stress'] ?? json['stress_jitter_shimmer'] ?? 0).toDouble(),
      fragmentation: (json['fragmentation'] ?? 0).toDouble(),
      interventions: numInterventions is num ? numInterventions.toInt() : 0,
      interruptionsGiven: intGiven is num ? intGiven.toInt() : 0,
      interruptionsReceived: intReceived is num ? intReceived.toInt() : 0,
      avgDuration: (json['avg_duration'] ?? json['avgDuration'] ?? json['duree_moyenne_intervention'] ?? 0).toDouble(),
      pitchVoice: json['pitch_voice'] ?? json['pitchVoice'] ?? 'Normal',
      energyVoice: json['energy_voice'] ?? json['energyVoice'] ?? 'Moderate',
      tags: List<String>.from(json['tags'] ?? []),
      strengths: List<String>.from(json['strengths'] ?? []),
      areasToWatch: List<String>.from(json['areas_to_watch'] ?? json['areasToWatch'] ?? []),
      styleQuote: json['style_quote'] ?? json['styleQuote'] ?? '',
      styleDescription: json['style_description'] ?? json['styleDescription'] ?? '',
      profileSummary: json['profile_summary'] ?? json['profileSummary'] ?? '',
      psychologicalAnalysis: json['psychological_analysis'] ?? json['psychologicalAnalysis'] ?? '',
      vocalSignature: json['vocal_signature'] ?? json['vocalSignature'] ?? '',
      recommendation: json['recommendation'] ?? '',
    );
  }
}

class MetricDefinition {
  final String title;
  final String description;

  const MetricDefinition({required this.title, required this.description});
}

/// Generic organisation item (department / team / project)
class OrgItem {
  final String id;
  final String name;
  final String? parentId; // departmentId for teams, teamId for projects

  const OrgItem({required this.id, required this.name, this.parentId});

  factory OrgItem.fromJson(Map<String, dynamic> json) {
    return OrgItem(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? json['label'] ?? '',
      parentId: (json['department']?['id'] ?? json['departmentId'] ?? json['teamId'])?.toString(),
    );
  }
}

