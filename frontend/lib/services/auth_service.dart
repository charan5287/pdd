import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_service.dart';

/// Auth service that uses the FastAPI backend directly.
/// No Firestore / Firebase Auth dependency — uses JWT tokens.
class AuthService {
  static final _storage = const FlutterSecureStorage();

  static Dio get _dio => ApiService.dio;

  // ─── Register ─────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>?> register({
    required String email,
    required String password,
    required String fullName,
    required String phone,
    required String role,
  }) async {
    try {
      debugPrint('📝 AUTH: Registering $email via backend...');
      final response = await _dio.post('/auth/register', data: {
        'email': email.trim(),
        'password': password,
        'fullName': fullName,
        'phone': phone,
        'role': role,
      });

      final token = response.data['access_token'] as String;
      final user = response.data['user'] as Map<String, dynamic>;

      // Persist JWT token for subsequent requests
      await _storage.write(key: 'token', value: token);

      debugPrint('✅ AUTH: Registration successful — uid=${user['id']}');
      return {
        'uid': user['id'].toString(),
        'email': user['email'],
        'fullName': user['fullName'],
        'role': user['role'],
        'phone': user['phone'] ?? '',
        'token': token,
      };
    } on DioException catch (e) {
      final detail = e.response?.data?['detail'];
      if (detail != null) throw Exception(detail.toString());
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.connectionError) {
        throw Exception('Cannot connect to server. Check your network and backend URL.');
      }
      throw Exception('Registration failed. Please try again.');
    } catch (e) {
      throw Exception('Registration failed: ${e.toString()}');
    }
  }

  // ─── Login ─────────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>?> login(String email, String password) async {
    try {
      debugPrint('🔑 AUTH: Logging in $email via backend...');
      final response = await _dio.post('/auth/login', data: {
        'email': email.trim(),
        'password': password,
      });

      final token = response.data['access_token'] as String;
      final user = response.data['user'] as Map<String, dynamic>;

      // Persist JWT token for subsequent requests
      await _storage.write(key: 'token', value: token);

      debugPrint('✅ AUTH: Login successful — uid=${user['id']}');
      return {
        'uid': user['id'].toString(),
        'email': user['email'],
        'fullName': user['fullName'],
        'role': user['role'],
        'phone': user['phone'] ?? '',
        'token': token,
      };
    } on DioException catch (e) {
      final detail = e.response?.data?['detail'];
      if (detail != null) throw Exception(detail.toString());
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.connectionError) {
        throw Exception('Cannot connect to server. Ensure the backend is running and reachable.');
      }
      throw Exception('Login failed. Please try again.');
    } catch (e) {
      throw Exception('Login failed: ${e.toString()}');
    }
  }

  // ─── Logout ────────────────────────────────────────────────────────────────
  Future<void> logout() async {
    await _storage.delete(key: 'token');
    debugPrint('🚪 AUTH: Token cleared.');
  }

  // ─── Restore Session from stored token ────────────────────────────────────
  Future<Map<String, dynamic>?> restoreSession() async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null || token.isEmpty) return null;

      debugPrint('🔄 AUTH: Restoring session from stored token...');
      // Hit /auth/me to verify token is still valid and get fresh user data
      final response = await _dio.get('/auth/me');
      final user = response.data as Map<String, dynamic>;

      debugPrint('✅ AUTH: Session restored — ${user['email']}');
      return {
        'uid': user['id'].toString(),
        'email': user['email'],
        'fullName': user['fullName'],
        'role': user['role'],
        'phone': user['phone'] ?? '',
        'token': token,
      };
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        // Token expired — clear it
        await _storage.delete(key: 'token');
        debugPrint('⚠️ AUTH: Token expired, cleared.');
      }
      return null;
    } catch (e) {
      debugPrint('⚠️ AUTH: Session restore failed: $e');
      return null;
    }
  }

  // ─── Send Password Reset (backend stub) ───────────────────────────────────
  Future<void> sendPasswordReset(String email) async {
    try {
      await _dio.post('/auth/forgot-password', data: {'email': email.trim()});
    } on DioException catch (e) {
      final detail = e.response?.data?['detail'];
      throw Exception(detail ?? 'Failed to send reset email');
    }
  }

  // ─── Check if a token is stored (quick local check) ───────────────────────
  Future<bool> get hasStoredToken async {
    final token = await _storage.read(key: 'token');
    return token != null && token.isNotEmpty;
  }
}
