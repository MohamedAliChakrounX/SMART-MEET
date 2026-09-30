// Base HTTP ApiClient for Meeting AI Mobile

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'api_exception.dart';
import 'token_storage.dart';

class ApiClient {
  final http.Client _client;
  final TokenStorage _tokenStorage;
  final String _baseUrl;

  ApiClient({
    http.Client? client,
    TokenStorage? tokenStorage,
    String? baseUrl,
  })  : _client = client ?? http.Client(),
        _tokenStorage = tokenStorage ?? TokenStorage(),
        _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  /// Helper to build headers with optional Bearer JWT token
  Future<Map<String, String>> _headers({Map<String, String>? extraHeaders}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    final token = await _tokenStorage.getToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    if (extraHeaders != null) {
      headers.addAll(extraHeaders);
    }
    return headers;
  }

  /// Handles HTTP response and throws appropriate ApiException if status != 20x
  dynamic _processResponse(http.Response response) {
    dynamic body;
    try {
      if (response.body.isNotEmpty) {
        body = jsonDecode(response.body);
      }
    } catch (_) {
      body = response.body;
    }

    final status = response.statusCode;
    if (status >= 200 && status < 300) {
      return body;
    }

    String message = 'API error ($status)';
    if (body is Map && body.containsKey('message')) {
      message = body['message'].toString();
    } else if (body is Map && body.containsKey('detail')) {
      message = body['detail'].toString();
    }

    switch (status) {
      case 401:
        _tokenStorage.deleteToken();
        throw UnauthorizedException(message);
      case 403:
        throw ForbiddenException(message);
      case 404:
        throw NotFoundException(message);
      default:
        throw ApiException(message, statusCode: status, details: body);
    }
  }

