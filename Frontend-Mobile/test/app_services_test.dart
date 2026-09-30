import 'package:flutter_test/flutter_test.dart';
import 'package:meeting_ai_mobile/config/api_config.dart';
import 'package:meeting_ai_mobile/models/models.dart';

void main() {
  group('ApiConfig Tests', () {
    test('baseUrl contains /api/v1 suffix', () {
      expect(ApiConfig.baseUrl, endsWith('/api/v1'));
    });

    test('Endpoint formatters construct correct paths', () {
      expect(ApiConfig.meetingDetailEndpoint('42'), '/meetings/42');
      expect(ApiConfig.meetingTranscriptEndpoint('42'), '/meetings/42/transcript');
      expect(ApiConfig.meetingAnalyticsEndpoint('42'), '/meetings/42/analytics');
    });
  });

  group('Model Serialization Tests', () {
    test('User.fromJson deserializes correctly', () {
      final json = {
        'id': 1,
        'email': 'test@example.com',
        'first_name': 'Jean',
        'last_name': 'Dupont',
        'role': 'ROLE_MANAGER',
      };
      final user = User.fromJson(json);
      expect(user.id, '1');
      expect(user.email, 'test@example.com');
      expect(user.fullName, 'Jean Dupont');
      expect(user.role, 'ROLE_MANAGER');
    });

    test('Meeting.fromJson deserializes correctly', () {
      final json = {
        'id': 101,
        'title': 'Sprint Planning',
        'category': 'PRODUCT DEV',
        'startAt': '2026-07-29T10:00:00Z',
        'createdAt': '2026-07-29T11:30:00Z',
        'durationMinutes': 45,
        'description': 'Discussion on backlog',
        'participants': ['Alice', 'Bob'],
        'starred': true,
        'status': 'COMPLETED',
      };
      final meeting = Meeting.fromJson(json);
      expect(meeting.id, '101');
      expect(meeting.title, 'Sprint Planning');
      expect(meeting.participants.length, 2);
      expect(meeting.starred, true);
      expect(meeting.formattedCreationDate, '29/07/2026 10:00');
      expect(meeting.formattedUploadDate, '29/07/2026 11:30');
      expect(meeting.duration, '45 min');
    });

    test('Meeting duration formatting handles various formats', () {
      expect(Meeting.formatDurationString(durationSeconds: 125), '2m 05s');
      expect(Meeting.formatDurationString(durationSeconds: 3665), '1h 1m');
      expect(Meeting.formatDurationString(durationMinutes: 15), '15 min');
      expect(Meeting.formatDurationString(rawDuration: '03:45'), '3m 45s');
    });

    test('TranscriptSegment.fromJson deserializes correctly', () {
      final json = {
        'id': 5,
        'speaker': 'Alice',
        'speaker_color': '#10B981',
        'time_start': '01:15',
        'time_end': '01:45',
        'text': 'Let us finalize the roadmap.',
      };
      final segment = TranscriptSegment.fromJson(json);
      expect(segment.id, '5');
      expect(segment.speaker, 'Alice');
      expect(segment.text, 'Let us finalize the roadmap.');
    });

    test('ActionItem.fromJson deserializes correctly', () {
      final json = {
        'id': 12,
        'task': 'Update API documentation',
        'assignee': 'Bob',
        'due_date': '2026-08-01',
        'status': 'PENDING',
      };
      final item = ActionItem.fromJson(json);
      expect(item.id, '12');
      expect(item.assignee, 'Bob');
      expect(item.status, 'PENDING');
    });
  });
}
