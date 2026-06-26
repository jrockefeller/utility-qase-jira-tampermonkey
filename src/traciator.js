// traciator.js
// Traciator Workflow v1.0.0

const Traciator = {
    version: '2.0.0',

    showTraciatorFeaturePopup: function () {
        AviatorShared.changelog.showToolPopup('traciator');
    },

    initTraciator: async function () {
        if (!AviatorShared.configuration.checkQaseApiToken() || !AviatorShared.configuration.checkQaseProjectCode()) return;

        const projectCode = AviatorShared.configuration.getQaseProjectCode();

        // Set up progress callback for granular updates
        window.qaseProgressCallback = (message, progress) => {
            AviatorShared.html.showLoading(message, progress);
        };
        window.qaseTrackChunks = false;

        AviatorShared.html.showLoading('Starting traceability report generation...', { current: 0, total: 4 });

        try {
            // Step 1: Scrape Jira keys from the release page
            AviatorShared.html.showLoading('Scraping Jira keys from release page...', { current: 1, total: 4 });
            const jiraData = Traciator.scrapeJiraKeysFromReleasePage();

            if (jiraData.length === 0) {
                AviatorShared.html.hideLoading();
                delete window.qaseProgressCallback;
                AviatorShared.html.showStatusModal([], {
                    notification: { message: 'No Jira work item keys found on this release page.', type: 'warning' },
                    onClose: AviatorShared.html.hidePopup
                });
                return;
            }

            // Step 2: Fetch test cases linked to Jira keys
            AviatorShared.html.showLoading(`Found ${jiraData.length} Jira keys. Fetching test cases...`, { current: 2, total: 4 });
            const jiraKeys = jiraData.map(item => item.key);
            const testCases = await AviatorShared.qase.fetchTestCasesForJiraKeys(projectCode, jiraKeys);

            // Step 3: Fetch test runs from the last 30 days
            AviatorShared.html.showLoading(`Found ${testCases.length} test cases. Preparing to fetch test runs...`, { current: 3, total: 4 });

            // Enable chunk progress tracking
            window.qaseTrackChunks = true;

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const testRuns = await AviatorShared.qase.fetchTestRunsWithPagination(projectCode, thirtyDaysAgo, jiraKeys);

            // Disable chunk tracking
            window.qaseTrackChunks = false;

            // Step 4: Build traceability mapping
            AviatorShared.html.showLoading('Building traceability mapping...', { current: 4, total: 4 });
            const traceabilityMapping = Traciator.buildTraceabilityMapping(testCases, testRuns, jiraData);

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
            const allDistinctTestCaseIdsArray = Array.from(allDistinctTestCaseIds);

            // Clean up progress tracking
            delete window.qaseProgressCallback;
            delete window.qaseTrackChunks;
            AviatorShared.html.hideLoading();

            // Step 6: Show traceability report with correct distinct test case count
            Traciator.showTraciator(traceabilityMapping, jiraData.length, totalDistinctTestCases, testRuns.length, allDistinctTestCaseIdsArray);

        } catch (error) {
            delete window.qaseProgressCallback;
            delete window.qaseTrackChunks;
            AviatorShared.html.hideLoading();
            console.error('Error generating traceability report:', error);
            AviatorShared.html.showStatusModal([], {
                notification: { message: 'Error generating traceability report. Check console for details.', type: 'error' },
                onClose: AviatorShared.html.hidePopup
            });
        }
    },

    showTraciator: function (traceabilityMapping, totalJiraKeys, totalTestCases, totalTestRuns, allDistinctTestCaseIds = [], options = {}) {
        AviatorShared.html.hidePopup();
        AviatorShared.jira.blockJiraShortcuts();

        const toolName = options?.toolName || 'Traciator';
        const toolVersion = options?.version || Traciator.version;
        const showFeaturePopup = options?.showFeaturePopup !== false;
        const projectCode = options?.projectCode || AviatorShared.configuration.getQaseProjectCode();

        const container = document.createElement('div');
        container.className = 'qasePopup traciator-report-popup';
        container.id = 'qasePopup';

        // Calculate coverage stats
        const mappingValues = Object.values(traceabilityMapping);
        const fullCoverage = mappingValues.filter(item => item.coverage === 'Full Coverage').length;
        const partialCoverage = mappingValues.filter(item => item.coverage !== 'No Coverage' && item.coverage !== 'Full Coverage').length;
        const noCoverage = mappingValues.filter(item => item.coverage === 'No Coverage').length;

        container.innerHTML = `
                <div class="traciator-titlebar">
                    <div class="traciator-title">
                        <h2>${toolName}</h2>
                        <small>v${toolVersion}</small>
                    </div>
                    <button id="closeTraceabilityModal" class="qase-icon-btn" type="button">&times;</button>
                </div>

                <div id="header-tiles" class="traciator-tiles-4">
                    <div class="traciator-tile">
                        <div class="traciator-tile-value">${totalJiraKeys}</div>
                        <div class="traciator-tile-label">Jira Keys Found</div>
                    </div>
                    <div class="traciator-tile">
                        <div class="traciator-tile-value">${totalTestCases}</div>
                        <div class="traciator-tile-label">Test Cases</div>
                    </div>
                    <div class="traciator-tile">
                        <div class="traciator-tile-value">${totalTestRuns}</div>
                        <div class="traciator-tile-label">Test Runs</div>
                    </div>
                    <div class="traciator-tile">
                        <div class="traciator-tile-value success">${fullCoverage}</div>
                        <div class="traciator-tile-label">Full Coverage</div>
                    </div>
                </div>

                <div id="coverage-tiles" class="traciator-coverage-tiles">
                    <div class="traciator-coverage-tile full">Full Coverage: ${fullCoverage}</div>
                    <div class="traciator-coverage-tile partial">Partial Coverage: ${partialCoverage}</div>
                    <div class="traciator-coverage-tile none">No Coverage: ${noCoverage}</div>
                </div>

                <div class="traciator-table-wrap">
                    <table class="traciator-table">
                        <thead class="traciator-thead">
                            <tr>
                                <th class="traciator-th traciator-col-key">Jira Key</th>
                                <th class="traciator-th traciator-col-status">Status</th>
                                <th class="traciator-th traciator-col-name">Jira Name</th>
                                <th class="traciator-th center traciator-col-cases">Test Cases</th>
                                <th class="traciator-th center traciator-col-runs">Test Runs</th>
                                <th class="traciator-th">Recent Runs</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(traceabilityMapping).map(item => {
            const statusClass = item.coverage === 'Full Coverage'
                ? 'full'
                : item.coverage === 'No Coverage'
                    ? 'none'
                    : 'partial';

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
                    const runUrl = projectCode && run.id
                        ? `https://app.qase.io/run/${projectCode}/dashboard/${run.id}`
                        : null;
                    const runTitleHtml = runUrl
                        ? `<a href="${runUrl}" target="_blank" rel="noopener noreferrer">${displayTitle}</a>`
                        : displayTitle;

                    return `<div class="traciator-run-item">
                                <div id="testRun-${run.id}" class="traciator-run-title">${runTitleHtml} <span class="traciator-run-summary">${resultSummary}</span></div>
                            </div>`;
                })
                .join('');

            return `
                                    <tr class="traciator-tr">
                                        <td class="traciator-td">
                                            <a class="traciator-jira-link" href="https://paylocity.atlassian.net/browse/${item.jiraKey}" target="_blank">${item.jiraKey}</a>
                                        </td>
                                        <td class="traciator-td">
                                            <span class="traciator-badge ${statusClass}">${item.coverage}</span>
                                        </td>
                                        <td class="traciator-td wrap">${item.jiraName || 'Unknown Issue'}</td>
                                        <td class="traciator-td center">${item.testCases.length}</td>
                                        <td class="traciator-td center">${item.testRuns.length}</td>
                                        <td class="traciator-td muted">${recentRuns || '<div class="traciator-no-runs">No recent runs</div>'}</td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="traciator-actions">
                    <button id="createTestRunFromTraceability" class="btn success" type="button">✅ Create Test Run</button>
                    <div class="traciator-actions-right">
                        <button id="exportTraceabilityReport" class="btn primary" type="button">Export CSV</button>
                        <button id="closeTraceabilityModal2" class="btn secondary" type="button">Close</button>
                    </div>
                </div>
        `;

        const { close: closeModal } = AviatorShared.html.openModal({
            overlayId: 'qaseTraciatorReportOverlay',
            zIndex: '999999',
            mountHost: 'body',
            closeOnOverlayClick: false,
            closeOnEscape: false,
            closeSelectors: ['#closeTraceabilityModal', '#closeTraceabilityModal2'],
            container,
            useSections: false
        });

        // Set up event listeners using centralized utility
        AviatorShared.html.addEventListeners(container, {
            '#closeTraceabilityModal': { 'click': closeModal },
            '#closeTraceabilityModal2': { 'click': closeModal },
            '#exportTraceabilityReport': {
                'click': () => {
                    Traciator.exportTraceabilityToCSV(traceabilityMapping);
                }
            },
            '#createTestRunFromTraceability': {
                'click': async () => {
                    const btn = container.querySelector('#createTestRunFromTraceability');
                    if (btn) btn.disabled = true;

                    try {
                        await AviatorShared.util.singleFlight('Traciator.createTestRunFromTraceability', async () => {
                            await Traciator.compileTestRunData(traceabilityMapping, allDistinctTestCaseIds, options);
                        });
                    } finally {
                        if (btn) btn.disabled = false;
                    }
                }
            }
        });

        // Show Traciator changelog once per version
        if (showFeaturePopup && AviatorShared.changelog.shouldShowToolPopup()) {
            // Delay slightly to ensure modal is fully rendered
            setTimeout(() => {
                Traciator.showTraciatorFeaturePopup();
            }, 100);
        }
    },

    extractVersionNameFromReleasePage: function () {
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
    },

    scrapeJiraKeysFromReleasePage: function () {
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
                jiraData.set(key, {
                    key: key,
                    name: name
                });
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
    },

    buildTraceabilityMapping: function (testCases, testRuns, jiraData) {
        const mapping = {};

        const normalizeJiraKey = (key) => {
            if (!key) return null;
            const str = String(key).trim();
            if (!str) return null;
            return str.toUpperCase();
        };

        const extractJiraKeyFromAny = (obj) => {
            if (!obj || typeof obj !== 'object') return null;

            const candidates = [
                obj.id,
                obj.key,
                obj.external_id,
                obj.externalId,
                obj.name,
                obj.title
            ];

            for (const candidate of candidates) {
                const normalized = normalizeJiraKey(candidate);
                if (normalized) return normalized;
            }

            const urlCandidates = [obj.url, obj.link, obj.self, obj.browseUrl];
            for (const url of urlCandidates) {
                if (typeof url !== 'string') continue;
                const match = url.match(/\b([A-Z][A-Z0-9]+-\d+)\b/i);
                if (match) return normalizeJiraKey(match[1]);
            }

            return null;
        };

        const getCaseIdsFromRun = (testRun) => {
            if (!testRun || typeof testRun !== 'object') return [];

            if (Array.isArray(testRun.cases)) {
                if (testRun.cases.length === 0) return [];

                // Qase may return either [123, 456] or [{case_id:123}, ...]
                if (typeof testRun.cases[0] === 'object' && testRun.cases[0] !== null) {
                    return testRun.cases
                        .map(c => c.case_id || c.id)
                        .filter(Boolean);
                }

                return testRun.cases.filter(Boolean);
            }

            if (Array.isArray(testRun.case_ids)) {
                return testRun.case_ids.filter(Boolean);
            }

            return [];
        };

        // Initialize mapping for all Jira keys
        jiraData.forEach(item => {
            const normalizedKey = normalizeJiraKey(item.key);
            if (!normalizedKey) return;
            mapping[normalizedKey] = {
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
                            const jiraKey = extractJiraKeyFromAny(issue);
                            if (jiraKey && mapping[jiraKey]) {
                                mapping[jiraKey].testCases.push(testCase);
                            }
                        });
                    }
                });
            }
        });

        // Map test runs to Jira keys
        testRuns.forEach(testRun => {
            const jiraKey = extractJiraKeyFromAny(testRun.external_issue);
            if (!jiraKey || !mapping[jiraKey]) return;

            // Count total cases in run vs cases linked to this Jira key
            const runCaseIds = getCaseIdsFromRun(testRun);
            const totalCasesInRun = runCaseIds.length || (testRun.stats ? testRun.stats.total : 0);

            const linkedTestCaseIds = new Set(mapping[jiraKey].testCases.map(tc => tc.id).filter(Boolean));
            const linkedCasesInRun = runCaseIds.reduce((acc, id) => (linkedTestCaseIds.has(id) ? acc + 1 : acc), 0);

            // Add additional properties to the test run for display
            const enhancedRun = {
                ...testRun,
                totalCasesInRun,
                linkedCasesInRun
            };

            mapping[jiraKey].testRuns.push(enhancedRun);
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
    },

    exportTraceabilityToCSV: function (traceabilityMapping) {
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
    },

    exportTraceabilityToCSVfunction: function (traceabilityMapping) {
        return Traciator.exportTraceabilityToCSV(traceabilityMapping);
    },

    compileTestRunData: async function (traceabilityMapping, allDistinctTestCaseIds = [], options = {}) {
        // Use the complete set of distinct test case IDs from the traceability report
        let qaseIdsList;

        if (allDistinctTestCaseIds && allDistinctTestCaseIds.length > 0) {
            // Use the full set of distinct test case IDs (includes cases from both test cases and test runs)
            qaseIdsList = allDistinctTestCaseIds;
        } else {
            // Fallback: collect test case IDs only from traceability mapping
            const allQaseIds = new Set();
            Object.values(traceabilityMapping).forEach(item => {
                item.testCases.forEach(testCase => {
                    allQaseIds.add(testCase.id);
                });
            });
            qaseIdsList = Array.from(allQaseIds);
        }

        // Get available Jira keys from traceability mapping
        const availableJiraKeys = Object.values(traceabilityMapping)
            .map(item => ({ key: item.jiraKey, name: item.jiraName || 'Unknown Issue' }));

        // Fetch test run configuration data
        AviatorShared.html.showLoading('Fetching test run configuration...');
        const qaseConfigData = await AviatorShared.qase.fetchQaseTestRunConfig();
        AviatorShared.html.hideLoading();

        // Show the test run configuration modal with Jira key selection
        await AviatorShared.html.showCreateTestRunModal(qaseIdsList, qaseConfigData, availableJiraKeys, {
            source: options?.source || 'traciator',
            defaultTitle: options?.defaultTitle,
            sourceLabel: options?.sourceLabel || 'the traceability report',
            onCreateRun: Traciator.createTraceabilityTestRunWithData
        });
    },

    complileTestRunData: async function (traceabilityMapping, allDistinctTestCaseIds = []) {
        return Traciator.compileTestRunData(traceabilityMapping, allDistinctTestCaseIds);
    },

    showTraceabilityTestRunModal: async function (qaseIdsList, qaseConfigData, availableJiraKeys = [], traceabilityMapping = {}, options = {}) {
        // Backward-compatible wrapper; the modal is hosted in AviatorShared now.
        return AviatorShared.html.showCreateTestRunModal(qaseIdsList, qaseConfigData, availableJiraKeys, {
            ...options,
            source: options?.source || 'traciator',
            sourceLabel: options?.sourceLabel || 'the traceability report',
            onCreateRun: Traciator.createTraceabilityTestRunWithData
        });
    },

    createTraceabilityTestRunWithData: async function (runData) {
        return AviatorShared.util.singleFlight('Traciator.createTraceabilityTestRunWithData', async () => {
            const projectCode = AviatorShared.configuration.getQaseProjectCode();

            // Filter out any null, undefined, or invalid case IDs
            const validCaseIds = runData.caseIds.filter(id => id != null && !isNaN(id) && id > 0);

            // Validate required data
            if (!runData.title || !validCaseIds || validCaseIds.length === 0) {
                throw new Error('Missing required run data: title and valid case IDs are required');
            }

            const runResult = await AviatorShared.qase.createQaseTestRun({
                projectCode,
                title: runData.title,
                caseIds: validCaseIds,
                environmentId: runData.environment?.id,
                milestoneId: runData.milestone?.id,
                configurations: runData.configurations
            });

            const runId = runResult.id;

            // Send data to slack for usage tracking
            const source = runData?.source || 'traciator';
            await AviatorShared.slack.sendResultToSlack(runData, source);

            // Prepare summary for unified status modal
            const summary = {
                runId,
                title: runData.title,
                caseCount: validCaseIds.length,
                jiraKey: runData.jiraKey,
                associationStatus: null,
                associationMessage: null
            };

            // Associate with Jira issue if selected
            if (runData.jiraKey) {
                try {
                    AviatorShared.html.showLoading('Associating test run with Jira issue...');
                    const assoc = await AviatorShared.qase.associateQaseTestRunWithExternalIssue(projectCode, runId, runData.jiraKey);
                    AviatorShared.html.hideLoading();

                    if (assoc) {
                        console.log(`Qase: Test run ${runId} association status: ${assoc.status}`);
                        summary.associationStatus = assoc.status;
                        summary.associationMessage = assoc.message;
                    }

                } catch (associationError) {
                    AviatorShared.html.hideLoading();
                    console.warn('Failed to associate test run with Jira issue:', associationError);
                    summary.associationStatus = 'failed';
                    summary.associationMessage = `Warning: Could not associate with Jira issue ${runData.jiraKey}`;
                }
            }

            const { issueKey: currentIssueKey } = AviatorShared.configuration.getJiraIssueDetails();
            const shouldCreateJiraComment = currentIssueKey
                && runData.jiraKey
                && currentIssueKey.toUpperCase() === runData.jiraKey.toUpperCase();

            const shouldRevealQaseRunsPanel = shouldCreateJiraComment
                && summary.associationStatus === 'linked';

            const handleStatusClose = shouldRevealQaseRunsPanel
                ? () => {
                    if (AviatorShared.html.shouldClosePopup()) {
                        AviatorShared.jira.addQaseTestRunsToJiraUI();
                    }
                }
                : null;

            if (shouldCreateJiraComment) {
                try {
                    await AviatorShared.jira.createJiraComment(projectCode, runId, {
                        ...runData,
                        caseIds: validCaseIds
                    });
                } catch (commentError) {
                    console.warn('Failed to create Jira comment for traceability run:', commentError);
                }
            }

            // Trigger any TeamCity builds (or show success-only modal when none)
            if (runData.tcBuilds && runData.tcBuilds.length > 0) {
                try {
                    await AviatorShared.teamcity.triggerTeamCityBuilds(runId, validCaseIds, { summary, onClose: handleStatusClose });
                } catch (error) {
                    console.warn('Failed to trigger TeamCity builds:', error);
                    // still show summary-only modal to confirm run creation
                    AviatorShared.html.showStatusModal([], { summary, onClose: handleStatusClose });
                }
            } else {
                AviatorShared.html.showStatusModal([], { summary, onClose: handleStatusClose });
            }
        });
    }
}