  /// Resolves the URL dynamically, routing Flask/AI endpoints to port 5001 and Symfony to port 8000.
  ///
  /// Routing rules (mirroring vite.config.js proxy):
  ///   - /meetings/upload                      → Flask (new AI job)
  ///   - /meetings/<9-digit-id>[/...]           → Flask (AI JobStore meeting)
  ///   - /meetings/<uuid>/<ai-action>           → Flask (AI sub-route for UUID meeting)
  ///   - /meetings/<uuid>[/non-ai-action]       → Symfony
  ///   - /summaries/<9-digit-id>               → Flask
  Uri _resolveUri(String path, {Map<String, String>? queryParams}) {
    bool isAiRoute = false;

    // Remove leading slash for easier checking
    final normPath = path.startsWith('/') ? path.substring(1) : path;
    final segments = normPath.split('/');

    // Regex for a 9-digit numeric Flask JobStore ID
    final numericId = RegExp(r'^\d{9}$');

    // AI-only sub-actions that exist on Flask (not Symfony)
    // NOTE: 'analytics' is NOT here — for UUID meetings, analytics data lives
    // in Symfony's DB (analytic_data table). Only 'analytics/interpret' is
    // handled by Flask (AI interpretation job queue).
    const aiActions = {
      'generate-summary', 'summary-status',
      'transcribe', 'translate',
      'analytics/interpret', 'audio', 'rename',
    };

    if (segments.isNotEmpty) {
      if (segments[0] == 'meetings') {
        if (segments.length > 1) {
          final meetingId = segments[1];
          if (meetingId == 'upload') {
            // POST /meetings/upload → always Flask
            isAiRoute = true;
          } else if (numericId.hasMatch(meetingId)) {
            // 9-digit JobStore ID → always Flask
            isAiRoute = true;
          } else if (segments.length > 2) {
            // UUID meeting: only route to Flask for AI-specific sub-actions
            final action = segments[2];
            // Also check compound action (e.g. 'analytics/interpret' = segments[2]/segments[3])
            final compoundAction = segments.length > 3
                ? '${segments[2]}/${segments[3]}'
                : action;
            if (aiActions.contains(action) || aiActions.contains(compoundAction)) {
              isAiRoute = true;
            }
          }
          // Otherwise: UUID meeting root (/meetings/<uuid>) → Symfony
        }
      } else if (segments[0] == 'summaries') {
        if (segments.length > 1 && numericId.hasMatch(segments[1])) {
          // /summaries/<9-digit-id> → Flask
          isAiRoute = true;
        }
      }
    }

    String base;
    if (isAiRoute) {
      // Direct to Flask AI Server on port 5001.
      // E.g., replaces ':8000/api/v1' with ':5001/api'
      final baseHost = _baseUrl.replaceAll(':8000', ':5001');
      base = baseHost.endsWith('/api/v1')
          ? '${baseHost.substring(0, baseHost.length - 7)}/api'
          : baseHost;
    } else {
      base = _baseUrl;
    }

    Uri uri = Uri.parse('$base$path');
    if (queryParams != null && queryParams.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParams);
    }
    return uri;
  }

  /// GET request
  Future<dynamic> get(String path, {Map<String, String>? queryParams}) async {
    try {
      final uri = _resolveUri(path, queryParams: queryParams);
      final headers = await _headers();
      final response = await _client
          .get(uri, headers: headers)
          .timeout(ApiConfig.connectTimeout);
      return _processResponse(response);
    } on SocketException {
      throw NetworkException();
    } on TimeoutException {
      throw NetworkException('Délai de connexion dépassé. Vérifiez que le serveur est accessible.');
    } on http.ClientException catch (e) {
      throw NetworkException(e.message);
    }
  }

  /// POST request
  Future<dynamic> post(String path, {dynamic body, Duration? timeout}) async {
    try {
      final uri = _resolveUri(path);
      final headers = await _headers();
      final response = await _client
          .post(uri, headers: headers, body: jsonEncode(body))
          .timeout(timeout ?? ApiConfig.connectTimeout);
      return _processResponse(response);
    } on SocketException {
      throw NetworkException();
    } on TimeoutException {
      throw NetworkException('Délai de connexion dépassé. Vérifiez que le serveur est accessible.');
    } on http.ClientException catch (e) {
      throw NetworkException(e.message);
    }
  }

  /// PUT request
  Future<dynamic> put(String path, {dynamic body, Duration? timeout}) async {
    try {
      final uri = _resolveUri(path);
      final headers = await _headers();
      final response = await _client
          .put(uri, headers: headers, body: jsonEncode(body))
          .timeout(timeout ?? ApiConfig.connectTimeout);
      return _processResponse(response);
    } on SocketException {
      throw NetworkException();
    } on TimeoutException {
      throw NetworkException('Délai de connexion dépassé. Vérifiez que le serveur est accessible.');
    } on http.ClientException catch (e) {
      throw NetworkException(e.message);
    }
  }

  /// PATCH request
  Future<dynamic> patch(String path, {dynamic body, Duration? timeout}) async {
    try {
      final uri = _resolveUri(path);
      final headers = await _headers();
      final response = await _client
          .patch(uri, headers: headers, body: jsonEncode(body))
          .timeout(timeout ?? ApiConfig.connectTimeout);
      return _processResponse(response);
    } on SocketException {
      throw NetworkException();
    } on TimeoutException {
      throw NetworkException('Délai de connexion dépassé. Vérifiez que le serveur est accessible.');
    } on http.ClientException catch (e) {
      throw NetworkException(e.message);
    }
  }

  /// DELETE request
  Future<dynamic> delete(String path, {dynamic body}) async {
    try {
      final uri = _resolveUri(path);
      final headers = await _headers();
      final response = await _client
          .delete(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
          .timeout(ApiConfig.connectTimeout);
      return _processResponse(response);
    } on SocketException {
      throw NetworkException();
    } on TimeoutException {
      throw NetworkException('Délai de connexion dépassé. Vérifiez que le serveur est accessible.');
    } on http.ClientException catch (e) {
      throw NetworkException(e.message);
    }
  }


  /// Multipart File Upload (e.g. for audio recordings)
  Future<dynamic> multipartUpload(
    String path, {
    required String filePath,
    required String fileField,
    Map<String, String>? fields,
  }) async {
    try {
      final uri = _resolveUri(path);
      final request = http.MultipartRequest('POST', uri);

      final token = await _tokenStorage.getToken();
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      if (fields != null) {
        request.fields.addAll(fields);
      }

      request.files.add(await http.MultipartFile.fromPath(fileField, filePath));

      final streamedResponse = await request.send().timeout(ApiConfig.uploadTimeout);
      final response = await http.Response.fromStream(streamedResponse);
      return _processResponse(response);
    } on SocketException {
      throw NetworkException();
    } on http.ClientException catch (e) {
      throw NetworkException(e.message);
    }
  }
}
