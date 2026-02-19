// traciator.js
// Traciator Workflow v1.0.0

const Traciator = {
    version: '1.1.1',
    versionKey: 'traciatorLastFeaturePopup',

    showTraciatorFeaturePopup: function () {
        const box = AviatorShared.html.createModalBox({
            className: 'qasePopup',
            id: 'qaseTraciatorChangelog',
            maxWidth: '600px',
            customStyles: {
                width: 'auto',
                justifyContent: 'center',
                alignItems: 'center'
            }
        });

        box.innerHTML = `
            <h2 class="qase-mt-0">🔍 Traciator Changelog 🔍</h2>
            <div class="changelog-container">

                <div class="changelog-entry featured">
                    <div class="changelog-version">v1.1.1</div>
                    <ul class="changelog-feature-list">
                        <li>UI styling tweeks for large Teamcity build tree.</li>
                        <li>Bugfix: Tracibility List handle jira key longer than 3 characters.</li>
                    </ul>                   
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.1.0</div>
                    <div class="changelog-description">Performance and Feedback:</div>
                    <ul class="changelog-feature-list">
                        <li>Consolidate status message popup presentation.</li>
                        <li>Selected Teamcity builds provide status information feedback.</li>
                        <li>Robust Teamcity api error messaging.</li>
                        <li>Unified Run Title validation experience.</li>
                        <li>Performant GET qase/runs by 40%</li>
                    </ul>  
                     <div class="changelog-description">Bugs:</div>
                    <ul class="changelog-feature-list">
                        <li>Test run modal shows total cases from all sources.</li>
                        <li>Selected test plans included in created test run.</li>
                    </ul>                   
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.0.0</div>
                    <div class="changelog-description">Initial Traciator release! Generate comprehensive traceability reports from release pages.</div>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">Core Features</div>
                    <ul class="changelog-feature-list">
                        <li>Visual test coverage mapping between Jira issues, test cases, and test runs</li>
                        <li>Export detailed CSV reports for stakeholder analysis</li>
                        <li>Create test runs directly from traceability data</li>
                        <li>Real-time test run statistics and coverage indicators</li>
                        <li>Smart filtering by specific Jira keys from release pages</li>
                        <li>Distinct test case counting across multiple data sources</li>
                    </ul>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">How to use</div>
                    <div class="changelog-text">Navigate to any Jira release page and click the 🔍 Traciator button to generate your traceability report!</div>
                </div>
                        </div>
                            <button id="traciator-feature-ok" class="btn primary qase-mt-10">Got it</button>
            `;

        AviatorShared.html.openModal({
            overlayId: 'qaseTraciatorFeatureOverlay',
            zIndex: '999999',
            mountHost: 'body',
            closeOnOverlayClick: false,
            closeOnEscape: false,
            closeSelectors: ['#traciator-feature-ok'],
            container: box,
            useSections: false
        });
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

    showTraciator: function (traceabilityMapping, totalJiraKeys, totalTestCases, totalTestRuns, allDistinctTestCaseIds = []) {
        AviatorShared.html.hidePopup();
        AviatorShared.jira.blockJiraShortcuts();

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
                        <h2>Traciator</h2>
                        <small>v${Traciator.version}</small>
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

                    return `<div class="traciator-run-item">
                                <div id="testRun-${run.id}" class="traciator-run-title">${displayTitle} <span class="traciator-run-summary">${resultSummary}</span></div>
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
                            await Traciator.compileTestRunData(traceabilityMapping, allDistinctTestCaseIds);
                        });
                    } finally {
                        if (btn) btn.disabled = false;
                    }
                }
            }
        });

        // Show Traciator changelog once per version
        if (AviatorShared.configuration.shouldShowFeaturePopup(Traciator.versionKey, Traciator.version)) {
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

    compileTestRunData: async function (traceabilityMapping, allDistinctTestCaseIds = []) {
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
        await Traciator.showTraceabilityTestRunModal(qaseIdsList, qaseConfigData, availableJiraKeys, traceabilityMapping);
    },

    complileTestRunData: async function (traceabilityMapping, allDistinctTestCaseIds = []) {
        return Traciator.compileTestRunData(traceabilityMapping, allDistinctTestCaseIds);
    },

    showTraceabilityTestRunModal: async function (qaseIdsList, qaseConfigData, availableJiraKeys = [], traceabilityMapping = {}) {
        const projectCode = AviatorShared.configuration.getQaseProjectCode();

        // Styles are injected into the shadow root by createShadowRootOverlay()

        // Fetch all available test plans for the multi-select dropdown
        let availableTestPlans = [];
        try {
            AviatorShared.html.showLoading('Fetching available test plans...');
            availableTestPlans = await AviatorShared.qase.fetchQaseTestPlans();
        } catch (error) {
            console.warn('Could not fetch available test plans:', error);
            // Continue without test plans - user can still use traceability test cases
        }

        // Add TeamCity builds if available
        let tcBuildDetails = [];
        let teamCityBuildsCount = 0;
        if (window.aviator?.teamcity?.builds || window.aviator?.teamcity?.projects) {
            try {
                AviatorShared.html.showLoading('Fetching TeamCity builds...');
                tcBuildDetails = await AviatorShared.teamcity.fetchAllTeamCityBuilds();

                teamCityBuildsCount = AviatorShared.teamcity.countTeamCityBuilds(tcBuildDetails);
            } catch (error) {
                console.warn('Failed to fetch TeamCity build details:', error);
                teamCityBuildsCount = 0;
            }
        }

        // Hide loading now that all data is fetched
        AviatorShared.html.hideLoading();

        const {
            overlay,
            container,
            body: popupBody,
            close: closeModal
        } = AviatorShared.html.openModal({
            overlayId: 'qaseModalOverlay',
            zIndex: '999999',
            mountHost: 'body',
            closeOnOverlayClick: false,
            closeOnEscape: false,
            modalBox: {
                className: 'qasePopup',
                id: 'qaseTestRunModal',
                customStyles: {
                    maxWidth: '800px',
                    width: '90%',
                    maxHeight: '85vh',
                    justifyContent: 'flex-start',
                    alignItems: 'stretch'
                }
            },
            sections: {
                headerHtml: `
                <div class="popup-title">
                    <h2>✅ Create Test Run</h2>
                    <button id="qaseCloseBtn" class="qase-icon-btn qase-ml-auto">&times;</button>
                </div>`,
                footerHtml: `
                <button id="qaseRunBtn" class="btn primary">✅ Create Test Run</button>
                <button id="qaseCancelBtn" class="btn secondary">Cancel</button>
            `
            },
            onClose: () => {
                AviatorShared.html.hideLoading();
            }
        });

        // Test cases summary section (full width)
        const summaryWrap = document.createElement('div');
        summaryWrap.className = 'qase-mt-10';
        summaryWrap.style.marginBottom = '15px';

        const summaryCard = document.createElement('div');
        summaryCard.id = 'create-run-summary';
        summaryCard.className = 'qase-card';

        const summaryP = document.createElement('p');
        summaryP.style.margin = '0';
        summaryP.textContent = `This test run will include ${qaseIdsList.length} test cases identified from the traceability report.`;
        // emphasize number with <strong> without style attributes
        summaryP.innerHTML = `This test run will include <strong>${qaseIdsList.length} test cases</strong> identified from the traceability report.`;

        summaryCard.appendChild(summaryP);
        summaryWrap.appendChild(summaryCard);
        container.insertBefore(summaryWrap, popupBody);

        // Content body - will be configured based on TeamCity build count
        popupBody.style.display = 'flex';
        popupBody.style.flex = '1';
        popupBody.style.overflow = 'hidden';

        // Adjust modal width based on layout (now that we know the build count)
        if (teamCityBuildsCount > 0) {
            Object.assign(container.style, {
                maxWidth: '1200px',
                width: '95%'
            });
        }

        // Determine layout based on TeamCity builds count

        if (teamCityBuildsCount > 0) {
            // Two column layout for Traciator when builds are available
            // Column 1: Configuration only
            const column1 = document.createElement('div');
            column1.classList.add('popup-column');
            column1.style.flex = '1';
            const configElement = AviatorShared.html.htmlTestRunDetails(qaseConfigData, availableJiraKeys, availableTestPlans);
            column1.appendChild(configElement);
            popupBody.appendChild(column1);

            // Column 2: TeamCity builds only (without wrapper div for standalone column)
            const column2 = document.createElement('div');
            column2.classList.add('popup-column');
            column2.style.flex = '1';
            const tcElement = AviatorShared.html.htmlTeamCityBuilds(tcBuildDetails, false);
            column2.appendChild(tcElement);
            popupBody.appendChild(column2);

            // Force row layout immediately
            popupBody.setAttribute('style', 'display: flex !important; flex-direction: row !important; gap: 20px !important; flex: 1 !important; overflow: hidden !important;');
        } else {
            // Single column layout when no TeamCity builds
            // Single column: Configuration only
            const column1 = document.createElement('div');
            column1.classList.add('popup-column');
            column1.style.flex = '1';
            const configElement = AviatorShared.html.htmlTestRunDetails(qaseConfigData, availableJiraKeys, availableTestPlans);
            column1.appendChild(configElement);
            popupBody.appendChild(column1);

            // Single column layout
            popupBody.setAttribute('style', 'display: flex !important; flex-direction: column !important; flex: 1 !important; overflow: hidden !important;');
        }



        // overlay + container already mounted by openModal

        // Set default title based on release page version
        const runTitleInput = container.querySelector('#qaseRunTitle');
        if (runTitleInput) {
            const versionName = Traciator.extractVersionNameFromReleasePage();
            runTitleInput.value = `${versionName} Release Verification`;
        }

        const { validate: validateRunTitle } = AviatorShared.validation.setupRunTitleValidation({
            root: container,
            minLength: 5
        });

        // Run button handler
        const runBtn = container.querySelector('#qaseRunBtn');
        if (runBtn) {
            runBtn.addEventListener('click', async () => {
                const createBtn = container.querySelector('#qaseRunBtn');
                if (createBtn?.disabled) return;
                if (createBtn) createBtn.disabled = true;
                if (!validateRunTitle()) {
                    if (runTitleInput) runTitleInput.focus();
                    if (createBtn) createBtn.disabled = false;
                    return;
                }

                const formData = AviatorShared.html.getTestRunFormData(container);
                const selectedTestPlans = formData.selectedTestPlanIds;

                // Get test cases from selected test plans
                let testPlanCaseIds = [];
                if (selectedTestPlans.length > 0) {
                    try {
                        AviatorShared.html.showLoading('Fetching test cases from selected test plans...');
                        testPlanCaseIds = await AviatorShared.qase.fetchQaseCaseIdsForTestPlans(projectCode, selectedTestPlans);
                    } catch (error) {
                        console.warn('Error fetching test cases from selected test plans:', error);
                        alert('Warning: Could not fetch test cases from some selected test plans.');
                    }
                }

                // Combine traceability case IDs with test plan case IDs
                const allCaseIds = AviatorShared.qase.mergeQaseCaseIds(qaseIdsList, testPlanCaseIds);

                const runData = {
                    title: formData.title,
                    caseIds: allCaseIds,
                    jiraKey: formData.jiraKey,
                    environment: formData.environment,
                    milestone: formData.milestone,
                    configurations: formData.configurations,
                    tcBuilds: formData.tcBuilds,
                    selectedTestPlans: selectedTestPlans // Add selected test plans for tracking
                };

                try {
                    AviatorShared.html.showLoading('Creating test run...');
                    await Traciator.createTraceabilityTestRunWithData(runData);
                    AviatorShared.html.hideLoading();
                    closeModal();
                    // Don't close the parent modal - let user decide if they want to stay or leave
                } catch (error) {
                    AviatorShared.html.hideLoading();
                    console.error('Error creating test run:', error);
                    alert('Failed to create test run. See console for details.');
                    if (createBtn) createBtn.disabled = false;
                }
            });
        }
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
            await AviatorShared.slack.sendResultToSlack(runData, 'traciator');

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

            // Trigger any TeamCity builds (or show success-only modal when none)
            if (runData.tcBuilds && runData.tcBuilds.length > 0) {
                try {
                    await AviatorShared.teamcity.triggerTeamCityBuilds(runId, validCaseIds, { summary });
                } catch (error) {
                    console.warn('Failed to trigger TeamCity builds:', error);
                    // still show summary-only modal to confirm run creation
                    AviatorShared.html.showStatusModal([], { summary });
                }
            } else {
                AviatorShared.html.showStatusModal([], { summary });
            }
        });
    }
}