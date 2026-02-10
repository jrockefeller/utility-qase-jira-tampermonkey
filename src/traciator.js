// traciator.js
// Traciator Workflow v1.0.0

const Traciator = {
    version: '1.0.0',

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
    },

    buildTraceabilityMapping: function (testCases, testRuns, jiraData) {
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
    },

    scrapeAndShowTraceabilityReport: async function () {
        if (!AviatorShared.configuration.checkQaseApiToken() || !AviatorShared.configuration.checkQaseProjectCode()) return;

        const projectCode = AviatorShared.configuration.getQaseProjectCode();

        // Set up progress callback for granular updates
        window.qaseProgressCallback = (message, progress) => {
            AviatorShared.showLoading(message, progress);
        };
        window.qaseTrackChunks = false;

        AviatorShared.showLoading('Starting traceability report generation...', { current: 0, total: 4 });

        try {
            // Step 1: Scrape Jira keys from the release page
            AviatorShared.showLoading('Scraping Jira keys from release page...', { current: 1, total: 4 });
            const jiraData = Traciator.scrapeJiraKeysFromReleasePage();

            if (jiraData.length === 0) {
                AviatorShared.hideLoading();
                delete window.qaseProgressCallback;
                AviatorShared.showMessagePopup('No Jira work item keys found on this release page.', 'warning', AviatorShared.hidePopup);
                return;
            }

            // Step 2: Fetch test cases linked to Jira keys
            AviatorShared.showLoading(`Found ${jiraData.length} Jira keys. Fetching test cases...`, { current: 2, total: 4 });
            const jiraKeys = jiraData.map(item => item.key);
            const testCases = await AviatorShared.qase.fetchTestCasesForJiraKeys(projectCode, jiraKeys);

            // Step 3: Fetch test runs from the last 2 months
            AviatorShared.showLoading(`Found ${testCases.length} test cases. Preparing to fetch test runs...`, { current: 3, total: 4 });

            // Enable chunk progress tracking
            window.qaseTrackChunks = true;

            const testRuns = await AviatorShared.qase.fetchTestRunsWithPagination(projectCode, null, jiraKeys);

            // Disable chunk tracking
            window.qaseTrackChunks = false;

            // Step 4: Build traceability mapping
            AviatorShared.showLoading('Building traceability mapping...', { current: 4, total: 4 });
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

            // Clean up progress tracking
            delete window.qaseProgressCallback;
            delete window.qaseTrackChunks;
            AviatorShared.hideLoading();

            // Step 6: Show traceability report with correct distinct test case count
            Traciator.showTraceabilityReportModal(traceabilityMapping, jiraData.length, totalDistinctTestCases, testRuns.length);

        } catch (error) {
            delete window.qaseProgressCallback;
            delete window.qaseTrackChunks;
            AviatorShared.hideLoading();
            console.error('Error generating traceability report:', error);
            AviatorShared.showMessagePopup('Error generating traceability report. Check console for details.', 'error', AviatorShared.hidePopup);
        }
    },

    showTraceabilityReportModal: function (traceabilityMapping, totalJiraKeys, totalTestCases, totalTestRuns) {
        AviatorShared.jira.blockJiraShortcuts();

        const overlay = document.createElement('div');
        overlay.id = 'qasePopupOverlay';

        // Calculate coverage stats
        const mappingValues = Object.values(traceabilityMapping);
        const fullCoverage = mappingValues.filter(item => item.coverage === 'Full Coverage').length;
        const partialCoverage = mappingValues.filter(item => item.coverage !== 'No Coverage' && item.coverage !== 'Full Coverage').length;
        const noCoverage = mappingValues.filter(item => item.coverage === 'No Coverage').length;

        overlay.innerHTML = `
            <div class="qasePopup" id="qasePopup" style="max-width: 90vw; width: 1200px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div style="display: flex; align-items: flex-end; gap: 8px;">
                        <h2 style="margin: 0; color: var(--text);">Traciator</h2>
                        <small>v${Traciator.version}</small>
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
        if (!AviatorShared.shadowRoot) {
            const shadowHost = document.createElement('div');
            shadowHost.id = 'qase-shadow-host';
            document.body.appendChild(shadowHost);
            AviatorShared.shadowRoot = shadowHost.attachShadow({ mode: 'open' });

            // Add styles to shadow root
            const style = document.createElement('style');
            style.textContent = AviatorShared.shadowStyles;
            AviatorShared.shadowRoot.appendChild(style);
        }

        AviatorShared.shadowRoot.appendChild(overlay);

        // Event listeners
        const closeModal = () => {
            overlay.remove();
            AviatorShared.jira.unblockJiraShortcuts();
        };

        // Set up event listeners using centralized utility
        AviatorShared.addEventListeners(overlay, {
            '#closeTraceabilityModal': { 'click': closeModal },
            '#closeTraceabilityModal2': { 'click': closeModal },
            '#exportTraceabilityReport': {
                'click': () => {
                    Traciator.exportTraceabilityToCSV(traceabilityMapping);
                }
            },
            '#createTestRunFromTraceability': {
                'click': () => {
                    Traciator.createTestRunFromTraceability(traceabilityMapping);
                }
            }
        });

        // Close on overlay background click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Show Traciator changelog once per version
        if (Traciator.shouldShowTraciatorFeaturePopup()) {
            // Delay slightly to ensure modal is fully rendered
            setTimeout(() => {
                Traciator.showTraciatorFeaturePopup();
            }, 100);
        }
    },

    exportTraceabilityToCSVfunction: function (traceabilityMapping) {
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

    createTestRunFromTraceability: async function (traceabilityMapping) {
        // Collect all unique Qase test case IDs from the traceability mapping
        const allQaseIds = new Set();
        Object.values(traceabilityMapping).forEach(item => {
            item.testCases.forEach(testCase => {
                allQaseIds.add(testCase.id);
            });
        });

        const qaseIdsList = Array.from(allQaseIds);

        if (qaseIdsList.length === 0) {
            AviatorShared.showMessagePopup('No test cases found in traceability data to create a test run.', 'warning', AviatorShared.hidePopup);
            return;
        }

        // Get available Jira keys from traceability mapping
        const availableJiraKeys = Object.values(traceabilityMapping)
            .map(item => ({ key: item.jiraKey, name: item.jiraName || 'Unknown Issue' }));

        // Fetch test run configuration data
        AviatorShared.showLoading('Fetching test run configuration...');
        const qaseConfigData = await AviatorShared.qase.fetchQaseTestRunConfig();
        AviatorShared.hideLoading();

        // Show the test run configuration modal with Jira key selection
        await Traciator.showTraceabilityTestRunModal(qaseIdsList, qaseConfigData, availableJiraKeys, traceabilityMapping);
    },

    showTraceabilityTestRunModal: async function (qaseIdsList, qaseConfigData, availableJiraKeys = [], traceabilityMapping = {}) {
        const projectCode = AviatorShared.configuration.getQaseProjectCode();

        // Ensure global styles are available
        AviatorShared.injectGlobalStyles();

        // Fetch all available test plans for the multi-select dropdown
        let availableTestPlans = [];
        try {
            AviatorShared.showLoading('Fetching available test plans...');
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
                AviatorShared.showLoading('Fetching TeamCity builds...');
                tcBuildDetails = await AviatorShared.teamcity.fetchAllTeamCityBuilds();
                
                // Count total builds to determine layout
                if (tcBuildDetails && (tcBuildDetails.flatBuilds?.length > 0 || tcBuildDetails.projectStructure?.length > 0)) {
                    // Count only valid individual builds (exclude error builds)
                    const validIndividualBuilds = tcBuildDetails.flatBuilds?.filter(build => !build.isError) || [];
                    teamCityBuildsCount = validIndividualBuilds.length;
                    
                    // Count builds in project structure recursively
                    if (tcBuildDetails.projectStructure && Array.isArray(tcBuildDetails.projectStructure)) {
                        function countBuildsInProjects(projects) {
                            let count = 0;
                            projects.forEach(project => {
                                if (project.builds && Array.isArray(project.builds)) {
                                    // Filter out error builds from project builds too
                                    const validProjectBuilds = project.builds.filter(build => !build.isError);
                                    count += validProjectBuilds.length;
                                }
                                if (project.subProjects && Array.isArray(project.subProjects)) {
                                    count += countBuildsInProjects(project.subProjects);
                                }
                            });
                            return count;
                        }
                        const projectBuildCount = countBuildsInProjects(tcBuildDetails.projectStructure);
                        teamCityBuildsCount += projectBuildCount;
                    }
                    
                }
            } catch (error) {
                console.warn('Failed to fetch TeamCity build details:', error);
                teamCityBuildsCount = 0;
            }
        }

        // Hide loading now that all data is fetched
        AviatorShared.hideLoading();

        // Create overlay using centralized utility
        const overlay = AviatorShared.createOverlay({
            id: 'qaseTraceabilityTestRunOverlay',
            background: 'rgba(0,0,0,0.8)',
            appendTo: document.body
        });

        // Create modal container using centralized utility
        const container = AviatorShared.createModalBox({
            className: 'qasePopup',
            id: 'qaseTestRunModal',
            customStyles: {
                maxWidth: '800px',
                width: '90%',
                maxHeight: '85vh',
                justifyContent: 'flex-start',
                alignItems: 'stretch'
            }
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

        // Content body - will be configured based on TeamCity build count
        const popupBody = document.createElement('div');
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

        // Add to shadow root to prevent browser reload dialogs (like Aviator)
        if (!AviatorShared.shadowRoot) {
            const shadowHost = document.createElement('div');
            shadowHost.id = 'qase-shadow-host';
            document.body.appendChild(shadowHost);
            AviatorShared.shadowRoot = shadowHost.attachShadow({ mode: 'open' });

            // Add styles to shadow root
            const style = document.createElement('style');
            style.textContent = AviatorShared.shadowStyles;
            AviatorShared.shadowRoot.appendChild(style);
        }

        AviatorShared.shadowRoot.appendChild(overlay);

        // Set default title based on release page version
        const runTitleInput = container.querySelector('#qaseRunTitle');
        if (runTitleInput) {
            const versionName = Traciator.extractVersionNameFromReleasePage();
            runTitleInput.value = `${versionName} Release Verification`;
        }

        // Event listeners
        const closeModal = () => {
            AviatorShared.hideLoading(); // Hide any loading screens that might be showing
            overlay.remove();
        };

        // Set up event listeners using centralized utility
        AviatorShared.addEventListeners(container, {
            '#closeTraceabilityTestRunModal': { 'click': closeModal },
            '#cancelTraceabilityTestRun': { 'click': closeModal },
            '#createTraceabilityTestRun': {
                'click': async () => {
                    const title = container.querySelector('#qaseRunTitle').value.trim();
                    if (!title) {
                        alert('Please enter a test run title');
                        return;
                    }

            const jiraKeySelect = container.querySelector('#qaseJiraKey');
            const selectedJiraKey = jiraKeySelect ? jiraKeySelect.value : null;

            const environment = container.querySelector('#qaseEnv');
            const milestone = container.querySelector('#qaseMilestone');

            // Get selected test plans from the multi-select dropdown
            const selectedTestPlanCheckboxes = container.querySelectorAll('#testPlanOptions input[type="checkbox"]:checked');
            const selectedTestPlans = Array.from(selectedTestPlanCheckboxes)
                .map(cb => parseInt(cb.value))
                .filter(planId => !isNaN(planId) && planId > 0);

            // Get test cases from selected test plans
            let testPlanCaseIds = [];
            if (selectedTestPlans.length > 0) {
                try {
                    AviatorShared.showLoading('Fetching test cases from selected test plans...');
                    const planDetails = await Promise.all(
                        selectedTestPlans.map(planId => AviatorShared.qase.fetchQaseTestPlanDetails(projectCode, planId))
                    );
                    testPlanCaseIds = planDetails.flatMap(plan => plan.caseIds).filter(id => id != null && !isNaN(id) && id > 0);
                    testPlanCaseIds = [...new Set(testPlanCaseIds)]; // Remove duplicates
                } catch (error) {
                    console.warn('Error fetching test cases from selected test plans:', error);
                    alert('Warning: Could not fetch test cases from some selected test plans.');
                }
            }

            // Combine traceability case IDs with test plan case IDs
            const allCaseIds = [...new Set([...qaseIdsList, ...testPlanCaseIds])];

            const runData = {
                title: title,
                caseIds: allCaseIds,
                jiraKey: selectedJiraKey,
                environment: {
                    id: environment?.value || null,
                    text: environment?.options?.[environment.selectedIndex]?.text || null
                },
                milestone: {
                    id: milestone?.value || null,
                    text: milestone?.options?.[milestone.selectedIndex]?.text || null
                },
                configurations: {},
                tcBuilds: [],
                selectedTestPlans: selectedTestPlans // Add selected test plans for tracking
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
                AviatorShared.showLoading('Creating test run...');
                await Traciator.createTraceabilityTestRunWithData(runData);
                AviatorShared.hideLoading();
                closeModal();
                // Don't close the parent modal - let user decide if they want to stay or leave
            } catch (error) {
                AviatorShared.hideLoading();
                console.error('Error creating test run:', error);
                alert('Failed to create test run. See console for details.');
            }
                }
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    },

    shouldShowTraciatorFeaturePopup: function () {
        const seenVersion = localStorage.getItem("traciatorLastFeaturePopup") || "";
        if (seenVersion !== Traciator.version) {
            localStorage.setItem("traciatorLastFeaturePopup", Traciator.version);
            return true;
        }
        return false;
    },

    showTraciatorFeaturePopup: function () {
        // Ensure shadow root exists
        if (!AviatorShared.shadowRoot) {
            AviatorShared.createShadowRootOverlay();
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
        box.id = 'qasePopup'

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
            <div class="changelog-container">

                <div class="changelog-entry featured">
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
              <button id="traciator-feature-ok" class="btn primary" style="margin-top: 10px">Got it</button>
            `;

        overlay.appendChild(box);
        AviatorShared.shadowRoot.appendChild(overlay);

        // Set up close button using centralized utility
        AviatorShared.addEventListeners(overlay, {
            '#traciator-feature-ok': {
                'click': () => {
                    overlay.remove();
                }
            }
        });
    },

    createTraceabilityTestRunWithData: async function (runData) {
        const projectCode = AviatorShared.configuration.getQaseProjectCode();
        const token = AviatorShared.configuration.getQaseApiToken();

        // Filter out any null, undefined, or invalid case IDs
        const validCaseIds = runData.caseIds.filter(id => id != null && !isNaN(id) && id > 0);

        // Validate required data
        if (!runData.title || !validCaseIds || validCaseIds.length === 0) {
            throw new Error('Missing required run data: title and valid case IDs are required');
        }

        // Build payload with proper null handling for optional fields
        const payload = {
            title: runData.title,
            cases: validCaseIds
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

        const response = await AviatorShared.api({
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

        // Send data to slack for usage tracking
        await AviatorShared.slack.sendResultToSlack(runData);

        // Trigger any TeamCity builds
        if (runData.tcBuilds && runData.tcBuilds.length > 0) {
            try {
                await AviatorShared.teamcity.triggerTeamCityBuilds(runId, runData.caseIds);
            } catch (error) {
                console.warn('Failed to trigger TeamCity builds:', error);
            }
        }

        // Associate with Jira issue if selected
        if (runData.jiraKey) {
            try {
                AviatorShared.showLoading('Associating test run with Jira issue...');
                await AviatorShared.api({
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
                AviatorShared.showMessagePopup(`Test run created and associated successfully!\n\nRun ID: ${runId}\nTitle: ${runData.title}\nJira Issue: ${runData.jiraKey}\nTest Cases: ${runData.caseIds.length}`, 'success', null);

            } catch (associationError) {
                console.warn('Failed to associate test run with Jira issue:', associationError);
                AviatorShared.showMessagePopup(`Test run created successfully!\n⚠️ Warning: Could not associate with Jira issue ${runData.jiraKey}\n\nRun ID: ${runId}\nTitle: ${runData.title}\nTest Cases: ${runData.caseIds.length}`, 'success', null);
            }
        } else {
            AviatorShared.showMessagePopup(`Test run created successfully!\n\nRun ID: ${runId}\nTitle: ${runData.title}\nTest Cases: ${runData.caseIds.length}`, 'success', null);
        }
    }
}