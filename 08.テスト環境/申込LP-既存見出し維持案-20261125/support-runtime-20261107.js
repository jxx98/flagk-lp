
/* FAQをアコーディオン化：1つ開いたら他は自動で閉じる */
(function(){
  var items = document.querySelectorAll('#faq .fq-item');
  items.forEach(function(item){
    item.addEventListener('toggle', function(){
      if (item.open) {
        items.forEach(function(other){
          if (other !== item) other.open = false;
        });
      }
    });
  });
})();


(function(){
  /* SUPPORTモバイルスライダー */
  if(window.matchMedia('(min-width: 769px)').matches) return;
  var grid = document.querySelector('.sp-grid');
  var cols = Array.prototype.slice.call(document.querySelectorAll('.sp-col'));
  if(!grid || cols.length < 2) return;
  var curIdx = 0;
  var noteEl = document.getElementById('sp-note');
  var ctrl = document.createElement('div'); ctrl.className = 'sp-slider-ctrl';
  /* 順序: grid → note → ctrl */
  if(noteEl){ noteEl.parentNode.insertBefore(ctrl, noteEl.nextSibling); }
  else { grid.parentNode.insertBefore(ctrl, grid.nextSibling); }
  var prevBtn = document.createElement('button'); prevBtn.className='sp-arrow'; prevBtn.textContent='←'; prevBtn.setAttribute('aria-label','前へ');
  var dotsEl = document.createElement('div'); dotsEl.className='sp-dots';
  var nextBtn = document.createElement('button'); nextBtn.className='sp-arrow'; nextBtn.textContent='→'; nextBtn.setAttribute('aria-label','次へ');
  ctrl.appendChild(prevBtn); ctrl.appendChild(dotsEl); ctrl.appendChild(nextBtn);
  var dots = cols.map(function(_,i){
    var btn = document.createElement('button');
    btn.className='sp-dot'+(i===0?' active':'');
    btn.addEventListener('click', function(){ goTo(i); });
    dotsEl.appendChild(btn); return btn;
  });
  function goTo(idx){ if(idx<0||idx>=cols.length) return; curIdx=idx; cols[idx].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}); refresh(); }
  function refresh(){
    dots.forEach(function(d,i){ d.classList.toggle('active',i===curIdx); });
    prevBtn.disabled=curIdx===0; nextBtn.disabled=curIdx===cols.length-1;
  }
  prevBtn.addEventListener('click', function(){ goTo(curIdx-1); });
  nextBtn.addEventListener('click', function(){ goTo(curIdx+1); });
  var ticking = false;
  grid.addEventListener('scroll', function(){
    if(ticking) return; ticking=true;
    requestAnimationFrame(function(){
      var center = grid.scrollLeft+grid.offsetWidth/2; var activeIdx=0,minDist=Infinity;
      cols.forEach(function(w,i){ var dist=Math.abs((w.offsetLeft+w.offsetWidth/2)-center); if(dist<minDist){minDist=dist;activeIdx=i;} });
      curIdx=activeIdx; refresh(); ticking=false;
    });
  });
  refresh();
})();


