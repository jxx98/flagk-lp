'use strict';
(() => {
  const variant = 'partner_recruitment';
  const query = new URLSearchParams(location.search);
  window.dataLayer = window.dataLayer || [];
  // Existing FlagK GA4 property. No Google Ads conversion label is reused.
  const live = location.protocol === 'https:' && /(^|\.)flagk-co\.jp$/i.test(location.hostname);
  const test = query.get('flagk_test') === '1';
  if (live && !test) {
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    const safeUrl = new URL(location.pathname, location.origin);
    if (/^\/ubereats-partner(?:\/|\/index\.html)?$/.test(location.pathname)) {
      for (const key of ['gclid', 'gbraid', 'wbraid']) {
        const value = query.get(key);
        if (value && /^[A-Za-z0-9._~-]{1,512}$/.test(value)) safeUrl.searchParams.set(key, value);
      }
    }
    const pageLocation = safeUrl.href;
    let safeReferrer = '';
    try { const ref = new URL(document.referrer); safeReferrer = ref.origin + ref.pathname; } catch (_) {}
    window.gtag('config', 'G-VLQG12Y4E5', { lp_variant: variant, send_page_view: false, page_location: pageLocation, page_referrer: safeReferrer });
    // Only the allowed advertising identifiers survive URL sanitization.
    window.gtag('event', 'page_view', { page_location: pageLocation, page_title: document.title });
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
    if (event === 'partner_section_dwell' && Number.isSafeInteger(values.dwell_ms) && values.dwell_ms > 0) {
      params.dwell_ms = values.dwell_ms;
    }
    if (live && !test) window.gtag('event', event, params);
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
    for (const section of document.querySelectorAll('section[id], #benefits')) observer.observe(section);
  }
  const sectionIds = ['top', 'reward-intro', 'opportunity', 'business-model', 'benefits', 'model-cases',
    'partnership', 'conditions', 'company', 'flow', 'faq', 'contact'];
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const state = sections.map(section => ({ section, since: null, pending: 0,
      counted: false, observer: null, threshold: 0 }));
    let suspended = document.visibilityState !== 'visible';
    const stop = (item, now) => {
      if (item.since === null) return;
      item.pending += Math.max(0, now - item.since);
      item.since = null;
    };
    const update = (item, entry) => {
      const rect = entry.boundingClientRect;
      const viewport = entry.rootBounds;
      const area = rect.width * rect.height;
      const referenceArea = viewport
        ? Math.min(rect.width, viewport.width) * Math.min(rect.height, viewport.height) : area;
      const threshold = area > 0 ? referenceArea * 0.5 / area : 0;
      if (referenceArea > 0 && entry.isIntersecting && entry.intersectionRatio >= threshold) {
        if (item.since === null) item.since = entry.time;
      } else {
        stop(item, entry.time);
      }
      return threshold;
    };
    const observe = (item, threshold = 0) => {
      if (item.observer) item.observer.disconnect();
      item.threshold = threshold;
      const observer = new IntersectionObserver(entries => {
        if (suspended || item.observer !== observer) return;
        for (const entry of entries) {
          const required = update(item, entry);
          // Use an exact per-section threshold, including sections taller than the viewport.
          if (Math.abs(required - item.threshold) > 0.000001) observe(item, required);
        }
      }, { threshold: [0, threshold] });
      item.observer = observer;
      observer.observe(item.section);
    };
    const resume = () => {
      suspended = document.visibilityState !== 'visible';
      if (!suspended) for (const item of state) observe(item);
    };
    const flush = () => {
      const now = performance.now();
      for (const item of state) {
        if (item.observer) {
          for (const entry of item.observer.takeRecords()) update(item, entry);
          item.observer.disconnect();
        }
        stop(item, now);
        const dwell = Math.floor(item.pending);
        if (dwell < 1) continue;
        item.pending -= dwell;
        const params = { section_id: item.section.id };
        if (!item.counted) {
          window.flagkTrack('partner_section_qualified_view', params);
          item.counted = true;
        }
        window.flagkTrack('partner_section_dwell', { ...params, dwell_ms: dwell });
      }
      suspended = true;
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resume();
      else flush();
    });
    window.addEventListener('pagehide', flush);
    window.addEventListener('pageshow', resume);
    window.addEventListener('resize', resume);
    if ('ResizeObserver' in window) {
      const layout = new ResizeObserver(entries => {
        if (suspended) return;
        for (const entry of entries) {
          const item = state.find(item => item.section === entry.target);
          if (item) observe(item);
        }
      });
      for (const section of sections) layout.observe(section);
    }
    resume();
  }
  // Shared HP thanks page: count only a receipt confirmed by this form's server session.
  if (location.pathname === '/thanks.html' && query.get('lp_variant') === variant) {
    const id = query.get('receipt') || '';
    if (/^[a-f0-9]{32}$/.test(id)) (async () => {
      try {
        const response = await fetch('/ubereats-partner/mail.php?action=receipt&receipt=' + encodeURIComponent(id), { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
        const data = await response.json();
        if (!response.ok || !data.ok || data.receipt !== id || data.path !== location.pathname || data.variant !== variant) return;
        const key = 'flagk_partner_counted_' + id;
        let counted = false;
        try { counted = sessionStorage.getItem(key) === '1'; } catch (_) {}
        if (!counted) {
          window.flagkTrack('generate_lead', { lead_id: id, form_type: variant });
          try { sessionStorage.setItem(key, '1'); } catch (_) {}
        }
      } catch (_) { /* Never count an unverified receipt. */ }
    })();
  }
})();
