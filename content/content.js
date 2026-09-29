// ==========================================================================
// AnimSnatch Content Script - Multi-Mode Extraction
// ==========================================================================

let isPicking = false;
let hoveredElement = null;
let tooltipElement = null;
let currentConfig = { includeHtml: true, formatJsx: false, mode: 'animation' };

function initToasts() {
  if (!document.getElementById('animsnatch-toast-container')) {
    const container = document.createElement('div');
    container.id = 'animsnatch-toast-container';
    document.body.appendChild(container);
  }
}

function showToast(type, title, message, duration = 4000) {
  initToasts();
  const container = document.getElementById('animsnatch-toast-container');
  
  const toast = document.createElement('div');
  toast.className = 'animsnatch-toast';
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
  } else if (type === 'info') {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  } else {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  }

  toast.innerHTML = `
    <div class="animsnatch-toast-icon ${type}">
      ${iconSvg}
    </div>
    <div class="animsnatch-toast-content">
      <h4 class="animsnatch-toast-title">${title}</h4>
      <p class="animsnatch-toast-message">${message}</p>
    </div>
  `;

  container.appendChild(toast);
  void toast.offsetWidth;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }, duration);
}

function initTooltip() {
  if (!document.getElementById('animsnatch-cursor-tooltip')) {
    tooltipElement = document.createElement('div');
    tooltipElement.id = 'animsnatch-cursor-tooltip';
    document.body.appendChild(tooltipElement);
  } else {
    tooltipElement = document.getElementById('animsnatch-cursor-tooltip');
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startPicking") {
    chrome.storage.local.get(['currentConfig'], (res) => {
      if (res.currentConfig) {
        currentConfig = res.currentConfig;
      }
      startPicking();
    });
  }
});

function startPicking() {
  if (isPicking) return;
  isPicking = true;
  
  initTooltip();
  
  let modeName = 'Animation';
  if (currentConfig.mode === 'component') modeName = 'Component';
  if (currentConfig.mode === 'asset') modeName = 'Asset';
  
  tooltipElement.textContent = `Extract ${modeName}`;
  tooltipElement.style.display = 'block';
  
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleElementClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
}

function stopPicking() {
  isPicking = false;
  if (hoveredElement) {
    hoveredElement.classList.remove('animsnatch-highlighted');
    hoveredElement = null;
  }
  if (tooltipElement) {
    tooltipElement.style.display = 'none';
  }
  
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleElementClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
}

function handleKeyDown(e) {
  if (e.key === 'Escape') stopPicking();
}

function handleMouseMove(e) {
  if (!isPicking) return;
  
  if (tooltipElement) {
    tooltipElement.style.left = (e.clientX + 15) + 'px';
    tooltipElement.style.top = (e.clientY + 15) + 'px';
  }

  const target = document.elementFromPoint(e.clientX, e.clientY);
  
  if (target && target.closest('#animsnatch-toast-container') || target === tooltipElement) {
    return;
  }

  if (target && target !== hoveredElement) {
    if (hoveredElement) hoveredElement.classList.remove('animsnatch-highlighted');
    hoveredElement = target;
    hoveredElement.classList.add('animsnatch-highlighted');
  }
}

function handleElementClick(e) {
  if (!isPicking) return;
  
  e.preventDefault();
  e.stopPropagation();

  const target = hoveredElement || e.target;
  
  if (!target) {
    stopPicking();
    return;
  }

  if (currentConfig.mode === 'animation') {
    extractAnimation(target);
  } else if (currentConfig.mode === 'component') {
    extractComponent(target);
  } else if (currentConfig.mode === 'asset') {
    extractAsset(target);
  } else if (currentConfig.mode === 'codepen') {
    extractCodePen(target);
  }
  
  stopPicking();
}

