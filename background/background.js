// Background service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "activatePicker") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startPicking" });
      }
    });
  } else if (request.action === "downloadAsset") {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: false
    });
  }
});
