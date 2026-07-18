console.log("TrustLens AI Loaded");

// Safety cap: Amazon renders ~10 reviews per page. Scanning all pages of a
// 521-review product would mean 52+ sequential fetches to Amazon's own
// servers, which risks looking like scraping abuse and getting the page
// (or your IP) rate-limited/blocked, and would also mean a very slow scan
// for the user. 10 pages (~100 reviews) is a reasonable ceiling that gives
// a much more representative sample than 1 page, without either problem.
const MAX_PAGES = 10;
const BATCH_CHUNK_SIZE = 20; // reviews per /predict-batch request

function extractReviewsFromDocument(doc) {
    const cards = doc.querySelectorAll("[data-hook='review']");
    const reviews = [];

    cards.forEach(card => {
        const body = card.querySelector("[data-hook='review-body']");
        const ratingElement = card.querySelector("[data-hook='review-star-rating']");

        if (!body) return;

        let rating = 5;
        if (ratingElement) {
            const match = ratingElement.innerText.match(/\d+(\.\d+)?/);
            if (match) rating = parseFloat(match[0]);
        }

        reviews.push({
            review: body.innerText.trim(),
            rating: rating
        });
    });

    return reviews;
}

// Fetches one review page by base URL + page number, same-origin, without
// navigating the user away from the page they're currently looking at.
async function fetchReviewPage(baseUrl, pageNumber) {
    const url = new URL(baseUrl);
    url.searchParams.set("pageNumber", pageNumber);

    const res = await fetch(url.toString(), { credentials: "include" });

    console.log(
        `[TrustLens] page ${pageNumber} fetch -> status ${res.status}, ` +
        `redirected: ${res.redirected}, final url: ${res.url}`
    );

    if (!res.ok) {
        console.warn(`[TrustLens] page ${pageNumber} request failed (status ${res.status})`);
        return null;
    }

    const html = await res.text();
    console.log(`[TrustLens] page ${pageNumber} html length: ${html.length}`);

    const doc = new DOMParser().parseFromString(html, "text/html");
    const reviews = extractReviewsFromDocument(doc);
    console.log(`[TrustLens] page ${pageNumber} parsed ${reviews.length} review cards`);

    // A 200 response with 0 reviews and a much shorter body than the real
    // page usually means Amazon served a captcha/verification page instead
    // of the review list (background fetches sometimes get treated
    // differently than a real navigation). Flag it explicitly rather than
    // silently treating it as "no more pages".
    if (reviews.length === 0 && html.length < 20000) {
        console.warn(
            `[TrustLens] page ${pageNumber} returned suspiciously little HTML ` +
            `(${html.length} chars) — likely a captcha/verification page, not real content.`
        );
    }

    return reviews;
}

// On the main product page (not the dedicated reviews page), Amazon shows
// a "See more reviews" / "See all reviews" link pointing at the full
// /product-reviews/... page. We use its href as the base for background
// pagination, without ever navigating the user there.
function findAllReviewsLink() {
    const candidates = [
        "[data-hook='see-all-reviews-link-foot']",
        "a[href*='/product-reviews/']"
    ];

    for (const selector of candidates) {
        const el = document.querySelector(selector);
        if (el && el.href) return el.href;
    }

    return null;
}

function showStatusBar(text) {
    let bar = document.getElementById("trustlens-status-bar");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "trustlens-status-bar";
        bar.style.position = "fixed";
        bar.style.top = "16px";
        bar.style.right = "16px";
        bar.style.zIndex = "999999";
        bar.style.background = "#111827";
        bar.style.color = "white";
        bar.style.padding = "10px 16px";
        bar.style.borderRadius = "10px";
        bar.style.fontSize = "13px";
        bar.style.fontFamily = "Arial, sans-serif";
        bar.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
        document.body.appendChild(bar);
    }
    bar.textContent = text;
    return bar;
}

function removeStatusBar() {
    const bar = document.getElementById("trustlens-status-bar");
    if (bar) bar.remove();
}

async function sendBatch(reviews) {
    const response = await fetch("http://127.0.0.1:8000/predict-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews })
    });

    if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return data.results;
}

// A fixed delay before scanning worked on lighter/faster-loading product
// pages but is unreliable in general — heavier pages or slower connections
// may not have the review widget rendered yet at a fixed 3s mark, which
// silently produces a 0-review scan with no error. Poll for the widget
// instead, up to a generous ceiling, and only fall through to scanning
// anyway once that ceiling is hit (so we never wait forever on pages that
// genuinely have zero reviews).
function waitForReviews(maxWaitMs = 8000, intervalMs = 400) {
    return new Promise(resolve => {
        const start = Date.now();
        const check = () => {
            const found = document.querySelectorAll("[data-hook='review']").length;
            if (found > 0 || Date.now() - start >= maxWaitMs) {
                resolve(found);
                return;
            }
            setTimeout(check, intervalMs);
        };
        check();
    });
}

