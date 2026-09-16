(() => {
  document.querySelectorAll('.contact-form').forEach((form) => {
    const radios = form.querySelectorAll('input[name="status"]');
    const body = form.querySelector('.form-body');
    const notice = form.querySelector('.ineligible-message');
    const complete = form.querySelector('.form-complete');
    const updateEligibility = () => {
      const selected = form.querySelector('input[name="status"]:checked');
      const ineligible = selected && selected.value !== 'new';
      if (notice) notice.hidden = !ineligible;
      if (body) body.hidden = Boolean(ineligible);
    };
    radios.forEach((radio) => radio.addEventListener('change', updateEligibility));
    updateEligibility();
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const selected = form.querySelector('input[name="status"]:checked');
      if (!selected || selected.value !== 'new') { updateEligibility(); return; }
      if (!form.checkValidity()) { form.reportValidity(); return; }
      form.querySelector('.form-fieldset').hidden = true;
      if (body) body.hidden = true;
      if (notice) notice.hidden = true;
      if (complete) complete.hidden = false;
    });
  });
})();
