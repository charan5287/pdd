import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/cloud_service.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/notification_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _errorMessage;

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get errorMessage => _errorMessage;

  AuthProvider() {
    _listenToAuthChanges();
  }

  /// Listen to Firebase Auth state changes for reactive session management
  void _listenToAuthChanges() {
    FirebaseAuth.instance.authStateChanges().listen((User? user) async {
      if (user == null) {
        _user = null;
        notifyListeners();
      } else {
        if (_user == null) {
          await tryRestoreSession();
        }
      }
    });
  }

  /// Try to restore session on app start using Firestore
  Future<void> tryRestoreSession() async {
    try {
      final firebaseUser = _authService.currentUser;
      if (firebaseUser != null) {
        debugPrint('🔄 RESTORING SESSION for ${firebaseUser.email}...');
        
        // Try to get profile, but don't block auth if Firestore fails
        final profile = await CloudService.getUserProfile();
        
        // Even if profile is null (connection error/not found), 
        // if we have a firebaseUser, we consider them authenticated.
        _user = {
          'uid': firebaseUser.uid,
          'email': firebaseUser.email,
          'fullName': profile?['fullName'] ?? firebaseUser.displayName ?? 'User',
          'role': profile?['role'] ?? 'patient',
          'phone': profile?['phone'] ?? '',
        };
        
        debugPrint('✅ SESSION RESTORED: ${_user?['email']} (${_user?['role']})');
        notifyListeners();
        // Sync local notification alarms from Firestore
        NotificationService.syncNotificationsFromCloud();
      }
    } catch (e) {
      debugPrint('❌ RESTORE ERROR: $e');
    }
  }

  Future<String?> login(String email, String password, {String? selectedRole}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _authService.login(email, password);
      if (result != null) {
        _user = Map<String, dynamic>.from(result);
        // Ensure phone is populated from result (auth_service fetches from Firestore)
        _user!['phone'] = result['phone'] ?? '';
        if (_user!['role'] == 'patient' && selectedRole != null && selectedRole != 'user') {
          _user!['role'] = selectedRole;
        }
        _isLoading = false;
        notifyListeners();
        // Sync local notification alarms from Firestore
        NotificationService.syncNotificationsFromCloud();
        return null; // success
      }
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
    }

    _isLoading = false;
    notifyListeners();
    return _errorMessage ?? 'Login failed';
  }

  /// Fresh Register
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

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    notifyListeners();
  }

  Future<String?> refreshUser() async {
    final profile = await CloudService.getUserProfile();
    if (profile != null && _authService.currentUser != null) {
      _user = {
        'uid': _authService.currentUser!.uid,
        'email': _authService.currentUser!.email,
        'fullName': profile['fullName'] ?? 'User',
        'role': profile['role'] ?? 'patient',
        'phone': profile['phone'] ?? '',
      };
      notifyListeners();
    }
    return null;
  }

  Future<String?> sendPasswordReset(String email) async {
    try {
      await _authService.sendPasswordReset(email);
      return null;
    } catch (e) {
      return e.toString().replaceFirst('Exception: ', '');
    }
  }
}