setTimeout(async () => {

    await waitForReviews();

    const reviewCards = document.querySelectorAll("[data-hook='review']");
    console.log("Reviews found on current page:", reviewCards.length);

    // Total rating count Amazon shows near the star summary, e.g.
    // "#acrCustomerReviewText" -> "521 global ratings". Used only to be
    // honest in the popup UI about how much of the product's reviews were
    // actually covered by this scan.
    let totalAvailableReviews = null;
    const totalReviewsEl = document.querySelector("#acrCustomerReviewText");
    if (totalReviewsEl) {
        const match = totalReviewsEl.innerText.replace(/,/g, "").match(/\d+/);
        if (match) totalAvailableReviews = parseInt(match[0], 10);
    }

    let allReviews = extractReviewsFromDocument(document);
    const seenReviewText = new Set(allReviews.map(r => r.review));

    // Amazon serves review-listing pages under more than one URL template.
    // "/product-reviews/" is the classic one; "/portal/customer-reviews/"
    // is another we've observed in the wild with no visible pagination
    // widget in the DOM but the same ~10-per-page rendering. We still
    // attempt the same ?pageNumber= pagination on it since that query
    // param is shared across several of Amazon's review templates.
    const isReviewsPage =
        window.location.pathname.includes("/product-reviews/") ||
        window.location.pathname.includes("/portal/customer-reviews/");

    // The dedicated reviews-listing page always renders a pagination
    // control (even when there's only one page of results) — unlike the
    // small review-preview widget on the main product page. Some Amazon
    // regional URL formats don't contain "/product-reviews/" in the path,
    // so this structural check catches those cases the URL check misses.
    //
    // IMPORTANT: ".a-pagination" is a generic Amazon utility class reused
    // by unrelated widgets on the SAME product page (e.g. the "customers
    // also bought" carousel, Q&A pagination). Searching for it page-wide
    // causes false positives on products that have any other paginated
    // widget, which wrongly flips looksLikeReviewsListing to true and
    // sends pagination fetches back to the product page itself (which
    // ignores ?pageNumber= and just re-serves the same reviews forever).
    // Scope it to known review-list containers only.
    const hasPaginationControl = !!document.querySelector(
        "#cr-pagination-footer, [data-hook='cr-pagination-truncation'], " +
        "#cm-cr-dp-review-list .a-pagination, #reviewsMedley .a-pagination, " +
        "[data-hook='reviews-medley-footer'] .a-pagination"
    );

    const looksLikeReviewsListing = isReviewsPage || hasPaginationControl;

    // Determine where to pull additional pages from:
    // - already on the reviews-listing page -> paginate from here
    // - on the main product page -> auto-discover the "see all reviews"
    //   link and fetch it in the background, without navigating the user
    let paginationBaseUrl = null;
    if (looksLikeReviewsListing) {
        paginationBaseUrl = window.location.href;
    } else {
        paginationBaseUrl = findAllReviewsLink();
        if (paginationBaseUrl) {
            console.log("Found reviews page link, scanning in background:", paginationBaseUrl);
        }
    }

    console.log(
        `[TrustLens] isReviewsPage(url): ${isReviewsPage}, ` +
        `hasPaginationControl: ${hasPaginationControl}, ` +
        `paginationBaseUrl: ${paginationBaseUrl}`
    );

    let pagesScanned = 1;

    if (paginationBaseUrl) {
        // Only skip re-fetching "page 1" when the URL itself confirms we're
        // on the dedicated listing page. The structural signal
        // (hasPaginationControl) alone isn't reliable enough to safely skip
        // a page — if it was a false positive, we'd silently miss page 1's
        // real content. Re-fetching page 1 when unsure is harmless: it just
        // gets deduped against what's already in seenReviewText.
        const startPage = isReviewsPage ? 2 : 1;
        let consecutiveEmpty = 0;

        for (let pageNum = startPage; pageNum <= MAX_PAGES; pageNum++) {
            showStatusBar(`TrustLens AI: scanning page ${pageNum} of up to ${MAX_PAGES}...`);
            const pageReviews = await fetchReviewPage(paginationBaseUrl, pageNum);

            // null = request failed outright (bad status). [] = request
            // succeeded but found 0 review cards (could be a real end-of-
            // pages, or a captcha page — fetchReviewPage already logs which).
            if (pageReviews === null || pageReviews.length === 0) {
                consecutiveEmpty++;
                console.warn(`[TrustLens] page ${pageNum} yielded nothing (${consecutiveEmpty} in a row)`);
                if (consecutiveEmpty >= 2) {
                    console.log("[TrustLens] stopping pagination after 2 consecutive empty pages");
                    break;
                }
                continue; // give it one more try on the next page number
            }

            const newOnes = pageReviews.filter(r => !seenReviewText.has(r.review));

            if (newOnes.length === 0) {
                // Page responded with content, but all of it was already
                // seen. Some Amazon templates (e.g. /portal/customer-reviews/)
                // ignore the pageNumber param and just re-serve the same
                // reviews on every "page" — this is how we detect that and
                // stop wasting requests instead of fetching all MAX_PAGES.
                consecutiveEmpty++;
                console.warn(
                    `[TrustLens] page ${pageNum} returned only duplicate reviews ` +
                    `(${consecutiveEmpty} in a row) — pagination may not be supported on this page template`
                );
                if (consecutiveEmpty >= 2) {
                    console.log("[TrustLens] stopping — pagination appears to repeat the same content");
                    break;
                }
                continue;
            }

            // Found genuinely new reviews — reset the streak.
            consecutiveEmpty = 0;
            newOnes.forEach(r => seenReviewText.add(r.review));

            allReviews = allReviews.concat(newOnes);
            pagesScanned++;
        }
    }

    console.log(`Total reviews collected: ${allReviews.length}`);

    try {
        showStatusBar(`TrustLens AI: analyzing ${allReviews.length} reviews...`);

        // Send in chunks so one giant request doesn't time out or overload
        // the backend, and so we don't lose everything if one chunk fails.
        let allResults = [];
        for (let i = 0; i < allReviews.length; i += BATCH_CHUNK_SIZE) {
            const chunk = allReviews.slice(i, i + BATCH_CHUNK_SIZE);
            const chunkResults = await sendBatch(chunk);
            allResults = allResults.concat(chunkResults);
        }

        console.log("All results:", allResults);

        // Badges can only be injected into review cards that actually exist
        // in the current page's DOM. allResults[0..reviewCards.length-1]
        // corresponds to those cards, since extractReviewsFromDocument(document)
        // was called first and its order is preserved.
        // Re-query the live DOM here rather than reusing the `reviewCards`
        // reference captured at the top of the script. Background
        // pagination can take several seconds across multiple pages, and
        // if Amazon's own page re-renders the reviews widget during that
        // window, the original node references go stale/detached —
        // appending badges to them would insert into nothing visible.
        const liveReviewCards = document.querySelectorAll("[data-hook='review']");
        console.log(`[TrustLens] live review cards at injection time: ${liveReviewCards.length}`);

        liveReviewCards.forEach((card, index) => {
            const result = allResults[index];
            if (!result) return;

            if (card.querySelector(".trustlens-badge")) return;

            const badge = document.createElement("div");
            badge.className = "trustlens-badge";

            const prediction = result.prediction || "Unknown";
            const confidence = Math.round(result.confidence || 0);

            const icon = prediction.includes("Fake") ? "🔴" : "🟢";
            // Confidence is the model's max class probability — for a
            // binary classifier, anything close to 50% means it's nearly
            // a coin flip, not a confident verdict. Flag it visibly rather
            // than showing it with the same solid styling as a 95%+ result.
            const isLowConfidence = confidence < 60;
            const confidenceTag = isLowConfidence ? " ⚠️ Low Confidence" : "";
            badge.innerHTML = `${icon} <strong>TrustLens AI</strong> • ${prediction} (${confidence}%)${confidenceTag}`;
            if (isLowConfidence) badge.style.opacity = "0.75";

            badge.style.display = "inline-flex";
            badge.style.alignItems = "center";
            badge.style.gap = "8px";
            badge.style.padding = "8px 14px";
            badge.style.marginBottom = "12px";
            badge.style.borderRadius = "20px";
            badge.style.fontSize = "14px";
            badge.style.fontWeight = "600";
            badge.style.color = "white";
            badge.style.width = "fit-content";
            badge.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
            badge.style.background = prediction.toLowerCase().includes("fake") ? "#d32f2f" : "#2e7d32";

            card.prepend(badge);
        });

        // --- Page-level statistics (now covering every page scanned, not
        // just the current one) ---
        const totalReviews = allResults.length;
        const fakeCount = allResults.filter(r => (r.prediction || "").includes("Fake")).length;
        const genuineCount = totalReviews - fakeCount;
        const trustScore = totalReviews > 0
            ? Math.round((genuineCount / totalReviews) * 100)
            : 0;

        const stats = {
            totalReviews,
            genuineCount,
            fakeCount,
            trustScore,
            totalAvailableReviews,
            pagesScanned,
            pageUrl: window.location.href,
            updatedAt: Date.now()
        };

        console.log("Page-level stats:", stats);

        chrome.storage.local.set({ trustlensStats: stats }, () => {
            console.log("Stats saved for popup");
        });

        // Let background.js know so it can put the trust score on the
        // toolbar badge for this specific tab.
        chrome.runtime.sendMessage({
            type: "TRUSTLENS_SCAN_COMPLETE",
            stats
        });

        showStatusBar(`TrustLens AI: done — ${totalReviews} reviews analyzed`);
        setTimeout(removeStatusBar, 4000);

    } catch (err) {
        console.error("FETCH ERROR:", err);
        showStatusBar("TrustLens AI: scan failed — is the backend running?");
        setTimeout(removeStatusBar, 5000);
    }

}, 3000);