// ---------------------------------------------------------
// Mode 1: Animation (Original functionality)
// ---------------------------------------------------------
function extractAnimation(el) {
  const computedStyle = window.getComputedStyle(el);
  const animationName = computedStyle.animationName;
  const hasAnimation = animationName && animationName !== 'none';
  const transitionProperty = computedStyle.transitionProperty;
  const hasTransition = transitionProperty && transitionProperty !== 'all' && transitionProperty !== 'none';

  if (!hasAnimation && !hasTransition) {
    showToast('error', 'No Animation Found', 'This element doesn\'t use CSS animations.');
    return;
  }

  let cssOutput = `/* Extracted by AnimSnatch */\n\n.snatched-element {\n`;
  let keyframesOutput = '';

  const layoutProps = ['display', 'width', 'height', 'padding', 'margin', 'background', 'border-radius'];
  layoutProps.forEach(prop => {
    const val = computedStyle.getPropertyValue(prop);
    if (val && val !== 'none' && val !== 'rgba(0, 0, 0, 0)' && val !== '0px' && val !== '') {
      cssOutput += `  ${prop}: ${val};\n`;
    }
  });

  if (hasTransition) {
    cssOutput += `  transition: ${computedStyle.transition};\n`;
  }

  if (hasAnimation) {
    cssOutput += `  animation: ${computedStyle.animation};\n`;
    const names = animationName.split(',').map(n => n.trim());
    names.forEach(name => {
      const kf = findKeyframes(name);
      if (kf) keyframesOutput += `\n${kf}\n`;
    });
  }

  cssOutput += `}\n`;
  const finalCode = cssOutput + keyframesOutput;
  let fullOutput = finalCode;

  if (currentConfig.includeHtml) {
    const htmlTag = el.tagName.toLowerCase();
    const classAttr = currentConfig.formatJsx ? 'className' : 'class';
    const htmlOutput = `<!-- HTML -->\n<${htmlTag} ${classAttr}="snatched-element">\n  ${el.textContent.trim().substring(0, 50)}\n</${htmlTag}>`;
    fullOutput = `${htmlOutput}\n\n${finalCode}`;
  }

  navigator.clipboard.writeText(fullOutput).then(() => {
    showToast('success', 'Animation Snatched', 'CSS keyframes copied to clipboard.');
    saveToHistory(el.tagName.toLowerCase(), fullOutput);
  }).catch(() => showToast('error', 'Copy Failed', 'Please try again.'));
}

// ---------------------------------------------------------
// Mode 2: Component (Extract HTML + Matched CSS)
// ---------------------------------------------------------
function extractComponent(el) {
  // Deep clone the node to manipulate it
  const clone = el.cloneNode(true);
  
  // Format HTML
  let html = clone.outerHTML;
  if (currentConfig.formatJsx) {
    html = html.replace(/class=/g, 'className=');
    html = html.replace(/for=/g, 'htmlFor=');
  }

  // Find all classes used in the subtree
  const classes = new Set();
  const allElements = el.querySelectorAll('*');
  if (el.className && typeof el.className === 'string') {
    el.className.split(' ').forEach(c => c && classes.add(c.trim()));
  }
  allElements.forEach(child => {
    if (child.className && typeof child.className === 'string') {
      child.className.split(' ').forEach(c => c && classes.add(c.trim()));
    }
  });

  let cssOutput = `/* Extracted Component CSS */\n\n`;
  let foundRules = 0;

  // Search stylesheets for rules matching our classes
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        if (rule.type === CSSRule.STYLE_RULE) {
          // Check if the selector contains any of our classes
          let matches = false;
          classes.forEach(c => {
            if (rule.selectorText && rule.selectorText.includes('.' + c)) {
              matches = true;
            }
          });
          if (matches) {
            cssOutput += rule.cssText + '\n\n';
            foundRules++;
          }
        }
      }
    } catch (e) {
      // CORS blocked reading this stylesheet
    }
  }

  let finalOutput = `<!-- Extracted Component -->\n${html}`;
  if (foundRules > 0 && !currentConfig.formatJsx) {
    finalOutput += `\n\n${cssOutput}`;
  } else if (foundRules === 0) {
    finalOutput += `\n\n/* Note: No custom CSS found. The site might be using Utility Classes (Tailwind) or CORS blocked stylesheet access. */`;
  }

  navigator.clipboard.writeText(finalOutput).then(() => {
    showToast('success', 'Component Snatched', 'HTML structure copied to clipboard.');
    saveToHistory(el.tagName.toLowerCase(), finalOutput);
  }).catch(() => showToast('error', 'Copy Failed', 'Please try again.'));
}

