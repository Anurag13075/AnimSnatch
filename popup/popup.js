document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settings-btn');
  const backBtn = document.getElementById('back-btn');
  const settingsView = document.getElementById('settings-view');
  
  // Settings Inputs
  const settingHtml = document.getElementById('setting-html');
  const settingJsx = document.getElementById('setting-jsx');
  
  // History
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history');

  // Load Settings & History
  chrome.storage.local.get(['includeHtml', 'formatJsx', 'history'], (result) => {
    if (result.includeHtml !== undefined) settingHtml.checked = result.includeHtml;
    if (result.formatJsx !== undefined) settingJsx.checked = result.formatJsx;
    
    if (result.history && result.history.length > 0) {
      renderHistory(result.history);
    }
  });

  // Save Settings on change
  settingHtml.addEventListener('change', (e) => {
    chrome.storage.local.set({ includeHtml: e.target.checked });
  });
  
  settingJsx.addEventListener('change', (e) => {
    chrome.storage.local.set({ formatJsx: e.target.checked });
  });

  // Navigation
  settingsBtn.addEventListener('click', () => {
    settingsView.classList.add('active');
  });

  backBtn.addEventListener('click', () => {
    settingsView.classList.remove('active');
  });

  // Main Action (Modes)
  const modeCards = document.querySelectorAll('.mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.getAttribute('data-mode');
      
      // Visual feedback
      card.style.borderColor = '#10b981';
      const originalTitle = card.querySelector('.mode-title').textContent;
      card.querySelector('.mode-title').textContent = 'Ready...';
      
      const config = {
        includeHtml: settingHtml.checked,
        formatJsx: settingJsx.checked,
        mode: mode
      };
      
      chrome.storage.local.set({ currentConfig: config }, () => {
        chrome.runtime.sendMessage({ action: 'activatePicker' });
        setTimeout(() => window.close(), 400);
      });
    });
  });

  // History Actions
  clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.set({ history: [] }, () => {
      historyList.innerHTML = '<div class="empty-state">No recent captures</div>';
    });
  });

  function renderHistory(historyArray) {
    historyList.innerHTML = '';
    const recent = historyArray.slice(0, 3);
    
    recent.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'history-item';
      
      const d = new Date(item.timestamp);
      const timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      el.innerHTML = `
        <div class="history-item-info">
          <span class="history-tag">&lt;${item.tag}&gt;</span>
          <span class="history-time">${timeStr}</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f566b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      `;
      
      el.addEventListener('click', () => {
        // If it's a data URI (image asset), we can't easily write to clipboard without parsing, 
        // but for now, history is mostly code.
        navigator.clipboard.writeText(item.code).then(() => {
          const iconContainer = el.querySelector('.copy-icon');
          iconContainer.outerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          
          setTimeout(() => {
            el.querySelector('.copy-icon').outerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f566b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
          }, 2000);
        });
      });
      
      historyList.appendChild(el);
    });
  }
});
