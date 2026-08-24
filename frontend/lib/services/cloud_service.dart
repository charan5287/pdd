import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:intl/intl.dart';
import 'dart:convert';

class CloudService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;
  
  // Key is injected at build time via: flutter build apk --dart-define=GEMINI_API_KEY=your_key
  // Falls back to the dev key if not provided. Never hardcode the production key here.
  static const String _geminiApiKey = String.fromEnvironment(
    'GEMINI_API_KEY',
    defaultValue: 'AIzaSyAwRwzIvVt9yqy5pkd4WWPWnGCgc1ZKdhs',
  );

  static String? _customUid;
  static String? get uid => _customUid ?? _auth.currentUser?.uid;
  static set uid(String? val) => _customUid = val;

  // ─── User Profile ──────────────────────────────────────────────────────────
  
  static Future<void> createUserProfile({
    required String fullName,
    required String phone,
    required String role,
  }) async {
    if (uid == null) throw Exception('Cannot create profile: Not authenticated');
    try {
      await _firestore.collection('users').doc(uid).set({
        'fullName': fullName,
        'phone': phone,
        'role': role,
        'createdAt': FieldValue.serverTimestamp(),
      }).timeout(const Duration(seconds: 40));
    } catch (e) {
      debugPrint('🔥 Firestore Write Error: $e');
      if (e.toString().contains('PERMISSION_DENIED')) {
        throw Exception('Cloud Firestore permissions denied. Please ensure you have created the database and set rules to allow writes.');
      } else if (e.toString().contains('deadline-exceeded') || e is TimeoutException) {
        throw Exception('Connection Timeout: Firestore is taking too long to respond. Check your internet.');
      }
      rethrow;
    }
  }

  static Future<Map<String, dynamic>?> getUserProfile() async {
    if (uid == null) return null;
    try {
      final doc = await _firestore.collection('users').doc(uid).get().timeout(const Duration(seconds: 30));
      return doc.data();
    } catch (e) {
      debugPrint('⚠️ Profile Fetch Timeout/Error: $e');
      // We return null here to allow AuthProvider to use defaults instead of crashing
      return null;
    }
  }

  // ─── Inventory ─────────────────────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> getInventory() async {
    if (uid == null) return [];
    try {
      final snapshot = await _firestore
          .collection('users')
          .doc(uid)
          .collection('inventory')
          .get()
          .timeout(const Duration(seconds: 10));
      
      return snapshot.docs.map((doc) => {
        'id': doc.id,
        ...doc.data(),
      }).toList();
    } catch (e) {
      debugPrint('Error fetching inventory: $e');
      return [];
    }
  }

  static Future<void> addMedicine({
    required String medicineName,
    required int quantity,
    String? expiryDate,
    int dailyDosage = 1,
  }) async {
    if (uid == null) return;
    
    final inventoryRef = _firestore
        .collection('users')
        .doc(uid)
        .collection('inventory');

    // Check if exists
    final existing = await inventoryRef
        .where('medicine_name', isEqualTo: medicineName)
        .limit(1)
        .get();

    if (existing.docs.isNotEmpty) {
      final doc = existing.docs.first;
      await doc.reference.update({
        'quantity_remaining': FieldValue.increment(quantity),
        'daily_dosage': dailyDosage,
        'last_updated': FieldValue.serverTimestamp(),
      });
    } else {
      await inventoryRef.add({
        'medicine_name': medicineName,
        'quantity_remaining': quantity,
        'daily_dosage': dailyDosage,
        'expiry_date': expiryDate ?? 
            DateTime.now().add(const Duration(days: 365)).toIso8601String(),
        'last_updated': FieldValue.serverTimestamp(),
      });
    }
  }

  // ─── Dose Logging ──────────────────────────────────────────────────────────

  static Future<void> logDose({
    required String medicineName,
    bool wasSkipped = false,
    String? scheduledTime,
  }) async {
    if (uid == null) return;

    final batch = _firestore.batch();
    
    // 1. Log the dose
    final logRef = _firestore
        .collection('users')
        .doc(uid)
        .collection('dose_logs')
        .doc();
    
    batch.set(logRef, {
      'medicine_name': medicineName,
      'taken_at': FieldValue.serverTimestamp(),
      'was_skipped': wasSkipped,
      'scheduled_time': scheduledTime,
    });

    // 2. Decrement inventory if not skipped
    if (!wasSkipped) {
      final inventory = await _firestore
          .collection('users')
          .doc(uid)
          .collection('inventory')
          .where('medicine_name', isEqualTo: medicineName)
          .limit(1)
          .get()
          .timeout(const Duration(seconds: 10));
      
      if (inventory.docs.isNotEmpty) {
        batch.update(inventory.docs.first.reference, {
          'quantity_remaining': FieldValue.increment(-1),
          'last_updated': FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();
  }

  // ─── Adherence Analytics ───────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getAdherence() async {
    if (uid == null) return {};

    final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));
    
    final logsSnapshot = await _firestore
        .collection('users')
        .doc(uid)
        .collection('dose_logs')
        .where('taken_at', isGreaterThanOrEqualTo: Timestamp.fromDate(thirtyDaysAgo))
        .get();

    final logs = logsSnapshot.docs;
    
    double score = 0;
    int taken = 0;
    int skipped = 0;

    if (logs.isNotEmpty) {
      taken = logs.where((doc) => doc.data()['was_skipped'] == false).length;
      skipped = logs.where((doc) => doc.data()['was_skipped'] == true).length;
      score = (taken / logs.length) * 100;
    } else {
      // Fallback: Check inventory (same as backend logic)
      final inventory = await getInventory();
      double totalExpected = 0;
      double totalTaken = 0;
      for (var med in inventory) {
        double dosage = (med['daily_dosage'] ?? 1).toDouble();
        totalExpected += dosage * 30;
        // Approximation
        totalTaken += (dosage * 30) - (med['quantity_remaining'] ?? 0);
      }
      if (totalExpected > 0) {
        score = (totalTaken / totalExpected) * 100;
      }
    }

    String riskLevel = score >= 80 ? "Low" : score >= 60 ? "Medium" : "High";
    String riskColor = score >= 80 ? "green" : score >= 60 ? "orange" : "red";

    // Weekly Data (last 7 days)
    List<Map<String, dynamic>> weeklyData = [];
    final now = DateTime.now();
    for (int i = 6; i >= 0; i--) {
      final date = now.subtract(Duration(days: i));
      final dayStart = DateTime(date.year, date.month, date.day);
      final dayEnd = dayStart.add(const Duration(days: 1));
      
      final dayLogs = logs.where((doc) {
        final ts = doc.data()['taken_at'] as Timestamp;
        final d = ts.toDate();
        return d.isAfter(dayStart) && d.isBefore(dayEnd);
      });

      double pct = 0;
      if (dayLogs.isNotEmpty) {
        int dTaken = dayLogs.where((doc) => doc.data()['was_skipped'] == false).length;
        pct = (dTaken / dayLogs.length) * 100;
      }

      weeklyData.add({
        "day": DateFormat('E').format(date),
        "date": DateFormat('yyyy-MM-dd').format(date),
        "percentage": pct.roundToDouble(),
      });
    }

    // AI Insights
    List<String> insights = await _generateAIInsights(score, logs);

    return {
      "adherence_score": score.roundToDouble(),
      "risk_level": riskLevel,
      "risk_color": riskColor,
      "insights": insights,
      "weekly_data": weeklyData,
      "total_doses_logged": logs.length,
      "doses_taken": taken,
      "doses_skipped": skipped,
    };
  }

  static Future<List<String>> _generateAIInsights(double score, List<QueryDocumentSnapshot> logs) async {
    try {
      final model = GenerativeModel(model: 'gemini-2.5-flash', apiKey: _geminiApiKey);

      final logSummary = logs.take(10).map((l) {
        final data = l.data() as Map<String, dynamic>;
        final ts = data['taken_at'];
        String timeStr = 'unknown time';
        if (ts != null && ts is Timestamp) {
          timeStr = DateFormat('MM-dd HH:mm').format(ts.toDate());
        }
        return "${data['medicine_name']} ($timeStr): ${data['was_skipped'] == true ? 'Skipped' : 'Taken'}";
      }).join("\n");

      final prompt = """
      Analyze medication adherence for a patient:
      - Adherence Score: $score%
      - Recent dose logs:
      $logSummary
      
      Provide exactly 3 concise, empathetic, and actionable insights (one sentence each).
      Focus on patterns, encouragement, and practical tips.
      Return ONLY a JSON list of 3 strings. No markdown, no explanation.
      Example: ["You're consistent with morning doses, great work!", "Try placing evening meds on your bedside table.", "Your score improved — keep up the momentum!"]
      """;

      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '';

      // Extract JSON array
      final jsonStr = text.contains('[')
          ? text.substring(text.indexOf('['), text.lastIndexOf(']') + 1)
          : '[]';
      final parsed = jsonDecode(jsonStr);
      if (parsed is List && parsed.isNotEmpty) {
        return List<String>.from(parsed);
      }
    } catch (e) {
      debugPrint('AI insights generation error: $e');
    }
    // Fallback to default messages
    return [
      "Keep up the good work with your medications!",
      "Stay consistent — your health depends on it.",
      "Set daily alarms to never miss a dose.",
    ];
  }

  // ─── Health & Symptoms ─────────────────────────────────────────────────────

  static Future<void> saveHealthLog({
    required String symptom,
    required String severity, // Low, Medium, High
    String? sideEffect,
    String? notes,
  }) async {
    if (uid == null) return;
    await _firestore
        .collection('users')
        .doc(uid)
        .collection('health_logs')
        .add({
      'symptom': symptom,
      'severity': severity,
      'side_effect': sideEffect,
      'notes': notes,
      'timestamp': FieldValue.serverTimestamp(),
    });
  }

  static Future<List<Map<String, dynamic>>> getHealthLogs() async {
    if (uid == null) return [];
    final snapshot = await _firestore
        .collection('users')
        .doc(uid)
        .collection('health_logs')
        .orderBy('timestamp', descending: true)
        .limit(20)
        .get();
    
    return snapshot.docs.map((doc) => {
      'id': doc.id,
      ...doc.data(),
    }).toList();
  }

  static Future<String> generateDoctorReport() async {
    if (uid == null) return "User not authenticated.";

    try {
      // 1. Fetch Adherence Data
      final adherence = await getAdherence();
      
      // 2. Fetch Health Logs
      final healthLogs = await getHealthLogs();
      final healthSummary = healthLogs.map((l) {
        final ts = l['timestamp'] as Timestamp?;
        final date = ts != null ? DateFormat('MM-dd').format(ts.toDate()) : 'Unknown';
        return "$date: ${l['symptom']} (${l['severity']})${l['side_effect'] != null ? ' - Side Effect: ${l['side_effect']}' : ''}";
      }).join("\n");

      final model = GenerativeModel(model: 'gemini-1.5-flash', apiKey: _geminiApiKey);
      
      final prompt = """
      You are a world-class Medical Data Analyst. Generate a professional "Patient Health & Adherence Summary" for a doctor's review.
      
      PATIENT DATA:
      - 30-Day Adherence Score: ${adherence['adherence_score']}%
      - Missed Doses in last 30 days: ${adherence['doses_skipped']}
      - Recent Symptoms & Side Effects:
      $healthSummary
      
      REPORT REQUIREMENTS:
      1. Adherence Summary: Be clinical and identify any dangerous trends.
      2. Symptom Analysis: Correlate symptoms with reported side effects if possible.
      3. Key Risk Factors: Highlight if adherence is below 80%.
      4. Recommendations: Suggest 3 specific questions the patient should ask their doctor.
      
      FORMAT: Use professional Markdown with bold headings. Keep it concise enough for a 2-minute read.
      """;

      final response = await model.generateContent([Content.text(prompt)]);
      return response.text ?? "Failed to generate report.";
    } catch (e) {
      debugPrint('Report Gen Error: $e');
      return "Error generating doctor report: $e";
    }
  }

  // ─── Refill & Expiry ─────────────────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> getRefillAlerts() async {
    final inventory = await getInventory();
    List<Map<String, dynamic>> alerts = [];
    for (var med in inventory) {
      int remaining = med['quantity_remaining'] ?? 0;
      int dosage = med['daily_dosage'] ?? 1;
      double daysLeft = remaining / dosage;
      if (daysLeft < 5) {
        alerts.add({
          "medicine_name": med['medicine_name'],
          "quantity_remaining": remaining,
          "days_left": daysLeft.roundToDouble(),
          "suggested_quantity": dosage <= 1 ? 10 : 30,
          "message": "Running low! ~${daysLeft.toStringAsFixed(1)} days supply left.",
        });
      }
    }
    return alerts;
  }

  static Future<List<Map<String, dynamic>>> getExpiryAlerts() async {
    final inventory = await getInventory();
    List<Map<String, dynamic>> alerts = [];
    final now = DateTime.now();
    final nextMonth = now.add(const Duration(days: 30));

    for (var med in inventory) {
      if (med['expiry_date'] != null) {
        final expiry = DateTime.parse(med['expiry_date']);
        if (expiry.isBefore(nextMonth) && expiry.isAfter(now)) {
          alerts.add({
            "medicine_name": med['medicine_name'],
            "expiry_date": med['expiry_date'],
            "days_until_expiry": expiry.difference(now).inDays,
          });
        }
      }
    }
    return alerts;
  }

  // ─── Prescription History ──────────────────────────────────────────────────

  static Future<void> savePrescriptionToHistory(Map<String, dynamic> data) async {
    if (uid == null) return;
    await _firestore
        .collection('users')
        .doc(uid)
        .collection('prescription_history')
        .add({
      ...data,
      'scanned_at': FieldValue.serverTimestamp(),
    });
  }

  static Future<List<Map<String, dynamic>>> getPrescriptionHistory() async {
    if (uid == null) return [];
    final snapshot = await _firestore
        .collection('users')
        .doc(uid)
        .collection('prescription_history')
        .orderBy('scanned_at', descending: true)
        .get()
        .timeout(const Duration(seconds: 10));
    
    return snapshot.docs.map((doc) => {
      'id': doc.id,
      ...doc.data(),
    }).toList();
  }

  // ─── Reminders ─────────────────────────────────────────────────────────────

  static Future<List<Map<String, dynamic>>> getReminders() async {
    if (uid == null) return [];
    final snapshot = await _firestore
        .collection('users')
        .doc(uid)
        .collection('reminders')
        .get();
    
    return snapshot.docs.map((doc) => {
      'id': doc.id,
      ...doc.data(),
    }).toList();
  }

  static Future<void> saveReminder(Map<String, dynamic> data) async {
    if (uid == null) return;
    await _firestore
        .collection('users')
        .doc(uid)
        .collection('reminders')
        .add({
      ...data,
      'is_active': data['is_active'] ?? true, // Ensure always present
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  static Future<void> deleteReminder(String id) async {
    if (uid == null) return;
    await _firestore
        .collection('users')
        .doc(uid)
        .collection('reminders')
        .doc(id)
        .delete();
  }

  static Future<void> toggleReminder(String id) async {
    if (uid == null) return;
    final docRef = _firestore
        .collection('users')
        .doc(uid)
        .collection('reminders')
        .doc(id);
    
    final doc = await docRef.get();
    if (doc.exists) {
      bool currentStatus = doc.data()?['is_active'] ?? true;
      await docRef.update({'is_active': !currentStatus});
    }
  }

  // ─── Orders (Real-time Firebase) ──────────────────────────────────────────

  static Future<String> placeOrder({
    required Map<String, dynamic> pharmacy,
    required List<Map<String, dynamic>> items,
    required double total,
    required String address,
    required String phone,
    String patientName = 'Patient',
  }) async {
    if (uid == null) throw Exception("User not authenticated");

    final orderData = {
      'userId': uid,
      'patientName': patientName,
      'pharmacyId': pharmacy['id'] ?? 'unknown',
      'pharmacyName': pharmacy['name'] ?? 'Local Pharmacy',
      'items': items.map((i) => {
        'name': i['name'],
        'price': i['price'],
        'qty': i['qty'] ?? 1,
      }).toList(),
      'total': total,
      'address': address,
      'phone': phone,
      'status': 'placed', // placed, confirmed, out_for_delivery, delivered
      'createdAt': FieldValue.serverTimestamp(),
    };

    final docRef = await _firestore.collection('orders').add(orderData);
    return docRef.id;
  }

  static Stream<QuerySnapshot> getPharmacyOrdersStream() {
    // For demo/simulated pharmacy, we show all orders. 
    // In production, we would filter by pharmacyId == currentUid
    return _firestore
        .collection('orders')
        .orderBy('createdAt', descending: true)
        .snapshots();
  }

  static Future<void> updateOrderStatus(String orderId, String status) async {
    await _firestore.collection('orders').doc(orderId).update({
      'status': status,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  static Stream<QuerySnapshot> getUserOrdersStream() {
    if (uid == null) return const Stream.empty();
    return _firestore
        .collection('orders')
        .where('userId', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .snapshots();
  }
}
