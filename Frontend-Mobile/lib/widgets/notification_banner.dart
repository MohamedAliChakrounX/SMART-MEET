import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';

/// Wraps any child and automatically shows animated in-app notification
/// banners whenever [NotificationProvider] broadcasts a new message.
///
/// Usage: Wrap your top-level Scaffold or Shell route child with this widget.
class NotificationBannerWrapper extends StatefulWidget {
  final Widget child;
  const NotificationBannerWrapper({super.key, required this.child});

  @override
  State<NotificationBannerWrapper> createState() => _NotificationBannerWrapperState();
}

class _NotificationBannerWrapperState extends State<NotificationBannerWrapper>
    with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;
  late Animation<Offset> _slideAnim;
  late Animation<double> _fadeAnim;
  AppNotification? _currentBanner;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1.5),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic));
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _dismissTimer?.cancel();
    super.dispose();
  }

  void _showBanner(AppNotification notification) {
    _dismissTimer?.cancel();
    setState(() => _currentBanner = notification);
    _animCtrl.forward(from: 0);
    _dismissTimer = Timer(const Duration(seconds: 4), _hideBanner);
  }

  void _hideBanner() {
    _animCtrl.reverse().then((_) {
      if (mounted) setState(() => _currentBanner = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    // Listen to new banners from the provider
    return Consumer<NotificationProvider>(
      builder: (context, provider, _) {
        final pending = provider.pendingBanner;
        if (pending != null && pending != _currentBanner) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              provider.consumeBanner();
              _showBanner(pending);
            }
          });
        }

        return Stack(
          children: [
            widget.child,
            if (_currentBanner != null)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SlideTransition(
                  position: _slideAnim,
                  child: FadeTransition(
                    opacity: _fadeAnim,
                    child: _BannerCard(
                      notification: _currentBanner!,
                      onDismiss: _hideBanner,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _BannerCard extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onDismiss;

  const _BannerCard({
    required this.notification,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = notification.color;
    final topPadding = MediaQuery.of(context).padding.top;

    return Material(
      color: Colors.transparent,
      child: GestureDetector(
        onVerticalDragEnd: (details) {
          if (details.velocity.pixelsPerSecond.dy < -200) onDismiss();
        },
        child: Container(
          margin: EdgeInsets.only(
            top: topPadding + 8,
            left: 16,
            right: 16,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF111827) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withOpacity(0.5), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.2),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              // Colored icon
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(notification.icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      notification.title,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : const Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      notification.message,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: Colors.grey[500],
                        height: 1.4,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              // Dismiss button
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                icon: Icon(Icons.close, size: 16, color: Colors.grey[400]),
                onPressed: onDismiss,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
