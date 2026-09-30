# Data Models & State Contracts

This document specifies the Dart models, JSON serialization contracts, and state representations for the Flutter mobile application. Models are designed using `freezed` for immutability and type-safety, and `json_serializable` for JSON parsing.

---

## 1. Core Data Models

### User Model
Represents an authenticated user or organization member.
```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
class User with _$User {
  const factory User({
    required int id,
    required String email,
    required String name,
    required String role, // 'ROLE_ADMIN' or 'ROLE_USER'
    required String? department,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}
```

### Meeting Model
Represents a recorded meeting record.
```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'meeting.freezed.dart';
part 'meeting.g.dart';

enum MeetingStatus {
  @JsonValue('Upload') upload,
  @JsonValue('In_Progress') inProgress,
  @JsonValue('Complete') complete,
}

@freezed
class Meeting with _$Meeting {
  const factory Meeting({
    required int id,
    required String title,
    required DateTime date,
    required int durationSeconds, // In seconds
    required String? project,
    required String creatorName,
    required MeetingStatus status,
    required String? audioFilePath,
  }) = _Meeting;

  factory Meeting.fromJson(Map<String, dynamic> json) => _$MeetingFromJson(json);
}
```

### Transcript Segment & Transcript
Represents the meeting transcription split into speaker segments.
```dart
@freezed
class TranscriptSegment with _$TranscriptSegment {
  const factory TranscriptSegment({
    required String speaker,
    required String timestamp, // "HH:MM:SS"
    required String text,
  }) = _TranscriptSegment;

  factory TranscriptSegment.fromJson(Map<String, dynamic> json) => _$TranscriptSegmentFromJson(json);
}

@freezed
class MeetingTranscript with _$MeetingTranscript {
  const factory MeetingTranscript({
    required int meetingId,
    required List<TranscriptSegment> segments,
    required DateTime lastUpdated,
  }) = _MeetingTranscript;

  factory MeetingTranscript.fromJson(Map<String, dynamic> json) => _$MeetingTranscriptFromJson(json);
}
```

### Summary Model
Represents the AI-generated meeting summary.
```dart
@freezed
class MeetingSummary with _$MeetingSummary {
  const factory MeetingSummary({
    required int id,
    required int meetingId,
    required String content,
    required List<String> keyTopics,
    required DateTime generatedAt,
  }) = _MeetingSummary;

  factory MeetingSummary.fromJson(Map<String, dynamic> json) => _$MeetingSummaryFromJson(json);
}
```

### ActionItem & Decision Models
Tasks and key findings assigned during the meeting.
```dart
enum ActionStatus {
  @JsonValue('Pending') pending,
  @JsonValue('In_Progress') inProgress,
  @JsonValue('Done') done,
}

@freezed
class ActionItem with _$ActionItem {
  const factory ActionItem({
    required int id,
    required int meetingId,
    required String description,
    required String assigneeName,
    required DateTime? deadline,
    required ActionStatus status,
  }) = _ActionItem;

  factory ActionItem.fromJson(Map<String, dynamic> json) => _$ActionItemFromJson(json);
}

@freezed
class Decision with _$Decision {
  const factory Decision({
    required int id,
    required int meetingId,
    required String description,
    required DateTime createdAt,
  }) = _Decision;

  factory Decision.fromJson(Map<String, dynamic> json) => _$DecisionFromJson(json);
}
```

### Analytics Model
Behavioral dynamics of meeting participants.
```dart
@freezed
class SpeakerAnalytics with _$SpeakerAnalytics {
  const factory SpeakerAnalytics({
    required String speakerName,
    required double speakingTimePercentage, // e.g. 42.5
    required int turnCount,
    required int totalWords,
  }) = _SpeakerAnalytics;

  factory SpeakerAnalytics.fromJson(Map<String, dynamic> json) => _$SpeakerAnalyticsFromJson(json);
}

@freezed
class MeetingAnalytics with _$MeetingAnalytics {
  const factory MeetingAnalytics({
    required int meetingId,
    required int totalDurationSeconds,
    required int totalSpeakersCount,
    required List<SpeakerAnalytics> speakerMetrics,
  }) = _MeetingAnalytics;

  factory MeetingAnalytics.fromJson(Map<String, dynamic> json) => _$MeetingAnalyticsFromJson(json);
}
```

---

## 2. Presentation State Contracts

State notifier states managed by Riverpod to track loading, errors, and success states in UI.

### AuthState
```dart
@freezed
class AuthState with _$AuthState {
  const factory AuthState.unauthenticated() = _Unauthenticated;
  const factory AuthState.authenticating() = _Authenticating;
  const factory AuthState.authenticated({
    required User user,
    required String token,
  }) = _Authenticated;
  const factory AuthState.error(String message) = _AuthError;
}
```

### MeetingListState
Managed via `AsyncNotifierProvider` returning `List<Meeting>`.
- **Loading State**: Handled implicitly by AsyncValue (`AsyncLoading`).
- **Error State**: Handled implicitly by AsyncValue (`AsyncError`).
- **Data State**: Handled implicitly by AsyncValue (`AsyncData<List<Meeting>>`).
- Includes pagination fields for infinite scrolling:
  ```dart
  class MeetingListNotifier extends AsyncNotifier<List<Meeting>> {
    int _currentPage = 1;
    bool _hasMore = true;
    ...
  }
  ```
