// CashSplit — working demo. Runs entirely in the browser; data stays in localStorage.
// Every user-typed value is inserted with textContent / value, never as HTML.
(function () {
  'use strict';

  var STORE_KEY = 'cashsplit-demo-v1';
  var DEMO_TODAY = '2026-10-13'; // the prototype's "today", so sample dates read naturally
  var MAX_AMOUNT = 10000000;     // £100,000.00 in pence
  var MAX_MEMBERS = 12;
  var MAX_PEOPLE = 40;
  var MAX_EXPENSES = 200;

  var params = new URLSearchParams(location.search);
  document.body.classList.add(params.get('view') === 'frame' ? 'view-frame' : 'view-full');

  // ---------- Icons (static, trusted markup from the Figma file) ----------
  var P = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = {
    back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14.5 18L8.5 12L14.5 6" ' + P + '/></svg>',
    chev: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9.5 18L15.5 12L9.5 6" ' + P + '/></svg>',
    home: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3.5 10.5L12 3.5L20.5 10.5V19C20.5 19.4 20.34 19.78 20.06 20.06C19.78 20.34 19.4 20.5 19 20.5H14.5V14.5H9.5V20.5H5C4.6 20.5 4.22 20.34 3.94 20.06C3.66 19.78 3.5 19.4 3.5 19V10.5Z" ' + P + '/></svg>',
    users: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 11.5C10.93 11.5 12.5 9.93 12.5 8C12.5 6.07 10.93 4.5 9 4.5C7.07 4.5 5.5 6.07 5.5 8C5.5 9.93 7.07 11.5 9 11.5Z" ' + P + '/><path d="M2.5 20C2.5 16.4 5.4 13.8 9 13.8C12.6 13.8 15.5 16.4 15.5 20" ' + P + '/><path d="M15.5 4.8C16.21 4.98 16.85 5.39 17.3 5.97C17.75 6.55 17.99 7.27 17.99 8C17.99 8.73 17.75 9.45 17.3 10.03C16.85 10.61 16.21 11.02 15.5 11.2" ' + P + '/><path d="M18 14.2C20.1 14.9 21.5 17.1 21.5 20" ' + P + '/></svg>',
    clock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 20.5C16.69 20.5 20.5 16.69 20.5 12C20.5 7.31 16.69 3.5 12 3.5C7.31 3.5 3.5 7.31 3.5 12C3.5 16.69 7.31 20.5 12 20.5Z" ' + P + '/><path d="M12 7.5V12L15 14" ' + P + '/></svg>',
    user: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 12.5C14.21 12.5 16 10.71 16 8.5C16 6.29 14.21 4.5 12 4.5C9.79 4.5 8 6.29 8 8.5C8 10.71 9.79 12.5 12 12.5Z" ' + P + '/><path d="M4.5 20.5C5.3 16.9 8.4 14.5 12 14.5C15.6 14.5 18.7 16.9 19.5 20.5" ' + P + '/></svg>',
    plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" ' + P + '/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.33 8.33L6.33 11.33L12.67 5" ' + P + '/></svg>',
    checkS: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3.33 8.33L6.33 11.33L12.67 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M13 18L19 12L13 6" ' + P + '/></svg>',
    info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 20.5C16.69 20.5 20.5 16.69 20.5 12C20.5 7.31 16.69 3.5 12 3.5C7.31 3.5 3.5 7.31 3.5 12C3.5 16.69 7.31 20.5 12 20.5Z" ' + P + '/><path d="M12 11V16M12 7.8V8" ' + P + '/></svg>',
  };
  function icon(name) {
    var s = document.createElement('span');
    s.className = 'icon';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name]; // constant strings only
    return s;
  }

  // ---------- Tiny DOM helper: strings become text nodes ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }

  // ---------- Money ----------
  var gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
  function money(p) { return gbp.format(Math.abs(p) / 100); }
  function signed(p) { return (p < 0 ? '−' : '') + money(p); }
  // "£12.50", "12.5", "1,200" → pence; null if not a valid positive amount
  function parseMoney(str) {
    var s = String(str || '').replace(/[£,\s]/g, '');
    if (!/^\d{1,6}(\.\d{0,2})?$/.test(s)) return null;
    var p = Math.round(parseFloat(s) * 100);
    return isFinite(p) ? p : null;
  }
  function parsePercent(str) {
    var s = String(str || '').replace(/[%\s]/g, '');
    if (!/^\d{1,3}(\.\d{0,2})?$/.test(s)) return null;
    var v = parseFloat(s);
    return v >= 0 && v <= 100 ? Math.round(v * 100) / 100 : null;
  }

  // ---------- Dates ----------
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function shortDate(iso) { var d = iso.split('-'); return +d[2] + ' ' + MONTHS[+d[1] - 1]; }
  function daysBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }

  // ---------- Sample data (made up, matching the Figma screens) ----------
  function uid(prefix) { return prefix + Math.random().toString(36).slice(2, 9); }
  function equalShares(total, ids) {
    var base = Math.floor(total / ids.length), rest = total - base * ids.length, out = {};
    ids.forEach(function (id, i) { out[id] = base + (i < rest ? 1 : 0); });
    return out;
  }
  function seed() {
    var people = {
      me: { name: 'You', first: 'Maya', full: 'Maya Rahman', initials: 'MR' },
      sam: { name: 'Sam', initials: 'SO' },
      jo: { name: 'Jo', initials: 'JP' },
      priya: { name: 'Priya', initials: 'PK' },
      leo: { name: 'Leo', initials: 'LT' },
      ana: { name: 'Ana', initials: 'AM' },
    };
    function exp(title, amount, paidBy, date, ids) {
      return { id: uid('e'), title: title, amount: amount, paidBy: paidBy, date: date, mode: 'equal', shares: equalShares(amount, ids) };
    }
    var flat = ['me', 'sam', 'jo', 'priya'];
    var wales = ['me', 'sam', 'jo', 'priya', 'leo', 'ana'];
    var dinner = ['me', 'jo', 'ana'];
    var gift = ['me', 'jo', 'priya', 'leo', 'ana'];
    return {
      v: 1,
      signedIn: false,
      people: people,
      settings: { notifications: true, reminders: true },
      groups: [
        { id: 'g-flat', name: 'Flat 4B', members: flat, created: '2026-09-20',
          expenses: [exp('Electricity bill', 4800, 'sam', '2026-10-09', flat)], payments: [] },
        { id: 'g-wales', name: 'Wales trip', members: wales, created: '2026-10-01',
          expenses: [
            exp('Food shop', 8400, 'me', '2026-10-13', wales),
            exp('Petrol', 6000, 'me', '2026-10-12', wales),
            exp('Cottage booking', 42000, 'leo', '2026-10-12', wales),
          ], payments: [] },
        { id: 'g-dinner', name: 'Friday dinner', members: dinner, created: '2026-10-03',
          expenses: [exp('Dinner', 2400, 'me', '2026-10-03', dinner)],
          payments: [
            { id: uid('p'), from: 'ana', to: 'me', amount: 800, date: '2026-10-03' },
            { id: uid('p'), from: 'jo', to: 'me', amount: 800, date: '2026-10-04' },
          ] },
        { id: 'g-gift', name: 'Sam’s birthday gift', members: gift, created: '2026-09-25',
          expenses: [exp('Gift', 5000, 'priya', '2026-09-25', gift)],
          payments: ['me', 'jo', 'leo', 'ana'].map(function (p) { return { id: uid('p'), from: p, to: 'priya', amount: 1000, date: '2026-09-26' }; }) },
      ],
      activity: [
        { id: uid('a'), actor: 'me', title: 'You added “Food shop”', group: 'g-wales', amount: 8400, tone: '', date: '2026-10-13' },
        { id: uid('a'), actor: 'leo', title: 'Leo added “Cottage booking”', group: 'g-wales', amount: 42000, tone: '', date: '2026-10-12' },
        { id: uid('a'), actor: 'me', title: 'You added “Petrol”', group: 'g-wales', amount: 6000, tone: '', date: '2026-10-12' },
        { id: uid('a'), actor: 'jo', title: 'Jo paid you', group: 'g-dinner', amount: 800, tone: 'owed', date: '2026-10-04' },
        { id: uid('a'), actor: 'me', title: 'You created “Wales trip”', group: null, amount: null, tone: '', date: '2026-10-01' },
      ],
    };
  }

  // ---------- Storage (fails safe: private mode, blocked storage) ----------
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.v === 1 && s.people && s.people.me && Array.isArray(s.groups) && Array.isArray(s.activity)) return s;
      }
    } catch (e) { /* fall through to sample data */ }
    return seed();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* demo still works this session */ }
  }

  var state = load();

  // ---------- Balances ----------
  function person(id) { return state.people[id] || { name: 'Someone', initials: '?' }; }
  function group(id) { for (var i = 0; i < state.groups.length; i++) if (state.groups[i].id === id) return state.groups[i]; return null; }

  function groupNet(g) {
    var net = {};
    g.members.forEach(function (m) { net[m] = 0; });
    g.expenses.forEach(function (e) {
      net[e.paidBy] = (net[e.paidBy] || 0) + e.amount;
      Object.keys(e.shares).forEach(function (pid) { net[pid] = (net[pid] || 0) - e.shares[pid]; });
    });
    g.payments.forEach(function (p) {
      net[p.from] = (net[p.from] || 0) + p.amount;
      net[p.to] = (net[p.to] || 0) - p.amount;
    });
    return net;
  }
  // Fewest payments: biggest debtor pays biggest creditor
  function groupDebts(g) {
    var net = groupNet(g), debtors = [], creditors = [], out = [];
    Object.keys(net).forEach(function (id) {
      if (net[id] < 0) debtors.push({ id: id, amt: -net[id] });
      else if (net[id] > 0) creditors.push({ id: id, amt: net[id] });
    });
    var byAmt = function (a, b) { return b.amt - a.amt || (a.id === 'me' ? -1 : 1); };
    debtors.sort(byAmt); creditors.sort(byAmt);
    var i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      var pay = Math.min(debtors[i].amt, creditors[j].amt);
      if (pay > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount: pay, group: g.id });
      debtors[i].amt -= pay; creditors[j].amt -= pay;
      if (debtors[i].amt === 0) i++;
      if (creditors[j].amt === 0) j++;
    }
    return out;
  }
  function myNet(g) { return groupNet(g).me || 0; }
  function totals() {
    var owed = 0, owe = 0;
    state.groups.forEach(function (g) { var n = myNet(g); if (n > 0) owed += n; else owe -= n; });
    return { owed: owed, owe: owe, overall: owed - owe };
  }
  function myDebts(groupId) {
    var list = [];
    state.groups.forEach(function (g) {
      if (groupId && g.id !== groupId) return;
      groupDebts(g).forEach(function (d) { if (d.from === 'me' || d.to === 'me') list.push(d); });
    });
    return list.sort(function (a, b) { return (a.from === 'me' ? 0 : 1) - (b.from === 'me' ? 0 : 1); });
  }

  // ---------- Navigation ----------
  var stack = [];
  var flash = null; // one-off note shown on the next Home render

  function go(name, args, replace) {
    var entry = { name: name, args: args || {} };
    if (replace) stack[stack.length - 1] = entry; else stack.push(entry);
    render();
  }
  function tab(name) { stack = [{ name: name, args: {} }]; render(); }
  function back() { if (stack.length > 1) stack.pop(); render(); }

  var appEl = document.getElementById('app');
  var liveEl = document.getElementById('live');
  function announce(msg) { liveEl.textContent = ''; setTimeout(function () { liveEl.textContent = msg; }, 30); }

  function render() {
    var top = stack[stack.length - 1];
    var screen = SCREENS[top.name](top.args);
    appEl.replaceChildren(screen);
    var heading = screen.querySelector('[data-heading]');
    if (heading) heading.focus({ preventScroll: true });
  }

  // ---------- Shared building blocks ----------
  function avatar(id, large) {
    var p = person(id);
    return h('span', { class: 'avatar' + (large ? ' avatar--l' : ''), 'aria-hidden': 'true', text: p.initials });
  }
  function groupInitials(name) {
    var words = name.trim().split(/\s+/).filter(Boolean);
    var s = words.length > 1 ? words[0][0] + (/\d/.test(words[1]) ? words[1].replace(/\D/g, '')[0] : words[1][0]) : words[0].slice(0, 2);
    return s.toUpperCase();
  }
  function largeTop(title) {
    return h('header', { class: 'topbar-large' }, h('h1', { class: 'title-l', tabindex: '-1', 'data-heading': true, text: title }));
  }
  function backTop(title) {
    return h('header', { class: 'topbar-back' },
      h('button', { class: 'back-btn', type: 'button', 'aria-label': 'Back', onclick: back }, icon('back')),
      h('h1', { class: 'title-s', tabindex: '-1', 'data-heading': true, text: title }));
  }
  function tabbar(active) {
    var tabs = [['home', 'Home', 'home'], ['groups', 'Groups', 'users'], ['activity', 'Activity', 'clock'], ['account', 'Account', 'user']];
    return h('nav', { class: 'tabbar', 'aria-label': 'Main' },
      h('div', { class: 'tabbar__tabs' }, tabs.map(function (t) {
        return h('button', { class: 'tab', type: 'button', 'aria-current': t[0] === active ? 'page' : null, onclick: function () { tab(t[0]); } }, icon(t[2]), t[1]);
      })));
  }
  function screen(parts) { return h('div', { class: 'screen' }, parts); }
  function body() { return h('div', { class: 'screen__body' }, h('div', { class: 'stack' }, Array.prototype.slice.call(arguments))); }
  function footer(btn) { return h('div', { class: 'footer-action' }, btn); }
  function primary(label, onclick, type) { return h('button', { class: 'btn btn--primary', type: type || 'button', onclick: onclick }, label); }
  function secondary(label, onclick) { return h('button', { class: 'btn btn--secondary', type: 'button', onclick: onclick }, label); }
  function sectionHead(title, action) {
    return h('div', { class: 'section-head' }, h('h2', { class: 'section-head__title', text: title }), action || null);
  }
  function note(text) { return h('div', { class: 'note', role: 'status' }, icon('info'), h('p', { text: text })); }

  function balanceCard(t) {
    var neg = t.overall < 0;
    return h('section', { class: 'balance-card', 'aria-label': 'Your balance' },
      h('p', { class: 'balance-card__label', text: neg ? 'Overall, you owe' : 'Overall, you are owed' }),
      h('p', { class: 'balance-card__value', text: money(t.overall) }),
      h('div', { class: 'balance-card__stats' },
        h('div', { class: 'stat' }, h('span', { class: 'stat__label', text: 'You are owed' }), h('span', { class: 'stat__value', text: money(t.owed) })),
        h('div', { class: 'stat' }, h('span', { class: 'stat__label', text: 'You owe' }), h('span', { class: 'stat__value', text: money(t.owe) }))));
  }

  function groupRow(g) {
    var n = myNet(g);
    var tone = n < 0 ? 'tone-owe' : n > 0 ? 'tone-owed' : '';
    var meta = n < 0 ? 'you owe' : n > 0 ? 'you are owed' : 'settled';
    var count = g.members.length + (g.members.length === 1 ? ' person' : ' people');
    return h('li', null, h('button', { class: 'row', type: 'button', onclick: function () { go('group', { id: g.id }); } },
      h('span', { class: 'avatar', 'aria-hidden': 'true', text: groupInitials(g.name) }),
      h('span', { class: 'row__text' }, h('span', { class: 'row__title', text: g.name }), h('span', { class: 'row__sub', text: count })),
      h('span', { class: 'row__trail' }, h('span', { class: 'row__value ' + tone, text: signed(n) }), h('span', { class: 'row__meta ' + tone, text: meta })),
      h('span', { class: 'chev' }, icon('chev'))));
  }

  function debtLabel(d) {
    if (d.from === 'me') return 'You owe ' + person(d.to).name;
    if (d.to === 'me') return person(d.from).name + ' owes you';
    return person(d.from).name + ' owes ' + person(d.to).name;
  }
  function debtRow(d, onclick, showGroup) {
    var tone = d.from === 'me' ? 'tone-owe' : d.to === 'me' ? 'tone-owed' : '';
    var inner = [
      avatar(d.from === 'me' ? d.to : d.from),
      h('span', { class: 'row__text' }, h('span', { class: 'row__title', text: debtLabel(d) }),
        showGroup ? h('span', { class: 'row__sub', text: group(d.group).name }) : null),
      h('span', { class: 'row__trail' }, h('span', { class: 'row__value ' + tone, text: (d.from === 'me' ? '−' : '') + money(d.amount) })),
    ];
    if (onclick) inner.push(h('span', { class: 'chev' }, icon('chev')));
    return h('li', null, onclick ? h('button', { class: 'row', type: 'button', onclick: onclick }, inner) : h('div', { class: 'row' }, inner));
  }

  // ---------- Form helpers ----------
  function field(opts) {
    var id = uid('f');
    var errId = id + '-err';
    var helpId = opts.help ? id + '-help' : null;
    var control = opts.control || h('input', {
      class: 'field__control', id: id, type: 'text', value: opts.value || '',
      placeholder: opts.placeholder || null, maxlength: opts.maxlength || null,
      inputmode: opts.inputmode || null, autocomplete: 'off', readonly: opts.readonly || null,
      'aria-describedby': [helpId, errId].filter(Boolean).join(' '),
    });
    control.id = id;
    var err = h('p', { class: 'field__error', id: errId });
    control.addEventListener('input', function () { err.textContent = ''; control.setAttribute('aria-invalid', 'false'); });
    var wrap = h('div', { class: 'field' },
      h('label', { class: 'field__label', for: id, text: opts.label }),
      control,
      opts.help ? h('p', { class: 'field__help', id: helpId, text: opts.help }) : null,
      err);
    return { el: wrap, input: control, error: function (msg) { err.textContent = msg || ''; control.setAttribute('aria-invalid', msg ? 'true' : 'false'); } };
  }

  function cleanText(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); }

  // ---------- Screens ----------
  var SCREENS = {};

  SCREENS.welcome = function () {
    var faces = ['me', 'sam', 'jo', 'priya', 'leo'];
    return h('div', { class: 'welcome' },
      h('div', { class: 'welcome__body' },
        h('div', { class: 'welcome__art', 'aria-hidden': 'true' },
          h('div', { class: 'welcome__faces' }, faces.map(function (f) { return avatar(f, true); })),
          balanceCard({ owed: 5000, owe: 1200, overall: 3800 })),
        h('p', { class: 'welcome__brand', text: 'CashSplit' }),
        h('h1', { class: 'welcome__title', tabindex: '-1', 'data-heading': true, text: 'Split costs with friends, without the awkward maths' }),
        h('p', { class: 'welcome__text', text: 'Add a cost, split it in seconds and always know who owes who.' })),
      h('div', { class: 'welcome__actions' },
        primary('Create account', function () { go('signup'); }),
        secondary('Log in', signIn)));
  };

  function signIn() { state.signedIn = true; save(); tab('home'); }

  // Sample details are fixed: the demo never asks for real personal information
  SCREENS.signup = function () {
    var me = person('me');
    return screen([
      backTop('Create account'),
      body(
        h('h2', { class: 'signup-title', text: 'Create your account' }),
        field({ label: 'Name', value: me.full, readonly: true }).el,
        field({ label: 'Email', value: 'maya@example.com', readonly: true }).el,
        field({ label: 'Password', value: '••••••••••', readonly: true, help: 'At least 8 characters' }).el,
        h('p', { class: 'fine', text: 'By continuing you agree to the terms and privacy policy.' })),
      footer(primary('Create account', signIn)),
    ]);
  };

  SCREENS.home = function () {
    var t = totals();
    var groups = state.groups.slice(0, 3);
    var parts = [largeTop('Hi, ' + person('me').first)];
    var content = [];
    if (flash) { content.push(note(flash)); flash = null; }
    content.push(
      balanceCard(t),
      h('div', { class: 'btn-row' },
        primary('Add expense', function () { go('expense', { group: state.groups.length ? state.groups[0].id : null, pick: true }); }),
        secondary('Settle up', function () { startSettle(null); })),
      sectionHead('Your groups', h('button', { class: 'section-head__action', type: 'button', onclick: function () { tab('groups'); } }, 'See all')),
      groups.length ? h('ul', { class: 'list' }, groups.map(groupRow)) : h('p', { class: 'empty', text: 'No groups yet.' }));
    parts.push(body.apply(null, content), tabbar('home'));
    return screen(parts);
  };

  SCREENS.groups = function () {
    var s = screen([
      largeTop('Groups'),
      h('div', { class: 'screen__body' }, h('ul', { class: 'list' }, state.groups.map(groupRow)), h('div', { style: null, class: 'fab-space' })),
      tabbar('groups'),
    ]);
    s.appendChild(h('button', { class: 'fab', type: 'button', onclick: function () { go('newgroup'); } }, icon('plus'), 'New group'));
    return s;
  };

  SCREENS.group = function (args) {
    var g = group(args.id);
    if (!g) return SCREENS.groups();
    var n = myNet(g);
    var paid = 0, share = 0;
    g.expenses.forEach(function (e) { if (e.paidBy === 'me') paid += e.amount; share += e.shares.me || 0; });
    var names = g.members.map(function (m) { return m === 'me' ? person('me').first : person(m).name; });
    var cardClass = n > 0 ? 'group-card group-card--owed' : n < 0 ? 'group-card group-card--owe' : 'group-card';
    var label = n > 0 ? 'In this group, you are owed' : n < 0 ? 'In this group, you owe' : 'In this group, you are settled';
    var debts = groupDebts(g);
    var expenses = g.expenses.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });

    return screen([
      backTop(g.name),
      body(
        h('p', { class: 'group-people', text: g.members.length + ' people · ' + names.join(', ') }),
        h('section', { class: cardClass, 'aria-label': 'Your balance in this group' },
          h('p', { class: 'group-card__label', text: label }),
          h('p', { class: 'group-card__value', text: money(n) }),
          h('p', { class: 'group-card__support', text: 'Your share ' + money(share) + ' · You paid ' + money(paid) })),
        h('div', { class: 'btn-row' },
          primary('Add expense', function () { go('expense', { group: g.id }); }),
          secondary('Settle up', function () { startSettle(g.id); })),
        sectionHead('Expenses'),
        expenses.length ? h('ul', { class: 'list' }, expenses.map(function (e) {
          var who = e.paidBy === 'me' ? 'you' : person(e.paidBy).name;
          return h('li', null, h('div', { class: 'row' },
            avatar(e.paidBy),
            h('span', { class: 'row__text' }, h('span', { class: 'row__title', text: e.title }), h('span', { class: 'row__sub', text: 'Paid by ' + who + ' · ' + shortDate(e.date) })),
            h('span', { class: 'row__trail' }, h('span', { class: 'row__value', text: money(e.amount) }))));
        })) : h('p', { class: 'empty', text: 'No expenses yet.' }),
        sectionHead('Who owes who'),
        debts.length ? h('ul', { class: 'list' }, debts.map(function (d) { return debtRow(d, null, false); }))
          : h('p', { class: 'empty', text: 'Everyone is settled up.' })),
      tabbar('groups'),
    ]);
  };

  SCREENS.newgroup = function () {
    var picked = {};
    var nameF = field({ label: 'Group name', placeholder: 'e.g. Wales trip', maxlength: 30 });
    var list = h('div', { class: 'people-list' });
    var peopleErr = h('p', { class: 'field__error', id: uid('err') });
    var newF = field({ label: 'Add someone new', placeholder: 'First name', maxlength: 20 });

    function drawList() {
      list.replaceChildren();
      Object.keys(state.people).forEach(function (id) {
        if (id === 'me') return;
        var p = person(id);
        var on = !!picked[id];
        var btn = h('button', {
          class: 'check-row', type: 'button', 'aria-pressed': on ? 'true' : 'false',
          onclick: function () {
            if (!picked[id] && Object.keys(picked).length >= MAX_MEMBERS - 1) { peopleErr.textContent = 'A group can have up to ' + MAX_MEMBERS + ' people.'; return; }
            if (picked[id]) delete picked[id]; else picked[id] = true;
            btn.setAttribute('aria-pressed', picked[id] ? 'true' : 'false');
            peopleErr.textContent = '';
          },
        }, avatar(id), h('span', { class: 'check-row__name', text: p.name }),
          h('span', { class: 'check-row__box' }, h('span', { class: 'checkbox' }, icon('check'))));
        list.appendChild(btn);
      });
    }
    drawList();

    function addPerson() {
      var name = cleanText(newF.input.value, 20);
      if (!name) return newF.error('Type a first name.');
      if (!/^[\p{L}][\p{L}' .-]*$/u.test(name)) return newF.error('Use letters only.');
      var exists = Object.keys(state.people).some(function (id) { return person(id).name.toLowerCase() === name.toLowerCase(); });
      if (exists || name.toLowerCase() === 'you') return newF.error('That name is already in the list.');
      if (Object.keys(state.people).length >= MAX_PEOPLE) return newF.error('That’s the most people this demo can hold.');
      if (Object.keys(picked).length >= MAX_MEMBERS - 1) return newF.error('A group can have up to ' + MAX_MEMBERS + ' people.');
      var id = uid('u');
      var parts = name.split(/\s+/);
      state.people[id] = { name: name, initials: (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase() };
      picked[id] = true;
      newF.input.value = '';
      newF.error('');
      save();
      drawList();
      announce(name + ' added to the group.');
    }
    newF.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addPerson(); } });
    var addRow = h('div', { class: 'inline-add' }, newF.input, h('button', { class: 'btn btn--secondary', type: 'button', onclick: addPerson }, 'Add'));
    newF.el.insertBefore(addRow, newF.el.children[1]); // the input moved into addRow, so slot 1 is now the error line

    function create() {
      var name = cleanText(nameF.input.value, 30);
      var ok = true;
      if (!name) { nameF.error('Give the group a name.'); ok = false; }
      else if (state.groups.some(function (g) { return g.name.toLowerCase() === name.toLowerCase(); })) { nameF.error('You already have a group with this name.'); ok = false; }
      else nameF.error('');
      var members = ['me'].concat(Object.keys(picked));
      if (members.length < 2) { peopleErr.textContent = 'Add at least one person.'; ok = false; }
      if (!ok) { announce('Please check the form.'); return; }
      var g = { id: uid('g'), name: name, members: members, created: DEMO_TODAY, expenses: [], payments: [] };
      state.groups.unshift(g);
      state.activity.unshift({ id: uid('a'), actor: 'me', title: 'You created “' + name + '”', group: null, amount: null, tone: '', date: DEMO_TODAY });
      save();
      go('group', { id: g.id }, true);
      announce('Group ' + name + ' created.');
    }

    return screen([
      backTop('New group'),
      body(nameF.el, sectionHead('Add people'), h('div', null, list, peopleErr), newF.el),
      footer(primary('Create group', create)),
    ]);
  };

  SCREENS.expense = function (args) {
    var g = group(args.group);
    if (!g) {
      return screen([backTop('Add expense'), body(note('Create a group first, then add expenses to it.')),
        footer(primary('New group', function () { go('newgroup', null, true); }))]);
    }
    var mode = 'equal';
    var included = {};
    g.members.forEach(function (m) { included[m] = true; });
    var amounts = {}, percents = {};

    var amountId = uid('f');
    var amountInput = h('input', { class: 'amount-head__input', id: amountId, type: 'text', inputmode: 'decimal', placeholder: '£0.00', maxlength: 12, autocomplete: 'off', 'aria-describedby': amountId + '-err' });
    var amountErr = h('p', { class: 'field__error', id: amountId + '-err' });

    var chip;
    if (args.pick && state.groups.length > 1) {
      chip = h('select', { class: 'chip', 'aria-label': 'Group', onchange: function () { go('expense', { group: chip.value, pick: true }, true); } },
        state.groups.map(function (x) { return h('option', { value: x.id, selected: x.id === g.id ? true : null, text: x.name }); }));
    } else {
      chip = h('span', { class: 'chip', text: g.name });
    }

    var titleF = field({ label: 'What was it for?', placeholder: 'e.g. Food shop', maxlength: 40 });
    var payer = h('select', { class: 'field__control' }, g.members.map(function (m) { return h('option', { value: m, text: m === 'me' ? 'You' : person(m).name }); }));
    var payerF = field({ label: 'Paid by', control: payer });

    var segBtns = {};
    var seg = h('div', { class: 'segmented', role: 'group', 'aria-label': 'How to split' },
      [['equal', 'Equally'], ['amount', 'By amount'], ['percent', 'By %']].map(function (m) {
        segBtns[m[0]] = h('button', { class: 'segmented__btn', type: 'button', 'aria-pressed': m[0] === mode ? 'true' : 'false', onclick: function () { setMode(m[0]); } }, m[1]);
        return segBtns[m[0]];
      }));

    var splitTitle = h('h2', { class: 'section-head__title' });
    var splitNote = h('span', { class: 'section-head__note' });
    var splitArea = h('div');
    var splitErr = h('p', { class: 'field__error', role: 'alert' });

    function total() { return parseMoney(amountInput.value); }

    function setMode(m) {
      mode = m;
      Object.keys(segBtns).forEach(function (k) { segBtns[k].setAttribute('aria-pressed', k === m ? 'true' : 'false'); });
      splitErr.textContent = '';
      drawSplit();
    }

    function updateSummary() {
      var t = total() || 0;
      splitNote.classList.remove('section-head__note--bad');
      if (mode === 'equal') {
        var ids = g.members.filter(function (m) { return included[m]; });
        splitTitle.textContent = 'Split between ' + ids.length;
        splitNote.textContent = ids.length && t ? money(Math.floor(t / ids.length)) + ' each' : '';
      } else if (mode === 'amount') {
        splitTitle.textContent = 'Split by amount';
        var sum = 0, bad = false;
        g.members.forEach(function (m) { var v = amounts[m]; if (v === undefined || v === '') return; var p = parseMoney(v); if (p === null) bad = true; else sum += p; });
        var left = t - sum;
        splitNote.textContent = bad ? 'Check the amounts' : left === 0 ? 'Adds up' : left > 0 ? money(left) + ' left' : money(-left) + ' too much';
        if (bad || left !== 0) splitNote.classList.add('section-head__note--bad');
      } else {
        splitTitle.textContent = 'Split by %';
        var pct = 0, badP = false;
        g.members.forEach(function (m) { var v = percents[m]; if (v === undefined || v === '') return; var p = parsePercent(v); if (p === null) badP = true; else pct += p; });
        pct = Math.round(pct * 100) / 100;
        splitNote.textContent = badP ? 'Check the percentages' : pct === 100 ? 'Adds up' : pct < 100 ? (Math.round((100 - pct) * 100) / 100) + '% left' : (Math.round((pct - 100) * 100) / 100) + '% too much';
        if (badP || pct !== 100) splitNote.classList.add('section-head__note--bad');
      }
    }

    function drawSplit() {
      splitArea.replaceChildren();
      if (mode === 'equal') {
        splitArea.appendChild(h('div', { class: 'picker' }, g.members.map(function (m) {
          var label = m === 'me' ? 'You' : person(m).name;
          var btn = h('button', {
            class: 'pick', type: 'button', 'aria-pressed': included[m] ? 'true' : 'false', 'aria-label': label,
            onclick: function () {
              included[m] = !included[m];
              btn.setAttribute('aria-pressed', included[m] ? 'true' : 'false');
              splitErr.textContent = '';
              updateSummary();
            },
          });
          append(btn, [h('span', { class: 'pick__ring' }, avatar(m), h('span', { class: 'pick__tick' }, icon('checkS'))),
            h('span', { class: 'pick__name', 'aria-hidden': 'true', text: label })]);
          return btn;
        })));
      } else {
        var isPct = mode === 'percent';
        var store = isPct ? percents : amounts;
        splitArea.appendChild(h('div', null, g.members.map(function (m) {
          var label = m === 'me' ? 'You' : person(m).name;
          var inp = h('input', {
            class: 'field__control', type: 'text', inputmode: 'decimal', maxlength: isPct ? 6 : 10, autocomplete: 'off',
            'aria-label': (isPct ? 'Percentage for ' : 'Amount for ') + label, value: store[m] || '', placeholder: isPct ? '0' : '0.00',
            oninput: function () { store[m] = inp.value; splitErr.textContent = ''; updateSummary(); },
          });
          return h('div', { class: 'share-row' }, avatar(m), h('span', { class: 'share-row__name', text: label }),
            h('span', { class: 'share-row__input' + (isPct ? ' share-row__input--pct' : '') },
              isPct ? null : h('span', { class: 'share-row__affix share-row__affix--pre', 'aria-hidden': 'true', text: '£' }),
              inp,
              isPct ? h('span', { class: 'share-row__affix share-row__affix--post', 'aria-hidden': 'true', text: '%' }) : null));
        })));
      }
      updateSummary();
    }
    amountInput.addEventListener('input', function () { amountErr.textContent = ''; amountInput.removeAttribute('aria-invalid'); updateSummary(); });
    drawSplit();

    function saveExpense() {
      var ok = true;
      var t = total();
      if (!amountInput.value.trim()) { amountErr.textContent = 'Enter an amount.'; ok = false; }
      else if (t === null) { amountErr.textContent = 'Use numbers only, like 84.00.'; ok = false; }
      else if (t <= 0) { amountErr.textContent = 'The amount must be more than £0.'; ok = false; }
      else if (t > MAX_AMOUNT) { amountErr.textContent = 'The most you can add is ' + money(MAX_AMOUNT) + '.'; ok = false; }
      if (!ok) amountInput.setAttribute('aria-invalid', 'true');

      var title = cleanText(titleF.input.value, 40);
      if (!title) { titleF.error('Say what it was for.'); ok = false; } else titleF.error('');

      var shares = {};
      if (ok) {
        if (mode === 'equal') {
          var ids = g.members.filter(function (m) { return included[m]; });
          if (!ids.length) { splitErr.textContent = 'Pick at least one person.'; ok = false; }
          else shares = equalShares(t, ids);
        } else if (mode === 'amount') {
          var sum = 0;
          g.members.forEach(function (m) {
            if (!ok) return;
            var raw = (amounts[m] || '').trim();
            if (!raw) return;
            var p = parseMoney(raw);
            if (p === null) { splitErr.textContent = 'Use numbers only for each amount.'; ok = false; return; }
            if (p > 0) { shares[m] = p; sum += p; }
          });
          if (ok && !Object.keys(shares).length) { splitErr.textContent = 'Enter an amount for at least one person.'; ok = false; }
          else if (ok && sum !== t) { splitErr.textContent = 'The amounts need to add up to ' + money(t) + '.'; ok = false; }
        } else {
          var pctSum = 0, pcts = {};
          g.members.forEach(function (m) {
            if (!ok) return;
            var raw = (percents[m] || '').trim();
            if (!raw) return;
            var v = parsePercent(raw);
            if (v === null) { splitErr.textContent = 'Use numbers from 0 to 100 for each percentage.'; ok = false; return; }
            if (v > 0) { pcts[m] = v; pctSum += v; }
          });
          pctSum = Math.round(pctSum * 100) / 100;
          if (ok && pctSum !== 100) { splitErr.textContent = 'The percentages need to add up to 100%.'; ok = false; }
          if (ok) {
            var given = 0, biggest = null;
            Object.keys(pcts).forEach(function (m) {
              shares[m] = Math.round(t * pcts[m] / 100); given += shares[m];
              if (!biggest || pcts[m] > pcts[biggest]) biggest = m;
            });
            shares[biggest] += t - given; // pennies lost to rounding go to the largest share
          }
        }
      }
      if (ok && g.expenses.length >= MAX_EXPENSES) { splitErr.textContent = 'This group is full in the demo. Try Reset demo.'; ok = false; }
      if (!ok) { announce('Please check the form.'); return; }

      var paidBy = g.members.indexOf(payer.value) >= 0 ? payer.value : 'me';
      g.expenses.push({ id: uid('e'), title: title, amount: t, paidBy: paidBy, date: DEMO_TODAY, mode: mode, shares: shares });
      state.activity.unshift({ id: uid('a'), actor: 'me', title: 'You added “' + title + '”', group: g.id, amount: t, tone: '', date: DEMO_TODAY });
      save();
      go('group', { id: g.id }, true);
      announce('Expense saved.');
    }

    return screen([
      backTop('Add expense'),
      body(
        h('div', { class: 'amount-head' }, h('label', { class: 'field__label', for: amountId, text: 'Amount' }), amountInput, amountErr, chip),
        titleF.el,
        payerF.el,
        h('div', { class: 'field' }, h('span', { class: 'field__label', text: 'How to split' }), seg),
        h('div', { class: 'section-head' }, splitTitle, splitNote),
        h('div', null, splitArea, splitErr)),
      footer(primary('Save expense', saveExpense)),
    ]);
  };

  function startSettle(groupId) {
    var debts = myDebts(groupId);
    if (debts.length === 1) go('settle', { debt: debts[0] });
    else go('settlelist', { group: groupId });
  }

  SCREENS.settlelist = function (args) {
    var debts = myDebts(args.group);
    return screen([
      backTop('Settle up'),
      body(debts.length
        ? h('ul', { class: 'list' }, debts.map(function (d) { return debtRow(d, function () { go('settle', { debt: d }); }, !args.group); }))
        : note('You’re all settled up. Nobody owes anything right now.')),
    ]);
  };

  SCREENS.settle = function (args) {
    var d = args.debt;
    var g = group(d.group);
    if (!g) return SCREENS.settlelist({});
    var paying = d.from === 'me';
    var other = paying ? d.to : d.from;
    var otherName = person(other).name;
    var amountF = field({ label: 'Amount paid', value: money(d.amount), inputmode: 'decimal', maxlength: 12, help: 'You can change this if you paid less' });
    if (!paying) amountF.el.querySelector('.field__help').textContent = 'You can change this if they paid less';

    function record() {
      var p = parseMoney(amountF.input.value);
      if (!amountF.input.value.trim()) return amountF.error('Enter an amount.');
      if (p === null) return amountF.error('Use numbers only, like 12.00.');
      if (p <= 0) return amountF.error('The amount must be more than £0.');
      if (p > d.amount) return amountF.error('That’s more than the ' + money(d.amount) + ' owed.');
      amountF.error('');
      g.payments.push({ id: uid('p'), from: d.from, to: d.to, amount: p, date: DEMO_TODAY });
      state.activity.unshift({
        id: uid('a'), actor: paying ? 'me' : other, title: paying ? 'You paid ' + otherName : otherName + ' paid you',
        group: g.id, amount: p, tone: paying ? '' : 'owed', date: DEMO_TODAY,
      });
      save();
      var settled = myNet(g) === 0;
      flash = 'Payment of ' + money(p) + (paying ? ' to ' : ' from ') + otherName + ' recorded.' + (settled ? ' ' + g.name + ' is now settled.' : '');
      tab('home');
    }

    return screen([
      backTop('Settle up'),
      body(
        h('section', { class: 'pay-summary', 'aria-label': 'Payment' },
          h('div', { class: 'pay-summary__people' }, avatar(d.from, true), icon('arrow'), avatar(d.to, true)),
          h('p', { class: 'pay-summary__text', text: paying ? 'You are paying ' + otherName : otherName + ' is paying you' }),
          h('p', { class: 'pay-summary__value', text: money(d.amount) }),
          h('span', { class: 'chip', text: g.name })),
        amountF.el,
        note(paying ? 'Pay ' + otherName + ' in your banking app first, then record it here.' : 'Record this once ' + otherName + ' has paid you.')),
      footer(primary('Record payment', record)),
    ]);
  };

  SCREENS.activity = function () {
    var latest = DEMO_TODAY;
    var week = [], earlier = [];
    state.activity.forEach(function (a) { (daysBetween(a.date, latest) <= 6 ? week : earlier).push(a); });
    function rows(list) {
      return h('ul', { class: 'list' }, list.map(function (a) {
        var g = a.group ? group(a.group) : null;
        var sub = (g ? g.name + ' · ' : '') + shortDate(a.date);
        return h('li', null, h('div', { class: 'row' }, avatar(a.actor),
          h('span', { class: 'row__text' }, h('span', { class: 'row__title', text: a.title }), h('span', { class: 'row__sub', text: sub })),
          a.amount ? h('span', { class: 'row__trail' }, h('span', { class: 'row__value' + (a.tone === 'owed' ? ' tone-owed' : ''), text: money(a.amount) })) : null));
      }));
    }
    var content = [];
    if (week.length) content.push(sectionHead('This week'), rows(week));
    if (earlier.length) content.push(sectionHead('Earlier'), rows(earlier));
    if (!content.length) content.push(h('p', { class: 'empty', text: 'Nothing here yet.' }));
    return screen([largeTop('Activity'), body.apply(null, content), tabbar('activity')]);
  };

  SCREENS.account = function () {
    var me = person('me');
    function toggleRow(key, title, sub) {
      var value = h('span', { class: 'row__value', text: state.settings[key] ? 'On' : 'Off' });
      var btn = h('button', {
        class: 'row', type: 'button', 'aria-pressed': state.settings[key] ? 'true' : 'false',
        onclick: function () {
          state.settings[key] = !state.settings[key];
          save();
          btn.setAttribute('aria-pressed', state.settings[key] ? 'true' : 'false');
          value.textContent = state.settings[key] ? 'On' : 'Off';
        },
      }, h('span', { class: 'row__text' }, h('span', { class: 'row__title', text: title }), h('span', { class: 'row__sub', text: sub })),
        h('span', { class: 'row__trail' }, value));
      return h('li', null, btn);
    }
    function staticRow(title, sub) {
      return h('li', null, h('div', { class: 'row' }, h('span', { class: 'row__text' }, h('span', { class: 'row__title', text: title }), h('span', { class: 'row__sub', text: sub }))));
    }
    return screen([
      largeTop('Account'),
      body(
        h('div', { class: 'profile' }, avatar('me', true),
          h('div', null, h('p', { class: 'profile__name', text: me.full }), h('p', { class: 'profile__email', text: 'maya@example.com' }))),
        sectionHead('Settings'),
        h('ul', { class: 'list' },
          toggleRow('notifications', 'Notifications', 'When someone adds an expense'),
          toggleRow('reminders', 'Payment reminders', 'Remind me when I owe money'),
          staticRow('Currency', 'Pounds (£)'),
          staticRow('Help and support', 'FAQs and contact')),
        secondary('Log out', function () { state.signedIn = false; save(); stack = [{ name: 'welcome', args: {} }]; render(); })),
      tabbar('account'),
    ]);
  };

  // ---------- Reset demo (sent by the magazine's pop-up) ----------
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    if (!e.data || e.data.type !== 'reset-demo') return;
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    state = seed();
    flash = null;
    stack = [{ name: 'welcome', args: {} }];
    render();
    announce('Demo reset.');
  });

  // Esc inside the app should still close the magazine's pop-up
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && window.parent !== window) window.parent.postMessage({ type: 'close-demo' }, location.origin);
  });

  stack = [{ name: state.signedIn ? 'home' : 'welcome', args: {} }];
  render();
})();
