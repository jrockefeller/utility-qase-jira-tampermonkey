// ==UserScript==
// @name         Aviator
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Scrape Qase plans + cases from Jira page and build test runs
// @match        https://paylocity.atlassian.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.qase.io
// @connect      ci.paylocity.com
// @connect      raw.githubusercontent.com
// @connect      hooks.slack.com
// @updateURL    https://raw.githubusercontent.com/jrockefeller/utility-qase-jira-tampermonkey/main/aviator.js
// @downloadURL  https://raw.githubusercontent.com/jrockefeller/utility-qase-jira-tampermonkey/main/aviator.js
// ==/UserScript==

(async () => {
    // --- User local config ---
    window.aviator = {
        qase: {
            token: '<your qase token>',
            projectCode: '<qase project>',
            title: '{issueKey}: {issueTitle}',
            options: {
                environment: true,
                milestone: false,
                configurations: false
            }
        },
        /*
        teamcity: {
            token: '<REPLACE WITH YOUR OWN TEAMCITY TOKEN>',
            builds: [
                '<YOUR TEAMCITY BUILDS - IF YOU HAVE NONE TO INTEGRATE THEN IGNORE THIS SECTION>'
            ]
        }
        */
    };

    /* 
    // If you need to handle multiple jira projects that associated to different qase projects. Then update the if statements inside of the match block.
    const _url = window.location.href;
    const match = _url.match(/paylocity\.atlassian\.net\/(?:browse\/([A-Z0-9]+)-|jira\/software\/c\/projects\/([A-Z0-9]+)\/)/);

    if (match) {
        const jiraProject = match[1] || match[2];
        if (jiraProject == 'CM') {
            window.aviator.qase.projectCode = 'CM';
        }
        else if (jiraProject == 'PE') {
            window.aviator.qase.projectCode = 'DEMOS';
        }
    }
    */


    // ----------------------------------------------------
    // DO NOT UPDATE BELOW THIS LINE
    // ----------------------------------------------------
    // --- STEP 2: Try to fetch latest core from GitHub ---
    const STORAGE_KEY = "aviator.cachedCode";
    const STORAGE_TIME_KEY = "aviator.cachedTime";
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
    const url = "https://raw.githubusercontent.com/jrockefeller/utility-qase-jira-tampermonkey/main/aviator.js";
    let latestCode = null;
    let useCache = false;
    try {
        const res = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url,
                nocache: true,
                onload: response => resolve(response),
                onerror: err => reject(err)
            });
        });
        if (res.status === 200 && res.responseText) {
            latestCode = res.responseText;
            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, latestCode);
            localStorage.setItem(STORAGE_TIME_KEY, Date.now().toString());
            console.log(":white_check_mark: Aviator core updated from GitHub:", url);
        } else {
            throw new Error("Bad status " + res.status);
        }
    } catch (e) {
        console.warn(":warning: Could not fetch Aviator core, falling back to cache:", e);
        useCache = true;
    }
    // --- STEP 3: Fallback to cached version if needed ---
    if (!latestCode) {
        const cachedCode = localStorage.getItem(STORAGE_KEY);
        const cachedTime = localStorage.getItem(STORAGE_TIME_KEY);
        if (cachedCode) {
            latestCode = cachedCode;
            console.log(":package: Loaded Aviator core from cache (age: " +
                ((Date.now() - cachedTime) / 1000 / 60).toFixed(1) + " min)");
        } else {
            console.error(":x: No Aviator core available (network + cache failed).");
            return;
        }
    }
    // --- STEP 4: Run Aviator core in page context ---
    try {
        eval(latestCode);
        console.log(":white_check_mark: Aviator core executed in Tampermonkey sandbox");
    } catch (e) {
        console.error(":x: Failed to execute Aviator core:", e);
    }
})();