// AuthProvider for Flutter Authentication State Management

import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../services/token_storage.dart';

enum AuthStatus { uninitialized, authenticated, unauthenticated, authenticating }

class AuthProvider extends ChangeNotifier {
  final AuthService _authService;
  final TokenStorage _tokenStorage;

  AuthStatus _status = AuthStatus.uninitialized;
  AuthStatus get status => _status;

  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isAuthenticating => _status == AuthStatus.authenticating;

  User? _currentUser;
  User? get currentUser => _currentUser;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  AuthProvider({AuthService? authService, TokenStorage? tokenStorage})
      : _authService = authService ?? AuthService(),
        _tokenStorage = tokenStorage ?? TokenStorage() {
    _initAuthStatus();
  }

  /// Initializes auth status from secure storage on app launch
  Future<void> _initAuthStatus() async {
    final hasToken = await _tokenStorage.hasToken();
    if (hasToken) {
      try {
        _currentUser = await _authService.fetchProfile();
        _status = AuthStatus.authenticated;
      } catch (_) {
        // If token fetch fails, clear token
        await _tokenStorage.deleteToken();
        _status = AuthStatus.unauthenticated;
      }
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  /// Logs in with email and password
  Future<bool> login(String username, String password) async {
    _status = AuthStatus.authenticating;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _authService.login(username, password);
      final token = result['token'] as String?;

      if (token != null && token.isNotEmpty) {
        await _tokenStorage.saveToken(token);
        _currentUser = result['user'] as User? ?? await _authService.fetchProfile();
        _status = AuthStatus.authenticated;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Authentication failed: No token received';
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString().replaceAll('ApiException: ', '');
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  /// Logs out and clears stored JWT token
  Future<void> logout() async {
    await _tokenStorage.deleteToken();
    _currentUser = null;
    _status = AuthStatus.unauthenticated;
    _errorMessage = null;
    notifyListeners();
  }

  /// Clears current error message
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  /// Fetches all users (admin only)
  Future<List<dynamic>> fetchAllUsers() async {
    return _authService.fetchAllUsers();
  }
}
