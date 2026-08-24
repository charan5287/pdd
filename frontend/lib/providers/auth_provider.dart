import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/cloud_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _errorMessage;

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get errorMessage => _errorMessage;

  // ─── Restore session from stored JWT token ─────────────────────────────────
  Future<void> tryRestoreSession() async {
    try {
      final result = await _authService.restoreSession();
      if (result != null) {
        _user = result;
        CloudService.uid = result['uid']?.toString();
        debugPrint('✅ SESSION RESTORED: ${_user?['email']} (${_user?['role']})');
        notifyListeners();
      }
    } catch (e) {
      debugPrint('❌ RESTORE ERROR: $e');
    }
  }

  // ─── Refresh User profile info ─────────────────────────────────────────────
  Future<void> refreshUser() async {
    try {
      final result = await _authService.restoreSession();
      if (result != null) {
        _user = Map<String, dynamic>.from(result);
        CloudService.uid = result['uid']?.toString();
        debugPrint('✅ SESSION REFRESHED: ${_user?['email']} (${_user?['role']})');
        notifyListeners();
      }
    } catch (e) {
      debugPrint('❌ REFRESH ERROR: $e');
    }
  }

  // ─── Login ─────────────────────────────────────────────────────────────────
  Future<String?> login(String email, String password,
      {String? selectedRole}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _authService.login(email, password);
      if (result != null) {
        _user = Map<String, dynamic>.from(result);
        // If the user logged in via "Pharmacy Portal", override role
        if (selectedRole != null && selectedRole == 'pharmacy') {
          _user!['role'] = 'pharmacy';
        }
        CloudService.uid = _user?['uid']?.toString();
        _isLoading = false;
        notifyListeners();
        return null; // success
      }
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
    }

    _isLoading = false;
    notifyListeners();
    return _errorMessage ?? 'Login failed';
  }

  // ─── Register ──────────────────────────────────────────────────────────────
  Future<String?> register({
    required String email,
    required String password,
    required String fullName,
    required String phone,
    required String role,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _authService.register(
        email: email,
        password: password,
        fullName: fullName,
        phone: phone,
        role: role,
      );
      if (result != null) {
        _user = result;
        CloudService.uid = result['uid']?.toString();
        _isLoading = false;
        notifyListeners();
        return null; // success
      }
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
    }

    _isLoading = false;
    notifyListeners();
    return _errorMessage ?? 'Registration failed';
  }

  // ─── Logout ────────────────────────────────────────────────────────────────
  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    CloudService.uid = null;
    notifyListeners();
  }

  // ─── Password reset ────────────────────────────────────────────────────────
  Future<String?> sendPasswordReset(String email) async {
    try {
      await _authService.sendPasswordReset(email);
      return null;
    } catch (e) {
      return e.toString().replaceFirst('Exception: ', '');
    }
  }
}
