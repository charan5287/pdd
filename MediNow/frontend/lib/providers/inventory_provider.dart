import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

class InventoryProvider with ChangeNotifier {
  List<dynamic> _inventory = [];
  bool _isLoading = false;

  List<dynamic> get inventory => _inventory;
  bool get isLoading => _isLoading;

  Future<void> loadInventory(String? uid) async {
    if (uid == null) return;
    _isLoading = true;
    notifyListeners();
    try {
      final results = await ApiService.getUserInventory(0); // Legacy ID, ignored
      results.sort((a, b) => (a['medicine_name'] as String).compareTo(b['medicine_name'] as String));
      _inventory = results;
    } catch (e) {
      debugPrint('Error loading inventory: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addMedicine({
    required String? uid,
    required String name,
    required int quantity,
    int dailyDosage = 1,
    String? expiryDate,
  }) async {
    if (uid == null) return false;
    final exp = expiryDate ?? DateTime.now().add(const Duration(days: 365)).toIso8601String();
    try {
      await ApiService.addToInventory(
        userId: 0,
        medicineName: name,
        quantity: quantity,
        dailyDosage: dailyDosage,
        expiryDate: exp,
      );
      await loadInventory(uid);
      return true;
    } catch (e) {
      debugPrint('Error adding medicine to cloud (using local state fallback): $e');
      _addOrUpdateLocalInventory(name, quantity, dailyDosage, exp);
      notifyListeners();
      return true;
    }
  }

  void _addOrUpdateLocalInventory(String name, int quantity, int dailyDosage, String expiryDate) {
    final idx = _inventory.indexWhere((m) => (m['medicine_name'] as String).toLowerCase() == name.toLowerCase());
    if (idx >= 0) {
      final oldQty = (_inventory[idx]['quantity_remaining'] as num).toInt();
      _inventory[idx]['quantity_remaining'] = oldQty + quantity;
      _inventory[idx]['daily_dosage'] = dailyDosage;
    } else {
      _inventory.add({
        'id': 'local_${DateTime.now().millisecondsSinceEpoch}',
        'medicine_name': name,
        'quantity_remaining': quantity,
        'daily_dosage': dailyDosage,
        'expiry_date': expiryDate,
      });
    }
  }

  Future<bool> addMedicineWithReminders({
    required String? uid,
    required String name,
    required int quantity,
    required int dailyDosage,
    required List<String> timings,
    int durationDays = 30,
    String? dosage,
  }) async {
    if (uid == null) return false;
    final exp = DateTime.now().add(Duration(days: durationDays)).toIso8601String();
    try {
      // 1. Add to Inventory
      await ApiService.addToInventory(
        userId: 0,
        medicineName: name,
        quantity: quantity,
        dailyDosage: dailyDosage,
        expiryDate: exp,
      );

      // 2. Add Reminders
      for (final time in timings) {
        try {
          await ApiService.saveReminder({
            'user_id': uid,
            'medicine_name': name,
            'dosage': dosage ?? '1 dose',
            'time': time,
            'is_active': true,
          });
        } catch (re) {
          debugPrint('Error saving reminder for $name: $re');
        }
      }

      await loadInventory(uid);
      await NotificationService.syncNotificationsFromCloud();
      return true;
    } catch (e) {
      debugPrint('Error in automated scheduling (using local state fallback): $e');
      _addOrUpdateLocalInventory(name, quantity, dailyDosage, exp);
      notifyListeners();
      return true;
    }
  }

  Future<void> takeDose(String? uid, String medicineName) async {
    if (uid == null) return;
    try {
      debugPrint('Logging dose (taken) for $medicineName...');
      await ApiService.logDose(userId: 0, medicineName: medicineName);
      await loadInventory(uid);
    } catch (e) {
      debugPrint('Error taking dose: $e');
      rethrow;
    }
  }

  Future<void> skipDose(String? uid, String medicineName) async {
    if (uid == null) return;
    try {
      debugPrint('Logging dose (skipped) for $medicineName...');
      await ApiService.logDose(
          userId: 0, medicineName: medicineName, wasSkipped: true);
      // Even for skip, we reload to ensure any status indicators on cards update
      await loadInventory(uid);
    } catch (e) {
      debugPrint('Error skipping dose: $e');
      rethrow;
    }
  }
}
