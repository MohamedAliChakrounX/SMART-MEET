// Authentication Service for Symfony REST JWT Endpoints

import '../config/api_config.dart';
import '../models/models.dart';
import 'api_client.dart';

class AuthService {
  final ApiClient _apiClient;

  AuthService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Authenticates user credentials with Symfony backend at POST /api/v1/auth/login
  /// Lexik JWT returns: { "token": "..." } only — profile is fetched separately.
  Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await _apiClient.post(
      ApiConfig.loginEndpoint,
      body: {
        'email': username,   // Symfony json_login uses 'email' (username_path: email)
        'password': password,
      },
    );

    if (response is Map<String, dynamic>) {
      final token = response['token']?.toString();
      if (token == null || token.isEmpty) {
        throw Exception('Token manquant dans la réponse du serveur');
      }
      return {'token': token};
    }
    throw Exception('Format de réponse invalide du serveur');
  }

  /// Fetches current user profile from GET /api/v1/auth/me
  Future<User> fetchProfile() async {
    final response = await _apiClient.get(ApiConfig.profileEndpoint);
    if (response is Map<String, dynamic>) {
      return User.fromJson(response);
    }
    throw Exception('Format de profil invalide');
  }

  /// Fetches all users (admin only) from GET /api/v1/users
  Future<List<dynamic>> fetchAllUsers() async {
    final response = await _apiClient.get('/users');
    if (response is List) return response;
    if (response is Map && response.containsKey('hydra:member')) {
      return response['hydra:member'] as List;
    }
    return [];
  }
}
