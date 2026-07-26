import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_colors.dart';
import 'order_history_screen.dart';
import 'reminders_screen.dart';
import 'chat_screen.dart';
import 'inventory_screen.dart';
import 'prescription_history_screen.dart';
import 'pharmacy_portal_screen.dart';
import '../services/api_service.dart';
import 'network_debug_screen.dart';


class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Future<void> _refresh(AuthProvider authProvider) async {
    try {
      await authProvider.refreshUser();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated'), duration: Duration(seconds: 1)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to refresh profile: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    final name = user?['fullName'] as String? ?? 'User';
    final email = user?['email'] as String? ?? '';
    final phone = user?['phone'] as String? ?? '';
    final role = user?['role'] as String? ?? 'user';
    final isPharmacyDashboard = role == 'pharmacy';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      body: RefreshIndicator(
        onRefresh: () => _refresh(authProvider),
        child: CustomScrollView(
          slivers: [
            // Header
            SliverAppBar(
              expandedHeight: 220,
              pinned: true,
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF1976D2), Color(0xFF42A5F5)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: SafeArea(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(height: 20),
                        // Avatar circle
                        Container(
                          width: 90,
                          height: 90,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.15),
                                blurRadius: 16,
                                offset: const Offset(0, 6),
                              )
                            ],
                          ),
                          child: Center(
                            child: Text(
                              initial,
                              style: TextStyle(
                                fontSize: 38,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Info cards
                    _buildInfoCard([
                      if (email.isNotEmpty)
                        _InfoRow(Icons.email_outlined, 'Email', email),
                      if (phone.isNotEmpty)
                        _InfoRow(Icons.phone_outlined, 'Phone', phone),
                      _InfoRow(Icons.badge_outlined, 'Account Type',
                          role == 'pharmacy' ? 'Pharmacy' : 'Patient'),
                    ]),
                    const SizedBox(height: 24),

                    const Text('Account',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Color(0xFF2D3748))),
                    const SizedBox(height: 12),
                    _buildMenuCard([
                      _MenuItem(Icons.history_rounded, 'Health History', Colors.blue,
                          () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Health history coming soon.')))),
                      _MenuItem(Icons.inventory_2_outlined,
                          'My Inventory', Colors.teal, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InventoryScreen()))),
                      _MenuItem(Icons.notifications_active_outlined, 'Medicine Reminders',
                          Colors.orange, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RemindersScreen()))),
                      _MenuItem(Icons.document_scanner_outlined, 'Prescription History',
                          Colors.purple, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrescriptionHistoryScreen()))),
                    ]),
                    const SizedBox(height: 16),

                    const Text('Support',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Color(0xFF2D3748))),
                    const SizedBox(height: 12),
                    _buildMenuCard([
                      _MenuItem(
                          Icons.security, 'Privacy & Security', Colors.green, () {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Security settings are managed automatically.')));
                          }),
                      _MenuItem(Icons.network_ping_rounded, 'Network Diagnostics',
                          Colors.indigo, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NetworkDebugScreen()))),
                      _MenuItem(Icons.help_outline_rounded, 'Help Center',
                          Colors.purple, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatScreen()))),
                      _MenuItem(Icons.info_outline_rounded, 'About MediConnect',
                          Colors.teal, () {
                            showAboutDialog(context: context, applicationName: 'MediConnect', applicationVersion: '2.0.0', applicationIcon: const Icon(Icons.favorite, color: AppColors.primary));
                          }),
                    ]),
                    const SizedBox(height: 24),

                    // Logout
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Logout'),
                              content: const Text('Are you sure you want to logout?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                                TextButton(
                                  onPressed: () async {
                                    Navigator.pop(context); // Close dialog
                                    await authProvider.logout();
                                    // The Consumer in main.dart will automatically
                                    // switch to OnboardingScreen because isAuthenticated is now false.
                                  }, 
                                  child: const Text('Logout', style: TextStyle(color: AppColors.error)),
                                ),
                              ],
                            ),
                          );
                        },
                        icon: const Icon(Icons.logout_rounded,
                            color: AppColors.error),
                        label: const Text('Logout',
                            style: TextStyle(color: AppColors.error)),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: const BorderSide(color: AppColors.error),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(List<_InfoRow> rows) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        children: rows.asMap().entries.map((entry) {
          final i = entry.key;
          final row = entry.value;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(row.icon, color: AppColors.primary, size: 18),
                    ),
                    const SizedBox(width: 14),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(row.label,
                            style: TextStyle(
                                color: Colors.grey.shade500,
                                fontSize: 11,
                                fontWeight: FontWeight.w500)),
                        const SizedBox(height: 2),
                        Text(row.value,
                            style: const TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ],
                ),
              ),
              if (i < rows.length - 1)
                Divider(height: 1, indent: 18, endIndent: 18,
                    color: Colors.grey.shade100),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildMenuCard(List<_MenuItem> items) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final i = entry.key;
          final item = entry.value;
          return Column(
            children: [
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: item.color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(item.icon, color: item.color, size: 20),
                ),
                title: Text(item.title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w500, fontSize: 14)),
                trailing: const Icon(Icons.arrow_forward_ios,
                    size: 14, color: Colors.grey),
                onTap: item.onTap,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              ),
              if (i < items.length - 1)
                Divider(
                    height: 1,
                    indent: 16,
                    endIndent: 16,
                    color: Colors.grey.shade100),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _InfoRow {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(this.icon, this.label, this.value);
}

class _MenuItem {
  final IconData icon;
  final String title;
  final Color color;
  final VoidCallback onTap;
  const _MenuItem(this.icon, this.title, this.color, this.onTap);
}
