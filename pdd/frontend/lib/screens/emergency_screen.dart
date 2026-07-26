import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:permission_handler/permission_handler.dart';
import '../theme/app_colors.dart';
import '../services/api_service.dart';

class EmergencyScreen extends StatefulWidget {
  const EmergencyScreen({super.key});

  @override
  State<EmergencyScreen> createState() => _EmergencyScreenState();
}

class _EmergencyScreenState extends State<EmergencyScreen> {
  List<dynamic> _hospitals = [];
  bool _loadingHospitals = false;
  String? _hospitalError;

  @override
  void initState() {
    super.initState();
    _fetchHospitals();
  }

  Future<void> _fetchHospitals() async {
    setState(() {
      _loadingHospitals = true;
      _hospitalError = null;
    });
    try {
      // 1. Check & request location permission (required before calling getCurrentPosition)
      PermissionStatus permStatus = await Permission.location.status;
      if (permStatus.isDenied || permStatus.isRestricted) {
        permStatus = await Permission.location.request();
      }

      if (permStatus.isPermanentlyDenied) {
        setState(() {
          _loadingHospitals = false;
          _hospitalError = 'Location permission denied.\nEnable it in Settings to find nearby hospitals.';
        });
        return;
      }

      if (!permStatus.isGranted) {
        setState(() {
          _loadingHospitals = false;
          _hospitalError = 'Location permission required to find nearby hospitals.';
        });
        return;
      }

      // 2. Check if GPS is enabled
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _loadingHospitals = false;
          _hospitalError = 'GPS is disabled. Please turn on location services.';
        });
        return;
      }

      // 3. Get GPS position — try high accuracy, fallback to medium
      Position pos;
      try {
        pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 4),
          ),
        );
      } catch (_) {
        try {
          pos = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.medium,
              timeLimit: Duration(seconds: 4),
            ),
          );
        } catch (_) {
          // Last resort: use last known position
          final last = await Geolocator.getLastKnownPosition();
          if (last == null) {
            setState(() {
              _loadingHospitals = false;
              _hospitalError = 'Could not get your location. Please check GPS settings.';
            });
            return;
          }
          pos = last;
        }
      }

      // 4. Fetch hospitals from backend
      final results = await ApiService.getNearbyHospitals(
        lat: pos.latitude,
        lng: pos.longitude,
      );
      setState(() {
        _hospitals = results;
        _loadingHospitals = false;
      });
    } catch (e) {
      setState(() {
        _loadingHospitals = false;
        _hospitalError = 'Failed to load hospitals. Check your connection.';
      });
    }
  }

  Future<void> _openInMaps(Map<String, dynamic> hospital) async {
    final lat = hospital['lat'];
    final lng = hospital['lng'];
    
    // For Android: Use google.navigation scheme for direct real-time navigation
    final androidUri = Uri.parse('google.navigation:q=$lat,$lng&mode=d');
    // For iOS/Web: Use standard maps.google.com directions
    final webUri = Uri.parse(
        'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving');

    try {
      if (await canLaunchUrl(androidUri)) {
        await launchUrl(androidUri);
      } else if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    }
  }

  Future<void> _makeCall(String number) async {
    if (number.isEmpty) return;
    final uri = Uri.parse('tel:$number');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8FF),
      appBar: AppBar(
        title: Text('Emergency SOS', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.emergency,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildSOSButton(),
            _buildQuickContacts(),
            _buildNearbyHospitals(),
          ],
        ),
      ),
    );
  }

  Widget _buildSOSButton() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40),
      decoration: BoxDecoration(
        color: AppColors.emergency.withOpacity(0.1),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(40),
          bottomRight: Radius.circular(40),
        ),
      ),
      child: Column(
        children: [
          GestureDetector(
            onLongPress: () => _makeCall('108'),
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.emergency,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.emergency.withOpacity(0.4),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.warning_rounded, color: Colors.white, size: 50),
                    SizedBox(height: 10),
                    Text(
                      'SOS',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Long press to call Ambulance (108)',
            style: TextStyle(
              color: AppColors.emergency,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickContacts() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Quick Contacts', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Row(
            children: [
              _contactCard('Police', '100', Icons.local_police_rounded, Colors.blue),
              const SizedBox(width: 12),
              _contactCard('Fire', '101', Icons.fire_truck_rounded, Colors.orange),
              const SizedBox(width: 12),
              _contactCard('Medical', '108', Icons.medical_services_rounded, Colors.red),
            ],
          ),
        ],
      ),
    );
  }

  Widget _contactCard(String title, String number, IconData icon, Color color) {
    return Expanded(
      child: GestureDetector(
        onTap: () => _makeCall(number),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 8),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              Text(number, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNearbyHospitals() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Nearby Hospitals', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.map_rounded, color: AppColors.emergency, size: 20),
                    onPressed: () async {
                      final webUri = Uri.parse('https://www.google.com/maps/search/?api=1&query=hospitals+near+me');
                      if (await canLaunchUrl(webUri)) {
                        await launchUrl(webUri, mode: LaunchMode.externalApplication);
                      }
                    },
                    tooltip: 'Search Hospitals on Google Maps',
                  ),
                  if (!_loadingHospitals)
                    IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: _fetchHospitals),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_loadingHospitals)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
          else if (_hospitalError != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade100),
              ),
              child: Column(
                children: [
                  Icon(Icons.location_off_rounded, color: Colors.red.shade400, size: 36),
                  const SizedBox(height: 8),
                  Text(_hospitalError!, textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.red.shade700, fontSize: 13, height: 1.5)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      OutlinedButton.icon(
                        onPressed: _fetchHospitals,
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Retry'),
                        style: OutlinedButton.styleFrom(foregroundColor: AppColors.emergency),
                      ),
                      if (_hospitalError!.contains('Settings') || _hospitalError!.contains('denied')) ...[
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          onPressed: openAppSettings,
                          icon: const Icon(Icons.settings, size: 16),
                          label: const Text('Open Settings'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.emergency,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            )
          else if (_hospitals.isEmpty)
            const Center(child: Text('No hospitals found nearby.'))
          else
            ..._hospitals.map((h) => _hospitalTile(h)),
        ],
      ),
    );
  }

  Widget _hospitalTile(Map<String, dynamic> h) {
    final hasPhone = (h['phone'] as String? ?? '').isNotEmpty;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: ListTile(
        onTap: () => _openInMaps(h),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.red.shade50,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.local_hospital_rounded, color: Colors.red),
        ),
        title: Text(h['name'] ?? 'Hospital', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text('${h['distance_text'] ?? ''} • ${h['address'] ?? ''}', style: const TextStyle(fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.directions_rounded, color: AppColors.emergency, size: 22),
              onPressed: () => _openInMaps(h),
              tooltip: 'Directions',
              style: IconButton.styleFrom(
                backgroundColor: AppColors.emergency.withOpacity(0.08),
                padding: const EdgeInsets.all(8),
              ),
            ),
            if (hasPhone) ...[
              const SizedBox(width: 6),
              IconButton(
                icon: const Icon(Icons.phone, color: Colors.green, size: 20),
                onPressed: () => _makeCall(h['phone']),
                tooltip: 'Call',
                style: IconButton.styleFrom(
                  backgroundColor: Colors.green.withOpacity(0.08),
                  padding: const EdgeInsets.all(8),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
