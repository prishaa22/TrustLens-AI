// TrustLens AI — background service worker (Manifest V3)
//
// MV3 service workers are event-driven and don't keep state between
// wake-ups, so this file only reacts to messages/events rather than
// holding anything in memory long-term. All persistent state (scan
// results) lives in chrome.storage.local, written by content.js and
// read by popup.js.

console.log("TrustLens AI background service worker loaded");

function colorForScore(score) {
  if (score >= 70) return "#2e7d32"; // green - mostly genuine
  if (score >= 40) return "#f9a825"; // amber - mixed
  return "#d32f2f";                  // red - mostly flagged fake
}

// content.js sends this right after it finishes a scan and saves stats,
// so we know exactly which tab the score belongs to (via sender.tab).
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "TRUSTLENS_SCAN_COMPLETE") return;
  if (!sender.tab || typeof sender.tab.id !== "number") return;

  const { trustScore } = message.stats || {};
  if (typeof trustScore !== "number") return;

  const tabId = sender.tab.id;
  chrome.action.setBadgeText({ text: String(trustScore), tabId });
  chrome.action.setBadgeBackgroundColor({ color: colorForScore(trustScore), tabId });
  chrome.action.setTitle({
    title: `TrustLens AI - Trust Score ${trustScore}%`,
    tabId
  });
});

// Clear the badge whenever a tab starts loading a new page, so a score
// from the last scanned product doesn't linger on an unrelated page
// (or a fresh load of the same product before the next scan finishes).
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "loading") return;
  chrome.action.setBadgeText({ text: "", tabId });
});
