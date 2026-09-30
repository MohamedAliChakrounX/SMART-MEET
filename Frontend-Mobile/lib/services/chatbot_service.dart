import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/chatbot_models.dart';
import 'token_storage.dart';

class ChatbotService {
  final TokenStorage _tokenStorage;
  final http.Client _client;

  ChatbotService({
    TokenStorage? tokenStorage,
    http.Client? client,
  })  : _tokenStorage = tokenStorage ?? TokenStorage(),
        _client = client ?? http.Client();

  Future<Map<String, String>> _headers() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final token = await _tokenStorage.getToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  /// Send message to ChatBot Flask server (port 5002)
  Future<ChatMessage> sendMessage({
    required String message,
    String? conversationId,
    List<String>? meetingIds,
  }) async {
    try {
      final uri = Uri.parse('${ApiConfig.chatbotBaseUrl}/chat');
      final headers = await _headers();
      final body = jsonEncode({
        'message': message,
        if (conversationId != null && conversationId.isNotEmpty) 'conversation_id': conversationId,
        if (meetingIds != null && meetingIds.isNotEmpty) 'meeting_ids': meetingIds,
      });

      final response = await _client
          .post(uri, headers: headers, body: body)
          .timeout(const Duration(seconds: 45));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        return ChatMessage.fromJson(data);
      } else {
        final errorData = jsonDecode(utf8.decode(response.bodyBytes));
        final errText = errorData['error']?.toString() ?? 'Erreur serveur (${response.statusCode})';
        throw Exception(errText);
      }
    } on SocketException {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        sender: 'assistant',
        text: 'Impossible de joindre le serveur IA (port 5002). Vérifiez que le microservice ChatBot est bien démarré sur votre machine.',
        createdAt: DateTime.now(),
      );
    } on TimeoutException {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        sender: 'assistant',
        text: 'Le traitement de votre question a pris trop de temps (timeout). Veuillez réessayer.',
        createdAt: DateTime.now(),
      );
    } catch (e) {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        sender: 'assistant',
        text: 'Erreur lors de la requête : ${e.toString().replaceAll("Exception: ", "")}',
        createdAt: DateTime.now(),
      );
    }
  }

  /// Get list of permitted meetings for chat selection
  Future<List<ChatMeeting>> getChatMeetings() async {
    try {
      final uri = Uri.parse('${ApiConfig.chatbotBaseUrl}/chat/meetings');
      final headers = await _headers();
      final response = await _client.get(uri, headers: headers).timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final List list = jsonDecode(utf8.decode(response.bodyBytes));
        return list.map((m) => ChatMeeting.fromJson(m, defaultSelected: true)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Get past conversations / sessions history
  Future<List<ChatConversation>> getHistory() async {
    try {
      final uri = Uri.parse('${ApiConfig.chatbotBaseUrl}/chat/history');
      final headers = await _headers();
      final response = await _client.get(uri, headers: headers).timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final List list = jsonDecode(utf8.decode(response.bodyBytes));
        return list.map((c) => ChatConversation.fromJson(c)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Get full message logs for a specific conversation session
  Future<List<ChatMessage>> getConversation(String conversationId) async {
    try {
      final uri = Uri.parse('${ApiConfig.chatbotBaseUrl}/chat/$conversationId');
      final headers = await _headers();
      final response = await _client.get(uri, headers: headers).timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        final List messages = data['messages'] ?? [];
        return messages.map((m) => ChatMessage.fromJson(m)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Delete a conversation session
  Future<bool> deleteConversation(String conversationId) async {
    try {
      final uri = Uri.parse('${ApiConfig.chatbotBaseUrl}/chat/$conversationId');
      final headers = await _headers();
      final response = await _client.delete(uri, headers: headers).timeout(const Duration(seconds: 10));
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  /// Transcribe audio file to text using Whisper STT
  Future<String?> transcribeAudio(String filePath) async {
    try {
      final uri = Uri.parse('${ApiConfig.chatbotBaseUrl}/stt');
      final request = http.MultipartRequest('POST', uri);
      final token = await _tokenStorage.getToken();
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.files.add(await http.MultipartFile.fromPath('audio', filePath));

      final streamedResponse = await request.send().timeout(const Duration(seconds: 40));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        return data['text']?.toString();
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
