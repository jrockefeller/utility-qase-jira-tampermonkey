// ==================================================
// Aviator - Combined Build
// Generated on 2026-02-10 11:14:17
// This file replaces the module loader with combined code
// ==================================================

(function () {
    'use strict';
    

// === src\shared.js ===

// shared.js
// Shared Utilities v1.0.0

const AviatorShared = {
    jiraShortcutBlocker: null,
    shadowRoot: null,
    createdRun: false,
    shadowStyles: `
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

    /* Shared styles for test case lists */
    .qasePopup .test-case-list>label {
        display: block;
        padding: 6px;
        margin-bottom: 2px;
        border-radius: 4px;
        color: var(--test-case-text);
    }

    .qasePopup .test-case-list>label:nth-child(odd) {
        background: var(--test-case-odd-bg);
    }

    .qasePopup .test-case-list>label:nth-child(even) {
        background: var(--test-case-even-bg);
    }

    .qasePopup .test-case-list:nth-child(odd) {
        margin-bottom: 15px;
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
            --test-case-text: #000047;
            --test-case-odd-bg: #e6f0ff;
            --test-case-even-bg: #F0F0F0;
        }
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
            --test-case-text: #e7e7e4;
            --test-case-odd-bg: #54545E;
            --test-case-even-bg: #35353D;
        }
    }

    .qasePopup .popup-header {
        margin-bottom: 5px;
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
        border: 1px solid var(--border);
        overflow-y: auto;
        max-height: 65vh;
        flex: 1;
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
        background: var(--btn-bg);
        color: var(--btn-color);
    }

    .qasePopup .btn:hover {
        background: var(--btn-hover-bg);
    }

    .qasePopup .btn.primary {
        --btn-bg: var(--primary);
        --btn-color: #fff;
        --btn-hover-bg: var(--primary-hover);
    }

    .qasePopup .btn.secondary {
        --btn-bg: var(--secondary);
        --btn-color: var(--text);
        --btn-hover-bg: var(--secondary-hover);
    }

    @media (max-width: 700px) {
        .qasePopup .popup-body {
            grid-template-columns: 1fr;
        }
    }

    .qasePopup .subText {
        color: var(--text-muted);
        font-size: 0.85rem;
    }

    .qasePopup #qaseToggleAllBtn {
        color: var(--text);
        background: var(--secondary);
        border: 1px solid var(--border);
        margin-right: auto;
    }

    .qasePopup .build-list>label {
        display:block;
    }

    /* Hierarchical project structure styles */
    .qasePopup .project-group {
        margin: 6px 0;
    }

    .qasePopup .project-header {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
        cursor: pointer;
        padding: 1px 1px 1px 5px;
        border-radius: 4px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        transition: background 0.2s ease;
    }

    .qasePopup .project-header:hover {
        background: var(--secondary-hover);
    }

    .qasePopup .project-builds {
        margin-left: 16px;
        border-left: 1px solid var(--border);
        padding-left: 8px;
    }

    .qasePopup .project-builds label {
        display: block;
        padding: 3px 0;
        margin-bottom: 2px;
    }

    .qasePopup .toggle-arrow {
        margin-right: 6px;
        font-size: 10px;
        transition: transform 0.2s ease;
        color: var(--text-muted);
    }

    /* Multi-select dropdown styles */
    .qasePopup .multi-select-container {
        margin-bottom: 15px;
    }

    .qasePopup .multi-select-dropdown {
        position: relative;
        width: 100%;
    }

    .qasePopup .multi-select-button {
        width: 100%;
        padding: 8px 12px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text);
        font-size: 0.95rem;
        text-align: left;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .qasePopup .multi-select-button:hover {
        background: var(--bg-card);
    }

    .qasePopup .dropdown-arrow {
        transition: transform 0.2s ease;
        font-size: 0.8rem;
    }

    .qasePopup .multi-select-button[data-open="true"] .dropdown-arrow {
        transform: rotate(180deg);
    }

    .qasePopup .multi-select-options {
        position: fixed;
        background: var(--bg);
        border: 1px solid var(--border);
        border-top: none;
        border-radius: 0 0 6px 6px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 999999;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        display: none;
    }

    .qasePopup .multi-select-option {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--border);
        margin: 0;
    }

    .qasePopup .multi-select-option:hover {
        background: var(--bg-card);
    }

    .qasePopup .multi-select-option:last-child {
        border-bottom: none;
    }

    .qasePopup .multi-select-option input[type="checkbox"] {
        margin-right: 8px;
        margin-bottom: 0;
    }

    .qasePopup .plan-title {
        flex: 1;
        font-weight: 500;
    }

    .qasePopup .plan-cases {
        font-size: 0.85rem;
        color: var(--text-muted);
        margin-left: 8px;
    }

    .qasePopup .help-text {
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-top: 5px;
    }

    /* ===== UNIFIED CHANGELOG STYLES ===== */
    .qasePopup {
        --changelog-bg-primary: #ffffff;
        --changelog-bg-secondary: #f8f9fa;
        --changelog-bg-featured: #e3f2fd;
        --changelog-border: #e0e0e0;
        --changelog-text-primary: #333333;
        --changelog-text-secondary: #555555;
        --changelog-accent: #0066cc;
        --changelog-code-bg: #f4f4f4;
        --changelog-code-border: #dddddd;
    }
    
    @media (prefers-color-scheme: dark) {
        .qasePopup {
            --changelog-bg-primary: #1e1e1e;
            --changelog-bg-secondary: #2d2d2d;
            --changelog-bg-featured: #1a2332;
            --changelog-border: #404040;
            --changelog-text-primary: #e1e1e1;
            --changelog-text-secondary: #b3b3b3;
            --changelog-accent: #4da6ff;
            --changelog-code-bg: #2a2a2a;
            --changelog-code-border: #505050;
        }
    }

    .qasePopup .changelog-container {
        max-height: 400px;
        overflow-y: auto;
        padding-right: 10px;
        background: var(--changelog-bg-primary);
    }

    .qasePopup .changelog-entry {
        margin-bottom: 16px;
        padding: 12px;
        border: 1px solid var(--changelog-border);
        border-radius: 6px;
        background: var(--changelog-bg-secondary);
        transition: all 0.2s ease;
    }

    .qasePopup .changelog-entry.featured {
        background: var(--changelog-bg-featured);
        border-color: var(--changelog-accent);
        box-shadow: 0 2px 8px rgba(77, 166, 255, 0.15);
        border-width: 2px;
    }

    .qasePopup .changelog-version {
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 8px;
        color: var(--changelog-accent);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .qasePopup .changelog-description {
        color: var(--changelog-text-primary);
        margin-bottom: 8px;
        font-weight: 500;
    }

    .qasePopup .changelog-feature-list {
        margin: 0;
        padding-left: 20px;
        color: var(--changelog-text-secondary);
    }

    .qasePopup .changelog-feature-list li {
        margin-bottom: 6px;
        line-height: 1.4;
    }

    .qasePopup .changelog-text {
        color: var(--changelog-text-secondary);
        line-height: 1.4;
    }

    .qasePopup .changelog-link {
        color: var(--changelog-accent);
        text-decoration: none;
        transition: opacity 0.2s ease;
        font-weight: 500;
    }

    .qasePopup .changelog-link:hover {
        opacity: 0.8;
        text-decoration: underline;
    }

    .qasePopup .changelog-code-block {
        background: var(--changelog-code-bg);
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 8px 0 0 0;
        font-size: 13px;
        border: 1px solid var(--changelog-code-border);
        color: var(--changelog-text-primary);
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
        line-height: 1.4;
    }

    .qasePopup .changelog-inline-code {
        background: var(--changelog-code-bg);
        padding: 3px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
        font-size: 0.9em;
        color: var(--changelog-text-primary);
        border: 1px solid var(--changelog-code-border);
        display: inline-block;
    }`,

    injectPopupStyles: () => {
        GM_addStyle(`
            /* Base styles for the injected popup */
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
    },

    injectGlobalStyles: function () {
        if (document.getElementById('qase-global-styles')) return; // Already injected

        const style = document.createElement('style');
        style.id = 'qase-global-styles';
        style.textContent = AviatorShared.shadowStyles;
        document.head.appendChild(style);
    },

    createShadowRootOverlay: function () {
        let overlay = document.getElementById('qasePopupOverlay');
        if (!overlay) {
            // Create background overlay
            overlay = document.createElement('div');
            overlay.id = 'qasePopupOverlay';
            document.body.appendChild(overlay); // <-- make sure it's in the DOM
        }

        // Ensure the shadow root exists
        if (!overlay.shadowRoot) {
            AviatorShared.shadowRoot = overlay.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = AviatorShared.shadowStyles;
            AviatorShared.shadowRoot.appendChild(style);
        }

        return overlay
    },

    createOverlay: function (options = {}) {
        const {
            id = null,
            position = 'fixed',
            background = 'rgba(0,0,0,0.65)',
            zIndex = '999999',
            className = null,
            appendTo = document.body
        } = options;

        const overlay = document.createElement('div');
        if (id) overlay.id = id;
        if (className) overlay.className = className;

        Object.assign(overlay.style, {
            position: position,
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: background,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: zIndex,
            fontFamily: '"Segoe UI", Arial, sans-serif'
        });

        return overlay;
    },

    createModalBox: function (options = {}) {
        const {
            className = 'qasePopup',
            id = undefined,
            padding = '20px 24px',
            borderRadius = '10px',
            minWidth = '250px',
            maxWidth = '600px',
            width = 'auto',
            maxHeight = null,
            customStyles = {}
        } = options;

        const box = document.createElement('div');
        if (className) box.classList = className;
        if (id) box.id = id

        const baseStyles = {
            padding: padding,
            borderRadius: borderRadius,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            minWidth: minWidth,
            maxWidth: maxWidth,
            width: width,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
        };

        if (maxHeight) baseStyles.maxHeight = maxHeight;
        Object.assign(box.style, { ...baseStyles, ...customStyles });

        return box;
    },

    addEventListeners: function (element, eventMap) {
        const listeners = [];
        Object.entries(eventMap).forEach(([selector, events]) => {
            Object.entries(events).forEach(([eventType, handler]) => {
                if (selector === 'self') {
                    element.addEventListener(eventType, handler);
                    listeners.push({ element, eventType, handler });
                } else {
                    const target = element.querySelector(selector);
                    if (target) {
                        target.addEventListener(eventType, handler);
                        listeners.push({ element: target, eventType, handler });
                    }
                }
            });
        });
        return listeners;
    },

    addMultiEventListener: function (element, events, handler, useCapture = false) {
        const listeners = [];
        events.forEach(eventType => {
            element.addEventListener(eventType, handler, useCapture);
            listeners.push({ element, eventType, handler, useCapture });
        });

        // Return cleanup function
        return () => {
            listeners.forEach(({ element, eventType, handler, useCapture }) => {
                element.removeEventListener(eventType, handler, useCapture);
            });
        };
    },

    removeEventListeners: function (listeners) {
        listeners.forEach(({ element, eventType, handler, useCapture = false }) => {
            element.removeEventListener(eventType, handler, useCapture);
        });
    },

    configuration: {
        getQaseApiToken: () => window?.aviator?.qase?.token ?? null,

        checkQaseApiToken: function () {
            const token = AviatorShared.configuration.getQaseApiToken();
            if (!token) {
                AviatorShared.showMessagePopup('No Qase API token set.', 'warning', AviatorShared.hidePopup)
                return false;
            }
            return true;
        },

        getQaseProjectCode: () => window?.aviator?.qase?.projectCode ?? null,

        checkQaseProjectCode: function () {
            const code = AviatorShared.configuration.getQaseProjectCode();
            if (!code) {
                AviatorShared.showMessagePopup('No Qase Project Code set.', 'warning', AviatorShared.hidePopup)
                return false;
            }
            return true;
        },

        generateTitlePlaceholder: function () {
            const jiraDetails = AviatorShared.configuration.getJiraIssueDetails()
            let title = window.aviator.qase.title ?? jiraDetails.issueKey

            title = title.replace('{issueKey}', jiraDetails.issueKey);
            title = title.replace('{issueTitle}', jiraDetails.issueTitle);

            return title;
        },

        getJiraIssueDetails: function () {
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
    },

    shouldClosePopup: () => AviatorShared.shadowRoot?.getElementById('keep-open')?.checked !== true,

    showMessagePopup: function (message, type, onClose) {

        AviatorShared.createShadowRootOverlay()

        // Remove any existing message overlays first
        const existingMessageOverlay = AviatorShared.shadowRoot.querySelector('.qase-message-overlay');
        if (existingMessageOverlay) {
            existingMessageOverlay.remove();
        }

        // Create overlay using centralized utility
        const overlay = AviatorShared.createOverlay({
            position: 'absolute',
            className: 'qase-message-overlay',
            zIndex: '9999'
        });

        // modal box
        const box = document.createElement("div");
        box.classList = 'qasePopup'
        box.id = 'messagePopup'

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
        const isSuccess = type.toLowerCase() == 'success'
        const isWarning = type.toLowerCase() == 'warning'

        let title, buttonText;
        if (isSuccess) {
            title = 'Success';
            buttonText = 'Great!';
        } else if (isWarning) {
            title = 'Warning';
            buttonText = 'Got it';
        } else {
            title = 'Oops';
            buttonText = 'Got it';
        }

        box.innerHTML = `
            <h2 style="margin-top:0">${title}</h2>
            <div style="font-size:14px; line-height:1.5; text-align: center;">${message}</div>
            <button id="popup-ok" class="btn primary" style="margin-top: 10px">${buttonText}</button>
            `;

        /*  */

        overlay.appendChild(box);
        AviatorShared.shadowRoot.appendChild(overlay);

        // Set up close button using centralized utility
        AviatorShared.addEventListeners(overlay, {
            '#popup-ok': {
                'click': () => {
                    overlay.remove();

                    // Also remove from shadow root if still there
                    if (AviatorShared.shadowRoot && AviatorShared.shadowRoot.contains(overlay)) {
                        AviatorShared.shadowRoot.removeChild(overlay);
                    }

                    // Check if shadow root only contains styles (indicating no other modals are open)
                    const shadowRootChildren = AviatorShared.shadowRoot ? Array.from(AviatorShared.shadowRoot.children) : [];
                    const onlyStylesRemain = shadowRootChildren.length === 1 && shadowRootChildren[0].tagName === 'STYLE';

                    // If only styles remain, remove the main overlay container
                    if (onlyStylesRemain) {
                        const mainOverlay = document.getElementById('qasePopupOverlay');
                        if (mainOverlay) {
                            mainOverlay.remove();
                            AviatorShared.shadowRoot = null; // Reset shadow root reference
                        }
                    }

                    if (typeof onClose == 'function') {
                        onClose();
                    }
                }
            }
        });
    },

    hidePopup: function () {
        const overlay = document.getElementById('qasePopupOverlay');
        if (overlay) {
            overlay.remove();
            AviatorShared.jira.unblockJiraShortcuts();
        }
    },

    showLoading: function (message = 'Working...', progress = null) {
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
    },

    hideLoading: function () {
        const overlay = document.getElementById('qaseLoadingOverlay');
        if (overlay) overlay.remove();
    },

    jira: {
        addQaseTestRunsToJiraUI: function () {
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
        },

        blockJiraShortcuts: function () {
            if (AviatorShared.jiraShortcutBlocker) return; // Already active

            const handler = (e) => {
                // Stop Jira from seeing any key event
                e.stopPropagation();
                // Optional: prevent default if you want to block certain keys entirely
                // e.preventDefault();
            };

            // Use centralized multi-event listener utility
            AviatorShared.jiraShortcutBlocker = AviatorShared.addMultiEventListener(
                document,
                ['keydown', 'keypress', 'keyup'],
                handler,
                true // use capture phase
            );
        },

        unblockJiraShortcuts: function () {
            if (AviatorShared.jiraShortcutBlocker) {
                AviatorShared.jiraShortcutBlocker();
                AviatorShared.jiraShortcutBlocker = null;
            }
        },

        createJiraComment: async function (projectCode, runId, formData) {
            const { issueKey } = AviatorShared.configuration.getJiraIssueDetails();
            if (!issueKey) {
                console.warn('Could not detect Jira issue ID for comment creation.');
                return false;
            }

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
        },
    },

    api: async function ({ method, url, headers = {}, data = null }) {
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
    },

    qase: {
        fetchTestCasesForJiraKeys: async function (projectCode, jiraKeys) {
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
                    const response = await AviatorShared.api({
                        method: 'GET',
                        url: url,
                        headers: { 'Token': AviatorShared.configuration.getQaseApiToken() }
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
        },

        fetchTestRunsWithPagination: async function (projectCode, startDate, jiraKeys = []) {
            const allTestRuns = [];
            const limit = 100; // Optimal batch size for API efficiency
            const cutoffDate = startDate || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            const fromStartTime = Math.floor(cutoffDate.getTime() / 1000); // Convert to Unix timestamp

            try {
                console.log(`Fetching test runs from ${cutoffDate.toISOString()} (timestamp: ${fromStartTime})...`);

                // Get total count with date filter
                const initialResponse = await AviatorShared.api({
                    method: 'GET',
                    url: `https://api.qase.io/v1/run/${projectCode}?limit=1&offset=0&from_start_time=${fromStartTime}&include=external_issue%2Ccases`,
                    headers: { 'Token': AviatorShared.configuration.getQaseApiToken() }
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

                        return AviatorShared.api({
                            method: 'GET',
                            url: url,
                            headers: { 'Token': AviatorShared.configuration.getQaseApiToken() }
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
        },

        verifyConnectToQase: async function () {
            const token = AviatorShared.configuration.getQaseApiToken();
            const projectCode = AviatorShared.configuration.getQaseProjectCode();

            const data = await AviatorShared.api({
                method: 'GET', url: `https://api.qase.io/v1/project/${projectCode}`,
                headers: { Token: token }
            });

            return (!data.status || data.status === false);;
        },

        fetchQaseTestPlanDetails: async function (projectCode, planId) {
            const token = AviatorShared.configuration.getQaseApiToken();

            const data = await AviatorShared.api({
                method: 'GET', url: `https://api.qase.io/v1/plan/${projectCode}/${planId}`,
                headers: { 'Token': token }
            })
            const cases = data.result.cases.map(c => c.case_id);

            return {
                projectCode: projectCode,
                title: data.result.title,
                caseIds: cases
            }
        },

        fetchQaseTestCases: async function (projectCode, issueKey) {
            const token = AviatorShared.configuration.getQaseApiToken();

            let allCases = [];
            let offset = 0;
            const limit = 100;
            let hasMore = true;

            while (hasMore) {
                const data = await AviatorShared.api({
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
        },

        fetchQaseTestPlans: async function () {
            const token = AviatorShared.configuration.getQaseApiToken();
            const projectCode = AviatorShared.configuration.getQaseProjectCode();
            const limit = 100;

            const data = await AviatorShared.api({
                method: 'GET',
                url: `https://api.qase.io/v1/plan/${projectCode}?limit=${limit}&offset=0`,
                headers: { 'Accept': 'application/json', token: token }
            })

            if (!data || !data.result || !data.result.entities) {
                throw new Error('Failed to fetch test plans or no plans found')
            }

            return data.result.entities
        },

        fetchQaseEnvironments: async function () {
            const token = AviatorShared.configuration.getQaseApiToken();
            const projectCode = AviatorShared.configuration.getQaseProjectCode();

            let allEnvironments = [];
            let offset = 0;
            const limit = 100;
            let hasMore = true;

            while (hasMore) {
                const data = await AviatorShared.api({
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
        },

        fetchQaseMilestones: async function () {
            const token = AviatorShared.configuration.getQaseApiToken();
            const projectCode = AviatorShared.configuration.getQaseProjectCode();

            let allMilestones = [];
            let offset = 0;
            const limit = 100;
            let hasMore = true;

            while (hasMore) {
                const data = await AviatorShared.api({
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
        },

        fetchQaseConfigurations: async function () {
            const token = AviatorShared.configuration.getQaseApiToken();
            const projectCode = AviatorShared.configuration.getQaseProjectCode();

            const data = await AviatorShared.api({
                method: 'GET',
                url: `https://api.qase.io/v1/configuration/${projectCode}`,
                headers: { 'Accept': 'application/json', token: token }
            })

            if (!data.result) {
                return []
            }
            return data.result.entities
        },

        fetchQaseTestRunConfig: async function () {
            const opts = window.aviator.qase?.options;

            const promises = [];

            // Environment
            if (opts?.environment) {
                promises.push(AviatorShared.qase.fetchQaseEnvironments());
            } else {
                promises.push(Promise.resolve(null));
            }

            // Milestone
            if (opts?.milestone) {
                promises.push(AviatorShared.qase.fetchQaseMilestones());
            } else {
                promises.push(Promise.resolve(null));
            }

            // Configurations
            if (opts?.configurations) {
                promises.push(AviatorShared.qase.fetchQaseConfigurations());
            } else {
                promises.push(Promise.resolve(null));
            }

            const [environments, milestones, configurations] = await Promise.all(promises);

            return { environments, milestones, configurations };
        },

        associateQaseTestRunWithJira: async function (projectCode, runId) {
            const token = AviatorShared.configuration.getQaseApiToken();

            let { issueKey } = AviatorShared.configuration.getJiraIssueDetails()
            if (!issueKey) {
                AviatorShared.showMessagePopup('Could not detect Jira issue ID in URL for association.', 'error');
                return;
            }

            AviatorShared.showLoading('Associating test run with Jira...');

            try {
                await AviatorShared.api({
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

                AviatorShared.hideLoading();
            }
            catch (e) {
                AviatorShared.hideLoading();
                console.error('Error associating Jira issue:', e);
            }
        },
    },

    slack: {
        sendResultToSlack: async function (data) {
            const projectCode = AviatorShared.configuration.getQaseProjectCode();

            const payload = {
                projectCode,
                title: data.title,
                environment: data.environment.text,
                milestone: data.milestone.text,
                teamCityQueued: data.tcBuilds.join(','),
            }

            await AviatorShared.api({
                method: 'POST',
                url: `https://hooks.slack.com/triggers/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`,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                data: payload
            })

        }
    },

    teamcity: {
        getTeamCityCsrfToken: async function (token) {

            const data = await AviatorShared.api({
                method: 'GET',
                url: `https://ci.paylocity.com/authenticationTest.html?csrf`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })

            return data
        },

        /** trigger selected teamcity builds */
        triggerTeamCityBuilds: async function (runId, caseIds) {

            const token = window.aviator?.teamcity?.token;
            const cfsrToken = await AviatorShared.teamcity.getTeamCityCsrfToken(token)
            const builds = AviatorShared.shadowRoot.querySelectorAll('.teamcity-build:checked');

            for (let b of builds) {
                const buildId = b.dataset.id;

                try {

                    /** set to trigger a build against a runid and do not complete it */
                    let tc_properties = [
                        { name: "env.QASE_TESTOPS_RUN_ID", value: runId },
                        { name: "env.QASE_TESTOPS_RUN_COMPLETE", value: 'false' }
                    ]

                    // Get TeamCity parameters from modal inputs if they exist, otherwise use config
                    if (window.aviator?.teamcity?.parameters) {
                        const modalParameters = AviatorShared.getTeamCityParametersFromModal();
                        if (modalParameters.length > 0) {
                            // Use values from modal
                            modalParameters.forEach(param => {
                                tc_properties.push({ name: `env.${param.name}`, value: param.value })
                            })
                        } else {
                            // Fallback to config values
                            window.aviator.teamcity.parameters.forEach(param => {
                                tc_properties.push({ name: `env.${param.name}`, value: param.value })
                            })
                        }
                    }

                    /** optional to set parameter of qase_ids for automation to only run against those (if grep set) */
                    if (AviatorShared.shadowRoot.getElementById('teamcity-qases-only').checked) tc_properties.push({ name: "env.QASE_IDS", value: caseIds.join(',') })

                    await AviatorShared.api({
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
        },

        fetchTeamCityBuildDetails: async function (buildId) {
            const token = window.aviator?.teamcity?.token;
            const cfsrToken = await AviatorShared.teamcity.getTeamCityCsrfToken(token)

            const data = await AviatorShared.api({
                method: 'GET',
                url: `https://ci.paylocity.com/app/rest/buildTypes/id:${buildId}?fields=id,projectId,name,projectName,webUrl,description`,
                headers: { Authorization: `Bearer ${token}`, 'X-TC-CSRF-Token': cfsrToken }
            })
            return data
        },

        fetchTeamCityBuildsFromProject: async function (projectId, visited = new Set(), depth = 0, parentPath = '') {
            // Prevent infinite recursion
            if (visited.has(projectId)) {
                return { builds: [], projects: [] };
            }
            visited.add(projectId);

            const token = window.aviator?.teamcity?.token;
            const cfsrToken = await AviatorShared.teamcity.getTeamCityCsrfToken(token);

            const result = { builds: [], projects: [] };

            try {
                // Get project details with build types
                const projectData = await AviatorShared.api({
                    method: 'GET',
                    url: `https://ci.paylocity.com/app/rest/projects/id:${projectId}`,
                    headers: { Authorization: `Bearer ${token}`, 'X-TC-CSRF-Token': cfsrToken }
                });

                const currentPath = parentPath ? `${parentPath} > ${projectData.name}` : projectData.name;

                const projectInfo = {
                    id: projectData.id,
                    name: projectData.name,
                    path: currentPath,
                    depth: depth,
                    builds: [],
                    subProjects: []
                };

                // Add builds from this project
                if (projectData.buildTypes && projectData.buildTypes.buildType) {
                    const builds = Array.isArray(projectData.buildTypes.buildType)
                        ? projectData.buildTypes.buildType
                        : [projectData.buildTypes.buildType];

                    builds.forEach(build => {
                        projectInfo.builds.push({
                            id: build.id,
                            name: build.name,
                            projectName: projectData.name,
                            projectId: projectData.id,
                            projectPath: currentPath,
                            depth: depth,
                            webUrl: build.webUrl,
                            description: build.description || ''
                        });
                    });
                }

                // Recursively fetch builds from subprojects
                if (projectData.projects && projectData.projects.count > 0) {
                    for (const subProject of projectData.projects.project) {
                        const subResult = await AviatorShared.teamcity.fetchTeamCityBuildsFromProject(
                            subProject.id, visited, depth + 1, currentPath
                        );
                        projectInfo.subProjects.push(...subResult.projects);
                        result.builds.push(...subResult.builds);
                    }
                }

                // Add current project builds to result
                result.builds.push(...projectInfo.builds);
                result.projects.push(projectInfo);

            } catch (error) {
                console.warn(`Failed to fetch builds from TeamCity project ${projectId}:`, error);
                const errorMsg = `Error fetching project '${projectId}': ${error.message || 'Access denied or project not found'}`;
                // Don't add error strings to builds array to avoid character-indexing when spread
                // Let the caller handle error reporting
                console.error('TeamCity project fetch error:', errorMsg);
            }

            return result;
        },

        fetchAllTeamCityBuilds: async function () {
            const result = { flatBuilds: [], projectStructure: [] };

            // Fetch individual builds
            if (window.aviator?.teamcity?.builds && window.aviator.teamcity.builds.length > 0) {
                const buildPromises = window.aviator.teamcity.builds.map(async (buildId) => {
                    try {
                        const build = await AviatorShared.teamcity.fetchTeamCityBuildDetails(buildId);
                        if (typeof build === 'string') {
                            return { isError: true, id: buildId, message: 'Build not found or access denied)' }
                        }
                        else {
                            return build
                        }
                    } catch (error) {
                        return { isError: true, id: buildId, message: 'Build not found or access denied)' }
                    }
                });

                const individualBuilds = await Promise.all(buildPromises);
                result.flatBuilds.push(...individualBuilds);
            }

            // Fetch builds from projects
            if (window.aviator?.teamcity?.projects && window.aviator.teamcity.projects.length > 0) {
                for (const projectId of window.aviator.teamcity.projects) {
                    const projectResult = await AviatorShared.teamcity.fetchTeamCityBuildsFromProject(projectId);
                    result.projectStructure.push(...projectResult.projects);
                }
            }
            return result;
        }
    },

    getTeamCityParametersFromModal: function () {
        const parameters = [];

        // Check if we're in shadow DOM context
        const context = AviatorShared.shadowRoot || document;

        if (window.aviator?.teamcity?.parameters) {
            window.aviator.teamcity.parameters.forEach((param, index) => {
                const input = context.querySelector(`#teamcity-param-${index}`);
                if (input) {
                    parameters.push({
                        name: param.name,
                        value: input.value
                    });
                }
            });
        }

        return parameters;
    },

    addAviatorTools: function () {
        AviatorShared.injectPopupStyles();
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        /** function: creates button to attach to jira page */
        const createAviatorButton = () => {
            const btn = document.createElement('button');
            btn.textContent = "✈️ Aviator";
            btn.id = 'qaseScrapeButton';

            const jiraCreateButton = document.querySelector('[data-testid="atlassian-navigation--create-button"]')
            btn.classList = jiraCreateButton.classList

            btn.style.marginLeft = '5px'
            btn.style.background = isDarkMode ? '#E2D988' : '#C77AF5';
            btn.style.color = isDarkMode ? '#1f1f21' : 'white'
            btn.onmouseenter = () => btn.style.background = isDarkMode ? '#F1EDC6' : '#E1B8FA';
            btn.onmouseleave = () => btn.style.background = isDarkMode ? '#E2D988' : '#C77AF5';

            btn.onclick = Aviator.scrapeAndShowAviator;
            return btn;
        };

        /** function: creates Traciator button for release pages */
        const createTraciatorButton = () => {
            const btn = document.createElement('button');
            btn.textContent = "🔍 Traciator";
            btn.id = 'qaseTraciatorButton';

            const jiraCreateButton = document.querySelector('[data-testid="atlassian-navigation--create-button"]')
            btn.classList = jiraCreateButton.classList

            btn.style.marginLeft = '5px'
            btn.style.background = isDarkMode ? '#F6A58B' : '#27AE1E';
            btn.onmouseenter = () => btn.style.background = isDarkMode ? '#FFCA82' : '#C1F4BE';
            btn.onmouseleave = () => btn.style.background = isDarkMode ? '#F6A58B' : '#27AE1E';

            btn.onclick = Traciator.scrapeAndShowTraceabilityReport;
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
            const observer = new MutationObserver((mutations) => {
                const jiraCreateButton = document.querySelector('[data-testid="atlassian-navigation--create-button"]');
                const existingBtn = document.querySelector('#qaseScrapeButton');

                if (jiraCreateButton && !existingBtn) {
                    try {
                        const aviatorBtn = createAviatorButton();
                        jiraCreateButton.parentNode.insertBefore(aviatorBtn, jiraCreateButton.nextSibling);

                        // Verify insertion
                        const insertedBtn = document.querySelector('#qaseScrapeButton');

                        if (insertedBtn) {
                            observer.disconnect(); // Stop observing since we succeeded
                        }
                    } catch (error) {
                        console.error('❌ Error during button insertion:', error);
                    }
                } else if (existingBtn) {
                    observer.disconnect();
                } else if (!jiraCreateButton) {
                    console.log('⚠️ Jira create button not found');
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // Also do an immediate check in case elements are already ready
            const jiraCreateButton = document.querySelector('[data-testid="atlassian-navigation--create-button"]');
            const existingBtn = document.querySelector('#qaseScrapeButton');

            if (jiraCreateButton && !existingBtn) {
                try {
                    const aviatorBtn = createAviatorButton();
                    jiraCreateButton.parentNode.insertBefore(aviatorBtn, jiraCreateButton.nextSibling);
                    observer.disconnect(); // Stop observing since we succeeded
                } catch (error) {
                    console.error('❌ Error during immediate button insertion:', error);
                }
            }
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
    },

    html: {
        // Create test plan multi-select dropdown with functionality already set up
        createTestPlanDropdown: function (plans, options = {}) {
            const {
                buttonId = 'testPlanDropdownBtn',
                optionsId = 'testPlanOptions',
                textId = 'testPlanSelectionText',
                includeQaseItemClass = false,
                includeDataIds = false
            } = options;

            if (!plans || !plans.length) {
                return null;
            }

            // Create the container element
            const container = document.createElement('div');
            container.className = 'multi-select-container';

            container.innerHTML = `
                <div class="multi-select-dropdown">
                    <button type="button" class="multi-select-button" id="${buttonId}" data-open="false">
                        <span id="${textId}">Select test plans...</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div class="multi-select-options" id="${optionsId}" style="display: none;">
                        ${plans.map(plan => {
                const caseCount = plan.caseIds?.length || plan.cases_count || 0;
                const qaseItemClass = includeQaseItemClass ? ' class="qase-item"' : '';
                const dataType = includeQaseItemClass ? ' data-type="plan"' : '';
                const dataIds = includeDataIds && plan.caseIds ? ` data-ids="${plan.caseIds.join(',')}"` : '';

                return `
                                <label class="multi-select-option">
                                    <input type="checkbox"${qaseItemClass}${dataType}${dataIds} value="${plan.id}" data-title="${plan.title}" data-cases="${caseCount}">
                                    <span class="plan-title">${plan.title}</span>
                                    <span class="plan-cases">(${caseCount} case${caseCount === 1 ? '' : 's'})</span>
                                </label>
                            `;
            }).join('')}
                    </div>
                </div>
                <small class="help-text">Select test plans to include their test cases in the run</small>
            `;

            // Set up functionality immediately
            const dropdownBtn = container.querySelector(`#${buttonId}`);
            const optionsContainer = container.querySelector(`#${optionsId}`);
            const selectionText = container.querySelector(`#${textId}`);

            // Toggle dropdown
            dropdownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const isOpen = optionsContainer.style.display !== 'none';

                if (isOpen) {
                    optionsContainer.style.display = 'none';
                    dropdownBtn.setAttribute('data-open', 'false');
                } else {
                    // Simple positioning - just show below the button
                    optionsContainer.style.display = 'block';
                    optionsContainer.style.position = 'absolute';
                    optionsContainer.style.top = '100%';
                    optionsContainer.style.left = '0';
                    optionsContainer.style.right = '0';
                    optionsContainer.style.zIndex = '10000';
                    optionsContainer.style.minWidth = `${dropdownBtn.offsetWidth}px`;

                    // Make sure the dropdown parent has relative positioning
                    const dropdownContainer = dropdownBtn.closest('.multi-select-dropdown');
                    if (dropdownContainer) {
                        dropdownContainer.style.position = 'relative';
                    }

                    dropdownBtn.setAttribute('data-open', 'true');
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!dropdownBtn.contains(e.target) && !optionsContainer.contains(e.target)) {
                    optionsContainer.style.display = 'none';
                    dropdownBtn.setAttribute('data-open', 'false');
                }
            });

            // Handle checkbox changes and update selection text
            const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');

            function updateSelectionText() {
                const selected = Array.from(checkboxes).filter(cb => cb.checked);

                if (selected.length === 0) {
                    selectionText.textContent = 'Select test plans...';
                } else if (selected.length === 1) {
                    const caseCount = parseInt(selected[0].dataset.cases || 0);
                    selectionText.textContent = `${selected[0].dataset.title} (${caseCount} cases)`;
                } else {
                    const totalCases = selected.reduce((sum, cb) => sum + parseInt(cb.dataset.cases || 0), 0);
                    selectionText.textContent = `${selected.length} plans selected (${totalCases} cases)`;
                }
            }

            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateSelectionText);
            });

            return container;
        },

        htmlTestPlans: function (plans) {
            const plansDiv = document.createElement('div')
            plansDiv.id = 'test-plans-section'
            plansDiv.classList = 'test-case-list'

            if (!plans.length) {
                return plansDiv;
            }

            const title = document.createElement('h3');
            title.textContent = '📦 Test Plans';
            plansDiv.appendChild(title);

            const dropdown = AviatorShared.html.createTestPlanDropdown(plans, {
                buttonId: 'aviatorTestPlanDropdownBtn',
                optionsId: 'aviatorTestPlanOptions',
                textId: 'aviatorTestPlanSelectionText',
                includeQaseItemClass: true,
                includeDataIds: true
            });

            if (dropdown) {
                plansDiv.appendChild(dropdown);
            }

            return plansDiv
        },

        htmlTestCases: function (externalCases) {
            const div = document.createElement('div')
            div.id = 'test-cases-section'
            div.classList = 'test-case-list'

            if (!externalCases.length) {
                return div;
            }

            let html = `<h3>🔗 Linked Test Cases</h3>`
            externalCases.forEach((item) => {
                html += `<label>
                        <input type="checkbox" class="qase-item" id="test-case-item-${item.id}" data-type="case" data-ids="${item.id}"> #${item.id} - ${item.title}
                    </label>`;
            });

            div.innerHTML = html
            return div
        },

        htmlTestRunDetails: function (qaseConfigData, availableJiraKeys = [], availableTestPlans = []) {
            const div = document.createElement('div')
            div.id = 'test-run-configuration-section'

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

            // Add test plan selector
            if (availableTestPlans && availableTestPlans.length > 0) {
                const testPlanLabel = document.createElement('label');
                testPlanLabel.textContent = 'Add Test Plans (Optional)';
                div.appendChild(testPlanLabel);

                const dropdown = AviatorShared.html.createTestPlanDropdown(availableTestPlans, {
                    buttonId: 'traciatorTestPlanDropdownBtn',
                    optionsId: 'traciatorTestPlanOptions',
                    textId: 'traciatorTestPlanSelectionText',
                    includeQaseItemClass: true,
                    includeDataIds: true
                });
                if (dropdown) {
                    div.appendChild(dropdown);
                }
            }

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
                            <select class="qaseConfig" id="qaseConfiguration-${entity.title}" data-entity-id="${entity.id}">
                                <option value=""></option>
                                 ${entity.configurations.map(cfg => `<option value="${cfg.id}">${cfg.title}</option>`).join('')}
                            </select>`
                    grid.appendChild(_div)
                });
            }

            div.appendChild(grid)
            return div
        },

        htmlTeamCityBuilds: function (tcBuildData) {

            // internal helper functions for building tree
            const generateTreeHTML = function (nodeMap, depth = 0) {
                let html = '';

                for (const [name, node] of nodeMap) {
                    const hasBuilds = node.builds.length > 0;
                    const hasChildren = node.children.size > 0;
                    const totalBuilds = hasBuilds ? node.builds.length : 0;
                    const indent = '  '.repeat(depth);
                    const nodeId = name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + depth;

                    if (hasBuilds || hasChildren) {
                        html += `
                            <div class="project-node" id="project-builds-${depth}" style="margin-left: ${depth * 5}px;">
                                <div class="project-header" onclick="this.parentElement.querySelector('.project-content').style.display = this.parentElement.querySelector('.project-content').style.display === 'none' ? 'block' : 'none'; this.querySelector('.toggle-arrow').textContent = this.querySelector('.toggle-arrow').textContent === '▼' ? '▶' : '▼';">
                                    <span class="toggle-arrow">▼</span>
                                    <h4 style="margin: 0 0 3px 0; font-size: 0.9rem; color: var(--text); display: inline;">📁 ${name}</h4>
                                    ${totalBuilds > 0 ? `<span style="margin-left: 8px; font-size: 0.8rem; color: var(--text-muted);">(${totalBuilds} build${totalBuilds === 1 ? '' : 's'})</span>` : ''}
                                    ${(hasBuilds || hasChildren) ? `<button type="button" id="${name}-${depth}" onclick="event.stopPropagation(); const container = this.parentElement.parentElement; const checkboxes = container.querySelectorAll('.teamcity-build'); const buttons = container.querySelectorAll('button'); const allChecked = Array.from(checkboxes).every(cb => cb.checked); const newState = !allChecked; checkboxes.forEach(cb => cb.checked = newState); buttons.forEach(btn => btn.textContent = newState ? '☑' : '☐'); this.textContent = newState ? '☑' : '☐';" style="margin-left: auto; background: var(--secondary); border: 1px solid var(--border); padding: 1px 5px; border-radius: 3px; cursor: pointer; font-size: 1rem;">☐</button>` : ''}
                                </div>
                                <div class="project-content" style="margin-left: 16px;">
                        `;

                        // Add builds for this level
                        if (hasBuilds) {
                            node.builds.forEach(build => {
                                html += `<label style="display: block; padding: 2px 0; font-size: 0.9rem;">
                                    <input type="checkbox" class="teamcity-build" data-id="${build.id}">
                                    ${build.name}
                                    ${build.description ? `<span class="subText" style="font-style: italic;">${build.description}</span>` : ''}
                                </label>`;
                            });
                        }

                        // Add children recursively
                        if (hasChildren) {
                            html += generateTreeHTML(node.children, depth + 1);
                        }

                        html += `
                                </div>
                            </div>
                        `;
                    }
                }

                return html;
            }

            const getNestedLevel = function (tree, pathParts) {
                let currentLevel = tree;
                for (const part of pathParts) {
                    if (currentLevel.has(part)) {
                        currentLevel = currentLevel.get(part).children;
                    } else {
                        return null;
                    }
                }
                return currentLevel;
            }

            const div = document.createElement('div')
            div.id = 'teamcity-builds-section'

            if (!tcBuildData || (!tcBuildData.flatBuilds?.length && !tcBuildData.projectStructure?.length)) {
                return div;
            }

            let html = `<h3>🚀 TeamCity Builds<label style="float: right; font-size: small; font-weight:300">run selected qases only<input type="checkbox" id="teamcity-qases-only" checked></label></h3>`

            // Add TeamCity parameters section if configured
            if (window.aviator?.teamcity?.parameters && window.aviator.teamcity.parameters.length > 0) {
                html += '<div id="teamcity-parameters" style="margin-bottom: 15px; padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-card);">';
                html += '<h4 style="margin: 0 0 8px 0; font-size: 0.9rem; color: var(--text); display: inline;">Build Parameters</h4><small style="color: var(--text-muted); font-size: 0.8rem;"> will be sent to all triggered TeamCity builds</small>';

                window.aviator.teamcity.parameters.forEach((param, index) => {
                    html += `
                        <div style="margin-top: 8px;">
                            <label style="display: block; font-size: 0.85rem; margin-bottom: 2px; color: var(--text-muted);">${param.name}
                                <input type="text" 
                                    id="teamcity-param-${index}" 
                                    data-param-name="${param.name}"
                                    value="${param.value}" 
                                    style="width: calc(100% - 16px); padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 0.85rem; background: var(--bg); color: var(--text);" />
                            </label>
                        </div>
                    `;
                });

                html += '</div>';
            }

            // Build a proper tree structure from the project data
            const projectTree = new Map();
            const errorBuilds = [];
            const individualBuilds = [];

            // Process builds from project structure first
            if (tcBuildData.projectStructure) {
                // Recursive function to process projects and their subProjects
                function processProject(project) {
                    const pathParts = project.path.split(' > ');
                    let currentLevel = projectTree;

                    // Build the tree structure
                    for (let i = 0; i < pathParts.length; i++) {
                        const part = pathParts[i];
                        if (!currentLevel.has(part)) {
                            currentLevel.set(part, {
                                children: new Map(),
                                builds: [],
                                depth: i,
                                isProject: true
                            });
                        }
                        currentLevel = currentLevel.get(part).children;
                    }

                    // Add builds to the final level
                    if (project.builds && project.builds.length > 0) {
                        const finalPart = pathParts[pathParts.length - 1];
                        const parentLevel = pathParts.length > 1 ?
                            getNestedLevel(projectTree, pathParts.slice(0, -1)) : projectTree;
                        if (parentLevel && parentLevel.has(finalPart)) {
                            parentLevel.get(finalPart).builds.push(...project.builds);
                        }
                    }

                    // Recursively process subProjects
                    if (project.subProjects && project.subProjects.length > 0) {
                        project.subProjects.forEach(subProject => {
                            processProject(subProject);
                        });
                    }
                }

                // Process all top-level projects
                tcBuildData.projectStructure.forEach(project => {
                    processProject(project);
                });
            }

            // Process flat builds
            if (tcBuildData.flatBuilds) {
                tcBuildData.flatBuilds.forEach(build => {
                    if (build.isError == true) {
                        errorBuilds.push(build);
                    } else {
                        individualBuilds.push(build);
                    }
                    // Project builds are already handled above through projectStructure
                });
            }

            // Add the tree structure
            html += generateTreeHTML(projectTree);

            // Add individual builds if any
            if (tcBuildData.flatBuilds.length > 0) {
                html += `
                    <div class="project-node" id="individual-builds">
                        <div class="project-header" onclick="this.parentElement.querySelector('.project-content').style.display = this.parentElement.querySelector('.project-content').style.display === 'none' ? 'block' : 'none'; this.querySelector('.toggle-arrow').textContent = this.querySelector('.toggle-arrow').textContent === '▼' ? '▶' : '▼';">
                            <span class="toggle-arrow">▼</span>
                             <h4 style="margin: 0 0 3px 0; font-size: 0.9rem; color: var(--text); display: inline;">🔧 Individual Builds</h4>
                            <span style="margin-left: 8px; font-size: 0.8rem; color: var(--text-muted);">(${individualBuilds.length} build${individualBuilds.length === 1 ? '' : 's'})</span>
                            <button type="button" id="individual-builds-checkbox" onclick="event.stopPropagation(); const container = this.parentElement.parentElement; const checkboxes = container.querySelectorAll('.teamcity-build'); const buttons = container.querySelectorAll('button'); const allChecked = Array.from(checkboxes).every(cb => cb.checked); const newState = !allChecked; checkboxes.forEach(cb => cb.checked = newState); buttons.forEach(btn => btn.textContent = newState ? '☑' : '☐'); this.textContent = newState ? '☑' : '☐';" style="margin-left: auto; background: var(--secondary); border: 1px solid var(--border); padding: 4px 6px; border-radius: 3px; cursor: pointer; font-size: 1rem;">☐</button>
                        </div>
                        <div class="project-content" style="margin-left: 16px;">
                `;

                tcBuildData.flatBuilds.forEach(build => {
                    if (build.isError == true) {
                        html += `<label style="color: #ff6b6b; opacity: 0.8; display: block; padding: 2px 0;">
                            ❌ ${build.id} <span class="subText">(Build not found or access denied)</span>
                    </label>`;
                    } else {
                        html += `<label style="display: block; padding: 2px 0; font-size: 0.9rem;">
                            <input type="checkbox" class="teamcity-build" data-id="${build.id}">
                            ${build.name}
                            ${build.description ? `<span class="subText" style="font-style: italic;">${build.description}</span>` : ''}
                    </label>`;
                    }
                });

                html += `
                        </div>
                    </div>
                `;
            }

            div.innerHTML = html;
            return div;
        },

    },

}


// === src\aviator.js ===

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


// === src\traciator.js ===

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


    // Initialize Aviator after all modules are loaded (matching original loader)
    async function initAviator() {
        try {
            console.log('âœ… All Aviator modules loaded successfully');
            
            // Initialize the main functionality
            if (typeof AviatorShared.addAviatorTools === 'function') {
                AviatorShared.addAviatorTools();
                console.log('âœ… Aviator tools initialized');
            } else {
                console.error('âŒ addAviatorTools function not found');
            }
            
        } catch (error) {
            console.error('âŒ Failed to load Aviator modules:', error);
        }
    }

    // Start initialization
    initAviator();

})();
