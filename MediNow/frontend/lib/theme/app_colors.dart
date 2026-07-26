import 'package:flutter/material.dart';

class AppColors {
  // Primary Palette (Figma Blue)
  static const Color primary = Color(0xFF1A73E8);
  static const Color primaryDark = Color(0xFF1557B0);
  static const Color primaryLight = Color(0xFFE8F0FE);
  
  // Secondary / Accent
  static const Color secondary = Color(0xFF34A853);
  static const Color accent = Color(0xFF4285F4);
  
  // Status Colors
  static const Color success = Color(0xFF34A853);
  static const Color error = Color(0xFFD93025);
  static const Color warning = Color(0xFFFBBC04);
  static const Color info = Color(0xFF1A73E8);
  static const Color emergency = Color(0xFFD93025);
  
  // Background Colors
  static const Color background = Color(0xFFF1F3F4);
  static const Color surface = Colors.white;
  static const Color cardShadow = Color(0x1F000000);
  
  // Text Colors
  static const Color textPrimary = Color(0xFF202124);
  static const Color textSecondary = Color(0xFF5F6368);
  static const Color textHint = Color(0xFF70757A);
  
  // Gradients (Premium & Modern)
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1A73E8), Color(0xFF673AB7)], // Blue to Deep Purple
  );

  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF4285F4), Color(0xFF34A853)], // Blue to Green
  );

  static const LinearGradient surfaceGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.white, Color(0xFFF8F9FA)],
  );
}
