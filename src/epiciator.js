const Epiciator = {
    version: '2.0.0',

    isEpicIssueContext: function () {
        return AviatorShared.configuration.isEpicIssueContext();
    },

    scrapeChildIssueKeysFromEpicPage: async function ({ maxScrollPasses = 25, stablePasses = 3 } = {}) {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const keys = new Set();
        let stable = 0;
        let lastSize = 0;

        const collect = () => {
            const table = document.querySelector('table[aria-label*="Work"][data-vc="issue-table"], table[aria-label*="Work"]');
            if (!table) return;

            const anchors = table.querySelectorAll(
                'a[data-testid="native-issue-table.common.ui.issue-cells.issue-key.issue-key-cell"], ' +
                'a[href^="/browse/"]'
            );

            anchors.forEach(a => {
                const text = (a.textContent || '').trim();
                if (/^[A-Z][A-Z0-9]+-\d+$/i.test(text)) keys.add(text.toUpperCase());
            });
        };

        // Best-effort: Jira virtualizes this table; scrolling loads more.
        for (let pass = 0; pass < maxScrollPasses; pass++) {
            collect();

            if (keys.size === lastSize) stable++;
            else stable = 0;

            if (stable >= stablePasses) break;

            lastSize = keys.size;

            window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
            await sleep(450);
        }

        return Array.from(keys);
    },

    initEpiciator: async function () {
        return AviatorShared.util.singleFlight('Epiciator.initEpiciator', async () => {
            if (!AviatorShared.configuration.checkQaseApiToken() || !AviatorShared.configuration.checkQaseProjectCode()) return;

            /** check qase connection to verify can show the popup */
            if (await AviatorShared.qase.verifyConnectToQase()) {
                AviatorShared.html.hideLoading();
                AviatorShared.html.showStatusModal([], {
                    notification: { message: 'Error connecting to Qase. Check your token and project are correct', type: 'error' },
                    onClose: AviatorShared.html.hidePopup
                });
                return;
            }

            if (!Epiciator.isEpicIssueContext()) {
                AviatorShared.html.showStatusModal([], {
                    notification: { message: 'Epiciator only runs on Jira Epic pages.', type: 'warning' },
                    onClose: AviatorShared.html.hidePopup
                });
                return;
            }

            const projectCode = AviatorShared.configuration.getQaseProjectCode();
            const { issueKey, issueTitle } = AviatorShared.configuration.getJiraIssueDetails();

            AviatorShared.html.showLoading('Finding Epic child work items...');
            const childKeys = await Epiciator.scrapeChildIssueKeysFromEpicPage();

            if (!childKeys || childKeys.length === 0) {
                AviatorShared.html.hideLoading();
                AviatorShared.html.showStatusModal([], {
                    notification: { message: 'No child work items found in the Epic Work table.', type: 'warning' },
                    onClose: AviatorShared.html.hidePopup
                });
                return;
            }

            AviatorShared.html.showLoading(`Found ${childKeys.length} child items. Fetching Qase test cases...`);
            const testCases = await AviatorShared.qase.fetchTestCasesForJiraKeys(projectCode, childKeys);

            const distinctCaseIds = Array.from(
                new Set((testCases || []).map(tc => tc?.id).filter(id => id != null && !isNaN(id) && id > 0))
            );

            if (distinctCaseIds.length === 0) {
                AviatorShared.html.hideLoading();
                AviatorShared.html.showStatusModal([], {
                    notification: { message: 'No Qase test cases linked to any Epic child work items.', type: 'warning' },
                    onClose: AviatorShared.html.hidePopup
                });
                return;
            }

            AviatorShared.html.showLoading('Fetching test run configuration...');
            const qaseConfigData = await AviatorShared.qase.fetchQaseTestRunConfig();
            AviatorShared.html.hideLoading();

            const availableJiraKeys = issueKey
                ? [{ key: issueKey, name: issueTitle || 'Epic' }]
                : [];

            const includeJiraCommentNotes = AviatorShared.configuration.isFeatureEnabled('jiraCommentNotes');

            await AviatorShared.html.showCreateTestRunModal(
                distinctCaseIds,
                qaseConfigData,
                availableJiraKeys,
                {
                    source: 'epiciator',
                    defaultTitle: issueKey ? `${issueKey} Epic Verification` : undefined,
                    defaultJiraKey: issueKey || undefined,
                    sourceLabel: `Epic child work items (${childKeys.length})`,
                    includeJiraCommentNotes,
                    onCreateRun: Traciator.createTraceabilityTestRunWithData
                }
            );

            if (AviatorShared.changelog.shouldShowToolPopup()) {
                setTimeout(() => {
                    Epiciator.showEpiciatorFeaturePopup();
                }, 50);
            }
        });
    },

    showEpiciatorFeaturePopup: function () {
        AviatorShared.changelog.showToolPopup('epiciator');
    },

}