(function () {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function scrollToTop() { window.scrollTo(0, 0); }
  scrollToTop();
  window.addEventListener('pageshow', function () {
    scrollToTop();
    requestAnimationFrame(scrollToTop);
  });

  var form = document.getElementById('promotion-form');
  if (!form) return;
  // URLで流入元を保持し、別タブやリロードでも旧LPのCTA履歴と混ぜない。
  var isNewPromotion = new URLSearchParams(location.search).get('cta') === 'new_lp_fees_promotion';

  var body = form.querySelector('.form-body');
  var notice = form.querySelector('.ineligible-message');
  var radios = form.querySelectorAll('input[name="promotion_status"]');

  function updateEligibility() {
    var selected = form.querySelector('input[name="promotion_status"]:checked');
    var eligible = selected && selected.value === 'new';
    var ineligible = selected && selected.value === 'ineligible';
    body.hidden = !eligible;
    notice.hidden = !ineligible;
  }

  Array.prototype.forEach.call(radios, function (radio) {
    radio.addEventListener('change', updateEligibility);
  });
  updateEligibility();

  form.addEventListener('submit', function (event) {
    var selected = form.querySelector('input[name="promotion_status"]:checked');
    if (!selected || selected.value !== 'new') {
      event.preventDefault();
      updateEligibility();
      if (!selected) radios[0].focus();
      return;
    }
    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }

    var last = '';
    var first = '';
    try {
      last = sessionStorage.getItem('lp_cta_last') || '';
      first = sessionStorage.getItem('lp_cta_first') || '';
    } catch (_) {}
    if (isNewPromotion) last = first = 'new_lp_fees_promotion';
    [['cta_last', last], ['cta_first', first]].forEach(function (entry) {
      var field = form.querySelector('input[name="' + entry[0] + '"]');
      if (!field) {
        field = document.createElement('input');
        field.type = 'hidden';
        field.name = entry[0];
        form.appendChild(field);
      }
      field.value = entry[1];
    });

    // 有効な送信だけを二重送信防止の対象にする。PHP側の完了画面へ
    // 通常送信するため、ここでは preventDefault は行わない。
    var submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-disabled', 'true');
      // 通常の出店相談予約フォームと同じく、送信中であることを明示する。
      submitButton.textContent = '送信中… 🚲';
    }
  });
}());
