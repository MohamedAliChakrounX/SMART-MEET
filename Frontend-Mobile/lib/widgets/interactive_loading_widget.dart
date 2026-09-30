import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ── Blue-900 palette constants ─────────────────────────────────────────────────
// Keeping everything in one strict monochromatic blue family.
const Color _blue900  = Color(0xFF1E3A8A); // deep navy — primary identity
const Color _blue800  = Color(0xFF1E40AF); // rich blue
const Color _blue700  = Color(0xFF1D4ED8); // vibrant mid-blue
const Color _blue600  = Color(0xFF2563EB); // accent blue
const Color _blue500  = Color(0xFF3B82F6); // standard blue
const Color _blue400  = Color(0xFF60A5FA); // light glow blue
const Color _blue300  = Color(0xFF93C5FD); // soft highlight

class InteractiveLoadingWidget extends StatefulWidget {
  final double progress;
  final String stepLabel;
  final String title;
  final String subtitle;
  final VoidCallback onCancel;
  final String? cancelLabel;       // Optional localised cancel text
  final String? processingLabel;   // Optional localised 'traitement' sub-text

  const InteractiveLoadingWidget({
    super.key,
    required this.progress,
    required this.stepLabel,
    required this.title,
    required this.subtitle,
    required this.onCancel,
    this.cancelLabel,
    this.processingLabel,
  });

  @override
  State<InteractiveLoadingWidget> createState() => _InteractiveLoadingWidgetState();
}