/* ヒーローフォーム：送信ボタン有効化 */
(function(){
  var form = document.getElementById('hero-cf-form');
  var btn  = document.getElementById('hero-submit-btn');
  if(!form || !btn) return;
  function update(){
    var noRadio = form.querySelector('input[name="h_new_store"][value="no"]');
    var noSelected = noRadio && noRadio.checked;
    var noMsg = document.getElementById('h-no-msg');
    var formBody = document.getElementById('h-form-body');
    if(noMsg) noMsg.classList.toggle('is-shown', noSelected);
    if(formBody) formBody.classList.toggle('is-hidden', noSelected);
    btn.disabled = !form.checkValidity() || noSelected;
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
})();

/* 郵便番号→住所自動入力 */
(function(){
  var zipEl  = document.getElementById('h-zip');
  var prefEl = document.getElementById('h-pref');
  var cityEl = document.getElementById('h-city');
  if(!zipEl || !prefEl || !cityEl) return;
  zipEl.addEventListener('input', function(){
    var raw = this.value.replace(/[^\d]/g,'');
    if(raw.length === 7){
      fetch('https://zipcloud.ibsnet.co.jp/api/search?zipcode=' + raw)
        .then(function(r){ return r.json(); })
        .then(function(d){
          if(d.results && d.results.length){
            var r = d.results[0];
            prefEl.value = r.address1;
            cityEl.value = r.address2 + r.address3;
            document.getElementById('hero-cf-form').dispatchEvent(new Event('input'));
          } else {
            prefEl.value = '';
            cityEl.value = '';
          }
        })
        .catch(function(){ prefEl.value = ''; cityEl.value = ''; });
    } else {
      prefEl.value = '';
      cityEl.value = '';
    }
  });
})();


/* モバイルフォーム：送信ボタン有効化 */
(function(){
  var form = document.getElementById('mobile-cf-form');
  var btn  = document.getElementById('mobile-submit-btn');
  if(!form || !btn) return;
  function update(){
    var noRadio = form.querySelector('input[name="m_new_store"][value="no"]');
    var noSelected = noRadio && noRadio.checked;
    var noMsg = document.getElementById('m-no-msg');
    var formBody = document.getElementById('m-form-body');
    if(noMsg) noMsg.classList.toggle('is-shown', noSelected);
    if(formBody) formBody.classList.toggle('is-hidden', noSelected);
    btn.disabled = !form.checkValidity() || noSelected;
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
})();

/* モバイルフォーム：郵便番号→住所自動入力 */
(function(){
  var zipEl  = document.getElementById('m-zip');
  var prefEl = document.getElementById('m-pref');
  var cityEl = document.getElementById('m-city');
  if(!zipEl || !prefEl || !cityEl) return;
  zipEl.addEventListener('input', function(){
    var raw = this.value.replace(/[^\d]/g,'');
    if(raw.length === 7){
      fetch('https://zipcloud.ibsnet.co.jp/api/search?zipcode=' + raw)
        .then(function(r){ return r.json(); })
        .then(function(d){
          if(d.results && d.results.length){
            var r = d.results[0];
            prefEl.value = r.address1;
            cityEl.value = r.address2 + r.address3;
            document.getElementById('mobile-cf-form').dispatchEvent(new Event('input'));
          } else { prefEl.value=''; cityEl.value=''; }
        })
        .catch(function(){ prefEl.value=''; cityEl.value=''; });
    } else { prefEl.value=''; cityEl.value=''; }
  });
})();


/* ===== サポートカード 行高さ揃え ===== */
(function(){
  function equalizeSpItems(){
    var cols = document.querySelectorAll('.sp-items');
    if(cols.length < 2) return;
    /* リセット */
    document.querySelectorAll('.sp-item').forEach(function(el){
      el.style.minHeight = '';
    });
    /* モバイルは不要 */
    if(window.matchMedia('(max-width: 768px)').matches) return;
    /* 列数分のアイテム数の最大値 */
    var maxLen = 0;
    cols.forEach(function(c){ if(c.children.length > maxLen) maxLen = c.children.length; });
    /* 行ごとにアイテムをまとめる */
    var rows = [];
    for(var i = 0; i < maxLen; i++){
      var rowItems = [];
      cols.forEach(function(c){ if(c.children[i]) rowItems.push(c.children[i]); });
      rows.push(rowItems);
    }
    /* 読み取りをまとめて行う（強制リフロー回避） */
    var heights = rows.map(function(rowItems){
      return Math.max.apply(null, rowItems.map(function(el){ return el.offsetHeight; }));
    });
    /* 書き込みをまとめて行う */
    rows.forEach(function(rowItems, idx){
      var maxH = heights[idx];
      rowItems.forEach(function(el){ el.style.minHeight = maxH + 'px'; });
    });
  }
  window.addEventListener('load', equalizeSpItems);
  window.addEventListener('resize', equalizeSpItems);
})();


/* ===== Cookie同意バナー ===== */
(function(){
  var KEY = 'cookie_consent_v1';
  if(localStorage.getItem(KEY)) return; /* 既に同意済み */
  var banner = document.getElementById('cookie-banner');
  if(!banner) return;

  setTimeout(function(){
    banner.classList.add('cookie-show');
  }, 1000);

  document.getElementById('cookie-accept-btn').addEventListener('click', function(){
    localStorage.setItem(KEY, '1');
    banner.classList.remove('cookie-show');
    setTimeout(function(){ banner.style.display='none'; }, 400);
  });
})();


/* ===== LINE QRモーダル（PC専用） ===== */
(function(){
  var modal = document.getElementById('line-qr-modal');
  var closeBtn = document.getElementById('lq-close-btn');
  if(!modal) return;

  function openLineModal(e){
    /* PC（769px以上）のみモーダル、モバイルはLINEに直接遷移 */
    if(window.matchMedia('(max-width: 768px)').matches) return;
    e.preventDefault();
    modal.classList.add('lq-open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    modal.classList.remove('lq-open');
    document.body.style.overflow = '';
  }

  /* ヘッダーLINEボタン */
  var hdBtn = document.querySelector('.hd-btns a');
  if(hdBtn) hdBtn.addEventListener('click', openLineModal);

  /* Final CTAカードのLINEボタン */
  var fcBtn = document.querySelector('#final-cta .fc-btn[href*="lin.ee"]');
  if(fcBtn) fcBtn.addEventListener('click', openLineModal);

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });
})();


(function(){
  var messages = {
    hero:     '担当者より平日9:30〜18:30の営業時間内に順次ご連絡いたします。\n土日・祝日にいただいたお問い合わせは、翌営業日より順次ご連絡いたします。',
    mobile:   '担当者より平日9:30〜18:30の営業時間内に順次ご連絡いたします。\n土日・祝日にいただいたお問い合わせは、翌営業日より順次ご連絡いたします。'
  };
  var sent = new URLSearchParams(location.search).get('sent');
  if (sent && messages[sent]) {
    // 旧sentパラメータだけではCVを計測しない。成功後のthanks.htmlで計測する。
    var modal = document.getElementById('lp-modal');
    document.getElementById('lp-modal-msg').innerText = messages[sent];
    modal.style.display = 'flex';
    modal.addEventListener('click', function(e){ if(e.target===modal){ modal.style.display='none'; history.replaceState(null,'',location.pathname); } });
  }
})();


(function(){
  var floatEl = document.getElementById('cp-float');
  var closeBtn = document.getElementById('cp-float-close-btn');
  if (!floatEl || !closeBtn) return;

  var DISMISSED_KEY = 'lp_promotion_pc_float_dismissed';
  var dismissed = false;
  try { dismissed = sessionStorage.getItem(DISMISSED_KEY) === '1'; } catch(e){}

  if (!dismissed) floatEl.classList.add('cp-float-show');

  closeBtn.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    dismissed = true;
    try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch(e){}
    floatEl.classList.remove('cp-float-show');
  });
})();


