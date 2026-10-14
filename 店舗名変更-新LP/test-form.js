(() => {
  'use strict';
  const script = document.currentScript;
  const thanksUrl = new URL(script.dataset.thanksUrl, location.href);
  const params = new URLSearchParams(location.search);
  const noticeText = '屋号・店舗名変更以外の、ご利用中・手続き中のご相談は受け付けておりません。Uber Eatsのサポート窓口へお問い合わせください。';
  const strip = document.createElement('div');
  strip.className = 'test-environment-label';
  strip.hidden = true;
  strip.textContent = '確認用テスト環境｜送信は模擬動作です（メール・マスタ・本番計測なし）';
  document.body.prepend(strip);
  const fixedHeader = document.querySelector('.hd');
  if (fixedHeader && getComputedStyle(fixedHeader).position === 'fixed') {
    document.body.classList.add('has-test-fixed-header');
    const syncHeaderSpace = () => { strip.style.marginTop = `${fixedHeader.getBoundingClientRect().height}px`; };
    syncHeaderSpace();
    window.addEventListener('resize', syncHeaderSpace);
    if (typeof ResizeObserver === 'function') new ResizeObserver(syncHeaderSpace).observe(fixedHeader);
  }
  const formTypes = ['h_new_store', 'm_new_store', 'status', 'promotion_status', 'consultation_status'];
  document.querySelectorAll('form[data-test-form]').forEach(form => {
    const hero = form.classList.contains('hero-detail-form');
    const radios = hero ? [...document.querySelectorAll('input[name="hero-status"]')] : [...form.querySelectorAll('input[type="radio"]')].filter(r => formTypes.includes(r.name));
    const body = form.querySelector('.form-body, .f-form-body');
    const submit = form.querySelector('button[type="submit"]') || document.querySelector(`button[form="${form.id}"]`);
    const dock = hero ? document.querySelector('.hero-form-submit-dock') : null;
    let notice = form.querySelector('.ineligible-message, .f-no-msg');
    if (hero) notice = document.querySelector('.hero-status-notice');
    if (!notice) {
      notice = document.createElement('p'); notice.className = 'test-ineligible-notice'; notice.hidden = true;
      form.querySelector('.consultation-options').after(notice);
    }
    notice.textContent = radios.some(r => r.value === 'name_change') ? noticeText : '本フォームはUber Eatsへの新規出店をご検討中の店舗様向けです。ご利用中・手続き中の店舗様はUber Eatsサポート窓口へお問い合わせください。';
    const consultation = form.querySelector('[name="consultation_type"]');
    const desiredLabel = form.querySelector('.name-change-field');
    const desired = desiredLabel.querySelector('input');
    const store = form.querySelector('[name="store_name"], [name="shop_name"], [name="company"]');
    const storeLabel = store?.closest('label') || (store?.id ? form.querySelector(`label[for="${store.id}"]`) : null) || store?.parentElement.querySelector('.f-lbl');
    const labelText = storeLabel ? [...storeLabel.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()) : [];
    const storeRow = store?.closest('.f-row') || store?.closest('label');
    if (storeRow) storeRow.after(desiredLabel);
    const originalSubmitText = submit?.textContent;
    const originalText = labelText.map(n => n.textContent);
    const heading = form.querySelector('.hero-form-heading');
    const originalHeading = heading?.textContent;
    const messageFields = [...form.querySelectorAll('textarea')].map(field => ({ field, placeholder: field.getAttribute('placeholder') }));
    const inquiry = form.querySelector('[name="inquiry_type"]');
    if (inquiry && !inquiry.querySelector('option[value="屋号・店舗名変更"]')) {
      inquiry.add(new Option('屋号・店舗名変更', '屋号・店舗名変更'));
    }
    const state = () => radios.find(r => r.checked)?.value || '';
    let previousState = '';
    const update = () => {
      const value = state();
      const nameChange = value === 'name_change';
      const rejected = value === 'no' || value === 'ineligible';
      const eligible = nameChange || value === 'new' || value === 'yes';
      consultation.value = nameChange ? 'store_name_change' : eligible ? 'new_store' : '';
      notice.hidden = !rejected; notice.classList.toggle('is-shown', rejected);
      if (body) { body.hidden = !eligible; body.classList.toggle('is-hidden', !eligible); }
      if (hero) { form.hidden = !eligible; if (dock) dock.hidden = !eligible; }
      const group = form.querySelector('.consultation-options');
      form.querySelectorAll('input,select,textarea').forEach(input => {
        if (radios.includes(input) || group?.contains(input) || input.type === 'hidden') return;
        input.disabled = !eligible;
      });
      desiredLabel.hidden = !nameChange; desired.disabled = !nameChange;
      messageFields.forEach(({ field, placeholder }) => {
        if (nameChange) field.setAttribute('placeholder', '屋号・店舗名変更について、ご希望や事前に伝えておきたいことがあればご記入ください。');
        else if (placeholder === null) field.removeAttribute('placeholder');
        else field.setAttribute('placeholder', placeholder);
      });
      labelText.forEach((node,i) => { node.textContent = nameChange ? (i===0 ? '現在Uber Eatsに登録している店舗名 ' : '') : originalText[i]; });
      if (heading) heading.textContent = nameChange ? '屋号・店舗名変更のご相談に必要な情報をご入力ください' : originalHeading;
      if (hero) form.querySelector('input[name="status"]').value = value;
      if (inquiry && nameChange) inquiry.value = '屋号・店舗名変更';
      if (inquiry && previousState==='name_change' && !nameChange) inquiry.value = '';
      previousState = value;
      if (submit) { if (nameChange) submit.textContent = '店舗名変更を相談する'; else if (originalSubmitText) submit.textContent = originalSubmitText; submit.hidden = rejected; submit.disabled = !eligible || !form.checkValidity(); }
      if (window.frameElement) window.frameElement.style.height = `${Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)}px`;
    };
    radios.forEach(radio => radio.addEventListener('change', update));
    form.addEventListener('input', update); form.addEventListener('change', update);
    if (params.get('status') === 'name_change') {
      const radio = radios.find(r => r.value==='name_change'); if (radio) radio.checked = true;
    }
    update();
    // Capture before the legacy submit handlers: never send to production or PHP.
    form.addEventListener('submit', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      update();
      if (!['name_change','new','yes'].includes(state())) { radios[0]?.focus(); return; }
      const phone = form.querySelector('[name="phone"], [name="tel"]');
      if (phone && !/^0[0-9]{9,10}$/.test(phone.value.replace(/[^0-9]/g, ''))) { phone.setCustomValidity('電話番号を10桁または11桁で入力してください。'); phone.reportValidity(); phone.addEventListener('input', () => phone.setCustomValidity(''), { once: true }); return; }
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const fields = {};
      for (const [name,value] of new FormData(form)) {
        if (name in fields) fields[name] = [].concat(fields[name],value); else fields[name] = value;
      }
      fields.lp_variant = window.FLAGK_TEST_VARIANT;
      fields.test_only = true;
      fields.consultation_label = consultation.value==='store_name_change' ? '屋号・店舗名変更' : '新規出店';
      fields.mail_subject_preview = `[確認用] ${fields.consultation_label}／${fields.form_type}`;
      fields.completion_events_preview = [window.FLAGK_TEST_VARIANT==='store_opening' ? 'new_lp_generate_lead' : 'support_lp_generate_lead'];
      if (consultation.value==='store_name_change') fields.completion_events_preview.push(window.FLAGK_TEST_VARIANT==='store_opening' ? 'new_lp_store_name_change_lead_submit' : 'support_lp_store_name_change_lead_submit');
      const cta = params.get('cta');
      if (cta) fields.cta_first = fields.cta_last = cta;
      try { sessionStorage.setItem('flagk_test_last_submission', JSON.stringify(fields,null,2)); } catch (_) {}
      location.assign(thanksUrl.href);
    }, true);
  });
})();
