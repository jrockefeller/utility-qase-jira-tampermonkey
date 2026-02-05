// ==UserScript==
// @name         AviatorTest
// @namespace    http://tampermonkey.net/
// @version      1.1.14
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

    const aviatorVersion = '1.4.4'
    const traciatorVersion = '1.0.0'

    // ===================================================================
    // CORE UTILITIES & HELPERS
    // ===================================================================

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

    function showLoading(message = 'Working...', progress = null) {
        const existingOverlay = document.getElementById('qaseLoadingOverlay');

        if (existingOverlay) {
            // Update existing loading message and progress
            const messageElement = existingOverlay.querySelector('.loading-message');
            const progressElement = existingOverlay.querySelector('.loading-progress');
            const progressBar = existingOverlay.querySelector('.progress-bar-fill');

            if (messageElement) messageElement.textContent = message;
            if (progressElement && progress !== null) {
                progressElement.textContent = `${progress.current}/${progress.total} (${Math.round((progress.current / progress.total) * 100)}%)`;
            }
            if (progressBar && progress !== null) {
                progressBar.style.width = `${(progress.current / progress.total) * 100}%`;
            }
            return;
        }

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

        const progressBarHtml = progress ? `
            <div style="width: 300px; background: #333; border-radius: 10px; margin: 10px 0; overflow: hidden;">
                <div class="progress-bar-fill" style="height: 8px; background: #0052CC; width: ${(progress.current / progress.total) * 100}%; transition: width 0.3s ease;"></div>
            </div>
            <div class="loading-progress" style="color: #ccc; font-size: 14px; margin-bottom: 5px;">${progress.current}/${progress.total} (${Math.round((progress.current / progress.total) * 100)}%)</div>
        ` : '';

        const spinner = document.createElement('div');
        spinner.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            color: white;
            font-size: 18px;
            font-family: Arial, sans-serif;
            text-align: center;
            max-width: 400px;
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
            ${progressBarHtml}
            <div class="loading-message">${message}</div>
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

    // ===================================================================
    // API UTILITIES
    // ===================================================================

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

    // ===================================================================
    // JIRA PAGE SCRAPING & DATA EXTRACTION
    // ===================================================================

    /** extract version name from release page for default test run title */
    function extractVersionNameFromReleasePage() {
        // First try to extract from URL pattern
        const urlMatch = window.location.href.match(/\/projects\/[^\/]+\/versions\/(\d+)/);

        // Look for version name in page content
        const selectors = [
            'h1', // Main title
            '[data-testid="release.ui.release-report.release-report.release-name"]', // Release name element
            '.release-name', // Release name class
            'h2', // Secondary titles
            '.ghx-swimlane-header' // Swimlane headers
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent?.trim();
                if (text && !text.includes('Release Report') && !text.includes('Issues') && text.length < 100) {
                    // Filter out common non-version text
                    if (!text.match(/^(All Issues|Done Issues|Pending Issues|Release Report)$/)) {
                        return text;
                    }
                }
            }
        }

        // Fallback: try to get from page title
        const pageTitle = document.title;
        const titleMatch = pageTitle.match(/Release Report: (.+?) - /);
        if (titleMatch) {
            return titleMatch[1];
        }

        // Last resort: use URL version ID
        if (urlMatch) {
            return `Version ${urlMatch[1]}`;
        }

        return 'Release Version';
    }

    /** scrape Jira work item keys and names from release page */
    function scrapeJiraKeysFromReleasePage() {
        const jiraData = new Map(); // key -> {key, name}

        // Look for specific Jira issue card elements based on the provided HTML structure
        const issueCards = document.querySelectorAll('[data-testid="software-releases-version-detail-issue-list.ui.issues.issue-card"]');

        issueCards.forEach(card => {
            // Find the Jira key (e.g., VID-5014)
            const keyElement = card.querySelector('span._1o9zidpf._syaz1rpy._u5f3pxbi');
            if (keyElement) {
                const key = keyElement.textContent.trim();

                // Find the issue title/name in the role="presentation" div
                const titleElement = card.querySelector('div[role="presentation"] div._1reo15vq._18m915vq._1bto1l2s._o5721q9c._syazi7uo._9oik18uv._1bnx8stv._jf4cnqa1');
                let name = 'Unknown Issue';

                if (titleElement) {
                    name = titleElement.textContent.trim();
                }

                // Store the key and name
                if (key.match(/\b[A-Z]{2,3}-\d+\b/)) {
                    jiraData.set(key, {
                        key: key,
                        name: name
                    });
                }
            }
        });

        // Fallback: Look for Jira keys in links if no cards found
        if (jiraData.size === 0) {
            const linkElements = document.querySelectorAll('a[href*="/browse/"]');
            linkElements.forEach(link => {
                const href = link.getAttribute('href') || '';
                const keyMatch = href.match(/\/browse\/([A-Z]{2,3}-\d+)/);

                if (keyMatch) {
                    const key = keyMatch[1];
                    let name = 'Unknown Issue';

                    // Try to get name from link text or nearby elements
                    const linkText = link.textContent.trim();
                    if (linkText && linkText !== key && linkText.length > key.length) {
                        name = linkText.replace(key, '').trim();
                        name = name.replace(/^[\s\-:]+|[\s\-:]+$/g, '') || 'Unknown Issue';
                    }

                    jiraData.set(key, {
                        key: key,
                        name: name
                    });
                }
            });
        }

        // Final fallback: Check page text content for any missed keys
        if (jiraData.size === 0) {
            const pageText = document.body.innerText;
            const allMatches = pageText.match(/\b[A-Z]{2,3}-\d+\b/g);
            if (allMatches) {
                const uniqueKeys = [...new Set(allMatches)];
                uniqueKeys.forEach(key => {
                    jiraData.set(key, {
                        key: key,
                        name: 'Unknown Issue'
                    });
                });
            }
        }

        return Array.from(jiraData.values());
    }

    /** fetch test cases linked to Jira keys */
    async function fetchTestCasesForJiraKeys(projectCode, jiraKeys) {
        if (!jiraKeys || jiraKeys.length === 0) return [];

        const allTestCases = [];
        let offset = 0;
        const limit = 100;
        let hasMoreData = true;

        // Build the external_issues[ids][] parameters for all Jira keys
        const idsParams = jiraKeys.map(key => `external_issues[ids][]=${encodeURIComponent(key)}`).join('&');

        while (hasMoreData) {
            const url = `https://api.qase.io/v1/case/${projectCode}?external_issues[type]=jira-cloud&${idsParams}&include=external_issues&limit=${limit}&offset=${offset}`;

            try {
                const response = await api({
                    method: 'GET',
                    url: url,
                    headers: { 'Token': getQaseApiToken() }
                });

                if (response.result && response.result.entities) {
                    const testCases = response.result.entities;
                    allTestCases.push(...testCases);

                    // Check if we should continue pagination
                    if (testCases.length < limit) {
                        hasMoreData = false;
                    } else {
                        offset += limit;
                    }
                } else {
                    hasMoreData = false;
                }
            } catch (error) {
                console.error('Error fetching test cases for Jira keys:', error);
                hasMoreData = false;
            }
        }

        return allTestCases;
    }

    /** fetch test runs with pagination, filtering by timeframe and external issues */
    async function fetchTestRunsWithPagination(projectCode, startDate, jiraKeys = []) {
        const allTestRuns = [];
        const limit = 100; // Optimal batch size for API efficiency
        const cutoffDate = startDate || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const fromStartTime = Math.floor(cutoffDate.getTime() / 1000); // Convert to Unix timestamp

        try {
            console.log(`Fetching test runs from ${cutoffDate.toISOString()} (timestamp: ${fromStartTime})...`);

            // Get total count with date filter
            const initialResponse = await api({
                method: 'GET',
                url: `https://api.qase.io/v1/run/${projectCode}?limit=1&offset=0&from_start_time=${fromStartTime}&include=external_issue%2Ccases`,
                headers: { 'Token': getQaseApiToken() }
            });

            if (!initialResponse.result) {
                return allTestRuns;
            }

            const totalRuns = initialResponse.result.total;
            console.log(`Found ${totalRuns} runs since cutoff date, fetching all data in parallel...`);

            if (totalRuns === 0) {
                return allTestRuns;
            }

            // Calculate total batches needed to get all data
            const totalBatches = Math.ceil(totalRuns / limit);

            // Process in chunks to avoid overwhelming the API
            const chunkSize = 25; // Process 25 requests at a time
            const chunks = [];

            for (let i = 0; i < totalBatches; i += chunkSize) {
                const chunk = [];
                for (let j = i; j < Math.min(i + chunkSize, totalBatches); j++) {
                    const offset = j * limit;
                    chunk.push({ offset, index: j });
                }
                chunks.push(chunk);
            }

            console.log(`Processing ${totalBatches} batches in ${chunks.length} chunks of ${chunkSize}...`);

            // Process each chunk sequentially, but requests within chunk in parallel
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex];
                console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} requests)...`);

                // Update progress if we're tracking chunks from traceability report
                if (window.qaseTrackChunks && window.qaseProgressCallback) {
                    window.qaseProgressCallback(`Fetching test runs... (chunk ${chunkIndex + 1}/${chunks.length})`, {
                        current: chunkIndex + 1,
                        total: chunks.length
                    });
                }

                const promises = chunk.map(({ offset, index }) => {
                    const url = `https://api.qase.io/v1/run/${projectCode}?limit=${limit}&offset=${offset}&from_start_time=${fromStartTime}&include=external_issue%2Ccases`;

                    return api({
                        method: 'GET',
                        url: url,
                        headers: { 'Token': getQaseApiToken() }
                    }).then(response => ({ response, offset, index }))
                    .catch(error => {
                        console.warn(`Failed to fetch runs at offset ${offset}:`, error);
                        return { response: null, offset, index };
                    });
                });

                const chunkResults = await Promise.all(promises);

                // Sort by index to maintain order and process results
                chunkResults.sort((a, b) => a.index - b.index);

                for (const { response, offset, index } of chunkResults) {
                    if (!response || !response.result || !response.result.entities) continue;

                    const runs = response.result.entities;
                    if (runs.length === 0) continue;

                    // Filter only runs with external issues (date already filtered by API)
                    const filteredRuns = runs.filter(run => {
                        if (!run.external_issue || !run.external_issue.id) return false;

                        // If jiraKeys are provided, only include runs for those specific keys
                        if (jiraKeys.length === 0 || jiraKeys.includes(run.external_issue.id)) {
                            return true;
                        }

                        return false;
                    });

                    allTestRuns.push(...filteredRuns);
                }
            }

            console.log(`Collected ${allTestRuns.length} test runs with external issues`);

        } catch (error) {
            console.error('Error fetching test runs:', error);
        }

        return allTestRuns;
    }

    /** build traceability mapping between Jira keys, test cases, and test runs */
    function buildTraceabilityMapping(testCases, testRuns, jiraData) {
        const mapping = {};

        // Initialize mapping for all Jira keys
        jiraData.forEach(item => {
            mapping[item.key] = {
                jiraKey: item.key,
                jiraName: item.name,
                testCases: [],
                testRuns: [],
                coverage: 'No Coverage'
            };
        });

        // Map test cases to Jira keys
        testCases.forEach(testCase => {
            if (testCase.external_issues && testCase.external_issues.length > 0) {
                testCase.external_issues.forEach(extIssue => {
                    if (extIssue.type === 'jira-cloud' && extIssue.issues) {
                        extIssue.issues.forEach(issue => {
                            if (mapping[issue.id]) {
                                mapping[issue.id].testCases.push(testCase);
                            }
                        });
                    }
                });
            }
        });

        // Map test runs to Jira keys
        testRuns.forEach(testRun => {
            if (testRun.external_issue && testRun.external_issue.id) {
                const jiraKey = testRun.external_issue.id;
                if (mapping[jiraKey]) {
                    // Count total cases in run vs cases linked to this Jira key
                    const totalCasesInRun = testRun.cases ? testRun.cases.length : (testRun.stats ? testRun.stats.total : 0);
                    const linkedCasesInRun = testRun.cases ?
                        testRun.cases.filter(caseId =>
                            mapping[jiraKey].testCases.some(tc => tc.id === caseId)
                        ).length : 0;

                    // Add additional properties to the test run for display
                    const enhancedRun = {
                        ...testRun,
                        totalCasesInRun,
                        linkedCasesInRun
                    };

                    mapping[jiraKey].testRuns.push(enhancedRun);
                }
            }
        });

        // Update coverage status
        Object.values(mapping).forEach(item => {
            if (item.testCases.length > 0 && item.testRuns.length > 0) {
                item.coverage = 'Full Coverage';
            } else if (item.testCases.length > 0) {
                item.coverage = 'Test Cases Only';
            } else if (item.testRuns.length > 0) {
                item.coverage = 'Test Runs Only';
            }
        });

        return mapping;
    }

    // ===================================================================
    // QASE API INTEGRATION
    // ===================================================================

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

        let allCases = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            const data = await api({
                method: 'GET',
                url: `https://api.qase.io/v1/case/${projectCode}?external_issues[type]=jira-cloud&external_issues[ids][]=${issueKey}&limit=${limit}&offset=${offset}`,
                headers: { Token: token }
            });

            if (!data.result) {
                return allCases;
            }

            // Add current page of cases to our collection
            const caseItems = data.result.entities.map(e => ({ id: e.id, title: e.title }));
            allCases.push(...caseItems);

            // Check if we have more pages to fetch
            const total = data.result.total;
            offset += limit;
            hasMore = offset < total;
        }

        return allCases;
    }

    async function fetchQaseEnvironments() {
        const token = getQaseApiToken();
        const projectCode = getQaseProjectCode();

        let allEnvironments = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            const data = await api({
                method: 'GET',
                url: `https://api.qase.io/v1/environment/${projectCode}?limit=${limit}&offset=${offset}`,
                headers: { 'Accept': 'application/json', token: token }
            });

            if (!data.result) {
                return allEnvironments;
            }

            // Add current page of environments to our collection
            allEnvironments.push(...data.result.entities);

            // Check if we have more pages to fetch
            const total = data.result.total;
            offset += limit;
            hasMore = offset < total;
        }

        return allEnvironments;
    }

    async function fetchQaseMilestones() {
        const token = getQaseApiToken();
        const projectCode = getQaseProjectCode();

        let allMilestones = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            const data = await api({
                method: 'GET',
                url: `https://api.qase.io/v1/milestone/${projectCode}?limit=${limit}&offset=${offset}`,
                headers: { 'Accept': 'application/json', token: token }
            });

            if (!data.result) {
                return allMilestones;
            }

            // Add current page of milestones to our collection
            allMilestones.push(...data.result.entities);

            // Check if we have more pages to fetch
            const total = data.result.total;
            offset += limit;
            hasMore = offset < total;
        }

        return allMilestones;
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

            // Create Jira comment documenting the test run creation
            try {
                const commentSuccess = await createJiraComment(projectCode, runData.result.id, data);
                if (!commentSuccess) {
                    console.warn('⚠️ Jira comment creation failed, but test run was created successfully');
                }
            } catch (commentError) {
                console.error('⚠️ Error during Jira comment creation:', commentError);
                // Don't fail the entire operation if comment fails
            }

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

    /** Create a Jira comment documenting the test run creation */
    async function createJiraComment(projectCode, runId, formData) {
        const { issueKey } = getJiraIssueDetails();
        if (!issueKey) {
            console.warn('Could not detect Jira issue ID for comment creation.');
            return false;
        }

        console.log(`Creating Jira comment for ${issueKey} with run ${runId}`);

        const qaseRunUrl = `https://app.qase.io/run/${projectCode}/dashboard/${runId}`;
        
        // Build comment content
        let commentBody = `*✈️ Aviator Test Run Created*\n\n`;
        
        // Replace square brackets with parentheses for Jira link display
        const linkDisplayTitle = formData.title.replace(/\[/g, '(').replace(/\]/g, ')');
        commentBody += `*Test Run:* [${linkDisplayTitle}|${qaseRunUrl}] (ID: ${runId})\n`;
        commentBody += `*Test Cases:* ${formData.caseIds.length} selected\n`;
        
        if (formData.environment.text && formData.environment.text !== 'null') {
            commentBody += `*Environment:* ${formData.environment.text}\n`;
        }
        
        if (formData.milestone.text && formData.milestone.text !== 'null') {
            commentBody += `*Milestone:* ${formData.milestone.text}\n`;
        }
        
        if (Object.keys(formData.configurations).length > 0) {
            commentBody += `*Configurations:* ${Object.keys(formData.configurations).length} selected\n`;
        }
        
        if (formData.tcBuilds.length > 0) {
            commentBody += `*TeamCity Builds Triggered:* ${formData.tcBuilds.length}\n`;
            formData.tcBuilds.forEach(buildId => {
                commentBody += `• [${buildId}|https://ci.paylocity.com/buildConfiguration/${buildId}?mode=builds]\n`;
            });
        }
        
        commentBody += `\n_Created via Aviator at ${new Date().toLocaleString()}_`;

        try {
            // Use fetch for Jira REST API calls (same-origin)
            const response = await fetch(`/rest/api/2/issue/${issueKey}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Atlassian-Token': 'no-check'
                },
                body: JSON.stringify({
                    body: commentBody
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Jira comment successfully created for ${issueKey}:`, result);
                return true;
            } else {
                const errorText = await response.text();
                console.error(`❌ Failed to create Jira comment for ${issueKey}: ${response.status} ${response.statusText} - ${errorText}`);
                return false;
            }

        } catch (error) {
            console.error(`❌ Exception creating Jira comment for ${issueKey}:`, error);
            return false;
        }
    }

    //#endregion Qase Functions

    //#region == TeamCity Functions ==

    // ===================================================================
    // TEAMCITY INTEGRATION
    // ===================================================================

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

    // ===================================================================
    // UI INITIALIZATION & MAIN ENTRY POINTS
    // ===================================================================

    /** add the button to the page. button click calls scrapeAndShowAviator() */
    function addAviatorTools() {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        /** function: creates button to attach to jira page */
        const createAviatorButton = () => {
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

            btn.onclick = scrapeAndShowAviator;
            return btn;
        };

        /** function: creates Traciator button for release pages */
        const createTraciatorButton = () => {
            const btn = document.createElement('button');
            btn.textContent = "🔍 Traciator";
            btn.id = 'qaseTraciatorButton';

            if (isDarkMode) {
                btn.style = `
                    background: ${isDarkMode ? '#f6a58b' : 'white'};
                    color: ${isDarkMode ? '#1f1f21' : '#CC5200'};
                    border: ${isDarkMode ? 'none' : '1px solid #CC5200'};
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
                btn.style.background = '#FF8B00'
                btn.style.borderColor = '#CC5200'
            }

            btn.onclick = scrapeAndShowTraceabilityReport;
            return btn;
        };

        /** function: add Traciator button to release pages */
        const insertTraciatorButtonInReleasePage = () => {
            if (document.querySelector('#qaseTraciatorButton')) return;
            const jiraCreateButton = document.querySelector('[data-testid="atlassian-navigation--create-button"]');
            if (jiraCreateButton) {
                jiraCreateButton.parentNode.insertBefore(createTraciatorButton(), jiraCreateButton.nextSibling);
            }
        };

        /** function: add button when modal is showing for selected issue */
        const insertAviatorButtonInModal = () => {
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
            bar.appendChild(createAviatorButton());
            header.parentElement.insertBefore(bar, header);
        };

        /** function add button when url is the whole ticket */
        const insertAviatorButtonInTicket = () => {
            const observer = new MutationObserver(() => {
                const jiraCreateButton = document.querySelector('[data-testid="atlassian-navigation--create-button"]');
                if (jiraCreateButton && !document.querySelector('#qaseScrapeButton')) {
                    // Insert our button right after the Create button
                    jiraCreateButton.parentNode.insertBefore(createAviatorButton(), jiraCreateButton.nextSibling);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        };

        /** funciton: add button when in backlog and ticket is selected */
        const insertAviatorButtonInSidebar = () => {
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
            bar.appendChild(createAviatorButton());
            header.parentElement.insertBefore(bar, header);
        };

        /** function: decides where to put the button */
        const handleLocationChange = () => {
            const url = window.location.href;

            // Check for release report pages for Traciator button
            if (/\/projects\/[^\/]+\/versions\/\d+\/tab\/release-report-all-issues/.test(url)) {
                const interval = setInterval(() => {
                    if (document.querySelector('[data-testid="atlassian-navigation--create-button"]')) {
                        insertTraciatorButtonInReleasePage();
                        clearInterval(interval);
                    }
                }, 500);
            } else if (/\/projects\/[^\/]+\/boards\/\d+(?:\?.*)?[?&]selectedIssue=/.test(url)) {
                const interval = setInterval(() => {
                    if (document.querySelector('div#jira-issue-header')) {
                        insertAviatorButtonInModal();
                        clearInterval(interval);
                    }
                    else if (document.querySelector('div[data-testid="issue.views.issue-details.issue-layout.compact-layout"]')) {
                        insertAviatorButtonInSidebar();
                        clearInterval(interval);
                    }
                }, 500);
            } else if (/\/browse\/[A-Z]+-\d+/.test(url)) {
                const interval = setInterval(() => {
                    if (document.querySelector('div#jira-issue-header')) {
                        insertAviatorButtonInTicket();
                        clearInterval(interval);
                    }
                }, 500);
            } else if (/\/backlog\?.*selectedIssue=/.test(url)) {
                const interval = setInterval(() => {
                    if (document.querySelector('div#jira-issue-header')) {
                        insertAviatorButtonInModal();
                        clearInterval(interval);
                    }
                    else if (document.querySelector('div[data-testid="issue.views.issue-details.issue-layout.compact-layout"]')) {
                        insertAviatorButtonInSidebar();
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


    // ===================================================================
    // Aviator WORKFLOW - Test Runs in Jira
    // ===================================================================
    async function scrapeAndShowAviator() {
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

    // ===================================================================
    // TRACEABILITY WORKFLOW - Release Traceability
    // ===================================================================

    /** Traciator Orchestrator - main function for traceability report */
    async function scrapeAndShowTraceabilityReport() {
        if (!checkQaseApiToken() || !checkQaseProjectCode()) return;

        const projectCode = getQaseProjectCode();

        // Set up progress callback for granular updates
        window.qaseProgressCallback = (message, progress) => {
            showLoading(message, progress);
        };
        window.qaseTrackChunks = false;

        showLoading('Starting traceability report generation...', { current: 0, total: 4 });

        try {
            // Step 1: Scrape Jira keys from the release page
            showLoading('Scraping Jira keys from release page...', { current: 1, total: 4 });
            const jiraData = scrapeJiraKeysFromReleasePage();

            if (jiraData.length === 0) {
                hideLoading();
                delete window.qaseProgressCallback;
                showMessagePopup('No Jira work item keys found on this release page.', hidePopup);
                return;
            }

            // Step 2: Fetch test cases linked to Jira keys
            showLoading(`Found ${jiraData.length} Jira keys. Fetching test cases...`, { current: 2, total: 4 });
            const jiraKeys = jiraData.map(item => item.key);
            const testCases = await fetchTestCasesForJiraKeys(projectCode, jiraKeys);

            // Step 3: Fetch test runs from the last 2 months
            showLoading(`Found ${testCases.length} test cases. Preparing to fetch test runs...`, { current: 3, total: 4 });

            // Enable chunk progress tracking
            window.qaseTrackChunks = true;

            const testRuns = await fetchTestRunsWithPagination(projectCode, null, jiraKeys);

            // Disable chunk tracking
            window.qaseTrackChunks = false;

            // Step 4: Build traceability mapping
            showLoading('Building traceability mapping...', { current: 4, total: 4 });
            const traceabilityMapping = buildTraceabilityMapping(testCases, testRuns, jiraData);

            // Step 5: Calculate distinct test case count from all sources
            const allDistinctTestCaseIds = new Set();

            // Add test case IDs from fetchTestCasesForJiraKeys
            testCases.forEach(testCase => {
                allDistinctTestCaseIds.add(testCase.id);
            });

            // Add test case IDs from all test runs
            testRuns.forEach(testRun => {
                if (testRun.cases && Array.isArray(testRun.cases)) {
                    if (testRun.cases.length > 0 && typeof testRun.cases[0] === 'object') {
                        // Cases are objects with case_id or id properties
                        testRun.cases.forEach(caseItem => {
                            const caseId = caseItem.case_id || caseItem.id;
                            if (caseId) allDistinctTestCaseIds.add(caseId);
                        });
                    } else {
                        // Cases are direct integer values
                        testRun.cases.forEach(caseId => {
                            allDistinctTestCaseIds.add(caseId);
                        });
                    }
                } else if (testRun.case_ids && Array.isArray(testRun.case_ids)) {
                    // Alternative: if case_ids array exists
                    testRun.case_ids.forEach(caseId => {
                        allDistinctTestCaseIds.add(caseId);
                    });
                }
            });

            const totalDistinctTestCases = allDistinctTestCaseIds.size;

            // Clean up progress tracking
            delete window.qaseProgressCallback;
            delete window.qaseTrackChunks;
            hideLoading();

            // Step 6: Show traceability report with correct distinct test case count
            showTraceabilityReportModal(traceabilityMapping, jiraData.length, totalDistinctTestCases, testRuns.length);

        } catch (error) {
            delete window.qaseProgressCallback;
            delete window.qaseTrackChunks;
            hideLoading();
            console.error('Error generating traceability report:', error);
            showMessagePopup('Error generating traceability report. Check console for details.', hidePopup);
        }
    }

    /** show traceability report modal */
    function showTraceabilityReportModal(traceabilityMapping, totalJiraKeys, totalTestCases, totalTestRuns) {
        blockJiraShortcuts();

        const overlay = document.createElement('div');
        overlay.id = 'qasePopupOverlay';

        // Calculate coverage stats
        const mappingValues = Object.values(traceabilityMapping);
        const fullCoverage = mappingValues.filter(item => item.coverage === 'Full Coverage').length;
        const partialCoverage = mappingValues.filter(item => item.coverage !== 'No Coverage' && item.coverage !== 'Full Coverage').length;
        const noCoverage = mappingValues.filter(item => item.coverage === 'No Coverage').length;

        overlay.innerHTML = `
            <div class="qasePopup" style="max-width: 90vw; width: 1200px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div style="display: flex; align-items: flex-end; gap: 8px;">
                        <h2 style="margin: 0; color: var(--text);">Traciator</h2>
                        <small>v${traciatorVersion}</small>
                    </div>
                    <button id="closeTraceabilityModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text);">&times;</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--text);">${totalJiraKeys}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Jira Keys Found</div>
                    </div>
                    <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--text);">${totalTestCases}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Test Cases</div>
                    </div>
                    <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--text);">${totalTestRuns}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Test Runs</div>
                    </div>
                    <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #4caf50;">${fullCoverage}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Full Coverage</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                    <div style="background: #4caf50; color: white; padding: 8px; border-radius: 4px; text-align: center; font-size: 12px;">
                        Full Coverage: ${fullCoverage}
                    </div>
                    <div style="background: #ff9800; color: white; padding: 8px; border-radius: 4px; text-align: center; font-size: 12px;">
                        Partial Coverage: ${partialCoverage}
                    </div>
                    <div style="background: #f44336; color: white; padding: 8px; border-radius: 4px; text-align: center; font-size: 12px;">
                        No Coverage: ${noCoverage}
                    </div>
                </div>

                <div style="max-height: 60vh; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: var(--bg-card); position: sticky; top: 0;">
                            <tr>
                                <th style="padding: 12px; border-bottom: 1px solid var(--border); text-align: left; color: var(--text); width: 65px;">Jira Key</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--border); text-align: left; color: var(--text); width: 85px;">Status</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--border); text-align: left; color: var(--text); width: 40%;">Jira Name</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--border); text-align: center; color: var(--text); width: 80px;">Test Cases</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--border); text-align: center; color: var(--text); width: 80px;">Test Runs</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--border); text-align: left; color: var(--text);">Recent Runs</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(traceabilityMapping).map(item => {
                                const statusColor = item.coverage === 'Full Coverage' ? '#4caf50' :
                                                  item.coverage === 'No Coverage' ? '#f44336' : '#ff9800';
                                const recentRuns = item.testRuns
                                    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
                                    .slice(0, 3)
                                    .map(run => {
                                        // Get actual test run statistics
                                        const stats = run.stats || {};
                                        const total = stats.total || 0;
                                        const passed = stats.passed || 0;
                                        const failed = stats.failed || 0;
                                        const blocked = stats.blocked || 0;
                                        const skipped = stats.skipped || 0;

                                        // Count distinct test case IDs if available
                                        let distinctCases = 0;
                                        if (run.cases && Array.isArray(run.cases)) {
                                            // Check if cases array contains objects or direct values
                                            if (run.cases.length > 0 && typeof run.cases[0] === 'object') {
                                                // If cases are objects with case_id or id properties
                                                const uniqueCaseIds = new Set(run.cases.map(c => c.case_id || c.id));
                                                distinctCases = uniqueCaseIds.size;
                                            } else {
                                                // If cases are direct integer values
                                                distinctCases = new Set(run.cases).size;
                                            }
                                        } else if (run.case_ids && Array.isArray(run.case_ids)) {
                                            // Alternative: if case_ids array exists
                                            distinctCases = new Set(run.case_ids).size;
                                        } else {
                                            // Fallback: assume total executions represent distinct cases
                                            distinctCases = total;
                                        }

                                        // Always show results in "X/Y passed" format with distinct case count
                                        let resultSummary;
                                        if (total === 0) {
                                            resultSummary = 'No cases';
                                        } else if (total != distinctCases) {
                                            resultSummary = `${passed}/${total} passed (${distinctCases} distinct)`;
                                        }
                                        else {
                                            resultSummary = `${passed}/${total} passed`;
                                        }

                                        // Get title, limit length for display
                                        const title = run.title || `Run #${run.id}`;
                                        const maxLength = 40;
                                        const displayTitle = title.length > maxLength ? title.substring(0, maxLength - 3) + '...' : title;

                                        return `<div style="font-size: 11px; margin: 2px 0; line-height: 1.3;">
                                            <div style="font-weight: 500; color: var(--text);">${displayTitle} <span style="color: var(--text-muted); font-size: 10px;">${resultSummary}</span></div>
                                        </div>`;
                                    })
                                    .join('');

                                return `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 12px; color: var(--text);">
                                            <a href="https://paylocity.atlassian.net/browse/${item.jiraKey}" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: bold;">${item.jiraKey}</a>
                                        </td>
                                        <td style="padding: 12px; color: var(--text);">
                                            <span style="background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">${item.coverage}</span>
                                        </td>
                                        <td style="padding: 12px; color: var(--text); word-wrap: break-word; line-height: 1.4;">
                                            ${item.jiraName || 'Unknown Issue'}
                                        </td>
                                        <td style="padding: 12px; text-align: center; color: var(--text);">${item.testCases.length}</td>
                                        <td style="padding: 12px; text-align: center; color: var(--text);">${item.testRuns.length}</td>
                                        <td style="padding: 12px; color: var(--text-muted);">${recentRuns || '<div style="font-size: 11px; font-style: italic;">No recent runs</div>'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <button id="createTestRunFromTraceability" style="background: #4caf50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">✅ Create Test Run</button>
                    <div>
                        <button id="exportTraceabilityReport" style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Export CSV</button>
                        <button id="closeTraceabilityModal2" style="background: var(--secondary); color: var(--text); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
                    </div>
                </div>
            </div>
        `;

        // Create shadow root if not exists, then add styles and overlay
        if (!shadowRoot) {
            const shadowHost = document.createElement('div');
            shadowHost.id = 'qase-shadow-host';
            document.body.appendChild(shadowHost);
            shadowRoot = shadowHost.attachShadow({ mode: 'open' });

            // Add styles to shadow root
            const style = document.createElement('style');
            style.textContent = shadowStyles;
            shadowRoot.appendChild(style);
        }

        shadowRoot.appendChild(overlay);

        // Event listeners
        const closeModal = () => {
            overlay.remove();
            unblockJiraShortcuts();
        };

        overlay.querySelector('#closeTraceabilityModal').addEventListener('click', closeModal);
        overlay.querySelector('#closeTraceabilityModal2').addEventListener('click', closeModal);

        overlay.querySelector('#exportTraceabilityReport').addEventListener('click', () => {
            exportTraceabilityToCSV(traceabilityMapping);
        });

        overlay.querySelector('#createTestRunFromTraceability').addEventListener('click', () => {
            createTestRunFromTraceability(traceabilityMapping);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Show Traciator changelog once per version
        if (shouldShowTraciatorFeaturePopup()) {
            // Delay slightly to ensure modal is fully rendered
            setTimeout(() => {
                showTraciatorFeaturePopup();
            }, 100);
        }
    }

    /** export traceability data to CSV */
    function exportTraceabilityToCSV(traceabilityMapping) {
        const csvData = [
            ['Jira Key', 'Coverage Status', 'Test Cases Count', 'Test Runs Count', 'Test Case Titles', 'Recent Test Run Details']
        ];

        Object.values(traceabilityMapping).forEach(item => {
            const testCaseTitles = item.testCases.map(tc => tc.title).join('; ');
            const testRunDetails = item.testRuns.slice(0, 5).map(tr => {
                const totalCases = tr.totalCasesInRun || 0;
                const linkedCases = tr.linkedCasesInRun || 0;
                return `${tr.title} (${linkedCases}/${totalCases} cases)`;
            }).join('; ');

            csvData.push([
                item.jiraKey,
                item.coverage,
                item.testCases.length,
                item.testRuns.length,
                testCaseTitles,
                testRunDetails
            ]);
        });

        const csvContent = csvData.map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `traceability_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    /** create test run from traceability data */
    async function createTestRunFromTraceability(traceabilityMapping) {
        // Collect all unique Qase test case IDs from the traceability mapping
        const allQaseIds = new Set();
        Object.values(traceabilityMapping).forEach(item => {
            item.testCases.forEach(testCase => {
                allQaseIds.add(testCase.id);
            });
        });

        const qaseIdsList = Array.from(allQaseIds);

        if (qaseIdsList.length === 0) {
            showMessagePopup('No test cases found in traceability data to create a test run.', hidePopup);
            return;
        }

        // Get available Jira keys from traceability mapping
        const availableJiraKeys = Object.values(traceabilityMapping)
            .map(item => ({ key: item.jiraKey, name: item.jiraName || 'Unknown Issue' }));

        // Fetch test run configuration data
        showLoading('Fetching test run configuration...');
        const qaseConfigData = await fetchQaseTestRunConfig();
        hideLoading();

        // Show the test run configuration modal with Jira key selection
        await showTraceabilityTestRunModal(qaseIdsList, qaseConfigData, availableJiraKeys, traceabilityMapping);
    }

    /** inject shadow DOM styles into document head for global use */
    function injectGlobalStyles() {
        if (document.getElementById('qase-global-styles')) return; // Already injected

        const style = document.createElement('style');
        style.id = 'qase-global-styles';
        style.textContent = shadowStyles;
        document.head.appendChild(style);
    }

    /** show test run creation modal for traceability data */
    async function showTraceabilityTestRunModal(qaseIdsList, qaseConfigData, availableJiraKeys = [], traceabilityMapping = {}) {
        // Ensure global styles are available
        injectGlobalStyles();

        // Create overlay that sits on top of existing modal
        const overlay = document.createElement("div");
        overlay.id = 'qaseTraceabilityTestRunOverlay';
        Object.assign(overlay.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: "999999", // Much higher than shadow DOM modals
            fontFamily: '"Segoe UI", Arial, sans-serif'
        });

        // Create proper modal container using CSS classes
        const container = document.createElement('div');
        container.classList.add('qasePopup');
        Object.assign(container.style, {
            maxWidth: '800px',
            width: '90%',
            maxHeight: '85vh'
        });

        // Header
        const header = document.createElement('div');
        header.classList.add('popup-header');
        header.innerHTML = `
            <div class="popup-title">
                <h2>✅ Create Test Run</h2>
                <button id="closeTraceabilityTestRunModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text); margin-left: auto;">&times;</button>
            </div>`;
        container.appendChild(header);

        // Test cases summary section (full width)
        const summarySection = document.createElement('div');
        summarySection.style.marginBottom = '20px';
        summarySection.innerHTML = `
            <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; border: 1px solid var(--border);">
                <p style="margin: 0; color: var(--text);">This test run will include <strong>${qaseIdsList.length} test cases</strong> identified from the traceability report.</p>
            </div>
        `;
        container.appendChild(summarySection);

        // Content body - single column for configuration
        const popupBody = document.createElement('div');
        popupBody.style.display = 'flex';
        popupBody.style.flexDirection = 'column';
        popupBody.style.flex = '1';
        popupBody.style.overflow = 'hidden';

        // Configuration section
        const configSection = document.createElement('div');
        configSection.classList.add('popup-column');
        // Add configuration elements - styles will be applied via CSS classes
        const configElement = htmlTestRunDetails(qaseConfigData, availableJiraKeys);
        configSection.appendChild(configElement);

        // Add TeamCity builds if available
        let tcBuildDetails = [];
        if (window.aviator?.teamcity?.builds) {
            try {
                tcBuildDetails = await Promise.all(
                    window.aviator.teamcity.builds.map(async (buildId) => {
                        try {
                            return await fetchTeamCityBuildDetails(buildId);
                        } catch (error) {
                            console.warn(`Failed to fetch TeamCity build details for ${buildId}:`, error);
                            return `Error fetching build '${buildId}': ${error.message || 'Access denied or build not found'}`;
                        }
                    })
                );
                if (tcBuildDetails.length > 0) {
                    const tcElement = htmlTeamCityBuilds(tcBuildDetails);
                    configSection.appendChild(tcElement);
                }
            } catch (error) {
                console.warn('Failed to fetch TeamCity build details:', error);
            }
        }

        popupBody.appendChild(configSection);
        container.appendChild(popupBody);

        // Footer
        const footer = document.createElement('div');
        footer.classList.add('popup-footer');
        footer.innerHTML = `
            <button id="createTraceabilityTestRun" class="btn primary">✅ Create Test Run</button>
            <button id="cancelTraceabilityTestRun" class="btn secondary">Cancel</button>
        `;
        container.appendChild(footer);

        overlay.appendChild(container);

        // Add directly to document body with very high z-index to ensure it's on top
        document.body.appendChild(overlay);

        // Set default title based on release page version
        const runTitleInput = container.querySelector('#qaseRunTitle');
        if (runTitleInput) {
            const versionName = extractVersionNameFromReleasePage();
            runTitleInput.value = `${versionName} Release Verification`;
        }

        // Event listeners
        const closeModal = () => {
            overlay.remove();
        };

        container.querySelector('#closeTraceabilityTestRunModal').addEventListener('click', closeModal);
        container.querySelector('#cancelTraceabilityTestRun').addEventListener('click', closeModal);

        container.querySelector('#createTraceabilityTestRun').addEventListener('click', async () => {
            const title = container.querySelector('#qaseRunTitle').value.trim();
            if (!title) {
                alert('Please enter a test run title');
                return;
            }

            const jiraKeySelect = container.querySelector('#qaseJiraKey');
            const selectedJiraKey = jiraKeySelect ? jiraKeySelect.value : null;

            const environment = container.querySelector('#qaseEnv');
            const milestone = container.querySelector('#qaseMilestone');

            const runData = {
                title: title,
                caseIds: qaseIdsList,
                jiraKey: selectedJiraKey,
                environment: {
                    id: environment ? environment.value || null : null,
                    text: environment ? (environment.options[environment.selectedIndex]?.text || null) : null
                },
                milestone: {
                    id: milestone ? milestone.value || null : null,
                    text: milestone ? (milestone.options[milestone.selectedIndex]?.text || null) : null
                },
                configurations: {},
                tcBuilds: []
            };

            // Get configuration selections
            const configSelects = container.querySelectorAll('.qaseConfig');
            configSelects.forEach(select => {
                if (select.value) {
                    runData.configurations[select.getAttribute('data-entity-id')] = parseInt(select.value, 10);
                }
            });

            // Get TeamCity build selections
            const tcBuilds = container.querySelectorAll('.teamcity-build:checked');
            runData.tcBuilds = Array.from(tcBuilds).map(b => b.dataset.id);

            try {
                showLoading('Creating test run...');
                await createTraceabilityTestRunWithData(runData);
                hideLoading();
                closeModal();
            } catch (error) {
                hideLoading();
                console.error('Error creating test run:', error);
                alert('Failed to create test run. See console for details.');
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    }

    // ===================================================================
    // UI COMPONENTS & MODAL GENERATION
    // ===================================================================

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

    function htmlTestRunDetails(qaseConfigData, availableJiraKeys = []) {
        const div = document.createElement('div')

        let jiraKeySection = '';
        if (availableJiraKeys && availableJiraKeys.length > 0) {
            const jiraOptions = availableJiraKeys
                .map(jira => `<option value="${jira.key}">${jira.key} - ${jira.name}</option>`)
                .join('');

            jiraKeySection = `
                <label>Associate with Jira Issue (Optional)</label>
                <select id="qaseJiraKey">
                    <option value="">Select Jira Issue...</option>
                    ${jiraOptions}
                </select>
            `;
        }

        div.innerHTML = `
            <h3>⚙️ Test Run Configuration</h3>
            <label>Test Run Title</label>
            <input type="text" id="qaseRunTitle">
            ${jiraKeySection}
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

    // ===================================================================
    // POPUP & MESSAGE UTILITIES
    // ===================================================================

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


        // Determine title and button text based on message content
        const isSuccess = message.includes('✅') || message.includes('successfully');
        const isWarning = message.includes('⚠️') || message.includes('Warning');

        let title, buttonText;
        if (isSuccess) {
            title = '✅ Success';
            buttonText = 'Great!';
        } else if (isWarning) {
            title = '⚠️ Warning';
            buttonText = 'Got it';
        } else {
            title = '🔒 Oops';
            buttonText = 'Got it';
        }

        box.innerHTML = `
            <h2 style="margin-top:0">${title}</h2>
            <div style="font-size:14px; line-height:1.5; text-align: center;">
                ${message}
            </div>
            <button id="popup-ok" class="btn primary" style="margin-top: 10px">${buttonText}</button>
            `;

        /*  */

        overlay.appendChild(box);
        shadowRoot.appendChild(overlay);

        overlay.querySelector("#popup-ok").addEventListener("click", () => {
            overlay.remove();

            if (typeof onClose == 'function') {
                onClose();
            }
        });
    }

    function shouldShowAviatorFeaturePopup() {
        const seenVersion = localStorage.getItem("aviatorLastFeaturePopup") || "";
        if (seenVersion !== aviatorVersion) {
            localStorage.setItem("aviatorLastFeaturePopup", aviatorVersion);
            return true;
        }
        return false;
    }

    function shouldShowTraciatorFeaturePopup() {
        const seenVersion = localStorage.getItem("traciatorLastFeaturePopup") || "";
        if (seenVersion !== traciatorVersion) {
            localStorage.setItem("traciatorLastFeaturePopup", traciatorVersion);
            return true;
        }
        return false;
    }

    function showTraciatorFeaturePopup() {
        // Ensure shadow root exists
        if (!shadowRoot) {
            createShadowRootOverlay();
        }

        // overlay
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: "999999" // sits above everything including main modal
        });

        // modal box
        const box = document.createElement("div");
        box.classList = 'qasePopup'
        Object.assign(box.style, {
            padding: "20px 24px",
            borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            /* size behavior */
            minWidth: "250px",   // won't shrink below this
            maxWidth: "600px",   // won't grow beyond this
            width: "auto",       // lets it size based on content
            boxSizing: "border-box",
            /* layout */
            display: "flex",
            flexDirection: "column",   // stack title, text, button
            justifyContent: "center",
            alignItems: "center",
        });

        box.innerHTML = `
            <h2 style="margin-top:0">🔍 Traciator Changelog 🔍</h2>
            <div class="test-case-list">
                <label>
                <strong>v1.0.0</strong> – Initial Traciator release! Generate comprehensive traceability reports from release pages.
                </label>

                <label>
                <strong>Core Features:</strong>
                • Visual test coverage mapping between Jira issues, test cases, and test runs<br>
                • Export detailed CSV reports for stakeholder analysis<br>
                • Create test runs directly from traceability data<br>
                • Real-time test run statistics and coverage indicators<br>
                • Smart filtering by specific Jira keys from release pages<br>
                • Distinct test case counting across multiple data sources
                </label>

                <label>
                <strong>How to use:</strong> Navigate to any Jira release page and click the 🔍 Traciator button to generate your traceability report!
                </label>
            </div>
              <button id="traciator-feature-ok" class="btn primary" style="margin-top: 10px">Got it</button>
            `;

        overlay.appendChild(box);
        shadowRoot.appendChild(overlay);

        overlay.querySelector("#traciator-feature-ok").addEventListener("click", () => {
            overlay.remove();
        });
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
                <strong>v1.4.4</strong> – Introducing Traciator v1.0.0! New traceability reporting tool with independent versioning.
                </label>

                <label>
                <strong>v1.4.3</strong> – Add jira comment for every test run created.
                </label>

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
                    <small>v${aviatorVersion}</small>
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
        column2.appendChild(htmlTestRunDetails(qaseConfigData, []))
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
        if (shouldShowAviatorFeaturePopup()) {
            showFeaturePopup(shadowRoot);
        }
    }

    /** create test run with data from traceability modal */
    async function createTraceabilityTestRunWithData(runData) {
        const projectCode = getQaseProjectCode();
        const token = getQaseApiToken();

        // Validate required data
        if (!runData.title || !runData.caseIds || runData.caseIds.length === 0) {
            throw new Error('Missing required run data: title and case IDs are required');
        }

        // Build payload with proper null handling for optional fields
        const payload = {
            title: runData.title,
            cases: runData.caseIds
        };

        // Only add optional fields if they have valid values
        if (runData.environment && runData.environment.id) {
            payload.environment_id = parseInt(runData.environment.id, 10);
        }

        if (runData.milestone && runData.milestone.id) {
            payload.milestone_id = parseInt(runData.milestone.id, 10);
        }

        if (runData.configurations && Object.keys(runData.configurations).length > 0) {
            payload.configurations = runData.configurations;
        }

        console.log('Creating test run with payload:', payload);

        const response = await api({
            method: 'POST',
            url: `https://api.qase.io/v1/run/${projectCode}`,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Token': token
            },
            data: payload
        });

        const runId = response.result.id;
        console.log(`Qase: Traceability Test Run Created: ${runId}`);

        // Trigger any TeamCity builds
        if (runData.tcBuilds && runData.tcBuilds.length > 0) {
            try {
                await triggerTeamCityBuilds(runId, runData.caseIds);
            } catch (error) {
                console.warn('Failed to trigger TeamCity builds:', error);
            }
        }

        // Associate with Jira issue if selected
        if (runData.jiraKey) {
            try {
                showLoading('Associating test run with Jira issue...');
                await api({
                    method: 'POST',
                    url: `https://api.qase.io/v1/run/${projectCode}/external-issue`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Token': token
                    },
                    data: {
                        type: 'jira-cloud',
                        links: [{ run_id: runId, external_issue: runData.jiraKey }]
                    }
                });

                console.log(`Qase: Test run ${runId} successfully associated with Jira issue ${runData.jiraKey}`);
                showMessagePopup(`✅ Test run created and associated successfully!\n\nRun ID: ${runId}\nTitle: ${runData.title}\nJira Issue: ${runData.jiraKey}\nTest Cases: ${runData.caseIds.length}`, hidePopup);

            } catch (associationError) {
                console.warn('Failed to associate test run with Jira issue:', associationError);
                showMessagePopup(`✅ Test run created successfully!\n⚠️ Warning: Could not associate with Jira issue ${runData.jiraKey}\n\nRun ID: ${runId}\nTitle: ${runData.title}\nTest Cases: ${runData.caseIds.length}`, hidePopup);
            }
        } else {
            showMessagePopup(`✅ Test run created successfully!\n\nRun ID: ${runId}\nTitle: ${runData.title}\nTest Cases: ${runData.caseIds.length}`, hidePopup);
        }
    }

    /** entrance point to the script */
    addAviatorTools();

})();