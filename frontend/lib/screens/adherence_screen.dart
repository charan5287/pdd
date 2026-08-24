import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/adherence_provider.dart';
import '../theme/app_colors.dart';
import '../widgets/adherence_ring.dart';
import '../widgets/weekly_chart.dart';
import '../widgets/ai_insight_card.dart';
import 'doctor_summary_screen.dart';
import '../services/cloud_service.dart';
import '../services/api_service.dart';
import 'package:intl/intl.dart';

class AdherenceScreen extends StatefulWidget {
  const AdherenceScreen({super.key});

  @override
  State<AdherenceScreen> createState() => _AdherenceScreenState();
}

class _AdherenceScreenState extends State<AdherenceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  void _load() {
    final String? uid =
        Provider.of<AuthProvider>(context, listen: false).user?['uid'] as String?;
    if (uid != null) {
      Provider.of<AdherenceProvider>(context, listen: false)
          .loadAdherence(uid);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showLogSymptomDialog() {
    final symptomController = TextEditingController();
    final notesController = TextEditingController();
    String severity = 'Low';

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialog) => AlertDialog(
          title: const Text('Log Symptom / Side Effect', style: TextStyle(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: symptomController,
                  decoration: const InputDecoration(labelText: 'Symptom (e.g. Headache)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: severity,
                  decoration: const InputDecoration(labelText: 'Severity', border: OutlineInputBorder()),
                  items: ['Low', 'Medium', 'High'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: (v) => setDialog(() => severity = v!),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: notesController,
                  decoration: const InputDecoration(labelText: 'Additional Notes', border: OutlineInputBorder()),
                  maxLines: 2,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (symptomController.text.isNotEmpty) {
                  final auth = Provider.of<AuthProvider>(context, listen: false);
                  final uid = auth.user?['uid']?.toString();
                  await ApiService.saveHealthLog(
                    userId: int.tryParse(uid ?? '') ?? 0,
                    symptom: symptomController.text,
                    severity: severity,
                    notes: notesController.text,
                  );
                  if (mounted) Navigator.pop(context);
                  _load();
                }
              },
              child: const Text('Save Log'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8FF),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showLogSymptomDialog,
        backgroundColor: const Color(0xFF0D47A1),
        icon: const Icon(Icons.add_reaction_outlined, color: Colors.white),
        label: const Text('Log Symptom', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Consumer<AdherenceProvider>(
        builder: (context, adh, _) {
          return CustomScrollView(
            slivers: [
              // App Bar
              SliverAppBar(
                expandedHeight: 0,
                pinned: true,
                backgroundColor: const Color(0xFF0D47A1),
                foregroundColor: Colors.white,
                title: const Text('Adherence Analytics',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.description_outlined),
                    tooltip: 'Doctor Summary',
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const DoctorSummaryScreen()),
                      );
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded),
                    onPressed: _load,
                  ),
                ],
              ),

              if (adh.isLoading)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else ...[
                // Hero summary
                SliverToBoxAdapter(child: _buildHeroSection(adh)),
                // Weekly chart
                SliverToBoxAdapter(child: _buildWeeklySection(adh)),
                // AI Insights
                SliverToBoxAdapter(child: _buildInsightsSection(adh)),
                // Medicine scores
                SliverToBoxAdapter(child: _buildMedicineBreakdown(adh)),
                // Dose counts
                SliverToBoxAdapter(child: _buildDoseCounts(adh)),
                const SliverToBoxAdapter(child: SizedBox(height: 40)),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _buildHeroSection(AdherenceProvider adh) {
    final riskColors = {
      'green': const Color(0xFF00C896),
      'orange': const Color(0xFFFF9800),
      'red': const Color(0xFFFF5252),
    };
    final riskColor = riskColors[adh.riskColor] ?? Colors.grey;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0D47A1), Color(0xFF1976D2)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0D47A1).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          const Text(
            '30-Day Adherence Score',
            style: TextStyle(
                color: Colors.white70,
                fontSize: 14,
                fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 20),
          // Ring on white background
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: AdherenceRing(
              percentage: adh.score,
              size: 140,
              strokeWidth: 14,
              label: 'Adherence',
            ),
          ),
          const SizedBox(height: 20),
          // Risk badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: riskColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: riskColor.withOpacity(0.4), width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  adh.riskLevel == 'Low'
                      ? Icons.check_circle_outline
                      : adh.riskLevel == 'Medium'
                          ? Icons.warning_amber_rounded
                          : Icons.dangerous_outlined,
                  color: riskColor,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Text(
                  '${adh.riskLevel} Adherence Risk',
                  style: TextStyle(
                    color: riskColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWeeklySection(AdherenceProvider adh) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Weekly Trends',
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1A1A2E)),
          ),
          const SizedBox(height: 4),
          Text(
            'Last 7 days adherence breakdown',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 16),
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
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildInsightsSection(AdherenceProvider adh) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Behavioral Insights',
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1A1A2E)),
          ),
          const SizedBox(height: 12),
          AiInsightCard(
            insights: adh.insights,
            riskLevel: adh.riskLevel,
            riskColor: adh.riskColor,
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildMedicineBreakdown(AdherenceProvider adh) {
    if (adh.medicineScores.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Per-Medicine Scores',
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1A1A2E)),
          ),
          const SizedBox(height: 12),
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
            child: Column(
              children: adh.medicineScores.map<Widget>((med) {
                final score = (med['score'] as num).toDouble();
                final color = score >= 80
                    ? const Color(0xFF00C896)
                    : score >= 60
                        ? const Color(0xFFFF9800)
                        : score > 0
                            ? const Color(0xFFFF5252)
                            : Colors.grey;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            med['name'] as String,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          Text(
                            '${score.toStringAsFixed(0)}%',
                            style: TextStyle(
                                color: color,
                                fontWeight: FontWeight.bold,
                                fontSize: 14),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: score / 100,
                          backgroundColor: Colors.grey.shade100,
                          valueColor: AlwaysStoppedAnimation(color),
                          minHeight: 8,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${med['quantity_remaining']} doses • ~${med['days_left']} days left',
                        style: TextStyle(
                            fontSize: 11, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildDoseCounts(AdherenceProvider adh) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          _buildCountCard(
            'Taken',
            adh.dosesTaken.toString(),
            const Color(0xFF00C896),
            Icons.check_circle_outline,
          ),
          const SizedBox(width: 12),
          _buildCountCard(
            'Skipped',
            adh.dosesSkipped.toString(),
            const Color(0xFFFF5252),
            Icons.cancel_outlined,
          ),
          const SizedBox(width: 12),
          _buildCountCard(
            'Total',
            (adh.dosesTaken + adh.dosesSkipped).toString(),
            AppColors.primary,
            Icons.medication_outlined,
          ),
        ],
      ),
    );
  }

  Widget _buildCountCard(
      String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 10,
                offset: const Offset(0, 4))
          ],
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: color),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style:
                  TextStyle(fontSize: 11, color: Colors.grey.shade500),
            ),
          ],
        ),
      ),
    );
  }
}
