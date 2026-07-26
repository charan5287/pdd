import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class AdherenceProvider extends ChangeNotifier {
  Map<String, dynamic>? _adherenceData;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get adherenceData => _adherenceData;
  bool get isLoading => _isLoading;
  String? get error => _error;

  double get score => (_adherenceData?['adherence_score'] as num?)?.toDouble() ?? 0.0;
  String get riskLevel => _adherenceData?['risk_level'] as String? ?? 'Unknown';
  String get riskColor => _adherenceData?['risk_color'] as String? ?? 'grey';
  List<dynamic> get insights => _adherenceData?['insights'] as List<dynamic>? ?? [];
  List<dynamic> get weeklyData => _adherenceData?['weekly_data'] as List<dynamic>? ?? [];
  List<dynamic> get medicineScores => _adherenceData?['medicine_scores'] as List<dynamic>? ?? [];
  int get dosesTaken => (_adherenceData?['doses_taken'] as num?)?.toInt() ?? 0;
  int get dosesSkipped => (_adherenceData?['doses_skipped'] as num?)?.toInt() ?? 0;

  Future<void> loadAdherence(String? uid) async {
    if (uid == null) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _adherenceData = await ApiService.getAdherence(0); // Legacy ID, ignored
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
