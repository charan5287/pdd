import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/cloud_service.dart';
import '../theme/app_colors.dart';
import 'payment_screen.dart';
import 'order_tracking_screen.dart';

class CheckoutScreen extends StatefulWidget {
  final Map<String, dynamic> pharmacy;
  final List<Map<String, dynamic>> items;
  final double total;

  const CheckoutScreen({
    super.key,
    required this.pharmacy,
    required this.items,
    required this.total,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isPlacing = false;

  @override
  void initState() {
    super.initState();
    // Load real user data from AuthProvider instead of hardcoded placeholders
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      final phone = user?['phone'] as String? ?? '';
      if (phone.isNotEmpty) {
        _phoneController.text = phone;
      }
      // Address intentionally left blank — user must enter their real address
    });
  }

  Future<void> _placeOrder() async {
    // Validate that the address is not empty
    if (_addressController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your delivery address.'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    // 1. Go to Payment Screen first
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PaymentScreen(
          amount: widget.total,
          onSuccess: () async {
            Navigator.pop(context); // Close Payment Screen
            _confirmOrder();
          },
        ),
      ),
    );
  }

  Future<void> _confirmOrder() async {
    setState(() => _isPlacing = true);
    try {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      final patientName = user?['fullName'] as String? ?? 'Patient';

      final orderId = await CloudService.placeOrder(
        pharmacy: widget.pharmacy,
        items: widget.items,
        total: widget.total,
        address: _addressController.text,
        phone: _phoneController.text,
        patientName: patientName,
      );

      if (mounted) {
        // Build the order map for real-time tracking
        final orderData = {
          'id': orderId,
          'status': 'placed',
          'total': widget.total,
          'pharmacy_name': widget.pharmacy['name'] ?? 'Pharmacy',
          'address': _addressController.text,
          'items': widget.items,
          'partner': 'MediNow Delivery Expert',
          'partner_phone': '+91 98765 43210',
        };
        // Navigate directly to Order Tracking
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => OrderTrackingScreen(order: orderData),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to place order: $e')),
        );
      }
    } finally {
      setState(() => _isPlacing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Checkout', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const BackButton(color: Colors.black),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader('Delivery Address'),
            const SizedBox(height: 12),
            _buildTextField(_addressController, Icons.location_on_outlined, 'Address',
                hint: 'e.g. 12, Main Street, City, State'),
            const SizedBox(height: 20),
            _buildSectionHeader('Contact Number'),
            const SizedBox(height: 12),
            _buildTextField(_phoneController, Icons.phone_android_outlined, 'Phone'),
            const SizedBox(height: 30),
            _buildSectionHeader('Order Summary'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                children: [
                  ...widget.items.map((item) {
                        final qty = (item['qty'] as int? ?? 1);
                        final price = (item['price'] as num).toDouble();
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${item['name']}',
                                  style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '×$qty',
                                style: const TextStyle(color: Colors.grey, fontSize: 13),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '₹${(price * qty).toStringAsFixed(0)}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ],
                          ),
                        );
                      }),
                  const Divider(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      Text('₹${widget.total}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton(
                onPressed: _isPlacing ? null : _placeOrder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                ),
                child: _isPlacing
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Place Order', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
    );
  }

  Widget _buildTextField(TextEditingController controller, IconData icon, String label, {String? hint}) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        prefixIcon: Icon(icon, color: AppColors.primary),
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
      ),
    );
  }
}
