# 🔧 Troubleshooting Guide — MediNow E2E Automation & CI/CD

This guide provides solutions for common issues encountered during local execution or GitHub Actions workflow runs.

---

## 🔍 Common Issues & Solutions

### 1. GitHub Pages Returns 404 Not Found

- **Symptom**: `verify_deployment.py` reports HTTP 404 when pinging `https://charan5287.github.io/pdd/`.
- **Cause**: GitHub Pages is not enabled or source is not set to GitHub Actions.
- **Fix**: Navigate to `https://github.com/charan5287/pdd/settings/pages`, select **GitHub Actions** under Source, and trigger the workflow manually.

---

### 2. Selenium `WebDriverException: chrome not reachable`

- **Symptom**: Headless Chrome fails to launch in GitHub Actions runner.
- **Cause**: Missing Chrome binary flags or sandbox permissions.
- **Fix**: `DriverFactory` automatically includes `--no-sandbox`, `--disable-dev-shm-usage`, and `--headless=new`. Ensure `google-chrome-stable` is installed in the runner.

---

### 3. Asset Loading Failures (CSS/JS 404s on GitHub Pages)

- **Symptom**: Main index page loads, but styling or interactivity is missing.
- **Cause**: Absolute base path `/` instead of relative base path `./`.
- **Fix**: Verify `base: './'` is configured in [web_app/vite.config.js](file:///e:/Medicine/web_app/vite.config.js).

---

### 4. Excel Workbook Write Permissions or OpenPyXL Import Error

- **Symptom**: `ModuleNotFoundError: No module named 'openpyxl'`.
- **Fix**: Run `pip install -r automation/requirements.txt`.

---

### 5. Workflow Fails due to Pass Rate < 95%

- **Symptom**: Step `Run Selenium E2E Tests` exits with code 1.
- **Fix**: Inspect `Test Results/HTML/execution-report.html` or `Failed_Test_Cases.xlsx` to review specific failure tracebacks and screenshots.