class _InteractiveLoadingWidgetState extends State<InteractiveLoadingWidget>
    with SingleTickerProviderStateMixin {
  final List<TouchRipple> _ripples = [];
  final List<SwipeParticle> _particles = [];
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..addListener(() {
        setState(() {
          _ripples.removeWhere((r) => r.isDead);
          _particles.removeWhere((p) => p.isDead);
        });
      });
    _animController.repeat();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    setState(() {
      _ripples.add(TouchRipple(
        position: details.localPosition,
        createdAt: DateTime.now(),
        color: _blue600,
      ));
    });
  }

  void _handlePanUpdate(DragUpdateDetails details) {
    setState(() {
      _particles.add(SwipeParticle(
        position: details.localPosition,
        velocity: details.delta,
        createdAt: DateTime.now(),
        color: _getRandomBlueShade(),
      ));
    });
  }

  Color _getRandomBlueShade() {
    const colors = [_blue400, _blue500, _blue600, _blue700];
    return colors[Random().nextInt(colors.length)];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return GestureDetector(
      onTapDown: _handleTapDown,
      onPanUpdate: _handlePanUpdate,
      behavior: HitTestBehavior.opaque,
      child: Stack(
        children: [
          // Background ambient glowing blobs and touch/drag canvas
          Positioned.fill(
            child: CustomPaint(
              painter: RipplePainter(
                ripples: _ripples,
                particles: _particles,
                isDark: isDark,
              ),
            ),
          ),
          
          // Central content
          Center(
            child: SingleChildScrollView(
              physics: const NeverScrollableScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 20),
                    
                    // Status pill indicator
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _blue900.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: _blue700.withValues(alpha: 0.20),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: _blue600,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'AI ENGINE ACTIVE',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: _blue700,
                              letterSpacing: 1.0,
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    const SizedBox(height: 36),
                    
                    // AI Orb
                    AiOrbWidget(
                      progress: widget.progress,
                      label: widget.processingLabel,
                    ),
                    
                    const SizedBox(height: 40),
                    
                    // Title
                    Text(
                      widget.title,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        height: 1.3,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Step label — glassmorphism card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF1E293B).withValues(alpha: 0.6)
                            : Colors.white.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isDark
                              ? _blue900.withValues(alpha: 0.25)
                              : _blue300.withValues(alpha: 0.4),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Text(
                        widget.stepLabel,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                          height: 1.4,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    
                    const SizedBox(height: 20),
                    
                    // Subtitle
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Text(
                        widget.subtitle,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          height: 1.4,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    
                    const SizedBox(height: 120),
                  ],
                ),
              ),
            ),
          ),
          
          // Cancel button
          Positioned(
            bottom: 48,
            left: 32,
            right: 32,
            child: Center(
              child: TextButton.icon(
                onPressed: widget.onCancel,
                style: TextButton.styleFrom(
                  foregroundColor: isDark ? Colors.red[300] : Colors.red[600],
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  backgroundColor: isDark
                      ? Colors.red.withValues(alpha: 0.08)
                      : Colors.red.withValues(alpha: 0.05),
                ),
                icon: const Icon(Icons.close_rounded, size: 14),
                label: Text(
                  widget.cancelLabel ?? 'ANNULER LE TRAITEMENT',
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w700,
                    fontSize: 10.5,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class TouchRipple {
  final Offset position;
  final DateTime createdAt;
  final Color color;

  TouchRipple({
    required this.position,
    required this.createdAt,
    required this.color,
  });

  bool get isDead =>
      DateTime.now().difference(createdAt).inMilliseconds > 800;

  double get progress {
    final elapsed = DateTime.now().difference(createdAt).inMilliseconds;
    return (elapsed / 800.0).clamp(0.0, 1.0);
  }
}

class SwipeParticle {
  final Offset position;
  final Offset velocity; // swipe direction & speed
  final DateTime createdAt;
  final Color color;

  SwipeParticle({
    required this.position,
    required this.velocity,
    required this.createdAt,
    required this.color,
  });

  bool get isDead =>
      DateTime.now().difference(createdAt).inMilliseconds > 350;

  double get progress {
    final elapsed = DateTime.now().difference(createdAt).inMilliseconds;
    return (elapsed / 350.0).clamp(0.0, 1.0);
  }
}

class RipplePainter extends CustomPainter {
  final List<TouchRipple> ripples;
  final List<SwipeParticle> particles;
  final bool isDark;

  RipplePainter({
    required this.ripples,
    required this.particles,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final double time = DateTime.now().millisecondsSinceEpoch / 6000.0;

    // Blob 1: blue-500 glow — top-left area
    final Offset blob1Center = Offset(
      size.width * 0.25 + sin(time) * 35,
      size.height * 0.35 + cos(time * 0.8) * 45,
    );
    // Blob 2: blue-900 glow — bottom-right area
    final Offset blob2Center = Offset(
      size.width * 0.75 + cos(time * 0.9) * 45,
      size.height * 0.55 + sin(time * 1.1) * 35,
    );

    final double baseOpacity = isDark ? 0.07 : 0.04;

    final Paint blob1Paint = Paint()
      ..shader = RadialGradient(
        colors: [
          _blue500.withValues(alpha: baseOpacity),
          _blue500.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromCircle(center: blob1Center, radius: 200))
      ..style = PaintingStyle.fill;
    canvas.drawCircle(blob1Center, 200, blob1Paint);

    final Paint blob2Paint = Paint()
      ..shader = RadialGradient(
        colors: [
          _blue900.withValues(alpha: baseOpacity + 0.02),
          _blue900.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromCircle(center: blob2Center, radius: 240))
      ..style = PaintingStyle.fill;
    canvas.drawCircle(blob2Center, 240, blob2Paint);

    // Tap ripples — expanding concentric rings in blue-600
    for (final ripple in ripples) {
      final t = ripple.progress;
      final opacity = 1.0 - t;
      final radius = 15.0 + (t * 60.0);

      final paint = Paint()
        ..color = ripple.color.withValues(alpha: opacity * 0.15)
        ..style = PaintingStyle.fill;

      final borderPaint = Paint()
        ..color = ripple.color.withValues(alpha: opacity * 0.35)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0;

      canvas.drawCircle(ripple.position, radius, paint);
      canvas.drawCircle(ripple.position, radius, borderPaint);
    }

    // Drag particles — elegant comet streaks with layered glow
    for (final p in particles) {
      final t = p.progress;
      final fadeIn  = t < 0.10 ? (t / 0.10) : 1.0;      // quick fade-in
      final fadeOut = 1.0 - t;                          // linear fade-out
      final opacity = fadeIn * fadeOut;

      // Calculate position dynamically to make particles fly/shoot in the drag direction
      final Offset currentPos = p.position + p.velocity * (t * 6.0);

      // ── Comet tail: a blurred line behind the head ──────────────────────────
      final double speed = p.velocity.distance.clamp(1.0, 30.0);
      final double tailLength = speed * 2.5 * (1.0 - t);
      final Offset normVel = speed > 0
          ? Offset(p.velocity.dx / speed, p.velocity.dy / speed)
          : Offset.zero;
      final Offset tailEnd = currentPos - normVel * tailLength;

      // Outer halo tail — wide, very transparent
      final Paint tailHaloPaint = Paint()
        ..color = p.color.withValues(alpha: opacity * 0.12)
        ..strokeWidth = 6.0 * (1.0 - t)
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5.0)
        ..style = PaintingStyle.stroke;
      canvas.drawLine(currentPos, tailEnd, tailHaloPaint);

      // Core tail — thin, more opaque
      final Paint tailCorePaint = Paint()
        ..color = p.color.withValues(alpha: opacity * 0.35)
        ..strokeWidth = 2.0 * (1.0 - t)
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1.0)
        ..style = PaintingStyle.stroke;
      canvas.drawLine(currentPos, tailEnd, tailCorePaint);

      // ── Comet head: bright glowing dot ──────────────────────────────────────
      final double headRadius = 4.0 * (1.0 - t);

      // Outer glow halo
      final Paint headHaloPaint = Paint()
        ..color = p.color.withValues(alpha: opacity * 0.18)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6.0)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(currentPos, headRadius * 2.2, headHaloPaint);

      // Mid glow ring
      final Paint headMidPaint = Paint()
        ..color = p.color.withValues(alpha: opacity * 0.40)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.5)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(currentPos, headRadius * 1.4, headMidPaint);

      // Bright core
      final Paint headCorePaint = Paint()
        ..color = _blue300.withValues(alpha: opacity * 0.85)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(currentPos, headRadius, headCorePaint);
    }
  }

  @override
  bool shouldRepaint(covariant RipplePainter oldDelegate) => true;
}

class AiOrbWidget extends StatefulWidget {
  final double progress;
  final String? label;

  const AiOrbWidget({
    super.key,
    required this.progress,
    this.label,
  });

  @override
  State<AiOrbWidget> createState() => _AiOrbWidgetState();
}

class _AiOrbWidgetState extends State<AiOrbWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              width: 190,
              height: 190,
              child: CustomPaint(
                painter: AiOrbPainter(
                  animationValue: _controller.value,
                  progress: widget.progress,
                  isDark: isDark,
                ),
              ),
            ),
            // Text inside the central orb
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.progress > 0
                      ? '${(widget.progress * 100).toInt()}%'
                      : 'AI',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
                if (widget.label != null && widget.progress <= 0) ...[
                  const SizedBox(height: 4),
                  Text(
                    widget.label!.toLowerCase(),
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ],
            ),
          ],
        );
      },
    );
  }
}

