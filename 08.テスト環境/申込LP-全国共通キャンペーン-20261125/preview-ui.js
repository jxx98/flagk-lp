(() => {
  'use strict';
  const routeForm = event => {
    event.preventDefault();
    const form = document.getElementById(matchMedia('(max-width:899px)').matches ? 'mobile-cf-form' : 'hero-cf-form');
    if (!form) return;
    const radio = form.querySelector('input[value="yes"]');
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    const panel = form.closest('.hv2-form-panel') || form;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const inner = panel.querySelector('.old-hero-form-scroll');
    if (inner) inner.scrollTop = 0;
    radio?.focus({ preventScroll: true });
  };
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (link.matches('[data-new-store-entry],[data-name-change-entry],[data-ng-form-entry]')) return;
    if (href.includes('tel-reservation') || href.includes('campaign-check')) link.addEventListener('click', routeForm);
    else if (/^(https?:|tel:|mailto:)/.test(href) || href.startsWith('/')) {
      link.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.previewNotify('確認用ページでは外部ページ・電話・LINEへの移動を停止しています。');
      }, true);
    }
  });
  const hero = document.getElementById('hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => document.body.classList.toggle('campaign-hero-visible', entries[0].isIntersecting), { threshold: 0.02 }).observe(hero);
  }
})();
