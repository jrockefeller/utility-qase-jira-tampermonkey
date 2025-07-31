# 🐙 Qase - Jira - Tampermonkey

A nerdy Tampermonkey userscript for Jira Cloud that scrapes Qase test plans and linked test cases from Jira issue pages — then builds a test run on Qase, associating it back to the Jira issue.  
Think of it as "Squashing" your Qase chaos. 🐙⚡

---

## 📦 What It Does

- Adds a **"Name TBD"** button to your Jira issue pages.
- Scrapes all `https://app.qase.io/plan/PROJECT/ID` links from the page text and links.
- Fetches the associated Qase test plan names and test case IDs.
- Grabs any Qase cases linked to the Jira issue via the API.
- Presents a clean popup UI where you can:
  - Enter a test run title
  - Select which test plans and individual cases to include
- Creates a Qase test run with the selected items.
- Associates the new run with the current Jira issue.
- Reloads the Jira page with success feedback.

---

## 🖥️ Install via Tampermonkey

1. Install Tampermonkey: https://www.tampermonkey.net/
2. Create a new script.
3. Copy contents of script in link into Tampermonkey [script](url later).
4. Save.
5. Reload your Jira issue page — you'll see a **"Name TBD"** button next to the **Create** button.

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

1. In Qase, generate a **personal access token** (with rights to create test runs and associate with Jira issues).
2. On any Jira page, Tampermonkey will show “1 userscript active.” Click the extension icon to open the script UI.
3. Set the required:
   - ✅ **Qase API Token**
   - ✅ **Qase Project Code**