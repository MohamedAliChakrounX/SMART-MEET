// AdminService connecting Flutter Mobile with Symfony Backend REST APIs

import '../models/admin_models.dart';
import 'api_client.dart';

class AdminService {
  final ApiClient _apiClient;

  AdminService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  Future<List<AdminDepartment>> fetchDepartments() async {
    final response = await _apiClient.get('/admin/organisation/departments');
    if (response is List) {
      return response
          .map((item) => AdminDepartment.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    }
    return [];
  }

  Future<String> createDepartment({
    required String name,
    String description = '',
  }) async {
    final response = await _apiClient.post(
      '/admin/organisation/departments',
      body: {
        'name': name.trim(),
        'description': description.trim(),
      },
    );
    if (response is Map && response['id'] != null) {
      return response['id'].toString();
    }
    return '';
  }

  Future<void> updateDepartment(
    String id, {
    required String name,
    String description = '',
  }) async {
    await _apiClient.put(
      '/admin/organisation/departments/$id',
      body: {
        'name': name.trim(),
        'description': description.trim(),
      },
    );
  }

  Future<void> deleteDepartment(String id) async {
    await _apiClient.delete('/admin/organisation/departments/$id');
  }

  // ==========================================
  // TEAMS
  // ==========================================

  Future<List<AdminTeam>> fetchTeams() async {
    final response = await _apiClient.get('/admin/organisation/teams');
    if (response is List) {
      return response
          .map((item) => AdminTeam.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    }
    return [];
  }

  Future<String> createTeam({
    required String name,
    String description = '',
    required String departmentId,
  }) async {
    final response = await _apiClient.post(
      '/admin/organisation/teams',
      body: {
        'name': name.trim(),
        'description': description.trim(),
        'departmentId': departmentId,
      },
    );
    if (response is Map && response['id'] != null) {
      return response['id'].toString();
    }
    return '';
  }

  Future<void> updateTeam(
    String id, {
    required String name,
    String description = '',
    required String departmentId,
  }) async {
    await _apiClient.put(
      '/admin/organisation/teams/$id',
      body: {
        'name': name.trim(),
        'description': description.trim(),
        'departmentId': departmentId,
      },
    );
  }

  Future<void> deleteTeam(String id) async {
    await _apiClient.delete('/admin/organisation/teams/$id');
  }

  // ==========================================
  // PROJECTS
  // ==========================================

  Future<List<AdminProject>> fetchProjects() async {
    final response = await _apiClient.get('/admin/organisation/projects');
    if (response is List) {
      return response
          .map((item) => AdminProject.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    }
    return [];
  }

  Future<String> createProject({
    required String name,
    String description = '',
    List<String> teamIds = const [],
  }) async {
    final response = await _apiClient.post(
      '/admin/organisation/projects',
      body: {
        'name': name.trim(),
        'description': description.trim(),
        'teamIds': teamIds,
      },
    );
    if (response is Map && response['id'] != null) {
      return response['id'].toString();
    }
    return '';
  }

  Future<void> updateProject(
    String id, {
    required String name,
    String description = '',
    List<String> teamIds = const [],
  }) async {
    await _apiClient.put(
      '/admin/organisation/projects/$id',
      body: {
        'name': name.trim(),
        'description': description.trim(),
        'teamIds': teamIds,
      },
    );
  }

  Future<void> deleteProject(String id) async {
    await _apiClient.delete('/admin/organisation/projects/$id');
  }

  // ==========================================
  // USERS & PERMISSIONS
  // ==========================================

  Future<List<AdminUser>> fetchUsers() async {
    final response = await _apiClient.get('/users');
    if (response is List) {
      return response
          .map((item) => AdminUser.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    }
    return [];
  }

  Future<String> createUser({
    required String email,
    required String firstName,
    required String lastName,
    required String password,
    String role = 'ROLE_USER',
    String? teamId,
    List<String> permissions = const [],
  }) async {
    final body = <String, dynamic>{
      'email': email.trim(),
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'password': password,
      'roles': [role],
    };
    if (teamId != null && teamId.isNotEmpty) {
      body['teamId'] = teamId;
    }
    if (permissions.isNotEmpty) {
      body['permissions'] = permissions;
    }

    final response = await _apiClient.post('/users', body: body);
    if (response is Map && response['id'] != null) {
      return response['id'].toString();
    }
    return '';
  }

  Future<void> updateUser(
    String id, {
    String? email,
    String? firstName,
    String? lastName,
    String? password,
    String? role,
    String? teamId,
  }) async {
    final body = <String, dynamic>{};
    if (email != null) body['email'] = email.trim();
    if (firstName != null) body['firstName'] = firstName.trim();
    if (lastName != null) body['lastName'] = lastName.trim();
    if (password != null && password.isNotEmpty) body['password'] = password;
    if (role != null) body['roles'] = [role];
    if (teamId != null) body['teamId'] = teamId;

    await _apiClient.put('/users/$id', body: body);
  }

  Future<void> updateUserPermissions(String id, List<String> permissions) async {
    await _apiClient.patch(
      '/users/$id/permissions',
      body: {'permissions': permissions},
    );
  }

  Future<void> toggleUserStatus(String id, bool isActive) async {
    await _apiClient.patch(
      '/users/$id/status',
      body: {'isActive': isActive},
    );
  }

  Future<void> deleteUser(String id) async {
    await _apiClient.delete('/users/$id');
  }
}
