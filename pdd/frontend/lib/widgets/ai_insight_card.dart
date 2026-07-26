import 'package:flutter/material.dart';

class AiInsightCard extends StatelessWidget {
  final List<dynamic> insights;
  final String riskLevel;
  final String riskColor;

  const AiInsightCard({
    super.key,
    required this.insights,
    required this.riskLevel,
    required this.riskColor,
  });

  Color get _riskBgColor {
    switch (riskColor) {
      case 'green':
        return const Color(0xFF00C896).withOpacity(0.12);
      case 'orange':
        return const Color(0xFFFF9800).withOpacity(0.12);
      case 'red':
        return const Color(0xFFFF5252).withOpacity(0.12);
      default:
        return Colors.grey.shade100;
    }
  }

  Color get _riskFgColor {
    switch (riskColor) {
      case 'green':
        return const Color(0xFF00C896);
      case 'orange':
        return const Color(0xFFFF9800);
      case 'red':
        return const Color(0xFFFF5252);
      default:
        return Colors.grey;
    }
  }

  IconData get _riskIcon {
    switch (riskColor) {
      case 'green':
        return Icons.shield_outlined;
      case 'orange':
        return Icons.warning_amber_rounded;
      case 'red':
        return Icons.dangerous_outlined;
      default:
        return Icons.info_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF0D47A1).withOpacity(0.06),
            const Color(0xFF42A5F5).withOpacity(0.04),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFF42A5F5).withOpacity(0.15),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF1565C0).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Color(0xFF1565C0),
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'AI Health Insights',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: Color(0xFF1565C0),
                ),
              ),
              const Spacer(),
              // Risk badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _riskBgColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_riskIcon, color: _riskFgColor, size: 13),
                    const SizedBox(width: 4),
                    Text(
                      '$riskLevel Risk',
                      style: TextStyle(
                        color: _riskFgColor,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (insights.isNotEmpty) ...[
            const SizedBox(height: 16),
            ...insights.take(3).map((insight) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.circle,
                    size: 6,
                    color: Color(0xFF42A5F5),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      insight.toString(),
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF37474F),
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            )),
          ] else ...[
            const SizedBox(height: 12),
            const Text(
              'Log your first dose to get personalized AI insights.',
              style: TextStyle(color: Colors.grey, fontSize: 13),
            ),
          ],
        ],
      ),
    );
  }
}
