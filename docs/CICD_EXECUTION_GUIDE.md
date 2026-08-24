# ⚙️ CI/CD Execution Guide — GitHub Actions Pipeline

This document explains the configuration and operation of the enterprise GitHub Actions pipeline defined in [.github/workflows/deploy-and-test.yml](file:///e:/Medicine/.github/workflows/deploy-and-test.yml).

---

## 🎯 Workflow Objectives

1. Automatically build the React web app on every push / pull request to `main`.
2. Deploy the static build to **GitHub Pages** (`https://charan5287.github.io/pdd/`).
3. Verify live URL availability and asset integrity (HTTP 200 checks).
4. Run **400+ Selenium E2E Test Cases** in headless Chrome against the live URL.
5. Generate Excel, HTML, JSON, and Markdown reports.
6. Upload evidence artifacts and publish an executive summary to GitHub Actions.

---

## 🔑 Required Repository Permissions & Setup

To enable automated deployment to GitHub Pages via GitHub Actions:

1. **GitHub Pages Source**:
   - Go to `Repository Settings -> Pages`.
   - Set **Source** to **GitHub Actions**.

2. **Workflow Permissions**:
   - Go to `Repository Settings -> Actions -> General -> Workflow permissions`.
   - Select **Read and write permissions**.
   - Check **Allow GitHub Actions to create and approve pull requests**.

---

## 🔁 13 Pipeline Stages Breakdown

| Stage # | Stage Name | Action / Tool Used |
|---|---|---|
| **Stage 1** | Repository Checkout | `actions/checkout@v4` |
| **Stage 2** | Setup Environments | `actions/setup-node@v4` & `actions/setup-python@v5` |
| **Stage 3** | Build Application | `npm run build` in `web_app` |
| **Stage 4** | Static Analysis | Asset manifest audit in `web_app/dist` |
| **Stage 5** | Deploy to GitHub Pages | `actions/upload-pages-artifact@v3` & `actions/deploy-pages@v4` |
| **Stage 6** | Wait for Deployment | Propagation delay (15s) |
| **Stage 7** | Deployment Verification | `python automation/utils/verify_deployment.py` |
| **Stage 8** | Run Selenium Tests | `python automation/run_tests.py` |
| **Stage 9** | Report Generation | JSON & HTML dashboard generators |
| **Stage 10**| Generate Excel Reports | `openpyxl` 6-sheet workbook generator |
| **Stage 11**| Upload Artifacts | `actions/upload-artifact@v4` (30-day retention) |
| **Stage 12**| Publish Summary | Write to `$GITHUB_STEP_SUMMARY` |
| **Stage 13**| Store Historical Results | Store execution run JSON in `automation/history/` |

---

## 🛑 Pass / Fail Threshold Rules

- **Workflow Failure Conditions**:
  - Web build fails OR
  - GitHub Pages deployment fails OR
  - Deployment HTTP 200 health check fails OR
  - Critical test case pass percentage falls below **95.0%**.

- **Workflow Success Conditions**:
  - GitHub Pages deployment succeeds AND overall pass percentage is **≥ 95.0%**.
