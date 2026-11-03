// HUMANE — working demo of an ABC (Animal Birth Control) field app.
// A dog moves capture → POD → ABC treatment → release, and every step lands on its timeline.
// Browser only; saved in localStorage. Typed text is only ever set with textContent/value.
(function () {
  'use strict';

  var ICONS = window.HUM_ICONS;
  var STORE_KEY = 'humane-demo-v1';
  var DATE = '14 Aug';            // the prototype's "today"
  var TEAM = 'Team 04 – Ravi';
  var VET = 'Dr. Meena';
  var SECTORS = ['Sector 17, Chandigarh', 'Sector 9, Chandigarh', 'Sector 22, Chandigarh', 'Sector 35, Chandigarh', 'Sector 43, Chandigarh'];
  var RECOVERY = ['Stable', 'Recovering', 'Under observation'];

  document.body.classList.add(new URLSearchParams(location.search).get('view') === 'frame' ? 'view-frame' : 'view-full');

  // ---------- Sample data (made up, matching the Figma screens) ----------
  function ev(day, time, what, meta) { return { day: day, time: time, what: what, meta: meta }; }
  function seed() {
    var done = function (meta) { return { done: true, meta: meta }; };
    var none = { done: false };
    return {
      v: 1,
      clock: 11 * 60 + 40, // demo clock, minutes since midnight on 14 Aug
      pods: [
        { id: 1, dog: 2147, since: 11 * 60 + 28, cleaned: '09:10' },
        { id: 2, dog: 2146, since: 11 * 60 + 33, cleaned: '09:10' },
        { id: 3, dog: null, since: null, cleaned: '09:10' },
      ],
      dogs: [
        { id: 2147, sex: 'Female', size: 'Small', cond: ['Normal'], loc: SECTORS[2], stage: 'captured', pod: 1, day: DATE, dist: 18,
          tr: { st: none, rv: none, dw: none, ot: none }, recovery: 'Stable', events: [ev(DATE, '11:28', 'Captured', SECTORS[2])] },
        { id: 2146, sex: 'Male', size: 'Medium', cond: ['Normal'], loc: SECTORS[2], stage: 'transit', pod: 2, day: DATE, dist: 26,
          tr: { st: none, rv: none, dw: none, ot: none }, recovery: 'Stable', events: [ev(DATE, '11:21', 'Captured', SECTORS[2])] },
        { id: 2150, sex: 'Male', size: 'Large', cond: ['Normal'], loc: SECTORS[4], stage: 'treatment', pod: null, day: DATE, dist: 14,
          tr: { st: none, rv: none, dw: none, ot: none }, recovery: 'Stable',
          events: [ev(DATE, '09:02', 'Captured', SECTORS[4]), ev(DATE, '09:41', 'ABC Centre Entry', 'Assigned to POD 03')] },
        { id: 2149, sex: 'Female', size: 'Medium', cond: ['Injured'], loc: SECTORS[1], stage: 'treatment', pod: null, day: DATE, dist: 31,
          tr: { st: none, rv: none, dw: none, ot: none }, recovery: 'Recovering',
          events: [ev(DATE, '08:36', 'Captured', SECTORS[1]), ev(DATE, '09:18', 'ABC Centre Entry', 'Assigned to POD 01')] },
        { id: 2148, sex: 'Male', size: 'Small', cond: ['Normal'], loc: SECTORS[3], stage: 'treatment', pod: null, day: DATE, dist: 22,
          tr: { st: none, rv: none, dw: none, ot: none }, recovery: 'Stable',
          events: [ev(DATE, '08:10', 'Captured', SECTORS[3]), ev(DATE, '08:52', 'ABC Centre Entry', 'Assigned to POD 02')] },
        { id: 2145, sex: 'Male', size: 'Medium', kg: 18, cond: ['Normal'], loc: SECTORS[0], stage: 'released', pod: null, day: DATE, dist: 21,
          tr: { st: done('Completed · ' + VET + ' · 12 Aug'), rv: done('Batch RV-1208 · 12 Aug'), dw: done('Completed · 12 Aug'), ot: none }, recovery: 'Stable',
          events: [ev('11 Aug', '14:23', 'Captured', SECTORS[0]), ev('11 Aug', '15:02', 'ABC Centre Entry', 'Assigned to POD 04'),
            ev('12 Aug', '10:30', 'Sterilised', 'Surgery by ' + VET), ev('12 Aug', '11:15', 'Rabies Vaccinated', 'Batch RV-1208'),
            ev(DATE, '09:40', 'Released', '21 m from capture point')] },
        { id: 2144, sex: 'Female', size: 'Small', cond: ['Normal'], loc: SECTORS[1], stage: 'released', pod: null, day: '13 Aug', dist: 17,
          tr: { st: done('Completed · ' + VET + ' · 11 Aug'), rv: done('Batch RV-1206 · 11 Aug'), dw: done('Completed · 11 Aug'), ot: none }, recovery: 'Stable',
          events: [ev('10 Aug', '10:05', 'Captured', SECTORS[1]), ev('10 Aug', '10:48', 'ABC Centre Entry', 'Assigned to POD 02'),
            ev('11 Aug', '09:50', 'Sterilised', 'Surgery by ' + VET), ev('11 Aug', '10:20', 'Rabies Vaccinated', 'Batch RV-1206'),
            ev('13 Aug', '16:10', 'Released', '17 m from capture point')] },
        { id: 2143, sex: 'Male', size: 'Large', cond: ['Aggressive'], loc: SECTORS[3], stage: 'treatment', pod: null, day: '13 Aug', dist: 29,
          tr: { st: done('Completed · ' + VET + ' · 13 Aug'), rv: none, dw: done('Completed · 13 Aug'), ot: none }, recovery: 'Recovering',
          events: [ev('12 Aug', '15:40', 'Captured', SECTORS[3]), ev('12 Aug', '16:25', 'ABC Centre Entry', 'Assigned to POD 01'),
            ev('13 Aug', '11:05', 'Sterilised', 'Surgery by ' + VET)] },
        { id: 2142, sex: 'Female', size: 'Medium', cond: ['Normal'], loc: SECTORS[0], stage: 'released', pod: null, day: '12 Aug', dist: 12,
          tr: { st: done('Completed · ' + VET + ' · 10 Aug'), rv: done('Batch RV-1204 · 10 Aug'), dw: done('Completed · 10 Aug'), ot: none }, recovery: 'Stable',
          events: [ev('09 Aug', '13:12', 'Captured', SECTORS[0]), ev('09 Aug', '13:55', 'ABC Centre Entry', 'Assigned to POD 03'),
            ev('10 Aug', '10:15', 'Sterilised', 'Surgery by ' + VET), ev('10 Aug', '10:40', 'Rabies Vaccinated', 'Batch RV-1204'),
            ev('12 Aug', '17:30', 'Released', '12 m from capture point')] },
      ],
    };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (s && s.v === 1 && Array.isArray(s.dogs) && Array.isArray(s.pods)) return s;
    } catch (e) { /* fall back to sample data */ }
    return seed();
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* session only */ } }
  var state = load();

  // ---------- Helpers ----------
  function icon(name) {
    var s = document.createElement('span');
    s.className = 'icon';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || ''; // static markup from the design file
    return s;
  }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  function hhmm(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
  // Each action moves the demo clock on a little, so timelines read in order
  function tick(mins) { state.clock = Math.min(23 * 60 + 50, state.clock + (mins || 9)); return hhmm(state.clock); }
  function dog(id) { return state.dogs.filter(function (d) { return d.id === id; })[0]; }
  function pod(id) { return state.pods.filter(function (p) { return p.id === id; })[0]; }
  function podName(id) { return 'POD ' + ('0' + id).slice(-2); }
  function dogPic(size) { return h('span', { class: 'dogpic dogpic--' + size, 'aria-hidden': 'true' }, icon('dog')); }
  function desc(d) { return [d.sex, d.size].concat(d.kg ? [d.kg + ' kg'] : []).join(' · '); }
  function sector(loc) { return loc.split(',')[0]; }
  var STAGE = {
    captured: ['Captured', 'badge--teal'], transit: ['In Transit', 'badge--amber'],
    treatment: ['In Treatment', 'badge--amber'], released: ['Released', 'badge--ok'],
  };
  function badge(stage, small) { return h('span', { class: 'badge ' + STAGE[stage][1] + (small ? ' badge--sm' : ''), text: STAGE[stage][0] }); }
  function readyToRelease(d) { return d.stage === 'treatment' && d.tr.st.done && d.tr.rv.done && d.recovery === 'Stable'; }

  var live = document.getElementById('live');
  function announce(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }

  // ---------- Navigation ----------
  var stack = [{ name: 'home' }];
  function go(name, args, replace) {
    var e = Object.assign({ name: name }, args || {});
    if (replace) stack[stack.length - 1] = e; else stack.push(e);
    render();
  }
  function tab(name) { stack = [{ name: name }]; render(); }
  function back() { if (stack.length > 1) stack.pop(); render(); }
  var app = document.getElementById('app');
  function render() {
    var top = stack[stack.length - 1];
    var el = SCREENS[top.name](top);
    app.replaceChildren(el);
    var h1 = el.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }

  // ---------- Building blocks ----------
  function topbar(title) {
    return h('header', { class: 'top' },
      stack.length > 1 ? h('button', { class: 'icon-btn icon-btn--left', type: 'button', 'aria-label': 'Back', onclick: back }, icon('back')) : null,
      h('h1', { text: title }));
  }
  function nav(active) {
    var items = [['home', 'Home', 'nav-home'], ['map', 'Map', 'nav-map'], ['records', 'Records', 'nav-records'], ['profile', 'Profile', 'nav-profile']];
    return h('nav', { class: 'nav', 'aria-label': 'Main' }, items.map(function (it) {
      return h('button', { type: 'button', 'aria-current': it[0] === active ? 'page' : null, onclick: function () { tab(it[0]); } }, icon(it[2]), it[1]);
    }));
  }
  function screen() { return h('div', { class: 'screen' }, Array.prototype.slice.call(arguments)); }
  function body() { return h('div', { class: 'body' }, Array.prototype.slice.call(arguments)); }
  function footer() { return h('div', { class: 'footer' }, Array.prototype.slice.call(arguments)); }
  function cta(label, onclick, iconName) { return h('button', { class: 'cta', type: 'button', onclick: onclick }, label, iconName ? icon(iconName) : null); }

  // ---------- Home ----------
  var SCREENS = {};
  SCREENS.home = function () {
    var active = state.pods.filter(function (p) { return p.dog; }).length;
    var free = state.pods.length - active;
    var today = state.dogs.filter(function (d) { return d.events[0].day === DATE; }); // captured today
    var delivered = state.dogs.filter(function (d) { return d.events.some(function (e) { return e.what === 'ABC Centre Entry' && e.day === DATE; }); }).length;
    var tile = function (label, value, iconName, onclick) {
      var inner = [h('div', null, h('p', { class: 'tile__label', text: label }), h('p', { class: 'tile__value', text: String(value) })),
        h('span', { class: 'tile__icon' }, icon(iconName))];
      return onclick ? h('button', { class: 'tile', type: 'button', onclick: onclick }, inner) : h('div', { class: 'tile' }, inner);
    };
    return screen(
      h('header', { class: 'home-top' }, h('h1', { class: 'brand-title', text: 'HUMANE' })),
      body(h('div', { class: 'stack' },
        h('div', { class: 'hello' },
          h('div', null, h('p', { class: 'hello__small', text: 'Good morning,' }), h('p', { class: 'hello__big', text: 'Field Team 04' })),
          h('span', { class: 'ring', 'aria-hidden': 'true' }, icon('user'))),
        h('button', { class: 'cta-big', type: 'button', onclick: function () { go('capture'); } },
          h('span', { class: 'plus' }, icon('plus')), 'CAPTURE DOG'),
        h('div', { class: 'tiles' },
          tile('ACTIVE PODS', active, 'box', function () { go('pods'); }),
          tile('DELIVERED', delivered, 'shield', function () { tab('records'); }),
          tile('AVAILABLE', free, 'check', function () { go('pods', { filter: 'available' }); }),
          tile("TODAY'S ROUTE", 5, 'route')),
        h('section', { class: 'card summary', 'aria-label': "Today's summary" },
          h('p', { class: 'summary__title', text: "Today's Summary" }),
          h('div', { class: 'summary__row' },
            h('div', null, h('p', { class: 'summary__num', style: null, text: String(today.length) }), h('p', { class: 'summary__lbl', text: 'Captured' })), h('i'),
            h('div', null, h('p', { class: 'summary__num', text: String(delivered) }), h('p', { class: 'summary__lbl', text: 'Delivered' })), h('i'),
            h('div', null, h('p', { class: 'summary__num', text: '0' }), h('p', { class: 'summary__lbl', text: 'Pending' }))))
      )),
      nav('home'));
  };

  // ---------- Capture ----------
  SCREENS.capture = function () {
    var form = { loc: SECTORS[0], sex: 'Male', size: 'Medium', cond: ['Normal'], photo: false };
    var err = h('p', { class: 'err', role: 'alert' });
    function chips(label, options, key, multi) {
      var group = h('div', { class: 'chips', role: 'group', 'aria-label': label });
      options.forEach(function (o) {
        var b = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false' }, icon('check'), o);
        b.addEventListener('click', function () {
          if (!multi) form[key] = o;
          else if (o === 'Normal') form.cond = ['Normal'];
          else {
            form.cond = form.cond.filter(function (c) { return c !== 'Normal'; });
            var i = form.cond.indexOf(o);
            if (i >= 0) form.cond.splice(i, 1); else form.cond.push(o);
            if (!form.cond.length) form.cond = ['Normal'];
          }
          sync();
        });
        b.dataset.value = o;
        group.appendChild(b);
      });
      function sync() {
        Array.prototype.forEach.call(group.children, function (b) {
          var on = multi ? form.cond.indexOf(b.dataset.value) >= 0 : form[key] === b.dataset.value;
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
      sync();
      return group;
    }
    var locSel = h('select', { 'aria-label': 'Location', onchange: function () { form.loc = SECTORS.indexOf(locSel.value) >= 0 ? locSel.value : SECTORS[0]; } },
      SECTORS.map(function (s) { return h('option', { value: s, text: s }); }));
    var photo = h('button', { class: 'photo', type: 'button', 'aria-pressed': 'false' }, icon('camera'), h('span', { text: 'Take Photo' }));
    photo.addEventListener('click', function () {
      form.photo = !form.photo;
      photo.setAttribute('aria-pressed', form.photo ? 'true' : 'false');
      photo.lastChild.textContent = form.photo ? 'Photo added' : 'Take Photo';
    });
    var notes = h('input', { type: 'text', maxlength: 120, placeholder: 'Add notes (optional)', 'aria-label': 'Notes', autocomplete: 'off' });
    function next() {
      if (!state.pods.some(function (p) { return !p.dog; })) { err.textContent = 'All PODs are in use. Hand a dog over at the ABC Centre first.'; return; }
      var n = notes.value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
      go('assign', { draft: { loc: form.loc, sex: form.sex, size: form.size, cond: form.cond.slice(), photo: form.photo, notes: n } });
    }
    return screen(
      topbar('Capture Dog'),
      body(
        h('p', { class: 'label', text: 'LOCATION' }), h('label', { class: 'field' }, icon('pin'), locSel),
        h('p', { class: 'label', text: 'SEX' }), chips('Sex', ['Male', 'Female', 'Unknown'], 'sex'),
        h('p', { class: 'label', text: 'SIZE (APPROX.)' }), chips('Size', ['Small', 'Medium', 'Large'], 'size'),
        h('p', { class: 'label', text: 'CONDITION' }), chips('Condition', ['Normal', 'Injured', 'Aggressive', 'Suspected Rabies'], 'cond', true),
        h('p', { class: 'label', text: 'PHOTO' }), photo,
        h('p', { class: 'label', text: 'NOTES' }), h('label', { class: 'field field--short' }, notes),
        err),
      footer(cta('Continue', next, 'chev')));
  };

  // ---------- Assign POD ----------
  SCREENS.assign = function (args) {
    var free = state.pods.filter(function (p) { return !p.dog; })[0];
    if (!free) return SCREENS.capture();
    function assign() {
      var id = Math.max.apply(null, state.dogs.map(function (d) { return d.id; })) + 1;
      var t = tick(6);
      var d = args.draft;
      state.dogs.unshift({ id: id, sex: d.sex, size: d.size, cond: d.cond, loc: d.loc, notes: d.notes, photo: d.photo,
        stage: 'captured', pod: free.id, day: DATE, dist: 10 + (id * 7) % 31,
        tr: { st: { done: false }, rv: { done: false }, dw: { done: false }, ot: { done: false } }, recovery: 'Stable',
        events: [{ day: DATE, time: t, what: 'Captured', meta: d.loc }] });
      free.dog = id;
      free.since = state.clock;
      save();
      stack = [{ name: 'home' }]; // the capture form is done: Back from here leads home
      go('captured', { id: id });
      announce('Dog #' + id + ' captured and linked to ' + podName(free.id) + '.');
    }
    return screen(
      topbar('Assign POD'),
      body(
        h('p', { class: 'scan-label', text: 'Scan POD QR Code' }),
        h('div', { class: 'scanner', 'aria-hidden': 'true' }, h('div', { class: 'scanner__window' }, qr()), h('span', { class: 'scanner__line' })),
        h('section', { class: 'card pod', 'aria-label': podName(free.id) },
          h('div', { class: 'pod__head' }, h('p', { class: 'pod__name', text: podName(free.id) }), h('span', { class: 'badge badge--ok-line', text: 'Available' })),
          h('p', { class: 'pod__meta' }, icon('clock'), 'Last cleaned · ' + DATE + ', ' + free.cleaned + (+free.cleaned.slice(0, 2) < 12 ? ' AM' : ' PM'))),
        h('p', { class: 'ask', text: 'Assign this dog to ' + podName(free.id) + '?' }),
        h('p', { class: 'ask-sub', text: 'Dog will be linked to this POD until release.' })),
      footer(cta('Assign POD', assign, 'check')));
  };
  function qr() { // a decorative QR-style pattern
    var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 21 21'); svg.setAttribute('class', 'qr');
    var bits = '111111101011001111111100000101101010000011011101011100101011101101110100011010111011011101011001101110110000010101001000001111111101010101111111000000000110100000000110110110001100110101001011111010011010110101010100111110010111001011000000000101101000101111111101100101100101100000100110011101001011101101011101000111011101001010010110110111010110111111101100000101100110010001011111111010101111110011'.split('');
    for (var i = 0; i < 441; i++) if (bits[i % bits.length] === '1') {
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', i % 21); r.setAttribute('y', Math.floor(i / 21)); r.setAttribute('width', 1); r.setAttribute('height', 1); r.setAttribute('fill', '#38392B');
      svg.appendChild(r);
    }
    return svg;
  }

  // ---------- Capture confirmed ----------
  SCREENS.captured = function (args) {
    var d = dog(args.id);
    var e = d.events[0];
    return screen(
      body(h('div', { class: 'hero' },
        h('span', { class: 'hero__badge', 'aria-hidden': 'true' }, icon('check')),
        h('h1', { class: 'hero__title', text: 'DOG CAPTURED' }),
        h('p', { class: 'hero__sub' }, 'Linked to ', h('b', { text: podName(d.pod) })),
        h('span', { class: 'dogpic dogpic--xl', 'aria-hidden': 'true' }, icon('dog'))),
        h('section', { class: 'card kv', 'aria-label': 'Capture details', style: null },
          h('div', null, 'Location', h('b', { text: d.loc })),
          h('div', null, 'Time', h('b', { text: e.day + ' 2026, ' + e.time })),
          h('div', null, 'Captured by', h('b', { text: TEAM })),
          h('div', null, 'Status', h('span', { class: 'badge badge--solid', text: 'SECURED' })))),
      footer(cta('Navigate to ABC Centre', function () { toTransit(d); }, 'pin'),
        h('button', { class: 'link', type: 'button', onclick: function () { go('timeline', { id: d.id }, true); } }, 'View dog record')));
  };
  function toTransit(d) {
    d.stage = 'transit';
    save();
    go('handover', { id: d.id }, true);
  }

  // ---------- Handover at ABC ----------
  SCREENS.handover = function (args) {
    var d = dog(args.id);
    var cap = d.events[0];
    function accept() {
      var t = tick(14);
      var p = pod(d.pod);
      d.events.push({ day: DATE, time: t, what: 'ABC Centre Entry', meta: 'Assigned to ' + podName(d.pod) });
      d.stage = 'treatment';
      if (p) { p.dog = null; p.since = null; p.cleaned = t; }
      d.pod = null;
      save();
      go('record', { id: d.id }, true);
      announce('Dog #' + d.id + ' accepted into the ABC Centre.');
    }
    return screen(
      topbar('Handover at ABC Centre'),
      body(
        h('p', { class: 'scan-label', text: 'Scan POD QR Code' }),
        h('div', { class: 'scanner scanner--wide', 'aria-hidden': 'true' }, h('div', { class: 'scanner__window' }, 'ABC'), h('span', { class: 'scanner__line' })),
        h('section', { class: 'card', 'aria-label': podName(d.pod) },
          h('div', { class: 'pod', style: null },
            h('div', { class: 'pod__head' }, h('p', { class: 'pod__name', text: podName(d.pod) }), h('span', { class: 'badge badge--ok', text: 'Scanned' }))),
          h('div', { class: 'stack-kv' },
            h('p', { text: 'Dog' }), h('b', { text: 'Dog #' + d.id }),
            h('p', { text: 'Captured' }), h('b', { text: cap.day + ' 2026, ' + cap.time }),
            h('p', { text: 'From' }), h('b', { text: d.loc })))),
      footer(cta('Accept into ABC Centre', accept, 'check')));
  };

  // ---------- ABC record (treatment) ----------
  SCREENS.record = function (args) {
    var d = dog(args.id);
    var draft = JSON.parse(JSON.stringify(d.tr));
    var recovery = d.recovery;
    var batch = 'RV-' + (1200 + d.id % 100);
    var otherInput = h('input', { type: 'text', maxlength: 80, placeholder: 'Medication or note', 'aria-label': 'Other treatment note', value: d.tr.ot.note || '', autocomplete: 'off' });
    var otherWrap = h('label', { class: 'field field--short other' }, otherInput);
    otherWrap.hidden = !draft.ot.done;
    var items = [
      ['st', 'Sterilisation', 'Completed · ' + VET + ' · ' + DATE, 'Surgery by ' + VET],
      ['rv', 'Rabies Vaccination', 'Batch ' + batch + ' · ' + DATE],
      ['dw', 'Deworming', 'Completed · ' + DATE],
      ['ot', 'Other Treatment', 'Add a note or medication'],
    ];
    var list = h('ul', { class: 'checks' }, items.map(function (it) {
      var key = it[0], locked = d.tr[key].done && key !== 'ot';
      var meta = h('p', { class: 'check__meta', text: draft[key].done ? (d.tr[key].meta || it[2]) : (key === 'ot' ? it[2] : 'Not done yet') });
      var b = h('button', { class: 'check', type: 'button', 'aria-pressed': draft[key].done ? 'true' : 'false', 'aria-disabled': locked ? 'true' : null },
        h('span', { class: 'check__box' }, icon('check')), h('div', null, h('p', { class: 'check__title', text: it[1] }), meta));
      b.addEventListener('click', function () {
        if (locked) return; // recorded steps stay on the timeline
        draft[key].done = !draft[key].done;
        b.setAttribute('aria-pressed', draft[key].done ? 'true' : 'false');
        meta.textContent = draft[key].done ? (key === 'ot' ? 'Add a note or medication' : it[2]) : (key === 'ot' ? it[2] : 'Not done yet');
        if (key === 'ot') { otherWrap.hidden = !draft.ot.done; if (draft.ot.done) otherInput.focus(); }
      });
      return h('li', null, b);
    }));
    var sel = h('select', { 'aria-label': 'Recovery status', onchange: function () { recovery = RECOVERY.indexOf(sel.value) >= 0 ? sel.value : 'Stable'; } },
      RECOVERY.map(function (r) { return h('option', { value: r, selected: r === recovery ? true : null, text: r }); }));
    function saveRecord() {
      var labels = { st: ['Sterilised', 'Surgery by ' + VET], rv: ['Rabies Vaccinated', 'Batch ' + batch], dw: ['Dewormed', 'Deworming completed'] };
      ['st', 'rv', 'dw'].forEach(function (k) {
        if (draft[k].done && !d.tr[k].done) {
          d.tr[k] = { done: true, meta: items.filter(function (i) { return i[0] === k; })[0][2] };
          d.events.push({ day: DATE, time: tick(7), what: labels[k][0], meta: labels[k][1] });
        }
      });
      var note = otherInput.value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (draft.ot.done && note) {
        if (!d.tr.ot.done || d.tr.ot.note !== note) d.events.push({ day: DATE, time: tick(5), what: 'Other Treatment', meta: note });
        d.tr.ot = { done: true, note: note, meta: note };
      } else if (!draft.ot.done) d.tr.ot = { done: false };
      d.recovery = recovery;
      save();
      go('timeline', { id: d.id }, true);
      announce('Record saved for Dog #' + d.id + '.');
    }
    return screen(
      topbar('ABC Record'),
      body(
        h('section', { class: 'card dogcard', 'aria-label': 'Dog #' + d.id }, dogPic('l'),
          h('div', { class: 'dogcard__body' }, h('p', { class: 'dogcard__name', text: 'Dog #' + d.id }), h('p', { class: 'dogcard__meta', text: desc(d) })),
          badge(d.stage)),
        h('p', { class: 'label', text: 'TREATMENT CHECKLIST' }), list, otherWrap,
        h('p', { class: 'label', text: 'RECOVERY STATUS' }), h('label', { class: 'field field--short' }, icon('shield'), sel)),
      footer(cta('Save record', saveRecord, 'check')));
  };

  // ---------- Return & release ----------
  SCREENS.release = function (args) {
    var d = dog(args.id);
    var confirm = null;
    function ask() {
      confirm = h('div', { class: 'scrim', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rel-t' },
        h('div', { class: 'dialog' },
          h('span', { class: 'dialog__icon', 'aria-hidden': 'true' }, icon('pin')),
          h('h2', { id: 'rel-t', text: 'Release Dog #' + d.id + '?' }),
          h('p', { text: 'This marks the dog as released at ' + d.loc + ' and closes its active POD. This action can’t be undone.' }),
          h('button', { class: 'cta', type: 'button', onclick: doRelease }, icon('check'), 'Yes, Release Dog'),
          h('button', { class: 'cta cta--ghost', type: 'button', onclick: close }, 'Cancel')));
      el.appendChild(confirm);
      confirm.querySelector('.cta').focus();
      confirm.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
        if (e.key === 'Tab') { // keep focus inside the dialog
          var f = confirm.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }
    function close() { if (confirm) { confirm.remove(); confirm = null; el.querySelector('.footer .cta').focus(); } }
    function doRelease() {
      var t = tick(12);
      d.events.push({ day: DATE, time: t, what: 'Released', meta: d.dist + ' m from capture point' });
      d.stage = 'released';
      d.day = DATE;
      save();
      go('released', { id: d.id }, true);
      announce('Dog #' + d.id + ' released.');
    }
    var el = screen(
      topbar('Return & Release'),
      body(
        h('p', { class: 'label', text: 'ORIGINAL CAPTURE LOCATION' }),
        h('div', { class: 'field field--short' }, icon('pin'), h('span', { text: d.loc })),
        h('div', { class: 'minimap', 'aria-hidden': 'true' }, miniMap(),
          h('span', { class: 'mapchip', style: null, text: 'Capture point' }),
          h('span', { class: 'mapchip', text: 'You are here' })),
        h('p', { class: 'distance' }, h('b', { text: d.dist + ' m' }), h('span', { text: 'from capture point' })),
        h('div', { class: 'note' }, h('span', { class: 'note__dot' }, icon('check')),
          h('div', null, h('p', { class: 'note__title', text: 'Within 50 m release zone' }), h('p', { class: 'note__sub', text: 'Correct location — safe to release' })))),
      footer(cta('Confirm release', ask, 'check')));
    var chipsEls = el.querySelectorAll('.mapchip');
    chipsEls[0].style.cssText = 'left: 112px; top: 52px; color: #4B612D';
    chipsEls[1].style.cssText = 'left: 202px; top: 126px; color: #3E7C74';
    return el;
  }
  function miniMap() {
    var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 350 230'); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    var parts = [
      ['rect', { x: 16, y: 14, width: 120, height: 80, rx: 6, fill: '#DBE1CD' }], ['rect', { x: 214, y: 150, width: 120, height: 70, rx: 6, fill: '#DBE1CD' }],
      ['rect', { x: 220, y: 14, width: 110, height: 70, rx: 6, fill: '#E1E2DA' }], ['rect', { x: 16, y: 150, width: 110, height: 70, rx: 6, fill: '#E1E2DA' }],
      ['path', { d: 'M0 120 H350', stroke: '#F5F5F0', 'stroke-width': 16 }], ['path', { d: 'M170 0 V230', stroke: '#F5F5F0', 'stroke-width': 16 }],
      ['circle', { cx: 175, cy: 105, r: 70, fill: 'rgba(75,97,45,0.10)', stroke: '#4B612D', 'stroke-dasharray': '4 4' }],
      ['path', { d: 'M150 92 Q 190 110 232 160', stroke: '#3E7C74', 'stroke-width': 2, 'stroke-dasharray': '5 4', fill: 'none' }],
      ['circle', { cx: 150, cy: 92, r: 9, fill: '#4B612D', stroke: '#fff', 'stroke-width': 3 }],
      ['circle', { cx: 232, cy: 160, r: 9, fill: '#3E7C74', stroke: '#fff', 'stroke-width': 3 }],
    ];
    parts.forEach(function (p) { var e = document.createElementNS(NS, p[0]); Object.keys(p[1]).forEach(function (k) { e.setAttribute(k, p[1][k]); }); svg.appendChild(e); });
    return svg;
  }

  SCREENS.released = function (args) {
    var d = dog(args.id), e = d.events[d.events.length - 1];
    return screen(
      body(h('div', { class: 'hero' },
        h('span', { class: 'hero__halo', 'aria-hidden': 'true' }, h('span', null, h('span', { class: 'hero__badge' }, icon('check')))),
        h('h1', { class: 'hero__title', text: 'DOG RELEASED' }),
        h('p', { class: 'hero__sub', text: 'Dog #' + d.id + ' safely returned to its territory' })),
        h('section', { class: 'card kv', 'aria-label': 'Release details' },
          h('div', null, 'Released at', h('b', { text: d.loc })),
          h('div', null, 'Distance', h('b', { text: d.dist + ' m from capture' })),
          h('div', null, 'Time', h('b', { text: e.day + ' 2026, ' + e.time }))),
        h('p', { class: 'note note--plain', text: 'Full lifecycle recorded — capture to release is now traceable.' })),
      footer(cta('View full record', function () { go('timeline', { id: d.id }, true); }),
        h('button', { class: 'link', type: 'button', onclick: function () { tab('home'); } }, 'Back to Home')));
  };

  // ---------- Timeline ----------
  SCREENS.timeline = function (args) {
    var d = dog(args.id);
    if (!d) return SCREENS.records({});
    var ICON_FOR = { 'Captured': 'pin', 'ABC Centre Entry': 'box', 'Sterilised': 'shield', 'Rabies Vaccinated': 'syringe', 'Dewormed': 'check', 'Other Treatment': 'doc', 'Released': 'nav-home' };
    var next = null;
    if (d.stage === 'captured') next = cta('Navigate to ABC Centre', function () { toTransit(d); }, 'pin');
    else if (d.stage === 'transit') next = cta('Accept into ABC Centre', function () { go('handover', { id: d.id }); }, 'check');
    else if (readyToRelease(d)) next = cta('Return & Release', function () { go('release', { id: d.id }); }, 'pin');
    else if (d.stage === 'treatment') next = cta('Open ABC Record', function () { go('record', { id: d.id }); }, 'doc');
    return screen(
      topbar('Dog #' + d.id),
      body(
        h('section', { class: 'card dogcard', 'aria-label': 'Dog #' + d.id }, dogPic('m'),
          h('div', { class: 'dogcard__body' }, h('p', { class: 'check__title', style: null, text: desc(d) }), h('p', { class: 'dogcard__meta', text: d.loc })),
          badge(d.stage)),
        h('p', { class: 'label', text: 'LIFECYCLE TIMELINE' }),
        h('ol', { class: 'timeline' }, d.events.map(function (e) {
          return h('li', { class: 'tl' }, h('span', { class: 'tl__dot', 'aria-hidden': 'true' }, icon(ICON_FOR[e.what] || 'check')),
            h('div', { class: 'tl__card' },
              h('p', { class: 'tl__when', text: e.day.toUpperCase() + ' · ' + e.time }),
              h('p', { class: 'tl__what', text: e.what }),
              h('p', { class: 'tl__meta', text: e.meta })));
        }))),
      next ? footer(next) : null);
  };

  // ---------- Active PODs ----------
  SCREENS.pods = function (args) {
    var filter = args.filter || 'all';
    var occupied = state.pods.filter(function (p) { return p.dog; });
    if (!occupied.length && filter !== 'available') {
      return screen(topbar('Active PODs'),
        body(h('div', { class: 'empty' },
          h('span', { class: 'empty__pic', 'aria-hidden': 'true' }, icon('box')),
          h('h2', { text: 'No active PODs' }),
          h('p', { text: 'All PODs are currently available. Capture a dog to assign one and start a new record.' }),
          h('button', { class: 'cta', type: 'button', onclick: function () { go('capture', null, true); } }, 'Capture dog'))));
    }
    var transit = occupied.filter(function (p) { return dog(p.dog).stage === 'transit'; });
    var free = state.pods.filter(function (p) { return !p.dog; });
    var shown = filter === 'transit' ? transit : filter === 'available' ? free : state.pods;
    var tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Filter PODs' },
      [['all', 'All (' + state.pods.length + ')'], ['transit', 'In Transit (' + transit.length + ')'], ['available', 'Available (' + free.length + ')']].map(function (t) {
        return h('button', { class: 'tab', type: 'button', 'aria-pressed': filter === t[0] ? 'true' : 'false', onclick: function () { go('pods', { filter: t[0] }, true); } }, t[1]);
      }));
    return screen(topbar('Active PODs'), body(tabs,
      h('ul', { class: 'list' }, shown.map(function (p) {
        if (!p.dog) {
          return h('li', null, h('div', { class: 'podcard' },
            h('div', { class: 'podcard__head' }, h('span', { class: 'podtag', text: podName(p.id) }), h('span', { class: 'podcard__dog podcard__dog--muted', text: 'Ready to use' })),
            h('div', { class: 'podcard__body' },
              h('div', null, h('p', { class: 'podcard__state' }, icon('check'), 'Available'), h('p', { class: 'podcard__time', text: 'Ready to use · cleaned ' + p.cleaned })),
              h('span', { class: 'emptypic', 'aria-hidden': 'true' }, icon('box')))));
        }
        var d = dog(p.dog), ago = Math.max(1, state.clock - p.since);
        return h('li', null, h('button', { class: 'podcard', type: 'button', onclick: function () { go('timeline', { id: d.id }); } },
          h('div', { class: 'podcard__head' }, h('span', { class: 'podtag', text: podName(p.id) }), h('span', { class: 'podcard__dog', text: 'Dog #' + d.id })),
          h('div', { class: 'podcard__body' },
            h('div', null, h('p', { class: 'podcard__state' }, icon(d.stage === 'transit' ? 'route' : 'pin'), STAGE[d.stage][0]),
              h('p', { class: 'podcard__time', text: ago + ' min ago' })),
            dogPic('m'))));
      }))));
  };

  // ---------- Records ----------
  SCREENS.records = function (args) {
    var filter = args.filter || 'all';
    var list = state.dogs.filter(function (d) {
      return filter === 'all' || (filter === 'treatment' ? d.stage !== 'released' : d.stage === 'released');
    });
    return screen(
      h('h1', { class: 'big-title', text: 'Dog Records' }),
      body(
        h('div', { class: 'tabs tabs--hug', role: 'group', 'aria-label': 'Filter records' },
          [['all', 'All'], ['treatment', 'In Treatment'], ['released', 'Released']].map(function (t) {
            return h('button', { class: 'tab', type: 'button', 'aria-pressed': filter === t[0] ? 'true' : 'false', onclick: function () { stack = [{ name: 'records', filter: t[0] }]; render(); } }, t[1]);
          })),
        h('ul', { class: 'list' }, list.map(function (d) {
          return h('li', null, h('button', { class: 'rec', type: 'button', onclick: function () { go('timeline', { id: d.id }); } }, dogPic('m'),
            h('div', { class: 'rec__body' },
              h('div', { class: 'rec__top' }, h('p', { class: 'rec__name', text: 'Dog #' + d.id }), badge(d.stage, true)),
              h('p', { class: 'rec__meta' }, icon('pin'), sector(d.loc) + '  ·  ' + d.day))));
        }))),
      nav('records'));
  };

  // ---------- Map ----------
  SCREENS.map = function () {
    var COLORS = { captured: '#4B612D', sterilised: '#3E7C74', vaccinated: '#B98A3C', released: '#6E5A86', complaint: '#B0563F' };
    function kind(d) {
      if (d.stage === 'released') return 'released';
      if (d.tr.rv.done) return 'vaccinated';
      if (d.tr.st.done) return 'sterilised';
      return 'captured';
    }
    var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 350 300'); svg.setAttribute('aria-hidden', 'true');
    [['rect', { width: 350, height: 300, fill: '#E7E8E0' }], ['rect', { x: 16, y: 14, width: 120, height: 80, rx: 6, fill: '#DBE1CD' }],
      ['rect', { x: 210, y: 200, width: 120, height: 86, rx: 6, fill: '#DBE1CD' }], ['rect', { x: 220, y: 14, width: 110, height: 70, rx: 6, fill: '#E1E2DA' }],
      ['rect', { x: 16, y: 200, width: 110, height: 86, rx: 6, fill: '#E1E2DA' }],
      ['path', { d: 'M0 150 C 120 120, 230 180, 350 150', stroke: '#F5F5F0', 'stroke-width': 16, fill: 'none' }],
      ['path', { d: 'M150 0 C 180 100, 120 200, 160 300', stroke: '#F5F5F0', 'stroke-width': 16, fill: 'none' }],
      ['path', { d: 'M0 150 C 120 120, 230 180, 350 150', stroke: '#CFD2C7', 'stroke-width': 1.5, fill: 'none' }],
      ['path', { d: 'M150 0 C 180 100, 120 200, 160 300', stroke: '#CFD2C7', 'stroke-width': 1.5, fill: 'none' }],
    ].forEach(function (p) { var e = document.createElementNS(NS, p[0]); Object.keys(p[1]).forEach(function (k) { e.setAttribute(k, p[1][k]); }); svg.appendChild(e); });
    var map = h('div', { class: 'map' }, svg);
    var pins = state.dogs.map(function (d) { return { id: d.id, k: kind(d), x: 20 + (d.id * 53) % 300, y: 20 + (d.id * 37) % 250 }; })
      .concat([{ k: 'complaint', x: 240, y: 150 }, { k: 'complaint', x: 50, y: 170 }]);
    pins.forEach(function (p) {
      var label = p.id ? 'Dog #' + p.id + ', ' + p.k : 'Complaint reported';
      var el = p.id ? h('button', { class: 'pin', type: 'button', 'aria-label': label, onclick: function () { go('timeline', { id: p.id }); } }, h('span'))
        : h('span', { class: 'pin', role: 'img', 'aria-label': label }, h('span'));
      el.style.left = (p.x / 350 * 100) + '%';
      el.style.top = (p.y / 300 * 100) + '%';
      el.firstChild.style.background = COLORS[p.k];
      map.appendChild(el);
    });
    var count = function (k) { return pins.filter(function (p) { return p.k === k || (k === 'sterilised' && p.id && dog(p.id).tr.st.done) || (k === 'vaccinated' && p.id && dog(p.id).tr.rv.done); }).length; };
    var captured = state.dogs.filter(function (d) { return d.day === DATE && d.events[0].day === DATE; }).length;
    var nums = [['captured', 'Captured', captured], ['sterilised', 'Sterilised', count('sterilised')], ['vaccinated', 'Vaccinated', count('vaccinated')],
      ['released', 'Released', state.dogs.filter(function (d) { return d.stage === 'released'; }).length], ['complaint', 'Complaints', 2]];
    return screen(
      topbar('ABC Map Overview'),
      body(map,
        h('div', { class: 'legend' }, nums.map(function (n) { var i = h('i'); i.style.background = COLORS[n[0]]; return h('span', null, i, n[1]); })),
        h('section', { class: 'card overview', 'aria-label': "Today's overview", style: null },
          h('p', { class: 'summary__title', text: "Today's Overview" }),
          h('div', { class: 'overview__row' }, nums.map(function (n) {
            var i = h('i'); i.style.background = COLORS[n[0]];
            return h('div', null, i, h('p', { class: 'overview__num', text: String(n[2]) }), h('p', { class: 'overview__lbl', text: n[1] }));
          })))),
      nav('map'));
  };

  // ---------- Profile ----------
  SCREENS.profile = function () {
    var today = state.dogs.filter(function (d) { return d.events[0].day === DATE; }).length;
    function row(label, iconName, onclick, danger) {
      var inner = [h('span', { class: 'menu__icon' }, icon(iconName)), h('span', { class: 'menu__label', text: label }), onclick ? h('span', { class: 'chev' }, icon('chev')) : null];
      return onclick ? h('button', { class: 'menu__row', type: 'button', onclick: onclick }, inner)
        : h('div', { class: 'menu__row' + (danger ? ' menu__row--danger' : '') }, inner);
    }
    return screen(
      body(h('div', { class: 'me' },
        h('span', { class: 'me__pic', 'aria-hidden': 'true' }, icon('user')),
        h('h1', { class: 'me__name', text: 'Ravi Kumar' }),
        h('p', { class: 'me__team', text: 'Field Team 04 · ABC Chandigarh' })),
        h('section', { class: 'card stats3', 'aria-label': 'My captures' },
          h('div', null, h('b', { text: String(today) }), h('span', { text: 'Today' })), h('i'),
          h('div', null, h('b', { text: String(33 + today) }), h('span', { text: 'This week' })), h('i'),
          h('div', null, h('b', { text: String(209 + today) }), h('span', { text: 'Total' }))),
        h('div', { class: 'card menu' },
          row('My Dog Records', 'doc', function () { tab('records'); }),
          row('Assigned PODs', 'box', function () { go('pods'); }),
          row('Route History', 'route'),
          row('Settings', 'settings'),
          row('Help & Support', 'help'),
          row('Log out', 'logout', null, true))),
      nav('profile'));
  };

  // ---------- Reset demo / Esc ----------
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    if (!e.data || e.data.type !== 'reset-demo') return;
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    state = seed();
    tab('home');
    announce('Demo reset.');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !document.querySelector('.scrim') && window.parent !== window) {
      window.parent.postMessage({ type: 'close-demo' }, location.origin);
    }
  });

  render();
})();
