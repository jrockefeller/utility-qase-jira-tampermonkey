// ==UserScript==
// @name         Aviator
// @namespace    http://tampermonkey.net/
// @version      1.1.13
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
        color: #f0f0f0;
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
    /* Alternating row colors for test cases */
    #qasePopup .test-case-list > label {
        display: block;
        padding: 6px;
        margin-bottom: 2px;
        border-radius: 4px;
        color: #000047; /* always readable */
    }
    #qasePopup .test-case-list > label:nth-child(odd)  { background: #E6E6FF; }
    #qasePopup .test-case-list > label:nth-child(even) { background: #F0F0F0; }

    #qasePopup input[type="text"],
   #qasePopup select {
    font-size: 12px;
    padding: 3px 5px;
   }
   #qasePopup h3 {
    margin-top: 2px;
    margin-bottom: 6px;
   }
}
`);

(function () {
    'use strict';

    const version = 'v1.1.13'

    //#region == Utilities ==
    function getQaseApiToken() {
        return window.aviator.qase.token;
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
        return window.aviator.qase.projectCode;
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

    function generateTitlePlaceholder() {
        const jiraDetails = getJiraIssueDetails()
        let title = window.aviator.qase.title ?? jiraDetails.issueKey

        title = title.replace('{issueKey}', jiraDetails.issueKey);
        title = title.replace('{issueTitle}', jiraDetails.issueTitle);

        return title;
    }

    function getJiraIssueDetails() {
        let issueKey = null;
        const matchFromPath = window.location.pathname.match(/\/browse\/([A-Z]+-\d+)/i);
        if (matchFromPath) issueKey = matchFromPath[1];
        else {
            const urlParams = new URLSearchParams(window.location.search);
            if (!issueKey && urlParams.has('selectedIssue')) {
                issueKey = urlParams.get('selectedIssue');
            }
        }

        let issueTitle = null;
        const titleFromJira = document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]');
        if (titleFromJira) issueTitle = titleFromJira.innerText

        return { issueKey, issueTitle }
    }

    //#endregion == Utilities ==

    //#region == Qase Functions ==

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
    function fetchQaseTestCases(projectCode, issueKey) {
        const token = getQaseApiToken();

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.qase.io/v1/case/${projectCode}?external_issues[type]=jira-cloud&external_issues[ids][]=${issueKey}&limit=50`,
                headers: { 'Accept': 'application/json', 'Token': token },
                onload: res => {
                    const data = JSON.parse(res.responseText);
                    const caseItems = data.result.entities.map(e => ({ id: e.id, title: e.title }));
                    resolve(caseItems);
                }
            });
        });
    }

    function fetchQaseEnvironments() {
        const token = getQaseApiToken();
        const projectCode = getQaseProjectCode();

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.qase.io/v1/environment/${projectCode}?limit=100&offset=0`,
                headers: { 'Accept': 'application/json', 'Token': token },
                onload: res => {
                    const data = JSON.parse(res.responseText);
                    resolve(data.result.entities);
                }
            });
        });
    }

    function fetchQaseMilestones() {
        const token = getQaseApiToken();
        const projectCode = getQaseProjectCode();

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.qase.io/v1/milestone/${projectCode}?limit=10&offset=00`,
                headers: { 'Accept': 'application/json', 'Token': token },
                onload: res => {
                    const data = JSON.parse(res.responseText);
                    resolve(data.result.entities);
                }
            });
        });
    }

    function fetchQaseConfigurations() {
        const token = getQaseApiToken();
        const projectCode = getQaseProjectCode();

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.qase.io/v1/configuration/${projectCode}`,
                headers: { 'Accept': 'application/json', 'Token': token },
                onload: res => {
                    const data = JSON.parse(res.responseText);
                    resolve(data.result.entities);
                }
            });
        });
    }

    async function fetchQaseTestRunConfig() {
        const opts = window.aviator.qase?.options;

        const promises = [];

        // Environment
        if (opts?.environment) {
            promises.push(fetchQaseEnvironments());
        } else {
            promises.push(Promise.resolve(null));
        }

        // Milestone
        if (opts?.milestone) {
            promises.push(fetchQaseMilestones());
        } else {
            promises.push(Promise.resolve(null));
        }

        // Configurations
        if (opts?.configurations) {
            promises.push(fetchQaseConfigurations());
        } else {
            promises.push(Promise.resolve(null));
        }

        const [environments, milestones, configurations] = await Promise.all(promises);

        return { environments, milestones, configurations };
    }

    /** calls Qase Api to create test run with selected plan tests and associated tests
     * returns runId
    */
    async function createQaseTestRun() {
        const projectCode = getQaseProjectCode();
        const token = getQaseApiToken();

        const environmentId = document.getElementById('qaseEnv')?.value || null;
        const milestoneId = document.getElementById('qaseMilestone')?.value || null;

        const configSelections = Array.from(document.querySelectorAll('.qaseConfig'))
            .reduce((acc, sel) => {
                if (sel.value) acc[sel.getAttribute('data-entity-id')] = parseInt(sel.value, 10);
                return acc;
            }, {});

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

        const runTitle = document.getElementById('qaseRunTitle').value.trim();
        if (!runTitle) {
            alert('No test run title entered!');
            return;
        }

        const payload = {
            title: runTitle,
            cases: allCaseIds,
            environment_id: environmentId,
            milestone_id: milestoneId,
            configurations: configSelections
        };

        try {
            const runData = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `https://api.qase.io/v1/run/${projectCode}`,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Token': token
                    },
                    data: JSON.stringify(payload),
                    onload: res => resolve(JSON.parse(res.responseText)),
                    onerror: err => reject(err)
                });
            });

            console.log(`Qase: Test Run Created: ${runData.result.id}`);

            // Trigger any TeamCity builds
            await triggerTeamCityBuilds(runData.result.id);

            // Associate with Jira AFTER run is confirmed created
            await associateQaseTestRunWithJira(projectCode, runData.result.id);

            // Remove popup after everything is done
            const overlay = document.getElementById('qasePopupOverlay');
            if (overlay) {
                overlay.remove();
            }

        } catch (err) {
            console.error('Error creating test run:', err);
            alert('Failed to create Qase test run. See console for details.');
        }
    }


    /** Associate the newly created test run to the ticket
     * add Qase: Test runs section in UI
    */
    function associateQaseTestRunWithJira(projectCode, runId) {
        const token = getQaseApiToken();

        let { issueKey } = getJiraIssueDetails()
        if (!issueKey) {
            alert('Could not detect Jira issue ID in URL for association.');
            return;
        }

        console.log('Qase: Associating Run ID', runId, 'with Jira issue', issueKey);
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
                links: [{ run_id: runId, external_issue: issueKey }]
            }),
            onload: function (response) {
                hideLoading();
                try {
                    const res = JSON.parse(response.responseText);
                    console.log(`Qase: Jira issue ${issueKey} successfully associated with Run ID ${runId}.`);

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

    //#endregion Qase Functions

    //#region == TeamCity Functions ==

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

        const token = window.aviator?.teamcity?.token;
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
                            { name: "env.QASE_TESTOPS_RUN_ID", value: runId },
                            { name: "env.QASE_TESTOPS_RUN_COMPLETE", value: 'false' },
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
        const token = window.aviator?.teamcity?.token;
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

    //#endregion TeamCity Functions

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

            if (/\/projects\/[^\/]+\/boards\/\d+(?:\?.*)?[?&]selectedIssue=/.test(url)) {
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
                    if (document.querySelector('div#jira-issue-header')) {
                        insertForModal();
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

        let { issueKey } = getJiraIssueDetails()

        if (!plans.length && !issueKey) {
            hideLoading();
            alert('No Qase plans or Jira issue key found.');
            return;
        }

        const planDetails = await Promise.all(plans.map(p => fetchQaseTestPlanDetails(p.projectCode, p.planId)));
        const externalCases = issueKey
            ? await fetchQaseTestCases(plans[0]?.projectCode || projectCode, issueKey)
            : [];
        const tcBuildDetails = window.aviator?.teamcity?.builds
            ? await Promise.all(window.aviator?.teamcity?.builds.map(m => fetchTeamCityBuildDetails(m)))
            : [];

        const qaseConfigData = await fetchQaseTestRunConfig()

        hideLoading();
        showPopup(issueKey, planDetails, externalCases, qaseConfigData, tcBuildDetails);
    }

    /** present popup UI
     * on submit calls createQaseTestRun()
    */
    function showPopup(issueKey, plans, externalCases, qaseConfigData, tcBuildDetails) {
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
        pointerEvents: 'auto' // ensure overlay is interactive
    `;

        const container = document.createElement('div');
        container.id = 'qasePopup';
        container.style = `
        background: #fff;
        padding: 20px 25px;
        border-radius: 8px;
        box-shadow: rgba(0,0,0,0.3)
        0px 8px 30px;
        max-width: 600px;
        width: 90%;
        max-height: 90%;
        display: flex;
        flex-direction: column;
        font-family: Arial, sans-serif;
    `;

        const titlePlaceholder = generateTitlePlaceholder(issueKey);

        /** -- header */
        let html = `
        <div style="margin-top:0;margin-bottom:5px;flex: 0 0 auto">
            <h2>Aviator</h2>
            <small style="color:#666; font-size:12px;">${version}</small>
            <p style="margin:0;padding:0">Create a Test Run in Qase by selecting a combination of test plans and cases.</p>
        </div>`

        /** -- config section */
        html += `<div style="flex: 0 0 auto;">
            <h3>⚙️ Test Run Configuration</h3>
            <div>
                <label for="qaseRunTitle" style="font-weight:bold; display:block; margin-bottom:4px;">Test Run Title</label>
                <input type="text" id="qaseRunTitle" value=""
                    style="width:99%; padding:8px; border:1px solid #ccc; border-radius:4px;">
            </div>
    `;

        if (qaseConfigData.environments || qaseConfigData.milestones || qaseConfigData.configurations) {
            html += '<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 5px;">'
        }

        // Environment dropdown
        if (qaseConfigData.environments) {
            html += `
        <div>
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Environment</label>
            <select id="qaseEnv" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                <option value=""></option>
                ${qaseConfigData.environments.map(env => `<option value="${env.id}">${env.title}</option>`).join('')}
            </select>
        </div>`;
        }

        // Milestone dropdown
        if (qaseConfigData.milestones) {
            html += `
        <div>
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Milestone</label>
            <select id="qaseMilestone" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                <option value=""></option>
                ${qaseConfigData.milestones.map(ms => `<option value="${ms.id}">${ms.title}</option>`).join('')}
            </select>
        </div>`;
        }

        // Dynamic Configurations
        if (qaseConfigData.configurations) {
            qaseConfigData.configurations.forEach(entity => {
                html += `
            <div>
                <label style="font-weight:bold; display:block; margin-bottom:4px;">${entity.title}</label>
                <select class="qaseConfig" data-entity-id="${entity.id}"
                    style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    <option value=""></option>
                    ${entity.configurations.map(cfg => `<option value="${cfg.id}">${cfg.title}</option>`).join('')}
                </select>
            </div>`;
            });
        }

        // Close grid
        if (qaseConfigData.environments || qaseConfigData.milestones || qaseConfigData.configurations)
            html += `</div>`;

        html += '</div>' // close config section div

        // scrollable content
        html += '<div style="flex: 1 1 auto; overflow-y: auto; margin-top: 12px; padding-right: 6px;">'
        // Linked Test Plans
        if (plans.length) {
            html += `<h3>📦 Linked Test Plans</h3>`;
            html += '<div class="test-case-list">';
            plans.forEach((p) => {
                html += `<label style="display:block; margin-bottom:8px;">
                <input type="checkbox" class="qase-item" data-type="plan" data-ids="${p.caseIds.join(',')}">
                <strong>${p.title}</strong> <span style="color:#555;">(${p.caseIds.length} Case${p.caseIds.length === 1 ? '' : 's'})</span>
            </label>`;
            });
            html += '</div>'

        }

        // Linked Test Cases
        if (externalCases.length) {
            html += `<h3>🔗 Linked Test Cases</h3>`;
            html += '<div class="test-case-list">';
            externalCases.forEach(item => {
                html += `<label style="display:block; margin-bottom:6px;">
                <input type="checkbox" class="qase-item" data-type="case" data-ids="${item.id}">#${item.id} - ${item.title}
            </label>`;
            });
            html += '</div>'
        }

        // TeamCity Builds
        if (tcBuildDetails.length) {
            html += `<h3>🚀 TeamCity Builds</h3>`;
            tcBuildDetails.forEach(build => {
                html += `<label style="display:block; margin-bottom:6px;">
                <input type="checkbox" class="teamcity-build" data-id="${build.id}">${build.name} (${build.projectName})
            </label>`;
            });
        }

        html += '</div>' // end scrollable content


        html += `
        <div style="margin-top:20px; display: flex; justify-content: space-between; align-items: center; flex: 0 0 auto;">
            <button id="qaseToggleAllBtn" style="padding:6px 12px; background:#F4F5F7; border:1px solid #ccc; border-radius:4px; cursor:pointer;">☑️ Select All</button>
            <div>
                <button id="qaseRunBtn" style="padding:8px 16px; background:#0052CC; color:white; border:none; border-radius:4px; cursor:pointer;">✅ Create Test Run</button>
                <button id="qaseCancelBtn" style="padding:8px 16px; margin-left:8px; background:#ddd; border:none; border-radius:4px; cursor:pointer;">Cancel</button>
            </div>
        </div>
    `;

        container.innerHTML = html;
        overlay.appendChild(container);

        const modalContent = document.querySelector('[role="dialog"], .jira-dialog, .css-1ynzxqw');
        if (modalContent)
            modalContent.appendChild(overlay)
        else
            document.body.appendChild(overlay);

        document.getElementById('qaseRunTitle').value = titlePlaceholder

        // Handle Create Test Run click
        document.getElementById('qaseRunBtn').onclick = async () => {
            const selected = document.querySelectorAll('.qase-item:checked');
            if (selected.length === 0) {
                alert('No test cases selected!');
                return; // popup stays open
            }

            try {
                // Show full-page loading overlay
                showLoading('Creating Test Run...');

                // Call your async function
                await createQaseTestRun();

                // Close popup and loading overlay when done
                const overlay = document.getElementById('qasePopupOverlay');
                if (overlay) overlay.remove();
                hideLoading();
            } catch (err) {
                console.error('Error creating test run:', err);
                hideLoading();
                alert('Failed to create Test Run. See console for details.');
            }
        };

        document.getElementById('qaseCancelBtn').onclick = () => overlay.remove();

        // Toggle all checkboxes
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