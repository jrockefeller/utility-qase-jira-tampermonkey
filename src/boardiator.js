const Boardiator = {
    version: '2.0.0',

    showBoardiatorFeaturePopup: function () {
        AviatorShared.changelog.showToolPopup('boardiator');
    },

    isBoardContext: function () {
        return /\/jira\/software\/c\/projects\/[^\/]+\/boards\/\d+/i.test(window.location.pathname);
    },

    getBoardMetadata: function () {
        const match = window.location.pathname.match(/\/jira\/software\/c\/projects\/([^\/]+)\/boards\/(\d+)/i);
        const projectKey = match?.[1] || null;
        const boardId = match?.[2] || null;
        const rawTitle = (document.title || '').replace(/\s*-\s*Jira\s*$/i, '').trim();

        return {
            projectKey,
            boardId,
            boardTitle: rawTitle || (projectKey && boardId ? `${projectKey} Board ${boardId}` : 'Board')
        };
    },

    extractIssueFromCard: function (card) {
        if (!card) return null;

        const keyFromId = card.id && /^[A-Z][A-Z0-9]+-\d+$/i.test(card.id.replace(/^card-/, ''))
            ? card.id.replace(/^card-/, '').toUpperCase()
            : null;

        const keyAnchor = card.querySelector('a[href*="/browse/"]');
        const keyFromAnchor = keyAnchor
            ? ((keyAnchor.textContent || '').trim().match(/^[A-Z][A-Z0-9]+-\d+$/i) ? (keyAnchor.textContent || '').trim().toUpperCase() : null)
            : null;

        const ariaButton = card.querySelector('[data-testid="platform-card.ui.card.focus-container"]');
        const keyFromAria = ariaButton?.getAttribute('aria-label')?.match(/\b([A-Z][A-Z0-9]+-\d+)\b/i)?.[1]?.toUpperCase() || null;

        const key = keyFromId || keyFromAnchor || keyFromAria;
        if (!key) return null;

        const titleNode = card.querySelector(
            '[data-testid="issue-field-single-line-text-readview-card.ui.single-line-text.container.box"]'
        );

        const rawTitle = (titleNode?.textContent || '').trim();
        const ariaLabel = (ariaButton?.getAttribute('aria-label') || '').trim();
        const fallbackTitle = ariaLabel
            .replace(new RegExp(`^${key}\\s+`, 'i'), '')
            .replace(/\.\s*Use the enter key to load the work item\.?$/i, '')
            .trim();
        const title = rawTitle || fallbackTitle;

        return {
            key,
            name: title || key,
            title: title || key
        };
    },

    scrollBoardContainers: function () {
        const selectors = [
            '[data-testid="software-board.board-container.board.virtual-board.fast-virtual-list.fast-virtual-list-wrapper"]',
            '[data-testid*="software-board.board-container"]',
            '[data-testid*="platform-board-kit"]'
        ];

        const seen = new Set();
        const candidates = [];

        selectors.forEach((selector) => {
            document.querySelectorAll(selector).forEach((element) => {
                let current = element;
                for (let depth = 0; current && depth < 3; depth++) {
                    if (!seen.has(current) && current.scrollHeight > current.clientHeight + 20) {
                        seen.add(current);
                        candidates.push(current);
                    }
                    current = current.parentElement;
                }
            });
        });

        candidates.forEach((element) => {
            const nextTop = Math.min(element.scrollTop + Math.max(element.clientHeight - 80, 120), element.scrollHeight);
            element.scrollTop = nextTop;
        });

        window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });

        return candidates.length;
    },

    scrapeBoardIssues: async function ({ maxScrollPasses = 30, stablePasses = 4 } = {}) {
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const issues = new Map();
        let stable = 0;
        let lastSize = 0;

        const collect = () => {
            const cards = document.querySelectorAll('[data-testid="platform-board-kit.ui.card.card"]');
            cards.forEach((card) => {
                const issue = Boardiator.extractIssueFromCard(card);
                if (!issue) return;

                const existing = issues.get(issue.key);
                if (!existing || existing.title === existing.key) {
                    issues.set(issue.key, issue);
                }
            });
        };

        for (let pass = 0; pass < maxScrollPasses; pass++) {
            collect();

            if (issues.size === lastSize) stable++;
            else stable = 0;

            if (stable >= stablePasses) break;

            lastSize = issues.size;
            Boardiator.scrollBoardContainers();
            await sleep(350);
        }

        return Array.from(issues.values()).sort((left, right) => left.key.localeCompare(right.key, undefined, { numeric: true }));
    },

    collectDistinctTestCaseIds: function (testCases, testRuns) {
        const allDistinctTestCaseIds = new Set();

        (testCases || []).forEach((testCase) => {
            if (testCase?.id) allDistinctTestCaseIds.add(testCase.id);
        });

        (testRuns || []).forEach((testRun) => {
            if (testRun.cases && Array.isArray(testRun.cases)) {
                if (testRun.cases.length > 0 && typeof testRun.cases[0] === 'object') {
                    testRun.cases.forEach((caseItem) => {
                        const caseId = caseItem.case_id || caseItem.id;
                        if (caseId) allDistinctTestCaseIds.add(caseId);
                    });
                } else {
                    testRun.cases.forEach((caseId) => {
                        if (caseId) allDistinctTestCaseIds.add(caseId);
                    });
                }
            } else if (testRun.case_ids && Array.isArray(testRun.case_ids)) {
                testRun.case_ids.forEach((caseId) => {
                    if (caseId) allDistinctTestCaseIds.add(caseId);
                });
            }
        });

        return Array.from(allDistinctTestCaseIds);
    },

    initBoardiator: async function () {
        return AviatorShared.util.singleFlight('Boardiator.initBoardiator', async () => {
            if (!AviatorShared.configuration.checkQaseApiToken() || !AviatorShared.configuration.checkQaseProjectCode()) return;

            if (await AviatorShared.qase.verifyConnectToQase()) {
                AviatorShared.html.hideLoading();
                AviatorShared.html.showStatusModal([], {
                    notification: { message: 'Error connecting to Qase. Check your token and project are correct', type: 'error' },
                    onClose: AviatorShared.html.hidePopup
                });
                return;
            }

            if (!Boardiator.isBoardContext()) {
                AviatorShared.html.showStatusModal([], {
                    notification: { message: 'Boardiator only runs on Jira board pages.', type: 'warning' },
                    onClose: AviatorShared.html.hidePopup
                });
                return;
            }

            const projectCode = AviatorShared.configuration.getQaseProjectCode();
            const boardMetadata = Boardiator.getBoardMetadata();

            window.qaseProgressCallback = (message, progress) => {
                AviatorShared.html.showLoading(message, progress);
            };
            window.qaseTrackChunks = false;

            AviatorShared.html.showLoading('Starting board traceability report...', { current: 0, total: 4 });

            try {
                AviatorShared.html.showLoading('Scraping Jira keys from board...', { current: 1, total: 4 });
                const boardIssues = await Boardiator.scrapeBoardIssues();

                if (!boardIssues.length) {
                    delete window.qaseProgressCallback;
                    delete window.qaseTrackChunks;
                    AviatorShared.html.hideLoading();
                    AviatorShared.html.showStatusModal([], {
                        notification: { message: 'No Jira work items found on this board.', type: 'warning' },
                        onClose: AviatorShared.html.hidePopup
                    });
                    return;
                }

                const jiraKeys = boardIssues.map((item) => item.key);

                AviatorShared.html.showLoading(`Found ${jiraKeys.length} Jira keys. Fetching test cases...`, { current: 2, total: 4 });
                const testCases = await AviatorShared.qase.fetchTestCasesForJiraKeys(projectCode, jiraKeys);

                AviatorShared.html.showLoading(`Found ${testCases.length} test cases. Preparing to fetch test runs...`, { current: 3, total: 4 });
                window.qaseTrackChunks = true;

                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                const testRuns = await AviatorShared.qase.fetchTestRunsWithPagination(projectCode, thirtyDaysAgo, jiraKeys);

                window.qaseTrackChunks = false;
                AviatorShared.html.showLoading('Building traceability mapping...', { current: 4, total: 4 });

                const traceabilityMapping = Traciator.buildTraceabilityMapping(testCases, testRuns, boardIssues);
                const allDistinctTestCaseIds = Boardiator.collectDistinctTestCaseIds(testCases, testRuns);

                delete window.qaseProgressCallback;
                delete window.qaseTrackChunks;
                AviatorShared.html.hideLoading();

                Traciator.showTraciator(
                    traceabilityMapping,
                    boardIssues.length,
                    allDistinctTestCaseIds.length,
                    testRuns.length,
                    allDistinctTestCaseIds,
                    {
                        toolName: 'Boardiator',
                        version: Boardiator.version,
                        showFeaturePopup: false,
                        source: 'boardiator',
                        defaultTitle: `${boardMetadata.boardTitle} Verification`,
                        sourceLabel: `board work items (${jiraKeys.length})`
                    }
                );

                if (AviatorShared.changelog.shouldShowToolPopup()) {
                    setTimeout(() => {
                        Boardiator.showBoardiatorFeaturePopup();
                    }, 50);
                }
            } catch (error) {
                delete window.qaseProgressCallback;
                delete window.qaseTrackChunks;
                AviatorShared.html.hideLoading();
                console.error('Error generating board traceability report:', error);
                AviatorShared.html.showStatusModal([], {
                    notification: { message: 'Error generating board traceability report. Check console for details.', type: 'error' },
                    onClose: AviatorShared.html.hidePopup
                });
            }
        });
    }
}