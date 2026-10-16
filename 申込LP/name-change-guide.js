(() => {
  'use strict';
  document.querySelectorAll('[data-ng-form-entry]').forEach(link => {
    link.addEventListener('click', event => {
      const consideration = document.getElementById('hero-campaign-form');
      const form = consideration || document.getElementById(matchMedia('(max-width:768px)').matches ? 'mobile-cf-form' : 'hero-cf-form');
      const radio = consideration ? document.querySelector('input[name="hero-status"][value="name_change"]') : form?.querySelector('input[value="name_change"]');
      if (!form || !radio) return;
      event.preventDefault();
      radio.checked = true;
      radio.dispatchEvent(new Event('change', {bubbles:true}));
      ['cta_first','cta_last'].forEach(name => {
        let field = form.querySelector(`input[name="${name}"]`);
        if (!field) { field=document.createElement('input');field.type='hidden';field.name=name;form.append(field); }
        field.value='name_change_guide';
      });
      const panel=form.closest('.hero-step-card,.hv2-form-panel') || form;
      requestAnimationFrame(() => {
        panel.scrollIntoView({behavior:'smooth',block:'start'});
        const scroll=panel.querySelector('.hero-form-scroll,.old-hero-form-scroll');
        if(scroll) scroll.scrollTop=0;
        radio.focus({preventScroll:true});
      });
    });
  });
})();
