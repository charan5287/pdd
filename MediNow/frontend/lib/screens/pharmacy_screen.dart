import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../theme/app_colors.dart';
import 'checkout_screen.dart';
import 'order_tracking_screen.dart';

class PharmacyScreen extends StatefulWidget {
  final String? searchQuery;
  const PharmacyScreen({super.key, this.searchQuery});

  @override
  State<PharmacyScreen> createState() => _PharmacyScreenState();
}

class _PharmacyScreenState extends State<PharmacyScreen> {
  List<dynamic> _pharmacies = [];
  bool _isLoading = true;
  String? _errorMessage;
  Position? _currentPosition;
  String _statusText = 'Getting your location...';

  @override
  void initState() {
    super.initState();
    _initLocationAndFetch();
  }

  Future<void> _initLocationAndFetch() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _statusText = 'Requesting location permission...';
    });

    // 1. Check & request permission
    PermissionStatus permStatus = await Permission.location.status;
    if (permStatus.isDenied || permStatus.isRestricted) {
      permStatus = await Permission.location.request();
    }

    if (permStatus.isPermanentlyDenied) {
      setState(() {
        _isLoading = false;
        _errorMessage =
            'Location permission denied permanently.\nPlease enable it in Settings to find nearby pharmacies.';
      });
      return;
    }

    if (!permStatus.isGranted) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Location permission is required to find nearby pharmacies.';
      });
      return;
    }

    // 2. Check if location services are enabled
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Location services are disabled. Please turn on GPS.';
      });
      return;
    }

    // 3. Get GPS position (Try high accuracy first with 4s timeout, then fallback to balanced indoor/WiFi accuracy)
    try {
      setState(() => _statusText = 'Getting GPS location...');
      try {
        _currentPosition = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 4),
          ),
        );
      } catch (_) {
        _currentPosition = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      // Try last known position as fallback
      _currentPosition = await Geolocator.getLastKnownPosition();
      if (_currentPosition == null) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Could not get your location. Please check GPS settings.';
        });
        return;
      }
    }

    // 4. Fetch pharmacies from server
    await _fetchPharmacies();
  }

  Future<void> _fetchPharmacies() async {
    if (_currentPosition == null) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _statusText = 'Finding pharmacies near you...';
    });

    try {
      final results = await ApiService.getNearbyPharmacies(
        lat: _currentPosition!.latitude,
        lng: _currentPosition!.longitude,
        radiusMeters: 8000,
      );

      setState(() {
        _pharmacies = results;
        _isLoading = false;
        _statusText =
            '${results.length} pharmacies found near you';
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage =
            'Failed to load pharmacies.\nCheck your internet connection and try again.\n\nError: ${e.toString().replaceFirst('Exception: ', '')}';
      });
    }
  }

  Future<void> _openInMaps(Map<String, dynamic> pharmacy) async {
    final lat = pharmacy['lat'];
    final lng = pharmacy['lng'];
    
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
      // Fallback to web URI if scheme fails
      if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    }
  }

  Future<void> _callPharmacy(String phone) async {
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text('Nearby Pharmacies'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.map_rounded),
            onPressed: () async {
              final queryStr = widget.searchQuery != null ? 'pharmacy+${widget.searchQuery}' : 'pharmacy';
              final webUri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$queryStr');
              if (await canLaunchUrl(webUri)) {
                await launchUrl(webUri, mode: LaunchMode.externalApplication);
              }
            },
            tooltip: 'View on Google Maps',
          ),
          if (!_isLoading)
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: _initLocationAndFetch,
              tooltip: 'Refresh',
            ),
        ],
      ),
      body: Column(
        children: [
          // Location status bar
          if (_currentPosition != null && !_isLoading)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
              ),
              child: Row(
                children: [
                  Icon(Icons.location_on, color: AppColors.primary, size: 16),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${_currentPosition!.latitude.toStringAsFixed(4)}, '
                      '${_currentPosition!.longitude.toStringAsFixed(4)} • $_statusText',
                      style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
          
          if (widget.searchQuery != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 6)
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.search_rounded, color: AppColors.primary, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Searching for: ${widget.searchQuery}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 16),
                        onPressed: () {
                          Navigator.pop(context);
                        },
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final webUri = Uri.parse('https://www.google.com/maps/search/?api=1&query=pharmacy+${widget.searchQuery}');
                        if (await canLaunchUrl(webUri)) {
                          await launchUrl(webUri, mode: LaunchMode.externalApplication);
                        }
                      },
                      icon: const Icon(Icons.map_rounded, size: 16),
                      label: Text('Search "${widget.searchQuery}" on Google Maps', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 20),
            Text(_statusText,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.location_off_rounded,
                  size: 72, color: Colors.grey.shade400),
              const SizedBox(height: 16),
              Text(_errorMessage!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade600, height: 1.5)),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _initLocationAndFetch,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
              if (_errorMessage!.contains('permanently'))
                TextButton(
                  onPressed: openAppSettings,
                  child: const Text('Open Settings'),
                ),
            ],
          ),
        ),
      );
    }

    if (_pharmacies.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_pharmacy_outlined,
                size: 72, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No pharmacies found within 8 km.',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
            const SizedBox(height: 8),
            Text('Try expanding the search radius.',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () async {
                setState(() => _isLoading = true);
                try {
                  final results = await ApiService.getNearbyPharmacies(
                    lat: _currentPosition!.latitude,
                    lng: _currentPosition!.longitude,
                    radiusMeters: 20000,
                  );
                  setState(() {
                    _pharmacies = results;
                    _isLoading = false;
                    _statusText = '${results.length} pharmacies found (20 km)';
                  });
                } catch (_) {
                  setState(() => _isLoading = false);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Search 20 km radius'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchPharmacies,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _pharmacies.length,
        itemBuilder: (context, index) {
          return _buildPharmacyCard(
              _pharmacies[index] as Map<String, dynamic>, index);
        },
      ),
    );
  }

  Widget _buildPharmacyCard(Map<String, dynamic> p, int index) {
    final isOpen = p['is_open'] == true;
    final hasPhone = (p['phone'] as String? ?? '').isNotEmpty;
    final rating = (p['rating'] as num?)?.toDouble() ?? 4.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 12,
              offset: const Offset(0, 4)),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => _openInMaps(p),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Pharmacy icon
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primary.withOpacity(0.15),
                      AppColors.primary.withOpacity(0.05),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(Icons.local_pharmacy_rounded,
                    color: AppColors.primary, size: 28),
              ),
              const SizedBox(width: 14),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            p['name'] ?? 'Pharmacy',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 15),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isOpen
                                ? Colors.green.shade50
                                : Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isOpen ? 'Open' : 'Closed',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isOpen
                                  ? Colors.green.shade700
                                  : Colors.red.shade700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.primary.withOpacity(0.1)),
                          ),
                          child: Text(
                            p['stock_status'] ?? 'Available',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      p['address'] ?? 'Address not listed',
                      style: TextStyle(
                          color: Colors.grey.shade600, fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.star_rounded,
                            color: Colors.amber.shade600, size: 15),
                        const SizedBox(width: 3),
                        Text(rating.toStringAsFixed(1),
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 12)),
                        const SizedBox(width: 14),
                        Icon(Icons.near_me_rounded,
                            color: AppColors.primary, size: 14),
                        const SizedBox(width: 3),
                        Text(
                          p['distance_text'] ?? '',
                          style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 12,
                              fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Actions
              Column(
                children: [
                  IconButton(
                    icon: const Icon(Icons.directions_rounded, size: 22),
                    color: AppColors.primary,
                    onPressed: () => _openInMaps(p),
                    tooltip: 'Directions',
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.primary.withOpacity(0.08),
                      padding: const EdgeInsets.all(8),
                    ),
                  ),
                  if (hasPhone) ...[
                    const SizedBox(height: 6),
                    IconButton(
                      icon: const Icon(Icons.phone_rounded, size: 20),
                      color: Colors.green,
                      onPressed: () => _callPharmacy(p['phone']),
                      tooltip: 'Call',
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.green.withOpacity(0.08),
                        padding: const EdgeInsets.all(8),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
