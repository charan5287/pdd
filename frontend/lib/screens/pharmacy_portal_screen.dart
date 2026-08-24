import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/cloud_service.dart';
import '../theme/app_colors.dart';
import '../providers/auth_provider.dart';
import 'onboarding_screen.dart';

class PharmacyPortalScreen extends StatefulWidget {
  const PharmacyPortalScreen({super.key});

  @override
  State<PharmacyPortalScreen> createState() => _PharmacyPortalScreenState();
}

class _PharmacyPortalScreenState extends State<PharmacyPortalScreen> {
  Future<void> _updateStatus(String orderId, String newStatus) async {
    try {
      await CloudService.updateOrderStatus(orderId, newStatus);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Order marked as $newStatus'),
            backgroundColor: AppColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      debugPrint('Error updating status: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Pharmacy Dashboard',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 20),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.error),
            onPressed: () async {
              final auth = Provider.of<AuthProvider>(context, listen: false);
              await auth.logout();
              if (context.mounted) {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                  (route) => false,
                );
              }
            },
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: CloudService.getPharmacyOrdersStream(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return _buildEmpty();
          }

          final orders = snapshot.data!.docs;
          return ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            itemCount: orders.length,
            itemBuilder: (context, index) {
              final order = orders[index].data() as Map<String, dynamic>;
              order['id'] = orders[index].id;
              return _buildOrderCard(order);
            },
          );
        },
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inventory_2_outlined, size: 80, color: Colors.grey.shade300),
          const SizedBox(height: 20),
          const Text(
            'No incoming orders yet',
            style: TextStyle(color: Colors.grey, fontSize: 16, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildItemsList(dynamic itemsData) {
    if (itemsData == null) {
      return const Text('No medicines specified', style: TextStyle(color: Colors.grey));
    }
    
    List<dynamic> items = [];
    if (itemsData is List) {
      items = itemsData;
    } else {
      return Text(itemsData.toString(), style: const TextStyle(fontWeight: FontWeight.w500));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: items.map<Widget>((item) {
        if (item is Map) {
          final name = item['name'] ?? 'Medicine';
          final qty = item['qty'] ?? 1;
          final price = item['price'] ?? 0.0;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    name.toString(),
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  'x$qty',
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                ),
                const SizedBox(width: 16),
                Text(
                  '₹${(price * qty).toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ],
            ),
          );
        }
        return Text(item.toString());
      }).toList(),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order) {
    final status = order['status'] ?? 'placed';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 15, offset: const Offset(0, 8)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Order ID and Status Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Order #${order['id'].toString().substring(0, order['id'].toString().length > 6 ? 6 : order['id'].toString().length)}...',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 0.5),
              ),
              _buildStatusBadge(status),
            ],
          ),
          const Divider(height: 24),
          
          // Patient Contact details
          Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.primary.withOpacity(0.1),
                radius: 18,
                child: const Icon(Icons.person, color: AppColors.primary, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order['patientName'] ?? 'Customer',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      order['phone'] ?? 'No phone provided',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (order['phone'] != null && order['phone'].toString().isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.phone_enabled_rounded, color: Colors.green, size: 20),
                  onPressed: () async {
                    final phone = order['phone'].toString();
                    final uri = Uri.parse('tel:$phone');
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri);
                    }
                  },
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.green.withOpacity(0.1),
                    padding: const EdgeInsets.all(8),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Delivery Address
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_on_outlined, size: 18, color: Colors.grey),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  order['address'] ?? 'Customer Address',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13, height: 1.3),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Ordered Medicines Catalog
          const Text(
            'Medicines Ordered',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade100),
            ),
            child: _buildItemsList(order['items']),
          ),
          const SizedBox(height: 16),
          
          // Total Order Amount
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total Amount', style: TextStyle(color: Colors.grey, fontSize: 13)),
              Text(
                '₹${order['total'] ?? 0}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Action controls
          Row(
            children: [
              if (status == 'placed')
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _updateStatus(order['id'], 'confirmed'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: const Text('Accept Order', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  ),
                ),
              if (status == 'confirmed')
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _updateStatus(order['id'], 'out_for_delivery'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: const Text('Mark Out for Delivery', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  ),
                ),
              if (status == 'out_for_delivery')
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _updateStatus(order['id'], 'delivered'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: const Text('Mark Delivered', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color = Colors.grey;
    if (status == 'confirmed') color = AppColors.primary;
    if (status == 'out_for_delivery') color = Colors.orange;
    if (status == 'delivered') color = Colors.green;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
