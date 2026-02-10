// aviator.js
// Aviator Workflow v1.0.0

const Aviator = {
    version: '1.5.0',

    getFormRunData: function () {
        const environment = AviatorShared.shadowRoot.getElementById('qaseEnv')
        const milestone = AviatorShared.shadowRoot.getElementById('qaseMilestone')

        const environmentId = environment?.value || null;
        const enviromentText = environment?.options[environment.selectedIndex].text || null
        const milestoneId = milestone?.value || null;
        const milestoneText = milestone?.options[milestone.selectedIndex].text || null;

        const configSelections = Array.from(AviatorShared.shadowRoot.querySelectorAll('.qaseConfig'))
            .reduce((acc, sel) => {
                if (sel.value) acc[sel.getAttribute('data-entity-id')] = parseInt(sel.value, 10);
                return acc;
            }, {});

        const allCaseIds = [];

        // Get individual test cases (from linked test cases section)
        const individualCases = AviatorShared.shadowRoot.querySelectorAll('.qase-item:checked[data-type="case"]');
        individualCases.forEach(item => {
            const dataIds = item.getAttribute('data-ids');
            if (dataIds) {
                const ids = dataIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                allCaseIds.push(...ids);
            }
        });

        // Get selected test plan IDs (we'll fetch their case IDs later)
        const selectedTestPlanIds = [];
        const testPlanCheckboxes = AviatorShared.shadowRoot.querySelectorAll('#aviatorTestPlanOptions input[type="checkbox"]:checked');
        testPlanCheckboxes.forEach(checkbox => {
            const planId = parseInt(checkbox.value);
            if (!isNaN(planId)) {
                selectedTestPlanIds.push(planId);
            }
        });

        // Remove duplicates from individual cases
        const uniqueCaseIds = [...new Set(allCaseIds)];

        const builds = AviatorShared.shadowRoot.querySelectorAll('.teamcity-build:checked');
        const _builds = builds.length
            ? Array.from(builds).map(b => b.dataset.id)
            : [];

        return {
            title: AviatorShared.shadowRoot.getElementById('qaseRunTitle').value.trim(),
            environment: { id: environmentId, text: enviromentText },
            milestone: { id: milestoneId, text: milestoneText },
            configurations: configSelections,
            caseIds: uniqueCaseIds,
            selectedTestPlanIds: selectedTestPlanIds,
            tcBuilds: _builds
        }
    },

    createQaseTestRun: async function () {
        const projectCode = AviatorShared.configuration.getQaseProjectCode();
        const token = AviatorShared.configuration.getQaseApiToken();

        const data = Aviator.getFormRunData()

        // Check if we have any selections (individual cases OR test plans)
        if (data.caseIds.length === 0 && data.selectedTestPlanIds.length === 0) {
            AviatorShared.showMessagePopup('No test cases or test plans selected!', 'warning');
            return;
        }

        // Fetch case IDs from selected test plans (like traciator does)
        let testPlanCaseIds = [];
        if (data.selectedTestPlanIds.length > 0) {
            try {
                const planDetails = await Promise.all(
                    data.selectedTestPlanIds.map(planId => AviatorShared.qase.fetchQaseTestPlanDetails(projectCode, planId))
                );
                testPlanCaseIds = planDetails.flatMap(plan => plan.caseIds).filter(id => id != null && !isNaN(id) && id > 0);
                testPlanCaseIds = [...new Set(testPlanCaseIds)]; // Remove duplicates
            } catch (error) {
                console.warn('Error fetching test cases from selected test plans:', error);
            }
        }

        // Combine individual cases with test plan cases
        const allCaseIds = [...new Set([...data.caseIds, ...testPlanCaseIds])];

        // Final validation after fetching test plan case IDs
        if (allCaseIds.length === 0) {
            AviatorShared.showMessagePopup('No test cases found in selected plans!', 'warning');
            return;
        }

        if (!data.title) {
            AviatorShared.showMessagePopup('No test run title entered!', 'warning');
            return;
        }

        const payload = {
            title: data.title,
            cases: allCaseIds,
            environment_id: data.environment.id,
            milestone_id: data.milestone.id,
            configurations: data.configurations
        };

        try {
            const runData = await AviatorShared.api({
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
            await AviatorShared.teamcity.triggerTeamCityBuilds(runData.result.id, allCaseIds);

            // send data to slack for usage tracking
            await AviatorShared.slack.sendResultToSlack(data)

            // Associate with Jira AFTER run is confirmed created
            await AviatorShared.qase.associateQaseTestRunWithJira(projectCode, runData.result.id);

            // Create Jira comment documenting the test run creation
            try {
                const commentSuccess = await AviatorShared.jira.createJiraComment(projectCode, runData.result.id, data);
                if (!commentSuccess) {
                    console.warn('⚠️ Jira comment creation failed, but test run was created successfully');
                }
            } catch (commentError) {
                console.error('⚠️ Error during Jira comment creation:', commentError);
                // Don't fail the entire operation if comment fails
            }

            // should we close the popup or keep it open for another run?
            if (AviatorShared.shouldClosePopup()) AviatorShared.jira.addQaseTestRunsToJiraUI()

        } catch (err) {
            console.log('Error creating test run:', err);
            AviatorShared.showMessagePopup('Failed to create Qase test run. See console for details.', 'error');
        }
    },

    scrapeAndShowAviator: async function () {
        if (!AviatorShared.configuration.checkQaseApiToken() || !AviatorShared.configuration.checkQaseProjectCode()) return;

        /** check qase connection to verify can show the popup */
        if (await AviatorShared.qase.verifyConnectToQase()) {
            AviatorShared.hideLoading();
            AviatorShared.showMessagePopup('Error connecting to Qase. Check your token and project are correct', 'error', AviatorShared.hidePopup)
            return;
        }

        const projectCode = AviatorShared.configuration.getQaseProjectCode();

        AviatorShared.showLoading('Fetching Qase test data...');

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
            AviatorShared.hideLoading();
            AviatorShared.showMessagePopup('No Qase Test Plans or Cases are part of this ticket', 'warning', AviatorShared.hidePopup)
            return;
        }

        const tcBuildDetails = await AviatorShared.teamcity.fetchAllTeamCityBuilds();
        const qaseConfigData = await AviatorShared.qase.fetchQaseTestRunConfig()

        AviatorShared.hideLoading();
        Aviator.showPopup(issueKey, availableTestPlans, externalCases, qaseConfigData, tcBuildDetails);
    },

    shouldShowAviatorFeaturePopup: function () {
        const seenVersion = localStorage.getItem("aviatorLastFeaturePopup") || "";
        if (seenVersion !== Aviator.version) {
            localStorage.setItem("aviatorLastFeaturePopup", Aviator.version);
            return true;
        }
        return false;
    },

    showFeaturePopup: function () {
        // Create overlay using centralized utility
        const overlay = AviatorShared.createOverlay({
            position: 'absolute',
            zIndex: '9999'
        });

        // Create modal box using centralized utility
        const box = AviatorShared.createModalBox({
            id: 'aviator-changelog',
        });

        box.innerHTML = `
            <h2 style="margin-top:0">🚀 Aviator Changelog 🚀</h2>
            <div class="changelog-container">

                <div class="changelog-entry featured">
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
                    <div style="margin-bottom: 8px; font-size: 14px;">
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
              <button id="feature-ok" class="btn primary" style="margin-top: 10px">Got it</button>
            `;

        overlay.appendChild(box);
        AviatorShared.shadowRoot.appendChild(overlay);

        // Set up event listener using centralized utility
        AviatorShared.addEventListeners(overlay, {
            '#feature-ok': {
                'click': () => {
                    overlay.remove();
                }
            }
        });
    },

    showPopup: function (issueKey, plans, externalCases, qaseConfigData, tcBuildDetails) {
        AviatorShared.hidePopup();
        AviatorShared.createdRun = false; // reset for this popup session

        if (!plans.length && !externalCases.length) {
            AviatorShared.showMessagePopup('No Qase Test Plans or Cases are part of this ticket', 'warning', AviatorShared.hidePopup)
            return;
        }

        const overlay = AviatorShared.createShadowRootOverlay()

        // popup contents container
        const container = document.createElement('div');
        container.classList = 'qasePopup';
        container.id = 'qasePopup'

        // Count TeamCity builds to determine layout
        let teamCityBuildsCount = 0;
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

        // header
        const header = document.createElement('div')
        header.classList = 'popup-header'
        header.innerHTML = `
                <div class="popup-title">
                    <h2>Aviator</h2>
                    <small>v${Aviator.version}</small>
                    <label style="margin-left: auto"><input type="checkbox" id="keep-open" />keep open</label>
                </div>
                <p>Create a Test Run in Qase by selecting a combination of test plans and cases.</p>`
        container.appendChild(header)

        // content body with columns
        const popupBody = document.createElement('div')
        popupBody.classList = 'popup-body'

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

        AviatorShared.shadowRoot.appendChild(container);

        const modalContent = document.querySelector('[role="dialog"], .jira-dialog, .css-1ynzxqw');
        if (modalContent) {
            modalContent.appendChild(overlay)
        }
        else {
            document.body.appendChild(overlay);
        }

        // block jira shortcuts
        AviatorShared.jira.blockJiraShortcuts();

        const runTitleInput = AviatorShared.shadowRoot.getElementById('qaseRunTitle');
        runTitleInput.value = AviatorShared.configuration.generateTitlePlaceholder(issueKey);

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

        // Set up input validation using centralized utility
        AviatorShared.addEventListeners(runTitleInput.parentElement || runTitleInput, {
            '#qaseRunTitle': { 'input': validateRunTitle }
        });

        // Handle Create Test Run click
        AviatorShared.shadowRoot.getElementById('qaseRunBtn').onclick = async () => {
            const data = Aviator.getFormRunData();
            if (!data.caseIds.length && !data.selectedTestPlanIds.length) {
                AviatorShared.showMessagePopup('No test cases or test plans selected!', 'warning');
                return;
            }

            if (!validateRunTitle()) {
                runTitleInput.focus();
                return;
            }

            try {
                // Show full-page loading overlay
                AviatorShared.showLoading('Creating Test Run...');

                // Call your async function
                await Aviator.createQaseTestRun();

                // Close popup and loading overlay when done
                if (AviatorShared.shouldClosePopup()) AviatorShared.hidePopup();
                AviatorShared.hideLoading();
                AviatorShared.createdRun = true; // flag for jira UI update
            } catch (err) {
                console.error('Error creating test run:', err);
                AviatorShared.hideLoading();
                AviatorShared.showMessagePopup('Failed to create Test Run. See console for details.', 'error');
            }
        };

        AviatorShared.shadowRoot.getElementById('qaseCancelBtn').onclick = () => {
            AviatorShared.hidePopup()
            if (AviatorShared.createdRun) AviatorShared.jira.addQaseTestRunsToJiraUI() // if a run was created, update the jira UI when closing
        };

        // Toggle all checkboxes
        const toggleBtn = AviatorShared.shadowRoot.getElementById('qaseToggleAllBtn');
        let allSelected = false;
        toggleBtn.onclick = () => {
            const checkboxes = AviatorShared.shadowRoot.querySelectorAll('#test-cases-section .qase-item');
            allSelected = !allSelected;
            checkboxes.forEach(cb => cb.checked = allSelected);
            toggleBtn.textContent = allSelected ? '🚫 Deselect All' : '☑️ Select All';
        };

        // then run feature popup once per version
        if (Aviator.shouldShowAviatorFeaturePopup()) {
            Aviator.showFeaturePopup(AviatorShared.shadowRoot);
        }
    }
}