(function(){
  var floatEl = document.getElementById('cp-mfloat');
  var closeBtn = document.getElementById('cp-mfloat-close-btn');
  var bar = document.querySelector('.mb-bar');
  if (!floatEl) return;

  var DISMISSED_KEY = 'lp_promotion_mobile_float_dismissed';
  var dismissed = false;
  try { dismissed = sessionStorage.getItem(DISMISSED_KEY) === '1'; } catch(e){}

  // 固定バーとバナーの位置はCSSで確保し、読み込み後の位置変更を避ける。

  // モバイルではページ表示直後から常時表示する（閉じた後を除く）
  if (!dismissed) floatEl.classList.add('cp-mfloat-show');

  // ヒーローフォームの入力中は、キーボード表示時でも入力欄を隠さないよう
  // プロモーションバナーを一時的に退避する。
  var mobileForm = document.getElementById('mobile-cf-form');
  if (mobileForm) {
    mobileForm.addEventListener('focusin', function(){
      floatEl.classList.add('cp-mfloat-input-focus');
      if (bar) bar.classList.add('mb-bar-input-focus');
    });
    mobileForm.addEventListener('focusout', function(){
      window.setTimeout(function(){
        if (!mobileForm.contains(document.activeElement)) {
          floatEl.classList.remove('cp-mfloat-input-focus');
          if (bar) bar.classList.remove('mb-bar-input-focus');
        }
      }, 0);
    });
  }

  closeBtn.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    dismissed = true;
    try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch(e){}
    floatEl.classList.remove('cp-mfloat-show');
  });
})();


