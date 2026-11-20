'use strict';
(() => {
  const form = document.getElementById('partner-form');
  if (!form) return;
  const errorBox = document.getElementById('form-error');
  const sendButton = form.querySelector('button[type="submit"]');
  let sending = false;
  let submitted = false;
  let attemptTracked = false;
  let csrf = '';
  let submissionId = '';
  const requirements = document.getElementById('form-requirements');
  const hasValidInputs = () => form.checkValidity() && Array.from(form.querySelectorAll('input[required],textarea[required]')).every(field => /^(checkbox|radio)$/.test(field.type) || field.value.trim() !== '');
  const syncButtons = () => {
    const valid = hasValidInputs();
    sendButton.disabled = sending || submitted || !valid;
    if (requirements) requirements.hidden = valid;
  };
  const track = (event, params) => window.flagkTrack?.(event, params);
  const attributionKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'gbraid', 'wbraid'];
  const query = new URLSearchParams(location.search);
  // Advertising IDs stay in the lead notification, never in GA events.
  for (const name of [...attributionKeys, 'cta_last']) {
    const field = document.createElement('input');
    field.type = 'hidden'; field.name = name;
    field.value = name === 'cta_last' ? 'direct' : (query.get(name) || '').slice(0, 200);
    form.append(field);
  }
  const showError = (message) => {
    errorBox.replaceChildren(document.createTextNode(message + ' '));
    const link = document.createElement('a');
    link.href = 'mailto:info@flagk-co.jp';
    link.textContent = 'メールで問い合わせる';
    errorBox.append(link);
    errorBox.hidden = false; errorBox.focus();
  };
  // Local files remain viewable. Network calls only occur on explicit send.
  const getToken = async () => {
    if (csrf && submissionId) return;
    const response = await fetch('mail.php?action=token', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok || !/^[a-f0-9]{64}$/.test(data.csrf || '') || !/^[a-f0-9]{32}$/.test(data.submission_id || '')) throw new Error('token');
    csrf = data.csrf; submissionId = data.submission_id;
  };
  form.addEventListener('input', syncButtons);
  form.addEventListener('change', syncButtons);
  window.addEventListener('pageshow', syncButtons);
  syncButtons();
  requestAnimationFrame(syncButtons);
  const idleButtonContent = sendButton.innerHTML;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || submitted || !hasValidInputs() || !form.reportValidity()) return;
    if (!attemptTracked) {
      track('partner_form_submit_attempt', { form_type: 'partner_recruitment' });
      attemptTracked = true;
    }
    const values = new FormData(form);
    sending = true;
    errorBox.hidden = true;
    form.setAttribute('aria-busy', 'true');
    syncButtons();
    sendButton.textContent = '送信しています…';
    for (const field of form.querySelectorAll('input:not([type="hidden"]),textarea')) field.disabled = true;
    try {
      if (!/^https?:$/.test(location.protocol)) throw new Error('local_file');
      await getToken();
      values.set('csrf', csrf); values.set('submission_id', submissionId);
      const response = await fetch('mail.php', { method: 'POST', body: values, credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (!response.ok || !data.ok || !/^[a-f0-9]{32}$/.test(data.receipt || '')) {
        if (data.code === 'csrf') { csrf = ''; submissionId = ''; }
        throw new Error('send_failed');
      }
      submitted = true;
      location.assign('/thanks.html?lp_variant=partner_recruitment&receipt=' + encodeURIComponent(data.receipt));
    } catch (_) {
      showError('送信できませんでした。入力内容は残っています。時間をおいて再度お試しいただくか、メールでご連絡ください。');
      track('partner_form_error', { form_type: 'partner_recruitment' });
    } finally {
      if (!submitted) {
        sending = false;
        sendButton.innerHTML = idleButtonContent;
        for (const field of form.querySelectorAll('input,textarea')) field.disabled = false;
        form.removeAttribute('aria-busy');
        syncButtons();
      }
    }
  });

})();

// Keep anchor destinations below the fixed header.
(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const syncHeaderHeight = () => document.documentElement.style.setProperty('--header-height', Math.ceil(header.getBoundingClientRect().height) + 'px');
  syncHeaderHeight();
  if ('ResizeObserver' in window) new ResizeObserver(syncHeaderHeight).observe(header);
  else window.addEventListener('resize', syncHeaderHeight);
})();

// Keep a single inquiry action visible on mobile.
(() => {
  const sticky = document.querySelector('.mobile-cta');
  if (!sticky) return;
  const header = document.querySelector('.site-header');
  const contact = document.getElementById('contact');
  const form = document.getElementById('partner-form');
  const inlineActions = [...document.querySelectorAll('main a.button[href="#contact"]')];
  let frame = 0;
  const refresh = () => {
    frame = 0;
    const viewportBottom = window.visualViewport
      ? window.visualViewport.offsetTop + window.visualViewport.height
      : window.innerHeight;
    const viewportTop = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    const visible = el => {
      if (!el || el.hidden || !el.getClientRects().length) return false;
      const rect = el.getBoundingClientRect();
      return rect.bottom > viewportTop && rect.top < viewportBottom && rect.right > 0 && rect.left < window.innerWidth;
    };
    const suppress = window.innerWidth > 700 || inlineActions.some(visible)
      || visible(contact) || Boolean(form?.contains(document.activeElement));
    sticky.classList.toggle('suppressed', suppress);
    sticky.setAttribute('aria-hidden', String(suppress));
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(refresh); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(schedule, { threshold: [0, 0.01, 1] });
    [...inlineActions, contact].filter(Boolean).forEach(el => observer.observe(el));
  }
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  refresh();
})();
