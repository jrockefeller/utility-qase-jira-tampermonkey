// ==UserScript==
// @name         Aviator
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Scrape Qase plans + cases from Jira page and build test runs
// @match        https://paylocity.atlassian.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.qase.io
// @connect      ci.paylocity.com
// @connect      raw.githubusercontent.com
// @connect      hooks.slack.com
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
                '<YOUR TEAMCITY BUILD ID(s) - IF YOU HAVE NONE TO INTEGRATE THEN DELETE THIS PROPERTY>'
            ],
            projects: [
               '<TEAMCITY PROJECT ID(s) - IF YOU HAVE NONE TO INTEGRATE THEN DELETE THIS PROPERTY>'
            ]
        }
        */
    };

    /* 
    // If you need to handle multiple jira projects that associated to different qase projects. Then update the if statements inside of the match block.
    // Otherwise can ignore or delete this block
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
    const url = "https://raw.githubusercontent.com/jrockefeller/utility-qase-jira-tampermonkey/main/aviator.js";

    // Optional integrity pin. Set window.aviator.coreIntegrity to the expected
    // SHA-256 (hex) of aviator.js to refuse running anything that doesn't match.
    // Leave unset to always run the latest published core.
    const expectedSha256 = (window.aviator && window.aviator.coreIntegrity)
        ? String(window.aviator.coreIntegrity).trim().toLowerCase()
        : null;

    // Sanity check: the fetched body must look like the Aviator core, not a
    // GitHub error/HTML page or a truncated response. Prevents caching/executing
    // garbage that would otherwise poison the cache for 24h.
    const looksLikeAviatorCore = (code) =>
        typeof code === "string"
        && code.length > 1000
        && code.includes("AviatorShared")
        && code.includes("addAviatorTools");

    const sha256Hex = async (text) => {
        const bytes = new TextEncoder().encode(text);
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
    };

    let latestCode = null;
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

        if (res.status !== 200 || !res.responseText) {
            throw new Error("Bad status " + res.status);
        }

        const fetched = res.responseText;

        if (!looksLikeAviatorCore(fetched)) {
            throw new Error("Fetched core failed structural validation");
        }

        if (expectedSha256) {
            const actual = await sha256Hex(fetched);
            if (actual !== expectedSha256) {
                throw new Error("Core integrity mismatch (expected " + expectedSha256 + ", got " + actual + ")");
            }
        }

        latestCode = fetched;
        // Only cache content that passed validation (and the integrity pin, if set).
        localStorage.setItem(STORAGE_KEY, latestCode);
        localStorage.setItem(STORAGE_TIME_KEY, Date.now().toString());
        console.log("✅ Aviator core updated from GitHub:", url);
    } catch (e) {
        console.warn("⚠️ Could not fetch/validate Aviator core, falling back to cache:", e);
    }

    // --- STEP 3: Fallback to cached version if needed ---
    if (!latestCode) {
        const cachedCode = localStorage.getItem(STORAGE_KEY);
        const cachedTime = localStorage.getItem(STORAGE_TIME_KEY);
        if (cachedCode && looksLikeAviatorCore(cachedCode)) {
            // If an integrity pin is set, the cached copy must satisfy it too.
            if (expectedSha256 && (await sha256Hex(cachedCode)) !== expectedSha256) {
                console.error("❌ Cached Aviator core fails the integrity pin; refusing to run.");
                return;
            }
            latestCode = cachedCode;
            console.log("📦 Loaded Aviator core from cache (age: " +
                ((Date.now() - cachedTime) / 1000 / 60).toFixed(1) + " min)");
        } else {
            console.error("❌ No valid Aviator core available (network + cache failed).");
            return;
        }
    }

    // --- STEP 4: Run Aviator core in page context ---
    try {
        eval(latestCode);
        console.log("✅ Aviator core executed in Tampermonkey sandbox");
    } catch (e) {
        console.error("❌ Failed to execute Aviator core:", e);
    }
})();