// AdminProvider for managing Organization and Users/Permissions state in Flutter

import 'package:flutter/foundation.dart';
import '../models/admin_models.dart';
import '../services/admin_service.dart';

class AdminProvider extends ChangeNotifier {
  final AdminService _adminService;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  List<AdminDepartment> _departments = [];
  List<AdminDepartment> get departments => _departments;

  List<AdminTeam> _teams = [];
  List<AdminTeam> get teams => _teams;

  List<AdminProject> _projects = [];
  List<AdminProject> get projects => _projects;

  List<AdminUser> _users = [];
  List<AdminUser> get users => _users;

  final Map<String, AdminUserPermissions> _permissionsMap = {};
  Map<String, AdminUserPermissions> get permissionsMap => _permissionsMap;

  AdminProvider({AdminService? adminService})
      : _adminService = adminService ?? AdminService();

  /// Loads all organisation and users data from the Symfony backend
  Future<void> loadAllData() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _adminService.fetchDepartments(),
        _adminService.fetchTeams(),
        _adminService.fetchProjects(),
        _adminService.fetchUsers(),
      ]);

      _departments = results[0] as List<AdminDepartment>;
      _teams = results[1] as List<AdminTeam>;
      _projects = results[2] as List<AdminProject>;
      _users = results[3] as List<AdminUser>;

      // Build permissions map for each user
      _permissionsMap.clear();
      for (final user in _users) {
        _permissionsMap[user.id] = AdminUserPermissions.fromBackendKeys(
          user.id,
          user.permissions,
        );
      }
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  Future<bool> addDepartment({
    required String name,
    String description = '',
  }) async {
    try {
      await _adminService.createDepartment(name: name, description: description);
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateDepartment(
    String id, {
    required String name,
    String description = '',
  }) async {
    try {
      await _adminService.updateDepartment(id, name: name, description: description);
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteDepartment(String id) async {
    try {
      await _adminService.deleteDepartment(id);
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  // ==========================================
  // TEAMS
  // ==========================================

  Future<bool> addTeam({
    required String name,
    String description = '',
    required String departmentId,
  }) async {
    try {
      await _adminService.createTeam(
        name: name,
        description: description,
        departmentId: departmentId,
      );
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateTeam(
    String id, {
    required String name,
    String description = '',
    required String departmentId,
  }) async {
    try {
      await _adminService.updateTeam(
        id,
        name: name,
        description: description,
        departmentId: departmentId,
      );
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteTeam(String id) async {
    try {
      await _adminService.deleteTeam(id);
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  // ==========================================
  // PROJECTS
  // ==========================================

  Future<bool> addProject({
    required String name,
    String description = '',
    List<String> teamIds = const [],
  }) async {
    try {
      await _adminService.createProject(
        name: name,
        description: description,
        teamIds: teamIds,
      );
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateProject(
    String id, {
    required String name,
    String description = '',
    List<String> teamIds = const [],
  }) async {
    try {
      await _adminService.updateProject(
        id,
        name: name,
        description: description,
        teamIds: teamIds,
      );
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteProject(String id) async {
    try {
      await _adminService.deleteProject(id);
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  // ==========================================
  // USERS & PERMISSIONS
  // ==========================================

  Future<bool> addUser({
    required String email,
    required String firstName,
    required String lastName,
    required String password,
    String role = 'ROLE_USER',
    String? teamId,
    List<String> permissions = const [],
  }) async {
    try {
      await _adminService.createUser(
        email: email,
        firstName: firstName,
        lastName: lastName,
        password: password,
        role: role,
        teamId: teamId,
        permissions: permissions,
      );
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateUser(
    String id, {
    String? email,
    String? firstName,
    String? lastName,
    String? password,
    String? role,
    String? teamId,
  }) async {
    try {
      await _adminService.updateUser(
        id,
        email: email,
        firstName: firstName,
        lastName: lastName,
        password: password,
        role: role,
        teamId: teamId,
      );
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> toggleUserStatus(String id, bool isActive) async {
    try {
      await _adminService.toggleUserStatus(id, isActive);
      // Optimistic or refresh
      final index = _users.indexWhere((u) => u.id == id);
      if (index != -1) {
        _users[index] = _users[index].copyWith(isActive: isActive);
        notifyListeners();
      }
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> saveUserPermissions(String userId, AdminUserPermissions perms) async {
    try {
      final backendKeys = perms.toBackendKeys();
      await _adminService.updateUserPermissions(userId, backendKeys);
      _permissionsMap[userId] = perms.clone();
      // Update the user's permission list in local state as well
      final idx = _users.indexWhere((u) => u.id == userId);
      if (idx != -1) {
        _users[idx] = _users[idx].copyWith(permissions: backendKeys);
      }
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteUser(String id) async {
    try {
      await _adminService.deleteUser(id);
      await loadAllData();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  List<AdminTeam> getTeamsForDepartment(String deptId) {
    return _teams.where((t) => t.departmentId == deptId).toList();
  }

  List<AdminProject> getProjectsForTeam(String teamId) {
    return _projects.where((p) => p.teamIds.contains(teamId)).toList();
  }

  List<AdminUser> getUsersForTeam(String teamId) {
    return _users.where((u) => u.teamId == teamId).toList();
  }

  AdminDepartment? getDepartmentById(String? deptId) {
    if (deptId == null) return null;
    try {
      return _departments.firstWhere((d) => d.id == deptId);
    } catch (_) {
      return null;
    }
  }

  AdminTeam? getTeamById(String? teamId) {
    if (teamId == null) return null;
    try {
      return _teams.firstWhere((t) => t.id == teamId);
    } catch (_) {
      return null;
    }
  }

  AdminProject? getProjectById(String? projId) {
    if (projId == null) return null;
    try {
      return _projects.firstWhere((p) => p.id == projId);
    } catch (_) {
      return null;
    }
  }

  AdminUserPermissions getUserPermissions(String userId) {
    return _permissionsMap[userId] ?? AdminUserPermissions(userId: userId);
  }
}
