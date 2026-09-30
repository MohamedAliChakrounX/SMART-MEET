// Secure Storage Wrapper for JWT Token Persistence

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const String _keyJwtToken = 'jwt_token';
  static const String _keyUserData = 'user_data';

  final FlutterSecureStorage _storage;

  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  /// Saves the JWT token to secure storage
  Future<void> saveToken(String token) async {
    await _storage.write(key: _keyJwtToken, value: token);
  }

  /// Retrieves the stored JWT token
  Future<String?> getToken() async {
    return await _storage.read(key: _keyJwtToken);
  }

  /// Removes the stored JWT token (logout)
  Future<void> deleteToken() async {
    await _storage.delete(key: _keyJwtToken);
    await _storage.delete(key: _keyUserData);
  }

  /// Checks if a JWT token is saved
  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
