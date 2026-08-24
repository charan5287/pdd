import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:google_fonts/google_fonts.dart';
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

class _PharmacyScreenState extends State<PharmacyScreen>
    with TickerProviderStateMixin {
  List<dynamic> _pharmacies = [];
  bool _isLoading = true;
  String? _errorMessage;
  Position? _currentPosition;
  String _statusText = 'Getting your location...';

  // 🛒 Global Cart: { 'medicineId_pharmacyName': { medicine data + qty + pharmacy } }
  final Map<String, Map<String, dynamic>> _cart = {};

  @override
  void initState() {
    super.initState();
    _initLocationAndFetch();
  }

  double get _cartTotal => _cart.values
      .fold(0.0, (sum, item) => sum + (item['price'] as double) * (item['qty'] as int));

  int get _cartItemCount =>
      _cart.values.fold(0, (sum, item) => sum + (item['qty'] as int));

  Future<void> _initLocationAndFetch() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _statusText = 'Requesting location permission...';
    });

    PermissionStatus permStatus = await Permission.location.status;
    if (permStatus.isDenied || permStatus.isRestricted) {
      permStatus = await Permission.location.request();
    }

    if (permStatus.isPermanentlyDenied) {
      setState(() {
        _isLoading = false;
        _errorMessage =
            'Location permission denied permanently.\nPlease enable it in Settings.';
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

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Location services are disabled. Please turn on GPS.';
      });
      return;
    }

    try {
      setState(() => _statusText = 'Getting GPS location...');
      try {
        _currentPosition = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 5),
          ),
        );
      } catch (_) {
        _currentPosition = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 5),
          ),
        );
      }
    } catch (e) {
      _currentPosition = await Geolocator.getLastKnownPosition();
      if (_currentPosition == null) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Could not get your location. Please check GPS settings.';
        });
        return;
      }
    }

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
        _statusText = '${results.length} pharmacies found near you';
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage =
            'Failed to load pharmacies.\nCheck your internet connection.\n\nError: ${e.toString().replaceFirst('Exception: ', '')}';
      });
    }
  }

  Future<void> _openInMaps(Map<String, dynamic> pharmacy) async {
    final lat = pharmacy['lat'];
    final lng = pharmacy['lng'];
    final webUri = Uri.parse(
        'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving');
    if (await canLaunchUrl(webUri)) {
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _callPharmacy(String phone) async {
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 🛒 OPEN MEDICINE BOTTOM SHEET for a pharmacy
  // ──────────────────────────────────────────────────────────────────────────
  void _openMedicineSheet(Map<String, dynamic> pharmacy) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _MedicineSheetWidget(
        pharmacy: pharmacy,
        cart: _cart,
        onCartChanged: (updatedCart) {
          setState(() {
            _cart.clear();
            _cart.addAll(updatedCart);
          });
        },
      ),
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 🛍️ VIEW CART BOTTOM SHEET
  // ──────────────────────────────────────────────────────────────────────────
  void _openCartSheet() {
    if (_cart.isEmpty) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _CartSummarySheet(
        cart: _cart,
        onClearCart: () {
          setState(() => _cart.clear());
          Navigator.pop(ctx);
        },
        onCheckout: (pharmacy, items, total) {
          Navigator.pop(ctx);
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => CheckoutScreen(
                pharmacy: pharmacy,
                items: items,
                total: total,
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: Text('Nearby Pharmacies',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.map_rounded),
            onPressed: () async {
              final q = widget.searchQuery != null
                  ? 'pharmacy+${widget.searchQuery}'
                  : 'pharmacy';
              final uri = Uri.parse(
                  'https://www.google.com/maps/search/?api=1&query=$q');
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            tooltip: 'Google Maps',
          ),
          if (!_isLoading)
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: _initLocationAndFetch,
              tooltip: 'Refresh',
            ),
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // GPS Status bar
              if (_currentPosition != null && !_isLoading)
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  color: AppColors.primary.withValues(alpha: 0.08),
                  child: Row(
                    children: [
                      Icon(Icons.location_on,
                          color: AppColors.primary, size: 15),
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
              Expanded(child: _buildBody()),
            ],
          ),

          // 🛒 FLOATING CART BAR
          if (_cart.isNotEmpty)
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: GestureDetector(
                onTap: _openCartSheet,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 20, vertical: 14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1565C0), Color(0xFF42A5F5)],
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.4),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$_cartItemCount',
                          style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 15),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'View Cart',
                        style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16),
                      ),
                      const Spacer(),
                      Text(
                        '₹${_cartTotal.toStringAsFixed(2)}',
                        style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_ios,
                          color: Colors.white, size: 14),
                    ],
                  ),
                ),
              ),
            ),
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
                  style:
                      TextStyle(color: Colors.grey.shade600, height: 1.5)),
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
                style:
                    TextStyle(color: Colors.grey.shade600, fontSize: 16)),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () async {
                setState(() => _isLoading = true);
                final results = await ApiService.getNearbyPharmacies(
                  lat: _currentPosition!.latitude,
                  lng: _currentPosition!.longitude,
                  radiusMeters: 20000,
                );
                setState(() {
                  _pharmacies = results;
                  _isLoading = false;
                  _statusText = '${results.length} pharmacies (20 km)';
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Expand to 20 km'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchPharmacies,
      child: ListView.builder(
        padding: EdgeInsets.fromLTRB(
            16, 16, 16, _cart.isNotEmpty ? 90 : 16),
        itemCount: _pharmacies.length,
        itemBuilder: (context, index) =>
            _buildPharmacyCard(_pharmacies[index] as Map<String, dynamic>),
      ),
    );
  }

  Widget _buildPharmacyCard(Map<String, dynamic> p) {
    final isOpen = p['is_open'] == true;
    final hasPhone = (p['phone'] as String? ?? '').isNotEmpty;
    final rating = (p['rating'] as num?)?.toDouble() ?? 4.0;
    final pharmacyKey = p['name'] ?? 'pharmacy';
    final cartItemsFromThisPharmacy = _cart.values
        .where((c) => c['pharmacy_name'] == pharmacyKey)
        .length;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          // ── Main Pharmacy Info ──
          InkWell(
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(20)),
            onTap: () => _openMedicineSheet(p),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Icon
                  Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.primary.withValues(alpha: 0.15),
                          AppColors.primary.withValues(alpha: 0.05),
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
                                style: GoogleFonts.outfit(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15),
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
                                        : Colors.red.shade700),
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
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12)),
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
                            if (cartItemsFromThisPharmacy > 0) ...[
                              const SizedBox(width: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                      color: Colors.green.shade300),
                                ),
                                child: Text(
                                  '$cartItemsFromThisPharmacy in cart',
                                  style: TextStyle(
                                      fontSize: 10,
                                      color: Colors.green.shade700,
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // ── Action Buttons Row ──
          Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius:
                  const BorderRadius.vertical(bottom: Radius.circular(20)),
            ),
            child: Row(
              children: [
                // 🛒 Order Medicines
                Expanded(
                  flex: 2,
                  child: TextButton.icon(
                    onPressed: () => _openMedicineSheet(p),
                    icon: const Icon(Icons.shopping_bag_rounded,
                        size: 16, color: AppColors.primary),
                    label: Text('Order Medicines',
                        style: GoogleFonts.inter(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 12)),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                Container(width: 1, height: 30, color: Colors.grey.shade200),
                // 📍 Directions
                Expanded(
                  child: TextButton.icon(
                    onPressed: () => _openInMaps(p),
                    icon: Icon(Icons.directions_rounded,
                        size: 16, color: Colors.grey.shade600),
                    label: Text('Directions',
                        style: GoogleFonts.inter(
                            color: Colors.grey.shade600, fontSize: 11)),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                if (hasPhone) ...[
                  Container(
                      width: 1, height: 30, color: Colors.grey.shade200),
                  Expanded(
                    child: TextButton.icon(
                      onPressed: () => _callPharmacy(p['phone']),
                      icon: Icon(Icons.phone_rounded,
                          size: 16, color: Colors.green.shade600),
                      label: Text('Call',
                          style: GoogleFonts.inter(
                              color: Colors.green.shade600, fontSize: 11)),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// 💊 MEDICINE BROWSE BOTTOM SHEET (Real-time stock from API)
// ============================================================================
class _MedicineSheetWidget extends StatefulWidget {
  final Map<String, dynamic> pharmacy;
  final Map<String, Map<String, dynamic>> cart;
  final ValueChanged<Map<String, Map<String, dynamic>>> onCartChanged;

  const _MedicineSheetWidget({
    required this.pharmacy,
    required this.cart,
    required this.onCartChanged,
  });

  @override
  State<_MedicineSheetWidget> createState() => _MedicineSheetWidgetState();
}

class _MedicineSheetWidgetState extends State<_MedicineSheetWidget> {
  List<dynamic> _medicines = [];
  bool _isLoading = true;
  String _searchQuery = '';
  final TextEditingController _searchCtrl = TextEditingController();

  // Local cart for this sheet session
  late Map<String, Map<String, dynamic>> _localCart;

  @override
  void initState() {
    super.initState();
    _localCart = Map.from(widget.cart);
    _fetchMedicines();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchMedicines() async {
    setState(() => _isLoading = true);
    try {
      final meds = await ApiService.getMedicines(query: _searchQuery);
      if (mounted) setState(() { _medicines = meds; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _cartKey(dynamic med) =>
      '${med['id']}_${widget.pharmacy['name']}';

  int _qty(dynamic med) => (_localCart[_cartKey(med)]?['qty'] as int?) ?? 0;

  void _addToCart(dynamic med) {
    final key = _cartKey(med);
    setState(() {
      if (_localCart.containsKey(key)) {
        _localCart[key]!['qty'] = (_localCart[key]!['qty'] as int) + 1;
      } else {
        _localCart[key] = {
          'id': med['id'],
          'name': med['name'],
          'price': (med['price'] as num).toDouble(),
          'dosage': med['dosage'] ?? '',
          'category': med['category'] ?? '',
          'qty': 1,
          'pharmacy_name': widget.pharmacy['name'] ?? 'Pharmacy',
          'pharmacy': widget.pharmacy,
        };
      }
    });
    widget.onCartChanged(_localCart);
  }

  void _removeFromCart(dynamic med) {
    final key = _cartKey(med);
    if (!_localCart.containsKey(key)) return;
    setState(() {
      final qty = (_localCart[key]!['qty'] as int) - 1;
      if (qty <= 0) {
        _localCart.remove(key);
      } else {
        _localCart[key]!['qty'] = qty;
      }
    });
    widget.onCartChanged(_localCart);
  }

  double get _localTotal => _localCart.values
      .fold(0.0, (sum, i) => sum + (i['price'] as double) * (i['qty'] as int));

  int get _localCount =>
      _localCart.values.fold(0, (sum, i) => sum + (i['qty'] as int));

  List<dynamic> get _filteredMeds {
    if (_searchQuery.isEmpty) return _medicines;
    final q = _searchQuery.toLowerCase();
    return _medicines.where((m) =>
        m['name'].toString().toLowerCase().contains(q) ||
        (m['category']?.toString().toLowerCase().contains(q) ?? false) ||
        (m['generic']?.toString().toLowerCase().contains(q) ?? false)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final pharmacyName = widget.pharmacy['name'] ?? 'Pharmacy';
    final isOpen = widget.pharmacy['is_open'] == true;

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      minChildSize: 0.5,
      maxChildSize: 0.97,
      builder: (ctx, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFFF8FAFF),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
            // ── Handle ──
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2)),
            ),

            // ── Header ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.local_pharmacy_rounded,
                        color: AppColors.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(pharmacyName,
                            style: GoogleFonts.outfit(
                                fontWeight: FontWeight.bold, fontSize: 16)),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isOpen
                                    ? Colors.green.shade50
                                    : Colors.red.shade50,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                isOpen ? '● Open Now' : '● Closed',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: isOpen
                                        ? Colors.green.shade700
                                        : Colors.red.shade700,
                                    fontWeight: FontWeight.w600),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${widget.pharmacy['distance_text'] ?? ''} away',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade600),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),

            // ── Search Bar ──
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: TextField(
                controller: _searchCtrl,
                onChanged: (v) {
                  setState(() => _searchQuery = v);
                },
                decoration: InputDecoration(
                  hintText: 'Search medicines, generics, categories...',
                  hintStyle:
                      TextStyle(color: Colors.grey.shade400, fontSize: 13),
                  prefixIcon:
                      Icon(Icons.search, color: Colors.grey.shade400),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () {
                            _searchCtrl.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: Colors.grey.shade200),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: Colors.grey.shade200),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide:
                        const BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                ),
              ),
            ),

            // ── Medicine List ──
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredMeds.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.medication_outlined,
                                  size: 56, color: Colors.grey.shade400),
                              const SizedBox(height: 12),
                              Text('No medicines found',
                                  style: TextStyle(
                                      color: Colors.grey.shade500,
                                      fontSize: 15)),
                            ],
                          ),
                        )
                      : ListView.builder(
                          controller: scrollCtrl,
                          padding: EdgeInsets.fromLTRB(
                              16, 0, 16, _localCount > 0 ? 100 : 16),
                          itemCount: _filteredMeds.length,
                          itemBuilder: (ctx, i) =>
                              _buildMedicineCard(_filteredMeds[i]),
                        ),
            ),

            // ── Cart Summary Footer ──
            if (_localCount > 0)
              Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 16,
                        offset: const Offset(0, -4))
                  ],
                ),
                child: Row(
                  children: [
                    // Item count badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        children: [
                          Text('$_localCount items',
                              style: TextStyle(
                                  fontSize: 11, color: AppColors.primary)),
                          Text(
                            '₹${_localTotal.toStringAsFixed(0)}',
                            style: GoogleFonts.outfit(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Checkout button
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          final items = _localCart.values.toList();
                          final primaryPharmacy =
                              _localCart.values.first['pharmacy']
                                  as Map<String, dynamic>;
                          Navigator.pop(ctx);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => CheckoutScreen(
                                pharmacy: primaryPharmacy,
                                items: items,
                                total: _localTotal,
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.shopping_cart_checkout_rounded,
                            size: 18),
                        label: Text('Proceed to Checkout',
                            style: GoogleFonts.outfit(
                                fontWeight: FontWeight.bold, fontSize: 14)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding:
                              const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMedicineCard(dynamic med) {
    final qty = _qty(med);
    final stockLevel = med['stock'] ?? 'High';
    final stockColor = stockLevel == 'Low'
        ? Colors.red
        : stockLevel == 'Medium'
            ? Colors.orange
            : Colors.green;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: qty > 0
            ? Border.all(color: AppColors.primary, width: 1.5)
            : Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          // Medicine Icon
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.07),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.medication_rounded,
                color: AppColors.primary, size: 26),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  med['name'] ?? 'Medicine',
                  style: GoogleFonts.outfit(
                      fontWeight: FontWeight.bold, fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if ((med['generic'] ?? '').isNotEmpty)
                  Text(
                    med['generic'],
                    style:
                        TextStyle(color: Colors.grey.shade500, fontSize: 11),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        med['category'] ?? '',
                        style: TextStyle(
                            fontSize: 10, color: Colors.grey.shade600),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: stockColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '$stockLevel Stock',
                        style: TextStyle(
                            fontSize: 10,
                            color: stockColor,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          // Price + Add/Remove
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹${(med['price'] as num).toStringAsFixed(0)}',
                style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: AppColors.primary),
              ),
              const SizedBox(height: 6),
              qty == 0
                  ? GestureDetector(
                      onTap: () => _addToCart(med),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF1565C0), Color(0xFF42A5F5)],
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text('ADD',
                            style: GoogleFonts.outfit(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12)),
                      ),
                    )
                  : Row(
                      children: [
                        _QtyButton(
                          icon: Icons.remove,
                          onTap: () => _removeFromCart(med),
                        ),
                        Padding(
                          padding:
                              const EdgeInsets.symmetric(horizontal: 10),
                          child: Text(
                            '$qty',
                            style: GoogleFonts.outfit(
                                fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ),
                        _QtyButton(
                          icon: Icons.add,
                          onTap: () => _addToCart(med),
                        ),
                      ],
                    ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Qty Button Widget ────────────────────────────────────────────────────────
class _QtyButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _QtyButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(7),
        ),
        child: Icon(icon, color: Colors.white, size: 16),
      ),
    );
  }
}

// ============================================================================
// 🛍️ CART SUMMARY BOTTOM SHEET
// ============================================================================
class _CartSummarySheet extends StatelessWidget {
  final Map<String, Map<String, dynamic>> cart;
  final VoidCallback onClearCart;
  final Function(Map<String, dynamic>, List<Map<String, dynamic>>, double)
      onCheckout;

  const _CartSummarySheet({
    required this.cart,
    required this.onClearCart,
    required this.onCheckout,
  });

  double get _total => cart.values
      .fold(0.0, (s, i) => s + (i['price'] as double) * (i['qty'] as int));

  @override
  Widget build(BuildContext context) {
    final items = cart.values.toList();
    final pharmacy = (items.isNotEmpty
        ? items.first['pharmacy'] as Map<String, dynamic>
        : <String, dynamic>{});
    final pharmacyName = pharmacy['name'] ?? 'Pharmacy';

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 16),
          // Header
          Row(
            children: [
              Icon(Icons.shopping_cart_rounded,
                  color: AppColors.primary, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text('Your Cart — $pharmacyName',
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              TextButton(
                onPressed: onClearCart,
                child: Text('Clear',
                    style: TextStyle(color: Colors.red.shade400)),
              ),
            ],
          ),
          const Divider(),
          // Items
          ConstrainedBox(
            constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.35),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: items.length,
              itemBuilder: (ctx, i) {
                final item = items[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(Icons.medication_rounded,
                            color: AppColors.primary, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item['name'],
                                style: GoogleFonts.outfit(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13)),
                            Text('₹${(item['price'] as double).toStringAsFixed(0)} × ${item['qty']}',
                                style: TextStyle(
                                    color: Colors.grey.shade500,
                                    fontSize: 12)),
                          ],
                        ),
                      ),
                      Text(
                        '₹${((item['price'] as double) * (item['qty'] as int)).toStringAsFixed(0)}',
                        style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const Divider(),
          // Total
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total Amount',
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold, fontSize: 16)),
                Text('₹${_total.toStringAsFixed(2)}',
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                        color: AppColors.primary)),
              ],
            ),
          ),
          const SizedBox(height: 8),
          // Checkout Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => onCheckout(
                  pharmacy, items.cast<Map<String, dynamic>>(), _total),
              icon: const Icon(Icons.shopping_cart_checkout_rounded),
              label: Text('Proceed to Checkout — ₹${_total.toStringAsFixed(0)}',
                  style: GoogleFonts.outfit(
                      fontWeight: FontWeight.bold, fontSize: 15)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
