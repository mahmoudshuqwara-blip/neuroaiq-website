/* NeuroAIQ site behaviour. No dependencies, no build step.
   Every feature checks its markup exists first, so this one file serves all pages. */
(function () {
  'use strict';
  var doc = document;
  doc.documentElement.classList.add('js');

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }

  /* ── footer year ── */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ── mobile navigation ── */
  var toggle = $('.nav-toggle'), nav = $('#site-nav');
  if (toggle && nav) {
    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    }
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  }

  /* ── Executive Insights filters ──
     Articles carry one business priority (data-topic). A leadership role maps to
     the priorities its readers care about; both filters must match. */
  var ROLE_TOPICS = {
    'Leading the business': ['Leadership', 'Technology investment'],
    'Leading AI adoption and operations': ['Technology investment', 'Governance and risk'],
    'Leading workforce capability': ['Workforce capability']
  };
  var list = $('[data-filter-list]');
  if (list) {
    var state = { topic: 'All', role: 'All' };
    var empty = $('[data-filter-empty]');
    function apply() {
      var shown = 0;
      $$('[data-topic]', list).forEach(function (card) {
        var t = card.getAttribute('data-topic');
        var okTopic = state.topic === 'All' || t === state.topic;
        var okRole = state.role === 'All' || (ROLE_TOPICS[state.role] || []).indexOf(t) !== -1;
        card.hidden = !(okTopic && okRole);
        if (!card.hidden) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
    }
    $$('[data-filter-group]').forEach(function (group) {
      var key = group.getAttribute('data-filter-group');
      $$('[data-filter]', group).forEach(function (btn) {
        btn.addEventListener('click', function () {
          state[key] = btn.getAttribute('data-filter');
          $$('[data-filter]', group).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
          apply();
        });
      });
    });
  }

  /* ── Events tabs (WAI-ARIA tabs pattern, manual activation) ── */
  var tablist = $('[role="tablist"]');
  if (tablist) {
    var tabs = $$('[role="tab"]', tablist);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = doc.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  }

  /* ── shared field validation ── */
  var MESSAGES = {
    valueMissing: 'Please fill this in.',
    typeMismatch: 'Please enter a valid email address.',
    patternMismatch: 'Please enter a valid Australian phone number.',
    tooShort: 'Please add a little more detail (at least 10 characters).'
  };
  function fieldError(input) {
    var v = input.validity;
    if (v.valid) return '';
    if (v.valueMissing && input.tagName === 'SELECT') return 'Please choose an option.';
    for (var k in MESSAGES) { if (v[k]) return MESSAGES[k]; }
    return 'Please check this field.';
  }
  function showError(input, msg) {
    var field = input.closest('.field');
    var id = input.id + '-error';
    var el = doc.getElementById(id);
    if (msg) {
      if (!el) {
        el = doc.createElement('p');
        el.className = 'error';
        el.id = id;
        field.appendChild(el);
      }
      el.textContent = msg;
      input.setAttribute('aria-invalid', 'true');
      var by = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (by.indexOf(id) === -1) by.push(id);
      input.setAttribute('aria-describedby', by.join(' '));
    } else if (el) {
      el.remove();
      input.removeAttribute('aria-invalid');
      var rest = (input.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== id; });
      if (rest.length) input.setAttribute('aria-describedby', rest.join(' ')); else input.removeAttribute('aria-describedby');
    }
  }
  function validate(form) {
    var bad = [];
    $$('input, select, textarea', form).forEach(function (input) {
      if (input.closest('.hp')) return;
      var msg = fieldError(input);
      showError(input, msg);
      if (msg) bad.push(input);
    });
    return bad;
  }
  function liveCheck(form) {
    $$('input, select, textarea', form).forEach(function (input) {
      input.addEventListener('blur', function () { if (input.value || input.hasAttribute('aria-invalid')) showError(input, fieldError(input)); });
      input.addEventListener('input', function () { if (input.hasAttribute('aria-invalid')) showError(input, fieldError(input)); });
    });
  }

  /* ── enquiry form ──
     data-endpoint empty: review build, nothing leaves the browser.
     data-endpoint set:   POSTs JSON there (the form handler; see README). */
  var form = $('#enquiry-form'), success = $('#enquiry-success');
  if (form) {
    liveCheck(form);
    var summary = $('.form-errors', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = validate(form);
      if (bad.length) {
        summary.hidden = false;
        summary.textContent = bad.length === 1 ? 'One field needs attention.' : bad.length + ' fields need attention.';
        bad[0].focus();
        return;
      }
      summary.hidden = true;
      if ($('#f-website', form).value) return; // honeypot filled: quietly drop
      var endpoint = form.getAttribute('data-endpoint');
      var btn = $('button[type=submit]', form);
      function done() {
        form.hidden = true;
        success.hidden = false;
        var note = $('[data-test-note]', success);
        if (note) note.hidden = !!endpoint;
        success.focus();
      }
      if (!endpoint) { done(); return; }
      btn.disabled = true;
      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== 'website') data[k] = v; });
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
        .catch(function () {
          summary.hidden = false;
          summary.textContent = 'Sorry, that didn’t send. Please try again, or email info@neuroaiq.com.au.';
        })
        .finally(function () { btn.disabled = false; });
    });
  }

  /* ── booking ──
     Review build: availability is generated (weekdays, next six weeks) and
     nothing is booked. At launch this is replaced by the scheduling tool's embed. */
  var app = $('[data-booking]');
  if (app) {
    var person = 'Dr Mahtab Ameri';
    $$('[data-person]').forEach(function (b) {
      b.addEventListener('click', function () {
        person = b.getAttribute('data-person');
        $$('[data-person]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
    var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var SLOTS = ['9:00am','9:30am','10:00am','10:30am','11:00am','11:30am','1:00pm','1:30pm','2:00pm','2:30pm','3:00pm','3:30pm'];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var last = new Date(today); last.setDate(last.getDate() + 42);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    var chosenDate = null, chosenTime = null;

    function available(d) { var w = d.getDay(); return d > today && d <= last && w !== 0 && w !== 6; }
    function taken(d, i) { return (d.getDate() + i * 7) % 5 === 0; } // deterministic sample
    function fmt(d) { return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
    function el(tag, attrs, text) {
      var e = doc.createElement(tag);
      for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
      if (text != null) e.textContent = text;
      return e;
    }

    function render() {
      app.innerHTML = '';
      var cal = el('div', { class: 'cal' });
      cal.appendChild(el('h3', {}, 'Select a date and time'));
      var head = el('div', { class: 'cal__head' });
      head.appendChild(el('span', { class: 'cal__month', 'aria-live': 'polite' }, MONTHS[view.getMonth()] + ' ' + view.getFullYear()));
      var navs = el('div', { class: 'cal__nav' });
      var prev = el('button', { type: 'button', 'aria-label': 'Previous month' }, '←');
      var next = el('button', { type: 'button', 'aria-label': 'Next month' }, '→');
      prev.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
      next.disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > last;
      prev.onclick = function () { view.setMonth(view.getMonth() - 1); render(); };
      next.onclick = function () { view.setMonth(view.getMonth() + 1); render(); };
      navs.appendChild(prev); navs.appendChild(next); head.appendChild(navs); cal.appendChild(head);
      var grid = el('div', { class: 'cal__grid' });
      ['MON','TUE','WED','THU','FRI','SAT','SUN'].forEach(function (d) { grid.appendChild(el('span', { class: 'cal__dow', 'aria-hidden': 'true' }, d)); });
      var first = new Date(view);
      var lead = (first.getDay() + 6) % 7;
      for (var i = 0; i < lead; i++) grid.appendChild(el('span', { 'aria-hidden': 'true' }));
      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var n = 1; n <= days; n++) {
        (function (d) {
          var b = el('button', { type: 'button', class: 'cal__day', 'aria-label': fmt(d) }, String(d.getDate()));
          if (available(d)) {
            b.setAttribute('data-available', '');
            b.setAttribute('aria-pressed', String(!!chosenDate && chosenDate.getTime() === d.getTime()));
            b.onclick = function () { chosenDate = d; chosenTime = null; render(); };
          } else {
            b.disabled = true;
          }
          grid.appendChild(b);
        })(new Date(view.getFullYear(), view.getMonth(), n));
      }
      cal.appendChild(grid);
      cal.appendChild(el('p', { class: 'cal__tz' }, 'Times are Melbourne time (AEST/AEDT). 30-minute slots.'));
      app.appendChild(cal);

      var side = el('div', { class: 'slots-wrap' });
      if (!chosenDate) {
        side.appendChild(el('h3', {}, 'Pick a date'));
        side.appendChild(el('p', { class: 'booking__empty' }, 'Highlighted dates have times free.'));
      } else {
        side.appendChild(el('h3', {}, fmt(chosenDate)));
        var slots = el('div', { class: 'slots', role: 'group', 'aria-label': 'Available times' });
        SLOTS.forEach(function (s, i) {
          var b = el('button', { type: 'button', class: 'slot', 'aria-pressed': String(chosenTime === s) }, s);
          if (taken(chosenDate, i)) { b.disabled = true; b.setAttribute('aria-label', s + ', taken'); }
          else b.onclick = function () { chosenTime = s; render(); $('.booking__next', app) && $('.booking__next', app).focus(); };
          slots.appendChild(b);
        });
        side.appendChild(slots);
        if (chosenTime) {
          var go = el('button', { type: 'button', class: 'btn btn--navy booking__next' }, 'Next');
          go.onclick = details;
          side.appendChild(go);
        }
      }
      app.appendChild(side);
    }

    function details() {
      app.innerHTML = '';
      var f = el('form', { class: 'booking__details', novalidate: '' });
      f.innerHTML =
        '<h3>Your details</h3>' +
        '<p class="booking__summary"></p>' +
        '<div class="field"><label for="b-name">Full name <span aria-hidden="true">*</span></label><input id="b-name" name="name" autocomplete="name" required></div>' +
        '<div class="field"><label for="b-email">Work email <span aria-hidden="true">*</span></label><input id="b-email" name="email" type="email" autocomplete="email" required></div>' +
        '<div class="field"><label for="b-topic">What would you like to cover?</label><textarea id="b-topic" name="topic" rows="3"></textarea></div>' +
        '<div class="booking__actions"><button class="btn btn--navy" type="submit">Confirm booking</button><button class="link-btn" type="button" data-back>Change time</button></div>';
      $('.booking__summary', f).textContent = fmt(chosenDate) + ', ' + chosenTime + ' with ' + person;
      liveCheck(f);
      $('[data-back]', f).onclick = render;
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var bad = validate(f);
        if (bad.length) { bad[0].focus(); return; }
        app.innerHTML = '';
        var ok = el('div', { class: 'form-success', role: 'status', tabindex: '-1' });
        ok.appendChild(el('p', { class: 'form-success__title' }, 'You’re booked in.'));
        ok.appendChild(el('p', {}, fmt(chosenDate) + ', ' + chosenTime + ' with ' + person + '. A confirmation email would follow.'));
        ok.appendChild(el('p', { class: 'form-success__test' }, 'This is a review build: no booking was made.'));
        app.appendChild(ok);
        ok.focus();
      });
      app.appendChild(f);
      $('#b-name', f).focus();
    }
    render();
  }
})();