(function(){
  var KEY_LAST  = 'lp_cta_last';   // 最後にクリックしたCTA
  var KEY_FIRST = 'lp_cta_first';  // 最初にクリックしたCTA

  /* [セレクタ, cta_id, 日本語ラベル] */
  var CTA_MAP = [
    /* ▼ 屋号・店舗名変更の相談 */
    ['.hv2-pc-banner',                 'promotion_pc_hero_banner', '屋号・店舗名変更：PCヒーローバナー'],
    ['#cp-float a',                    'promotion_pc_float',       '初期費用0円：PC右下フローティング'],
    ['#cp-mfloat a',                   'promotion_mobile_float',   '初期費用0円：モバイル固定バナー'],
    /* ▼ 通常CTA */
    ['.hd-tel-link',                   'header_tel',          'ヘッダー：お電話で出店申込'],
    ['.hd-btn',                        'header_line',         'ヘッダー：LINE相談'],
    ['.hv2-cta',                       'hero_apply',          'ヒーロー：Uber Eatsの出店申込に進む'],
    ['.fl-cta',                        'flow_contact',        '出店申込から店舗登録までの流れ：問い合わせる'],
    ['.cs-cta-yb',                     'stats_tel',           '実績セクション：出店申込フォームへ'],
    ['.fc-btn--featured',              'final_campaign',      '最終CTA：キャンペーン確認'],
    ['.fc-btn[href="tel-reservation/#form"]','final_tel',      '最終CTA：電話で出店申込'],
    ['.fc-btn[href*="lin.ee"]',        'final_line',          '最終CTA：LINE相談'],
    ['.mb-col--tel',                   'mobile_bar_tel',      'モバイル下部バー：電話申込予約'],
    ['.mb-col--camp',                  'mobile_bar_campaign', 'モバイル下部バー：特典確認'],
    ['.mb-col--line',                  'mobile_bar_line',     'モバイル下部バー：LINE相談'],
    ['.lq-btn',                        'line_qr',             'LINE QRセクション：LINEで相談']
  ];

  /* 閉じるボタン：CVには繋がらないので流入元としては保存しない。 */
  var CLOSE_MAP = [
    ['#cp-float-close-btn',   'promotion_pc_float_close',      '初期費用0円：PC右下フローティングを閉じた'],
    ['#cp-mfloat-close-btn',  'promotion_mobile_float_close',  '初期費用0円：モバイル固定バナーを閉じた']
  ];

  function send(id, label){
    if (typeof gtag === 'function') {
      gtag('event', 'cta_click', { cta_id: id, cta_label: label, send_to: 'G-VLQG12Y4E5' });
    }
  }

  /* CV導線に繋がるクリック：イベント送信＋流入元を保存 */
  function track(id, label){
    send(id, label);
    try {
      sessionStorage.setItem(KEY_LAST, id);
      if (!sessionStorage.getItem(KEY_FIRST)) sessionStorage.setItem(KEY_FIRST, id);
    } catch(e){}
  }

  function bind(list, handler){
    list.forEach(function(row){
      var sel = row[0], id = row[1], label = row[2];
      Array.prototype.forEach.call(document.querySelectorAll(sel), function(el){
        el.addEventListener('click', function(){ handler(id, label); });
      });
    });
  }

  bind(CTA_MAP, track);
  bind(CLOSE_MAP, send);

  /* フォーム送信時に流入元を hidden で同送（お問い合わせメールに記載される） */
  Array.prototype.forEach.call(document.querySelectorAll('form[action$="mail.php"]'), function(form){
    form.addEventListener('submit', function(){
      var last = '', first = '';
      try {
        last  = sessionStorage.getItem(KEY_LAST)  || '';
        first = sessionStorage.getItem(KEY_FIRST) || '';
      } catch(e){}
      [['cta_last', last], ['cta_first', first]].forEach(function(pair){
        if (form.querySelector('input[name="' + pair[0] + '"]')) return;
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = pair[0];
        input.value = pair[1];
        form.appendChild(input);
      });
    });
  });
})();


/* 二重送信防止：送信は遅らせず、押下直後にボタンだけをロック */
(function(){
  var forms = document.querySelectorAll('form[action$="mail.php"]');

  function resetForm(form){
    if(form.getAttribute('data-submitting') !== 'true') return;
    var button = (form.querySelector('button[type="submit"]') || document.querySelector('button[form="' + form.id + '"]'));
    var label = button && (button.querySelector('[data-submit-label]') || button);
    form.removeAttribute('data-submitting');
    if(button){
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
    if(label && label.dataset.originalText){
      label.textContent = label.dataset.originalText;
    }
  }

  Array.prototype.forEach.call(forms, function(form){
    var button = (form.querySelector('button[type="submit"]') || document.querySelector('button[form="' + form.id + '"]'));
    if(!button) return;

    var label = button.querySelector('span[id$="-btn-text"]') || button;
    if(label) label.setAttribute('data-submit-label', '');

    form.addEventListener('submit', function(event){
      if(event.defaultPrevented) return;
      label = button.querySelector('[data-submit-label], span[id$="-btn-text"]') || button;
      if(form.getAttribute('data-submitting') === 'true'){
        event.preventDefault();
        return;
      }

      form.setAttribute('data-submitting', 'true');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      if(label){
        label.dataset.originalText = label.textContent;
        label.textContent = '送信中…';
      }
    });
  });

  window.addEventListener('pageshow', function(){
    Array.prototype.forEach.call(forms, resetForm);
  });
})();


(function(){
  var LINE_CONVERSION_SEND_TO = 'AW-18173726920/h1tZCMCfuOIcEMih9NlD';

  function sendLineConversion(){
    if (typeof gtag !== 'function') return;
    gtag('event', 'conversion', {
      'send_to': LINE_CONVERSION_SEND_TO,
      'value': 1.0,
      'currency': 'JPY'
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('a[href*="lin.ee"]'), function(link){
    link.addEventListener('click', function(){
      /* PCではヘッダー／最終CTAはQRモーダルを開くだけのため、実際のLINE遷移は計測しない。 */
      if (link.classList.contains('lq-btn') || window.matchMedia('(max-width: 768px)').matches) {
        sendLineConversion();
      }
    });
  });
})();


(function(){var button=document.getElementById('lp-modal-close');if(button)button.addEventListener('click',function(){document.getElementById('lp-modal').style.display='none';history.replaceState(null,'',location.pathname);});})();
