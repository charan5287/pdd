import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../providers/adherence_provider.dart';
import '../providers/inventory_provider.dart';
import '../theme/app_colors.dart';

import 'package:intl/intl.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  List<dynamic> _inventory = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final String? uid = auth.user?['uid'] as String?;
      if (uid != null) {
        Provider.of<InventoryProvider>(context, listen: false)
            .loadInventory(uid);
      }
    });
  }

  // Methods moved to provider or simplified

  Future<void> _takeDose(String medicineName) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final String? uid = auth.user?['uid'] as String?;
    if (uid == null) return;
    await Provider.of<InventoryProvider>(context, listen: false)
        .takeDose(uid, medicineName);
  }

  Future<void> _skipDose(String medicineName) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final String? uid = auth.user?['uid'] as String?;
    if (uid == null) return;

    await Provider.of<InventoryProvider>(context, listen: false)
        .skipDose(uid, medicineName);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Dose skipped for $medicineName'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final inv = Provider.of<InventoryProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F8FF),
      appBar: AppBar(
        title: const Text('My Medicines',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1A1A2E),
        elevation: 0,
        surfaceTintColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () async {
              final String? uid = auth.user?['uid'] as String?;
              if (uid != null) {
                await inv.loadInventory(uid);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Inventory updated'),
                      duration: Duration(seconds: 1),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              }
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: inv.isLoading
          ? const Center(child: CircularProgressIndicator())
          : inv.inventory.isEmpty
              ? _buildEmptyState(context, auth.user?['uid'] as String?)
              : RefreshIndicator(
                  onRefresh: () async {
                    final String? uid = auth.user?['uid'] as String?;
                    if (uid != null) {
                      await inv.loadInventory(uid);
                    }
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: inv.inventory.length,
                    itemBuilder: (context, index) =>
                        _buildMedicineCard(inv.inventory[index]),
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddMedicineDialog(context, auth.user?['uid'] as String?),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('Add Medicine', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  void _showAddMedicineDialog(BuildContext context, String? uid) {
    final nameCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '30');
    final dosageCtrl = TextEditingController(text: '1');
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.add_circle_outline, color: AppColors.primary),
            SizedBox(width: 10),
            Text('Add Medicine', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Medicine Name',
                    hintText: 'e.g. Paracetamol 650mg',
                    prefixIcon: Icon(Icons.medication),
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter medicine name' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: qtyCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Quantity (Total Pills)',
                    hintText: '30',
                    prefixIcon: Icon(Icons.numbers),
                  ),
                  validator: (v) => (v == null || int.tryParse(v) == null) ? 'Enter valid quantity' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: dosageCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Daily Dosage (Pills/day)',
                    hintText: '1',
                    prefixIcon: Icon(Icons.schedule),
                  ),
                  validator: (v) => (v == null || int.tryParse(v) == null) ? 'Enter valid daily dosage' : null,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              Navigator.pop(ctx);
              final inv = Provider.of<InventoryProvider>(context, listen: false);
              final success = await inv.addMedicine(
                uid: uid,
                name: nameCtrl.text.trim(),
                quantity: int.parse(qtyCtrl.text.trim()),
                dailyDosage: int.parse(dosageCtrl.text.trim()),
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success ? '✓ ${nameCtrl.text.trim()} added to inventory' : 'Failed to add medicine'),
                    backgroundColor: success ? const Color(0xFF00C896) : Colors.red,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            child: const Text('Add Medicine'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, String? uid) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.medication_outlined,
                size: 60, color: AppColors.primary),
          ),
          const SizedBox(height: 20),
          const Text('No medicines tracked yet',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                  color: Color(0xFF1A1A2E))),
          const SizedBox(height: 8),
          Text(
            'Scan a prescription or tap below to add medicines manually',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade600, height: 1.5),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => _showAddMedicineDialog(context, uid),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Add Medicine Manually'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMedicineCard(Map<String, dynamic> med) {
    final qty = (med['quantity_remaining'] as num).toInt();
    final daily = (med['daily_dosage'] as num).toInt();
    final daysLeft = daily > 0 ? (qty / daily).floor() : 0;

    final expiryDate = DateTime.tryParse(med['expiry_date']?.toString() ?? '') ??
        DateTime.now().add(const Duration(days: 365));
    final daysToExpiry = expiryDate.difference(DateTime.now()).inDays;

    final isLowStock = daysLeft < 7;
    final isExpirySoon = daysToExpiry <= 30;
    final isExpired = daysToExpiry <= 0;

    // Progress bar: proportion of full 30-day supply
    final fullSupply = daily * 30;
    final refillProgress = fullSupply > 0 ? (qty / fullSupply).clamp(0.0, 1.0) : 0.0;

    Color progressColor;
    if (refillProgress > 0.5) {
      progressColor = const Color(0xFF00C896);
    } else if (refillProgress > 0.2) {
      progressColor = const Color(0xFFFF9800);
    } else {
      progressColor = const Color(0xFFFF5252);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: isLowStock
            ? Border.all(color: const Color(0xFFFF9800).withOpacity(0.4))
            : isExpirySoon
                ? Border.all(color: const Color(0xFFFF5252).withOpacity(0.4))
                : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            // Top row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isLowStock
                        ? Colors.orange.shade50
                        : AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(Icons.medication_rounded,
                      color: isLowStock ? Colors.orange : AppColors.primary,
                      size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        med['medicine_name'] as String,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Color(0xFF1A1A2E)),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '$daily dose(s)/day',
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                // Qty badge
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '$qty left',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: isLowStock ? Colors.orange : const Color(0xFF1A1A2E),
                      ),
                    ),
                    Text(
                      '~$daysLeft days',
                      style: TextStyle(
                          color: Colors.grey.shade500, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Refill progress bar
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Refill Status',
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade500,
                            fontWeight: FontWeight.w500)),
                    Text(
                      '${(refillProgress * 100).toStringAsFixed(0)}% remaining',
                      style: TextStyle(
                          fontSize: 11,
                          color: progressColor,
                          fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: refillProgress,
                    backgroundColor: Colors.grey.shade100,
                    valueColor: AlwaysStoppedAnimation(progressColor),
                    minHeight: 8,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Expiry row
            Row(
              children: [
                Icon(
                  isExpired
                      ? Icons.error_outline
                      : isExpirySoon
                          ? Icons.warning_amber_outlined
                          : Icons.event_available_outlined,
                  size: 14,
                  color: isExpired
                      ? Colors.red
                      : isExpirySoon
                          ? Colors.orange
                          : Colors.grey.shade400,
                ),
                const SizedBox(width: 6),
                Text(
                  isExpired
                      ? 'EXPIRED'
                      : 'Exp: ${DateFormat('MMM dd, yyyy').format(expiryDate)} ($daysToExpiry days)',
                  style: TextStyle(
                    fontSize: 12,
                    color: isExpired
                        ? Colors.red
                        : isExpirySoon
                            ? Colors.orange
                            : Colors.grey.shade500,
                    fontWeight: isExpirySoon || isExpired
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                ),
                if (isLowStock) ...[
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('Low Stock',
                        style: TextStyle(
                            color: Colors.orange,
                            fontSize: 10,
                            fontWeight: FontWeight.bold)),
                  ),
                ],
              ],
            ),

            const Divider(height: 20),

            // Action buttons
            Row(
              children: [
                // Skip button
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _skipDose(med['medicine_name'] as String),
                    icon: const Icon(Icons.skip_next_rounded, size: 16),
                    label: const Text('Skip', style: TextStyle(fontSize: 13)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.orange,
                      side: const BorderSide(color: Colors.orange),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Take dose button
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed:
                        qty > 0 ? () => _takeDose(med['medicine_name'] as String) : null,
                    icon: const Icon(Icons.check_circle_outline, size: 18),
                    label: const Text('Mark Taken',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                      disabledBackgroundColor: Colors.grey.shade200,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
