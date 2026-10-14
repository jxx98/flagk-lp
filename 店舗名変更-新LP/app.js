(() => {
  const searchParams = new URLSearchParams(window.location.search);
  const isStaticPreview = window.location.protocol === 'file:' || /github\.io$/i.test(window.location.hostname);
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

  const setCtaTracking = (form) => {
    const cta = searchParams.get('cta') || form.dataset.defaultCta || 'direct_form';
    const first = form.querySelector('input[name="cta_first"]');
    const last = form.querySelector('input[name="cta_last"]');
    if (first) first.value = cta;
    if (last) last.value = cta;
  };

  const trackEvent = (name, parameters = {}) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, { lp_variant: 'store_opening', ...parameters });
    }
  };

  // #feesへの直接アクセスも、通常スクロールも、実際の表示時に1回だけ計測。
  const fees = document.getElementById('fees');
  const promotion = document.getElementById('fees-promotion');
  const promotionDismissedKey = 'new_lp_fees_promotion_dismissed';
  let promotionDismissed = false;
  let feesReached = false;
  let promotionViewed = false;
  try { promotionDismissed = sessionStorage.getItem(promotionDismissedKey) === '1'; } catch (_) {}
  const entryType = location.hash === '#fees' ? 'fees_anchor' : 'normal';
  const promotionParameters = () => ({
    section_id: 'fees', entry_type: entryType,
    display_type: window.matchMedia('(max-width: 860px)').matches ? 'mobile_banner' : 'pc_window'
  });
  const syncPromotion = () => {
    if (!promotion) return;
    const inputFocused = document.activeElement?.matches('input, select, textarea, [contenteditable="true"]');
    promotion.hidden = !feesReached || promotionDismissed || inputFocused;
    document.body.classList.toggle('has-fees-promotion', !promotion.hidden);
    if (!promotion.hidden && !promotionViewed) {
      promotionViewed = true;
      trackEvent('new_lp_promotion_view', promotionParameters());
    }
  };
  if (promotion) {
    promotion.querySelector('button').addEventListener('click', () => {
      promotionDismissed = true;
      try { sessionStorage.setItem(promotionDismissedKey, '1'); } catch (_) {}
      trackEvent('new_lp_promotion_close', promotionParameters());
      syncPromotion();
    });
    promotion.querySelector('a').addEventListener('click', () => {
      trackEvent('new_lp_promotion_click', { ...promotionParameters(), cta_id: 'fees_store_price_promotion' });
    });
    document.addEventListener('focusin', syncPromotion);
    document.addEventListener('focusout', () => setTimeout(syncPromotion, 0));
  }
  if (fees && typeof IntersectionObserver === 'function') {
    const feesObserver = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      trackEvent('new_lp_fees_view', { section_id: 'fees', entry_type: entryType });
      feesReached = true;
      syncPromotion();
      feesObserver.disconnect();
    }, { rootMargin: '-82px 0px -20% 0px', threshold: 0 });
    feesObserver.observe(fees);
  }

  document.querySelectorAll('a[href*="cta="]').forEach((link) => {
    link.addEventListener('click', () => {
      const cta = new URL(link.href, window.location.href).searchParams.get('cta');
      trackEvent('new_lp_cta_click', { cta_id: cta || 'unknown' });
    });
  });

  const showSubmissionError = (form) => {
    if (!searchParams.has('error')) return;
    const error = searchParams.get('error');
    const messages = {
      rate_limit: '短時間に複数回送信されています。10分ほど時間をおいてから、もう一度お試しください。',
      too_large: '入力内容が長すぎます。内容を短くして、もう一度お試しください。'
    };
    const message = document.createElement('p');
    message.className = 'submit-error';
    message.setAttribute('role', 'alert');
    message.textContent = messages[error] || '入力内容を確認のうえ、もう一度お試しください。';
    form.prepend(message);
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
    const eligible = selected && ['new', 'name_change'].includes(selected.value);
    const ineligible = selected && !eligible;
    if (heroStatusNotice) heroStatusNotice.hidden = !ineligible;
    // 相談意欲を逃さないよう、入力欄は初期状態から表示する。
    // 対象外を選んだ場合だけ、案内文へ切り替える。
    if (heroDetailForm) heroDetailForm.hidden = Boolean(ineligible);
    if (heroFormSubmitDock) heroFormSubmitDock.hidden = Boolean(ineligible);
    if (selected) {
      trackEvent('new_lp_form_status_select', { form_location: 'hero', status: selected.value });
    }
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

  const setFieldError = (input, message) => {
    const container = input.closest('label') || input.parentElement;
    if (!container) return;
    let error = container.querySelector(`.field-error[data-field="${input.name}"]`);
    if (message) {
      if (!error) {
        error = document.createElement('small');
        error.className = 'field-error';
        error.dataset.field = input.name;
        error.id = `${input.name}-error`;
        input.insertAdjacentElement('afterend', error);
      }
      error.textContent = message;
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', error.id);
      return;
    }
    error?.remove();
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  };

  const setInputValidity = (input, message = '') => {
    input.setCustomValidity(message);
    setFieldError(input, message);
    syncEmbeddedHeight();
    return !message;
  };

  const validatePhone = (input) => {
    if (!input.value) return setInputValidity(input);
    const digits = input.value.replace(/\D/g, '');
    return setInputValidity(
      input,
      /^0\d{9,10}$/.test(digits) ? '' : '電話番号を市外局番から正しく入力してください。'
    );
  };

  const validateEmail = (input) => {
    if (!input.value) return setInputValidity(input);
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
    return setInputValidity(input, valid ? '' : 'メールアドレスの形式を確認してください。');
  };

  const enableContactValidation = (form) => {
    form.querySelectorAll('input[type="tel"]').forEach((input) => {
      input.addEventListener('input', () => validatePhone(input));
      input.addEventListener('blur', () => validatePhone(input));
    });
    form.querySelectorAll('input[type="email"]').forEach((input) => {
      input.addEventListener('input', () => validateEmail(input));
      input.addEventListener('blur', () => validateEmail(input));
    });
  };

  const validateContactFields = (form) => {
    const phoneValid = [...form.querySelectorAll('input[type="tel"]')]
      .every((input) => validatePhone(input));
    const emailValid = [...form.querySelectorAll('input[type="email"]')]
      .every((input) => validateEmail(input));
    return phoneValid && emailValid;
  };

  const enableZipAutofill = (form) => {
    const zip = form.querySelector('input[name="zip"]');
    const address = form.querySelector('input[name="address"]');
    let previousZip = '';
    if (!zip || !address) return;

    const lockAddress = () => {
      address.value = '';
      address.disabled = true;
      address.setAttribute('aria-disabled', 'true');
      address.placeholder = '郵便番号を入力すると自動反映されます';
    };
    const unlockAddress = (locality) => {
      address.disabled = false;
      address.removeAttribute('aria-disabled');
      address.placeholder = '例）〇〇区〇〇1-2-3';
      address.value = locality;
      address.focus();
    };
    lockAddress();

    zip.addEventListener('input', async () => {
      const code = zip.value.replace(/[^0-9]/g, '');
      if (code.length !== 7) {
        previousZip = '';
        zip.setCustomValidity('');
        setFieldError(zip, '');
        lockAddress();
        return;
      }
      if (code === previousZip) return;
      previousZip = code;
      lockAddress();
      zip.setCustomValidity('住所を取得中です。');
      setFieldError(zip, '');
      try {
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`);
        const data = await response.json();
        const result = data.results && data.results[0];
        if (!result) {
          setInputValidity(zip, '郵便番号から住所を取得できません。番号を確認してください。');
          return;
        }
        const locality = `${result.address1}${result.address2}${result.address3}`;
        setInputValidity(zip);
        unlockAddress(locality);
      } catch (_) {
        setInputValidity(zip, '住所を取得できませんでした。時間をおいてお試しください。');
      }
    });
    zip.addEventListener('blur', () => {
      const code = zip.value.replace(/[^0-9]/g, '');
      if (zip.value && code.length !== 7) {
        setInputValidity(zip, '郵便番号は7桁で入力してください。');
      }
    });
  };

  document.querySelectorAll('.contact-form').forEach((form) => {
    setCtaTracking(form);
    showSubmissionError(form);
    enableContactValidation(form);
    if (form.classList.contains('hero-detail-form')) {
      enableZipAutofill(form);
      form.addEventListener('submit', (event) => {
        const selected = document.querySelector('input[name="hero-status"]:checked');
        if (!selected) {
          event.preventDefault();
          heroStatusOptions?.querySelector('input')?.focus();
          return;
        }
        if (!['new', 'name_change'].includes(selected.value)) {
          event.preventDefault();
          updateHeroStatus();
          return;
        }
        if (!validateContactFields(form) || !form.checkValidity()) {
          event.preventDefault();
          form.reportValidity();
          return;
        }
        disableSubmitButton(form);
        if (isStaticPreview) {
          event.preventDefault();
          window.location.assign('thanks.html?type=campaign');
        }
      });
      return;
    }
    const radios = form.querySelectorAll('input[name="status"]');
    const body = form.querySelector('.form-body');
    const notice = form.querySelector('.ineligible-message');
    const updateEligibility = () => {
      const selected = form.querySelector('input[name="status"]:checked');
      const eligible = selected && ['new', 'name_change'].includes(selected.value);
      const ineligible = selected && !eligible;
      if (notice) notice.hidden = !ineligible;
      if (body) body.hidden = !eligible;
      syncEmbeddedHeight();
    };
    const initialStatus = searchParams.get('status');
    if (['new', 'name_change', 'ineligible'].includes(initialStatus)) {
      const radio = form.querySelector(`input[name="status"][value="${initialStatus}"]`);
      if (radio) radio.checked = true;
    }
    radios.forEach((radio) => radio.addEventListener('change', () => {
      updateEligibility();
      trackEvent('new_lp_form_status_select', {
        form_location: form.dataset.formKind || 'standalone',
        status: radio.value
      });
    }));
    updateEligibility();

    enableZipAutofill(form);

    form.addEventListener('submit', (event) => {
      const selected = form.querySelector('input[name="status"]:checked');
      if (!selected || !['new', 'name_change'].includes(selected.value)) {
        event.preventDefault();
        updateEligibility();
        return;
      }
      if (!validateContactFields(form) || !form.checkValidity()) {
        event.preventDefault();
        form.reportValidity();
        return;
      }
      disableSubmitButton(form);
      if (isStaticPreview) {
        event.preventDefault();
        window.location.assign(`thanks.html?type=${encodeURIComponent(form.dataset.formKind || 'contact')}`);
      }
    });
  });
})();
