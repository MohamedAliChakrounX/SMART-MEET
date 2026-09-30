// Custom API Exception classes for Flutter Mobile Client

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic details;

  ApiException(this.message, {this.statusCode, this.details});

  @override
  String toString() {
    if (statusCode != null) {
      return 'ApiException [$statusCode]: $message';
    }
    return 'ApiException: $message';
  }
}

class UnauthorizedException extends ApiException {
  UnauthorizedException([String message = 'Unauthorized access. Please log in again.'])
      : super(message, statusCode: 401);
}

class ForbiddenException extends ApiException {
  ForbiddenException([String message = 'Access denied for this resource.'])
      : super(message, statusCode: 403);
}

class NotFoundException extends ApiException {
  NotFoundException([String message = 'Requested resource not found.'])
      : super(message, statusCode: 404);
}

class NetworkException extends ApiException {
  NetworkException([String message = 'Network connection failed. Please check your connection.'])
      : super(message);
}
