// Admin models for Organisation and Users & Permissions

class AdminDepartment {
  final String id;
  final String name;
  final String description;

  const AdminDepartment({
    required this.id,
    required this.name,
    this.description = '',
  });

  factory AdminDepartment.fromJson(Map<String, dynamic> json) {
    return AdminDepartment(
      id: (json['id'] ?? '').toString(),
      name: json['name'] ?? '',
      description: json['description'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
    };
  }

  AdminDepartment copyWith({
    String? id,
    String? name,
    String? description,
  }) {
    return AdminDepartment(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
    );
  }
}

class AdminTeam {
  final String id;
  final String name;
  final String description;
  final String departmentId;
  final String? departmentName;

  const AdminTeam({
    required this.id,
    required this.name,
    this.description = '',
    required this.departmentId,
    this.departmentName,
  });

  factory AdminTeam.fromJson(Map<String, dynamic> json) {
    String deptId = '';
    String? deptName;
    if (json['department'] is Map) {
      deptId = (json['department']['id'] ?? '').toString();
      deptName = json['department']['name']?.toString();
    } else if (json['departmentId'] != null) {
      deptId = json['departmentId'].toString();
    }

    return AdminTeam(
      id: (json['id'] ?? '').toString(),
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      departmentId: deptId,
      departmentName: deptName,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'departmentId': departmentId,
    };
  }

  AdminTeam copyWith({
    String? id,
    String? name,
    String? description,
    String? departmentId,
    String? departmentName,
  }) {
    return AdminTeam(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      departmentId: departmentId ?? this.departmentId,
      departmentName: departmentName ?? this.departmentName,
    );
  }
}

class AdminProject {
  final String id;
  final String name;
  final String description;
  final List<String> teamIds;

  const AdminProject({
    required this.id,
    required this.name,
    this.description = '',
    this.teamIds = const [],
  });

  factory AdminProject.fromJson(Map<String, dynamic> json) {
    List<String> teams = [];
    if (json['teams'] is List) {
      teams = (json['teams'] as List)
          .map((t) => (t is Map ? t['id'] : t).toString())
          .toList();
    } else if (json['teamIds'] is List) {
      teams = (json['teamIds'] as List).map((t) => t.toString()).toList();
    }

    return AdminProject(
      id: (json['id'] ?? '').toString(),
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      teamIds: teams,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'teamIds': teamIds,
    };
  }

  AdminProject copyWith({
    String? id,
    String? name,
    String? description,
    List<String>? teamIds,
  }) {
    return AdminProject(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      teamIds: teamIds ?? this.teamIds,
    );
  }
}

class AdminUser {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final List<String> roles;
  final bool isActive;
  final String? teamId;
  final List<String> projectIds;
  final List<String> permissions;

  const AdminUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.roles = const ['ROLE_USER'],
    this.isActive = true,
    this.teamId,
    this.projectIds = const [],
    this.permissions = const [],
  });

  String get fullName {
    final combined = '$firstName $lastName'.trim();
    return combined.isEmpty ? email : combined;
  }

  factory AdminUser.fromJson(Map<String, dynamic> json) {
    List<String> parsedRoles = [];
    if (json['roles'] is List) {
      parsedRoles = (json['roles'] as List).map((r) => r.toString()).toList();
    } else if (json['role'] != null) {
      parsedRoles = [json['role'].toString()];
    }

    String mainRole = 'ROLE_USER';
    if (parsedRoles.contains('ROLE_ADMIN')) {
      mainRole = 'ROLE_ADMIN';
    } else if (parsedRoles.contains('ROLE_MANAGER')) {
      mainRole = 'ROLE_MANAGER';
    } else if (parsedRoles.isNotEmpty) {
      mainRole = parsedRoles.first;
    }

    List<String> parsedProjectIds = [];
    if (json['projectIds'] is List) {
      parsedProjectIds = (json['projectIds'] as List).map((p) => p.toString()).toList();
    }

    List<String> parsedPerms = [];
    if (json['permissions'] is List) {
      parsedPerms = (json['permissions'] as List).map((p) => p.toString()).toList();
    }

    return AdminUser(
      id: (json['id'] ?? '').toString(),
      email: json['email'] ?? '',
      firstName: json['firstName'] ?? json['first_name'] ?? '',
      lastName: json['lastName'] ?? json['last_name'] ?? '',
      role: mainRole,
      roles: parsedRoles,
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      teamId: json['teamId']?.toString() ?? json['team']?['id']?.toString(),
      projectIds: parsedProjectIds,
      permissions: parsedPerms,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'roles': roles,
      'role': role,
      'isActive': isActive,
      'teamId': teamId,
      'projectIds': projectIds,
      'permissions': permissions,
    };
  }

  AdminUser copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? role,
    List<String>? roles,
    bool? isActive,
    String? teamId,
    List<String>? projectIds,
    List<String>? permissions,
  }) {
    return AdminUser(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      role: role ?? this.role,
      roles: roles ?? this.roles,
      isActive: isActive ?? this.isActive,
      teamId: teamId ?? this.teamId,
      projectIds: projectIds ?? this.projectIds,
      permissions: permissions ?? this.permissions,
    );
  }
}

