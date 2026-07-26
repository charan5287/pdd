import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'cloud_service.dart';

class AuthService {
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;

  /// Pure Firebase Login
  Future<Map<String, dynamic>?> login(String email, String password) async {
    try {
      debugPrint('🔑 AUTH: Logging in $email...');
      final UserCredential credential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      if (credential.user != null) {
        // Fetch profile from Firestore
        final profile = await CloudService.getUserProfile();
        
        return {
          'uid': credential.user?.uid,
          'email': email.trim(),
          'fullName': profile?['fullName'] ?? 'User',
          'role': profile?['role'] ?? 'patient',
          'phone': profile?['phone'] ?? '',
        };
      }
    } on FirebaseAuthException catch (e) {
      throw Exception(_handleAuthError(e.code));
    } catch (e) {
      throw Exception('Login failed: ${e.toString()}');
    }
    return null;
  }

  /// Pure Firebase Registration with Atomicity and Recovery
  Future<Map<String, dynamic>?> register({
    required String email,
    required String password,
    required String fullName,
    required String phone,
    required String role,
  }) async {
    UserCredential? credential;
    try {
      debugPrint('📝 AUTH: Registering $email...');
      credential = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      if (credential.user != null) {
        // Create profile in Firestore
        try {
          await CloudService.createUserProfile(
            fullName: fullName,
            phone: phone,
            role: role,
          );
        } catch (e) {
          // If profile creation fails, we must cleanup the auth user 
          // so the user can try again without "already-in-use" errors.
          debugPrint('⚠️ Profile creation failed, cleaning up Auth user...');
          await credential.user?.delete();
          throw Exception('Profile creation failed: ${e.toString()}');
        }

        return {
          'uid': credential.user?.uid,
          'email': email.trim(),
          'fullName': fullName,
          'role': role
        };
      }
    } on FirebaseAuthException catch (e) {
      if (e.code == 'email-already-in-use') {
        debugPrint('🔄 AUTH: Email already in use, attempting automatic account repair...');
        try {
          // Attempt login to see if password matches
          final loginCredential = await _firebaseAuth.signInWithEmailAndPassword(
            email: email.trim(),
            password: password,
          );
          
          if (loginCredential.user != null) {
            debugPrint('🔑 AUTH: Login successful, checking for missing profile...');
            final profile = await CloudService.getUserProfile();
            
            if (profile == null) {
              debugPrint('🛠️ AUTH: Profile missing, creating now to repair account...');
              await CloudService.createUserProfile(
                fullName: fullName,
                phone: phone,
                role: role,
              );
              return {
                'uid': loginCredential.user?.uid,
                'email': email.trim(),
                'fullName': fullName,
                'role': role
              };
            } else {
              throw Exception('This email is already registered and the profile is complete. Please login instead.');
            }
          }
        } on FirebaseAuthException catch (loginErr) {
          if (loginErr.code == 'wrong-password' || loginErr.code == 'invalid-credential') {
            throw Exception('An account exists with this email, but the password you entered is incorrect.');
          }
          throw Exception(_handleAuthError(loginErr.code));
        } catch (recoverErr) {
          throw Exception('Account recovery failed: ${recoverErr.toString()}');
        }
      }
      throw Exception(_handleAuthError(e.code));
    } catch (e) {
      throw Exception('Registration failed: ${e.toString()}');
    }
    return null;
  }

  /// Logout implementation
  Future<void> logout() async {
    try {
      await _firebaseAuth.signOut();
      debugPrint('🚪 AUTH: User logged out from Firebase');
    } catch (e) {
      debugPrint('⚠️ Logout Error: $e');
      rethrow;
    }
  }

  /// Centralized Error Handling
  String _handleAuthError(String code) {
    switch (code) {
      case 'user-not-found': return 'No user found with this email.';
      case 'wrong-password': return 'Incorrect password. Please try again.';
      case 'email-already-in-use': return 'An account already exists for this email.';
      case 'invalid-email': return 'The email address is not valid.';
      case 'weak-password': return 'The password is too weak. Use at least 6 characters.';
      case 'user-disabled': return 'This user account has been disabled.';
      case 'operation-not-allowed': return 'Email/password accounts are not enabled.';
      case 'too-many-requests': return 'Too many attempts. Please try again later.';
      case 'invalid-credential': return 'Incorrect email or password. Please try again.';
      default: return 'Authentication failed: $code';
    }
  }

  /// Check if user is already signed in
  User? get currentUser => _firebaseAuth.currentUser;

  /// Send password reset
  Future<void> sendPasswordReset(String email) async {
    try {
      await _firebaseAuth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (e) {
      throw Exception(_handleAuthError(e.code));
    } catch (e) {
      throw Exception('Failed to send reset email');
    }
  }
}
