import os
import json
from datetime import datetime
from automation.utils.logger import logger

class HTMLReportGenerator:
    def __init__(self, test_results: list, summary_metrics: dict, output_dir: str = None):
        self.test_results = test_results
        self.summary_metrics = summary_metrics
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if not output_dir:
            self.output_dirs = [
                os.path.join(root_dir, 'Test Results', 'HTML'),
                os.path.join(root_dir, 'automation', 'reports', 'HTML')
            ]
        else:
            self.output_dirs = [output_dir]

        for d in self.output_dirs:
            os.makedirs(d, exist_ok=True)

    def generate_all_reports(self):
        logger.info("Generating HTML reports (execution-report.html & dashboard.html)...")
        for d in self.output_dirs:
            self.generate_execution_report(d)
            self.generate_dashboard_report(d)
        logger.info(f"HTML reports generated successfully in {self.output_dirs}.")

    def generate_execution_report(self, target_dir: str):
        filepath = os.path.join(target_dir, 'execution-report.html')
        
        total = self.summary_metrics.get('total', 0)
        passed = self.summary_metrics.get('passed', 0)
        failed = self.summary_metrics.get('failed', 0)
        skipped = self.summary_metrics.get('skipped', 0)
        pass_rate = self.summary_metrics.get('pass_rate', 0.0)
        duration = self.summary_metrics.get('duration', 0.0)
        base_url = self.summary_metrics.get('base_url', '')

        rows_html = ""
        for idx, res in enumerate(self.test_results):
            st = res.get('status', 'PASSED')
            badge_cls = "bg-green-500/20 text-green-400 border-green-500/30" if st == 'PASSED' else ("bg-red-500/20 text-red-400 border-red-500/30" if st == 'FAILED' else "bg-yellow-500/20 text-yellow-400 border-yellow-500/30")
            
            fail_detail = ""
            if st == 'FAILED' and res.get('failure_reason'):
                fail_detail = f"""
                <tr class="detail-row hidden bg-slate-900/60" id="detail-{idx}">
                    <td colspan="7" class="p-4 text-xs text-red-300 font-mono">
                        <div class="font-bold text-red-400 mb-1">Failure Reason / Stack Trace:</div>
                        <div class="bg-black/50 p-3 rounded border border-red-500/20 whitespace-pre-wrap">{res.get('failure_reason')}</div>
                    </td>
                </tr>
                """

            click_attr = f'onclick="toggleDetail(\'detail-{idx}\')"' if fail_detail else ''
            
            rows_html += f"""
            <tr class="border-b border-slate-800 hover:bg-slate-800/40 transition cursor-pointer" {click_attr}>
                <td class="p-3 font-semibold text-cyan-400">{res.get('test_id')}</td>
                <td class="p-3 text-slate-300">{res.get('module')}</td>
                <td class="p-3 text-slate-200">{res.get('test_name')}</td>
                <td class="p-3">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold border {badge_cls}">{st}</span>
                </td>
                <td class="p-3 text-slate-400">{round(res.get('duration', 0.0), 2)}s</td>
                <td class="p-3 text-slate-300 font-medium">{res.get('priority', 'P1')}</td>
                <td class="p-3 text-slate-400 text-xs truncate max-w-xs">{res.get('failure_reason', '-')}</td>
            </tr>
            {fail_detail}
            """

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MediNow E2E Execution Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #e2e8f0; }}
        .glass {{ background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }}
    </style>
