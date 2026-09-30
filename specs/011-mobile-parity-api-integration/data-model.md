# Data Model: Mobile Frontend API Integration & Data Mapping

**Feature Branch**: `011-mobile-parity-api-integration`  
**Date**: 2026-07-29  
**Spec**: [spec.md](file:///E:/sfm-PFE/Meeting-IA-sfm/specs/011-mobile-parity-api-integration/spec.md)

## Entities & Data Mapping

This document details the Dart models in `frontend-mobile/lib/models/models.dart` and their mapping to the Symfony backend DTOs/Entities.

---

### 1. User & Authentication Session

**Backend Endpoint**: `POST /api/v1/auth/login`, `GET /api/v1/user/profile`

```dart
class User {
  final int id;
  final String email;
  final String firstName;
  final String lastName;
  final String role; // ROLE_ADMIN, ROLE_MANAGER, ROLE_USER
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

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? 0,
      email: json['email'] ?? '',
      firstName: json['first_name'] ?? json['firstName'] ?? '',
      lastName: json['last_name'] ?? json['lastName'] ?? '',
      role: json['role'] ?? 'ROLE_USER',
      department: json['department'],
      avatarUrl: json['avatar_url'] ?? json['avatarUrl'],
    );
  }
}
```

---

### 2. Meeting & Meeting Detail

**Backend Endpoint**: `GET /api/v1/meetings`, `GET /api/v1/meetings/{id}`, `POST /api/v1/meetings`

```dart
class Meeting {
  final int id;
  final String title;
  final String category;
  final String date;
  final String duration;
  final String description;
  final List<String> participants;
  final bool starred;
  final String status; // CREATED, UPLOADING, PROCESSING, COMPLETED, FAILED

  const Meeting({
    required this.id,
    required this.title,
    required this.category,
    required this.date,
    required this.duration,
    required this.description,
    required this.participants,
    required this.starred,
    required this.status,
  });

  factory Meeting.fromJson(Map<String, dynamic> json) {
    return Meeting(
      id: json['id'] ?? 0,
      title: json['title'] ?? 'Untitled Meeting',
      category: json['category'] ?? json['department'] ?? 'General',
      date: json['date'] ?? json['createdAt'] ?? '',
      duration: json['duration'] ?? '0 min',
      description: json['description'] ?? '',
      participants: (json['participants'] as List<dynamic>?)
              ?.map((e) => e is String ? e : (e['name'] ?? ''))
              .toList() ??
          [],
      starred: json['starred'] ?? json['isStarred'] ?? false,
      status: json['status'] ?? 'COMPLETED',
    );
  }
}
```

---

### 3. Transcript Segment

**Backend Endpoint**: `GET /api/v1/meetings/{id}/transcript`

```dart
class TranscriptSegment {
  final int id;
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

  factory TranscriptSegment.fromJson(Map<String, dynamic> json) {
    return TranscriptSegment(
      id: json['id'] ?? 0,
      speaker: json['speaker'] ?? json['speakerName'] ?? 'Unknown',
      speakerColor: json['speaker_color'] ?? json['speakerColor'] ?? '#3B82F6',
      timeStart: json['time_start'] ?? json['timeStart'] ?? '00:00',
      timeEnd: json['time_end'] ?? json['timeEnd'] ?? '00:00',
      text: json['text'] ?? json['content'] ?? '',
    );
  }
}
```

---

### 4. Action Item (Procès-Verbal Task)

**Backend Endpoint**: `GET /api/v1/meetings/{id}/summary`, `PUT /api/v1/action-items/{id}`

```dart
class ActionItem {
  final int id;
  final String task;
  final String assignee;
  final String dueDate;
  final String status; // PENDING, IN_PROGRESS, COMPLETED

  const ActionItem({
    required this.id,
    required this.task,
    required this.assignee,
    required this.dueDate,
    required this.status,
  });

  factory ActionItem.fromJson(Map<String, dynamic> json) {
    return ActionItem(
      id: json['id'] ?? 0,
      task: json['task'] ?? json['description'] ?? '',
      assignee: json['assignee'] ?? json['assigneeName'] ?? 'Unassigned',
      dueDate: json['due_date'] ?? json['dueDate'] ?? '',
      status: json['status'] ?? 'PENDING',
    );
  }
}
```

---

### 5. Speaker Behavioral Analytics Data

**Backend Endpoint**: `GET /api/v1/meetings/{id}/analytics`

```dart
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
  });

  factory SpeakerData.fromJson(Map<String, dynamic> json) {
    return SpeakerData(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      initials: json['initials'] ?? '',
      role: json['role'] ?? '',
      talkTime: (json['talk_time'] ?? json['talkTime'] ?? 0).toDouble(),
      monopolization: (json['monopolization'] ?? 0).toDouble(),
      stress: (json['stress'] ?? 0).toDouble(),
      fragmentation: (json['fragmentation'] ?? 0).toDouble(),
      interventions: json['interventions'] ?? 0,
      interruptionsGiven: json['interruptions_given'] ?? json['interruptionsGiven'] ?? 0,
      interruptionsReceived: json['interruptions_received'] ?? json['interruptionsReceived'] ?? 0,
      avgDuration: (json['avg_duration'] ?? json['avgDuration'] ?? 0).toDouble(),
      pitchVoice: json['pitch_voice'] ?? json['pitchVoice'] ?? 'Normal',
      energyVoice: json['energy_voice'] ?? json['energyVoice'] ?? 'Moderate',
      tags: List<String>.from(json['tags'] ?? []),
      strengths: List<String>.from(json['strengths'] ?? []),
      areasToWatch: List<String>.from(json['areas_to_watch'] ?? json['areasToWatch'] ?? []),
      styleQuote: json['style_quote'] ?? json['styleQuote'] ?? '',
      styleDescription: json['style_description'] ?? json['styleDescription'] ?? '',
    );
  }
}
```
