import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/adherence_provider.dart';
import 'providers/inventory_provider.dart';
import 'providers/navigation_provider.dart';


import 'package:flutter/foundation.dart';
import 'theme/app_theme.dart';
import 'screens/onboarding_screen.dart';
import 'screens/home_screen.dart';
import 'screens/pharmacy_portal_screen.dart';
import 'screens/portal_selection_screen.dart';
import 'services/notification_service.dart';
import 'services/api_service.dart';
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    if (kIsWeb) {
      await Firebase.initializeApp(
        options: const FirebaseOptions(
          apiKey: 'AIzaSyAzSoWMGFzzoyq1XoxtzwJwu_PzjWvJ8G8',
          authDomain: 'medinow-8519b.firebaseapp.com',
          projectId: 'medinow-8519b',
          storageBucket: 'medinow-8519b.firebasestorage.app',
          messagingSenderId: '305716110825',
          appId: '1:305716110825:web:95b600b56d25e6184ed778',
        ),
      );
    } else {
      await Firebase.initializeApp();
    }
    debugPrint('✅ Firebase initialized: ${Firebase.app().options.projectId}');
  } catch (e) {
    debugPrint('⚠️ Firebase initialization failed: $e');
  }

  await NotificationService.init();
  await ApiService.init();

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  // Restore auth session
  final authProvider = AuthProvider();
  await authProvider.tryRestoreSession();

  runApp(
    ChangeNotifierProvider.value(
      value: authProvider,
      child: const MediConnectApp(),
    ),
  );
}

class MediConnectApp extends StatelessWidget {
  const MediConnectApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        return MultiProvider(
          providers: [
            ChangeNotifierProvider(create: (_) => AdherenceProvider()),
            ChangeNotifierProvider(create: (_) => InventoryProvider()),
            ChangeNotifierProvider(create: (_) => NavigationProvider()),
          ],
          child: MaterialApp(
            title: 'MediConnect',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            home: () {
              // Priority 1: If session is restored and user is authenticated, 
              // BUT the user wants to see onboarding first (or it's a fresh run),
              // we should have a way to handle that.
              
              // For now, to satisfy the "start from onboarding" request:
              if (!auth.isAuthenticated) {
                debugPrint('👋 NOT AUTHENTICATED: Navigating to OnboardingScreen');
                return const OnboardingScreen();
              }
              
              // If authenticated, go to respective portal
              final role = auth.user?['role']?.toString().toLowerCase();
              debugPrint('🏠 AUTHENTICATED: Role = $role');
              
              if (role == 'pharmacy') {
                return PharmacyPortalScreen();
              }
              return HomeScreen();
            }(),
          ),
        );
      },
    );
  }
}
