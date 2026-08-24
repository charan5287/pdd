import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:flutter/foundation.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'cloud_service.dart';


class NotificationService {
  static final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();

  static Future<void> init() async {
    tz_data.initializeTimeZones();
    const AndroidInitializationSettings androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings settings = InitializationSettings(android: androidInit);
    
    // Set local timezone with safety fallback
    try {
      final dynamic timeZoneResult = await FlutterTimezone.getLocalTimezone();
      String timeZoneName = timeZoneResult.toString();

      // Extract Name if in "TimezoneInfo(Name, ...)" format
      final RegExp regExp = RegExp(r'\(([^,)]+)');
      final match = regExp.firstMatch(timeZoneName);
      if (match != null) {
        timeZoneName = match.group(1)!.trim();
      }

      debugPrint('Detected timezone: $timeZoneName');

      // Map common timezone name differences
      final Map<String, String> tzMapping = {
        'Asia/Calcutta': 'Asia/Kolkata',
      };

      if (tzMapping.containsKey(timeZoneName)) {
        timeZoneName = tzMapping[timeZoneName]!;
      }

      tz.setLocalLocation(tz.getLocation(timeZoneName));
    } catch (e) {
      debugPrint('Warning: Could not set local timezone, falling back to UTC: $e');
      tz.setLocalLocation(tz.UTC);
    }

    await _notifications.initialize(
      settings,
      onDidReceiveNotificationResponse: (NotificationResponse response) async {
        if (response.actionId == 'mark_taken') {
          final String? medicineName = response.payload;
          if (medicineName != null) {
            try {
              // Use CloudService directly (Firebase UID-based) instead of ApiService
              // which requires a SQLite integer user ID.
              await CloudService.logDose(medicineName: medicineName, wasSkipped: false);
              debugPrint('✅ Dose logged for $medicineName via notification action');
            } catch (e) {
              debugPrint('⚠️ Error logging dose from notification: $e');
            }
          }
        }
      },
    );

    // Create notification channel for Android with maximum priority
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'medinow_reminders',
      'Medication Reminders',
      description: 'Scheduled reminders for your medications',
      importance: Importance.max,
      enableVibration: true,
      playSound: true,
      showBadge: true,
      enableLights: true,
      ledColor: Color(0xFF0D47A1),
      audioAttributesUsage: AudioAttributesUsage.alarm,
    );

    final AndroidFlutterLocalNotificationsPlugin? androidImplementation =
        _notifications.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    if (androidImplementation != null) {
      await androidImplementation.createNotificationChannel(channel);
    }

    await requestPermissions();
  }

  static Future<void> requestPermissions() async {
    if (defaultTargetPlatform == TargetPlatform.android) {
      final AndroidFlutterLocalNotificationsPlugin? androidImplementation =
          _notifications.resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      
      await androidImplementation?.requestNotificationsPermission();
      await androidImplementation?.requestExactAlarmsPermission();
    }
  }

  static Future<bool> isExactAlarmPermissionGranted() async {
    // Current plugin version doesn't easily expose this check.
    // We'll return true to avoid showing the warning by default,
    // or let the user trigger the request via the "Fix Now" button.
    return true; 
  }

  static Future<void> scheduleDailyNotification({
    required int id,
    required String title,
    required String body,
    required String medicineName,
    required int hour,
    required int minute,
  }) async {
    await _notifications.zonedSchedule(
      id,
      title,
      body,
      _nextInstanceOfTime(hour, minute),
      NotificationDetails(
        android: AndroidNotificationDetails(
          'medinow_reminders',
          'Medication Reminders',
          channelDescription: 'Scheduled reminders for your medications',
          importance: Importance.max,
          priority: Priority.high,
          ticker: 'ticker',
          fullScreenIntent: true,
          category: AndroidNotificationCategory.reminder,
          visibility: NotificationVisibility.public,
          audioAttributesUsage: AudioAttributesUsage.alarm,
          color: const Color(0xFF0D47A1),
          ledColor: const Color(0xFF0D47A1),
          ledOnMs: 1000,
          ledOffMs: 500,
          actions: <AndroidNotificationAction>[
            const AndroidNotificationAction(
              'mark_taken',
              'Mark Taken',
              showsUserInterface: true,
              cancelNotification: true,
            ),
          ],
        ),
      ),
      payload: medicineName,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  static Future<void> showImmediateNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await _notifications.show(
      id,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          'medinow_reminders',
          'Medication Reminders',
          channelDescription: 'Immediate notifications and alerts',
          importance: Importance.max,
          priority: Priority.high,
          ticker: 'ticker',
          category: AndroidNotificationCategory.status,
          visibility: NotificationVisibility.public,
          audioAttributesUsage: AudioAttributesUsage.alarm,
          color: const Color(0xFF0D47A1),
          actions: <AndroidNotificationAction>[
            const AndroidNotificationAction(
              'mark_taken',
              'Mark Taken',
              showsUserInterface: true,
              cancelNotification: true,
            ),
          ],
        ),
      ),
      payload: payload ?? body.replaceFirst('Time to take your ', ''),
    );
  }

  static tz.TZDateTime _nextInstanceOfTime(int hour, int minute) {
    final tz.TZDateTime now = tz.TZDateTime.now(tz.local);
    tz.TZDateTime scheduledDate = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (scheduledDate.isBefore(now)) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }
    return scheduledDate;
  }

  static Future<void> cancelNotification(int id) async {
    await _notifications.cancel(id);
  }

  static Future<void> cancelAll() async {
    await _notifications.cancelAll();
  }

  /// Globally syncs all active reminders from Firestore to local OS alarms
  static Future<void> syncNotificationsFromCloud() async {
    try {
      final reminders = await CloudService.getReminders();
      await cancelAll();
      for (var r in reminders) {
        final isActive = r['is_active'] as bool? ?? true;
        if (isActive) {
          final timeStr = r['time'] as String? ?? '08:00';
          final timeParts = timeStr.split(':');
          if (timeParts.length < 2) continue;
          final hour = int.parse(timeParts[0]);
          final min = int.parse(timeParts[1]);
          final notifId = r['id'].toString().hashCode.abs();
          
          await scheduleDailyNotification(
            id: notifId,
            title: 'Medication Reminder ⏰',
            body: 'Time to take your ${r['medicine_name']} (${r['dosage'] ?? '1 dose'})',
            medicineName: r['medicine_name'],
            hour: hour,
            minute: min,
          );
        }
      }
      debugPrint('🔔 NotificationService: Successfully synced local alarms with cloud database!');
    } catch (e) {
      debugPrint('⚠️ NotificationService: Error syncing alarms from cloud: $e');
    }
  }
}
