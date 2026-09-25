(() => {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('embed')) {
    document.body.classList.add('is-embedded');
  }

  const resetFormPageScroll = () => {
    if (!document.body.classList.contains('form-page')) return;
    window.scrollTo(0, 0);
    document.querySelector('.standalone-form')?.scrollTo(0, 0);
  };

  if (document.body.classList.contains('form-page') && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  resetFormPageScroll();
  window.addEventListener('pageshow', () => {
    requestAnimationFrame(resetFormPageScroll);
  });

  const syncEmbeddedHeight = () => {
    const frame = window.frameElement;
    if (!frame) return;
    requestAnimationFrame(() => {
      frame.style.height = `${Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)}px`;
    });
  };

  const heroStatus = document.querySelectorAll('input[name="hero-status"]');
  const heroStatusOptions = document.querySelector('.hero-status-options');
  const heroStatusNotice = document.querySelector('.hero-status-notice');
  const heroDetailForm = document.querySelector('.hero-detail-form');
  const heroFormSubmitDock = document.querySelector('.hero-form-submit-dock');
  const hero = document.querySelector('.hero');
  const heroFormScroll = document.querySelector('.hero-form-scroll');
  const disableSubmitButton = (form) => {
    const id = form.id;
    const submit = form.querySelector('button[type="submit"]')
      || (id ? document.querySelector(`button[form="${id}"][type="submit"]`) : null);
    if (!submit) return;
    submit.disabled = true;
    submit.setAttribute('aria-disabled', 'true');
  };
  const updateHeroStatus = () => {
    const selected = document.querySelector('input[name="hero-status"]:checked');
    const eligible = selected && selected.value === 'new';
    const ineligible = selected && !eligible;
    if (heroStatusNotice) heroStatusNotice.hidden = !ineligible;
    // 相談意欲を逃さないよう、入力欄は初期状態から表示する。
    // 対象外を選んだ場合だけ、案内文へ切り替える。
    if (heroDetailForm) heroDetailForm.hidden = Boolean(ineligible);
    if (heroFormSubmitDock) heroFormSubmitDock.hidden = Boolean(ineligible);
  };
  heroStatus.forEach((radio) => radio.addEventListener('change', updateHeroStatus));
  updateHeroStatus();

  // PCではヒーロー上のホイール操作をフォームへ渡す。
  // 入力欄の末尾に着いたら、以降は通常どおり次のセクションへスクロールする。
  if (hero && heroFormScroll) {
    hero.addEventListener('wheel', (event) => {
      if (!window.matchMedia('(min-width: 861px)').matches || event.ctrlKey) return;
      const maxScroll = heroFormScroll.scrollHeight - heroFormScroll.clientHeight;
      if (maxScroll <= 0 || event.deltaY === 0) return;
      const movingDown = event.deltaY > 0;
      const canScrollForm = movingDown
        ? heroFormScroll.scrollTop < maxScroll - 1
        : heroFormScroll.scrollTop > 1;
      if (!canScrollForm) return;
      event.preventDefault();
      heroFormScroll.scrollTop = Math.max(0, Math.min(maxScroll, heroFormScroll.scrollTop + event.deltaY));
    }, { passive: false });
  }

  const enableZipAutofill = (form) => {
    const zip = form.querySelector('input[name="zip"]');
    const address = form.querySelector('input[name="address"]');
    let previousZip = '';
    if (!zip || !address) return;
    zip.addEventListener('input', async () => {
      const code = zip.value.replace(/[^0-9]/g, '');
      if (code.length !== 7 || code === previousZip) return;
      previousZip = code;
      try {
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`);
        const data = await response.json();
        const result = data.results && data.results[0];
        if (!result) return;
        const locality = `${result.address1}${result.address2}${result.address3}`;
        if (!address.value || address.value === locality) address.value = locality;
      } catch (_) {
        // 住所は手入力できるため、補完失敗時は入力を妨げない
      }
    });
  };

  document.querySelectorAll('.contact-form').forEach((form) => {
    if (form.classList.contains('hero-detail-form')) {
      enableZipAutofill(form);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const selected = document.querySelector('input[name="hero-status"]:checked');
        if (!selected) {
          heroStatusOptions?.querySelector('input')?.focus();
          return;
        }
        if (selected.value !== 'new') {
          updateHeroStatus();
          return;
        }
        if (!form.checkValidity()) { form.reportValidity(); return; }
        disableSubmitButton(form);
        form.querySelectorAll(':scope > :not(.form-complete)').forEach((field) => { field.hidden = true; });
        const complete = form.querySelector('.form-complete');
        if (complete) complete.hidden = false;
        if (heroFormSubmitDock) heroFormSubmitDock.hidden = true;
      });
      return;
    }
    const radios = form.querySelectorAll('input[name="status"]');
    const body = form.querySelector('.form-body');
    const notice = form.querySelector('.ineligible-message');
    const complete = form.querySelector('.form-complete');
    const updateEligibility = () => {
      const selected = form.querySelector('input[name="status"]:checked');
      const eligible = selected && selected.value === 'new';
      const ineligible = selected && !eligible;
      if (notice) notice.hidden = !ineligible;
      if (body) body.hidden = !eligible;
      syncEmbeddedHeight();
    };
    const initialStatus = searchParams.get('status');
    if (['new', 'ineligible'].includes(initialStatus)) {
      const radio = form.querySelector(`input[name="status"][value="${initialStatus}"]`);
      if (radio) radio.checked = true;
    }
    radios.forEach((radio) => radio.addEventListener('change', updateEligibility));
    updateEligibility();

    enableZipAutofill(form);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const selected = form.querySelector('input[name="status"]:checked');
      if (!selected || selected.value !== 'new') { updateEligibility(); return; }
      if (!form.checkValidity()) { form.reportValidity(); return; }
      disableSubmitButton(form);
      form.querySelector('.form-fieldset').hidden = true;
      if (body) body.hidden = true;
      if (notice) notice.hidden = true;
      if (complete) complete.hidden = false;
      syncEmbeddedHeight();
    });
  });
})();
