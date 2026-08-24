import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/adherence_provider.dart';
import '../providers/navigation_provider.dart';
import '../providers/inventory_provider.dart';

import '../theme/app_colors.dart';
import '../services/api_service.dart';
import '../widgets/adherence_ring.dart';
import '../widgets/weekly_chart.dart';
import '../widgets/ai_insight_card.dart';
import 'chat_screen.dart';
import 'scan_screen.dart';
import 'inventory_screen.dart';
import 'pharmacy_screen.dart';
import 'profile_screen.dart';
import 'adherence_screen.dart';
import 'reminders_screen.dart';
import 'pharmacy_portal_screen.dart';
import 'emergency_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  // Remove local _selectedTab

  // Remove local _inventory
  List<dynamic> _refillAlerts = [];
  List<dynamic> _expiryAlerts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAllData());
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final String? uid = auth.user?['uid'] as String?;
    if (uid == null) {
      setState(() => _isLoading = false);
      return;
    }

    // Initialize Inventory from Provider (single load)
    final inv = Provider.of<InventoryProvider>(context, listen: false);

    try {
      await inv.loadInventory(uid);
      final refillResults = await ApiService.getRefillAlerts(0);
      final expiryResults = await ApiService.getExpiryAlerts(0);

      // Load adherence in parallel
      Provider.of<AdherenceProvider>(context, listen: false)
          .loadAdherence(uid);

      if (mounted) {
        setState(() {
          _refillAlerts = refillResults;
          _expiryAlerts = expiryResults;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final nav = Provider.of<NavigationProvider>(context);
    final inv = Provider.of<InventoryProvider>(context);
    final selectedTab = nav.selectedIndex;

    final pages = [
      _DashboardPage(
        inventory: inv.inventory,
        refillAlerts: _refillAlerts,
        expiryAlerts: _expiryAlerts,
        isLoading: _isLoading || inv.isLoading,
        onRefresh: _loadAllData,
        onNavigate: (tab) => nav.setTab(tab),
      ),
      const InventoryScreen(),
      const ScanScreen(),
      const PharmacyScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF5F8FF),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        toolbarHeight: 0,
      ),
      drawer: _buildPharmacyDrawer(context),
      body: IndexedStack(index: selectedTab, children: pages),
      bottomNavigationBar: _buildNavBar(nav),
    );
  }

  Widget _buildPharmacyDrawer(BuildContext context) {
    return Drawer(
      width: MediaQuery.of(context).size.width * 0.85,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: const PharmacySidebarContent(),
    );
  }

  Widget _buildNavBar(NavigationProvider nav) {
    final selectedTab = nav.selectedIndex;
    final items = [
      (Icons.dashboard_rounded, Icons.dashboard_outlined, 'Home'),
      (Icons.medication_rounded, Icons.medication_outlined, 'Medicines'),
      (Icons.document_scanner_rounded, Icons.document_scanner_outlined, 'Scan'),
      (Icons.local_pharmacy_rounded, Icons.local_pharmacy_outlined, 'Pharmacy'),
      (Icons.person_rounded, Icons.person_outlined, 'Profile'),
    ];

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 16,
              offset: const Offset(0, -4))
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: items.asMap().entries.map((entry) {
              final idx = entry.key;
              final (activeIcon, inactiveIcon, label) = entry.value;
              final isSelected = selectedTab == idx;
              return GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  nav.setTab(idx);
                },
                behavior: HitTestBehavior.opaque,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: isSelected
                      ? BoxDecoration(
                          color: AppColors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                        )
                      : null,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Scan button gets special treatment
                      if (idx == 2 && !isSelected)
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF1565C0), Color(0xFF42A5F5)],
                            ),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(activeIcon,
                              color: Colors.white, size: 22),
                        )
                      else
                        Icon(
                          isSelected ? activeIcon : inactiveIcon,
                          color: isSelected ? AppColors.primary : Colors.grey,
                          size: 22,
                        ),
                      const SizedBox(height: 3),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: isSelected
                              ? FontWeight.bold
                              : FontWeight.w500,
                          color: isSelected ? AppColors.primary : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

