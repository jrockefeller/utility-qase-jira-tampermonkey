// ==UserScript==
// @name         Jira Qase Scrape and Run
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  Scrape Qase plans + cases from Jira page and build test runs
// @match        https://paylocity.atlassian.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.qase.io
// ==/UserScript==

GM_addStyle(`
@media (prefers-color-scheme: dark) {
    #qasePopup {
        background: #1e1e1e !important;
        color: #f0f0f0 !important;
    }
    #qasePopup input[type="text"] {
        background-color: #2b2b2b;
        color: #f0f0f0;
        border: 1px solid #444;
    }
    #qasePopup h2, #qasePopup h3 {
        color: #ffffff;
    }
    #qasePopup label {
        color: #dddddd;
    }
    #qasePopup button {
        background-color: #333 !important;
        color: #fff !important;
        border: 1px solid #555;
    }
    #qasePopup button#qaseRunBtn {
        background-color: #0a84ff !important;
    }
    #qasePopupOverlay {
        background-color: rgba(0, 0, 0, 0.8) !important;
    }
}
`);

(function () {
    'use strict';

    // == Utilities ==

    function getToken() {
        return window.seagull.qase.token;
    }

    function checkToken() {
        const token = getToken();
        if (!token) {
            alert('⚠️ No Qase API token set. Use the Tampermonkey menu to set it.');
            return false;
        }
        return true;
    }

    function getProjectCode() {
        return window.seagull.qase.projectCode;
    }

    function checkProjectCode() {
        const code = getProjectCode();
        if (!code) {
            alert('⚠️ No Qase Project Code set. Use the Tampermonkey menu to set it.');
            return false;
        }
        return true;
    }

    //const QASE_TOKEN = '25dac2c7eddb794133fab8ea091db53983be7b0bf2a70528977a47f3360a04a7';
    //const projectCode = 'WKFL'; // or grab from first plan/projectCode in plans if dynamic

    function showLoading(message = 'Working...') {
        if (document.getElementById('qaseLoadingOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'qaseLoadingOverlay';
        overlay.style = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
    `;

        const spinner = document.createElement('div');
        spinner.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            color: white;
            font-size: 18px;
            font-family: Arial, sans-serif;
        ">
            <div class="qase-spinner" style="
                border: 4px solid #f3f3f3;
                border-top: 4px solid #0052CC;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: qase-spin 1s linear infinite;
                margin-bottom: 12px;
            "></div>
            ${message}
        </div>
    `;

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);

        // Add CSS animation if not already present
        if (!document.getElementById('qaseSpinnerStyle')) {
            const style = document.createElement('style');
            style.id = 'qaseSpinnerStyle';
            style.textContent = `
            @keyframes qase-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
            document.head.appendChild(style);
        }
    }

    function hideLoading() {
        const overlay = document.getElementById('qaseLoadingOverlay');
        if (overlay) overlay.remove();
    }

    // Add button near Create
    function addQaseButton() {
        const observer = new MutationObserver(() => {
            const createButton = document.querySelector('[data-testid="atlassian-navigation--create-button"]');
            if (createButton && !document.querySelector('#qaseScrapeButton')) {
                const btn = document.createElement('button');
                btn.innerText = "Jrock's Jumping Jamboree";
                btn.id = 'qaseScrapeButton';
                btn.style.marginLeft = '10px';
                btn.className = createButton.className;  // clone Jira's styling
                btn.onclick = scrapeAndShowPopup;

                // Insert our button right after the Create button
                createButton.parentNode.insertBefore(btn, createButton.nextSibling);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function addQaseTopBarButton() {
        const tryInject = () => {
            const jiraHeader = document.getElementById('jira-frontend');
            if (!jiraHeader || document.getElementById('qaseTopBar')) return;

            const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

            const bar = document.createElement('div');
            bar.id = 'qaseTopBar';
            bar.style = `
            width: 100%;
            background: ${isDarkMode ? '#1f1f21' : '#0052CC'};  /* pale pink in dark mode */
            color: ${isDarkMode ? '#a9abaf' : 'white'};          /* dark red text for pink bg */
            padding: 8px 16px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        `;

            const label = document.createElement('span');
            label.textContent = 'Qase Tools:';

            const btn = document.createElement('button');
            btn.textContent = "🧪 Jrock's Jamboree";
            btn.id = 'qaseScrapeButton';
            btn.style = `
            background: ${isDarkMode ? '#8fb8f6' : 'white'};
            color: ${isDarkMode ? '#1f1f21' : '#0052CC'};
            border: none;
            border-radius: 4px;
            font-size: 14px;
            line-height: 20px;
            font-family: "Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif;
            font-weight: 500;
            padding: 6px 12px;
            cursor: pointer;
        `;
            btn.onclick = scrapeAndShowPopup;

            bar.appendChild(label);
            bar.appendChild(btn);

            jiraHeader.insertBefore(bar, jiraHeader.firstChild);
        };

        // Try immediately
        tryInject();

        // Fallback if not ready
        const observer = new MutationObserver(() => {
            tryInject();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Scrape Qase plan links
    function scrapePlansFromPage() {
        const found = [];

        // 1️⃣ Scrape from innerText
        const textMatches = [...document.body.innerText.matchAll(/https:\/\/app\.qase\.io\/plan\/([^\/]+)\/(\d+)/g)];
        textMatches.forEach(m => {
            found.push(`${m[1]}|${m[2]}`);
        });

        // 2️⃣ Scrape from anchor href attributes
        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            const match = href.match(/^https:\/\/app\.qase\.io\/plan\/([^\/]+)\/(\d+)/);
            if (match) {
                found.push(`${match[1]}|${match[2]}`);
            }
        });

        // 3️⃣ Deduplicate and map to objects
        const unique = [...new Set(found)];
        return unique.map(s => {
            const [projectCode, planId] = s.split('|');
            return { projectCode, planId };
        });
    }

    // Fetch plan details
    function fetchPlan(projectCode, planId) {
        const token = getToken();

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.qase.io/v1/plan/${projectCode}/${planId}`,
                headers: { 'Accept': 'application/json', 'Token': token },
                onload: res => {
                    const data = JSON.parse(res.responseText);
                    const cases = data.result.cases.map(c => c.case_id);
                    resolve({ projectCode: projectCode, title: data.result.title, caseIds: cases });
                }
            });
        });
    }

    // Fetch linked cases from external issue
    function fetchExternalCases(projectCode, issueId) {
        const token = getToken();

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.qase.io/v1/case/${projectCode}?external_issues[type]=jira-cloud&external_issues[ids][]=${issueId}&limit=50`,
                headers: { 'Accept': 'application/json', 'Token': token },
                onload: res => {
                    const data = JSON.parse(res.responseText);
                    const caseItems = data.result.entities.map(e => ({ id: e.id, title: e.title }));
                    resolve(caseItems);
                }
            });
        });
    }

    // Associate the newly created test run to the ticket
    function associateRunWithJira(projectCode, runId) {
        const token = getToken();

        const pathParts = window.location.pathname.split('/');
        const browseIndex = pathParts.indexOf('browse');
        const issueId = browseIndex !== -1 && pathParts.length > browseIndex + 1 ? pathParts[browseIndex + 1] : null;

        if (!issueId) {
            alert('Could not detect Jira issue ID in URL for association.');
            return;
        }

        console.log('Qase: Associating Run ID', runId, 'with Jira issue', issueId);
        showLoading('Associating test run with Jira...');

        GM_xmlhttpRequest({
            method: 'POST',
            url: `https://api.qase.io/v1/run/${projectCode}/external-issue`,
            headers: {
                'Content-Type': 'application/json',
                'Token': token
            },
            data: JSON.stringify({
                type: 'jira-cloud',
                links: [{ run_id: runId, external_issue: issueId }]
            }),
            onload: function (response) {
                hideLoading();
                try {
                    const res = JSON.parse(response.responseText);
                    console.log(`Qase: Jira issue ${issueId} successfully associated with Run ID ${runId}.`);

                    // Conditional behavior
                    const qasePanel = document.querySelector('[data-testid="issue-view-ecosystem.connect.content-panel.qase.jira.cloud__qase-runs"]');
                    if (qasePanel) {
                        location.reload();
                    } else {
                        const appsDropdownBtn = document.querySelector('button[data-testid="issue-view-foundation.quick-add.quick-add-items-compact.apps-button-dropdown--trigger"]');
                        if (appsDropdownBtn) {
                            appsDropdownBtn.click();
                            setTimeout(() => {
                                const qaseButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Qase: runs');
                                if (qaseButton) {
                                    qaseButton.click();
                                } else {
                                    console.warn('Qase button not found after opening dropdown.');
                                }
                            }, 500); // adjust delay as needed
                        } else {
                            console.warn('Apps dropdown button not found.');
                        }
                    }
                } catch (e) {
                    console.error('Error parsing association response:', e);
                }
            },
            onerror: function (err) {
                hideLoading();
                console.error('Error associating Jira issue:', err);
            }
        });
    }

    // Build popup UI
    function showPopup(issueKey, plans, externalCases) {
        const existing = document.getElementById('qasePopupOverlay');
        if (existing) existing.remove();

        if (!plans.length && !externalCases.length) {
            alert('No Qase Test Plans or Cases are part of this ticket');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'qasePopupOverlay';
        overlay.style = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

        const container = document.createElement('div');
        container.id = 'qasePopup';
        container.style = `
        background: #fff;
        padding: 20px 25px;
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        max-width: 600px;
        width: 90%;
        max-height: 80%;
        overflow-y: auto;
        font-family: Arial, sans-serif;
    `;

        let html = `
        <div style="margin-top:0;margin-bottom:16px;">
            <h2>Create Test Run</h2>
            <p>Select combination of test plans and cases to create a test run in Qase and associate to this ticket.</p>
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Test Run Title</label>
            <input type="text" id="qaseRunTitle" value="${issueKey}" style="width:98%; padding:8px; border:1px solid #ccc; border-radius:4px;">
        </div>
    `;

        if (plans.length) {
            html += `<h3 style="margin-top:16px;margin-bottom:10px;">📦 Linked Test Plans</h3>`;
            plans.forEach((p) => {
                html += `<label style="display:block; margin-bottom:8px;">
                <input type="checkbox" class="qase-item" data-type="plan" data-ids="${p.caseIds.join(',')}">
                <strong>${p.title}</strong> <span style="color:#555;">(${p.caseIds.length} Case${p.caseIds.length === 1 ? '' : 's'})</span>
             </label>`;
            });
        }

        if (externalCases.length) {
            html += `<h3 style="margin-top:16px;margin-bottom:10px;">🔗 Linked Test Cases</h3>`;
            externalCases.forEach(item => {
                html += `<label style="display:block; margin-bottom:6px;">
                    <input type="checkbox" class="qase-item" data-type="case" data-ids="${item.id}">#${item.id} - ${item.title}
                 </label>`;
            });
        }

        html += `
        <div style="margin-top:20px; display: flex; justify-content: space-between; align-items: center;">
            <button id="qaseToggleAllBtn" style="padding:6px 12px; background:#F4F5F7; border:1px solid #ccc; border-radius:4px; cursor:pointer;">☑️ Select All</button>
            <div>
                <button id="qaseRunBtn" style="padding:8px 16px; background:#0052CC; color:white; border:none; border-radius:4px; cursor:pointer;">✅ Create Test Run</button>
                <button id="qaseCancelBtn" style="padding:8px 16px; margin-left:8px; background:#ddd; border:none; border-radius:4px; cursor:pointer;">Cancel</button>
            </div>
        </div>
    `;

        container.innerHTML = html;
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        document.getElementById('qaseRunBtn').onclick = () => createTestRun();
        document.getElementById('qaseCancelBtn').onclick = () => overlay.remove();

        const toggleBtn = document.getElementById('qaseToggleAllBtn');
        let allSelected = false;

        toggleBtn.onclick = () => {
            const checkboxes = document.querySelectorAll('.qase-item');
            allSelected = !allSelected;
            checkboxes.forEach(cb => cb.checked = allSelected);
            toggleBtn.textContent = allSelected ? '🚫 Deselect All' : '☑️ Select All';
        };
    }

    // Compile selections and create test run
    function createTestRun() {
        const projectCode = getProjectCode();
        const token = getToken();

        const selected = document.querySelectorAll('.qase-item:checked');
        const allCaseIds = [];

        selected.forEach(item => {
            const ids = item.getAttribute('data-ids').split(',').map(id => parseInt(id));
            allCaseIds.push(...ids);
        });

        if (allCaseIds.length === 0) {
            alert('No test cases selected!');
            return;
        }

        const runTitle = document.getElementById('qaseRunTitle').value.trim() || '';

        if (runTitle === '') {
            alert('No test run title entered!');
            return;
        }

        const options = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Token': token
            },
            body: JSON.stringify({ title: runTitle, cases: allCaseIds })
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: `https://api.qase.io/v1/run/${projectCode}`,
            headers: options.headers,
            data: options.body,
            onload: res => {
                const data = JSON.parse(res.responseText);
                console.log(`Qase: Test Run Created: ${data.result.id}`);
                document.getElementById('qasePopup').remove();
                const existing = document.getElementById('qasePopupOverlay');
                if (existing) existing.remove();

                // associate Jira issue with run ID here
                associateRunWithJira(projectCode, data.result.id);
            }
        });
    }

    // Orchestrator
    async function scrapeAndShowPopup() {
        console.log('[Seagull]', window.seagull)
        if (!checkToken() || !checkProjectCode()) return;

        const projectCode = getProjectCode();

        showLoading('Fetching Qase test data...');
        const plans = scrapePlansFromPage();

        let issueKey = null;
        const matchFromPath = window.location.pathname.match(/\/browse\/([A-Z]+-\d+)/i);
        if (matchFromPath) issueKey = matchFromPath[1];

        const urlParams = new URLSearchParams(window.location.search);
        if (!issueKey && urlParams.has('selectedIssue')) {
            issueKey = urlParams.get('selectedIssue');
        }

        if (!plans.length && !issueKey) {
            hideLoading();
            alert('No Qase plans or Jira issue key found.');
            return;
        }

        //console.log('qase: issue key', issueKey)

        const planDetails = await Promise.all(plans.map(p => fetchPlan(p.projectCode, p.planId)));
        const externalCases = issueKey
            ? await fetchExternalCases(plans[0]?.projectCode || projectCode, issueKey)
            : [];

        hideLoading();
        showPopup(issueKey, planDetails, externalCases);
    }


    function addQaseTools() {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        const createButton = () => {
            const btn = document.createElement('button');
            btn.textContent = "🧪 Jrock's Jamboree";
            btn.id = 'qaseScrapeButton';
            btn.style = `
            background: ${isDarkMode ? '#8fb8f6' : 'white'};
            color: ${isDarkMode ? '#1f1f21' : '#0052CC'};
            border: none;
            border-radius: 4px;
            font-size: 14px;
            line-height: 20px;
            font-family: "Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif;
            font-weight: 500;
            padding: 6px 12px;
            cursor: pointer;
            margin-left: 8px;
        `;
            btn.onclick = scrapeAndShowPopup;
            return btn;
        };

        const insertForModal = () => {
            if (document.querySelector('#qaseScrapeButton')) return;
            const header = document.querySelector('div#jira-issue-header');
            if (!header) return;
            const bar = document.createElement('div');
            bar.id = 'qaseTopBar';
            bar.style = `
            //width: 100%;
            background: ${isDarkMode ? '#1f1f21' : '#0052CC'};
            color: ${isDarkMode ? '#a9abaf' : 'white'};
            padding: 8px 16px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        `;
            const label = document.createElement('span');
            label.textContent = 'Qase Tools:';
            bar.appendChild(label);
            bar.appendChild(createButton());
            header.parentElement.insertBefore(bar, header);
        };

        const insertNextToCreate = () => {
            if (document.querySelector('#qaseScrapeButton')) return;
            const createBtn = document.querySelector('[data-testid="navigation-apps.create"]');
            if (createBtn && createBtn.parentElement) {
                createBtn.parentElement.appendChild(createButton());
            }
        };

        const insertInTicket = () => {
            const observer = new MutationObserver(() => {
                const jiraCreateButton = document.querySelector('[data-testid="atlassian-navigation--create-button"]');
                if (jiraCreateButton && !document.querySelector('#qaseScrapeButton')) {
                    // Insert our button right after the Create button
                    jiraCreateButton.parentNode.insertBefore(createButton(), jiraCreateButton.nextSibling);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        };

        const insertInBacklogSidebar = () => {
            if (document.querySelector('#qaseScrapeButton')) return;
            const statusButton = document.querySelector('button.issue.fields.status-view.status-button');
            if (statusButton && statusButton.parentElement) {
                statusButton.parentElement.appendChild(createButton());
            }
        };

        const handleLocationChange = () => {
            const url = window.location.href;

            if (/\/projects\/[^/]+\/boards\/[^/?]+.*[?&]selectedIssue=/.test(url)) {
                const interval = setInterval(() => {
                    if (document.querySelector('div#jira-issue-header')) {
                        console.log('in insertForModal')
                        insertForModal();
                        clearInterval(interval);
                    }
                }, 500);
            } else if (/\/browse\/[A-Z]+-\d+/.test(url)) {
                const interval = setInterval(() => {
                    if (document.querySelector('div#jira-issue-header')) {
                        console.log('in insertInTicketSidebar')
                        insertInTicket();
                        clearInterval(interval);
                    }
                }, 500);
            } else if (/\/backlog\?.*selectedIssue=/.test(url)) {
                const interval = setInterval(() => {
                    if (document.querySelector('button.issue.fields.status-view.status-button')) {
                        console.log('in insertInBacklogSidebar')
                        insertInBacklogSidebar();
                        clearInterval(interval);
                    }
                }, 500);
            }
        };

        // Observe for SPA navigation changes
        const observeUrlChange = () => {
            let lastUrl = location.href;
            new MutationObserver(() => {
                const currentUrl = location.href;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    setTimeout(handleLocationChange, 500);
                }
            }).observe(document.body, { subtree: true, childList: true });
        };

        // Initial trigger
        handleLocationChange();
        observeUrlChange();
    }

    addQaseTools();

    // Start observing
    //addQaseButton();
    //addQaseTopBarButton();

})();