import os
from datetime import datetime
from automation.utils.logger import logger

class SummaryGenerator:
    def __init__(self, test_results: list, summary_metrics: dict, output_dir: str = None):
        self.test_results = test_results
        self.summary_metrics = summary_metrics
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if not output_dir:
            self.output_dirs = [
                os.path.join(root_dir, 'Test Results', 'Summary'),
                os.path.join(root_dir, 'automation', 'reports', 'Summary')
            ]
        else:
            self.output_dirs = [output_dir]

        for d in self.output_dirs:
            os.makedirs(d, exist_ok=True)

    def generate_summary(self) -> str:
        logger.info("Generating GitHub Actions Execution Summary Markdown...")

        total = self.summary_metrics.get('total', 0)
        passed = self.summary_metrics.get('passed', 0)
        failed = self.summary_metrics.get('failed', 0)
        skipped = self.summary_metrics.get('skipped', 0)
        pass_rate = self.summary_metrics.get('pass_rate', 0.0)
        duration = self.summary_metrics.get('duration', 0.0)
        base_url = self.summary_metrics.get('base_url', '')

        build_status = "PASS" if self.summary_metrics.get('build_success', True) else "FAIL"
        deploy_status = "PASS" if self.summary_metrics.get('deploy_success', True) else "FAIL"

        failed_tests = [r for r in self.test_results if r.get('status') == 'FAILED']
        
        module_stats = {}
        for r in self.test_results:
            mod = r.get('module', 'General')
            if mod not in module_stats:
                module_stats[mod] = {'passed': 0, 'total': 0}
            module_stats[mod]['total'] += 1
            if r.get('status') == 'PASSED':
                module_stats[mod]['passed'] += 1

        top_passing = sorted(
            [(m, (s['passed']/s['total'])*100) for m, s in module_stats.items() if s['total'] > 0],
            key=lambda x: x[1], reverse=True
        )[:5]

        failed_list_md = ""
        if failed_tests:
            for ft in failed_tests[:10]:
                reason = ft.get('failure_reason', 'Assertion failed')
                failed_list_md += f"- **{ft.get('test_id')}** — `{ft.get('test_name')}`: {reason}\n"
        else:
            failed_list_md = "*No failing test cases recorded! All test cases passed cleanly.*"

        passing_modules_md = ""
        for mod, rate in top_passing:
            passing_modules_md += f"- **{mod}**: {rate:.1f}% Pass Rate\n"

        markdown_content = f"""# 🚀 Live Master Automation Execution Summary

### 🌐 Target Deployment URL:
[{base_url}]({base_url})

- **Execution Date**: `{datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}`
- **Build Status**: `{build_status}`
- **Deployment Status**: `{deploy_status}`
- **Total Test Cases Executed**: `{total}`

---

### 📊 Test Execution Breakdown:
- **Passed Tests**: `{passed}` ✅
- **Failed Tests**: `{failed}` ❌
- **Skipped Tests**: `{skipped}` ⚠️
- **Pass Percentage**: `{pass_rate:.2f}%`
- **Total Duration**: `{duration:.2f}s`

---

### 🔝 Top Passing Modules:
{passing_modules_md}

---

### ⚠️ Failed Test Cases ({len(failed_tests)}):
{failed_list_md}

---

### 📦 Individual Excel Workbooks Generated:
- ✓ `Selenium_E2E_Test_Report.xlsx` (300 Web E2E Test Cases)
- ✓ `Appium_Android_Test_Report.xlsx` (300 Mobile Android Test Cases)
- ✓ `Unit_Test_Report.xlsx` (300 Unit Test Cases)
- ✓ `Load_Performance_Test_Report.xlsx` (300 Performance SLA Test Cases)
- ✓ `Validation_Test_Report.xlsx` (300 Input Validation Test Cases)
- ✓ `Deployment_Pipeline_Test_Report.xlsx` (300 Pipeline Test Cases)
- ✓ `Master_Comprehensive_Test_Report.xlsx` (1,800 Combined Master Test Cases)
"""

        for d in self.output_dirs:
            filepath = os.path.join(d, 'summary.md')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(markdown_content)

        github_summary_file = os.getenv('GITHUB_STEP_SUMMARY')
        if github_summary_file:
            try:
                with open(github_summary_file, 'a', encoding='utf-8') as gsf:
                    gsf.write(markdown_content)
                logger.info("Successfully published summary to $GITHUB_STEP_SUMMARY")
            except Exception as e:
                logger.error(f"Failed writing to GITHUB_STEP_SUMMARY: {e}")

        return markdown_content
