// Background service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "activatePicker") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        // Try to send the message
        chrome.tabs.sendMessage(tabs[0].id, { action: "startPicking" }).catch(err => {
          console.warn("Content script not found. Attempting to inject...", err);
          
          // If the page is restricted (like chrome://), we can't inject.
          if (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('edge://') || tabs[0].url.startsWith('about:')) {
            console.error("Cannot run AnimSnatch on internal browser pages.");
            return;
          }

          // Try to inject the CSS and JS programmatically
          chrome.scripting.insertCSS({
            target: { tabId: tabs[0].id },
            files: ["content/content.css"]
          }).then(() => {
            return chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ["content/content.js"]
            });
          }).then(() => {
            // Once injected, send the message again
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, { action: "startPicking" }).catch(e => console.error("Failed to start picker after injection", e));
            }, 100);
          }).catch(injectionErr => {
            console.error("Failed to inject content scripts:", injectionErr);
          });
        });
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
