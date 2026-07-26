# 💻 Local Execution Guide — MediNow E2E Selenium Automation

This guide provides instructions for configuring and executing the **400+ Selenium E2E Test Suite** locally on your workstation.

---

## 📋 Prerequisites

1. **Python**: 3.10 or higher
2. **Google Chrome**: Latest stable version installed
3. **Node.js & npm**: Node 18+ (for building the web app locally if desired)

---

## 🛠️ Step-by-Step Local Setup

### 1. Clone Repository & Install Python Dependencies

```bash
cd e:\Medicine
pip install -r automation/requirements.txt
```

### 2. Configure Environment Variables (Optional)

By default, the framework executes against the live GitHub Pages URL:
`BASE_URL=https://charan5287.github.io/pdd/`

You can override variables in `automation/config/test_config.ini` or set environment variables:

```bash
# Windows PowerShell
$env:BASE_URL="https://charan5287.github.io/pdd/"
$env:HEADLESS="true"

# Linux / macOS
export BASE_URL="https://charan5287.github.io/pdd/"
export HEADLESS="true"
```

---

## 🚀 Running the Automated Test Suite

To run the deployment health check and full 400+ Selenium E2E test suite:

```bash
python automation/run_tests.py
```

### Headful Mode (Visual Browser Execution)

If you wish to see Chrome execute the tests visually on screen:

```bash
# PowerShell
$env:HEADLESS="false"
python automation/run_tests.py
```

---

## 📊 Viewing Generated Test Reports

After execution completes, all multi-format reports and artifacts will be generated in `Test Results/`:

- **Excel Reports**: `Test Results/Excel/Automation_Test_Report.xlsx` (6 custom sheets)
- **HTML Dashboards**: Open `Test Results/HTML/execution-report.html` or `dashboard.html` in your web browser.
- **JSON Data**: `Test Results/JSON/execution-results.json`
- **Markdown Summary**: `Test Results/Summary/summary.md`
- **Screenshots & Logs**: Captured under `automation/screenshots/` and `automation/logs/`.
