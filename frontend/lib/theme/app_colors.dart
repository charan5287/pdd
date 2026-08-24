import 'package:flutter/material.dart';

class AppColors {
  // Primary Palette (Apollo Teal)
  static const Color primary = Color(0xFF0F7A6A);
  static const Color primaryDark = Color(0xFF074D42);
  static const Color primaryLight = Color(0xFFEEF6F5);
  
  // Secondary / Accent (Apollo Gold-Orange)
  static const Color secondary = Color(0xFFFF9A00);
  static const Color accent = Color(0xFFF58220);
  
  // Status Colors
  static const Color success = Color(0xFF0F7A6A);
  static const Color error = Color(0xFFE71D36);
  static const Color warning = Color(0xFFFF9A00);
  static const Color info = Color(0xFF0F7A6A);
  static const Color emergency = Color(0xFFE71D36);
  
  // Background Colors
  static const Color background = Color(0xFFF5F7F8);
  static const Color surface = Colors.white;
  static const Color cardShadow = Color(0x0D000000);
  
  // Text Colors
  static const Color textPrimary = Color(0xFF1E293B);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textHint = Color(0xFF94A3B8);
  
  // Gradients (Premium & Modern)
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0F7A6A), Color(0xFF00A88F)], // Teal to Turquoise
  );

  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF9A00), Color(0xFFF58220)], // Gold to Orange
  );

  static const LinearGradient surfaceGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.white, Color(0xFFF8FAFC)],
  );
}
