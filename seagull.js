// ==UserScript==
// @name         Aviator
// @namespace    http://tampermonkey.net/
// @version      1.1.7
// @description  Scrape Qase plans + cases from Jira page and build test runs
// @match        https://paylocity.atlassian.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.qase.io
// @connect      ci.paylocity.com
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
    function getQaseApiToken() {
        return window.seagull.qase.token;
    }

    function checkQaseApiToken() {
        const token = getQaseApiToken();
        if (!token) {
            alert('⚠️ No Qase API token set. Use the Tampermonkey menu to set it.');
            return false;
        }
        return true;
    }

    function getQaseProjectCode() {
        return window.seagull.qase.projectCode;
    }

    function checkQaseProjectCode() {
        const code = getQaseProjectCode();
        if (!code) {
            alert('⚠️ No Qase Project Code set. Use the Tampermonkey menu to set it.');
            return false;
        }
        return true;
    }

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

    function generateTitlePlaceholder(issueKey) {
        let title = window.seagull.qase.title ?? issueKey

        title = title.replace('{issueKey}', issueKey);

        return title;
    }

    // == Qase Functions ==

    /** scrapes Qase plan url text found in Jira issue */
    function scrapeQasePlansFromPage() {
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

    /** calls Qase Api to get plan details with plan qase test ids */
    function fetchQaseTestPlanDetails(projectCode, planId) {
        const token = getQaseApiToken();

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

    /** calls Qase Api to get associated jira ticket qase test ids */
    function fetchQaseTestCases(projectCode, issueId) {
        const token = getQaseApiToken();

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

    /** calls Qase Api to create test run with selected plan tests and associated tests
     * returns runId
    */
    function createQaseTestRun() {
        const projectCode = getQaseProjectCode();
        const token = getQaseApiToken();

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
            onload: async (res) => {
                const data = JSON.parse(res.responseText);
                console.log(`Qase: Test Run Created: ${data.result.id}`);

                // trigger any selected teamcity builds
                await triggerTeamCityBuilds(data.result.id);

                // remove UI popup
                document.getElementById('qasePopup').remove();
                const existing = document.getElementById('qasePopupOverlay');
                if (existing) existing.remove();

                // associate Jira issue with run ID here
                associateQaseTestRunWithJira(projectCode, data.result.id);
            }
        });
    }

    /** Associate the newly created test run to the ticket
     * add Qase: Test runs section in UI
    */
    function associateQaseTestRunWithJira(projectCode, runId) {
        const token = getQaseApiToken();

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

    // == TeamCity Functions ==

    /** calls TeamCity to get csrf token needed to communiticate for auth */
    async function getTeamCityCsrfToken(token) {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://ci.paylocity.com/authenticationTest.html?csrf`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                onload: res => {
                    resolve(res.responseText);
                }
            });
        });
    }

    /** trigger selected teamcity builds */
    async function triggerTeamCityBuilds(runId) {

        const token = window.seagull.teamcity.token;
        const cfsrToken = await getTeamCityCsrfToken(token)
        const builds = document.querySelectorAll('.teamcity-build:checked');

        builds.forEach(b => {
            const buildId = b.dataset.id;

            GM_xmlhttpRequest({
                method: 'POST',
                url: `https://ci.paylocity.com/app/rest/buildQueue`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'X-TC-CSRF-Token': cfsrToken
                },
                data: JSON.stringify({
                    buildType: { id: buildId },
                    properties: {
                        property: [
                            { name: "env.QASE_RUN_ID", value: runId }
                        ]
                    }
                }),
                onload: res => {
                    console.log(`[TeamCity] Build triggered: ${buildId}`);
                },
                onerror: err => {
                    console.error(`[TeamCity] Failed to trigger build ${buildId}`, err);
                }
            });
        });
    }

    async function fetchTeamCityBuildDetails(buildId) {
        const token = window.seagull.teamcity.token;
        const cfsrToken = await getTeamCityCsrfToken(token)

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://ci.paylocity.com/app/rest/buildTypes/id:${buildId}?fields=id,projectId,name,projectName,webUrl,description`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'X-TC-CSRF-Token': cfsrToken
                },
                onload: res => {
                    const data = JSON.parse(res.responseText);

                    resolve(data);
                }
            });
        });
    }

    // == UI Pieces ==

    /** add the button to the page. button click calls scrapeAndShowPopup() */
    function addQaseTools() {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        /** function: creates button to attach to jira page */
        const createButton = () => {
            const btn = document.createElement('button');
            btn.textContent = "✈️ Aviator";
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

        /** function: add button when modal is showing for selected issue */
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

        /** function add button when url is the whole ticket */
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

        /** funciton: add button when in backlog and ticket is selected */
        const insertInBacklogSidebar = () => {
            if (document.querySelector('#qaseScrapeButton')) return;
            const statusButton = document.querySelector('button.issue.fields.status-view.status-button');
            if (statusButton && statusButton.parentElement) {
                statusButton.parentElement.appendChild(createButton());
            }
        };

        /** function: decides where to put the button */
        const handleLocationChange = () => {
            const url = window.location.href;

            if (/\/projects\/[^/]+\/boards\/[^/?]+.*[?&]selectedIssue=/.test(url)) {
                const interval = setInterval(() => {
                    if (document.querySelector('div#jira-issue-header')) {
                        insertForModal();
                        clearInterval(interval);
                    }
                }, 500);
            } else if (/\/browse\/[A-Z]+-\d+/.test(url)) {
                const interval = setInterval(() => {
                    if (document.querySelector('div#jira-issue-header')) {
                        insertInTicket();
                        clearInterval(interval);
                    }
                }, 500);
            } else if (/\/backlog\?.*selectedIssue=/.test(url)) {
                const interval = setInterval(() => {
                    if (document.querySelector('button.issue.fields.status-view.status-button')) {
                        insertInBacklogSidebar();
                        clearInterval(interval);
                    }
                }, 500);
            }
        };

        /** function: trigger when the url changes in the SPA page of jira */
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

        /** trigger the functions to add button */
        handleLocationChange();
        observeUrlChange();
    }

    /** Orchestrator
     * scrapes Jira ticket for qase plan urls and linked qase ids
     * shows popup
    */
    async function scrapeAndShowPopup() {
        if (!checkQaseApiToken() || !checkQaseProjectCode()) return;

        const projectCode = getQaseProjectCode();

        showLoading('Fetching Qase test data...');
        const plans = scrapeQasePlansFromPage();

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

        const planDetails = await Promise.all(plans.map(p => fetchQaseTestPlanDetails(p.projectCode, p.planId)));
        const externalCases = issueKey
            ? await fetchQaseTestCases(plans[0]?.projectCode || projectCode, issueKey)
            : [];
        const tcBuildDetails = window.seagull.teamcity.builds
            ? await Promise.all(window.seagull.teamcity.builds.map(m => fetchTeamCityBuildDetails(m)))
            : [];

        hideLoading();
        showPopup(issueKey, planDetails, externalCases, tcBuildDetails);
    }

    /** present popup UI
     * on submit calls createQaseTestRun()
    */
    function showPopup(issueKey, plans, externalCases, tcBuildDetails) {
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

        const titlePlaceholder = generateTitlePlaceholder(issueKey);
        let html = `
        <div style="margin-top:0;margin-bottom:16px;">
            <h2>Create Test Run</h2>
            <p>Select combination of test plans and cases to create a test run in Qase and associate to this ticket.</p>
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Test Run Title</label>
            <input type="text" id="qaseRunTitle" value="${titlePlaceholder}" style="width:98%; padding:8px; border:1px solid #ccc; border-radius:4px;">
        </div>
    `;

        // add Qase Test Plans section if any exist in Jira item
        if (plans.length) {
            html += `<h3 style="margin-top:16px;margin-bottom:10px;">📦 Linked Test Plans</h3>`;
            plans.forEach((p) => {
                html += `<label style="display:block; margin-bottom:8px;">
                <input type="checkbox" class="qase-item" data-type="plan" data-ids="${p.caseIds.join(',')}">
                <strong>${p.title}</strong> <span style="color:#555;">(${p.caseIds.length} Case${p.caseIds.length === 1 ? '' : 's'})</span>
             </label>`;
            });
        }

        // add Qase Test Case section if any exist in Jira item
        if (externalCases.length) {
            html += `<h3 style="margin-top:16px;margin-bottom:10px;">🔗 Linked Test Cases</h3>`;
            externalCases.forEach(item => {
                html += `<label style="display:block; margin-bottom:6px;">
                <input type="checkbox" class="qase-item" data-type="case" data-ids="${item.id}">#${item.id} - ${item.title}
             </label>`;
            });
        }

        // add Teamcity Build section if any exist in configuration object
        if (tcBuildDetails.length) {
            html += `<h3 style="margin-top:16px;margin-bottom:10px;">🚀 TeamCity Builds</h3>`;
            tcBuildDetails.forEach(build => {
                html += `<label style="display:block; margin-bottom:6px;">
                <input type="checkbox" class="teamcity-build" data-id="${build.id}">${build.name} (${build.projectName})
                </label>`;
            })
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

        document.getElementById('qaseRunBtn').onclick = () => createQaseTestRun();
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

    /** entrance point to the script */
    addQaseTools();

})();