</head>
<body class="min-h-screen p-6">
    <div class="max-w-7xl mx-auto space-y-6">
        <!-- Header -->
        <div class="glass p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 class="text-2xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
                    MediNow Live E2E Automation Execution Report
                </h1>
                <p class="text-xs text-slate-400 mt-1">Live Target: <a href="{base_url}" target="_blank" class="text-cyan-400 underline font-mono">{base_url}</a> | Executed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            <div class="flex gap-2">
                <a href="dashboard.html" class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-500/20">
                    Executive Dashboard →
                </a>
            </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="glass p-5 rounded-2xl text-center border-l-4 border-l-blue-500">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tests</p>
                <p class="text-3xl font-extrabold text-slate-100 mt-1">{total}</p>
            </div>
            <div class="glass p-5 rounded-2xl text-center border-l-4 border-l-green-500">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Passed</p>
                <p class="text-3xl font-extrabold text-green-400 mt-1">{passed}</p>
            </div>
            <div class="glass p-5 rounded-2xl text-center border-l-4 border-l-red-500">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed</p>
                <p class="text-3xl font-extrabold text-red-400 mt-1">{failed}</p>
            </div>
            <div class="glass p-5 rounded-2xl text-center border-l-4 border-l-yellow-500">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Skipped</p>
                <p class="text-3xl font-extrabold text-yellow-400 mt-1">{skipped}</p>
            </div>
            <div class="glass p-5 rounded-2xl text-center border-l-4 border-l-cyan-500 col-span-2 md:col-span-1">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pass Rate</p>
                <p class="text-3xl font-extrabold text-cyan-400 mt-1">{pass_rate:.1f}%</p>
            </div>
        </div>

        <!-- Filter & Search -->
        <div class="glass p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
            <div class="flex gap-2">
                <button onclick="filterStatus('ALL')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200">All ({total})</button>
                <button onclick="filterStatus('PASSED')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">Passed ({passed})</button>
                <button onclick="filterStatus('FAILED')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">Failed ({failed})</button>
            </div>
            <input type="text" id="searchInput" onkeyup="searchTable()" placeholder="Search test name or ID..." class="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-64">
        </div>

        <!-- Test Results Table -->
        <div class="glass rounded-2xl overflow-hidden shadow-2xl">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs" id="resultsTable">
                    <thead class="bg-slate-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                            <th class="p-3">Test ID</th>
                            <th class="p-3">Module</th>
                            <th class="p-3">Test Name</th>
                            <th class="p-3">Status</th>
                            <th class="p-3">Duration</th>
                            <th class="p-3">Priority</th>
                            <th class="p-3">Details / Failure Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows_html}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        function toggleDetail(id) {{
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden');
        }}

        function filterStatus(status) {{
            const rows = document.querySelectorAll('#resultsTable tbody tr:not(.detail-row)');
            rows.forEach(r => {{
                const badge = r.querySelector('span').innerText.trim();
                if (status === 'ALL' || badge === status) {{
                    r.style.display = '';
                }} else {{
                    r.style.display = 'none';
                }}
            }});
        }}

        function searchTable() {{
            const input = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#resultsTable tbody tr:not(.detail-row)');
            rows.forEach(r => {{
                const text = r.innerText.toLowerCase();
                r.style.display = text.includes(input) ? '' : 'none';
            }});
        }}
    </script>
</body>
</html>
"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)

    def generate_dashboard_report(self, target_dir: str):
        filepath = os.path.join(target_dir, 'dashboard.html')

        total = self.summary_metrics.get('total', 0)
        passed = self.summary_metrics.get('passed', 0)
        failed = self.summary_metrics.get('failed', 0)
        skipped = self.summary_metrics.get('skipped', 0)
        pass_rate = self.summary_metrics.get('pass_rate', 0.0)
        duration = self.summary_metrics.get('duration', 0.0)
        base_url = self.summary_metrics.get('base_url', '')

        module_stats = {}
        for r in self.test_results:
            mod = r.get('module', 'General')
            if mod not in module_stats:
                module_stats[mod] = {'passed': 0, 'failed': 0, 'skipped': 0}
            st = r.get('status', 'PASSED').lower()
            if st in module_stats[mod]:
                module_stats[mod][st] += 1

        mod_labels = json.dumps(list(module_stats.keys()))
        mod_passed = json.dumps([v['passed'] for v in module_stats.values()])
        mod_failed = json.dumps([v['failed'] for v in module_stats.values()])

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MediNow Executive Test Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #e2e8f0; }}
        .glass {{ background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }}
    </style>
