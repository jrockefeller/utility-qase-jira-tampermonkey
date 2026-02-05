# 🐙 Qase - Jira - Tampermonkey

A nerdy Tampermonkey userscript for Jira Cloud that scrapes Qase test plans and linked test cases from Jira issue pages — then builds a test run on Qase, associating it back to the Jira issue.  

---

## 📦 What It Does

- Adds a **"✈️ Aviator"** button to your Jira issue pages.
- Scrapes all `https://app.qase.io/plan/PROJECT/ID` links from the page text and links.
- Fetches the associated Qase test plan names and test case IDs.
- Grabs any Qase cases linked to the Jira issue via the API.
- Presents a clean popup UI where you can:
  - Select Test Run title and options.
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
// @name         Aviator
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Scrape Qase plans + cases from Jira page and build test runs
// @match        https://paylocity.atlassian.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.qase.io
// @connect      ci.paylocity.com
// @connect      raw.githubusercontent.com
// @connect      hooks.slack.com
// ==/UserScript==

(async () => {
    // --- User local config ---
    window.aviator = {
        qase: {
            token: '<your qase token>',
            projectCode: '<qase project>',
            title: '{issueKey}: {issueTitle}',
            options: {
                environment: true,
                milestone: false,
                configurations: false
            }
        },
        /*
        teamcity: {
            token: '<REPLACE WITH YOUR OWN TEAMCITY TOKEN>',
            builds: [
                '<YOUR TEAMCITY BUILDS - IF YOU HAVE NONE TO INTEGRATE THEN IGNORE THIS SECTION>'
            ],
            parameters: [
                { name: 'THE_PARAMETER', value: 'wooooooooooooo' }
            ]
        }
        */
    };

    /* 
    // If you need to handle multiple jira projects that associated to different qase projects. Then update the if statements inside of the match block.
    const _url = window.location.href;
    const match = _url.match(/paylocity\.atlassian\.net\/(?:browse\/([A-Z0-9]+)-|jira\/software\/c\/projects\/([A-Z0-9]+)\/)/);

    if (match) {
        const jiraProject = match[1] || match[2];
        if (jiraProject == 'CM') {
            window.aviator.qase.projectCode = 'CM';
        }
        else if (jiraProject == 'PE') {
            window.aviator.qase.projectCode = 'DEMOS';
        }
    }
    */


    // ----------------------------------------------------
    // DO NOT UPDATE BELOW THIS LINE
    // ----------------------------------------------------
    // --- STEP 2: Try to fetch latest core from GitHub ---
    const STORAGE_KEY = "aviator.cachedCode";
    const STORAGE_TIME_KEY = "aviator.cachedTime";
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
    const url = "https://raw.githubusercontent.com/jrockefeller/utility-qase-jira-tampermonkey/main/aviator.js";
    let latestCode = null;
    let useCache = false;
    try {
        const res = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url,
                nocache: true,
                onload: response => resolve(response),
                onerror: err => reject(err)
            });
        });
        if (res.status === 200 && res.responseText) {
            latestCode = res.responseText;
            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, latestCode);
            localStorage.setItem(STORAGE_TIME_KEY, Date.now().toString());
            console.log(":white_check_mark: Aviator core updated from GitHub:", url);
        } else {
            throw new Error("Bad status " + res.status);
        }
    } catch (e) {
        console.warn(":warning: Could not fetch Aviator core, falling back to cache:", e);
        useCache = true;
    }
    // --- STEP 3: Fallback to cached version if needed ---
    if (!latestCode) {
        const cachedCode = localStorage.getItem(STORAGE_KEY);
        const cachedTime = localStorage.getItem(STORAGE_TIME_KEY);
        if (cachedCode) {
            latestCode = cachedCode;
            console.log(":package: Loaded Aviator core from cache (age: " +
                ((Date.now() - cachedTime) / 1000 / 60).toFixed(1) + " min)");
        } else {
            console.error(":x: No Aviator core available (network + cache failed).");
            return;
        }
    }
    // --- STEP 4: Run Aviator core in page context ---
    try {
        eval(latestCode);
        console.log(":white_check_mark: Aviator core executed in Tampermonkey sandbox");
    } catch (e) {
        console.error(":x: Failed to execute Aviator core:", e);
    }
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
| **teamcity** | `parameters` | ❌      | Optional environment parameters to send with teamcity build trigger |

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
| `parameters`   | string[] | ❌       | List of TeamCity parameters to send with the build. |

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
        ],
        parameters: [
            { name: 'my_parameter': value: '12345' }
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