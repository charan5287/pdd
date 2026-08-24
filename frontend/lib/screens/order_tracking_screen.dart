import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../theme/app_colors.dart';

class OrderTrackingScreen extends StatelessWidget {
  final Map<String, dynamic> order;

  const OrderTrackingScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final orderId = order['id']?.toString() ?? '';

    if (orderId.isEmpty) {
      return _buildTrackingUI(context, order);
    }

    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('orders').doc(orderId).snapshots(),
      builder: (context, snapshot) {
        Map<String, dynamic> mergedOrder = Map<String, dynamic>.from(order);

        if (snapshot.hasData && snapshot.data != null && snapshot.data!.exists) {
          final dbData = snapshot.data!.data() as Map<String, dynamic>;
          mergedOrder.addAll(dbData);
          // Standardize common fields
          if (dbData.containsKey('status')) mergedOrder['status'] = dbData['status'];
          if (dbData.containsKey('pharmacyName')) mergedOrder['pharmacy_name'] = dbData['pharmacyName'];
          if (dbData.containsKey('total')) mergedOrder['total'] = dbData['total'];
          if (dbData.containsKey('address')) mergedOrder['address'] = dbData['address'];
          if (dbData.containsKey('deliveryPartnerName')) mergedOrder['partner'] = dbData['deliveryPartnerName'];
          if (dbData.containsKey('deliveryPartnerPhone')) mergedOrder['partner_phone'] = dbData['deliveryPartnerPhone'];
        }

        return _buildTrackingUI(context, mergedOrder);
      },
    );
  }

  Widget _buildTrackingUI(BuildContext context, Map<String, dynamic> currentOrder) {
    final status = currentOrder['status'] ?? 'placed';
    final steps = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];
    final currentStepIndex = steps.indexOf(status);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Track Order', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const BackButton(color: Colors.black),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildOrderInfo(currentOrder),
            const SizedBox(height: 40),
            _buildTimeline(steps, currentStepIndex),
            const SizedBox(height: 40),
            _buildDeliveryPartner(currentOrder),
            const SizedBox(height: 40),
            _buildOrderDetails(currentOrder),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderInfo(Map<String, dynamic> currentOrder) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          const Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 30),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Order #${currentOrder['id']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text(currentOrder['pharmacy_name'] ?? 'Pharmacy', style: TextStyle(color: Colors.grey.shade600)),
            ],
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text('Total', style: TextStyle(fontSize: 12, color: Colors.grey)),
              Text('₹${currentOrder['total']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimeline(List<String> steps, int currentIndex) {
    return Column(
      children: List.generate(steps.length, (index) {
        final isCompleted = index <= currentIndex;
        final isLast = index == steps.length - 1;
        final title = _getStatusTitle(steps[index]);
        final subtitle = _getStatusSubtitle(steps[index], isCompleted);

        return IntrinsicHeight(
          child: Row(
            children: [
              Column(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: isCompleted ? AppColors.primary : Colors.grey.shade300,
                      shape: BoxShape.circle,
                    ),
                    child: isCompleted
                        ? const Icon(Icons.check, color: Colors.white, size: 14)
                        : null,
                  ),
                  if (!isLast)
                    Expanded(
                      child: Container(
                        width: 2,
                        color: index < currentIndex ? AppColors.primary : Colors.grey.shade300,
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: TextStyle(
                      fontSize: 16, 
                      fontWeight: FontWeight.bold,
                      color: isCompleted ? Colors.black : Colors.grey,
                    )),
                    Text(subtitle, style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                    if (!isLast) const SizedBox(height: 30),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  String _getStatusTitle(String status) {
    switch (status) {
      case 'placed': return 'Order Placed';
      case 'confirmed': return 'Pharmacy Confirmed';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  }

  String _getStatusSubtitle(String status, bool isCompleted) {
    if (!isCompleted) return 'Waiting...';
    switch (status) {
      case 'placed': return 'We have received your order';
      case 'confirmed': return 'Pharmacy is packing your medicines';
      case 'out_for_delivery': return 'Our delivery partner is on the way';
      case 'delivered': return 'Medicines delivered safely';
      default: return '';
    }
  }

  Widget _buildDeliveryPartner(Map<String, dynamic> currentOrder) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade200),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Colors.blue.shade50,
            child: const Icon(Icons.person, color: Colors.blue),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(currentOrder['partner'] ?? 'Rahul', style: const TextStyle(fontWeight: FontWeight.bold)),
                const Text('MediNow Delivery Expert', style: TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
          IconButton(
            onPressed: () async {
              final phone = currentOrder['partner_phone']?.toString() ?? '';
              if (phone.isNotEmpty) {
                final uri = Uri.parse('tel:$phone');
                if (await canLaunchUrl(uri)) launchUrl(uri);
              }
            },
            icon: const Icon(Icons.phone, color: AppColors.primary),
            tooltip: 'Call delivery partner',
          ),
        ],
      ),
    );
  }

  Widget _buildOrderDetails(Map<String, dynamic> currentOrder) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Delivery Address', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text(currentOrder['address'] ?? 'No address provided', style: TextStyle(color: Colors.grey.shade600)),
      ],
    );
  }
}
