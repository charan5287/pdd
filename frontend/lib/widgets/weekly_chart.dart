import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

class WeeklyAdherenceChart extends StatelessWidget {
  final List<dynamic> weeklyData;

  const WeeklyAdherenceChart({super.key, required this.weeklyData});

  @override
  Widget build(BuildContext context) {
    if (weeklyData.isEmpty) {
      return const SizedBox(
        height: 140,
        child: Center(
          child: Text(
            'No data yet — log your first dose!',
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
        ),
      );
    }

    return SizedBox(
      height: 140,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: 100,
          minY: 0,
          barTouchData: BarTouchData(
            enabled: true,
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (group) => const Color(0xFF1565C0),
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                final day = weeklyData[groupIndex]['day'] as String;
                final pct = (weeklyData[groupIndex]['percentage'] as num).toDouble();
                return BarTooltipItem(
                  '$day\n${pct.toStringAsFixed(0)}%',
                  const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                );
              },
            ),
          ),
          titlesData: FlTitlesData(
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  final idx = value.toInt();
                  if (idx < 0 || idx >= weeklyData.length) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      weeklyData[idx]['day'] as String,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Colors.grey,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                },
                reservedSize: 24,
              ),
            ),
          ),
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: 50,
            getDrawingHorizontalLine: (value) => FlLine(
              color: Colors.grey.shade100,
              strokeWidth: 1,
            ),
          ),
          borderData: FlBorderData(show: false),
          barGroups: weeklyData.asMap().entries.map((entry) {
            final idx = entry.key;
            final d = entry.value;
            final pct = (d['percentage'] as num).toDouble();
            final color = pct >= 80
                ? const Color(0xFF00C896)
                : pct >= 60
                    ? const Color(0xFFFF9800)
                    : pct > 0
                        ? const Color(0xFFFF5252)
                        : Colors.grey.shade200;
            return BarChartGroupData(
              x: idx,
              barRods: [
                BarChartRodData(
                  toY: pct > 0 ? pct : 4,
                  color: color,
                  width: 26,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(6),
                    topRight: Radius.circular(6),
                  ),
                  backDrawRodData: BackgroundBarChartRodData(
                    show: true,
                    toY: 100,
                    color: Colors.grey.shade100,
                  ),
                ),
              ],
            );
          }).toList(),
        ),
        swapAnimationDuration: const Duration(milliseconds: 800),
        swapAnimationCurve: Curves.easeOutCubic,
      ),
    );
  }
}
