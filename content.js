const ytAdBlocker = {
  init() {
    this.setupMutationObserver();
    this.interceptNetworkRequests();
    this.removeExistingAds();
    this.addCustomStyles();
  },

  setupMutationObserver() {
    const observer = new MutationObserver(() => this.removeExistingAds());
    observer.observe(document.body, { childList: true, subtree: true });
  },

  interceptNetworkRequests() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [resource, config] = args;
      if (this.isAdResource(resource)) {
        return new Response('', { status: 200, statusText: 'OK' });
      }
      return await originalFetch(...args);
    };

    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(...args) {
      const [method, url] = args;
      if (ytAdBlocker.isAdResource(url)) {
        args[1] = 'about:blank';
      }
      return originalXHR.apply(this, args);
    };
  },

  isAdResource(url) {
    const adDomains = ['doubleclick.net', 'googlesyndication.com', 'google-analytics.com', 'googleadservices.com', 'youtube.com/ptracking', 'youtube.com/pagead', 'youtube.com/api/stats/ads'];
    return adDomains.some(domain => url.includes(domain));
  },

  removeExistingAds() {
    this.removeVideoAds();
    this.removeHomePageAds();
    this.removeSidebarAds();
    this.removeCommentAds();
  },

  removeVideoAds() {
    const adOverlays = document.querySelectorAll('.ytp-ad-overlay-container, .ytp-ad-overlay-slot');
    adOverlays.forEach(overlay => overlay.remove());

    const skipButton = document.querySelector('.ytp-ad-skip-button');
    if (skipButton) skipButton.click();

    const video = document.querySelector('video');
    if (video && document.querySelector('.ad-showing')) {
      video.currentTime = video.duration || 0;
    }
  },

  removeHomePageAds() {
    const adElements = document.querySelectorAll('ytd-promoted-video-renderer, ytd-compact-promoted-video-renderer, ytd-display-ad-renderer, ytd-ad-slot-renderer');
    adElements.forEach(ad => ad.remove());
  },

  removeSidebarAds() {
    const sidebarAds = document.querySelectorAll('ytd-compact-promoted-video-renderer, ytd-promoted-sparkles-web-renderer');
    sidebarAds.forEach(ad => ad.remove());
  },

  removeCommentAds() {
    const commentAds = document.querySelectorAll('ytd-promoted-comment-renderer');
    commentAds.forEach(ad => ad.remove());
  },

  addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
      ytd-promoted-video-renderer, ytd-compact-promoted-video-renderer, ytd-display-ad-renderer, ytd-ad-slot-renderer,
      ytd-compact-promoted-video-renderer, ytd-promoted-sparkles-web-renderer, ytd-promoted-comment-renderer {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }
};

ytAdBlocker.init();

// 監聽頁面變化
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    ytAdBlocker.removeExistingAds();
  }
}).observe(document, {subtree: true, childList: true});

// 監聽來自背景腳本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkForAds") {
    ytAdBlocker.removeExistingAds();
  }
});
