// UserService for Profile & Organization Team REST Endpoints

import '../config/api_config.dart';
import '../models/models.dart';
import 'api_client.dart';

class UserService {
  final ApiClient _apiClient;

  UserService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Updates user profile details via PUT /api/v1/user/profile
  Future<User> updateProfile(Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiConfig.profileEndpoint, body: data);
    if (response is Map<String, dynamic>) {
      return User.fromJson(response);
    }
    throw Exception('Failed to update profile');
  }

  /// Fetches team members from GET /api/v1/admin/organisation/members
  Future<List<User>> fetchTeamMembers() async {
    final response = await _apiClient.get('/admin/organisation/members');
    List<dynamic> items = [];
    if (response is List) {
      items = response;
    } else if (response is Map<String, dynamic> && response.containsKey('items')) {
      items = response['items'] as List<dynamic>;
    }
    return items.map((json) => User.fromJson(Map<String, dynamic>.from(json))).toList();
  }
}