class _DashboardPage extends StatelessWidget {
  final List<dynamic> inventory;
  final List<dynamic> refillAlerts;
  final List<dynamic> expiryAlerts;
  final bool isLoading;
  final Future<void> Function() onRefresh;
  final void Function(int) onNavigate;

  const _DashboardPage({
    required this.inventory,
    required this.refillAlerts,
    required this.expiryAlerts,
    required this.isLoading,
    required this.onRefresh,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final rawName = auth.user?['fullName'] as String? ?? '';
    final email = auth.user?['email'] as String? ?? '';
    final name = rawName.isNotEmpty && rawName != 'there'
        ? rawName.split(' ').first
        : (email.isNotEmpty ? email.split('@').first : 'there');
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good Morning'
        : hour < 17
            ? 'Good Afternoon'
            : 'Good Evening';

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: CustomScrollView(
        slivers: [
          // Header
          SliverToBoxAdapter(
            child: _buildHeader(context, greeting, name),
          ),
          if (isLoading)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.only(top: 40),
                child: Center(child: CircularProgressIndicator()),
              ),
            )
          else ...[
            // Adherence hero card
            SliverToBoxAdapter(child: _buildAdherenceHero(context)),
            // Emergency SOS Card
            SliverToBoxAdapter(child: _buildEmergencyShortcut(context)),
            // Alerts row (refill + expiry)
            if (refillAlerts.isNotEmpty || expiryAlerts.isNotEmpty)
              SliverToBoxAdapter(
                  child: _buildAlertsSection(context)),
            // AI Insights
            SliverToBoxAdapter(child: _buildInsightsCard(context)),
            // Quick actions
            SliverToBoxAdapter(child: _buildQuickActions(context)),
            // Today's medicines
            SliverToBoxAdapter(child: _buildTodayMeds(context)),
            // Weekly chart preview
            SliverToBoxAdapter(child: _buildWeeklyPreview(context)),
            const SliverToBoxAdapter(child: SizedBox(height: 40)),
          ],
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, String greeting, String name) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 60, 24, 28),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0D47A1), Color(0xFF1976D2), Color(0xFF42A5F5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(36),
          bottomRight: Radius.circular(36),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Menu/Drawer
              GestureDetector(
                onTap: () => Scaffold.of(context).openDrawer(),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.menu_rounded,
                      color: AppColors.primary, size: 20),
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'MediNow',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              // Notifications bell
              GestureDetector(
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const RemindersScreen())),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child:
                      const Icon(Icons.alarm_rounded, color: Colors.white, size: 20),
                ),
              ),
              const SizedBox(width: 10),
              // Chat
              GestureDetector(
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const ChatScreen())),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.smart_toy_rounded,
                      color: Colors.white, size: 20),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            '$greeting, $name 👋',
            style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            '${inventory.length} medicines tracked • Stay on schedule',
            style:
                const TextStyle(color: Colors.white70, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildAdherenceHero(BuildContext context) {
    return Consumer<AdherenceProvider>(builder: (context, adh, _) {
      return GestureDetector(
        onTap: () => Navigator.push(context,
            MaterialPageRoute(builder: (_) => const AdherenceScreen())),
        child: Transform.translate(
          offset: const Offset(0, -20),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: adh.isLoading
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : Column(
                      children: [
                        Row(
                          children: [
                            const Text(
                              'Adherence Overview',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: Color(0xFF1A1A2E)),
                            ),
                            const Spacer(),
                            const Icon(Icons.arrow_forward_ios,
                                size: 14, color: Colors.grey),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            // Ring
                            AdherenceRing(
                              percentage: adh.score,
                              size: 110,
                              strokeWidth: 12,
                              label: 'Score',
                            ),
                            const SizedBox(width: 24),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _statRow(
                                    'Risk Level',
                                    adh.riskLevel,
                                    adh.riskColor == 'green'
                                        ? const Color(0xFF00C896)
                                        : adh.riskColor == 'orange'
                                            ? const Color(0xFFFF9800)
                                            : const Color(0xFFFF5252),
                                  ),
                                  const SizedBox(height: 12),
                                  _statRow('Doses Taken',
                                      '${adh.dosesTaken}', const Color(0xFF00C896)),
                                  const SizedBox(height: 12),
                                  _statRow('Doses Skipped',
                                      '${adh.dosesSkipped}', const Color(0xFFFF5252)),
                                  const SizedBox(height: 16),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: const Text(
                                      'View Full Analytics →',
                                      style: TextStyle(
                                          color: AppColors.primary,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
            ),
          ),
        ),
      );
    });
  }

  Widget _buildEmergencyShortcut(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 0),
      child: GestureDetector(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EmergencyScreen())),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFFF5252), Color(0xFFD32F2F)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.red.withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.warning_rounded, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Emergency SOS',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Text(
                      'Ambulance, Hospital, Quick Dial',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, color: Colors.white54, size: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statRow(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500)),
        Text(value,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: color)),
      ],
    );
  }

  Widget _buildAlertsSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('⚠️ Alerts',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 17,
                  color: Color(0xFF1A1A2E))),
          const SizedBox(height: 12),
          if (refillAlerts.isNotEmpty)
            ...refillAlerts.take(2).map((a) => _buildAlertCard(
                  Icons.local_pharmacy_outlined,
                  'Refill Needed',
                  '${a['medicine_name']}: ${a['message']}',
                  const Color(0xFFFF9800),
                  const Color(0xFFFFF3E0),
                )),
          if (expiryAlerts.isNotEmpty)
            ...expiryAlerts.take(2).map((a) => _buildAlertCard(
                  Icons.event_busy_outlined,
                  'Expires Soon',
                  '${a['medicine_name']} expires in ${a['days_until_expiry']} days',
                  const Color(0xFFFF5252),
                  const Color(0xFFFFEBEE),
                )),
        ],
      ),
    );
  }

  Widget _buildAlertCard(
      IconData icon, String title, String body, Color fg, Color bg) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: fg.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: fg, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        color: fg,
                        fontWeight: FontWeight.bold,
                        fontSize: 13)),
                const SizedBox(height: 2),
                Text(body,
                    style: TextStyle(
                        color: fg.withOpacity(0.8), fontSize: 12),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInsightsCard(BuildContext context) {
    return Consumer<AdherenceProvider>(builder: (context, adh, _) {
      if (adh.insights.isEmpty) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('AI Insights',
                style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 17,
                    color: Color(0xFF1A1A2E))),
            const SizedBox(height: 12),
            AiInsightCard(
              insights: adh.insights,
              riskLevel: adh.riskLevel,
              riskColor: adh.riskColor,
            ),
          ],
        ),
      );
    });
  }

  Widget _buildQuickActions(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Quick Actions',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 17,
                  color: Color(0xFF1A1A2E))),
          const SizedBox(height: 12),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.15,
            children: [
              _actionCard(
                context,
                Icons.document_scanner_outlined,
                'Scan Rx',
                'Upload prescription',
                const Color(0xFFE8F0FE),
                AppColors.primary,
                () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const ScanScreen())),
              ),
              _actionCard(
                context,
                Icons.insights_rounded,
                'Adherence',
                'View analytics',
                const Color(0xFFE8F5E9),
                const Color(0xFF2E7D32),
                () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const AdherenceScreen())),
              ),
              _actionCard(
                context,
                Icons.alarm_add_rounded,
                'Reminders',
                'Manage schedule',
                const Color(0xFFFFF3E0),
                const Color(0xFFE65100),
                () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const RemindersScreen())),
              ),
              _actionCard(
                context,
                Icons.smart_toy_outlined,
                'AI Assistant',
                'Ask health questions',
                const Color(0xFFF3E5F5),
                const Color(0xFF6A1B9A),
                () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const ChatScreen())),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _actionCard(
    BuildContext context,
    IconData icon,
    String title,
    String subtitle,
    Color bg,
    Color fg,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: fg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const Spacer(),
            Text(title,
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 14,
                    color: Color(0xFF1A1A2E))),
            const SizedBox(height: 3),
            Text(subtitle,
                style: TextStyle(
                    fontSize: 11, color: Colors.grey.shade600),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayMeds(BuildContext context) {
    if (inventory.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Today's Medicines",
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 17,
                      color: Color(0xFF1A1A2E))),
              TextButton(
                onPressed: () => onNavigate(1),
                child: const Text('View All',
                    style: TextStyle(color: AppColors.primary, fontSize: 13)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...inventory.take(3).map((med) {
            final qty = (med['quantity_remaining'] as num).toInt();
            final daily = (med['daily_dosage'] as num).toInt();
            final daysLeft =
                daily > 0 ? (qty / daily).floor() : 0;
            final isLow = daysLeft < 5;
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 4))
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isLow
                              ? Colors.red.shade50
                              : AppColors.primary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(Icons.medication_rounded,
                            color: isLow ? Colors.red : AppColors.primary,
                            size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              med['medicine_name'] as String,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '$daily dose(s)/day • $qty left',
                              style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      if (isLow)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            'Low',
                            style: const TextStyle(
                                color: Colors.red,
                                fontSize: 10,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () async {
                            final auth = Provider.of<AuthProvider>(context, listen: false);
                            final uid = auth.user?['uid'] as String?;
                            if (uid != null) {
                              try {
                                await Provider.of<InventoryProvider>(context, listen: false)
                                    .skipDose(uid, med['medicine_name']);
                                
                                if (context.mounted) {
                                  // Reload adherence to update score
                                  Provider.of<AdherenceProvider>(context, listen: false)
                                    .loadAdherence(uid);

                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Dose skipped for ${med['medicine_name']}'),
                                      backgroundColor: Colors.orange,
                                      behavior: SnackBarBehavior.floating,
                                      duration: const Duration(seconds: 2),
                                    ),
                                  );
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Error skipping dose: $e'),
                                      backgroundColor: Colors.red,
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                }
                              }
                            }
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.orange,
                            side: const BorderSide(color: Colors.orange),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                          child: const Text('Skip', style: TextStyle(fontSize: 12)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: qty > 0 ? () async {
                            final auth = Provider.of<AuthProvider>(context, listen: false);
                            final uid = auth.user?['uid'] as String?;
                            if (uid != null) {
                              try {
                                await Provider.of<InventoryProvider>(context, listen: false)
                                    .takeDose(uid, med['medicine_name']);
                                
                                if (context.mounted) {
                                  // Reload adherence to update score/insights
                                  Provider.of<AdherenceProvider>(context, listen: false)
                                    .loadAdherence(uid);
                                  
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Dose logged for ${med['medicine_name']}'),
                                      backgroundColor: const Color(0xFF00C896),
                                      behavior: SnackBarBehavior.floating,
                                      duration: const Duration(seconds: 2),
                                    ),
                                  );
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Error logging dose: $e'),
                                      backgroundColor: Colors.red,
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                }
                              }
                            }
                          } : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            elevation: 0,
                          ),
                          child: const Text('Mark Taken', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildWeeklyPreview(BuildContext context) {
    return Consumer<AdherenceProvider>(builder: (context, adh, _) {
      if (adh.weeklyData.isEmpty) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Weekly Trend',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 17,
                        color: Color(0xFF1A1A2E))),
                TextButton(
                  onPressed: () => Navigator.push(context,
                      MaterialPageRoute(
                          builder: (_) => const AdherenceScreen())),
                  child: const Text('Full Report',
                      style: TextStyle(
                          color: AppColors.primary, fontSize: 13)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 12,
                      offset: const Offset(0, 4))
                ],
              ),
              child: WeeklyAdherenceChart(weeklyData: adh.weeklyData),
            ),
          ],
        ),
      );
    });
  }
}

