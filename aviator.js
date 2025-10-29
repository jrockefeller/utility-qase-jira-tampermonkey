// ==UserScript==
// @name         AviatorTest
// @namespace    http://tampermonkey.net/
// @version      1.1.13
// @description  Scrape Qase plans + cases from Jira page and build test runs
// @match        https://paylocity.atlassian.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.qase.io
// @connect      ci.paylocity.com
// @connect      hooks.slack.com
// ==/UserScript==

GM_addStyle(`
     /* Base styles for your injected popup */
    #qasePopupOverlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        /* stay above Jira */
    }
`);

(function () {
    'use strict';

    const version = '1.4.2'

    //#region == Utilities ==
    let jiraShortcutBlocker = null;
    let shadowRoot; // keep this global or in a closure
    let createdRun = false; // track for when to run associate with jira function
    const shadowStyles = `
     /* Base styles for your injected popup */
    #qasePopupOverlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        /* stay above Jira */
    }

    .qasePopup {
        background: var(--bg);
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
        max-width: 120vh;
        width: 95%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        font-family: "Segoe UI", Arial, sans-serif;
        color: var(--text);
        position: relative;
        z-index: 9999;
        /* makes sure it sits above Jira UI */
    }

    /* Two-column shell */
    .qasePopup .column {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        max-height: 70vh;
    }

    /* Light mode */
    @media (prefers-color-scheme: light) {
        .qasePopup {
            background: #fff;
            color: #222;
            --bg: #ffffff;
            --bg-card: #fafafa;
            --text: #222;
            --text-muted: #666;
            --border: #ddd;
            --primary: #4caf50;
            --primary-hover: #43a047;
            --secondary: #eee;
            --secondary-hover: #ddd;
        }

        .qasePopup .test-case-list>label {
            display: block;
            padding: 6px;
            margin-bottom: 2px;
            border-radius: 4px;
            color: #000047;
            /* always readable */
        }

        .qasePopup .test-case-list>label:nth-child(odd) {
            background: #e6f0ff;
        }

        .qasePopup .test-case-list>label:nth-child(even) {
            background: #F0F0F0;
        }

    }

    .qasePopup .test-case-list:nth-child(odd) {
        margin-bottom: 15px;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
        .qasePopup {
            background: #1e1e1e;
            color: #f1f1f1;
            --bg: #1e1e1e;
            --bg-card: #2a2a2a;
            --text: #f5f5f5;
            --text-muted: #aaa;
            --border: #444;
            --primary: #66bb6a;
            --primary-hover: #57a05b;
            --secondary: #333;
            --secondary-hover: #444;
        }

        .qasePopup .test-case-list>label {
            display: block;
            padding: 6px;
            margin-bottom: 2px;
            border-radius: 4px;
            /*color: #000047;*/
            color: #e7e7e4
            /* always readable */
        }

        .qasePopup .test-case-list>label:nth-child(odd) {
           /* background: #E6E6FF; */
           background: #54545E;
        }

        .qasePopup .test-case-list>label:nth-child(even) {
           /* background: #F0F0F0; */
           background: #35353D;
        }

    }

    .qasePopup .popup-header {
        margin-bottom: 20px;
    }

    .qasePopup .popup-title {
        display: flex;
        align-items: flex-end;
        gap: 8px;
    }

    .qasePopup .popup-title h2 {
        margin: 0;
        font-size: 1.8rem;
        color: var(--text);
    }

    .qasePopup .popup-title small {
        color: var(--text-muted);
        font-size: 0.85rem;
    }

    .qasePopup .popup-body {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        flex: 1;
        overflow: hidden;
    }

    .qasePopup .popup-column {
        background: var(--bg-card);
        padding: 15px;
        border-radius: 8px;
        overflow-y: auto;
        border: 1px solid var(--border);
    }

    .qasePopup h3 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 1.1rem;
        border-bottom: 1px solid var(--border);
        padding-bottom: 6px;
    }

    .qasePopup label {
        margin-bottom: 10px;
        color: var(--text);
    }

    .qasePopup input[type="text"],
    .qasePopup select {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--border);
        border-radius: 6px;
        margin-bottom: 7px;
        font-size: 0.95rem;
        background: var(--bg);
        color: var(--text);
    }

    .qasePopup #qaseRunTitle {
       width: 96%;
    }

    .qasePopup input[type="checkbox"] {
        accent-color: var(--primary);
    }

    .qasePopup .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0px 10px;
    }

    .qasePopup .popup-footer {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }

    .qasePopup .btn {
        padding: 8px 16px;
        border-radius: 6px;
        border: none;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .qasePopup .btn.primary {
        background: var(--primary);
        color: #fff;
    }

    .qasePopup .btn.primary:hover {
        background: var(--primary-hover);
    }

    .qasePopup .btn.secondary {
        background: var(--secondary);
        color: var(--text);
    }

    .qasePopup .btn.secondary:hover {
        background: var(--secondary-hover);
    }

    @media (max-width: 700px) {
        .qasePopup .popup-body {
            grid-template-columns: 1fr;
        }
    }

    .qasePopup .subText {
        color: #737373;
        font-size: 0.85rem;
    }

    .qasePopup #qaseToggleAllBtn {
        color: black;
        background: #F4F5F7;
        border: 1px solid #ccc;
        margin-right: auto;
    }

    .qasePopup .build-list>label {
        display:block;
    }
`

    function getQaseApiToken() {
        return window.aviator.qase.token;
    }

    function checkQaseApiToken() {
        const token = getQaseApiToken();
        if (!token) {
            showMessagePopup('⚠️ No Qase API token set.', hidePopup)
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
            showMessagePopup('⚠️ No Qase Project Code set.', hidePopup)
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

    function blockJiraShortcuts() {
        if (jiraShortcutBlocker) return; // Already active

        const handler = (e) => {
            // Stop Jira from seeing any key event
            e.stopPropagation();
            // Optional: prevent default if you want to block certain keys entirely
            // e.preventDefault();
        };

        ['keydown', 'keypress', 'keyup'].forEach(eventName =>
            document.addEventListener(eventName, handler, true) // use capture phase
        );

        // Store the cleanup function
        jiraShortcutBlocker = () => {
            ['keydown', 'keypress', 'keyup'].forEach(eventName =>
                document.removeEventListener(eventName, handler, true)
            );
            jiraShortcutBlocker = null;
        };
    }

    function unblockJiraShortcuts() {
        if (jiraShortcutBlocker) {
            jiraShortcutBlocker();
        }
    }

    function shouldClosePopup() {
        return (shadowRoot.getElementById('keep-open').checked) ? false : true;
    }

    function hidePopup() {
        const overlay = document.getElementById('qasePopupOverlay');
        if (overlay) {
            overlay.remove();
            unblockJiraShortcuts();
        }
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

    function addQaseTestRunsToJiraUI() {
        const qasePanel = document.querySelector('[data-testid="issue-view-ecosystem.connect.content-panel.qase.jira.cloud__qase-runs"]');
        if (qasePanel) { // qase panel already exists; reload to see newly associated test run
            location.reload();
        } else { // qase panel needs to be added
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
    }

    async function api({ method, url, headers = {}, data = null }) {
        const tryParseJSON = (text) => {
            try {
                return JSON.parse(text);
            } catch {
                return null; // not JSON
            }
        }

        return new Promise((resolve, reject) => {
            const request = {
                method,
                url,
                onload: res => {

                    const data = tryParseJSON(res.responseText)
                    if (data) resolve(data)
                    else resolve(res.responseText)
                },
                onerror: err => {
                    console.log(url, err)
                    console.error(err);
                    reject(err);
                }
            };

            // Add headers if provided
            request.headers = {
                Accept: 'application/json',
                ...headers
            };

            // Add body only if provided
            if (data !== null && data !== undefined) {
                request.headers['Content-Type'] = 'application/json';
                request.data = (typeof data === 'string') ? data : JSON.stringify(data);
            }

            GM_xmlhttpRequest(request);
        });
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

    async function verifyConnectToQase(projectCode) {
        const token = getQaseApiToken();
        const data = await api({
            method: 'GET', url: `https://api.qase.io/v1/project/${projectCode}`,
            headers: { Token: token }
        })
        return (!data.status && data.status == false) ? false : true;
    }

    /** calls Qase Api to get plan details with plan qase test ids */
    async function fetchQaseTestPlanDetails(projectCode, planId) {
        const token = getQaseApiToken();

        const data = await api({
            method: 'GET', url: `https://api.qase.io/v1/plan/${projectCode}/${planId}`,
            headers: { 'Token': token }
        })
        console.log('fetchQaseTestPlanDetails', data)
        const cases = data.result.cases.map(c => c.case_id);

        return {
            projectCode: projectCode,
            title: data.result.title,
            caseIds: cases
        }
    }

    /** calls Qase Api to get associated jira ticket qase test ids */
    async function fetchQaseTestCases(projectCode, issueKey) {
        const token = getQaseApiToken();

        const data = await api({
            method: 'GET', url: `https://api.qase.io/v1/case/${projectCode}?external_issues[type]=jira-cloud&external_issues[ids][]=${issueKey}&limit=50`,
            headers: { Token: token }
        })

        if (!data.result) {
            return []
        }
        const caseItems = data.result.entities.map(e => ({ id: e.id, title: e.title }));
        return caseItems;
    }

    async function fetchQaseEnvironments() {
        const token = getQaseApiToken();
        const projectCode = getQaseProjectCode();

        const data = await api({
            method: 'GET',
            url: `https://api.qase.io/v1/environment/${projectCode}?limit=100&offset=0`,
            headers: { 'Accept': 'application/json', token: token }
        })

        if (!data.result) {
            return []
        }
        return data.result.entities
    }

    async function fetchQaseMilestones() {
        const token = getQaseApiToken();
        const projectCode = getQaseProjectCode();

        const data = await api({
            method: 'GET',
            url: `https://api.qase.io/v1/milestone/${projectCode}?limit=10&offset=00`,
            headers: { 'Accept': 'application/json', token: token }
        })

        if (!data.result) {
            return []
        }
        return data.result.entities
    }

    async function fetchQaseConfigurations() {
        const token = getQaseApiToken();
        const projectCode = getQaseProjectCode();

        const data = await api({
            method: 'GET',
            url: `https://api.qase.io/v1/configuration/${projectCode}`,
            headers: { 'Accept': 'application/json', token: token }
        })

        if (!data.result) {
            return []
        }
        return data.result.entities
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

    //#region == Slack Functions ==

    async function sendResultToSlack(data) {
        const projectCode = getQaseProjectCode();

        const payload = {
            projectCode,
            title: data.title,
            environment: data.environment.text,
            milestone: data.milestone.text,
            teamCityQueued: data.tcBuilds.join(','),
        }

        console.log('sending to slack', payload)

        await api({
            method: 'POST',
            url: `https://hooks.slack.com/triggers/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`,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: payload
        })

    }
    //#endregion == Slack Functions ==

    function getFormRunData() {
        const environment = shadowRoot.getElementById('qaseEnv')
        const milestone = shadowRoot.getElementById('qaseMilestone')

        const environmentId = environment?.value || null;
        const enviromentText = environment?.options[environment.selectedIndex].text || null
        const milestoneId = milestone?.value || null;
        const milestoneText = milestone?.options[milestone.selectedIndex].text || null;

        const configSelections = Array.from(shadowRoot.querySelectorAll('.qaseConfig'))
            .reduce((acc, sel) => {
                if (sel.value) acc[sel.getAttribute('data-entity-id')] = parseInt(sel.value, 10);
                return acc;
            }, {});

        const selected = shadowRoot.querySelectorAll('.qase-item:checked');
        const allCaseIds = [];

        selected.forEach(item => {
            const ids = item.getAttribute('data-ids').split(',').map(id => parseInt(id));
            allCaseIds.push(...ids);
        });

        const builds = shadowRoot.querySelectorAll('.teamcity-build:checked');
        const _builds = builds.length
            ? Array.from(builds).map(b => b.dataset.id)
            : [];

        return {
            title: shadowRoot.getElementById('qaseRunTitle').value.trim(),
            environment: { id: environmentId, text: enviromentText },
            milestone: { id: milestoneId, text: milestoneText },
            configurations: configSelections,
            caseIds: allCaseIds,
            tcBuilds: _builds
        }
    }

    /** calls Qase Api to create test run with selected plan tests and associated tests
     * returns runId
    */
    async function createQaseTestRun() {
        const projectCode = getQaseProjectCode();
        const token = getQaseApiToken();

        const data = getFormRunData()

        if (data.caseIds.length === 0) {
            showMessagePopup('No test cases selected!');
            return;
        }

        if (!data.title) {
            showMessagePopup('No test run title entered!');
            return;
        }

        const payload = {
            title: data.title,
            cases: data.caseIds,
            environment_id: data.environment.id,
            milestone_id: data.milestone.id,
            configurations: data.configurations
        };

        try {
            const runData = await api({
                method: 'POST',
                url: `https://api.qase.io/v1/run/${projectCode}`,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Token': token
                },
                data: payload
            })

            console.log(`Qase: Test Run Created: ${runData.result.id}`);

            // Trigger any TeamCity builds
            await triggerTeamCityBuilds(runData.result.id, data.caseIds);

            // send data to slack for usage tracking
            await sendResultToSlack(data)

            // Associate with Jira AFTER run is confirmed created
            await associateQaseTestRunWithJira(projectCode, runData.result.id);

            // should we close the popup or keep it open for another run?
            if (shouldClosePopup()) addQaseTestRunsToJiraUI()

        } catch (err) {
            console.log('Error creating test run:', err);
            showMessagePopup('Failed to create Qase test run. See console for details.');
        }
    }


    /** Associate the newly created test run to the ticket
     * add Qase: Test runs section in UI
    */
    async function associateQaseTestRunWithJira(projectCode, runId) {
        const token = getQaseApiToken();

        let { issueKey } = getJiraIssueDetails()
        if (!issueKey) {
            showMessagePopup('Could not detect Jira issue ID in URL for association.');
            return;
        }

        console.log('Qase: Associating Run ID', runId, 'with Jira issue', issueKey);
        showLoading('Associating test run with Jira...');

        try {
            await api({
                method: 'POST',
                url: `https://api.qase.io/v1/run/${projectCode}/external-issue`,
                headers: {
                    'Content-Type': 'application/json',
                    'Token': token
                },
                data: {
                    type: 'jira-cloud',
                    links: [{ run_id: runId, external_issue: issueKey }]
                }
            })

            hideLoading();

            console.log(`Qase: Jira issue ${issueKey} successfully associated with Run ID ${runId}.`);
        }
        catch (e) {
            hideLoading();
            console.error('Error associating Jira issue:', e);
        }
    }

    //#endregion Qase Functions

    //#region == TeamCity Functions ==

    /** calls TeamCity to get csrf token needed to communiticate for auth */
    async function getTeamCityCsrfToken(token) {

        const data = await api({
            method: 'GET',
            url: `https://ci.paylocity.com/authenticationTest.html?csrf`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })

        return data
    }

    /** trigger selected teamcity builds */
    async function triggerTeamCityBuilds(runId, caseIds) {

        const token = window.aviator?.teamcity?.token;
        const cfsrToken = await getTeamCityCsrfToken(token)
        const builds = shadowRoot.querySelectorAll('.teamcity-build:checked');

        for (let b of builds) {
            const buildId = b.dataset.id;

            try {

                /** set to trigger a build against a runid and do not complete it */
                let tc_properties = [
                    { name: "env.QASE_TESTOPS_RUN_ID", value: runId },
                    { name: "env.QASE_TESTOPS_RUN_COMPLETE", value: 'false' }
                ]

                if (window.aviator?.teamcity?.parameters) {
                    window.aviator?.teamcity?.parameters.forEach(param => {
                        tc_properties.push({ name: `env.${param.name}`, value: param.value })
                    })
                }

                /** optional to set parameter of qase_ids for automation to only run against those (if grep set) */
                if (shadowRoot.getElementById('teamcity-qases-only').checked) tc_properties.push({ name: "env.QASE_IDS", value: caseIds.join(',') })

                await api({
                    method: 'POST',
                    url: `https://ci.paylocity.com/app/rest/buildQueue`,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-TC-CSRF-Token': cfsrToken

                    },
                    data: {
                        buildType: { id: buildId },
                        properties: {
                            property: tc_properties
                        }
                    }
                })

                console.log(`[TeamCity] Build triggered: ${buildId}`);

            }
            catch (err) {
                console.error(`[TeamCity] Build trigger failed: ${buildId}`, err)
            }
        };
    }

    async function fetchTeamCityBuildDetails(buildId) {
        const token = window.aviator?.teamcity?.token;
        const cfsrToken = await getTeamCityCsrfToken(token)

        const data = await api({
            method: 'GET',
            url: `https://ci.paylocity.com/app/rest/buildTypes/id:${buildId}?fields=id,projectId,name,projectName,webUrl,description`,
            headers: { Authorization: `Bearer ${token}`, 'X-TC-CSRF-Token': cfsrToken }
        })
        return data
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

            if (isDarkMode) {
                btn.style = `
                    background: ${isDarkMode ? '#8fb8f6' : 'white'};
                    color: ${isDarkMode ? '#1f1f21' : '#0052CC'};
                    border: ${isDarkMode ? 'none' : '1px solid #0052CC'};
                    border-radius: 4px;
                    font-size: 14px;
                    line-height: 20px;
                    font-family: "Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif;
                    font-weight: 500;
                    padding: 6px 12px;
                    cursor: pointer;
                    margin-left: 8px;
                `;
            }
            else {
                const jiraCreateButton = document.querySelector('[data-testid="atlassian-navigation--create-button"]')
                btn.classList = jiraCreateButton.classList
                btn.style.marginLeft = '5px'
            }

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
            background: ${isDarkMode ? '#1f1f21' : 'white'};
            color: ${isDarkMode ? '#a9abaf' : 'white'};
            padding: 8px 16px;
            font-family: Arial, sans-serif;
            font-size: 14px;
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
        const insertInSidebar = () => {
            if (document.querySelector('#qaseScrapeButton')) return;
            const header = document.querySelector('div[data-testid="issue.views.issue-details.issue-layout.compact-layout"]');
            if (!header) return;
            const bar = document.createElement('div');
            bar.id = 'qaseTopBar';
            bar.style = `
            //width: 100%;
            background: ${isDarkMode ? '#1f1f21' : 'white'};
            color: ${isDarkMode ? '#a9abaf' : 'white'};
            padding: 8px 16px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        `;
            bar.appendChild(createButton());
            header.parentElement.insertBefore(bar, header);
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
                    else if (document.querySelector('div[data-testid="issue.views.issue-details.issue-layout.compact-layout"]')) {
                        insertInSidebar();
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
                    else if (document.querySelector('div[data-testid="issue.views.issue-details.issue-layout.compact-layout"]')) {
                        insertInSidebar();
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
            showMessagePopup('No Qase plans or Jira issue key found.', hidePopup)
            return;
        }

        /** check qase connection to verify can show the popup */
        if (await verifyConnectToQase()) {
            hideLoading();
            showMessagePopup('Error connecting to Qase. Check your token and project are correct', hidePopup)
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

    function htmlTestPlans(plans) {
        const plansDiv = document.createElement('div')
        plansDiv.classList = 'test-case-list'

        if (plans.length) {
            let html = `<h3>📦 Linked Test Plans</h3>`
            plans.forEach((p) => {
                html += `<label><input type="checkbox" class="qase-item" data-type="plan" data-ids="${p.caseIds.join(',')}">
                                ${p.title} <span class="subText">(${p.caseIds.length} Case${p.caseIds.length === 1 ? '' : 's'})</span></label>
                        <label>`;
            });

            plansDiv.innerHTML = html
        }

        return plansDiv
    }

    function htmlTestCases(externalCases) {
        const div = document.createElement('div')
        div.classList = 'test-case-list'

        if (externalCases.length) {
            let html = `<h3>🔗 Linked Test Cases</h3>`
            externalCases.forEach((item) => {
                html += `<label>
                            <input type="checkbox" class="qase-item" data-type="case" data-ids="${item.id}"> #${item.id} - ${item.title}
                        </label>`;
            });

            div.innerHTML = html
        }
        return div
    }

    function htmlTestRunDetails(qaseConfigData) {
        const div = document.createElement('div')
        div.innerHTML = `
            <h3>⚙️ Test Run Configuration</h3>
            <label>Test Run Title</label>
            <input type="text" id="qaseRunTitle">
        `

        const grid = document.createElement('div')
        grid.classList = 'grid-2'

        if (qaseConfigData.environments) {
            const env = document.createElement('div')
            env.innerHTML = `<label>Environment</label>
                            <select id="qaseEnv">
                                <option value=""></option>
                                ${qaseConfigData.environments.map(env => `<option value="${env.id}">${env.title}</option>`).join('')}
                            </select>`
            grid.appendChild(env)
        }

        if (qaseConfigData.milestones) {
            const milestone = document.createElement('div')
            milestone.innerHTML = `<label>Milestone</label>
                            <select id="qaseMilestone">
                                <option value=""></option>
                                ${qaseConfigData.milestones.map(ms => `<option value="${ms.id}">${ms.title}</option>`).join('')}
                            </select>`
            grid.appendChild(milestone)
        }

        if (qaseConfigData.configurations) {
            qaseConfigData.configurations.forEach(entity => {
                const _div = document.createElement('div')
                _div.innerHTML = `<label>${entity.title}</label>
                            <select class="qaseConfig" data-entity-id="${entity.id}">
                                <option value=""></option>
                                 ${entity.configurations.map(cfg => `<option value="${cfg.id}">${cfg.title}</option>`).join('')}
                            </select>`
                grid.appendChild(_div)
            });
        }

        div.appendChild(grid)
        return div

    }

    function htmlTeamCityBuilds(tcBuildDetails) {
        const div = document.createElement('div')
        div.classList = 'build-list'

        if (tcBuildDetails.length) {
            let html = `<h3>🚀 TeamCity Builds<label style="float: right; font-size: small; font-weight:300">run selected qases only<input type="checkbox" id="teamcity-qases-only" checked></label></h3>`
            tcBuildDetails.forEach((build) => {
                // Check if this is an error string instead of a build object
                if (typeof build === 'string') {
                    // Extract build ID from error message if possible
                    const buildIdMatch = build.match(/id '([^']+)'/);
                    const buildId = buildIdMatch ? buildIdMatch[1] : 'Unknown Build';

                    html += `<label style="color: #ff6b6b; opacity: 0.8;">
                            ❌ ${buildId} <span class="subText">(Build not found or access denied)</span>
                        </label>`;
                } else {
                    // Normal build object
                    html += `<label>
                            <input type="checkbox" class="teamcity-build" data-id="${build.id}"> ${build.name} <span
                            class="subText">(${build.projectName.replaceAll(' / ', '/')})</span>
                        </label>`;
                }
            });

            div.innerHTML = html
        }
        return div
    }

    function showMessagePopup(message, onClose) {

        createShadowRootOverlay()
        // overlay
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: "9999" // sits above everything inside the popup
        });

        // modal box
        const box = document.createElement("div");
        box.classList = 'qasePopup'
        Object.assign(box.style, {
            padding: "20px 24px",
            borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            /* size behavior */
            minWidth: "250px",   // won’t shrink below this
            maxWidth: "600px",   // won’t grow beyond this
            width: "auto",       // lets it size based on content
            boxSizing: "border-box",
            /* layout */
            display: "flex",
            flexDirection: "column",   // stack title, text, button
            justifyContent: "center",
            alignItems: "center",
        });


        box.innerHTML = `
            <h2 style="margin-top:0">🔒 Oops 🔒</h2>
            <div font-size:14px; line-height:1.5">
                ${message}
            </div>
            <button id="oops-ok" class="btn primary" style="margin-top: 10px">Got it</button>
            `;

        /*  */

        overlay.appendChild(box);
        shadowRoot.appendChild(overlay);

        overlay.querySelector("#oops-ok").addEventListener("click", () => {
            overlay.remove();

            if (typeof onClose == 'function') {
                onClose();
            }
        });
    }

    function shouldShowFeaturePopup() {
        const seenVersion = localStorage.getItem("aviatorLastFeaturePopup") || "";
        if (seenVersion !== version) {
            localStorage.setItem("aviatorLastFeaturePopup", version);
            return true;
        }
        return false;
    }

    function showFeaturePopup() {
        // overlay
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: "9999" // sits above everything inside the popup
        });

        // modal box
        const box = document.createElement("div");
        box.classList = 'qasePopup'
        Object.assign(box.style, {
            padding: "20px 24px",
            borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            /* size behavior */
            minWidth: "250px",   // won’t shrink below this
            maxWidth: "600px",   // won’t grow beyond this
            width: "auto",       // lets it size based on content
            boxSizing: "border-box",
            /* layout */
            display: "flex",
            flexDirection: "column",   // stack title, text, button
            justifyContent: "center",
            alignItems: "center",
        });

        box.innerHTML = `
            <h2 style="margin-top:0">🚀 Aviator Changelog 🚀</h2>
            <div class="test-case-list">
                <label>
                <strong>v1.4.2</strong> – Gracefully handle TeamCity build fetch errors. Display to user in modal.
                </label>

                <label>
                <strong>v1.4.1</strong> – Fixed issue with Jira sidebars not displaying Aviator button.
                </label>

                <label>
                <strong>v1.4</strong> – Consolidated error messaging. Handle incorrect configuration more gracefully.
                </label>

                <label>
                <strong>v1.3</strong> – New <code>keep open</code> checkbox added to keep modal open for multiple test run creations.
                </label>

                <label>
                <strong>v1.2</strong> – Configure custom parameters to send with TeamCity builds.
                See <a href="https://github.com/jrockefeller/utility-qase-jira-tampermonkey/blob/main/README.md" target="_blank">README.md</a> for details.
                <pre style="padding:8px; border-radius:4px; overflow-x:auto; margin-top:6px">
teamcity: {
    parameters: [
        { name: 'custom_param', value: '123' }
    ]
}</pre>
                </label>

                <label>
                <strong>v1.1</strong> – Checkbox to send only selected QaseIds in TeamCity build parameter <code>env.QASE_IDS</code>.
                </label>

                <label>
                <strong>v1.0</strong> – Aviator runs in <code>shadowRoot</code>! Isolates from Jira hot keys.
                </label>
            </div>
              <button id="feature-ok" class="btn primary" style="margin-top: 10px">Got it</button>
            `;

        overlay.appendChild(box);
        shadowRoot.appendChild(overlay);

        overlay.querySelector("#feature-ok").addEventListener("click", () => {
            overlay.remove();
        });
    }

    function createShadowRootOverlay() {
        let overlay = document.getElementById('qasePopupOverlay');
        if (!overlay) {
            // Create background overlay
            overlay = document.createElement('div');
            overlay.id = 'qasePopupOverlay';
            document.body.appendChild(overlay); // <-- make sure it's in the DOM
        }

        // Ensure the shadow root exists
        if (!overlay.shadowRoot) {
            shadowRoot = overlay.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = shadowStyles;
            shadowRoot.appendChild(style);
        }

        return overlay
    }

    /** present popup UI
     * on submit calls createQaseTestRun()
    */
    function showPopup(issueKey, plans, externalCases, qaseConfigData, tcBuildDetails) {
        hidePopup();
        createdRun = false; // reset for this popup session

        if (!plans.length && !externalCases.length) {
            showMessagePopup('No Qase Test Plans or Cases are part of this ticket', hidePopup)
            return;
        }

        const overlay = createShadowRootOverlay()

        // popup contents container
        const container = document.createElement('div');
        container.classList = 'qasePopup';

        // header
        const header = document.createElement('div')
        header.classList = 'popup-header'
        header.innerHTML = `
                <div class="popup-title">
                    <h2>Aviator</h2>
                    <small>v${version}</small>
                    <label style="margin-left: auto"><input type="checkbox" id="keep-open" />keep open</label>
                </div>
                <p>Create a Test Run in Qase by selecting a combination of test plans and cases.</p>`
        container.appendChild(header)

        // content body with columns
        const popupBody = document.createElement('div')
        popupBody.classList = 'popup-body'

        // column 1
        const column1 = document.createElement('div')
        column1.classList = 'popup-column'
        column1.appendChild(htmlTestPlans(plans))
        column1.appendChild(htmlTestCases(externalCases))
        popupBody.appendChild(column1)

        // column 2
        const column2 = document.createElement('div')
        column2.classList = 'popup-column'
        column2.appendChild(htmlTestRunDetails(qaseConfigData))
        column2.appendChild(htmlTeamCityBuilds(tcBuildDetails))
        popupBody.appendChild(column2)
        container.appendChild(popupBody)

        // footer
        const footer = document.createElement('div')
        footer.classList = 'popup-footer'
        footer.innerHTML = `
            <button id="qaseToggleAllBtn" class="btn">☑️ Select All</button>
            <button id="qaseRunBtn" class="btn primary">✅ Create Test Run</button>
            <button id="qaseCancelBtn" class="btn secondary">Cancel</button>
        `
        container.appendChild(footer)

        shadowRoot.appendChild(container);

        const modalContent = document.querySelector('[role="dialog"], .jira-dialog, .css-1ynzxqw');
        if (modalContent) {
            modalContent.appendChild(overlay)
        }
        else {
            document.body.appendChild(overlay);
        }

        // block jira shortcuts
        blockJiraShortcuts();

        const runTitleInput = shadowRoot.getElementById('qaseRunTitle');
        runTitleInput.value = generateTitlePlaceholder(issueKey);

        // --- live validation setup ---
        const errorMsg = document.createElement('div');
        errorMsg.style.color = 'red';
        errorMsg.style.fontSize = '0.85rem';
        errorMsg.style.marginTop = '-4px';
        errorMsg.style.marginBottom = '8px';
        errorMsg.style.display = 'none';
        errorMsg.id = 'qaseRunTitleError';
        runTitleInput.insertAdjacentElement('afterend', errorMsg);

        function validateRunTitle() {
            const value = runTitleInput.value.trim();
            if (!value) {
                errorMsg.textContent = 'Run title is required.';
                errorMsg.style.display = 'block';
                return false;
            }
            if (value.length < 5) {
                errorMsg.textContent = 'Run title must be at least 5 characters.';
                errorMsg.style.display = 'block';
                return false;
            }
            // if (/[^\w\s-]/.test(value)) {
            //     errorMsg.textContent = 'Run title contains invalid characters.';
            //     errorMsg.style.display = 'block';
            //     return false;
            // }
            errorMsg.style.display = 'none';
            return true;
        }

        runTitleInput.addEventListener('input', validateRunTitle);

        // Handle Create Test Run click
        shadowRoot.getElementById('qaseRunBtn').onclick = async () => {
            const data = getFormRunData();
            console.log(data.caseIds)
            if (!data.caseIds.length) {
                showMessagePopup('No test cases selected!');
                return;
            }

            if (!validateRunTitle()) {
                runTitleInput.focus();
                return;
            }

            try {
                // Show full-page loading overlay
                showLoading('Creating Test Run...');

                // Call your async function
                await createQaseTestRun();

                // Close popup and loading overlay when done
                if (shouldClosePopup()) hidePopup();
                hideLoading();
                createdRun = true; // flag for jira UI update
            } catch (err) {
                console.error('Error creating test run:', err);
                hideLoading();
                showMessagePopup('Failed to create Test Run. See console for details.');
            }
        };

        shadowRoot.getElementById('qaseCancelBtn').onclick = () => {
            hidePopup()
            if (createdRun) addQaseTestRunsToJiraUI() // if a run was created, update the jira UI when closing
        };

        // Toggle all checkboxes
        const toggleBtn = shadowRoot.getElementById('qaseToggleAllBtn');
        let allSelected = false;
        toggleBtn.onclick = () => {
            const checkboxes = shadowRoot.querySelectorAll('.qase-item');
            allSelected = !allSelected;
            checkboxes.forEach(cb => cb.checked = allSelected);
            toggleBtn.textContent = allSelected ? '🚫 Deselect All' : '☑️ Select All';
        };

        // then run feature popup once per version
        if (shouldShowFeaturePopup()) {
            showFeaturePopup(shadowRoot);
        }
    }

    /** entrance point to the script */
    addQaseTools();

})();