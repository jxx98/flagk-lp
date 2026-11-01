(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const noticeText = '屋号・店舗名変更以外の、ご利用中・手続き中のご相談は受け付けておりません。Uber Eatsのサポート窓口へお問い合わせください。';
  const fixedHeader = document.querySelector('.hd');
  if (fixedHeader && getComputedStyle(fixedHeader).position === 'fixed') {
    document.body.classList.add('has-consultation-fixed-header');
    const syncHeaderSpace = () => {
      const headerHeight = fixedHeader.getBoundingClientRect().height;
      document.body.style.paddingTop = `${headerHeight}px`;
      document.documentElement.style.setProperty('--consultation-header-height', `${headerHeight}px`);
      document.documentElement.style.setProperty('--consultation-notice-height', '0px');
    };
    syncHeaderSpace();
    window.addEventListener('resize', syncHeaderSpace);
    if (typeof ResizeObserver === 'function') new ResizeObserver(syncHeaderSpace).observe(fixedHeader);
  }
  const formTypes = ['h_new_store', 'm_new_store', 'status', 'promotion_status', 'consultation_status'];
  document.querySelectorAll('form[data-consultation-form]').forEach(form => {
    const hero = form.classList.contains('hero-detail-form');
    const radios = hero ? [...document.querySelectorAll('input[name="hero-status"]')] : [...form.querySelectorAll('input[type="radio"]')].filter(r => formTypes.includes(r.name));
    const body = form.querySelector('.form-body, .f-form-body');
    const submit = form.querySelector('button[type="submit"]') || document.querySelector(`button[form="${form.id}"]`);
    const dock = form.closest('.hv2-form-panel')?.querySelector('.old-hero-submit-dock') || (hero ? document.querySelector('.hero-form-submit-dock') : null);
    let notice = form.querySelector('.ineligible-message, .f-no-msg');
    if (hero) notice = document.querySelector('.hero-status-notice');
    if (!notice) {
      notice = document.createElement('p'); notice.className = 'consultation-ineligible-notice'; notice.hidden = true;
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
    const originalSubmitNodes = submit ? [...submit.childNodes].map(node => node.cloneNode(true)) : [];
    const originalFreeBadge = submit?.classList.contains('has-free-badge');
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
      if (hero) form.hidden = !eligible;
      if (dock) dock.hidden = !eligible;
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
      if (submit) {
        if (nameChange) submit.textContent = '店舗名変更を相談する';
        else if (originalSubmitNodes.length) submit.replaceChildren(...originalSubmitNodes.map(node => node.cloneNode(true)));
        submit.classList.toggle('has-free-badge', !nameChange && originalFreeBadge);
        submit.hidden = rejected;
        submit.disabled = !eligible || !form.checkValidity();
      }
      if (window.frameElement) window.frameElement.style.height = `${Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)}px`;
    };
    radios.forEach(radio => radio.addEventListener('change', update));
    form.addEventListener('input', update); form.addEventListener('change', update);
    if (params.get('status') === 'name_change') {
      const radio = radios.find(r => r.value==='name_change'); if (radio) radio.checked = true;
    } else if (form.id === 'hero-cf-form' && window.matchMedia('(min-width: 900px)').matches && !state()) {
      const radio = radios.find(r => r.value === 'yes');
      if (radio) radio.checked = true;
    }
    update();
    // 本番では既存のPHPへPOSTする。対象外と不正入力のみ送信を止める。
    form.addEventListener('submit', event => {
      update();
      if (!['name_change', 'new', 'yes'].includes(state())) {
        event.preventDefault(); event.stopImmediatePropagation(); radios[0]?.focus(); return;
      }
      const phone = form.querySelector('[name="phone"], [name="tel"]');
      if (phone && !/^0[0-9]{9,10}$/.test(phone.value.replace(/[^0-9]/g, ''))) {
        event.preventDefault(); event.stopImmediatePropagation();
        phone.setCustomValidity('電話番号を10桁または11桁で入力してください。');
        phone.reportValidity();
        phone.addEventListener('input', () => phone.setCustomValidity(''), { once: true }); return;
      }
      if (!form.checkValidity()) {
        event.preventDefault(); event.stopImmediatePropagation(); form.reportValidity(); return;
      }
      if (form.dataset.consultationSubmitting === 'true') {
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      form.dataset.consultationSubmitting = 'true';
      if (submit) submit.disabled = true;
    }, true);
    window.addEventListener('pageshow', () => {
      delete form.dataset.consultationSubmitting;
      update();
    });
  });
  // 旧LPの相談バナーから、該当する相談内容を選択して入力を進める。
  document.querySelectorAll('a[data-name-change-entry], a[data-new-store-entry]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const form = document.getElementById(window.matchMedia('(max-width: 899px)').matches ? 'mobile-cf-form' : 'hero-cf-form');
      const newStore = link.hasAttribute('data-new-store-entry');
      const radio = form?.querySelector(newStore ? 'input[value="yes"]' : 'input[value="name_change"]');
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      ['cta_first', 'cta_last'].forEach(name => {
        let field = form.querySelector(`input[name="${name}"]`);
        if (!field) { field = document.createElement('input'); field.type = 'hidden'; field.name = name; form.append(field); }
        field.value = newStore ? 'support_initial_fee_banner' : 'support_name_change_banner';
      });
      const panel = form.closest('.hv2-form-panel');
      (panel || form).scrollIntoView({ behavior: 'smooth', block: panel ? 'nearest' : 'center' });
      const inputScroll = panel?.querySelector('.old-hero-form-scroll');
      if (inputScroll) inputScroll.scrollTop = 0;
      radio.focus({ preventScroll: true });
    });
  });
  // 新LPと同じく、PCヒーロー上のホイールを入力欄へ渡す。
  const oldHero = document.querySelector('.hv2');
  const oldHeroScroll = document.querySelector('.old-hero-form-scroll');
  if (oldHero && oldHeroScroll) oldHero.addEventListener('wheel', event => {
    if (!window.matchMedia('(min-width: 900px)').matches || event.ctrlKey) return;
    const limit = oldHeroScroll.scrollHeight - oldHeroScroll.clientHeight;
    if (limit <= 0 || event.deltaY === 0) return;
    const canScroll = event.deltaY > 0 ? oldHeroScroll.scrollTop < limit - 1 : oldHeroScroll.scrollTop > 1;
    if (!canScroll) return;
    event.preventDefault();
    oldHeroScroll.scrollTop = Math.max(0, Math.min(limit, oldHeroScroll.scrollTop + event.deltaY));
  }, { passive: false });
})();
