'use strict';
(() => {
  const variant = 'partner_recruitment';
  window.dataLayer = window.dataLayer || [];
  // Existing FlagK GA4 property. No Google Ads conversion label is reused.
  const live = location.protocol === 'https:' && /(^|\.)flagk-co\.jp$/i.test(location.hostname);
  if (live) {
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    const safeUrl = location.origin + location.pathname;
    let safeReferrer = '';
    try { const ref = new URL(document.referrer); safeReferrer = ref.origin + ref.pathname; } catch (_) {}
    window.gtag('config', 'G-VLQG12Y4E5', { lp_variant: variant, send_page_view: false, page_location: safeUrl, page_referrer: safeReferrer });
    // Do not pass the current URL, which could contain personal query parameters.
    window.gtag('event', 'page_view', { page_location: location.origin + location.pathname, page_title: document.title });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=G-VLQG12Y4E5';
    document.head.append(tag);
  }
  window.flagkTrack = (event, values = {}) => {
    const params = { lp_variant: variant };
    // Only positional labels and a random lead ID; never form inputs or free text.
    for (const key of ['cta_id', 'section_id', 'lead_id', 'form_type']) {
      if (typeof values[key] === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(values[key])) params[key] = values[key];
    }
    if (live) window.gtag('event', event, params);
    else window.dataLayer.push({ event, ...params });
  };
  for (const a of document.querySelectorAll('[data-cta]')) {
    a.addEventListener('click', () => {
      const key = a.dataset.cta;
      window.flagkTrack('partner_cta_click', { cta_id: key });
      const input = document.querySelector('[name="cta_last"]');
      if (input) input.value = key;
    });
  }
  const form = document.getElementById('partner-form');
  if (form) form.addEventListener('input', () => window.flagkTrack('partner_form_start', { form_type: variant }), { once: true });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        window.flagkTrack('partner_section_view', { section_id: entry.target.id });
        observer.unobserve(entry.target);
      }
    }, { threshold: .15 });
    for (const section of document.querySelectorAll('section[id]')) observer.observe(section);
  }
  const receipt = document.querySelector('[data-confirmed-receipt]');
  if (receipt && /^[a-f0-9]{32}$/.test(receipt.dataset.confirmedReceipt)) {
    const id = receipt.dataset.confirmedReceipt;
    const key = 'flagk_partner_counted_' + id;
    let counted = false;
    try { counted = sessionStorage.getItem(key) === '1'; } catch (_) {}
    if (!counted) {
      window.flagkTrack('generate_lead', { lead_id: id, form_type: variant });
      try { sessionStorage.setItem(key, '1'); } catch (_) {}
    }
  }
})();
