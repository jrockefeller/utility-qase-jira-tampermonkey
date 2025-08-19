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
    **Enable Extenstion Settings**
    - Go to `chrome://extensions/`.
    - Enable the **Developer mode** toggle (top right).
    - Locate **Tampermonkey**, click **Details**.
    - Scroll down and ensure that **Allow User Scripts** is enabled.
2. Open TamperMonkey > Create a new script.
3. Copy contents of user script below.
4. Update with your tokens (see sections to generate tokens).
5. Save.
6. Load a selected Jira Issue — you'll see a **"✈️ Aviator"** button.
    - Selected issue on board — top of modal.
    - Selected issue on backlog — top of issue pane.
    - Issue in own page — next to the **Create** button.

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

# Aviator Configuration

The script reads its configuration from the global `window.aviator` object.

---

## 📋 Required Variables Summary

| Section   | Property       | Required | Description |
|-----------|----------------|----------|-------------|
| **qase**  | `token`        | ✅       | API token for authenticating with Qase. |
| **qase**  | `projectCode`  | ✅       | Project code in Qase (e.g., `DEMOS`). |
| **qase**  | `title`        | ❌       | Custom run title template with token substitution. |
| **qase**  | `options`        | ❌       | Options to display test run options for environment, milestones, configurations. |
| **teamcity** | `token`     | ❌       | API token for authenticating with TeamCity (only required if using TeamCity integration). |
| **teamcity** | `builds`    | ❌       | Array of TeamCity configuration build IDs to trigger. |

---

### **`qase`** (Required)
Configuration for Qase test management integration.

| Property      | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `token`       | string | ✅       | API token for authenticating with Qase. |
| `projectCode` | string | ✅       | Project code in Qase (e.g., `DEMOS`). |
| `title`       | string | ❌       | Optional run title template. Supports token substitution (see **Title Tokens** below). If omitted, a default title is used. |
| `options.environment` | string | ❌       | Test Run Option. Displays setup Qase Environments. |
| `options.milestone` | string | ❌       | Test Run Option. Displays setup Qase Milestones. |
| `options.configurations` | string | ❌       | Test Run Option. Displays setup Qase Test Run Configurations. |


**Title Tokens**
| Token          | Replaced With    |
|----------------|------------------|
| `{issueKey}`   | Jira issue key   |
| `{issueTitle}` | Jira issue title |

**Example – Qase only**
```javascript
window.aviator = {
    qase: {
        token: 'your-qase-api-token',
        projectCode: 'DEMOS'
    }
};
```
**Example – Qase with custom title**
```javascript
window.aviator = {
    qase: {
        token: 'your-qase-api-token',
        projectCode: 'DEMOS',
        title: '{issueKey} Smoke Tests - {issueTitle}'
    }
};
```
**Example – Qase with options**
```javascript
window.aviator = {
    qase: {
        token: 'your-qase-api-token',
        projectCode: 'DEMOS',
        title: '{issueKey} Smoke Tests - {issueTitle}'
        options: {
          environment: true,
          milestone: false,
          configurations: true
        }
    }
};
```
---

### **`teamcity`** (Optional)
Configuration for triggering TeamCity builds.

| Property       | Type     | Required | Description |
|----------------|----------|----------|-------------|
| `token`        | string   | ❌       | API token for authenticating with TeamCity. Required only if using TeamCity integration. |
| `builds`       | string[] | ❌       | List of TeamCity configuration build IDs to trigger. Example: `["Cypress_SampleProject_TinSingleTestExample"]`. |

**Example – Qase + TeamCity**
```javascript
window.aviator = {
    qase: {
        token: 'your-qase-api-token',
        projectCode: 'DEMOS'
    },
    teamcity: {
        token: 'your-teamcity-api-token',
        builds: [
            'Cypress_SampleProject_TinSingleTestExample',
            'Cypress_SampleProject_AnotherBuild'
        ]
    }
};
```
---

## 📝 Update Required Variables to Run

Script needs Qase API token and Project Code to run:
### Qase Setup
- Generate a `personal access token` in Qase.
    - Click profile icon (upper right corner).
    - Select `Profile` link
    - Select `API Tokens` link
    - Create a new API token
- Replace `YOUR_QASE_PERSONAL_ACCESS_TOKEN` with your Qase token.
- Replace `YOUR_PROJECT_CODE` with your Qase project code (e.g., "DEMOS").

### TeamCity Setup (optional)
- Generate a TeamCity token for API access.
    - Click profile icon (upper right corner).
    - Select `Profile` link
    - Select `Access Tokens` link
    - Create access token
- Replace `YOUR_TEAMCITY_TOKEN ` with your Qase token.
- Add one or more build IDs to the builds array.