class AiOrbPainter extends CustomPainter {
  final double animationValue;
  final double progress;
  final bool isDark;

  AiOrbPainter({
    required this.animationValue,
    required this.progress,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    // 1. Central breathing glow orb — blue-900 core with blue-500 halo
    final double pulse = 1.0 + 0.06 * sin(animationValue * 2 * pi);
    final double orbRadius = 48.0 * pulse;

    final Paint orbPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          _blue700.withValues(alpha: 0.22),
          _blue500.withValues(alpha: 0.08),
          _blue500.withValues(alpha: 0.0),
        ],
        stops: const [0.0, 0.6, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: orbRadius * 1.5))
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, orbRadius * 1.5, orbPaint);

    // Core disc — dark navy in dark mode, near-white in light mode
    final Paint corePaint = Paint()
      ..color = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC)
      ..style = PaintingStyle.fill;

    // Soft blue-900 shadow glow behind core
    final Paint shadowPaint = Paint()
      ..color = _blue900.withValues(alpha: 0.20)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, orbRadius - 2, shadowPaint);
    canvas.drawCircle(center, orbRadius - 2, corePaint);

    // 2. Inner dashed ring — rotates counter-clockwise, blue-600 → blue-400
    final Paint innerRingPaint = Paint()
      ..shader = SweepGradient(
        colors: const [_blue400, _blue600, _blue900, _blue600, _blue400],
      ).createShader(Rect.fromCircle(center: center, radius: 64))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    _drawDashedCircle(
      canvas,
      center,
      64.0,
      innerRingPaint,
      dashWidth: 5,
      dashSpace: 4,
      rotationAngle: -animationValue * 2 * pi,
    );

    // 3. Outer dashed ring — rotates clockwise, blue-700 → blue-500
    final Paint outerRingPaint = Paint()
      ..shader = SweepGradient(
        colors: const [_blue500, _blue800, _blue900, _blue800, _blue500],
      ).createShader(Rect.fromCircle(center: center, radius: 80))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    _drawDashedCircle(
      canvas,
      center,
      80.0,
      outerRingPaint,
      dashWidth: 8,
      dashSpace: 6,
      rotationAngle: animationValue * 2 * pi,
    );

    // 4. Progress arc (when progress > 0) — deep dark blue, premium look
    if (progress > 0) {
      // Track background — very dark navy
      final Paint progressBgPaint = Paint()
        ..color = isDark
            ? _blue900.withValues(alpha: 0.55)
            : _blue900.withValues(alpha: 0.12)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5.0;
      canvas.drawCircle(center, 80.0, progressBgPaint);

      // Outer wide glow — deep blue-900 halo
      final Paint progressOuterGlow = Paint()
        ..color = _blue900.withValues(alpha: 0.55)
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 10.0
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: 80.0),
        -pi / 2, progress * 2 * pi, false, progressOuterGlow,
      );

      // Inner tight glow — blue-800 shimmer
      final Paint progressInnerGlow = Paint()
        ..color = _blue800.withValues(alpha: 0.70)
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 5.5
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.5);
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: 80.0),
        -pi / 2, progress * 2 * pi, false, progressInnerGlow,
      );

      // Core arc — blue-900 → blue-700 → blue-600 (very dark to less dark)
      final Paint progressPaint = Paint()
        ..shader = SweepGradient(
          startAngle: -pi / 2,
          endAngle: -pi / 2 + progress * 2 * pi,
          colors: const [_blue900, _blue800, _blue700, _blue600],
          stops: [0.0, 0.4, 0.75, 1.0],
        ).createShader(Rect.fromCircle(center: center, radius: 80))
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 5.0;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: 80.0),
        -pi / 2, progress * 2 * pi, false, progressPaint,
      );

      // Bright leading dot at the arc tip
      final double tipAngle = -pi / 2 + progress * 2 * pi;
      final Offset tipPos = Offset(
        center.dx + 80.0 * cos(tipAngle),
        center.dy + 80.0 * sin(tipAngle),
      );
      final Paint tipGlowPaint = Paint()
        ..color = _blue600.withValues(alpha: 0.45)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(tipPos, 7.0, tipGlowPaint);
      final Paint tipPaint = Paint()
        ..color = _blue400
        ..style = PaintingStyle.fill;
      canvas.drawCircle(tipPos, 3.5, tipPaint);
    }
  }

  void _drawDashedCircle(
    Canvas canvas,
    Offset center,
    double radius,
    Paint paint, {
    required double dashWidth,
    required double dashSpace,
    required double rotationAngle,
  }) {
    final double circumference = 2 * pi * radius;
    final int numDashes = (circumference / (dashWidth + dashSpace)).floor();
    for (int i = 0; i < numDashes; i++) {
      final double startAngle = (i * (dashWidth + dashSpace) / circumference) * 2 * pi;
      final double sweepAngle = (dashWidth / circumference) * 2 * pi;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle + rotationAngle,
        sweepAngle,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant AiOrbPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
        oldDelegate.progress != progress ||
        oldDelegate.isDark != isDark;
  }
}