// ─── Pharmacy Sidebar Content ────────────────────────────────────────────────
class PharmacySidebarContent extends StatefulWidget {
  const PharmacySidebarContent({super.key});

  @override
  State<PharmacySidebarContent> createState() => _PharmacySidebarContentState();
}

class _PharmacySidebarContentState extends State<PharmacySidebarContent> {
  List<dynamic> _pharmacies = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadNearby();
  }

  Future<void> _loadNearby() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // 1. Check & request location permission
      PermissionStatus permStatus = await Permission.location.status;
      if (permStatus.isDenied || permStatus.isRestricted) {
        permStatus = await Permission.location.request();
      }
      if (!permStatus.isGranted) {
        if (mounted) setState(() { _error = "Location permission required."; _isLoading = false; });
        return;
      }

      // 2. Check GPS service
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) setState(() { _error = "GPS is disabled. Please turn on location services."; _isLoading = false; });
        return;
      }

      // 3. Get Location (Try high accuracy first with 4s timeout, then fallback to balanced indoor/WiFi accuracy)
      Position pos;
      try {
        pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 4),
          ),
        );
      } catch (_) {
        pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 4),
          ),
        );
      }

      // 4. Fetch from API
      final results = await ApiService.getNearbyPharmacies(
        lat: pos.latitude,
        lng: pos.longitude,
        radiusMeters: 8000,
      );

      if (mounted) {
        setState(() {
          _pharmacies = results;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = "Could not fetch nearby stores. Ensure GPS is on.";
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _navigate(double lat, double lng) async {
    final androidUri = Uri.parse('google.navigation:q=$lat,$lng&mode=d');
    final webUri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');
    
    if (await canLaunchUrl(androidUri)) {
      await launchUrl(androidUri);
    } else {
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSidebarHeader(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? _buildErrorState()
                    : _buildPharmacyList(),
          ),
          _buildSidebarFooter(),
        ],
      ),
    );
  }

  Widget _buildSidebarHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 60, 24, 24),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.05),
        borderRadius: const BorderRadius.only(topRight: Radius.circular(32)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.local_pharmacy_rounded, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 14),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Nearby Stores', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  Text('Real-time Availability', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPharmacyList() {
    if (_pharmacies.isEmpty) {
      return const Center(child: Text("No pharmacies found nearby."));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _pharmacies.length,
      itemBuilder: (context, index) {
        final p = _pharmacies[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade100),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8)],
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(12),
            title: Text(p['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text(p['address'], style: TextStyle(fontSize: 11, color: Colors.grey.shade600), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.near_me_rounded, size: 12, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(p['distance_text'], style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 11)),
                    const Spacer(),
                    const Icon(Icons.star_rounded, size: 12, color: Colors.amber),
                    const SizedBox(width: 2),
                    Text(p['rating'].toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                  ],
                ),
              ],
            ),
            trailing: IconButton(
              icon: const Icon(Icons.directions_rounded, color: AppColors.primary),
              onPressed: () => _navigate(p['lat'], p['lng']),
              style: IconButton.styleFrom(
                backgroundColor: AppColors.primary.withOpacity(0.1),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.location_off_rounded, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 20),
            ElevatedButton(onPressed: _loadNearby, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }

  Widget _buildSidebarFooter() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.grey.shade100)),
      ),
      child: SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: () {
            Navigator.pop(context); // Close drawer
            Provider.of<NavigationProvider>(context, listen: false).setTab(3);
          },
          icon: const Icon(Icons.map_rounded, size: 18),
          label: const Text('View Full Map'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
    );
  }
}

