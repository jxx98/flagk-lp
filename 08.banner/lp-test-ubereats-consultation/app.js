(() => {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('embed')) {
    document.body.classList.add('is-embedded');
  }

  const syncEmbeddedHeight = () => {
    const frame = window.frameElement;
    if (!frame) return;
    requestAnimationFrame(() => {
      frame.style.height = `${Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)}px`;
    });
  };

  const heroStatus = document.querySelectorAll('input[name="hero-status"]');
  const heroNextButton = document.querySelector('.hero-next-button');
  const heroStatusNotice = document.querySelector('.hero-status-notice');
  const heroDetailForm = document.querySelector('.hero-detail-form');
  const updateHeroStatus = () => {
    const selected = document.querySelector('input[name="hero-status"]:checked');
    const eligible = selected && selected.value === 'new';
    const ineligible = selected && !eligible;
    if (heroNextButton) {
      heroNextButton.hidden = !selected || eligible;
      heroNextButton.classList.toggle('is-disabled', ineligible);
      heroNextButton.setAttribute('aria-disabled', ineligible ? 'true' : 'false');
      heroNextButton.tabIndex = ineligible ? -1 : 0;
    }
    if (heroStatusNotice) heroStatusNotice.hidden = !ineligible;
    if (heroDetailForm) heroDetailForm.hidden = !eligible;
  };
  heroStatus.forEach((radio) => radio.addEventListener('change', updateHeroStatus));
  if (heroNextButton) {
    heroNextButton.addEventListener('click', (event) => {
      if (heroNextButton.getAttribute('aria-disabled') === 'true') event.preventDefault();
    });
  }
  updateHeroStatus();

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
        if (!form.checkValidity()) { form.reportValidity(); return; }
        form.querySelectorAll(':scope > :not(.form-complete)').forEach((field) => { field.hidden = true; });
        const complete = form.querySelector('.form-complete');
        if (complete) complete.hidden = false;
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
    if (['new', 'progress', 'using'].includes(initialStatus)) {
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
      form.querySelector('.form-fieldset').hidden = true;
      if (body) body.hidden = true;
      if (notice) notice.hidden = true;
      if (complete) complete.hidden = false;
      syncEmbeddedHeight();
    });
  });
})();
