// shared.js
// Shared Utilities v1.0.0

const AviatorShared = {
    jiraShortcutBlocker: null,
    shadowRoot: null,
    createdRun: false,
    _inFlight: {},
    shadowStyles: `
    @keyframes qase-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    :host {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        /* stay above Jira */
    }

    /* Small shared utility classes (prefer these over inline style="...") */
    .qase-ml-auto { margin-left: auto; }
    .qase-ml-8 { margin-left: 8px; }
    .qase-mt-0 { margin-top: 0; }
    .qase-mt-10 { margin-top: 10px; }
    .qase-mb-12 { margin-bottom: 12px; }
    .qase-italic { font-style: italic; }

    .qase-row-between {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .qase-icon-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--text);
    }

    .qase-text-muted { color: var(--text-muted); }

    .qase-link {
        color: var(--primary);
        text-decoration: none;
    }

    .qase-link:hover {
        opacity: 0.9;
        text-decoration: underline;
    }

    .qase-mini-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #ccc;
        border-top: 2px solid #0052CC;
        border-radius: 50%;
        animation: qase-spin 1s linear infinite;
    }

    .qase-card {
        background: var(--bg-card);
        padding: 15px;
        border-radius: 8px;
        border: 1px solid var(--border);
    }

    .teamcity-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border-bottom: 1px solid var(--border);
        padding-bottom: 6px;
        margin-bottom: 12px;
    }

    .qasePopup .teamcity-header-row h3 {
        border-bottom: none;
        padding-bottom: 0;
        margin: 0;
        flex: 1;
    }

    .teamcity-qases-only {
        font-size: small;
        font-weight: 300;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: -10px !important;
    } 

    .teamcity-parameters h4 {
        margin: 0 0 8px 0;
        font-size: 0.9rem;
        color: var(--text);
        display: inline;
    }

    .teamcity-param-row {
        margin-top: 8px;
    }

    .teamcity-param-label {
        display: block;
        font-size: 0.85rem;
        margin-bottom: 2px;
        color: var(--text-muted);
    }

    .teamcity-param-input {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        padding: 4px 8px;
        border: 1px solid var(--border);
        border-radius: 4px;
        font-size: 0.85rem;
        background: var(--bg);
        color: var(--text);
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

    .qasePopup .changelog-note {
        margin-bottom: 8px;
        font-size: 14px;
    }

    /* Loading overlay */
    .qase-loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000002;
    }

    .qase-loading-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: white;
        font-size: 18px;
        font-family: Arial, sans-serif;
        text-align: center;
        max-width: 400px;
    }

    .qase-spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #0052CC;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: qase-spin 1s linear infinite;
        margin-bottom: 12px;
    }

    .qase-progress-wrap {
        width: 300px;
        background: #333;
        border-radius: 10px;
        margin: 10px 0;
        overflow: hidden;
    }

    .qase-progress-bar-fill {
        height: 8px;
        background: #0052CC;
        width: 0%;
        transition: width 0.3s ease;
    }

    .qase-loading-progress {
        color: #ccc;
        font-size: 14px;
        margin-bottom: 5px;
    }

    /* Status modal */
    .status-modal-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
        max-height: 60vh;
        padding: 4px;
    }

    .status-block {
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg-card);
    }

    .status-summary-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
    }

    .status-summary-icon {
        font-size: 22px;
    }

    .status-summary-content {
        flex: 1;
    }

    .status-summary-title {
        font-weight: 600;
        color: var(--text);
        margin-bottom: 4px;
    }

    .status-summary-run-title {
        color: var(--text);
        margin-bottom: 4px;
        word-break: break-word;
    }

    .status-summary-subline {
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .status-association {
        margin-top: 6px;
        color: var(--text);
        font-size: 0.9rem;
    }

    .status-association.failed {
        color: #f44336;
    }

    .status-list-header {
        font-weight: 600;
        color: var(--text);
    }

    .status-list {
        max-height: 320px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 4px;
    }

    .status-row {
        display: flex;
        align-items: flex-start;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--bg-card);
        gap: 12px;
    }

    .status-icon {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .status-build-meta {
        flex: 0 1 320px;
        min-width: 220px;
        max-width: 420px;
    }

    .build-name {
        font-weight: 500;
        color: var(--text);
        word-break: normal;
        overflow-wrap: break-word;
    }

    .build-id {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
        overflow-wrap: anywhere;
        word-break: break-word;
    }

    .status-message {
        flex: 1 1 auto;
        min-width: 0;
        color: var(--text-muted);
        font-size: 13px;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
    }

    .status-empty {
        color: var(--text-muted);
        font-size: 0.95rem;
    }

    .status-footer {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
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

    .qasePopup .project-header h4 {
        margin: 0 0 3px 0;
        font-size: 0.9rem;
        color: var(--text);
        display: inline;
    }

    .qasePopup .project-toggle-all {
        margin-left: auto;
        background: var(--secondary);
        border: 1px solid var(--border);
        padding: 1px 5px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 1rem;
        color: var(--text);
    }

    .qasePopup .project-header:hover {
        background: var(--secondary-hover);
    }

    .qasePopup .project-builds {
        margin-left: 10px;
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

    /* Traciator report modal */
    .qasePopup.traciator-report-popup {
        max-width: 90vw;
        width: 1200px;
    }

    .qasePopup .traciator-titlebar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .qasePopup .traciator-title {
        display: flex;
        align-items: flex-end;
        gap: 8px;
    }

    .qasePopup .traciator-title h2 {
        margin: 0;
        color: var(--text);
    }

    .qasePopup .traciator-tiles-4 {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 15px;
        margin-bottom: 20px;
    }

    .qasePopup .traciator-tile {
        background: var(--bg-card);
        padding: 15px;
        border-radius: 8px;
        text-align: center;
        border: 1px solid var(--border);
    }

    .qasePopup .traciator-tile-value {
        font-size: 24px;
        font-weight: bold;
        color: var(--text);
    }

    .qasePopup .traciator-tile-value.success {
        color: #4caf50;
    }

    .qasePopup .traciator-tile-label {
        font-size: 12px;
        color: var(--text-muted);
    }

    .qasePopup .traciator-coverage-tiles {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        margin-bottom: 20px;
    }

    .qasePopup .traciator-coverage-tile {
        color: white;
        padding: 8px;
        border-radius: 4px;
        text-align: center;
        font-size: 12px;
    }

    .qasePopup .traciator-coverage-tile.full { background: #4caf50; }
    .qasePopup .traciator-coverage-tile.partial { background: #ff9800; }
    .qasePopup .traciator-coverage-tile.none { background: #f44336; }

    .qasePopup .traciator-table-wrap {
        max-height: 60vh;
        overflow-y: auto;
        border: 1px solid var(--border);
        border-radius: 8px;
    }

    .qasePopup .traciator-table {
        width: 100%;
        border-collapse: collapse;
    }

    .qasePopup .traciator-thead {
        background: var(--bg-card);
        position: sticky;
        top: 0;
    }

    .qasePopup .traciator-th,
    .qasePopup .traciator-td {
        padding: 12px;
        border-bottom: 1px solid var(--border);
        color: var(--text);
    }

    .qasePopup .traciator-th {
        text-align: left;
    }

    .qasePopup .traciator-th.center,
    .qasePopup .traciator-td.center {
        text-align: center;
    }

    .qasePopup .traciator-col-key { width: 65px; }
    .qasePopup .traciator-col-status { width: 85px; }
    .qasePopup .traciator-col-name { width: 40%; }
    .qasePopup .traciator-col-cases { width: 80px; }
    .qasePopup .traciator-col-runs { width: 80px; }

    .qasePopup .traciator-tr {
        border-bottom: 1px solid var(--border);
    }

    .qasePopup .traciator-td.muted {
        color: var(--text-muted);
    }

    .qasePopup .traciator-td.wrap {
        word-wrap: break-word;
        line-height: 1.4;
    }

    .qasePopup .traciator-jira-link {
        color: var(--primary);
        text-decoration: none;
        font-weight: bold;
    }

    .qasePopup .traciator-badge {
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        display: inline-block;
    }

    .qasePopup .traciator-badge.full { background: #4caf50; }
    .qasePopup .traciator-badge.partial { background: #ff9800; }
    .qasePopup .traciator-badge.none { background: #f44336; }

    .qasePopup .traciator-run-item {
        font-size: 11px;
        margin: 2px 0;
        line-height: 1.3;
    }

    .qasePopup .traciator-run-title {
        font-weight: 500;
        color: var(--text);
    }

    .qasePopup .traciator-run-summary {
        color: var(--text-muted);
        font-size: 10px;
    }

    .qasePopup .traciator-no-runs {
        font-size: 11px;
        font-style: italic;
    }

    .qasePopup .traciator-actions {
        margin-top: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .qasePopup .traciator-actions-right {
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .qasePopup .btn.success {
        --btn-bg: #4caf50;
        --btn-color: #fff;
        --btn-hover-bg: #43a047;
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

    addAviatorTools: function () {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Jira is an SPA and will frequently re-render the top navigation.
        // Keep a small observer around to re-attach the Aviator button if Jira removes it.
        let aviatorTicketObserver = null;

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

            btn.addEventListener('click', Aviator.scrapeAndShowAviator);
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

            btn.addEventListener('click', Traciator.initTraciator);
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
            const buttonId = 'qaseScrapeButton';

            const ensureInserted = () => {
                const jiraCreateButton = document.querySelector('[data-testid="atlassian-navigation--create-button"]');
                if (!jiraCreateButton || !jiraCreateButton.parentNode) return false;

                const parent = jiraCreateButton.parentNode;

                // If it's already attached next to the current create button, we're done.
                if (parent.querySelector(`#${buttonId}`)) return true;

                // Clean up any stray duplicates from previous renders.
                document.querySelectorAll(`#${buttonId}`).forEach((btn) => {
                    if (btn.parentNode !== parent) {
                        try { btn.remove(); } catch { /* ignore */ }
                    }
                });

                try {
                    parent.insertBefore(createAviatorButton(), jiraCreateButton.nextSibling);
                    return true;
                } catch (error) {
                    console.error('❌ Error inserting Aviator button:', error);
                    return false;
                }
            };

            // One immediate attempt.
            ensureInserted();

            // Keep watching while we're on a ticket page; Jira may replace the nav DOM during load.
            if (aviatorTicketObserver) return;

            aviatorTicketObserver = new MutationObserver(() => {
                if (!/\/browse\/[A-Z]+-\d+/.test(location.href)) {
                    try { aviatorTicketObserver.disconnect(); } catch { /* ignore */ }
                    aviatorTicketObserver = null;
                    return;
                }
                ensureInserted();
            });

            aviatorTicketObserver.observe(document.body, { childList: true, subtree: true });
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

    api: async function ({ method, url, headers = {}, data = null, includeHttpInfo = false, withCredentials = false, anonymous = false }) {
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
                anonymous,
                withCredentials,
                onload: res => {

                    const parsed = tryParseJSON(res.responseText)
                    const payload = parsed ?? res.responseText

                    if (includeHttpInfo) {
                        resolve({
                            data: payload,
                            http: {
                                status: res.status,
                                statusText: res.statusText,
                                responseHeaders: res.responseHeaders
                            }
                        });
                        return;
                    }

                    resolve(payload)
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

    configuration: {
        getQaseApiToken: () => window?.aviator?.qase?.token ?? null,

        checkQaseApiToken: function () {
            const token = AviatorShared.configuration.getQaseApiToken();
            if (!token) {
                AviatorShared.html.showStatusModal([], {
                    notification: { message: 'No Qase API token set.', type: 'warning' },
                    onClose: AviatorShared.html.hidePopup
                });
                return false;
            }
            return true;
        },

        getQaseProjectCode: () => window?.aviator?.qase?.projectCode ?? null,

        checkQaseProjectCode: function () {
            const code = AviatorShared.configuration.getQaseProjectCode();
            if (!code) {
                AviatorShared.html.showStatusModal([], {
                    notification: { message: 'No Qase Project Code set.', type: 'warning' },
                    onClose: AviatorShared.html.hidePopup
                });
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
        },

        shouldShowFeaturePopup: function (key, version) {
            const seenVersion = localStorage.getItem(key) || "";
            if (seenVersion !== version) {
                localStorage.setItem(key, version);
                return true;
            }
            return false;
        },
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
            AviatorShared.jiraShortcutBlocker = AviatorShared.html.addMultiEventListener(
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
        }
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
            const limit = 100; // Qase API enforces limit <= 100
            const cutoffDate = startDate || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            const fromStartTime = Math.floor(cutoffDate.getTime() / 1000); // Unix timestamp
            const token = AviatorShared.configuration.getQaseApiToken();
            const jiraKeysSet = new Set((jiraKeys || []).map(k => String(k).toUpperCase()));

            const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            const buildRunsUrl = ({ limit, offset, include }) => `https://api.qase.io/v1/run/${projectCode}?limit=${limit}&offset=${offset}&from_start_time=${fromStartTime}&include=${encodeURIComponent(include)}`;

            const extractJiraKey = (externalIssue) => {
                if (!externalIssue || typeof externalIssue !== 'object') return null;
                const candidates = [
                    externalIssue.id,
                    externalIssue.key,
                    externalIssue.external_id,
                    externalIssue.externalId,
                    externalIssue.name,
                    externalIssue.title
                ];
                for (const candidate of candidates) {
                    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
                }
                if (typeof externalIssue.url === 'string') {
                    const match = externalIssue.url.match(/\/browse\/([A-Z]+-\d+)/i);
                    if (match) return match[1];
                }
                return null;
            };

            const isRunForJiraKeys = (run) => {
                if (jiraKeysSet.size === 0) return true;
                const key = extractJiraKey(run?.external_issue);
                if (!key) return false;
                return jiraKeysSet.has(String(key).toUpperCase());
            };

            const apiGetWithRetry = async (url, maxRetries = 5) => {
                let attempt = 0;
                while (true) {
                    attempt++;
                    try {
                        const response = await AviatorShared.api({
                            method: 'GET',
                            url,
                            headers: { 'Token': token }
                        });

                        if (response && response.status === false) {
                            const msg = response.errorMessage || response.error || 'Qase API returned status:false';
                            throw new Error(msg);
                        }

                        return { response, attempts: attempt };
                    } catch (error) {
                        if (attempt > maxRetries) throw error;

                        const backoffMs = Math.min(8000, 250 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 250);
                        console.warn(`Retrying Qase request (attempt ${attempt}/${maxRetries}) in ${backoffMs}ms:`, url, error);
                        await sleep(backoffMs);
                    }
                }
            };

            const mapWithConcurrency = async (items, concurrency, mapper) => {
                const results = new Array(items.length);
                let nextIndex = 0;
                const worker = async () => {
                    while (true) {
                        const idx = nextIndex;
                        if (idx >= items.length) return;
                        nextIndex++;
                        results[idx] = await mapper(items[idx], idx);
                    }
                };
                const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
                await Promise.all(workers);
                return results;
            };

            const mapAdaptiveConcurrency = async (items, opts, mapper) => {
                const results = [];
                let concurrency = Math.max(opts.minConcurrency, Math.min(opts.maxConcurrency, opts.initialConcurrency));
                const batchSize = Math.max(1, opts.batchSize);

                for (let start = 0; start < items.length; start += batchSize) {
                    const batch = items.slice(start, start + batchSize);
                    const batchResults = await mapWithConcurrency(batch, concurrency, mapper);
                    results.push(...batchResults);

                    const totalRequests = batchResults.length;
                    const totalAttempts = batchResults.reduce((acc, r) => acc + (r?.attempts || 1), 0);
                    const totalRetries = totalAttempts - totalRequests;
                    const retryRate = totalRequests === 0 ? 0 : totalRetries / totalRequests;

                    if (retryRate >= 0.25 && concurrency > opts.minConcurrency) {
                        concurrency = Math.max(opts.minConcurrency, concurrency - 1);
                    } else if (retryRate <= 0.05 && concurrency < opts.maxConcurrency) {
                        concurrency = Math.min(opts.maxConcurrency, concurrency + 1);
                    }
                }

                return results;
            };

            const reportProgress = (() => {
                let lastAt = 0;
                let lastKey = '';
                let lastCurrent = 0;
                const minIntervalMs = 250;

                return (key, message, progress, force = false) => {
                    if (!window.qaseTrackChunks || !window.qaseProgressCallback) return;
                    const now = Date.now();

                    const current = progress?.current ?? 0;
                    const total = progress?.total ?? 0;
                    const isComplete = total > 0 && current >= total;

                    if (!force) {
                        if (key === lastKey && current === lastCurrent && !isComplete) return;
                        if (now - lastAt < minIntervalMs && !isComplete) return;
                    }

                    lastAt = now;
                    lastKey = key;
                    lastCurrent = current;

                    window.qaseProgressCallback(message, progress);
                };
            })();

            try {
                const initial = await apiGetWithRetry(
                    buildRunsUrl({ limit: 1, offset: 0, include: jiraKeysSet.size > 0 ? 'external_issue' : 'external_issue,cases' }),
                    5
                );
                const initialResponse = initial.response;

                if (!initialResponse || !initialResponse.result) {
                    return allTestRuns;
                }

                const totalRunsAll = initialResponse.result.total;
                const totalRunsFiltered = (typeof initialResponse.result.filtered === 'number') ? initialResponse.result.filtered : null;
                const totalRuns = (typeof totalRunsFiltered === 'number') ? totalRunsFiltered : totalRunsAll;

                if (totalRuns === 0) return allTestRuns;

                const totalBatches = Math.ceil(totalRuns / limit);

                if (jiraKeysSet.size > 0) {
                    const offsetsWithHits = new Set();
                    const refetchQueue = [];
                    let scanCompleted = 0;
                    let refetchCompleted = 0;
                    let scanDone = false;

                    let scanNextOffset = 0;
                    const scanMaxOffsetExclusive = totalBatches * limit;
                    let scanStopOffset = null;

                    const wakeQueue = (() => {
                        const waiters = [];
                        const notify = () => {
                            while (waiters.length) {
                                const w = waiters.shift();
                                try { w(); } catch (_) { }
                            }
                        };
                        const wait = () => new Promise(resolve => waiters.push(resolve));
                        return { notify, wait };
                    })();

                    const enqueueRefetchOffset = (offset) => {
                        if (offsetsWithHits.has(offset)) return;
                        offsetsWithHits.add(offset);
                        refetchQueue.push(offset);
                        wakeQueue.notify();
                    };

                    const takeRefetchOffset = async () => {
                        while (refetchQueue.length === 0) {
                            if (scanDone) return null;
                            await wakeQueue.wait();
                        }
                        return refetchQueue.shift();
                    };

                    const scanConcurrency = 4;
                    const refetchConcurrency = 2;

                    const scanWorker = async () => {
                        while (true) {
                            if (scanStopOffset != null && scanNextOffset > scanStopOffset) return;
                            if (scanNextOffset >= scanMaxOffsetExclusive) return;

                            const offset = scanNextOffset;
                            scanNextOffset += limit;

                            const res = await apiGetWithRetry(buildRunsUrl({ limit, offset, include: 'external_issue' }), 5);
                            const entities = res.response?.result?.entities || [];

                            if (Array.isArray(entities) && entities.length < limit) {
                                scanStopOffset = offset;
                            }

                            let hasHit = false;
                            if (Array.isArray(entities)) {
                                for (const run of entities) {
                                    if (isRunForJiraKeys(run)) { hasHit = true; break; }
                                }
                            }
                            if (hasHit) enqueueRefetchOffset(offset);

                            scanCompleted++;
                            reportProgress(
                                'scan',
                                `Scanning test runs... (${scanCompleted}/${totalBatches})`,
                                { current: scanCompleted, total: totalBatches }
                            );
                        }
                    };

                    const refetchWorker = async () => {
                        while (true) {
                            const offset = await takeRefetchOffset();
                            if (offset == null) return;

                            const res = await apiGetWithRetry(buildRunsUrl({ limit, offset, include: 'external_issue,cases' }), 5);
                            const runs = res.response?.result?.entities;
                            if (Array.isArray(runs) && runs.length > 0) {
                                const filtered = runs.filter(run => {
                                    if (!run || !run.external_issue) return false;
                                    return isRunForJiraKeys(run);
                                });
                                allTestRuns.push(...filtered);
                            }

                            refetchCompleted++;
                            reportProgress(
                                'refetch',
                                `Fetching matching runs... (${refetchCompleted})`,
                                { current: refetchCompleted, total: Math.max(refetchCompleted, offsetsWithHits.size) }
                            );
                        }
                    };

                    const scanWorkers = Array.from({ length: scanConcurrency }, () => scanWorker());
                    const refetchWorkers = Array.from({ length: refetchConcurrency }, () => refetchWorker());

                    await Promise.all(scanWorkers);
                    scanDone = true;
                    wakeQueue.notify();
                    await Promise.all(refetchWorkers);

                    return allTestRuns;
                }

                const offsets = Array.from({ length: totalBatches }, (_, i) => i * limit);
                let allCompleted = 0;

                const results = await mapAdaptiveConcurrency(
                    offsets,
                    { initialConcurrency: 6, minConcurrency: 2, maxConcurrency: 6, batchSize: 25 },
                    async (offset) => {
                        const res = await apiGetWithRetry(buildRunsUrl({ limit, offset, include: 'external_issue,cases' }), 5);

                        allCompleted++;
                        reportProgress(
                            'all',
                            `Fetching test runs... (${allCompleted}/${offsets.length})`,
                            { current: allCompleted, total: offsets.length }
                        );
                        return { response: res.response, attempts: res.attempts };
                    }
                );

                for (const r of results) {
                    const response = r?.response;
                    if (!response || !response.result || !response.result.entities) continue;

                    const runs = response.result.entities;
                    if (!Array.isArray(runs) || runs.length === 0) continue;

                    const filteredRuns = runs.filter(run => !!run.external_issue);
                    allTestRuns.push(...filteredRuns);
                }

                return allTestRuns;

            } catch (error) {
                console.error('Error fetching test runs:', error);
                return allTestRuns;
            }
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

        normalizeQaseCaseIds: function (caseIds) {
            if (!Array.isArray(caseIds)) return [];
            return [...new Set(
                caseIds
                    .map(id => parseInt(id, 10))
                    .filter(id => Number.isFinite(id) && id > 0)
            )];
        },

        fetchQaseCaseIdsForTestPlans: async function (projectCode, planIds) {
            const ids = Array.isArray(planIds) ? planIds : [];
            const validPlanIds = [...new Set(ids.map(id => parseInt(id, 10)).filter(id => Number.isFinite(id) && id > 0))];
            if (validPlanIds.length === 0) return [];

            const planDetails = await Promise.all(
                validPlanIds.map(planId => AviatorShared.qase.fetchQaseTestPlanDetails(projectCode, planId))
            );
            const caseIds = planDetails.flatMap(plan => plan?.caseIds || []);
            return AviatorShared.qase.normalizeQaseCaseIds(caseIds);
        },

        mergeQaseCaseIds: function (caseIdsA, caseIdsB) {
            return AviatorShared.qase.normalizeQaseCaseIds([...(caseIdsA || []), ...(caseIdsB || [])]);
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

        createQaseTestRun: async function ({ projectCode, token, title, caseIds, environmentId, milestoneId, configurations } = {}) {
            const _projectCode = projectCode || AviatorShared.configuration.getQaseProjectCode();
            const _token = token || AviatorShared.configuration.getQaseApiToken();

            const _title = String(title ?? '').trim();
            const _caseIds = Array.isArray(caseIds) ? caseIds : [];
            const validCaseIds = [...new Set(
                _caseIds
                    .map(id => parseInt(id, 10))
                    .filter(id => Number.isFinite(id) && id > 0)
            )];

            if (!_title) throw new Error('No test run title entered!');
            if (validCaseIds.length === 0) throw new Error('No valid test case IDs provided!');

            const payload = {
                title: _title,
                cases: validCaseIds
            };

            const envId = parseInt(environmentId, 10);
            if (Number.isFinite(envId) && envId > 0) payload.environment_id = envId;

            const msId = parseInt(milestoneId, 10);
            if (Number.isFinite(msId) && msId > 0) payload.milestone_id = msId;

            if (configurations && typeof configurations === 'object' && Object.keys(configurations).length > 0) {
                payload.configurations = configurations;
            }

            const data = await AviatorShared.api({
                method: 'POST',
                url: `https://api.qase.io/v1/run/${_projectCode}`,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Token': _token
                },
                data: payload
            });

            return data?.result;
        },

        associateQaseTestRunWithExternalIssue: async function (projectCode, runId, issueKey) {
            const token = AviatorShared.configuration.getQaseApiToken();

            if (!issueKey) {
                return { status: 'skipped', issueKey: null, message: 'No Jira issue key provided.' };
            }

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
                });

                return { status: 'linked', issueKey, message: `Linked to Jira issue ${issueKey}` };
            }
            catch (e) {
                console.error('Error associating Jira issue:', e);
                return { status: 'failed', issueKey, message: `Warning: Could not associate with Jira issue ${issueKey}` };
            }
        },

        associateQaseTestRunWithJira: async function (projectCode, runId) {
            let { issueKey } = AviatorShared.configuration.getJiraIssueDetails()
            if (!issueKey) {
                return { status: 'skipped', issueKey: null, message: 'No Jira issue detected in URL.' };
            }

            AviatorShared.html.showLoading('Associating test run with Jira...');

            try {
                const result = await AviatorShared.qase.associateQaseTestRunWithExternalIssue(projectCode, runId, issueKey);
                AviatorShared.html.hideLoading();
                return result;
            }
            catch (e) {
                AviatorShared.html.hideLoading();
                return { status: 'failed', issueKey, message: `Warning: Could not associate with Jira issue ${issueKey}` };
            }
        },
    },

    slack: {
        sendResultToSlack: async function (data, type) {
            const projectCode = AviatorShared.configuration.getQaseProjectCode();
            let url = 'https://hooks.slack.com/triggers/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'

            if(type.toLowerCase() == 'traciator')
                url = 'https://hooks.slack.com/triggers/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'

            const payload = {
                projectCode,
                title: data.title,
                environment: data.environment.text,
                milestone: data.milestone.text,
                teamCityQueued: data.tcBuilds.join(','),
            }

            await AviatorShared.api({
                method: 'POST',
                url: url,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                data: payload
            })

        }
    },

    teamcity: {
        countTeamCityBuilds: function (tcBuildDetails) {
            if (!tcBuildDetails || typeof tcBuildDetails !== 'object') return 0;

            let count = 0;

            const validIndividualBuilds = tcBuildDetails.flatBuilds?.filter(build => !build?.isError) || [];
            count += validIndividualBuilds.length;

            const countBuildsInProjects = (projects) => {
                let projectCount = 0;
                if (!projects || !Array.isArray(projects)) return 0;

                projects.forEach(project => {
                    if (project?.builds && Array.isArray(project.builds)) {
                        const validProjectBuilds = project.builds.filter(build => !build?.isError);
                        projectCount += validProjectBuilds.length;
                    }
                    if (project?.subProjects && Array.isArray(project.subProjects)) {
                        projectCount += countBuildsInProjects(project.subProjects);
                    }
                });

                return projectCount;
            };

            if (tcBuildDetails.projectStructure && Array.isArray(tcBuildDetails.projectStructure)) {
                count += countBuildsInProjects(tcBuildDetails.projectStructure);
            }

            return count;
        },

        getTeamCityCsrfToken: async function (token) {

            const data = await AviatorShared.api({
                method: 'GET',
                url: `https://ci.paylocity.com/authenticationTest.html?csrf`,
                headers: {
                    'Accept': 'text/plain',
                    'Authorization': `Bearer ${token}`
                },
                // Ensure the CSRF token and any session cookie (if used) stay consistent
                withCredentials: true
            })

            if (typeof data === 'string') return data.trim();
            return String(data ?? '').trim();
        },

        /** trigger selected teamcity builds */
        triggerTeamCityBuilds: async function (runId, caseIds, options = {}) {

            const getTeamCityParametersFromModal = () => {
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
            }

            const updateBuildStatus = (buildId, status, message, buildUrl = null) => {
                const statusRow = AviatorShared.shadowRoot?.querySelector(`#build-status-${buildId}`);
                if (!statusRow) return;

                const statusIcon = statusRow.querySelector('.status-icon');
                const statusMessage = statusRow.querySelector('.status-message');

                let icon, color;
                switch (status) {
                    case 'triggering':
                        icon = '<div class="qase-mini-spinner"></div>';
                        color = '#0052CC';
                        break;
                    case 'success':
                        icon = '✅';
                        color = '#4CAF50';
                        break;
                    case 'failed':
                        icon = '❌';
                        color = '#f44336';
                        break;
                    default:
                        icon = '⏳';
                        color = '#666';
                }

                statusIcon.innerHTML = icon;
                statusMessage.textContent = message;
                statusMessage.style.color = color;

                // Add build URL link if provided and status is success
                if (buildUrl && status === 'success') {
                    const buildName = statusRow.querySelector('.build-name');
                    buildName.innerHTML = `<a href="${buildUrl}" target="_blank" rel="noopener noreferrer" class="qase-link">${buildName.textContent}</a>`;
                }
            }

            const { summary = null, closeParentPopup = false, onClose = null } = options;

            const token = window.aviator?.teamcity?.token;
            const builds = AviatorShared.shadowRoot.querySelectorAll('.teamcity-build:checked');

            // Fetch CSRF token at most once per trigger invocation to keep it aligned
            // with the session cookie (avoids mismatches when multiple builds trigger in parallel).
            let csrfTokenPromise = null;
            const getCsrfTokenOnce = async () => {
                if (!csrfTokenPromise) csrfTokenPromise = AviatorShared.teamcity.getTeamCityCsrfToken(token);
                return await csrfTokenPromise;
            };

            if (builds.length === 0) {
                // No builds to trigger — still show success state if provided
                if (summary) {
                    AviatorShared.html.showStatusModal([], { summary, closeParentPopup, onClose });
                }
                return; // No builds to trigger
            }

            // Show TeamCity build status modal
            AviatorShared.html.showStatusModal(builds, { summary, closeParentPopup, onClose });

            // Trigger all builds in parallel to avoid one slow/failed build affecting others
            const buildPromises = Array.from(builds).map(async (b) => {
                const buildId = b.dataset.id;

                try {
                    // Update build status to "triggering"
                    updateBuildStatus(buildId, 'triggering', 'Triggering build...');

                    /** set to trigger a build against a runid and do not complete it */
                    let tc_properties = [
                        { name: "env.QASE_TESTOPS_RUN_ID", value: runId },
                        { name: "env.QASE_TESTOPS_RUN_COMPLETE", value: 'false' }
                    ]

                    // Get TeamCity parameters from modal inputs if they exist, otherwise use config
                    if (window.aviator?.teamcity?.parameters) {
                        const modalParameters = getTeamCityParametersFromModal();
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

                    const tryTrigger = async (opts = {}) => {
                        return await AviatorShared.api({
                            method: 'POST',
                            url: `https://ci.paylocity.com/app/rest/buildQueue`,
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                ...(opts.csrfToken ? { 'X-TC-CSRF-Token': opts.csrfToken } : {})
                            },
                            includeHttpInfo: true,
                            withCredentials: Boolean(opts.withCredentials),
                            anonymous: Boolean(opts.anonymous),
                            data: {
                                buildType: { id: buildId },
                                properties: {
                                    property: tc_properties
                                }
                            }
                        })
                    };

                    // Prefer Bearer-only POST (matches the working API spec style).
                    // If TeamCity rejects with a CSRF error, retry once with CSRF token + credentials.
                    // Prefer a stateless Bearer-only call with no TeamCity cookies (matches Playwright API usage).
                    let response = await tryTrigger({ withCredentials: false, anonymous: true });
                    const status = response?.http?.status;
                    if (status === 403) {
                        const details = (typeof response?.data === 'string')
                            ? response.data
                            : JSON.stringify(response?.data);
                        if (/CSRF|X-TC-CSRF-Token/i.test(details || '')) {
                            const csrfToken = await getCsrfTokenOnce();
                            // Retry with credentials + CSRF header (must keep cookie + token in sync).
                            response = await tryTrigger({ withCredentials: true, anonymous: false, csrfToken });
                        }
                    }

                    const finalStatus = response?.http?.status;
                    if (typeof finalStatus === 'number' && (finalStatus < 200 || finalStatus >= 300)) {
                        const details = (typeof response?.data === 'string')
                            ? response.data
                            : JSON.stringify(response?.data);
                        throw new Error(`${finalStatus} ${response?.http?.statusText || 'HTTP Error'}${details ? `: ${details}` : ''}`);
                    }

                    console.log(`[TeamCity] Build triggered: ${buildId}`, response?.data ?? response);

                    // Update build status to "success"
                    const buildUrl = `https://ci.paylocity.com/buildConfiguration/${buildId}?mode=builds`;
                    updateBuildStatus(buildId, 'success', `Build triggered successfully!`, buildUrl);

                    return { buildId, status: 'success' };

                } catch (err) {
                    console.error(`[TeamCity] Build trigger failed: ${buildId}`, err)

                    // Update build status to "failed"
                    const errorMessage = err.message || 'Unknown error occurred';
                    updateBuildStatus(buildId, 'failed', `Failed to trigger build: ${errorMessage}`);

                    return { buildId, status: 'failed', error: errorMessage };
                }
            });

            // Wait for all builds to complete
            try {
                const results = await Promise.allSettled(buildPromises);
                console.log('[TeamCity] All build triggers completed:', results);
            } catch (error) {
                console.error('[TeamCity] Error waiting for build triggers:', error);
            }
        },

        fetchTeamCityBuildDetails: async function (buildId) {
            const token = window.aviator?.teamcity?.token;
            const data = await AviatorShared.api({
                method: 'GET',
                url: `https://ci.paylocity.com/app/rest/buildTypes/id:${buildId}?fields=id,projectId,name,projectName,webUrl,description`,
                headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' }
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

            const result = { builds: [], projects: [] };

            try {
                // Get project details with build types
                const projectData = await AviatorShared.api({
                    method: 'GET',
                    url: `https://ci.paylocity.com/app/rest/projects/id:${projectId}`,
                    headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' }
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

    util: {
        singleFlight: function (key, fn) {
            if (!key) throw new Error('singleFlight requires a key');
            if (typeof fn !== 'function') throw new Error('singleFlight requires a function');

            const store = AviatorShared._inFlight || (AviatorShared._inFlight = {});
            if (store[key]) return store[key];

            store[key] = (async () => {
                try {
                    return await fn();
                } finally {
                    store[key] = null;
                    delete store[key];
                }
            })();

            return store[key];
        }
    },

    html: {

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

        createPopupSections: function (container, options = {}) {
            const {
                headerHtml = '',
                footerHtml = '',
                headerClass = 'popup-header',
                bodyClass = 'popup-body',
                footerClass = 'popup-footer'
            } = options;

            const header = document.createElement('div');
            if (headerClass) header.className = headerClass;
            if (headerHtml) header.innerHTML = headerHtml;
            container.appendChild(header);

            const body = document.createElement('div');
            if (bodyClass) body.className = bodyClass;
            container.appendChild(body);

            const footer = document.createElement('div');
            if (footerClass) footer.className = footerClass;
            if (footerHtml) footer.innerHTML = footerHtml;
            container.appendChild(footer);

            return { header, body, footer };
        },

        openModalOverlay: function (options = {}) {
            const {
                overlayId = 'qaseModalOverlay',
                background = 'transparent',
                zIndex = '999999'
            } = options;

            AviatorShared.html.createShadowRootOverlay();

            const existing = AviatorShared.shadowRoot.querySelector(`#${overlayId}`);
            if (existing) existing.remove();

            const overlay = AviatorShared.html.createOverlay({
                id: overlayId,
                background,
                zIndex
            });

            AviatorShared.shadowRoot.appendChild(overlay);
            return overlay;
        },

        openModal: function (options = {}) {
            const {
                overlayId = 'qaseModalOverlay',
                background = 'transparent',
                zIndex = '999999',
                mountHost = 'auto',
                hostMountSelector = '[role="dialog"], .jira-dialog, .css-1ynzxqw',
                closeOnOverlayClick = true,
                closeOnEscape = true,
                closeSelectors = ['#qaseCloseBtn', '#qaseCancelBtn'],
                modalBox = {},
                container = null,
                sections = {},
                useSections = true,
                onClose = null
            } = options;

            const host = AviatorShared.html.createShadowRootOverlay();

            if (mountHost === 'auto') {
                const modalContent = document.querySelector(hostMountSelector);
                if (modalContent) {
                    modalContent.appendChild(host);
                } else {
                    document.body.appendChild(host);
                }
            } else if (mountHost && mountHost !== 'body') {
                try {
                    const mountEl = typeof mountHost === 'string' ? document.querySelector(mountHost) : mountHost;
                    if (mountEl) mountEl.appendChild(host);
                } catch {
                    document.body.appendChild(host);
                }
            } else {
                document.body.appendChild(host);
            }

            const overlay = AviatorShared.html.openModalOverlay({ overlayId, background, zIndex });

            const modalContainer = container instanceof HTMLElement
                ? container
                : AviatorShared.html.createModalBox({
                    className: modalBox.className || 'qasePopup',
                    id: modalBox.id,
                    padding: modalBox.padding,
                    borderRadius: modalBox.borderRadius,
                    minWidth: modalBox.minWidth,
                    maxWidth: modalBox.maxWidth,
                    width: modalBox.width,
                    maxHeight: modalBox.maxHeight,
                    customStyles: modalBox.customStyles || {}
                });

            let header = null;
            let body = null;
            let footer = null;
            if (useSections) {
                ({ header, body, footer } = AviatorShared.html.createPopupSections(modalContainer, sections));
            }

            overlay.appendChild(modalContainer);

            let isClosed = false;
            let removeEscListener = null;

            const close = () => {
                if (isClosed) return;
                isClosed = true;

                if (removeEscListener) {
                    try { removeEscListener(); } catch { /* ignore */ }
                    removeEscListener = null;
                }

                try {
                    overlay.remove();
                } catch {
                    // ignore
                }

                const root = AviatorShared.shadowRoot;
                const remainingOverlays = root
                    ? Array.from(root.children).filter(el => el.nodeName !== 'STYLE')
                    : [];
                if (remainingOverlays.length === 0) {
                    AviatorShared.html.hidePopup();
                }

                if (typeof onClose === 'function') {
                    try { onClose(); } catch (e) { console.warn('openModal onClose error:', e); }
                }
            };

            if (closeOnOverlayClick) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) close();
                });
            }

            if (closeOnEscape) {
                const escHandler = (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        close();
                    }
                };
                document.addEventListener('keydown', escHandler, true);
                removeEscListener = () => document.removeEventListener('keydown', escHandler, true);
            }

            if (Array.isArray(closeSelectors) && closeSelectors.length) {
                closeSelectors.forEach(sel => {
                    const el = modalContainer.querySelector(sel);
                    if (el) el.addEventListener('click', close);
                });
            }

            return { host, overlay, container: modalContainer, header, body, footer, close };
        },

        getTestRunFormData: function (root = null) {
            const scope = root || AviatorShared.shadowRoot || document;

            const runTitleInput = scope.querySelector('#qaseRunTitle');
            const environment = scope.querySelector('#qaseEnv');
            const milestone = scope.querySelector('#qaseMilestone');
            const jiraKeySelect = scope.querySelector('#qaseJiraKey');

            const environmentId = environment?.value || null;
            const enviromentText = environment?.options?.[environment.selectedIndex]?.text || null;
            const milestoneId = milestone?.value || null;
            const milestoneText = milestone?.options?.[milestone.selectedIndex]?.text || null;

            const configSelections = Array.from(scope.querySelectorAll('.qaseConfig'))
                .reduce((acc, sel) => {
                    if (sel.value) acc[sel.getAttribute('data-entity-id')] = parseInt(sel.value, 10);
                    return acc;
                }, {});

            const builds = scope.querySelectorAll('.teamcity-build:checked');
            const tcBuilds = builds.length
                ? Array.from(builds).map(b => b.dataset.id)
                : [];

            const selectedTestPlanCheckboxes = scope.querySelectorAll('#qaseTestPlanOptions input[type="checkbox"]:checked');
            const selectedTestPlanIds = AviatorShared.qase.normalizeQaseCaseIds(
                Array.from(selectedTestPlanCheckboxes).map(cb => cb.value)
            );

            return {
                title: runTitleInput ? runTitleInput.value.trim() : '',
                jiraKey: jiraKeySelect ? (jiraKeySelect.value || null) : null,
                environment: { id: environmentId, text: enviromentText },
                milestone: { id: milestoneId, text: milestoneText },
                configurations: configSelections,
                tcBuilds,
                selectedTestPlanIds
            };
        },

        getSelectedCaseIdsFromCheckedItems: function (root = null) {
            const scope = root || AviatorShared.shadowRoot || document;
            const allCaseIds = [];

            const individualCases = scope.querySelectorAll('.qase-item:checked[data-type="case"]');
            individualCases.forEach(item => {
                const dataIds = item.getAttribute('data-ids');
                if (dataIds) {
                    const ids = dataIds.split(',').map(id => parseInt(id.trim(), 10));
                    allCaseIds.push(...ids);
                }
            });

            return AviatorShared.qase.normalizeQaseCaseIds(allCaseIds);
        },

        shouldClosePopup: () => AviatorShared.shadowRoot?.getElementById('keep-open')?.checked !== true,

        showStatusModal: function (builds, options = {}) {
            const { summary = null, notification = null, closeParentPopup = false, onClose = null } = options;

            const buildsArray = builds ? Array.from(builds) : [];
            const buildCount = buildsArray.length;
            const hasSummary = Boolean(summary);
            const hasNotification = Boolean(notification);

            // Ensure shadow root exists
            if (!AviatorShared.shadowRoot) {
                AviatorShared.html.createShadowRootOverlay();
            }

            // Remove any existing status modal overlay
            const existingOverlay = AviatorShared.shadowRoot.querySelector('#teamcity-build-status-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }

            // Temporarily bump host overlay background while status modal is open
            const hostOverlay = document.getElementById('qasePopupOverlay');
            const previousHostBackground = hostOverlay ? hostOverlay.style.background : null;
            if (hostOverlay) {
                hostOverlay.style.background = 'rgba(0, 0, 0, 0.7)';
            }

            // Create modal box
            const modal = document.createElement('div');
            modal.id = 'status-modal';
            modal.className = 'qasePopup';
            Object.assign(modal.style, {
                width: '90%',
                maxWidth: '800px',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            });

            // Header
            const header = document.createElement('div');
            const headerTitle = hasSummary
                ? 'Test Run'
                : hasNotification
                    ? (notification.title || ((notification.type || '').toLowerCase() === 'error' ? '❌ Error' : ((notification.type || '').toLowerCase() === 'warning' ? '⚠️ Warning' : 'ℹ️ Notice')))
                    : '🚀 TeamCity Build Status';

            header.innerHTML = `
                <div class="qase-row-between qase-mb-12">
                    <h2 id="status-modal-title" class="qase-mt-0">${headerTitle}</h2>
                    <button id="close-build-status-modal" class="qase-icon-btn">&times;</button>
                </div>
            `;

            // Body container to hold success + builds
            const body = document.createElement('div');
            body.className = 'status-modal-body';

            // Success summary block (optional)
            if (hasSummary) {
                const successBlock = document.createElement('div');
                successBlock.id = 'teamcity-run-success';
                successBlock.className = 'status-block';

                const caseLine = typeof summary.caseCount === 'number'
                    ? `${summary.caseCount} case${summary.caseCount === 1 ? '' : 's'}`
                    : null;

                const metaParts = [];
                if (summary.runId) metaParts.push(`Run ID: ${summary.runId}`);
                if (caseLine) metaParts.push(caseLine);

                const metaLine = metaParts.length ? metaParts.join(' • ') : '';

                const associationClass = summary.associationStatus === 'failed' ? 'failed' : '';

                successBlock.innerHTML = `
                    <div class="status-summary-row">
                        <div class="status-summary-icon">✅</div>
                        <div class="status-summary-content">
                            <div class="status-summary-title">Created successfully</div>
                            ${summary.title ? `<div id="status-modal-summary-title" class="status-summary-run-title">${summary.title}</div>` : ''}
                            ${metaLine ? `<div id="status-modal-summary-subline" class="status-summary-subline">${metaLine}</div>` : ''}
                            ${summary.associationMessage ? `<div id="status-modal-summary-association" class="status-association ${associationClass}">${summary.associationMessage}</div>` : ''}
                        </div>
                    </div>
                `;

                body.appendChild(successBlock);
            }

            // Generic notification block (optional)
            if (hasNotification) {
                const note = notification || {};

                const notificationBlock = document.createElement('div');
                notificationBlock.id = 'status-modal-generic-notification';
                notificationBlock.className = 'status-block';

                notificationBlock.innerHTML = `
                    <div class="status-summary-row">
                        <div class="status-summary-content">
                            ${note.title ? `<div id="status-modal-title" class="status-summary-title">${note.title}</div>` : ''}
                            ${note.message ? `<div id="status-modal-message" class="status-summary-run-title">${note.message}</div>` : ''}
                            ${note.detail ? `<div id="status-modal-detail" class="status-summary-subline">${note.detail}</div>` : ''}
                        </div>
                    </div>
                `;

                body.appendChild(notificationBlock);
            }

            // Build status list (only when builds exist)
            if (buildCount > 0) {
                const listHeader = document.createElement('div');
                listHeader.className = 'status-list-header';
                listHeader.textContent = 'TeamCity builds';
                body.appendChild(listHeader);

                const statusList = document.createElement('div');
                statusList.id = 'build-status-list';
                statusList.className = 'status-list';

                // Create status rows for each build
                buildsArray.forEach(buildElement => {
                    const buildId = buildElement.dataset.id;
                    const buildName = (buildElement.parentElement.textContent || '')
                        .replace(/\s+/g, ' ')
                        .trim() || buildId;

                    const statusRow = document.createElement('div');
                    statusRow.id = `build-status-${buildId}`;
                    statusRow.className = 'status-row';

                    statusRow.innerHTML = `
                        <div class="status-icon">
                            <div class="qase-mini-spinner"></div>
                        </div>
                        <div class="status-build-meta">
                            <div class="build-name">${buildName}</div>
                            <div class="build-id">${buildId}</div>
                        </div>
                        <div class="status-message">Waiting...</div>
                    `;

                    statusList.appendChild(statusRow);
                });

                body.appendChild(statusList);
            }

            if (buildCount === 0 && !hasSummary && !hasNotification) {
                const emptyState = document.createElement('div');
                emptyState.className = 'status-empty';
                emptyState.textContent = 'No TeamCity builds selected.';
                body.appendChild(emptyState);
            }

            // Footer
            const footer = document.createElement('div');
            footer.innerHTML = `
                <div class="status-footer">
                    <button id="close-build-status-modal-2" class="btn secondary">Close</button>
                </div>
            `;

            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(footer);

            AviatorShared.html.openModal({
                overlayId: 'teamcity-build-status-overlay',
                zIndex: '1000001',
                mountHost: 'body',
                closeOnOverlayClick: false,
                closeOnEscape: false,
                closeSelectors: ['#close-build-status-modal', '#close-build-status-modal-2'],
                container: modal,
                useSections: false,
                onClose: () => {
                    // Restore host background if host still exists
                    const host = document.getElementById('qasePopupOverlay');
                    if (host) {
                        host.style.background = previousHostBackground || '';
                    }

                    if (closeParentPopup && AviatorShared.html.shouldClosePopup()) {
                        AviatorShared.html.hidePopup();
                    }
                    if (typeof onClose === 'function') {
                        onClose();
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
            const shadowExisting = AviatorShared.shadowRoot?.getElementById
                ? AviatorShared.shadowRoot.getElementById('qaseLoadingOverlay')
                : null;
            const legacyExisting = document.getElementById('qaseLoadingOverlay');
            const existingOverlay = shadowExisting || legacyExisting;

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

            // Ensure shadow host exists for consistent stacking
            AviatorShared.html.createShadowRootOverlay();

            const overlay = document.createElement('div');
            overlay.id = 'qaseLoadingOverlay';
            overlay.className = 'qase-loading-overlay';

            const box = document.createElement('div');
            box.className = 'qase-loading-box';

            const spinner = document.createElement('div');
            spinner.className = 'qase-spinner';
            box.appendChild(spinner);

            if (progress) {
                const wrap = document.createElement('div');
                wrap.className = 'qase-progress-wrap';

                const fill = document.createElement('div');
                fill.className = 'progress-bar-fill qase-progress-bar-fill';
                fill.style.width = `${(progress.current / progress.total) * 100}%`;
                wrap.appendChild(fill);
                box.appendChild(wrap);

                const progressText = document.createElement('div');
                progressText.className = 'loading-progress qase-loading-progress';
                progressText.textContent = `${progress.current}/${progress.total} (${Math.round((progress.current / progress.total) * 100)}%)`;
                box.appendChild(progressText);
            }

            const messageEl = document.createElement('div');
            messageEl.className = 'loading-message';
            messageEl.textContent = message;
            box.appendChild(messageEl);

            overlay.appendChild(box);
            // Prefer shadow root so it layers above modals consistently
            AviatorShared.shadowRoot.appendChild(overlay);

            // If a legacy body-mounted loading overlay existed, remove it
            if (legacyExisting && legacyExisting !== overlay) {
                try { legacyExisting.remove(); } catch { /* ignore */ }
            }

            // qase-spin keyframes live in shadowStyles
        },

        hideLoading: function () {
            const shadowOverlay = AviatorShared.shadowRoot?.getElementById
                ? AviatorShared.shadowRoot.getElementById('qaseLoadingOverlay')
                : null;
            const legacyOverlay = document.getElementById('qaseLoadingOverlay');
            const overlay = shadowOverlay || legacyOverlay;
            if (overlay) {
                try { overlay.remove(); } catch { /* ignore */ }
            }

            // If nothing else is open in the shadow root, remove the host
            const root = AviatorShared.shadowRoot;
            if (root) {
                const remaining = Array.from(root.children).filter(el => el.nodeName !== 'STYLE');
                if (remaining.length === 0) {
                    AviatorShared.html.hidePopup();
                }
            }
        },

        // Create test plan multi-select dropdown with functionality already set up
        createTestPlanDropdown: function (plans, options = {}) {
            const {
                buttonId = 'qaseTestPlanDropdownBtn',
                optionsId = 'qaseTestPlanOptions',
                textId = 'qaseTestPlanSelectionText',
                includeQaseItemClass = false,
                includeDataIds = false,
                closeOnSelect = true
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
                    <div class="multi-select-options" id="${optionsId}">
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

            // Ensure a deterministic initial state (avoid first-click mis-detection)
            optionsContainer.style.display = 'none';
            dropdownBtn.setAttribute('data-open', 'false');

            let repositionAbort = null;

            const updateDropdownPosition = () => {
                const rect = dropdownBtn.getBoundingClientRect();
                const maxHeight = 200;
                const margin = 8;

                optionsContainer.style.left = `${Math.max(margin, rect.left)}px`;
                optionsContainer.style.width = `${rect.width}px`;

                const wouldOverflowBottom = rect.bottom + maxHeight + margin > window.innerHeight;
                if (wouldOverflowBottom) {
                    optionsContainer.style.top = `${Math.max(margin, rect.top - maxHeight)}px`;
                } else {
                    optionsContainer.style.top = `${rect.bottom}px`;
                }
            };

            const closeDropdown = () => {
                optionsContainer.style.display = 'none';
                dropdownBtn.setAttribute('data-open', 'false');
                if (repositionAbort) {
                    repositionAbort.abort();
                    repositionAbort = null;
                }
            };

            const openDropdown = () => {
                optionsContainer.style.display = 'block';
                dropdownBtn.setAttribute('data-open', 'true');
                updateDropdownPosition();

                // Keep positioned correctly while scrolling/resizing
                repositionAbort = new AbortController();
                const signal = repositionAbort.signal;

                const scrollParent = dropdownBtn.closest('.column') || dropdownBtn.closest('.qasePopup') || window;
                try {
                    scrollParent.addEventListener('scroll', updateDropdownPosition, { passive: true, signal });
                } catch {
                    // ignore
                }
                window.addEventListener('resize', updateDropdownPosition, { passive: true, signal });
            };

            const isActuallyOpen = () => {
                const dataOpen = dropdownBtn.getAttribute('data-open') === 'true';
                const visible = optionsContainer.style.display === 'block';
                return dataOpen && visible;
            };

            // Button click: toggle open/close
            dropdownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (isActuallyOpen()) {
                    closeDropdown();
                    return;
                }

                // If state is somehow out of sync, normalize then open
                dropdownBtn.setAttribute('data-open', 'false');
                optionsContainer.style.display = 'none';
                openDropdown();
            });

            // Close dropdown when clicking outside
            const rootForOutsideClicks = dropdownBtn.getRootNode && dropdownBtn.getRootNode() ? dropdownBtn.getRootNode() : document;

            rootForOutsideClicks.addEventListener('click', (e) => {
                const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
                const clickedInside = path.includes(dropdownBtn) || path.includes(optionsContainer);
                if (!clickedInside) closeDropdown();
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
                checkbox.addEventListener('change', () => {
                    updateSelectionText();
                    if (closeOnSelect) closeDropdown();
                });
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
            const div = document.createElement('div');
            div.id = 'teamcity-builds-section';

            if (!tcBuildData || (!tcBuildData.flatBuilds?.length && !tcBuildData.projectStructure?.length)) {
                return div;
            }

            const headerRow = document.createElement('div');
            headerRow.className = 'teamcity-header-row';

            const title = document.createElement('h3');
            title.textContent = '🚀 TeamCity Builds';

            const qasesOnlyLabel = document.createElement('label');
            qasesOnlyLabel.className = 'teamcity-qases-only';
            qasesOnlyLabel.appendChild(document.createTextNode('run selected qases only'));
            const qasesOnlyCheckbox = document.createElement('input');
            qasesOnlyCheckbox.type = 'checkbox';
            qasesOnlyCheckbox.id = 'teamcity-qases-only';
            qasesOnlyCheckbox.checked = true;
            qasesOnlyLabel.appendChild(qasesOnlyCheckbox);

            headerRow.appendChild(title);
            headerRow.appendChild(qasesOnlyLabel);
            div.appendChild(headerRow);

            // Parameters
            if (window.aviator?.teamcity?.parameters && window.aviator.teamcity.parameters.length > 0) {
                const params = document.createElement('div');
                params.id = 'teamcity-parameters';
                params.className = 'teamcity-parameters qase-card qase-mb-12';

                const titleRow = document.createElement('div');
                const h4 = document.createElement('h4');
                h4.textContent = 'Build Parameters';
                const small = document.createElement('small');
                small.className = 'qase-text-muted';
                small.textContent = ' will be sent to all triggered TeamCity builds';
                titleRow.appendChild(h4);
                titleRow.appendChild(small);
                params.appendChild(titleRow);

                window.aviator.teamcity.parameters.forEach((param, index) => {
                    const row = document.createElement('div');
                    row.className = 'teamcity-param-row';

                    const label = document.createElement('label');
                    label.className = 'teamcity-param-label';
                    label.textContent = param.name;

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'teamcity-param-input';
                    input.id = `teamcity-param-${index}`;
                    input.dataset.paramName = param.name;
                    input.value = param.value;

                    label.appendChild(input);
                    row.appendChild(label);
                    params.appendChild(row);
                });

                div.appendChild(params);
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
            };

            // Build a proper tree structure from the project data
            const projectTree = new Map();
            const individualBuilds = [];

            if (tcBuildData.projectStructure) {
                function processProject(project) {
                    const pathParts = project.path.split(' > ');
                    let currentLevel = projectTree;

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

                    if (project.builds && project.builds.length > 0) {
                        const finalPart = pathParts[pathParts.length - 1];
                        const parentLevel = pathParts.length > 1
                            ? getNestedLevel(projectTree, pathParts.slice(0, -1))
                            : projectTree;
                        if (parentLevel && parentLevel.has(finalPart)) {
                            parentLevel.get(finalPart).builds.push(...project.builds);
                        }
                    }

                    if (project.subProjects && project.subProjects.length > 0) {
                        project.subProjects.forEach(subProject => processProject(subProject));
                    }
                }

                tcBuildData.projectStructure.forEach(project => processProject(project));
            }

            if (tcBuildData.flatBuilds) {
                tcBuildData.flatBuilds.forEach(build => {
                    if (build.isError !== true) individualBuilds.push(build);
                });
            }

            const createBuildLabel = (build, isError = false) => {
                const label = document.createElement('label');

                if (isError) {
                    label.textContent = `❌ ${build.id} `;
                    const sub = document.createElement('span');
                    sub.className = 'subText';
                    sub.textContent = '(Build not found or access denied)';
                    label.appendChild(sub);
                    return label;
                }

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'teamcity-build';
                cb.dataset.id = build.id;
                label.appendChild(cb);
                label.appendChild(document.createTextNode(` ${build.name} `));

                if (build.description) {
                    const desc = document.createElement('span');
                    desc.className = 'subText qase-italic';
                    desc.textContent = build.description;
                    label.appendChild(desc);
                }

                return label;
            };

            const toggleNodeCheckboxes = (nodeEl, toggleBtn) => {
                const checkboxes = nodeEl.querySelectorAll('.teamcity-build');
                const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                const newState = !allChecked;
                checkboxes.forEach(cb => cb.checked = newState);
                if (toggleBtn) toggleBtn.textContent = newState ? '☑' : '☐';
            };

            const createProjectNode = (name, node, depth = 0, icon = '📁') => {
                const hasBuilds = node.builds.length > 0;
                const hasChildren = node.children.size > 0;
                if (!hasBuilds && !hasChildren) return null;

                const projectNode = document.createElement('div');
                projectNode.className = 'project-group';
                //projectNode.style.marginLeft = `${depth * 5}px`;

                const header = document.createElement('div');
                header.className = 'project-header';
                header.id = `project-builds-${depth}`

                const arrow = document.createElement('span');
                arrow.className = 'toggle-arrow';
                arrow.textContent = '▼';

                const h4 = document.createElement('h4');
                h4.textContent = `${icon} ${name}`;

                header.appendChild(arrow);
                header.appendChild(h4);

                if (hasBuilds) {
                    const count = document.createElement('span');
                    count.className = 'subText qase-ml-8';
                    count.textContent = `(${node.builds.length} build${node.builds.length === 1 ? '' : 's'})`;
                    header.appendChild(count);
                }

                const toggleAllBtn = document.createElement('button');
                toggleAllBtn.type = 'button';
                toggleAllBtn.className = 'project-toggle-all';
                toggleAllBtn.textContent = '☐';
                header.appendChild(toggleAllBtn);

                const content = document.createElement('div');
                content.className = 'project-content project-builds';

                if (hasBuilds) {
                    node.builds.forEach(build => content.appendChild(createBuildLabel(build, false)));
                }

                if (hasChildren) {
                    for (const [childName, childNode] of node.children) {
                        const childEl = createProjectNode(childName, childNode, depth + 1, '📁');
                        if (childEl) content.appendChild(childEl);
                    }
                }

                header.addEventListener('click', () => {
                    const isHidden = content.style.display === 'none';
                    content.style.display = isHidden ? 'block' : 'none';
                    arrow.textContent = isHidden ? '▼' : '▶';
                });

                toggleAllBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleNodeCheckboxes(projectNode, toggleAllBtn);
                });

                projectNode.appendChild(header);
                projectNode.appendChild(content);
                return projectNode;
            };

            for (const [name, node] of projectTree) {
                const nodeEl = createProjectNode(name, node, 0, '📁');
                if (nodeEl) div.appendChild(nodeEl);
            }

            // Individual builds group
            if (tcBuildData.flatBuilds?.length) {
                const individualNode = {
                    builds: tcBuildData.flatBuilds.filter(b => b.isError !== true),
                    children: new Map()
                };
                const nodeEl = createProjectNode('Individual Builds', individualNode, 0, '🔧');
                if (nodeEl) {
                    nodeEl.id = 'individual-builds';
                    div.appendChild(nodeEl);

                    // Append any errors as labels at the end
                    tcBuildData.flatBuilds
                        .filter(b => b.isError === true)
                        .forEach(b => nodeEl.querySelector('.project-content')?.appendChild(createBuildLabel(b, true)));
                }
            }

            return div;
        },

    },

    validation: {
        setupRunTitleValidation: function (options = {}) {
            const {
                root = AviatorShared.shadowRoot || document,
                minLength = 5
            } = options;

            const scope = root || document;
            const runTitleInput = scope.querySelector('#qaseRunTitle');
            if (!runTitleInput) {
                return { validate: () => true, input: null, errorEl: null };
            }

            let errorEl = scope.querySelector('#qaseRunTitleError');
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.id = 'qaseRunTitleError';
                errorEl.style.color = 'red';
                errorEl.style.fontSize = '0.85rem';
                errorEl.style.marginTop = '-4px';
                errorEl.style.marginBottom = '8px';
                errorEl.style.display = 'none';
                runTitleInput.insertAdjacentElement('afterend', errorEl);
            }

            const validateRunTitle = () => {
                const value = runTitleInput.value.trim();
                if (!value) {
                    errorEl.textContent = 'Run title is required.';
                    errorEl.style.display = 'block';
                    return false;
                }
                if (value.length < minLength) {
                    errorEl.textContent = `Run title must be at least ${minLength} characters.`;
                    errorEl.style.display = 'block';
                    return false;
                }

                errorEl.style.display = 'none';
                return true;
            };

            if (!runTitleInput.dataset.runTitleValidationBound) {
                runTitleInput.addEventListener('input', validateRunTitle);
                runTitleInput.dataset.runTitleValidationBound = 'true';
            }

            return { validate: validateRunTitle, input: runTitleInput, errorEl };
        }
    },

}