class AdminUserPermissions {
  final String userId;
  bool canUploadMeeting;

  // Team level
  bool canViewTeamTranscription;
  bool canViewTeamPV;
  bool canViewTeamBehaviorAnalytics;
  bool canViewTeamOthersBehavior;

  // Department level
  bool canViewDeptTranscription;
  bool canViewDeptPV;
  bool canViewDeptBehaviorAnalytics;
  bool canViewDeptOthersBehavior;

  AdminUserPermissions({
    required this.userId,
    this.canUploadMeeting = false,
    this.canViewTeamTranscription = false,
    this.canViewTeamPV = false,
    this.canViewTeamBehaviorAnalytics = false,
    this.canViewTeamOthersBehavior = false,
    this.canViewDeptTranscription = false,
    this.canViewDeptPV = false,
    this.canViewDeptBehaviorAnalytics = false,
    this.canViewDeptOthersBehavior = false,
  });

  static const Map<String, String> frontendToBackendMap = {
    'canUploadMeeting': 'meeting.upload',
    'canViewTeamTranscription': 'team.transcript.read',
    'canViewTeamPV': 'team.pv.read',
    'canViewTeamBehaviorAnalytics': 'team.analytics.self',
    'canViewTeamOthersBehavior': 'team.analytics.others',
    'canViewDeptTranscription': 'dept.transcript.read',
    'canViewDeptPV': 'dept.pv.read',
    'canViewDeptBehaviorAnalytics': 'dept.analytics.self',
    'canViewDeptOthersBehavior': 'dept.analytics.others',
  };

  factory AdminUserPermissions.fromBackendKeys(String userId, List<dynamic> keys) {
    final keySet = keys.map((k) => k.toString()).toSet();
    return AdminUserPermissions(
      userId: userId,
      canUploadMeeting: keySet.contains('meeting.upload') || keySet.contains('canUploadMeeting'),
      canViewTeamTranscription: keySet.contains('team.transcript.read') || keySet.contains('canViewTeamTranscription'),
      canViewTeamPV: keySet.contains('team.pv.read') || keySet.contains('canViewTeamPV'),
      canViewTeamBehaviorAnalytics: keySet.contains('team.analytics.self') || keySet.contains('canViewTeamBehaviorAnalytics'),
      canViewTeamOthersBehavior: keySet.contains('team.analytics.others') || keySet.contains('canViewTeamOthersBehavior'),
      canViewDeptTranscription: keySet.contains('dept.transcript.read') || keySet.contains('canViewDeptTranscription'),
      canViewDeptPV: keySet.contains('dept.pv.read') || keySet.contains('canViewDeptPV'),
      canViewDeptBehaviorAnalytics: keySet.contains('dept.analytics.self') || keySet.contains('canViewDeptBehaviorAnalytics'),
      canViewDeptOthersBehavior: keySet.contains('dept.analytics.others') || keySet.contains('canViewDeptOthersBehavior'),
    );
  }

  List<String> toBackendKeys() {
    final List<String> keys = [];
    if (canUploadMeeting) keys.add('meeting.upload');
    if (canViewTeamTranscription) keys.add('team.transcript.read');
    if (canViewTeamPV) keys.add('team.pv.read');
    if (canViewTeamBehaviorAnalytics) keys.add('team.analytics.self');
    if (canViewTeamOthersBehavior) keys.add('team.analytics.others');
    if (canViewDeptTranscription) keys.add('dept.transcript.read');
    if (canViewDeptPV) keys.add('dept.pv.read');
    if (canViewDeptBehaviorAnalytics) keys.add('dept.analytics.self');
    if (canViewDeptOthersBehavior) keys.add('dept.analytics.others');
    return keys;
  }

  AdminUserPermissions clone() {
    return AdminUserPermissions(
      userId: userId,
      canUploadMeeting: canUploadMeeting,
      canViewTeamTranscription: canViewTeamTranscription,
      canViewTeamPV: canViewTeamPV,
      canViewTeamBehaviorAnalytics: canViewTeamBehaviorAnalytics,
      canViewTeamOthersBehavior: canViewTeamOthersBehavior,
      canViewDeptTranscription: canViewDeptTranscription,
      canViewDeptPV: canViewDeptPV,
      canViewDeptBehaviorAnalytics: canViewDeptBehaviorAnalytics,
      canViewDeptOthersBehavior: canViewDeptOthersBehavior,
    );
  }
}
