(() => {
  'use strict';
  const descriptors = [
    { element: document.getElementById('line-qr-modal'), shown: element => element.classList.contains('lq-open'), close: 'lq-close-btn' },
    { element: document.getElementById('lp-modal'), shown: element => element.style.display === 'flex', close: 'lp-modal-close' }
  ].filter(item => item.element);
  let active = null;
  let returnFocus = null;
  let background = [];
  const focusable = element => [...element.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter(node => !node.closest('[hidden],[inert]') && node.getClientRects().length);
  function focusInside() {
    if (!active) return;
    const target = focusable(active.element)[0] || active.element;
    target.focus({ preventScroll: true });
  }
  function synchronize() {
    const next = descriptors.slice().reverse().find(item => item.shown(item.element)) || null;
    if (next !== active) {
      const previous = active;
      active = null;
      for (const [element, wasInert] of background) element.inert = wasInert;
      background = [];
      if (previous) {
        const target = returnFocus?.isConnected && returnFocus !== document.body && !returnFocus.closest('[inert]')
          ? returnFocus : document.getElementById('main-content');
        target?.focus({ preventScroll: true });
      }
      returnFocus = null;
      if (next) {
        returnFocus = document.activeElement;
        active = next;
        next.element.setAttribute('aria-hidden', 'false');
        background = [...document.body.children]
          .filter(element => element !== next.element && !['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName))
          .map(element => [element, element.inert]);
        for (const [element] of background) element.inert = true;
        focusInside();
      }
    }
    for (const item of descriptors) item.element.setAttribute('aria-hidden', String(item !== active));
  }
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.getElementById(active.close)?.click();
      synchronize();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = focusable(active.element);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); active.element.focus(); return; }
    const current = document.activeElement;
    if (event.shiftKey && (current === first || !active.element.contains(current))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (current === last || !active.element.contains(current))) {
      event.preventDefault(); first.focus();
    }
  }, true);
  document.addEventListener('focusin', event => {
    if (active && !active.element.contains(event.target)) focusInside();
  });
  const observer = new MutationObserver(synchronize);
  for (const item of descriptors) observer.observe(item.element, { attributes: true, attributeFilter: ['class', 'style'] });
  synchronize();
})();
