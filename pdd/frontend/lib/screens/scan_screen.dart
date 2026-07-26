import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart' as dio;
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../providers/inventory_provider.dart';
import '../providers/navigation_provider.dart';
import '../theme/app_colors.dart';
import '../services/cloud_service.dart';

import 'pharmacy_screen.dart';
import 'dart:typed_data';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen>
    with SingleTickerProviderStateMixin {
  XFile? _pickedFile;
  Uint8List? _imageBytes;
  bool _isScanning = false;
  List<Map<String, dynamic>> _results = [];
  final _picker = ImagePicker();
  late AnimationController _pulseController;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.97, end: 1.03).animate(
        CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final picked = await _picker.pickImage(
        source: source, imageQuality: 85, maxWidth: 1920);
    if (picked != null) {
      final bytes = await picked.readAsBytes();
      setState(() {
        _pickedFile = picked;
        _imageBytes = bytes;
        _results = [];
      });
      _uploadAndScan();
    }
  }

  Future<void> _uploadAndScan() async {
    if (_imageBytes == null || _pickedFile == null) return;
    setState(() => _isScanning = true);
    try {
      final responseData = await ApiService.scanPrescription(
        bytes: _imageBytes!,
        filename: _pickedFile!.name,
      );

      final medicines = (responseData['medicines'] as List<dynamic>)
          .map((m) {
            // Parse frequency_per_day safely
            int freqPerDay = 1;
            final rawFreq = m['frequency_per_day'];
            if (rawFreq is int) freqPerDay = rawFreq;
            else if (rawFreq is double) freqPerDay = rawFreq.toInt();
            else if (rawFreq is String) freqPerDay = int.tryParse(rawFreq) ?? 1;
            freqPerDay = freqPerDay.clamp(1, 3);

            // Parse duration_days safely
            int durationDays = 30;
            final rawDuration = m['duration_days'];
            if (rawDuration is int) durationDays = rawDuration;
            else if (rawDuration is double) durationDays = rawDuration.toInt();
            else if (rawDuration is String) durationDays = int.tryParse(rawDuration) ?? 30;

            // Parse timings — auto-generate if missing or wrong count
            List<String> timings = [];
            if (m['timings'] is List) {
              timings = List<String>.from(m['timings']);
            }
            // Auto-generate timings if missing or count mismatch
            if (timings.isEmpty || timings.length != freqPerDay) {
              timings = _generateDefaultTimings(freqPerDay);
            }

            return {
              'name': m['name']?.toString() ?? '',
              'display': m['display_name']?.toString() ?? m['name']?.toString() ?? '',
              'dosage': m['dosage']?.toString() ?? '',
              'frequency': m['frequency']?.toString() ?? '${freqPerDay}x daily',
              'frequency_per_day': freqPerDay,
              'timings': timings,
              'duration_days': durationDays,
              'instructions': m['instructions']?.toString() ?? '',
              'purpose': m['purpose']?.toString() ?? '',
            };
          })
          .toList();

      setState(() {
        _results = medicines;
        _isScanning = false;
      });

      // Save scanned prescription to cloud history for the Prescription History screen (non-blocking)
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.isAuthenticated) {
        CloudService.savePrescriptionToHistory({
          'medicines': medicines,
          'created_at': DateTime.now().toIso8601String(),
        }).then((_) {
          debugPrint('✓ Prescription successfully saved to Cloud Firestore history!');
        }).catchError((historyError) {
          debugPrint('⚠️ Failed to save prescription to history: $historyError');
        });
      }
      
      if (medicines.isEmpty && responseData['status'] == 'partial') {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(responseData['message'] ?? 'No medicines detected. Try a clearer photo.'),
              backgroundColor: Colors.orange.shade400,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
      }
    } catch (e) {
      setState(() => _isScanning = false);
      String errorMsg = 'Failed to scan prescription. Check your connection.';
      
      if (e is dio.DioException) {
        final detail = e.response?.data?['detail']?.toString() ?? '';
        if (e.response?.statusCode == 503) {
          if (detail.toLowerCase().contains('quota')) {
            errorMsg = '⏳ AI quota limit reached. Please wait 1 minute and try again.';
          } else {
            errorMsg = 'AI Scanning is currently disabled. Please check backend config.';
          }
        } else if (e.response?.statusCode == 500) {
          errorMsg = 'AI Error: Poor image quality or processing failure. Please retry.';
        } else if (e.type == dio.DioExceptionType.connectionTimeout ||
                   e.type == dio.DioExceptionType.connectionError) {
          errorMsg = '⚠️ Cannot reach server. Make sure the backend is running and you\'re on the same WiFi.';
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMsg),
            backgroundColor: Colors.red.shade400,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 5),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  Future<void> _addAllToInventory() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final String? uid = auth.user?['uid'] as String?;
    if (uid == null) return;

    final inventory = Provider.of<InventoryProvider>(context, listen: false);
    final nav = Provider.of<NavigationProvider>(context, listen: false);
    
    setState(() => _isScanning = true);
    try {
      for (final med in _results) {
        final frequencyPerDay = med['frequency_per_day'] as int;
        final durationDays = med['duration_days'] as int;
        final totalQuantity = frequencyPerDay * durationDays;

        await inventory.addMedicineWithReminders(
          uid: uid,
          name: med['name']!,
          quantity: totalQuantity > 0 ? totalQuantity : 30, // Default to 30 if zero
          dailyDosage: frequencyPerDay,
          timings: List<String>.from(med['timings'] ?? []),
          dosage: med['dosage'],
          durationDays: durationDays,
        );
      }
      setState(() => _isScanning = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
                '✓ All medicines added to your inventory!'),
            backgroundColor: const Color(0xFF00C896),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
          ),
        );
        // Navigate to Inventory tab (Index 1)
        nav.setTab(1);
        // If pushed, pop. If not (tab version), just stay there (it will switch automatically due to nav provider)
        if (Navigator.canPop(context)) {
          Navigator.pop(context);
        }
      }
    } catch (_) {
      setState(() => _isScanning = false);
    }
  }

  /// Auto-generates default timings based on frequency per day
  static List<String> _generateDefaultTimings(int frequencyPerDay) {
    switch (frequencyPerDay) {
      case 1:
        return ['08:00'];
      case 2:
        return ['08:00', '20:00'];
      case 3:
        return ['08:00', '14:00', '20:00'];
      default:
        return ['08:00'];
    }
  }

  int _parseFrequency(String freq) {
    freq = freq.toLowerCase();
    if (freq.contains('3') || freq.contains('tid') || freq.contains('thrice')) {
      return 3;
    }
    if (freq.contains('2') || freq.contains('bid') || freq.contains('twice')) {
      return 2;
    }
    return 1;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8FF),
      appBar: AppBar(
        title: const Text('Scan Prescription',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1A1A2E),
        elevation: 0,
        surfaceTintColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.06),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: AppColors.primary.withOpacity(0.15), width: 1),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline_rounded,
                      color: AppColors.primary, size: 18),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'AI reads your prescription and automatically detects medicine names, dosage & frequency.',
                      style: TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                          height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Image area
            GestureDetector(
              onTap: () => _showPickerOptions(),
              child: AnimatedBuilder(
                animation: _pulseAnim,
                builder: (context, child) => Transform.scale(
                  scale: (_imageBytes == null && !_isScanning)
                      ? _pulseAnim.value
                      : 1.0,
                  child: Container(
                    height: 260,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: _imageBytes != null
                            ? AppColors.primary
                            : Colors.grey.shade200,
                        width: _imageBytes != null ? 2 : 1.5,
                        style: BorderStyle.solid,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: _imageBytes == null
                        ? _buildPickerPlaceholder()
                        : ClipRRect(
                            borderRadius: BorderRadius.circular(26),
                            child:
                                Image.memory(_imageBytes!, fit: BoxFit.cover),
                          ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Camera + Gallery buttons
            Row(
              children: [
                Expanded(
                  child: _sourceButton(
                    Icons.camera_alt_rounded,
                    'Camera',
                    AppColors.primary,
                    () => _pickImage(ImageSource.camera),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _sourceButton(
                    Icons.photo_library_rounded,
                    'Gallery',
                    const Color(0xFF6A1B9A),
                    () => _pickImage(ImageSource.gallery),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 28),

            // Scanning indicator
            if (_isScanning)
              Center(
                child: Column(
                  children: [
                    const SizedBox(
                      width: 48,
                      height: 48,
                      child: CircularProgressIndicator(
                          strokeWidth: 3, color: AppColors.primary),
                    ),
                    const SizedBox(height: 14),
                    const Text('AI is reading your prescription...',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text('Analyzing brand names, strengths & schedules',
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 13)),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '⏳ First scan may take up to 60s — please wait',
                        style: TextStyle(color: Colors.blue.shade700, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),

            const SizedBox(height: 10),

            // Results
            if (_results.isNotEmpty) ...[
              const Text('Detected Medicines',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1A1A2E))),
              const SizedBox(height: 4),
              Text(
                '${_results.length} medicine(s) found — tap a field to edit',
                style:
                    TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
              const SizedBox(height: 16),
              ..._results.asMap().entries.map(
                    (entry) => _buildEditableMedicineCard(entry.key),
                  ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isScanning ? null : _addAllToInventory,
                  icon: const Icon(Icons.add_circle_outline, size: 20),
                  label: const Text('Add All to My Medicines',
                      style: TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15)),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back, size: 18),
                  label: const Text('Back to Dashboard',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildPickerPlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.08),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.document_scanner_outlined,
              size: 48, color: AppColors.primary),
        ),
        const SizedBox(height: 16),
        const Text('Tap to add prescription',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Color(0xFF1A1A2E))),
        const SizedBox(height: 6),
        Text('Use Camera or Gallery below',
            style:
                TextStyle(color: Colors.grey.shade500, fontSize: 13)),
      ],
    );
  }

  Widget _sourceButton(
      IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.2), width: 1),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(label,
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 14)),
          ],
        ),
      ),
    );
  }

  void _showPickerOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text('Add Prescription Photo',
                style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: Color(0xFF1A1A2E))),
            const SizedBox(height: 20),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.camera_alt_rounded,
                    color: AppColors.primary),
              ),
              title: const Text('Camera',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              subtitle:
                  const Text('Take a photo of your prescription'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF6A1B9A).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.photo_library_rounded,
                    color: Color(0xFF6A1B9A)),
              ),
              title: const Text('Gallery',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              subtitle:
                  const Text('Choose from your photos'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildEditableMedicineCard(int index) {
    final med = _results[index];
    final nameController = TextEditingController(text: med['name']);
    final dosageController = TextEditingController(text: med['dosage']);
    final freqController = TextEditingController(text: med['frequency']);

    return StatefulBuilder(builder: (context, setCard) {
      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: AppColors.primary.withOpacity(0.2), width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.medication_rounded,
                      color: Colors.white, size: 16),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: nameController,
                    onChanged: (v) => _results[index]['name'] = v,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1A1A2E)),
                    decoration: const InputDecoration(
                      isDense: true,
                      border: InputBorder.none,
                      hintText: 'Medicine name',
                    ),
                  ),
                ),
                const Icon(Icons.edit, size: 14, color: Colors.grey),
              ],
            ),
            if (med['display'] != null && med['display'] != med['name'])
              Padding(
                padding: const EdgeInsets.only(left: 36, top: 2),
                child: Text(
                  'Detected as: ${med['display']}',
                  style: TextStyle(
                      color: Colors.grey.shade500,
                      fontSize: 11,
                      fontStyle: FontStyle.italic),
                ),
              ),
            const Divider(height: 16),
            Row(
              children: [
                Expanded(
                  child: _editableField('Dosage', dosageController,
                      (v) => _results[index]['dosage'] = v),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _editableField('Frequency', freqController,
                      (v) => _results[index]['frequency'] = v),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // NEW: Schedule Display
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade100),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.schedule_rounded, size: 14, color: Colors.green.shade700),
                      const SizedBox(width: 8),
                      Text(
                        'AI Schedule: ${med['frequency']}',
                        style: TextStyle(
                            fontSize: 12,
                            color: Colors.green.shade800,
                            fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    children: (med['timings'] as List<String>).map((time) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.green.shade200),
                      ),
                      child: Text(time, style: TextStyle(fontSize: 11, color: Colors.green.shade900, fontWeight: FontWeight.w600)),
                    )).toList(),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Duration: ${med['duration_days']} days (Total: ${(med['frequency_per_day'] as int) * (med['duration_days'] as int)} doses)',
                    style: TextStyle(fontSize: 11, color: Colors.green.shade700),
                  ),
                ],
              ),
            ),
            if (med['purpose'] != null && med['purpose'].toString().isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.health_and_safety_rounded, size: 16, color: Colors.amber.shade800),
                    const SizedBox(width: 8),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(fontSize: 11, color: Colors.amber.shade900),
                          children: [
                            const TextSpan(text: 'Used for: ', style: TextStyle(fontWeight: FontWeight.bold)),
                            TextSpan(text: med['purpose']),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (med['instructions'] != null && med['instructions'].isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 14, color: Colors.blue.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Note: ${med['instructions']}',
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.blue.shade800,
                            fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  // Navigate to Pharmacy Screen with medicine name
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => PharmacyScreen(searchQuery: med['name']),
                    ),
                  );
                },
                icon: const Icon(Icons.search, size: 16),
                label: const Text('Find in Nearby Pharmacies',
                    style: TextStyle(fontSize: 12)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  side: BorderSide(color: AppColors.primary.withOpacity(0.5)),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _editableField(String label, TextEditingController ctrl,
      void Function(String) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(
                fontSize: 10,
                color: Colors.grey.shade500,
                fontWeight: FontWeight.w500)),
        const SizedBox(height: 4),
        TextField(
          controller: ctrl,
          onChanged: onChanged,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            isDense: true,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade200),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade200),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide:
                  const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
