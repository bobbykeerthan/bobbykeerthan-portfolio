// Studyflow landing page — working demo.
// The weekly planner preview can be ticked off and the progress bar follows.
// Browser only; ticks are saved in localStorage. No sign-up, no forms, nothing sent anywhere.
(function () {
  'use strict';

  var STORE_KEY = 'studyflow-demo-v1';
  var TASKS = [
    { id: 'mon', day: 'Mon', title: 'Essay plan', meta: 'Psychology · 2 h', done: true },
    { id: 'tue', day: 'Tue', title: 'Lab report draft', meta: 'Biology · 1.5 h', done: true },
    { id: 'wed', day: 'Wed', title: 'Revise lectures 4–\u20606', meta: 'Economics · 2 h', done: false },
    { id: 'thu', day: 'Thu', title: 'Group project meeting', meta: 'Marketing · 1 h', done: false },
  ];
  var NOTES = {
    faq: 'The FAQ page isn’t part of this demo.',
    login: 'Accounts aren’t part of this demo — nothing to log in to.',
    contact: 'The contact page isn’t part of this demo.',
    privacy: 'The privacy page isn’t part of this demo.',
    social: 'Studyflow is a student design project, so there’s no social account.',
  };
  var CHECK = document.querySelector('.trust .i').innerHTML; // static check icon from the design file

  function seed() {
    var done = {};
    TASKS.forEach(function (t) { done[t.id] = t.done; });
    return done;
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (s && s.v === 1 && s.done && typeof s.done === 'object') {
        var d = seed();
        TASKS.forEach(function (t) { if (typeof s.done[t.id] === 'boolean') d[t.id] = s.done[t.id]; });
        return d;
      }
    } catch (e) { /* fall back to sample data */ }
    return seed();
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, done: done })); } catch (e) { /* session only */ } }
  var done = load();

  // ---------- Planner preview ----------
  var list = document.getElementById('tasks');
  var bar = document.getElementById('bar');
  var track = document.getElementById('track');
  var text = document.getElementById('progress-text');

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt) e.textContent = txt;
    return e;
  }
  function build() {
    list.replaceChildren();
    TASKS.forEach(function (t) {
      var li = el('li', 'task');
      li.dataset.id = t.id;
      var info = el('div', 'task__text');
      info.appendChild(el('b', null, t.title));
      info.appendChild(el('span', null, t.meta));
      var tick = el('button', 'tick');
      tick.type = 'button';
      tick.setAttribute('role', 'checkbox');
      tick.setAttribute('aria-label', t.day + ': ' + t.title);
      var ic = el('span', 'i');
      ic.innerHTML = CHECK;
      tick.appendChild(ic);
      tick.addEventListener('click', function () {
        done[t.id] = !done[t.id];
        save();
        update();
      });
      li.appendChild(el('span', 'task__day', t.day));
      li.appendChild(info);
      li.appendChild(tick);
      list.appendChild(li);
    });
    update();
  }
  function update() {
    var n = 0;
    TASKS.forEach(function (t) {
      var li = list.querySelector('[data-id="' + t.id + '"]');
      li.classList.toggle('is-done', !!done[t.id]);
      li.querySelector('.tick').setAttribute('aria-checked', done[t.id] ? 'true' : 'false');
      if (done[t.id]) n++;
    });
    text.textContent = n + ' of ' + TASKS.length + ' done';
    track.setAttribute('aria-valuenow', String(n));
    bar.style.width = (n / TASKS.length * 100) + '%';
  }
  build();

  // ---------- Toast ----------
  var toastEl = document.getElementById('toast'), timer;
  function toast(msg) {
    clearTimeout(timer);
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    timer = setTimeout(function () { toastEl.classList.remove('is-on'); setTimeout(function () { toastEl.textContent = ''; }, 250); }, 3000);
  }

  // ---------- Mobile menu ----------
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  function setMenu(open, focusBtn) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    if (open) menu.querySelector('a').focus();
    else if (focusBtn) menuBtn.focus();
  }
  menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a, button')) setMenu(false); });

  // ---------- Buttons with no page in this demo ----------
  document.querySelectorAll('[data-note]').forEach(function (b) {
    b.addEventListener('click', function () { toast(NOTES[b.dataset.note]); });
  });
  // "Start free" / "Start planning free": no sign-up in a demo, so send people to the planner
  document.querySelectorAll('[data-start]').forEach(function (b) {
    b.addEventListener('click', function () {
      var planner = document.getElementById('planner');
      planner.scrollIntoView({ block: 'center' });
      var next = list.querySelector('.tick[aria-checked="false"]') || list.querySelector('.tick');
      next.focus({ preventScroll: true });
      toast('Sign-up isn’t part of this demo — try ticking off a task in the planner.');
    });
  });
  // in-page links move focus to their section for keyboard users
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.getElementById(a.getAttribute('href').slice(1));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView();
      var h = t.querySelector('h2') || t;
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    });
  });

  // ---------- Reset demo / Esc ----------
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    if (!e.data || e.data.type !== 'reset-demo') return;
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    done = seed();
    update();
    setMenu(false);
    window.scrollTo(0, 0);
    toast('Demo reset.');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!menu.hidden) { setMenu(false, true); return; }
    if (window.parent !== window) window.parent.postMessage({ type: 'close-demo' }, location.origin);
  });
})();
