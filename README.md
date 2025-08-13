# 🐙 Qase - Jira - Tampermonkey

A nerdy Tampermonkey userscript for Jira Cloud that scrapes Qase test plans and linked test cases from Jira issue pages — then builds a test run on Qase, associating it back to the Jira issue.  

---

## 📦 What It Does

- Adds a **"✈️ Aviator"** button to your Jira issue pages.
- Scrapes all `https://app.qase.io/plan/PROJECT/ID` links from the page text and links.
- Fetches the associated Qase test plan names and test case IDs.
- Grabs any Qase cases linked to the Jira issue via the API.
- Presents a clean popup UI where you can:
  - Enter a test run title.
  - Select which test plans and individual cases to include.
  - Select which TeamCity builds to associate to the test run and queue.
- Creates a Qase test run with the selected items.
- Associates the new run with the current Jira issue.
- Queues TeamCity builds with env.QASE_RUN_ID parameter set.
- Reloads the Jira page with success feedback.

---

## 🖥️ Install via Tampermonkey

1. Install Tampermonkey: https://www.tampermonkey.net/
2. Create a new script.
3. Copy contents of script.
4. Update with your tokens.
5. Save.
6. Reload your Jira issue page — you'll see a **"✈️ Aviator"** button next to the **Create** button.

```javascript
// ==UserScript==
// @name         aviator
// @namespace    http://tampermonkey.net/
// @version      1.1.3
// @description  Scrape Qase plans + cases from Jira page and build test runs
// @match        https://paylocity.atlassian.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.qase.io
// @connect      ci.paylocity.com
// @require      https://raw.githubusercontent.com/jrockefeller/utility-qase-jira-tampermonkey/refs/heads/main/aviator.js
// ==/UserScript==


(() => {
    // Local config or secrets — these are **not** exposed in the @require file
    window.aviator = {
        qase: {
            token: 'YOUR_QASE_PERSONAL_ACCESS_TOKEN',
            projectCode: 'YOUR_PROJECT_CODE'
        },
        teamcity: {
            token: 'YOUR_TEAMCITY_TOKEN',
            builds: [
               'ARRAY_OF_BUILD_IDS',
            ]
        }
    };

    // Optionally signal that setup is done
    console.log('Config initialized for My Modular Script');
})();
```

---

## 🛠️ Developer Mode Setup

To ensure the script runs correctly in development environments:

### Enable Extension Settings (Chrome)

1. Go to `chrome://extensions/`.
2. Enable the **Developer mode** toggle (top right).
3. Locate **Tampermonkey**, click **Details**.
4. Scroll down and ensure that **Allow User Scripts** is enabled.

> These settings help ensure Tampermonkey can interact fully with Jira and Qase in a local or dev setup.

---

## 📝 Update Required Variables to Run

Script needs Qase API token and Project Code to run:

### Qase Setup
- Generate a `personal access token` in Qase.
- Replace `YOUR_QASE_PERSONAL_ACCESS_TOKEN` with your Qase token.
- Replace `YOUR_PROJECT_CODE` with your Qase project code (e.g., "DEMOS").

### TeamCity Setup (optional)
- Generate a TeamCity token for API access.
- Replace `YOUR_TEAMCITY_TOKEN ` with your Qase token.
- Add one or more build IDs to the builds array.
