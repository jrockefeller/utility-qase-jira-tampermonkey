const Epiciator = {
    version: '1.0.0',
    versionKey: 'epiciatorLastFeaturePopup',

    isEpicIssueContext: function () {
        const issueTypeBtn = document.querySelector(
            '[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"] ' +
            '[data-testid="issue.views.issue-base.foundation.change-issue-type.button"]'
        );

        const label = issueTypeBtn?.getAttribute('aria-label') || '';
        return label.trim() === 'Epic - Change work type';
    },

    scrapeChildIssueKeysFromEpicPage: async function ({ maxScrollPasses = 25, stablePasses = 3 } = {}) {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const keys = new Set();
        let stable = 0;
        let lastSize = 0;

        const collect = () => {
            const table = document.querySelector('table[aria-label="Work"][data-vc="issue-table"], table[aria-label="Work"]');
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

            await AviatorShared.html.showCreateTestRunModal(
                distinctCaseIds,
                qaseConfigData,
                availableJiraKeys,
                {
                    source: 'epiciator',
                    defaultTitle: issueKey ? `${issueKey} Epic Verification` : undefined,
                    sourceLabel: `Epic child work items (${childKeys.length})`,
                    onCreateRun: Traciator.createTraceabilityTestRunWithData
                }
            );

            if (AviatorShared.configuration.shouldShowFeaturePopup(Epiciator.versionKey, Epiciator.version)) {
                setTimeout(() => {
                    Epiciator.showEpiciatorFeaturePopup();
                }, 50);
            }
        });
    },

    showEpiciatorFeaturePopup: function () {
        const box = AviatorShared.html.createModalBox({
            className: 'qasePopup',
            id: 'qaseEpiciatorChangelog',
            maxWidth: '600px',
            customStyles: {
                width: 'auto',
                justifyContent: 'center',
                alignItems: 'center'
            }
        });

        box.innerHTML = `
            <h2 class="qase-mt-0">🧩 Epiciator Changelog 🧩</h2>
            <div class="changelog-container">

                <div class="changelog-entry featured">
                    <div class="changelog-version">v1.0.0</div>
                    <div class="changelog-description">Initial Epiciator release for Jira Epic pages.</div>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">Core Features</div>
                    <ul class="changelog-feature-list">
                        <li>Scrape child work items directly from the Epic Work table</li>
                        <li>Collect linked Qase test cases across all Epic children</li>
                        <li>Create a consolidated Qase test run for the Epic</li>
                        <li>Prefill the run title using the current Epic key</li>
                        <li>Reuse the shared test run configuration and TeamCity options</li>
                    </ul>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">How to use</div>
                    <div class="changelog-text">Open a Jira Epic and click the 🧩 Epiciator button to build a test run from its child work items.</div>
                </div>
                        </div>
                            <button id="epiciator-feature-ok" class="btn primary qase-mt-10">Got it</button>
            `;

        AviatorShared.html.openModal({
            overlayId: 'qaseEpiciatorFeatureOverlay',
            zIndex: '999999',
            mountHost: 'body',
            closeOnOverlayClick: false,
            closeOnEscape: false,
            closeSelectors: ['#epiciator-feature-ok'],
            container: box,
            useSections: false
        });
    },

}