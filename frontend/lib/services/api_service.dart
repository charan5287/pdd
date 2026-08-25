import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';
import 'cloud_service.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'dart:convert';
class ApiService {
  static const String _renderCloudUrl = 'https://medinow-api.onrender.com';

  static String get _defaultLocalUrl {
    if (kIsWeb) return 'http://127.0.0.1:8000';
    return _renderCloudUrl;
  }

  static String _currentBaseUrl = _renderCloudUrl;

  static String get baseUrl => _currentBaseUrl;

  // Key is injected at build time via: flutter build apk --dart-define=GEMINI_API_KEY=your_key
  // Falls back to the dev key if not provided. Never hardcode the production key here.
  static const String _geminiApiKey = String.fromEnvironment(
    'GEMINI_API_KEY',
    defaultValue: 'AIzaSyAwRwzIvVt9yqy5pkd4WWPWnGCgc1ZKdhs',
  );

  static final _storage = const FlutterSecureStorage();
  static final Dio _dio = _initDio();

  // Load custom URL from secure storage at app startup
  static Future<void> init() async {
    try {
      final savedUrl = await _storage.read(key: 'backend_url');
      if (savedUrl != null && savedUrl.isNotEmpty && savedUrl != 'http://10.0.2.2:8000') {
        _currentBaseUrl = savedUrl;
        _dio.options.baseUrl = savedUrl;
        debugPrint('🌐 ApiService: Loaded custom backend URL: $_currentBaseUrl');
      } else {
        _currentBaseUrl = _renderCloudUrl;
        _dio.options.baseUrl = _renderCloudUrl;
        debugPrint('🌐 ApiService: Using default backend URL: $_currentBaseUrl');
      }
    } catch (e) {
      debugPrint('⚠️ ApiService: Error loading saved backend URL: $e');
    }

    // Fire-and-forget warmup ping to wake the Render free-tier instance.
    // This runs in the background so it never blocks app startup.
    _warmupBackend();
  }

  /// Sends a lightweight GET / to wake the Render backend early.
  /// If it fails (e.g. offline), we silently ignore — this is purely an optimisation.
  static Future<void> _warmupBackend() async {
    try {
      debugPrint('🔥 ApiService: Sending warmup ping to $_currentBaseUrl');
      await _dio.get(
        '/',
        options: Options(
          receiveTimeout: const Duration(seconds: 90),
          sendTimeout: const Duration(seconds: 10),
        ),
      );
      debugPrint('✅ ApiService: Backend warmup complete.');
    } catch (e) {
      // Ignore — the backend may still be cold, subsequent requests will wait.
      debugPrint('⚠️ ApiService: Warmup ping failed (backend still waking): $e');
    }
  }

  // Update backend URL dynamically and persist it
  static Future<void> updateBaseUrl(String newUrl) async {
    _currentBaseUrl = newUrl;
    _dio.options.baseUrl = newUrl;
    await _storage.write(key: 'backend_url', value: newUrl);
    debugPrint('🌐 ApiService: Updated backend URL to: $_currentBaseUrl');
  }

