import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import '../services/cloud_service.dart';
import '../theme/app_colors.dart';

class RemindersScreen extends StatefulWidget {
  const RemindersScreen({super.key});

  @override
  State<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends State<RemindersScreen> {
  List<dynamic> _reminders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initPermissions();
    _load();
  }

  Future<void> _initPermissions() async {
    await NotificationService.requestPermissions();
  }

  Future<void> _load() async {
    final String? uid =
        Provider.of<AuthProvider>(context, listen: false).user?['uid'] as String?;
    if (uid == null) {
      setState(() => _isLoading = false);
      return;
    }
    try {
      final data = await ApiService.getReminders(0); // Legacy ID, ignored
      setState(() {
        _reminders = data;
        _isLoading = false;
      });
      _syncNotifications();
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  void _syncNotifications() async {
    await NotificationService.cancelAll();
    for (var r in _reminders) {
      final isActive = r['is_active'] as bool? ?? true; // Default true if missing
      if (isActive) {
        try {
          final timeStr = r['time'] as String? ?? '08:00';
          final timeParts = timeStr.split(':');
          if (timeParts.length < 2) continue;
          final hour = int.parse(timeParts[0]);
          final min = int.parse(timeParts[1]);
          // Use abs() to ensure non-negative notification ID (Android requirement)
          final notifId = r['id'].toString().hashCode.abs();
          await NotificationService.scheduleDailyNotification(
            id: notifId,
            title: 'Medication Reminder ⏰',
            body: 'Time to take your ${r['medicine_name']} (${r['dosage'] ?? '1 dose'})',
            medicineName: r['medicine_name'],
            hour: hour,
            minute: min,
          );
          debugPrint('✅ Scheduled notification for ${r['medicine_name']} at $timeStr (id: $notifId)');
        } catch (e) {
          debugPrint('⚠️ Failed to schedule notification for ${r['medicine_name']}: $e');
        }
      }
    }
  }

  Future<void> _toggleReminder(dynamic id) async {
    try {
      await ApiService.toggleReminder(0); // reminderId is now the String doc ID in CloudService logic, but for compatibility...
      // Actually, I should pass the real ID.
      await CloudService.toggleReminder(id.toString());
      _load();
    } catch (_) {}
  }

  Future<void> _deleteReminder(dynamic id) async {
    try {
      await ApiService.deleteReminder(0); // Legacy
      await CloudService.deleteReminder(id.toString());
      _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Reminder deleted')));
      }
    } catch (_) {}
  }

  void _showAddReminderSheet() {
    final medController = TextEditingController();
    final dosageController = TextEditingController(text: '1 dose');
    TimeOfDay selectedTime = TimeOfDay.now();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (ctx, setSheet) => Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 8,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Add Reminder',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1A1A2E),
                  ),
                ),
                const SizedBox(height: 20),
                // Medicine name
                TextField(
                  controller: medController,
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration(
                    labelText: 'Medicine Name',
                    prefixIcon: const Icon(Icons.medication_outlined,
                        color: AppColors.primary),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14)),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          const BorderSide(color: AppColors.primary, width: 2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Dosage
                TextField(
                  controller: dosageController,
                  decoration: InputDecoration(
                    labelText: 'Dosage',
                    prefixIcon:
                        const Icon(Icons.monitor_heart_outlined, color: AppColors.primary),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14)),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          const BorderSide(color: AppColors.primary, width: 2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Time picker
                GestureDetector(
                  onTap: () async {
                    final picked = await showTimePicker(
                      context: context,
                      initialTime: selectedTime,
                    );
                    if (picked != null) setSheet(() => selectedTime = picked);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.access_time,
                            color: AppColors.primary),
                        const SizedBox(width: 12),
                        Text(
                          'Reminder Time: ${selectedTime.format(context)}',
                          style: const TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w500),
                        ),
                        const Spacer(),
                        const Icon(Icons.arrow_drop_down,
                            color: Colors.grey),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      final String? uid =
                          Provider.of<AuthProvider>(ctx, listen: false)
                              .user?['uid'] as String?;
                      if (uid == null ||
                          medController.text.trim().isEmpty) {
                        return;
                      }
                      final hour =
                          selectedTime.hour.toString().padLeft(2, '0');
                      final min =
                          selectedTime.minute.toString().padLeft(2, '0');
                      final medName = medController.text.trim();
                      final formattedTime = selectedTime.format(ctx);
                      final messenger = ScaffoldMessenger.of(ctx);
                      await ApiService.saveReminder({
                        'user_id': uid,
                        'medicine_name': medName,
                        'dosage': dosageController.text.trim(),
                        'time': '$hour:$min',
                      });
                      if (mounted) Navigator.pop(ctx);
                      _load();
                      HapticFeedback.lightImpact();
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(
                            'Reminder set for $medName at $formattedTime',
                          ),
                          backgroundColor: AppColors.primary,
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text('Save Reminder',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8FF),
      appBar: AppBar(
        title: const Text('Medication Reminders'),
        centerTitle: true,
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Sync Reminders',
          ),
          const SizedBox(width: 8),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.small(
            onPressed: () async {
              await NotificationService.showImmediateNotification(
                id: 999,
                title: 'Test Notification',
                body: 'Your notification system is working correctly!',
              );
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Test notification sent!')),
                );
              }
            },
            backgroundColor: Colors.white,
            foregroundColor: AppColors.primary,
            child: const Icon(Icons.notifications_active_outlined),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            onPressed: _showAddReminderSheet,
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            icon: const Icon(Icons.add_alarm_rounded),
            label: const Text('Add Reminder',
                style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                FutureBuilder<bool>(
                  future: NotificationService.isExactAlarmPermissionGranted(),
                  builder: (context, snapshot) {
                    if (snapshot.hasData && snapshot.data == false) {
                      return Container(
                        width: double.infinity,
                        margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.orange.shade200),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, color: Colors.orange),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Text(
                                'Exact Alarms permission is missing. Reminders might be delayed.',
                                style: TextStyle(fontSize: 12, color: Colors.orange),
                              ),
                            ),
                            TextButton(
                              onPressed: () => NotificationService.requestPermissions(),
                              child: const Text('Fix Now', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      );
                    }
                    return const SizedBox.shrink();
                  },
                ),
                Expanded(
                  child: _reminders.isEmpty
                      ? _buildEmpty()
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
                            itemCount: _reminders.length,
                            itemBuilder: (context, index) =>
                                _buildReminderCard(_reminders[index]),
                          ),
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildEmpty() {
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
            child: const Icon(Icons.alarm_add_rounded,
                size: 60, color: AppColors.primary),
          ),
          const SizedBox(height: 20),
          const Text('No reminders yet',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                  color: Color(0xFF1A1A2E))),
          const SizedBox(height: 8),
          Text(
            'Add your first reminder to stay\non top of your medication schedule.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade600, height: 1.5),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildReminderCard(Map<String, dynamic> r) {
    final isActive = r['is_active'] as bool? ?? true;
    return Dismissible(
      key: Key(r['id'].toString()),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => _deleteReminder(r['id']),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Icon(Icons.delete_outline, color: Colors.red.shade400),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: isActive
              ? Border.all(
                  color: AppColors.primary.withOpacity(0.2), width: 1.5)
              : null,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isActive
                    ? AppColors.primary.withOpacity(0.1)
                    : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                Icons.alarm_rounded,
                color: isActive ? AppColors.primary : Colors.grey,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    r['medicine_name'] as String? ?? '',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: isActive
                          ? const Color(0xFF1A1A2E)
                          : Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.schedule, size: 12,
                          color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        r['time'] as String? ?? '--:--',
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 12),
                      ),
                      const SizedBox(width: 10),
                      Icon(Icons.medication, size: 12,
                          color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        r['dosage'] as String? ?? '',
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            IconButton(
              icon: Icon(Icons.delete_outline_rounded, 
                color: Colors.red.shade300, 
                size: 20
              ),
              onPressed: () => _deleteReminder(r['id']),
              tooltip: 'Delete Reminder',
            ),
            Switch(
              value: isActive,
              onChanged: (_) => _toggleReminder(r['id']),
              activeColor: AppColors.primary,
            ),
          ],
        ),
      ),
    );
  }
}
