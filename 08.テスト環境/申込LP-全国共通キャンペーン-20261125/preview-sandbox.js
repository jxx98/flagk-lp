(() => {
  'use strict';
  window.flagkTestEvents = [];
  window.dataLayer = [];
  window.gtag = (...args) => window.flagkTestEvents.push(args);
  window.previewNotify = text => {
    const show = () => {
      const toast = document.getElementById('preview-toast');
      if (!toast) return;
      toast.textContent = text;
      toast.hidden = false;
      clearTimeout(window.previewToastTimer);
      window.previewToastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
    else show();
  };
  document.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.previewNotify('確認用ページのため送信していません。入力内容は保存・送信されません。');
  }, true);
  HTMLFormElement.prototype.submit = function() {
    window.previewNotify('確認用ページのため送信していません。');
  };
  window.fetch = async resource => {
    const url = String(resource);
    if (url.includes('zipcloud.ibsnet.co.jp')) return { ok: true, json: async () => ({ results: [] }) };
    throw new Error('External requests are disabled in this preview');
  };
  XMLHttpRequest.prototype.send = function() { throw new Error('External requests are disabled in this preview'); };
  navigator.sendBeacon = () => false;
})();