  static Dio _initDio() {
    final d = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 60), // Increased to 60s to allow Render free tier to wake up (spin-up takes ~50s)
      receiveTimeout: const Duration(seconds: 60), 
    ));

    d.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Bypass Localtunnel reminder page
        options.headers['Bypass-Tunnel-Reminder'] = 'true';
        
        final token = await _storage.read(key: 'token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        String customMessage = 'Connection Error';
        
        if (e.type == DioExceptionType.connectionTimeout || 
            e.type == DioExceptionType.connectionError) {
          customMessage = '⚠️ BACKEND UNREACHABLE\n\n'
              '1. Ensure your PC and Phone are on the SAME WiFi.\n'
              '2. Check if the backend is running at ${e.requestOptions.baseUrl}.\n'
              '3. Your current Subnet must match (e.g., 172.23.27.x).';
          debugPrint('❌ API CONNECTION FAILURE: ${e.requestOptions.baseUrl}');
        } else if (e.response?.statusCode == 401) {
          customMessage = 'Session expired. Please login again.';
        } else {
          customMessage = e.message ?? 'Unknown error occurred';
        }
        
        // We wrap the error message to be used in the UI
        return handler.next(e.copyWith(message: customMessage));
      },
    ));
    return d;
  }

  static Dio get dio => _dio;

  // ── Pharmacy ─────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getNearbyPharmacies({
    required double lat,
    required double lng,
    int radiusMeters = 8000,
  }) async {
    final response = await _dio.get('/pharmacy/nearby', queryParameters: {
      'lat': lat,
      'lng': lng,
      'radius': radiusMeters,
    });
    return response.data;
  }

  static Future<List<dynamic>> getNearbyHospitals({
    required double lat,
    required double lng,
    int radiusMeters = 8000,
  }) async {
    try {
      final response = await _dio.get('/pharmacy/hospitals', queryParameters: {
        'lat': lat,
        'lng': lng,
        'radius': radiusMeters,
      });
      return response.data;
    } catch (e) {
      debugPrint('Hospital Fetch Error (Backend): $e');
      return [];
    }
  }

  static Future<List<dynamic>> getMedicines({String query = ''}) async {
    try {
      final response = await _dio.get('/pharmacy/medicines', queryParameters: {
        if (query.isNotEmpty) 'query': query,
      });
      return response.data as List<dynamic>;
    } catch (e) {
      debugPrint('Medicine search backend error: $e — using local fallback');
      // Fallback local list if backend unreachable
      final allMeds = [
        {"id": 1, "name": "Dolo 650 (Paracetamol)", "generic": "Paracetamol", "price": 30.0, "category": "Pain Relief", "dosage": "650mg", "stock": "High"},
        {"id": 2, "name": "Pan 40 (Pantoprazole)", "generic": "Pantoprazole", "price": 60.0, "category": "Gastro", "dosage": "40mg", "stock": "High"},
        {"id": 3, "name": "Augmentin 625 (Amoxiclav)", "generic": "Amoxicillin + Clavulanic Acid", "price": 145.0, "category": "Antibiotics", "dosage": "625mg", "stock": "Medium"},
        {"id": 4, "name": "Telma 40 (Telmisartan)", "generic": "Telmisartan", "price": 88.0, "category": "Heart", "dosage": "40mg", "stock": "High"},
        {"id": 5, "name": "Atorva 10 (Atorvastatin)", "generic": "Atorvastatin", "price": 95.0, "category": "Heart", "dosage": "10mg", "stock": "High"},
        {"id": 6, "name": "Glycomet 500 (Metformin)", "generic": "Metformin", "price": 35.0, "category": "Diabetes", "dosage": "500mg", "stock": "Medium"},
        {"id": 7, "name": "Montair LC (Montelukast)", "generic": "Montelukast + Levocetirizine", "price": 115.0, "category": "Allergy", "dosage": "10mg", "stock": "Low"},
        {"id": 8, "name": "Uprise-D3 (Vitamin D3)", "generic": "Cholecalciferol", "price": 250.0, "category": "Vitamins", "dosage": "60k IU", "stock": "High"},
        {"id": 9, "name": "Okacet (Cetirizine)", "generic": "Cetirizine", "price": 25.0, "category": "Allergy", "dosage": "10mg", "stock": "High"},
        {"id": 10, "name": "Omez (Omeprazole)", "generic": "Omeprazole", "price": 45.0, "category": "Gastro", "dosage": "20mg", "stock": "High"},
        {"id": 11, "name": "Azithral 500 (Azithromycin)", "generic": "Azithromycin", "price": 110.0, "category": "Antibiotics", "dosage": "500mg", "stock": "High"},
        {"id": 12, "name": "Shelcal 500 (Calcium)", "generic": "Calcium + Vitamin D3", "price": 95.0, "category": "Vitamins", "dosage": "500mg", "stock": "High"},
        {"id": 13, "name": "Combiflam", "generic": "Ibuprofen + Paracetamol", "price": 20.0, "category": "Pain Relief", "dosage": "400mg/325mg", "stock": "High"},
        {"id": 14, "name": "Liv 52", "generic": "Herbal", "price": 150.0, "category": "Herbal", "dosage": "Tablet", "stock": "High"},
        {"id": 15, "name": "Zifi 200 (Cefixime)", "generic": "Cefixime", "price": 120.0, "category": "Antibiotics", "dosage": "200mg", "stock": "High"},
      ];
      if (query.isEmpty) return allMeds;
      final q = query.toLowerCase();
      return allMeds.where((m) =>
        m['name'].toString().toLowerCase().contains(q) ||
        (m['category']?.toString().toLowerCase().contains(q) ?? false) ||
        (m['generic']?.toString().toLowerCase().contains(q) ?? false)
      ).toList();
    }
  }

  static Future<List<dynamic>> getUserOrders(int userId) async {
    // Use Firestore real-time stream converted to a one-time list
    try {
      final snapshot = await CloudService.getUserOrdersStream().first;
      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return {
          'id': doc.id,
          'status': data['status'] ?? 'placed',
          'total': data['total'] ?? 0,
          'date': data['createdAt']?.toDate()?.toIso8601String() ?? '',
          'pharmacy_name': data['pharmacyName'] ?? 'Pharmacy',
          'address': data['address'] ?? '',
          'items': data['items'] ?? [],
          'partner': 'MediNow Delivery Expert',
          'partner_phone': '+91 98765 43210',
        };
      }).toList();
    } catch (e) {
      debugPrint('getUserOrders error: $e');
      return [];
    }
  }

  // ── AI Chat ──────────────────────────────────────────────────────────────
  // Note: userId here is passed as a String (Firebase UID) and sent as-is.
  // The backend uses integer DB ids, so we pass null to avoid mismatch.
  // Context (medicines/reminders) is loaded via Firestore on frontend side.
  static Future<String> chatWithAI(String message, {String? userUid, List<Map<String, String>> history = const []}) async {
    try {
      final response = await _dio.post('/ai/chat', data: {
        "message": message,
        "user_id": null, // Backend uses SQLite int IDs; we rely on Gemini context from frontend
        "history": history.map((h) => {"role": h['role'], "content": h['content']}).toList(),
      });
      return response.data['response'] ?? "I'm sorry, I couldn't process that.";
    } catch (e) {
      debugPrint('AI Chat Error: $e');
      return "AI connection error: $e";
    }
  }

  // ── Smart Features — Inventory ────────────────────────────────────────────
  static Future<List<dynamic>> getRefillAlerts(int userId) async {
    try {
      final response = await _dio.get('/smart/refills/$userId');
      return response.data ?? [];
    } catch (e) {
      debugPrint('Error fetching refills: $e');
      return [];
    }
  }

  static Future<List<dynamic>> getExpiryAlerts(int userId) async {
    try {
      final response = await _dio.get('/smart/expiries/$userId');
      return response.data ?? [];
    } catch (e) {
      debugPrint('Error fetching expiries: $e');
      return [];
    }
  }

  static Future<List<dynamic>> getUserInventory(int userId) async {
    try {
      final response = await _dio.get('/smart/inventory/$userId');
      return response.data ?? [];
    } catch (e) {
      debugPrint('Error fetching inventory: $e');
      return [];
    }
  }

  static Future<void> addToInventory({
    required int userId,
    required String medicineName,
    required int quantity,
    String? expiryDate,
    int dailyDosage = 1,
  }) async {
    try {
      await _dio.post('/smart/add', data: {
        "user_id": userId,
        "medicine_name": medicineName,
        "quantity": quantity,
        "expiry_date": expiryDate,
        "daily_dosage": dailyDosage,
      });
    } catch (e) {
      debugPrint('Error adding to inventory: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> takeMedicine(
      int userId, String medicineName) async {
    try {
      final response = await _dio.post('/smart/take/$userId/$medicineName');
      return response.data ?? {"message": "Dose recorded"};
    } catch (e) {
      debugPrint('Error taking medicine: $e');
      return {"message": "Error recording dose: $e"};
    }
  }

  // ── Dose Logging ─────────────────────────────────────────────────────────
  static Future<void> logDose({
    required int userId,
    required String medicineName,
    bool wasSkipped = false,
    String? scheduledTime,
  }) async {
    try {
      await _dio.post('/smart/log-dose', data: {
        "user_id": userId,
        "medicine_name": medicineName,
        "was_skipped": wasSkipped,
        "scheduled_time": scheduledTime,
      });
    } catch (e) {
      debugPrint('Error logging dose: $e');
      rethrow;
    }
  }

  // ── Adherence Analytics ──────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getAdherence(int userId) async {
    try {
      final response = await _dio.get('/smart/adherence/$userId');
      return response.data ?? {};
    } catch (e) {
      debugPrint('Error fetching adherence: $e');
      return {};
    }
  }

  // ── Reminders ────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getReminders(int userId) async {
    try {
      final response = await _dio.get('/smart/reminders/$userId');
      return response.data ?? [];
    } catch (e) {
      debugPrint('Error fetching reminders: $e');
      return [];
    }
  }

  static Future<void> saveReminder(Map<String, dynamic> data) async {
    try {
      await _dio.post('/smart/reminders', data: {
        "user_id": int.tryParse(data['user_id']?.toString() ?? '') ?? 0,
        "medicine_name": data['medicine_name'],
        "dosage": data['dosage'] ?? '1 dose',
        "time": data['time'] ?? '08:00',
        "is_active": data['is_active'] ?? true,
      });
    } catch (e) {
      debugPrint('Error saving reminder: $e');
      rethrow;
    }
  }

  static Future<void> toggleReminder(int reminderId) async {
    try {
      await _dio.patch('/smart/reminders/$reminderId/toggle');
    } catch (e) {
      debugPrint('Error toggling reminder: $e');
      rethrow;
    }
  }

  static Future<void> deleteReminder(int reminderId) async {
    try {
      await _dio.delete('/smart/reminders/$reminderId');
    } catch (e) {
      debugPrint('Error deleting reminder: $e');
      rethrow;
    }
  }

  // ── Prescription ─────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> scanPrescription({
    required Uint8List bytes,
    required String filename,
  }) async {
    try {
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(
          bytes,
          filename: filename,
        ),
      });

      final response = await _dio.post(
        '/prescription/scan',
        data: formData,
        options: Options(
          // 90s: Render free tier needs ~50s to wake from sleep + AI processing time
          receiveTimeout: const Duration(seconds: 90),
          sendTimeout: const Duration(seconds: 30),
        ),
      );
      return response.data;
    } catch (e) {
      debugPrint('Scan API Error: $e. Attempting direct frontend Gemini OCR fallback...');
      try {
        return await _scanPrescriptionLocally(bytes, filename);
      } catch (fallbackError) {
        debugPrint('Direct frontend OCR fallback failed: $fallbackError');
        rethrow;
      }
    }
  }

  static Future<Map<String, dynamic>> _scanPrescriptionLocally(Uint8List bytes, String filename) async {
    final activeModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
    GenerativeModel? model;
    GenerateContentResponse? response;

    const prompt = """
    You are a World-Class Medical OCR and Prescription Analysis Specialist.
    Analyze this prescription image and extract ALL medicines.
    
    For each medicine, return these EXACT JSON fields:
    - name: Exact name as written on the paper (e.g., 'Dolo 650').
    - display_name: Professional cleaned name (e.g., 'Dolo 650mg Tablet').
    - dosage: Strength per unit (e.g., '500mg', '40mg').
    - frequency: Human-readable schedule (e.g., 'Twice a day', 'Once daily at night', 'Three times a day').
    - frequency_per_day: Integer — how many times per day (1, 2, or 3).
    - timings: JSON array of 24-hour time strings when to take (e.g., ["08:00", "20:00"] for twice daily, ["08:00"] for once, ["08:00", "14:00", "20:00"] for thrice).
    - duration_days: Integer number of days to take (default 30 if not specified).
    - instructions: Timing context (e.g., 'After meals', 'Before food', 'At bedtime').
    - purpose: Clinical reason inferred from medicine name if not written (e.g., 'For Fever', 'Antibiotic').
    
    CRITICAL RULES:
    - Return ONLY a valid JSON array. No markdown, no explanation.
    - If NO medicines found, return [].
    - frequency_per_day MUST be an integer (1, 2, or 3).
    - timings MUST be an array of HH:MM strings matching frequency_per_day count.
    - duration_days MUST be an integer.
    """;

    for (final mName in activeModels) {
      try {
        model = GenerativeModel(
          model: mName,
          apiKey: _geminiApiKey,
        );
        response = await model.generateContent([
          Content.multi([
            TextPart(prompt),
            DataPart('image/jpeg', bytes),
          ])
        ]);
        if (response.text != null && response.text!.isNotEmpty) break;
      } catch (e) {
        debugPrint('Local OCR with $mName failed: $e, trying next...');
        continue;
      }
    final text = response?.text?.trim() ?? '';
    String cleanedText = text;
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.substring(7, cleanedText.length - 3).trim();
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.substring(3, cleanedText.length - 3).trim();
    }

    final parsed = jsonDecode(cleanedText);
    if (parsed is List) {
      return {
        'id': null,
        'filename': filename,
        'medicines': parsed,
        'status': 'success',
        'message': 'Prescription analyzed successfully with direct local Gemini OCR.',
        'is_demo': false,
      };
    } else {
      throw Exception('Gemini response is not a valid JSON array');
    }
  }

  static Future<List<dynamic>> getPrescriptionHistory(int userId) async {
    try {
      final response = await _dio.get('/prescription/history/$userId');
      return response.data ?? [];
    } catch (e) {
      debugPrint('Error fetching prescription history: $e');
      return [];
    }
  }

  static Future<List<dynamic>> getHealthLogs(int userId) async {
    try {
      final response = await _dio.get('/smart/health-logs/$userId');
      return response.data ?? [];
    } catch (e) {
      debugPrint('Error fetching health logs: $e');
      return [];
    }
  }

  static Future<void> saveHealthLog({
    required int userId,
    required String symptom,
    required String severity,
    String? notes,
  }) async {
    try {
      await _dio.post('/smart/health-log', data: {
        "user_id": userId,
        "symptom": symptom,
        "severity": severity,
        "notes": notes ?? '',
      });
    } catch (e) {
      debugPrint('Error saving health log: $e');
      rethrow;
    }
  }

  // ── Auth / Profile ────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>?> getCurrentUser() async {
    return await CloudService.getUserProfile();
  }
}
