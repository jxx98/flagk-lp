'use strict';
(() => {
  const form = document.getElementById('partner-form');
  if (!form) return;
  const result = document.getElementById('form-result');
  const errorBox = document.getElementById('form-error');
  const confirmButton = form.querySelector('button[type="submit"]');
  const mobileCta = document.querySelector('.mobile-cta');
  let sending = false;
  let submitted = false;
  let editing = true;
  let csrf = '';
  let submissionId = '';
  const requirements = document.getElementById('form-requirements');
  const hasValidInputs = () => form.checkValidity() && Array.from(form.querySelectorAll('input[required],textarea[required]')).every(field => /^(checkbox|radio)$/.test(field.type) || field.value.trim() !== '');
  const syncButtons = () => {
    const valid = hasValidInputs();
    confirmButton.disabled = sending || submitted || !editing || !valid;
    if (requirements) requirements.hidden = !editing || valid;
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
    link.href = 'mailto:ubereats-support@flagk-co.jp';
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
  const resetConfirmation = () => {
    result.hidden = true; result.replaceChildren(); confirmButton.hidden = false; editing = true;
    syncButtons();
  };
  const handleInput = () => {
    if (!editing && !sending && !submitted) resetConfirmation();
    syncButtons();
  };
  form.addEventListener('input', handleInput);
  form.addEventListener('change', handleInput);
  window.addEventListener('pageshow', syncButtons);
  syncButtons();
  requestAnimationFrame(syncButtons);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!editing || sending || submitted || !hasValidInputs() || !form.reportValidity()) return;
    errorBox.hidden = true;
    const values = new FormData(form);
    result.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = 'この内容でお問い合わせします。'; result.append(heading);
    for (const [label, name] of [['法人名', 'company'], ['ご担当者名', 'person'], ['電話番号', 'phone'], ['メールアドレス', 'email'], ['ご相談内容', 'message']]) {
      const line = document.createElement('p');
      line.textContent = `${label}：${values.get(name) || '未入力'}`; result.append(line);
    }
    const send = document.createElement('button');
    send.type = 'button'; send.className = 'button'; send.textContent = 'この内容で送信する';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'text-button'; edit.textContent = '入力内容を修正する';
    edit.addEventListener('click', () => { resetConfirmation(); form.querySelector('[name="company"]').focus(); });
    send.addEventListener('click', async () => {
      if (sending || submitted || !hasValidInputs() || !form.reportValidity()) return;
      sending = true; send.disabled = true; edit.disabled = true; errorBox.hidden = true;
      form.setAttribute('aria-busy', 'true');
      syncButtons();
      send.textContent = '送信しています…';
      for (const field of form.querySelectorAll('input:not([type="hidden"]),textarea')) field.disabled = true;
      try {
        if (!/^https?:$/.test(location.protocol)) throw new Error('local_file');
        await getToken();
        // Use the reviewed snapshot; disabled controls are intentionally excluded from a new FormData.
        values.set('csrf', csrf); values.set('submission_id', submissionId);
        const response = await fetch('mail.php', { method: 'POST', body: values, credentials: 'same-origin', headers: { Accept: 'application/json' } });
        const data = await response.json();
        if (!response.ok || !data.ok || !/^[a-f0-9]{32}$/.test(data.receipt || '')) {
          if (data.code === 'csrf') { csrf = ''; submissionId = ''; }
          throw new Error('send_failed');
        }
        submitted = true;
        // Completion is counted on the server-verified thanks page only.
        location.assign('thanks.php?receipt=' + encodeURIComponent(data.receipt));
      } catch (_) {
        showError('送信できませんでした。入力内容は残っています。時間をおいて再度お試しいただくか、メールでご連絡ください。');
        track('partner_form_error', { form_type: 'partner_recruitment' });
      } finally {
        if (!submitted) {
          sending = false; send.disabled = false; edit.disabled = false; send.textContent = 'この内容で送信する';
          for (const field of form.querySelectorAll('input,textarea')) field.disabled = false;
          form.removeAttribute('aria-busy');
          syncButtons();
        }
      }
    });
    result.append(send, edit); result.hidden = false; confirmButton.hidden = true; editing = false;
    if (requirements) requirements.hidden = true;
    syncButtons();
    track('partner_form_review', { form_type: 'partner_recruitment' }); result.focus();
  });
  // Hide the mobile sticky CTA while the contact form is visible or focused.
  if (mobileCta) {
    let inContact = false;
    const refresh = () => mobileCta.classList.toggle('suppressed', inContact || form.contains(document.activeElement));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => { inContact = entries[0].isIntersecting; refresh(); });
      observer.observe(document.getElementById('contact'));
    }
    form.addEventListener('focusin', refresh);
    form.addEventListener('focusout', () => requestAnimationFrame(refresh));
  }
})();
