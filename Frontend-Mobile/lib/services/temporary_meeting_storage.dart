import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/models.dart';

class TemporaryMeetingStorage {
  static const String _keyTempMeetings = 'temp_meetings';
  static const String _keyMeetingProjects = 'meeting_projects';

  final FlutterSecureStorage _storage;

  TemporaryMeetingStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  Future<List<Meeting>> getMeetings() async {
    try {
      final jsonStr = await _storage.read(key: _keyTempMeetings);
      if (jsonStr == null || jsonStr.isEmpty) return [];
      final List decoded = jsonDecode(jsonStr);
      return decoded.map((json) => Meeting.fromJson(Map<String, dynamic>.from(json))).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveMeetings(List<Meeting> meetings) async {
    try {
      final jsonStr = jsonEncode(meetings.map((m) => m.toJson()).toList());
      await _storage.write(key: _keyTempMeetings, value: jsonStr);
    } catch (_) {}
  }

  Future<void> addMeeting(Meeting meeting) async {
    final list = await getMeetings();
    list.removeWhere((m) => m.id == meeting.id);
    list.insert(0, meeting);
    await saveMeetings(list);
  }

  Future<void> removeMeeting(String meetingId) async {
    final list = await getMeetings();
    list.removeWhere((m) => m.id == meetingId);
    await saveMeetings(list);
  }

  Future<Map<String, String>> getMeetingProjects() async {
    try {
      final jsonStr = await _storage.read(key: _keyMeetingProjects);
      if (jsonStr == null || jsonStr.isEmpty) return {};
      return Map<String, String>.from(jsonDecode(jsonStr));
    } catch (_) {
      return {};
    }
  }

  Future<void> saveMeetingProjects(Map<String, String> map) async {
    try {
      await _storage.write(key: _keyMeetingProjects, value: jsonEncode(map));
    } catch (_) {}
  }
}