</head>
<body class="min-h-screen p-6">
    <div class="max-w-7xl mx-auto space-y-6">
        <!-- Dashboard Header -->
        <div class="glass p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 class="text-2xl font-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Executive Automation Dashboard
                </h1>
                <p class="text-xs text-slate-400 mt-1">Live Environment: <span class="text-cyan-400 font-mono">{base_url}</span></p>
            </div>
            <div class="flex gap-2">
                <a href="execution-report.html" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition">
                    ← Full Test Details
                </a>
            </div>
        </div>

        <!-- Key Metrics Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="glass p-5 rounded-2xl border-t-4 border-t-cyan-500">
                <span class="text-xs font-semibold text-slate-400 uppercase">Quality Score</span>
                <div class="text-3xl font-black text-cyan-400 mt-2">{pass_rate:.1f}%</div>
                <p class="text-[10px] text-slate-400 mt-1">Target Threshold: ≥ 95.0%</p>
            </div>
            <div class="glass p-5 rounded-2xl border-t-4 border-t-green-500">
                <span class="text-xs font-semibold text-slate-400 uppercase">Passed Test Cases</span>
                <div class="text-3xl font-black text-green-400 mt-2">{passed} / {total}</div>
                <p class="text-[10px] text-slate-400 mt-1">100% Executed</p>
            </div>
            <div class="glass p-5 rounded-2xl border-t-4 border-t-red-500">
                <span class="text-xs font-semibold text-slate-400 uppercase">Defects Detected</span>
                <div class="text-3xl font-black text-red-400 mt-2">{failed}</div>
                <p class="text-[10px] text-slate-400 mt-1">Critical Defect Threshold: 5%</p>
            </div>
            <div class="glass p-5 rounded-2xl border-t-4 border-t-indigo-500">
                <span class="text-xs font-semibold text-slate-400 uppercase">Total Execution Time</span>
                <div class="text-3xl font-black text-indigo-400 mt-2">{duration:.1f}s</div>
                <p class="text-[10px] text-slate-400 mt-1">Parallel Master Suite</p>
            </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Overall Status Doughnut Chart -->
            <div class="glass p-6 rounded-2xl flex flex-col items-center">
                <h3 class="text-sm font-bold text-slate-300 mb-4">Overall Test Status Distribution</h3>
                <div class="w-64 h-64">
                    <canvas id="statusChart"></canvas>
                </div>
            </div>

            <!-- Module Breakdown Bar Chart -->
            <div class="glass p-6 rounded-2xl flex flex-col items-center">
                <h3 class="text-sm font-bold text-slate-300 mb-4">Module-Wise Pass vs Fail Comparison</h3>
                <div class="w-full h-64">
                    <canvas id="moduleChart"></canvas>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Doughnut Chart
        new Chart(document.getElementById('statusChart'), {{
            type: 'doughnut',
            data: {{
                labels: ['Passed', 'Failed', 'Skipped'],
                datasets: [{{
                    data: [{passed}, {failed}, {skipped}],
                    backgroundColor: ['#22c55e', '#ef4444', '#eab308'],
                    borderWidth: 0
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{ position: 'bottom', labels: {{ color: '#94a3b8', font: {{ family: 'Inter' }} }} }}
                }}
            }}
        }});

        // Bar Chart
        new Chart(document.getElementById('moduleChart'), {{
            type: 'bar',
            data: {{
                labels: {mod_labels},
                datasets: [
                    {{ label: 'Passed', data: {mod_passed}, backgroundColor: '#22c55e' }},
                    {{ label: 'Failed', data: {mod_failed}, backgroundColor: '#ef4444' }}
                ]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                scales: {{
                    x: {{ stacked: true, ticks: {{ color: '#94a3b8' }} }},
                    y: {{ stacked: true, ticks: {{ color: '#94a3b8' }} }}
                }},
                plugins: {{
                    legend: {{ position: 'bottom', labels: {{ color: '#94a3b8' }} }}
                }}
            }}
        }});
    </script>
</body>
</html>
"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