// ---------------------------------------------------------
// Mode 3: Asset (SVG / Image)
// ---------------------------------------------------------
function extractAsset(el) {
  let assetUrl = null;
  let filename = 'snatched-asset';

  // 1. Check for SVG (either the element itself or inside it)
  const svgEl = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
  if (svgEl) {
    const svgCode = svgEl.outerHTML;
    navigator.clipboard.writeText(svgCode).then(() => {
      showToast('success', 'SVG Snatched', 'SVG code copied to clipboard.');
      saveToHistory('svg', svgCode);
    });
    return;
  }

  // 2. Check for Image (either the element itself or inside it)
  const imgEl = el.tagName.toLowerCase() === 'img' ? el : el.querySelector('img');
  if (imgEl && imgEl.src) {
    assetUrl = imgEl.src;
    // Try to get original extension
    try {
      const url = new URL(assetUrl);
      const pathname = url.pathname;
      const ext = pathname.split('.').pop();
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext.toLowerCase())) {
        filename = 'snatched-image.' + ext;
      } else {
        filename = 'snatched-image.png'; // fallback
      }
    } catch(e) {
      filename = 'snatched-image.png';
    }
  } 
  // 3. Check for Background Image if no direct image was found
  else {
    const bg = window.getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') {
      const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
      if (match && match[1]) {
        assetUrl = match[1];
        filename = 'snatched-bg.png';
      }
    }
  }

  if (assetUrl) {
    chrome.runtime.sendMessage({ action: 'downloadAsset', url: assetUrl, filename: filename });
    showToast('success', 'Image Snatched', 'Downloading image...');
  } else {
    showToast('error', 'No Asset Found', 'Could not find an Image or SVG here.');
  }
}

// ---------------------------------------------------------
// Mode 4: CodePen Playground
// ---------------------------------------------------------
function extractCodePen(el) {
  showToast('info', 'Exporting to CodePen', 'Analyzing component and styles...');
  
  // Clone the node
  const clone = el.cloneNode(true);
  const html = clone.outerHTML;

  // Extract CSS
  const classes = new Set();
  const allElements = el.querySelectorAll('*');
  if (el.className && typeof el.className === 'string') {
    el.className.split(' ').forEach(c => c && classes.add(c.trim()));
  }
  allElements.forEach(child => {
    if (child.className && typeof child.className === 'string') {
      child.className.split(' ').forEach(c => c && classes.add(c.trim()));
    }
  });

  let cssOutput = `body {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n  background: #f8fafc;\n  font-family: system-ui, sans-serif;\n  padding: 2rem;\n}\n\n`;
  let foundRules = 0;

  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        if (rule.type === CSSRule.STYLE_RULE) {
          let matches = false;
          classes.forEach(c => {
            if (rule.selectorText && rule.selectorText.includes('.' + c)) matches = true;
          });
          if (matches) {
            cssOutput += rule.cssText + '\n\n';
            foundRules++;
          }
        }
      }
    } catch (e) {
      // Ignore CORS
    }
  }

  // Create form to submit to CodePen
  const data = {
    title: "AnimSnatch Export",
    description: "Snatched component from the web.",
    html: html,
    css: cssOutput,
    js: ""
  };

  const form = document.createElement('form');
  form.action = 'https://codepen.io/pen/define';
  form.method = 'POST';
  form.target = '_blank';
  form.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'data';
  input.value = JSON.stringify(data);

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  showToast('success', 'CodePen Opened', 'Your component is ready!');
  saveToHistory('CodePen Export', 'Exported to CodePen Playground.');
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
function findKeyframes(name) {
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;
      for (let j = 0; j < rules.length; j++) {
        if (rules[j].type === CSSRule.KEYFRAMES_RULE && rules[j].name === name) {
          return rules[j].cssText;
        }
      }
    } catch (e) {
      // Ignore CORS
    }
  }
  return null;
}

function saveToHistory(tag, code) {
  chrome.storage.local.get(['history'], (res) => {
    let history = res.history || [];
    history.unshift({ tag: tag, code: code, timestamp: new Date().getTime() });
    if (history.length > 10) history = history.slice(0, 10);
    chrome.storage.local.set({ history: history });
  });
}
