document.addEventListener("DOMContentLoaded", () => {

    const emptyState = document.getElementById("emptyState");
    const statsView = document.getElementById("statsView");
    const staleNotice = document.getElementById("staleNotice");
    const emptySub = document.querySelector(".empty-sub");
    const defaultEmptySub = emptySub ? emptySub.textContent : "";

    function showEmpty(message) {
        if (message && emptySub) {
            emptySub.textContent = message;
        }
        emptyState.classList.remove("hidden");
        statsView.classList.add("hidden");
    }

    const SUPPORTED_SITE_PATTERN = /^https?:\/\/([^/]+\.)?(amazon\.(com|in)|flipkart\.com)\//i;

    chrome.storage.local.get("trustlensStats", (data) => {

        const stats = data.trustlensStats;

        if (!stats || !stats.totalReviews) {
            // No scan has run yet in this browser session.
            showEmpty(defaultEmptySub);
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            const onSupportedSite = !!(activeTab && activeTab.url && SUPPORTED_SITE_PATTERN.test(activeTab.url));

            if (!onSupportedSite) {
                // Cached stats exist, but we're not even on Amazon/Flipkart
                // right now (new tab, an unrelated site, etc.) — showing
                // old results here would be misleading, so just show the
                // normal empty state instead of a "stale" warning.
                showEmpty(defaultEmptySub);
                return;
            }

            renderStats(stats, activeTab);
        });
    });

    function renderStats(stats, activeTab) {
        document.getElementById("trustScoreValue").textContent = stats.trustScore;
        document.getElementById("genuineCount").textContent = stats.genuineCount;
        document.getElementById("fakeCount").textContent = stats.fakeCount;
        document.getElementById("totalLabel").textContent =
            `${stats.totalReviews} review${stats.totalReviews === 1 ? "" : "s"} analyzed` +
            (stats.pagesScanned > 1 ? ` across ${stats.pagesScanned} pages` : "");

        // Animate the trust ring to the score, colored to match the same
        // risk convention as the main dashboard (green/amber/red).
        const ringFill = document.getElementById("trustRingFill");
        const circumference = 326.7; // 2 * PI * r(52), matches the SVG stroke-dasharray
        const score = Math.max(0, Math.min(100, stats.trustScore));
        const offset = circumference - (score / 100) * circumference;

        let ringColor = "var(--color-danger)";
        if (score >= 70) {
            ringColor = "var(--color-success)";
        } else if (score >= 40) {
            ringColor = "var(--color-warning)";
        }
        ringFill.style.stroke = ringColor;

        // Reset to full offset first so the fill animates in on every popup open
        ringFill.style.transition = "none";
        ringFill.style.strokeDashoffset = circumference;
        // Force reflow so the browser registers the reset before animating
        void ringFill.getBoundingClientRect();
        ringFill.style.transition = "";
        requestAnimationFrame(() => {
            ringFill.style.strokeDashoffset = offset;
        });

        const coverageNotice = document.getElementById("coverageNotice");
        if (stats.totalAvailableReviews && stats.totalAvailableReviews > stats.totalReviews) {
            coverageNotice.textContent =
                `Based on ${stats.totalReviews} of ${stats.totalAvailableReviews} total reviews (current page only).`;
            coverageNotice.classList.remove("hidden");
        } else {
            coverageNotice.classList.add("hidden");
        }

        emptyState.classList.add("hidden");
        statsView.classList.remove("hidden");

        // We're confirmed to be on a supported site here — the stale
        // notice now only distinguishes "this product" vs "a different
        // product page on the same site", not "wrong site entirely".
        if (activeTab.url !== stats.pageUrl) {
            staleNotice.classList.remove("hidden");
        } else {
            staleNotice.classList.add("hidden");
        }
    }
});