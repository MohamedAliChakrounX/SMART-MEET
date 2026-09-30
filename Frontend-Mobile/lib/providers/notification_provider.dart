import 'package:flutter/material.dart';

enum AppNotificationType { success, info, warning, error }

class AppNotification {
  final String id;
  final String title;
  final String message;
  final AppNotificationType type;
  final DateTime timestamp;
  bool isRead;

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    this.type = AppNotificationType.info,
    DateTime? timestamp,
    this.isRead = false,
  }) : timestamp = timestamp ?? DateTime.now();

  Color get color {
    switch (type) {
      case AppNotificationType.success:
        return const Color(0xFF10B981);
      case AppNotificationType.warning:
        return const Color(0xFFF59E0B);
      case AppNotificationType.error:
        return const Color(0xFFEF4444);
      case AppNotificationType.info:
        return const Color(0xFF3B82F6);
    }
  }

  IconData get icon {
    switch (type) {
      case AppNotificationType.success:
        return Icons.check_circle_outline;
      case AppNotificationType.warning:
        return Icons.warning_amber_outlined;
      case AppNotificationType.error:
        return Icons.error_outline;
      case AppNotificationType.info:
        return Icons.info_outline;
    }
  }
}

/// Global notification broadcast system.
///
/// Usage:
///   context.read<NotificationProvider>().notify(
///     title: 'PV Généré',
///     message: 'Le procès-verbal est prêt à être consulté.',
///     type: AppNotificationType.success,
///   );
class NotificationProvider extends ChangeNotifier {
  final List<AppNotification> _notifications = [];

  /// Pending notification to show as an overlay (null once consumed)
  AppNotification? _pendingBanner;

  List<AppNotification> get notifications => List.unmodifiable(_notifications);

  AppNotification? get pendingBanner => _pendingBanner;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  /// Broadcasts a new notification and queues it for banner display.
  void notify({
    required String title,
    required String message,
    AppNotificationType type = AppNotificationType.info,
  }) {
    final notification = AppNotification(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      message: message,
      type: type,
    );
    _notifications.insert(0, notification);
    _pendingBanner = notification;
    notifyListeners();
  }

  /// Called by the UI after the banner has been displayed to clear the queue.
  void consumeBanner() {
    _pendingBanner = null;
    // No notifyListeners needed — banner widget listens to the ref directly
  }

  void markAllRead() {
    for (final n in _notifications) {
      n.isRead = true;
    }
    notifyListeners();
  }

  void markRead(String id) {
    final idx = _notifications.indexWhere((n) => n.id == id);
    if (idx >= 0) {
      _notifications[idx].isRead = true;
      notifyListeners();
    }
  }

  void clear() {
    _notifications.clear();
    _pendingBanner = null;
    notifyListeners();
  }
}
