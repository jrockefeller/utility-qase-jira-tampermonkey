// aviator.js
// Aviator Workflow v1.0.0

const Aviator = {
    version: '1.6.1',
    versionKey: 'aviatorLastFeaturePopup',

    showFeaturePopup: function () {
        const box = AviatorShared.html.createModalBox({
            id: 'aviator-changelog',
        });

        box.innerHTML = `
            <h2 class="qase-mt-0">🚀 Aviator Changelog 🚀</h2>
            <div class="changelog-container">

                <div class="changelog-entry featured">
                    <div class="changelog-version">v1.6.1</div>
                    <div class="changelog-text">UI styling tweeks for large Teamcity build tree.</div>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.6.0</div>
                    <div class="changelog-description">UI/UX improvements:</div>
                    <ul class="changelog-feature-list">
                        <li>Consolidate status message popup presentation.</li>
                        <li>Selected Teamcity builds provide status information feedback.</li>
                        <li>Robust Teamcity api error messaging.</li>
                        <li>Unified Run Title validation experience.</li>
                    </ul>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.5.0</div>
                    <div class="changelog-description">Major UI/UX improvements:</div>
                    <ul class="changelog-feature-list">
                        <li>Optional Teamcity builds configuration to set a high level project to get a list of all subprojects/builds.
                        <code class="changelog-inline-code">window.aviator.teamcity.projects = ['projectId']</code></li>
                        <li>Dynamic Layout moves TeamCity Builds Section to a dedicated column for better usability when 4+ builds.</li>
                        <li>Test Plan Dropdown presents all test plans for the Qase project. No longer have to link test plans in jira tickets.</li>
                        <li>Build Parameters section to edit/clear any <code class="changelog-inline-code">window.aviator.teamcity.parameter</code>.</li>
                    </ul>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.4.4</div>
                    <div class="changelog-text">Introducing Traciator v1.0.0! New traceability reporting tool with independent versioning.</div>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.4.3</div>
                    <div class="changelog-text">Add Jira comment for every test run created.</div>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.4.2</div>
                    <div class="changelog-text">Gracefully handle TeamCity build fetch errors. Display to user in modal.</div>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.4.1</div>
                    <div class="changelog-text">Fixed issue with Jira sidebars not displaying Aviator button.</div>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.4</div>
                    <div class="changelog-text">Consolidated error messaging. Handle incorrect configuration more gracefully.</div>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.3</div>
                    <div class="changelog-text">New <code class="changelog-inline-code">keep open</code> checkbox added to keep modal open for multiple test run creations.</div>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.2</div>
                    <div class="changelog-description">Configure custom parameters to send with TeamCity builds.</div>
                    <div class="changelog-note">
                        See <a href="https://github.com/jrockefeller/utility-qase-jira-tampermonkey/blob/main/README.md" target="_blank" class="changelog-link">README.md</a> for details.
                    </div>
                    <pre class="changelog-code-block">teamcity: {
    parameters: [
        { name: 'custom_param', value: '123' }
    ]
}</pre>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.1</div>
                    <div class="changelog-text">Checkbox to send only selected QaseIds in TeamCity build parameter <code class="changelog-inline-code">env.QASE_IDS</code>.</div>
                </div>

                <div class="changelog-entry">
                    <div class="changelog-version">v1.0</div>
                    <div class="changelog-text">Aviator runs in <code class="changelog-inline-code">shadowRoot</code>! Isolates from Jira hot keys.</div>
                </div>
            </div>
                            <button id="feature-ok" class="btn primary qase-mt-10">Got it</button>
            `;

        AviatorShared.html.openModal({
            overlayId: 'qaseAviatorFeatureOverlay',
            zIndex: '999999',
            mountHost: 'body',
            closeOnOverlayClick: false,
            closeOnEscape: false,
            closeSelectors: ['#feature-ok'],
            container: box,
            useSections: false
        });
    },

    getFormRunData: function () {
        const common = AviatorShared.html.getTestRunFormData(AviatorShared.shadowRoot);
        const caseIds = AviatorShared.html.getSelectedCaseIdsFromCheckedItems(AviatorShared.shadowRoot);

        return {
            title: common.title,
            environment: common.environment,
            milestone: common.milestone,
            configurations: common.configurations,
            caseIds: caseIds,
            selectedTestPlanIds: common.selectedTestPlanIds,
            tcBuilds: common.tcBuilds
        }
    },

    createQaseTestRun: async function () {
        return AviatorShared.util.singleFlight('Aviator.createQaseTestRun', async () => {
        const projectCode = AviatorShared.configuration.getQaseProjectCode();

        const data = Aviator.getFormRunData()

        // Check if we have any selections (individual cases OR test plans)
        if (data.caseIds.length === 0 && data.selectedTestPlanIds.length === 0) {
            AviatorShared.html.showStatusModal([], { notification: { message: 'No test cases or test plans selected!', type: 'warning' } });
            return;
        }

        // Fetch case IDs from selected test plans (like traciator does)
        let testPlanCaseIds = [];
        if (data.selectedTestPlanIds.length > 0) {
            try {
                testPlanCaseIds = await AviatorShared.qase.fetchQaseCaseIdsForTestPlans(projectCode, data.selectedTestPlanIds);
            } catch (error) {
                console.warn('Error fetching test cases from selected test plans:', error);
            }
        }

        // Combine individual cases with test plan cases
        const allCaseIds = AviatorShared.qase.mergeQaseCaseIds(data.caseIds, testPlanCaseIds);

        // Final validation after fetching test plan case IDs
        if (allCaseIds.length === 0) {
            AviatorShared.html.showStatusModal([], { notification: { message: 'No test cases found in selected plans!', type: 'warning' } });
            return;
        }

        if (!data.title) {
            AviatorShared.html.showStatusModal([], { notification: { message: 'No test run title entered!', type: 'warning' } });
            return;
        }

        try {
            const runResult = await AviatorShared.qase.createQaseTestRun({
                projectCode,
                title: data.title,
                caseIds: allCaseIds,
                environmentId: data.environment.id,
                milestoneId: data.milestone.id,
                configurations: data.configurations
            });

            console.log(`Qase: Test Run Created: ${runResult.id}`);

            // send data to slack for usage tracking (non-blocking for Jira comment)
            try {
                await AviatorShared.slack.sendResultToSlack(data, 'aviator')
            } catch (slackError) {
                console.warn('Slack tracking failed; continuing without blocking Jira comment', slackError);
            }

            // Prepare summary for unified status modal
            const summary = {
                runId: runResult.id,
                title: data.title,
                caseCount: allCaseIds.length,
                jiraKey: null,
                associationStatus: null,
                associationMessage: null
            };

            const handleStatusClose = () => {
                if (AviatorShared.html.shouldClosePopup()) {
                    AviatorShared.jira.addQaseTestRunsToJiraUI();
                }
            };

            // Associate with Jira AFTER run is confirmed created
            try {
                const assoc = await AviatorShared.qase.associateQaseTestRunWithJira(projectCode, runResult.id);
                if (assoc) {
                    summary.jiraKey = assoc.issueKey || summary.jiraKey;
                    summary.associationStatus = assoc.status;
                    summary.associationMessage = assoc.message;
                }
            } catch (associationError) {
                console.warn('Jira association failed:', associationError);
                summary.associationStatus = 'failed';
                summary.associationMessage = 'Warning: Could not associate with Jira issue.';
            }

            // Create Jira comment documenting the test run creation
            try {
                const commentSuccess = await AviatorShared.jira.createJiraComment(projectCode, runResult.id, data);
                if (!commentSuccess) {
                    console.warn('Jira comment creation failed, but test run was created successfully');
                }
            } catch (commentError) {
                console.error('Error during Jira comment creation:', commentError);
                // Don't fail the entire operation if comment fails
            }

            // Trigger any TeamCity builds (or show summary-only modal when none)
            if (data.tcBuilds && data.tcBuilds.length > 0) {
                try {
                    await AviatorShared.teamcity.triggerTeamCityBuilds(runResult.id, allCaseIds, { summary, closeParentPopup: true, onClose: handleStatusClose });
                } catch (tcError) {
                    console.warn('Failed to trigger TeamCity builds:', tcError);
                    AviatorShared.html.showStatusModal([], { summary, closeParentPopup: true, onClose: handleStatusClose });
                }
            } else {
                AviatorShared.html.showStatusModal([], { summary, closeParentPopup: true, onClose: handleStatusClose });
            }

        } catch (err) {
            console.log('Error creating test run:', err);
            AviatorShared.html.showStatusModal([], { notification: { message: 'Failed to create Qase test run. See console for details.', type: 'error' } });
        }
        });
    },

    scrapeAndShowAviator: async function () {
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

        const projectCode = AviatorShared.configuration.getQaseProjectCode();

        AviatorShared.html.showLoading('Fetching Qase test data...');

        let { issueKey } = AviatorShared.configuration.getJiraIssueDetails()

        // Fetch all available test plans from Qase API instead of scraping page
        let availableTestPlans = [];
        try {
            availableTestPlans = await AviatorShared.qase.fetchQaseTestPlans();
        } catch (error) {
            console.warn('Could not fetch available test plans:', error);
            // Continue without test plans - user can still use external cases
        }

        // Get external test cases linked to this Jira issue
        const externalCases = issueKey
            ? await AviatorShared.qase.fetchQaseTestCases(projectCode, issueKey)
            : [];

        if (!availableTestPlans.length && !externalCases.length) {
            AviatorShared.html.hideLoading();
            AviatorShared.html.showStatusModal([], {
                notification: { message: 'No Qase Test Plans or Cases are part of this ticket', type: 'warning' },
                onClose: AviatorShared.html.hidePopup
            });
            return;
        }

        const tcBuildDetails = await AviatorShared.teamcity.fetchAllTeamCityBuilds();
        const qaseConfigData = await AviatorShared.qase.fetchQaseTestRunConfig()

        AviatorShared.html.hideLoading();
        Aviator.showPopup(issueKey, availableTestPlans, externalCases, qaseConfigData, tcBuildDetails);
    }, 

    showPopup: function (issueKey, plans, externalCases, qaseConfigData, tcBuildDetails) {
        AviatorShared.html.hidePopup();
        AviatorShared.createdRun = false; // reset for this popup session

        if (!plans.length && !externalCases.length) {
            AviatorShared.html.showStatusModal([], {
                notification: { message: 'No Qase Test Plans or Cases are part of this ticket', type: 'warning' },
                onClose: AviatorShared.html.hidePopup
            });
            return;
        }

        // popup contents container
        const container = document.createElement('div');
        container.classList = 'qasePopup';
        container.id = 'qasePopup'

        // Count TeamCity builds to determine layout
        const teamCityBuildsCount = AviatorShared.teamcity.countTeamCityBuilds(tcBuildDetails);

        const { body: popupBody, footer, close } = AviatorShared.html.openModal({
            container,
            overlayId: 'qaseModalOverlay',
            zIndex: '999999',
            mountHost: 'auto',
            closeOnOverlayClick: false,
            closeOnEscape: false,
            closeSelectors: [],
            sections: {
                headerHtml: `
                    <div class="popup-title">
                        <h2>Aviator</h2>
                        <small>v${Aviator.version}</small>
                        <label class="qase-ml-auto"><input type="checkbox" id="keep-open" />keep open</label>
                    </div>
                    <p>Create a Test Run in Qase by selecting a combination of test plans and cases.</p>`,
                footerHtml: `
                <button id="qaseToggleAllBtn" class="btn">☑️ Select All</button>
                <button id="qaseRunBtn" class="btn primary">✅ Create Test Run</button>
                <button id="qaseCancelBtn" class="btn secondary">Cancel</button>
            `
            },
            onClose: () => {
                if (AviatorShared.createdRun) AviatorShared.jira.addQaseTestRunsToJiraUI();
            }
        });

        if (teamCityBuildsCount <= 3) {
            // 2-column layout: TeamCity builds stay under test run configuration
            // column 1: Test Plans and Test Cases
            const column1 = document.createElement('div')
            column1.classList = 'popup-column'
            column1.appendChild(AviatorShared.html.htmlTestPlans(plans))
            column1.appendChild(AviatorShared.html.htmlTestCases(externalCases))
            popupBody.appendChild(column1)

            // column 2: Test Run Details with TeamCity builds included
            const column2 = document.createElement('div')
            column2.classList = 'popup-column'
            column2.appendChild(AviatorShared.html.htmlTestRunDetails(qaseConfigData, []))

            column2.appendChild(AviatorShared.html.htmlTeamCityBuilds(tcBuildDetails))
            popupBody.appendChild(column2)
        } else {
            Object.assign(container.style, {
                maxWidth: '1400px',
                width: '95%'
            });

            // Force row layout
            popupBody.setAttribute('style', 'display: flex !important; flex-direction: row !important; gap: 15px !important; flex: 1 !important; overflow: hidden !important;');

            // column 1: Test Plans and Test Cases
            const column1 = document.createElement('div')
            column1.classList = 'popup-column'
            column1.style.flex = '1'
            column1.appendChild(AviatorShared.html.htmlTestPlans(plans))
            column1.appendChild(AviatorShared.html.htmlTestCases(externalCases))
            popupBody.appendChild(column1)

            // column 2: Test Run Details only (no TeamCity builds)
            const column2 = document.createElement('div')
            column2.classList = 'popup-column'
            column2.style.flex = '1'
            column2.appendChild(AviatorShared.html.htmlTestRunDetails(qaseConfigData, []))
            popupBody.appendChild(column2)

            // column 3: TeamCity builds only (without wrapper div for standalone column)
            const column3 = document.createElement('div')
            column3.classList = 'popup-column'
            column3.style.flex = '1'
            column3.appendChild(AviatorShared.html.htmlTeamCityBuilds(tcBuildDetails))

            popupBody.appendChild(column3)
        }


        // Move footer to bottom (after body is populated)
        container.appendChild(footer)

        // block jira shortcuts
        AviatorShared.jira.blockJiraShortcuts();

        const { validate: validateRunTitle, input: runTitleInput } = AviatorShared.validation.setupRunTitleValidation({
            root: container,
            minLength: 5
        });
        if (runTitleInput) {
            runTitleInput.value = AviatorShared.configuration.generateTitlePlaceholder(issueKey);
        }

        // Standardized event wiring (no .onclick assignments)
        let allSelected = false;
        AviatorShared.html.addEventListeners(container, {
            '#qaseCancelBtn': { 'click': close },
            '#qaseToggleAllBtn': {
                'click': () => {
                    const checkboxes = AviatorShared.shadowRoot.querySelectorAll('#test-cases-section .qase-item');
                    allSelected = !allSelected;
                    checkboxes.forEach(cb => cb.checked = allSelected);
                    const toggleBtn = AviatorShared.shadowRoot.getElementById('qaseToggleAllBtn');
                    if (toggleBtn) toggleBtn.textContent = allSelected ? '🚫 Deselect All' : '☑️ Select All';
                }
            },
            '#qaseRunBtn': {
                'click': () => AviatorShared.util.singleFlight('Aviator.qaseRunBtnClick', async () => {
                    const qaseRunBtn = AviatorShared.shadowRoot.getElementById('qaseRunBtn');
                    const data = Aviator.getFormRunData();
                    if (!data.caseIds.length && !data.selectedTestPlanIds.length) {
                        AviatorShared.html.showStatusModal([], { notification: { message: 'No test cases or test plans selected!', type: 'warning' } });
                        return;
                    }

                    if (!validateRunTitle()) {
                        if (runTitleInput) runTitleInput.focus();
                        return;
                    }

                    if (qaseRunBtn) qaseRunBtn.disabled = true;

                    try {
                        AviatorShared.html.showLoading('Creating Test Run...');
                        await Aviator.createQaseTestRun();
                        AviatorShared.html.hideLoading();
                        AviatorShared.createdRun = true;
                    } catch (err) {
                        console.error('Error creating test run:', err);
                        AviatorShared.html.hideLoading();
                        AviatorShared.html.showStatusModal([], { notification: { message: 'Failed to create Test Run. See console for details.', type: 'error' } });
                    } finally {
                        const stillThere = AviatorShared.shadowRoot?.getElementById('qaseRunBtn');
                        if (stillThere) stillThere.disabled = false;
                    }
                })
            }
        });

        // then run feature popup once per version
        if (AviatorShared.configuration.shouldShowFeaturePopup(Aviator.versionKey, Aviator.version)) {
            Aviator.showFeaturePopup(AviatorShared.shadowRoot);
        }
    }
}
