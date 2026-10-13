/* NeuroAIQ V4 site behaviour. No dependencies.
   1. Motion: reveals elements as they enter view (draw, light, settle; see site.css section 13)
   2. Header: shadow once the page scrolls, mobile menu, reading progress on articles
   3. Filters (Executive Insights, Case Studies)
   4. Tabs (Events)
   5. Preferred-time picker (Contact, until a Calendly link is configured)
   6. Enquiry form
   Every page works without this file: content is visible by default and every link goes somewhere. */
(function () {
  'use strict';
  window.__nqReady = true;

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* Replays a one-off entrance animation on an element. */
  function enter(el, delay) {
    if (!el || reduceMotion.matches) return;
    el.classList.remove('is-entering');
    void el.offsetWidth;
    if (delay) el.style.setProperty('--enter-d', delay + 'ms'); else el.style.removeProperty('--enter-d');
    el.classList.add('is-entering');
  }
  document.addEventListener('animationend', function (e) {
    if (e.target.classList && e.target.classList.contains('is-entering')) e.target.classList.remove('is-entering');
  });

  /* ---------- 1. Motion ---------- */
  var LIST_ROWS = '.numbered > li, .outcomes > li, .people > li, .credentials > li, .fog-list > li, .partners > li, .covers > li, .ledger-col li, .steps > li, .ticks > li, .board-qs > p';
  var REVEAL = '.rv, .rv-path, .rv-wipe, .rv-photo, .rule, .eyebrow, .mark, .vpath, .closing-mark, .lead-bracket, .lead-drive, .leader__quote, .case-quotes figure, ' + LIST_ROWS;
  var STAGGER = 90;   // ms between elements that enter view together
  var MAX_STEPS = 7;

  function initMotion() {
    // Number the steps of every pathway so they draw in causal order.
    $$('.path').forEach(function (path) {
      Array.prototype.forEach.call(path.children, function (step, i) { step.style.setProperty('--i', i); });
    });
    // Authored delays (data-d="120") for page-load sequences.
    $$('[data-d]').forEach(function (el) { el.style.setProperty('--d', el.getAttribute('data-d') + 'ms'); });

    if (!root.classList.contains('js-motion')) return;
    if (!('IntersectionObserver' in window)) { root.classList.remove('js-motion'); return; }

    var revealedAt = new WeakMap();
    var io = new IntersectionObserver(function (entries) {
      var now = performance.now();
      // Elements arriving together are revealed in reading order: top to bottom, then left to right.
      var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) {
        var r = e.boundingClientRect;
        return { el: e.target, row: Math.round(r.top / 24), left: r.left };
      });
      batch.sort(function (a, b) { return (a.row - b.row) || (a.left - b.left); });
      batch.forEach(function (item, k) {
        var el = item.el;
        io.unobserve(el);
        var after = el.getAttribute('data-after');
        if (after) {
          // Timed from when its anchor appeared (data-after="selector", data-d="ms after it"),
          // so the sequence holds however fast the visitor scrolls.
          var anchor = $(after);
          var start = anchor && revealedAt.get(anchor);
          var d = Number(el.getAttribute('data-d') || 0);
          el.style.setProperty('--d', Math.round(start === undefined ? d : Math.max(0, start + d - now)) + 'ms');
        } else if (!el.hasAttribute('data-d')) {
          el.style.setProperty('--d', Math.min(k, MAX_STEPS) * STAGGER + 'ms');
        }
        revealedAt.set(el, now);
        el.classList.add('in');
      });
    // Any part inside the lower edge counts, so even an element taller than the screen reveals.
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

    $$(REVEAL).forEach(function (el) { io.observe(el); });

    // If the visitor switches reduced motion on mid-visit, show everything at once.
    var stop = function () { if (reduceMotion.matches) { io.disconnect(); root.classList.remove('js-motion'); } };
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', stop); else if (reduceMotion.addListener) reduceMotion.addListener(stop);
  }

  /* ---------- 2. Header ---------- */
  function initHeader() {
    var header = $('.site-header');
    if (!header) return;

    // Shadow once the page has scrolled.
    if ('IntersectionObserver' in window) {
      var sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none';
      document.body.insertBefore(sentinel, document.body.firstChild);
      new IntersectionObserver(function (entries) {
        header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
      }).observe(sentinel);
    }

    // Mobile menu.
    var toggle = $('.nav-toggle', header);
    var nav = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
    if (toggle && nav) {
      var set = function (open) { header.classList.toggle('nav-open', open); toggle.setAttribute('aria-expanded', String(open)); };
      toggle.addEventListener('click', function () { set(toggle.getAttribute('aria-expanded') !== 'true'); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && header.classList.contains('nav-open')) { set(false); toggle.focus(); }
      });
      nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
      var wide = window.matchMedia('(min-width: 1061px)');
      var onWide = function (e) { if (e.matches) set(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide); else wide.addListener(onWide);
    }

    // Reading progress on articles: a gold line under the header extends as the article is read.
    var prose = $('.prose');
    if (prose) {
      var bar = document.createElement('div');
      bar.className = 'read-progress';
      bar.setAttribute('aria-hidden', 'true');
      bar.appendChild(document.createElement('span'));
      header.appendChild(bar);
      var ticking = false;
      var update = function () {
        ticking = false;
        var r = prose.getBoundingClientRect();
        var p = (window.innerHeight * 0.5 - r.top) / r.height;
        bar.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(4));
      };
      var queue = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      window.addEventListener('scroll', queue, { passive: true });
      window.addEventListener('resize', queue);
      update();
    }
  }

  /* ---------- 3. Filters ---------- */
  function initFilters() {
    $$('[data-filters]').forEach(function (box) {
      var grid = $(box.getAttribute('data-filters'));
      if (!grid) return;
      var items = Array.prototype.slice.call(grid.children);
      var rows = $$('[data-key]', box);
      var status = $('[data-filter-status]', box);
      var empty = $('[data-filter-empty]', grid.parentElement);
      var reset = $('[data-filter-reset]', grid.parentElement);
      var noun = grid.getAttribute('data-noun') || 'items';
      var state = {};

      function press(row, value) {
        $$('.chip', row).forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-value') === value)); });
        state[row.getAttribute('data-key')] = value;
      }
      function apply(animate) {
        var shown = 0;
        items.forEach(function (item) {
          var ok = Object.keys(state).every(function (key) {
            return state[key] === 'all' || (item.getAttribute('data-' + key) || '').split(' ').indexOf(state[key]) !== -1;
          });
          item.hidden = !ok;
          if (ok) {
            item.classList.add('in');
            if (animate) enter(item, Math.min(shown, 8) * 45);
            shown++;
          }
        });
        if (empty) { var wasHidden = empty.hidden; empty.hidden = shown > 0; if (wasHidden && !empty.hidden && animate) enter(empty); }
        if (status) status.textContent = shown === items.length
          ? 'Showing all ' + items.length + ' ' + noun
          : 'Showing ' + shown + ' of ' + items.length + ' ' + noun;
      }
      rows.forEach(function (row) {
        state[row.getAttribute('data-key')] = 'all';
        row.addEventListener('click', function (e) {
          var chip = e.target.closest('.chip');
          if (!chip || chip.getAttribute('aria-pressed') === 'true') return;
          press(row, chip.getAttribute('data-value'));
          apply(true);
        });
      });
      if (reset) reset.addEventListener('click', function () {
        rows.forEach(function (row) { press(row, 'all'); });
        apply(true);
        var first = $('.chip', box);
        if (first) first.focus();
      });
      apply(false);
    });
  }

  /* ---------- 4. Tabs ---------- */
  function initTabs() {
    $$('[role="tablist"]').forEach(function (list) {
      var tabs = $$('[role="tab"]', list);
      var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];

      function ink(tab) {
        list.style.setProperty('--ink-x', tab.offsetLeft + 'px');
        list.style.setProperty('--ink-w', tab.offsetWidth + 'px');
      }
      function select(tab, focus) {
        if (tab === current) { if (focus) tab.focus(); return; }
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) { panel.hidden = !on; if (on) enter(panel); }
        });
        current = tab;
        ink(tab);
        if (focus) tab.focus();
      }

      list.addEventListener('click', function (e) {
        var tab = e.target.closest('[role="tab"]');
        if (!tab) return;
        select(tab);
        if (history.replaceState) history.replaceState(null, '', '#' + tab.id.replace('tab-', ''));
      });
      list.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        var next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) { e.preventDefault(); select(tabs[next], true); }
      });

      var fromHash = tabs.filter(function (t) { return '#' + t.id.replace('tab-', '') === location.hash; })[0];
      if (fromHash && fromHash !== current) {
        tabs.forEach(function (t) {
          var on = t === fromHash;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
        current = fromHash;
      }
      ink(current);
      // Let the first position land before the indicator starts animating between tabs.
      requestAnimationFrame(function () { requestAnimationFrame(function () { list.classList.add('ink-ready'); }); });
      window.addEventListener('resize', function () { ink(current); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ink(current); });
    });
  }

  /* ---------- 5. Preferred-time picker ----------
     It books nothing by itself: the chosen slot is written into the enquiry form, and NeuroAIQ confirms by email. */
  function initBooking() {
    var box = $('[data-booking]');
    var calEl = box && $('[data-cal]', box);
    var slotsEl = box && $('[data-slots]', box);
    if (!calEl || !slotsEl) return;

    var SLOTS = ['9:00am', '9:30am', '10:00am', '10:30am', '11:00am', '11:30am', '1:00pm', '1:30pm', '2:00pm', '2:30pm', '3:00pm', '3:30pm'];
    var DAYS_AHEAD = 60;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var first = addDays(today, 1);
    var last = addDays(today, DAYS_AHEAD);
    var view = new Date(first.getFullYear(), first.getMonth(), 1);
    var selDate = null;
    var selSlot = null;
    var initialSlots = slotsEl.innerHTML;
    var fmtMonth = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' });
    var fmtDay = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
    var fmtFull = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function isOpen(d) { return d >= first && d <= last && d.getDay() !== 0 && d.getDay() !== 6; }
    function same(a, b) { return !!a && !!b && a.getTime() === b.getTime(); }

    function renderCal(focusDate, focusNav, animate) {
      var y = view.getFullYear(), m = view.getMonth();
      var offset = (new Date(y, m, 1).getDay() + 6) % 7;
      var count = new Date(y, m + 1, 0).getDate();
      var prevOk = new Date(y, m, 0) >= first;
      var nextOk = new Date(y, m + 1, 1) <= last;
      var html = '<div class="cal__head"><p class="cal__month" aria-live="polite">' + fmtMonth.format(view) + '</p>' +
        '<div class="cal__nav"><button type="button" data-month="-1" aria-label="Previous month"' + (prevOk ? '' : ' disabled') + '>&larr;</button>' +
        '<button type="button" data-month="1" aria-label="Next month"' + (nextOk ? '' : ' disabled') + '>&rarr;</button></div></div>' +
        '<div class="cal__grid" role="group" aria-label="Dates in ' + fmtMonth.format(view) + '">';
      ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach(function (d) { html += '<span class="cal__dow" aria-hidden="true">' + d + '</span>'; });
      for (var i = 0; i < offset; i++) html += '<span class="cal__day cal__day--blank" aria-hidden="true"></span>';
      for (var d = 1; d <= count; d++) {
        var date = new Date(y, m, d);
        var open = isOpen(date);
        html += '<button type="button" class="cal__day" data-day="' + d + '" tabindex="-1" aria-pressed="' + same(date, selDate) + '"' +
          ' aria-label="' + fmtFull.format(date) + (open ? '' : ', unavailable') + '"' + (open ? '' : ' disabled') + '>' + d + '</button>';
      }
      calEl.innerHTML = html + '</div>';
      if (animate) enter($('.cal__grid', calEl));

      var days = $$('button.cal__day:not(:disabled)', calEl);
      var target = null;
      if (focusDate && focusDate.getMonth() === m) target = $('[data-day="' + focusDate.getDate() + '"]', calEl);
      if (!target || target.disabled) target = days.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || days[0];
      if (target) target.tabIndex = 0;
      if (focusDate && target) target.focus();
      if (focusNav) {
        var nav = $('[data-month="' + focusNav + '"]', calEl);
        if (nav && nav.disabled) nav = $('[data-month="' + (-focusNav) + '"]', calEl);
        if (nav) nav.focus();
      }
    }

    function renderSlots(animate, focusNext) {
      if (!selDate) { slotsEl.innerHTML = initialSlots; return; }
      var html = '<p class="slots__date">' + fmtDay.format(selDate) + '</p><p class="slots__sub">30-minute slots, Melbourne time</p>' +
        '<ul class="slots' + (animate ? ' slots--enter' : '') + '">';
      SLOTS.forEach(function (s, k) {
        if (s === selSlot) {
          html += '<li class="slot-pick" style="--k:' + k + '"><button type="button" class="slot" data-slot="' + s + '" aria-pressed="true">' + s + '</button>' +
            '<button type="button" class="slot-next" data-next>Next<span class="sr-only">: add your details</span></button></li>';
        } else {
          html += '<li style="--k:' + k + '"><button type="button" class="slot" data-slot="' + s + '" aria-pressed="false">' + s + '</button></li>';
        }
      });
      slotsEl.innerHTML = html + '</ul><p class="slots__hint">Next: name, work email and what you&rsquo;d like to cover.</p>';
      if (focusNext) { var n = $('[data-next]', slotsEl); if (n) n.focus(); }
    }

    function dateOf(btn) { return new Date(view.getFullYear(), view.getMonth(), Number(btn.getAttribute('data-day'))); }

    calEl.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-month]');
      if (nav && !nav.disabled) {
        var dir = Number(nav.getAttribute('data-month'));
        view = new Date(view.getFullYear(), view.getMonth() + dir, 1);
        renderCal(null, dir, true);
        return;
      }
      var day = e.target.closest('button.cal__day');
      if (day && !day.disabled) {
        var picked = dateOf(day);
        if (same(picked, selDate)) return;
        selDate = picked;
        selSlot = null;
        renderCal(selDate);
        renderSlots(true);
      }
    });

    calEl.addEventListener('keydown', function (e) {
      var day = e.target.closest('button.cal__day');
      if (!day) return;
      var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[e.key];
      if (!step) return;
      e.preventDefault();
      var d = addDays(dateOf(day), step);
      while (d >= first && d <= last && !isOpen(d)) d = addDays(d, step > 0 ? 1 : -1);
      if (!isOpen(d)) return;
      var changed = d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear();
      if (changed) view = new Date(d.getFullYear(), d.getMonth(), 1);
      renderCal(d, null, changed);
    });

    slotsEl.addEventListener('click', function (e) {
      var slot = e.target.closest('[data-slot]');
      if (slot) { selSlot = slot.getAttribute('data-slot'); renderSlots(false, true); return; }
      if (e.target.closest('[data-next]')) {
        var host = $('input[name="host"]:checked', box);
        var where = $('input[name="location"]:checked', box);
        var text = fmtDay.format(selDate) + ', ' + selSlot + ' Melbourne time' +
          (where ? ' · ' + where.value : '') + (host ? ' · with ' + host.value : '');
        var form = $('[data-enquiry]');
        if (form) form.dispatchEvent(new CustomEvent('preferred-time', { detail: text }));
      }
    });

    renderCal();
  }

  /* ---------- 6. Enquiry form ----------
     With data-endpoint set, it POSTs JSON there. Without one, it opens the visitor's email app with the enquiry written out. */
  function initForm() {
    var form = $('[data-enquiry]');
    if (!form) return;
    var email = form.getAttribute('data-email');
    var status = $('[data-form-status]', form);
    var submit = $('[type="submit"]', form);
    var typeSel = form.elements.enquiry_type;
    var pref = $('[data-preferred]', form);
    var prefText = $('[data-preferred-text]', form);
    var prefInput = form.elements.preferred_time;
    var MESSAGES = {
      first_name: 'Enter your first name.',
      last_name: 'Enter your last name.',
      email: 'Enter your work email.',
      organisation: 'Enter your organisation.',
      phone: 'Enter a phone number.',
      enquiry_type: 'Choose the nature of your enquiry.',
      message: 'Tell us briefly what you would like to discuss.'
    };

    var preset = new URLSearchParams(location.search).get('enquiry');
    if (preset && /^[a-z-]+$/.test(preset) && $('option[value="' + preset + '"]', typeSel)) typeSel.value = preset;

    function setStatus(text, tone, withEmail) {
      status.textContent = text;
      if (withEmail) {
        var a = document.createElement('a');
        a.href = 'mailto:' + email;
        a.textContent = email;
        status.appendChild(document.createTextNode(' '));
        status.appendChild(a);
        status.appendChild(document.createTextNode('.'));
      }
      if (tone) status.setAttribute('data-tone', tone); else status.removeAttribute('data-tone');
      if (text) enter(status);
    }

    function check(el) {
      var field = el.closest('.field');
      var err = field && $('.field__error', field);
      var msg = '';
      if (el.validity.valueMissing) msg = MESSAGES[el.name] || 'This field is required.';
      else if (el.validity.typeMismatch) msg = 'Enter an email address like name@organisation.com.au.';
      else if (el.validity.patternMismatch) msg = 'Enter a phone number using digits, for example 412 345 678.';
      if (field) { if (msg) field.setAttribute('data-invalid', ''); else field.removeAttribute('data-invalid'); }
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err && err.textContent !== msg) { err.textContent = msg; if (msg) enter(err); }
      return !msg;
    }

    function setPreferred(text) {
      var wasHidden = pref.hidden;
      prefInput.value = text || '';
      prefText.textContent = text || '';
      pref.hidden = !text;
      if (text && wasHidden) enter(pref);
    }

    form.addEventListener('preferred-time', function (e) {
      setPreferred(e.detail);
      typeSel.value = 'discovery';
      check(typeSel);
      document.getElementById('enquiry').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      form.elements.first_name.focus({ preventScroll: true });
    });
    $('[data-preferred-clear]', form).addEventListener('click', function () { setPreferred(''); typeSel.focus(); });

    form.addEventListener('focusout', function (e) {
      var el = e.target;
      if (el.required && (el.getAttribute('aria-invalid') === 'true' || el.value)) check(el);
    });
    form.addEventListener('change', function (e) { if (e.target.getAttribute('aria-invalid') === 'true') check(e.target); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalid = $$('[required]', form).filter(function (el) { return !check(el); });
      if (invalid.length) {
        setStatus('Please check the ' + (invalid.length === 1 ? 'highlighted field.' : invalid.length + ' highlighted fields.'), 'error');
        invalid[0].focus();
        return;
      }
      if (form.elements.website.value) { form.reset(); setPreferred(''); setStatus('Thank you. Your enquiry has been sent.'); return; }

      var f = form.elements;
      var data = {
        first_name: f.first_name.value.trim(),
        last_name: f.last_name.value.trim(),
        email: f.email.value.trim(),
        organisation: f.organisation.value.trim(),
        phone: '+61 ' + f.phone.value.trim(),
        enquiry_type: typeSel.options[typeSel.selectedIndex].text,
        preferred_time: f.preferred_time.value,
        role: f.role.value,
        org_size: f.org_size.value,
        adoption_stage: f.adoption_stage.value,
        message: f.message.value.trim(),
        page: location.href.split('?')[0]
      };

      var endpoint = form.getAttribute('data-endpoint');
      if (endpoint) {
        submit.disabled = true;
        setStatus('Sending your enquiry…');
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            form.reset(); setPreferred('');
            setStatus('Thank you. Your enquiry has been sent, and we will reply within two business days.');
          })
          .catch(function () { setStatus('Your enquiry could not be sent. Please email us at', 'error', true); })
          .then(function () { submit.disabled = false; });
        return;
      }

      var lines = [
        'Name: ' + data.first_name + ' ' + data.last_name,
        'Work email: ' + data.email,
        'Organisation: ' + data.organisation,
        'Phone: ' + data.phone,
        'Nature of enquiry: ' + data.enquiry_type
      ];
      if (data.preferred_time) lines.push('Preferred time: ' + data.preferred_time);
      if (data.role) lines.push('Role: ' + data.role);
      if (data.org_size) lines.push('Organisation size: ' + data.org_size);
      if (data.adoption_stage) lines.push('AI adoption stage: ' + data.adoption_stage);
      lines.push('', data.message);
      var subject = 'Website enquiry: ' + data.enquiry_type + ' (' + data.organisation + ')';
      window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      setStatus('Your email app should open with the enquiry ready to send. If it does not, email us at', null, true);
    });
  }

  initMotion();
  initHeader();
  initFilters();
  initTabs();
  initBooking();
  initForm();
})();
