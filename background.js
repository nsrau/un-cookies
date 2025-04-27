let totalCounter = 0;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "updateCounter") {
    totalCounter += message.count;
    // Update the badge with gray background
    chrome.action.setBadgeBackgroundColor({ color: "#777777" }); // Gray color

    // Format badge text - show 99+ when over 99
    let badgeText = totalCounter > 99 ? "99+" : totalCounter.toString();
    chrome.action.setBadgeText({ text: badgeText });

    // Store the actual counter value (not the displayed value)
    chrome.storage.sync.set({ totalCounter });
  }
  if (message.action === "resetCounter") {
    totalCounter = 0;
    chrome.action.setBadgeText({ text: totalCounter.toString() });
    chrome.storage.sync.set({ totalCounter });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("totalCounter", (data) => {
    if (data.totalCounter) {
      totalCounter = data.totalCounter;
      chrome.action.setBadgeBackgroundColor({ color: "#777777" }); // Gray color

      // Format badge text - show 99+ when over 99
      let badgeText = totalCounter > 99 ? "99+" : totalCounter.toString();
      chrome.action.setBadgeText({ text: badgeText });
    }
  });
  chrome.storage.sync.get("debugMode", (data) => {
    if (data.totalCounter === undefined) {
      chrome.storage.sync.set({ debugMode: true });
    }
  });
  chrome.storage.sync.get("customHandlers", (data) => {
    if (!data.customHandlers) {
      chrome.storage.sync.set({
        customHandlers: [
          {
            rulesetName: "un_cookies_list.json",
            schema:
              "https://gist.githubusercontent.com/nsrau/c3a4430e7255223cb2e40844f4f98ca4/raw",
          },
        ],
      });
    }
  });
});
