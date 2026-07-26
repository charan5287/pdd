import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/api_service.dart';
import '../services/cloud_service.dart';
import '../theme/app_colors.dart';
import '../providers/auth_provider.dart';

class PharmacyPortalScreen extends StatefulWidget {
  const PharmacyPortalScreen({super.key});

  @override
  State<PharmacyPortalScreen> createState() => _PharmacyPortalScreenState();
}

class _PharmacyPortalScreenState extends State<PharmacyPortalScreen> {
  // Using StreamBuilder in build() now for real-time updates
  Future<void> _updateStatus(String orderId, String newStatus) async {
    try {
      await CloudService.updateOrderStatus(orderId, newStatus);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order marked as $newStatus')),
        );
      }
    } catch (e) {
      debugPrint('Error updating status: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Pharmacy Portal', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.error),
            onPressed: () async {
              final auth = Provider.of<AuthProvider>(context, listen: false);
              await auth.logout();
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
            padding: const EdgeInsets.all(20),
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
          const Text('No incoming orders yet', style: TextStyle(color: Colors.grey, fontSize: 16)),
        ],
      ),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order) {
    final status = order['status'] ?? 'placed';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Order #${order['id']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              _buildStatusBadge(status),
            ],
          ),
          const Divider(height: 30),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
              const SizedBox(width: 8),
              Expanded(child: Text(order['address'] ?? 'Customer Address', style: TextStyle(color: Colors.grey.shade600, fontSize: 13))),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.medication_outlined, size: 16, color: Colors.grey),
              const SizedBox(width: 8),
              Expanded(child: Text(order['items'] ?? 'Medicines', style: const TextStyle(fontWeight: FontWeight.w500))),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              if (status == 'placed')
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _updateStatus(order['id'], 'confirmed'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                    child: const Text('Accept Order'),
                  ),
                ),
              if (status == 'confirmed')
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _updateStatus(order['id'], 'out_for_delivery'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.orange, foregroundColor: Colors.white),
                    child: const Text('Mark Out for Delivery'),
                  ),
                ),
              if (status == 'out_for_delivery')
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _updateStatus(order['id'], 'delivered'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                    child: const Text('Mark Delivered'),
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
