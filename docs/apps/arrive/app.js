// ARRIVE — working demo of the student-life super app.
// Onboarding, a first-week checklist whose progress updates everywhere, Journey, Explore,
// events, jobs, money and transport. Sample data only (Bobby, Priory Hall, Coventry).
// Browser only; saved in localStorage. Typed text is only ever set with textContent/value.
(function () {
  'use strict';

  var ICONS = window.ARR_ICONS;
  var STORE_KEY = 'arrive-demo-v1';
  document.body.classList.add(new URLSearchParams(location.search).get('view') === 'frame' ? 'view-frame' : 'view-full');

  // ---------- Sample data ----------
  var SECTIONS = ['Before arrival', 'First 24 hours', 'First week', 'First month'];
  var TASKS = [
    { id: 'accom', sec: 0, t: 'Confirm accommodation', s: 'Priory Hall · Coventry', done: true },
    { id: 'docs', sec: 0, t: 'Prepare documents', s: 'Passport, visa, CAS letter', done: true },
    { id: 'airport', sec: 0, t: 'Arrange airport transport', s: 'National Express to Coventry', done: true },
    { id: 'keys', sec: 1, fw: true, t: 'Collect accommodation keys', s: 'Priory Hall reception' },
    { id: 'sim', sec: 1, fw: true, t: 'Get a UK SIM card', s: 'giffgaff · picked up at Tesco', done: true },
    { id: 'shop', sec: 1, fw: true, t: 'Find your nearest supermarket', s: 'Tesco Express · 8 min walk', done: true },
    { id: 'wifi', sec: 1, fw: true, t: 'Connect to campus Wi-Fi', s: 'eduroam', done: true },
    { id: 'reg', sec: 2, fw: true, t: 'University registration', s: 'In progress · opens 9:00 AM today' },
    { id: 'bank', sec: 2, fw: true, t: 'Open a UK bank account', s: 'Bring your BRP + student letter', done: true },
    { id: 'card', sec: 2, fw: true, t: 'Get your student ID card', s: 'Coventry Uni Library, ground floor', done: true },
    { id: 'travel', sec: 2, fw: true, t: 'Set up your travel card', s: 'Add funds to travel around Coventry' },
    { id: 'gp', sec: 3, t: 'Register with a GP', s: 'University Health Centre' },
    { id: 'work', sec: 3, t: 'Find part-time work', s: 'Match jobs to your timetable' },
    { id: 'socs', sec: 3, t: 'Join societies', s: 'Freshers Fair · 24 Sep' },
    { id: 'pay', sec: 3, t: 'Set up recurring payments', s: 'Rent & bills' },
    { id: 'city', sec: 3, t: 'Explore the city', s: 'War Memorial Park, city centre' },
  ];
  // The three first-week tasks shown on Home ("Up next"), in order, with their detail pages
  var UP_NEXT = ['reg', 'keys', 'travel'];
  var DETAIL = {
    reg: {
      title: 'Complete university registration', desc: 'Register online before your first lecture.', icon: 'graduation-cap',
      when: 'Due today', badge: ['Due soon', 'warning'], tag: ['Due today', 'warning'], mins: 'About 15 min',
      why: 'Registration confirms your place, unlocks your timetable, and lets you collect your student ID.',
      need: ['Your BRP or passport', 'University offer letter', 'A passport-style photo for your ID'],
      steps: ['Sign in to the Student Portal', 'Confirm your personal details', 'Upload your ID photo', 'Submit and await confirmation'],
    },
    keys: {
      title: 'Pick up accommodation keys', desc: 'Priory Hall reception, before 5:00 PM.', icon: 'key',
      when: 'Today · 5:00 PM', badge: ['Today', 'primary'], tag: ['Today', 'primary'], mins: 'About 10 min',
      why: 'Your keys, room card and welcome pack are waiting at reception. You need them to move in tonight.',
      need: ['Your booking confirmation', 'Photo ID (passport or BRP)', 'Your student number'],
      steps: ['Go to Priory Hall reception', 'Show your booking and ID', 'Sign the room inventory', 'Collect your keys and welcome pack'],
    },
    travel: {
      title: 'Set up your travel card', desc: 'Add funds to travel around Coventry.', icon: 'credit-card',
      when: 'This week', badge: ['Soon', 'muted'], tag: ['This week', 'muted'], mins: 'About 5 min',
      why: 'A student travel card makes buses around Coventry cheaper than paying for single tickets.',
      need: ['Your student ID card', 'A passport-style photo', 'A debit card to add funds'],
      steps: ['Open the bus operator’s app', 'Choose a student travel card', 'Add your photo and student ID', 'Top up and start travelling'],
    },
  };
  var INTERESTS = ['Design', 'Photography', 'Coffee', 'Football', 'Gaming', 'Music', 'Anime & Manga', 'Cooking', 'Fitness', 'Coding', 'Film', 'Travel', 'Volunteering', 'Art'];
  var FOCUS = [
    ['uni', 'University', 'Registration, timetable, ID', 'graduation-cap'],
    ['money', 'Money', 'Budgeting and payments', 'wallet'],
    ['jobs', 'Jobs', 'Part-time work near you', 'briefcase'],
    ['transport', 'Transport', 'Buses, trains, travel card', 'bus'],
    ['social', 'Social', 'Events, groups, meeting people', 'users'],
    ['accom', 'Accommodation', 'Keys, contracts, contacts', 'key'],
  ];
  var PLACES = [
    { n: 'Tesco Express', badge: ['Open', 'success'], dist: '8 min walk', meta: '· Groceries · Until 23:00', cat: 'Groceries', icon: 'shopping-cart' },
    { n: 'Costa Coffee', badge: ['Open', 'success'], dist: '5 min walk', meta: '· Café · Until 20:00', cat: 'Food', icon: 'coffee' },
    { n: 'Coventry Uni Library', badge: ['24/7', 'success'], dist: 'On campus', meta: '· Study · Open now', cat: 'Study', icon: 'book-open' },
    { n: 'University Health Centre', badge: ['Closes 17:00', 'warning'], dist: '12 min walk', meta: '· Healthcare · GP', cat: 'Health', icon: 'shield' },
    { n: 'Pool Meadow Bus Station', badge: ['Open', 'success'], dist: '6 min walk', meta: '· Transport · Buses', cat: 'Transport', icon: 'bus', go: 'transport' },
  ];
  var EVENTS = [
    { id: 'design', title: 'Freshers Design Social', dow: 'FRI', day: '12', mon: 'SEP', where: 'Coventry SU · Today 7:00 PM · 2.1 km', when: 'Tonight · 7:00 PM',
      host: 'Coventry Design Society', hi: 'D', date: 'Friday 12 Sep · 7:00–10:00 PM', loc: 'Coventry SU, The Hub · 2.1 km', entry: 'Free · bring your student ID',
      about: 'New to Coventry? Come and meet other design students over free pizza and music. A relaxed evening to make friends before term properly kicks off — everyone welcome.',
      going: 128, deco: 'music' },
    { id: 'mixer', title: 'International Students Mixer', dow: 'SAT', day: '20', mon: 'SEP', where: 'The Hub · Sat 8:00 PM · 1.4 km', when: 'Sat 20 Sep · 8:00 PM',
      host: 'International Students’ Society', hi: 'I', date: 'Saturday 20 Sep · 8:00–11:00 PM', loc: 'The Hub, Coventry SU · 1.4 km', entry: 'Free · bring your student ID',
      about: 'Meet students from all over the world at The Hub. Games, snacks and a world-music playlist — come on your own and leave with new friends.',
      going: 94, deco: 'globe' },
  ];
  var GROUPS = [['photo', 'Photography', '1.2k members', 'camera'], ['gaming', 'Gaming', '980 members', 'gamepad'], ['sports', 'Sports', '2.1k members', 'dumbbell'],
    ['design', 'Design', '640 members', 'book-open'], ['intl', 'International', '3.4k members', 'globe']];
  var JOBS = [
    { id: 'barista', t: 'Barista', co: 'Costa Coffee · Coventry', co2: 'Costa Coffee · Coventry City Centre', cat: 'Café', icon: 'coffee', pay: '£12.60/hr', hours: '17:00–22:00', hrs: '15 hrs/week', dist: '2.4 mi', match: 92,
      fit: 'This role needs 3 evening shifts — all inside your availability.', shifts: [['Monday', '17:00–22:00'], ['Wednesday', '17:00–22:00'], ['Saturday', '10:00–16:00']],
      about: 'Join a friendly team making great coffee. No experience needed — full training provided. Perfect for students: evening and weekend shifts that fit around your timetable.' },
    { id: 'retail', t: 'Retail Assistant', co: 'Tesco Express · Coventry', co2: 'Tesco Express · Gosford Street', cat: 'Retail', icon: 'shopping-cart', pay: '£11.90/hr', hours: 'Flexible', hrs: '12 hrs/week', dist: '0.5 mi', match: 84,
      fit: 'This role needs 3 shifts a week — all inside your availability.', shifts: [['Monday', '18:00–22:00'], ['Wednesday', '18:00–22:00'], ['Saturday', '09:00–13:00']],
      about: 'Help keep a busy neighbourhood store running: serving customers, stocking shelves and keeping things tidy. Training provided, and shifts flex around your lectures.' },
    { id: 'library', t: 'Library Assistant', co: 'Coventry Uni · On campus', co2: 'Coventry University Library', cat: 'Campus', icon: 'book-open', pay: '£12.20/hr', hours: 'Weekends', hrs: '8 hrs/week', dist: 'On campus', match: 78,
      fit: 'This role needs 1 weekend shift — inside your availability.', shifts: [['Saturday', '10:00–18:00']],
      about: 'Help students find books and study spaces, reshelve returns and keep the library welcoming. A quiet, on-campus job that fits around your course.' },
    { id: 'amb', t: 'Student Ambassador', co: 'Coventry Uni · Open days', co2: 'Coventry University · Open days', cat: 'Campus', icon: 'graduation-cap', pay: '£12.50/hr', hours: 'Saturdays', hrs: '6 hrs/week', dist: 'On campus', match: 76,
      fit: 'This role needs 1 Saturday shift — inside your availability.', shifts: [['Saturday', '09:00–15:00']],
      about: 'Show visitors around campus on open days and share what student life is really like. Great for meeting people and building your CV.' },
    { id: 'books', t: 'Bookshop Assistant', co: 'Page Turners · City Centre', co2: 'Page Turners · Coventry City Centre', cat: 'Retail', icon: 'book-open', pay: '£11.70/hr', hours: '17:00–21:00', hrs: '8 hrs/week', dist: '1.6 mi', match: 74,
      fit: 'This role needs 2 evening shifts — both inside your availability.', shifts: [['Monday', '17:00–21:00'], ['Wednesday', '17:00–21:00']],
      about: 'Help readers find their next favourite book, run the till and keep the shelves in order at a cosy independent bookshop.' },
    { id: 'bloom', t: 'Café Team Member', co: 'Bean & Bloom · Far Gosford St', co2: 'Bean & Bloom · Far Gosford Street', cat: 'Café', icon: 'coffee', pay: '£11.95/hr', hours: 'Saturdays', hrs: '8 hrs/week', dist: '1.1 mi', match: 72,
      fit: 'This role needs 1 weekend shift — inside your availability.', shifts: [['Saturday', '09:00–17:00']],
      about: 'Serve coffee and fresh bakes at a small independent café near campus. Friendly regulars, free drinks on shift and weekend hours that leave weekdays free for study.' },
  ];
  var CATS = [['Rent', 360, '#3730A3'], ['Food', 120, '#7C3AED'], ['Transport', 55, '#818CF8'], ['Social', 50, '#C4B5FD'], ['University', 20, '#A5B4FC'], ['Other', 15, '#D6D6DC']];
  var SPENT = 620, BUDGET = 1240;
  var FOOD_WEEKS = [['W1', 33], ['W2', 25], ['W3', 40], ['W4', 22]];
  var FOOD_TXNS = [['Tesco Express', 'Today · 14:20', '£24.50', 'shopping-cart'], ['Costa Coffee', 'Today · 09:10', '£3.20', 'coffee'],
    ['Sainsbury’s', 'Yesterday', '£18.90', 'shopping-cart'], ['Greggs', 'Mon · 12:45', '£4.10', 'utensils']];
  var DEST = {
    uni: { to: 'Coventry University', label: 'University', routes: [
      { id: 'bus', mode: 'Bus', icon: 'bus', sub: '11 / 12 · Pool Meadow', time: '18 min', when: 'in 6 min', best: true,
        next: ['Next bus', 'Departs in 6 min', '09:12 Priory Hall  →  09:30 Coventry University'],
        legs: [['walk', 'Walk to Pool Meadow', '4 min · 300 m'], ['bus', 'Bus 11 / 12', '10 min · 6 stops · every 12 min', true], ['walk', 'Walk to Engineering building', '3 min · 220 m']],
        deps: ['Pool Meadow', '6 min', '18 min', '30 min'] },
      { id: 'walk', mode: 'Walk', icon: 'walk', sub: 'Direct via Gulson Rd', time: '24 min', when: 'now',
        next: ['Leave now', 'Arrive at 09:30', '09:06 Priory Hall  →  09:30 Coventry University'],
        legs: [['walk', 'Walk via Gulson Rd', '20 min · 1.6 km'], ['walk', 'Walk to Engineering building', '4 min · 280 m']] },
      { id: 'cycle', mode: 'Cycle', icon: 'bike', sub: 'Cycle path · mostly flat', time: '12 min', when: 'now',
        next: ['Leave now', 'Arrive at 09:18', '09:06 Priory Hall  →  09:18 Coventry University'],
        legs: [['bike', 'Cycle via the cycle path', '10 min · 2.1 km · mostly flat', true], ['walk', 'Lock up and walk in', '2 min · 120 m']] },
    ] },
    city: { to: 'City Centre', label: 'City Centre', routes: [
      { id: 'bus', mode: 'Bus', icon: 'bus', sub: '21 · Pool Meadow', time: '9 min', when: 'in 3 min', best: true,
        next: ['Next bus', 'Departs in 3 min', '09:09 Priory Hall  →  09:18 City Centre'],
        legs: [['walk', 'Walk to Pool Meadow', '4 min · 300 m'], ['bus', 'Bus 21', '4 min · 3 stops · every 10 min', true], ['walk', 'Walk to Broadgate', '1 min · 80 m']],
        deps: ['Pool Meadow', '3 min', '13 min', '23 min'] },
      { id: 'walk', mode: 'Walk', icon: 'walk', sub: 'Via Far Gosford St', time: '15 min', when: 'now',
        next: ['Leave now', 'Arrive at 09:21', '09:06 Priory Hall  →  09:21 City Centre'],
        legs: [['walk', 'Walk via Far Gosford St', '15 min · 1.2 km']] },
      { id: 'cycle', mode: 'Cycle', icon: 'bike', sub: 'Quiet streets · flat', time: '6 min', when: 'now',
        next: ['Leave now', 'Arrive at 09:12', '09:06 Priory Hall  →  09:12 City Centre'],
        legs: [['bike', 'Cycle via quiet streets', '5 min · 1.3 km · flat', true], ['walk', 'Lock up at Broadgate', '1 min · 60 m']] },
    ] },
  };

  // ---------- State (saved on this device only) ----------
  function seed() {
    var done = {};
    TASKS.forEach(function (t) { done[t.id] = !!t.done; });
    return { v: 1, ob: false, interests: ['Design', 'Photography', 'Coffee', 'Music', 'Fitness', 'Travel'], focus: ['uni', 'money', 'accom'],
      done: done, going: {}, saved: {}, groups: {}, jobsSaved: {}, applied: {}, dest: 'uni', started: false };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (s && s.v === 1 && s.done && typeof s.done === 'object' && Array.isArray(s.interests)) {
        var base = seed();
        Object.keys(base).forEach(function (k) { if (typeof s[k] !== typeof base[k]) s[k] = base[k]; });
        if (!DEST[s.dest]) s.dest = 'uni';
        return s;
      }
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
      else if (k === 'style') el.style.cssText = v; // CSSOM, allowed by the page's CSP (style attributes are not)
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
  function badge(b) { return h('span', { class: 'badge badge--' + b[1], text: b[0] }); }
  function find(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  var live = document.getElementById('live');
  function announce(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }
  var toastEl = document.getElementById('toast'), toastTimer;
  function toast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); setTimeout(function () { toastEl.textContent = ''; }, 250); }, 2600);
  }
  function notInDemo() { toast('This screen isn’t part of the demo.'); }

  // progress maths, always computed from the checklist
  function fw() { return TASKS.filter(function (t) { return t.fw; }); }
  function countDone(list) { return list.filter(function (t) { return state.done[t.id]; }).length; }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function secTasks(i) { return TASKS.filter(function (t) { return t.sec === i; }); }
  function journeyPct() { return pct(countDone(TASKS), TASKS.length); }
  function currentId() { return UP_NEXT.filter(function (id) { return !state.done[id]; })[0]; }
  function taskOf(id) { return find(TASKS, id); }

  // ---------- Navigation ----------
  var ROOTS = ['home', 'journey', 'explore', 'community', 'profile'];
  var stack = [{ name: state.ob ? 'home' : 'splash' }];
  var appEl = document.getElementById('app');
  var device = document.getElementById('device');
  function top() { return stack[stack.length - 1]; }
  function go(name, args) { stack.push(Object.assign({ name: name }, args || {})); render(); }
  function back() { if (stack.length > 1) { stack.pop(); render(); } }
  function tab(name, args) { stack = [Object.assign({ name: name }, args || {})]; render(); }
  // re-render the current screen in place (after a toggle), keeping scroll and focus
  function refresh(focusId) {
    var sc = appEl.querySelector('.scroll');
    var y = sc ? sc.scrollTop : 0;
    render(focusId ? '#' + focusId : null, true);
    var sc2 = appEl.querySelector('.scroll');
    if (sc2) sc2.scrollTop = y;
  }
  function render(focusSel, quiet) {
    var t = top();
    var el = SCREENS[t.name](t);
    var light = { splash: 1, welcome: 1, event: 1 };
    device.classList.toggle('is-light', !!light[t.name]);
    device.classList.toggle('is-light-bottom', t.name === 'splash');
    appEl.replaceChildren(el);
    var target = focusSel ? el.querySelector(focusSel) : (quiet ? null : el.querySelector('h1'));
    if (target) {
      if (!target.hasAttribute('tabindex') && !/^(BUTTON|INPUT|A)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }
  function nav(active) {
    var items = [['home', 'Home', 'home'], ['journey', 'Journey', 'route'], ['explore', 'Explore', 'compass'], ['community', 'Community', 'users'], ['profile', 'Profile', 'user']];
    return h('nav', { class: 'nav', 'aria-label': 'Main' }, items.map(function (it) {
      return h('button', { type: 'button', 'aria-current': it[0] === active ? 'page' : null, onclick: function () { tab(it[0]); } }, icon(it[2]), it[1]);
    }));
  }
  function bar(title, opts) {
    opts = opts || {};
    return h('header', { class: 'bar' },
      h('button', { class: 'back', type: 'button', 'aria-label': 'Back', onclick: opts.onBack || back }, icon('chevron-left')),
      h('h1', { text: title, class: opts.srTitle ? 'sr-only' : null }));
  }
  function secHead(title, link, onLink) {
    return h('div', { class: 'sec-head' }, h('h2', { text: title }),
      link ? h('button', { class: 'link', type: 'button', onclick: onLink }, link, icon('chevron-right')) : null);
  }

  var SCREENS = {};

  // ======================================================= Onboarding
  SCREENS.splash = function () {
    var timer = setTimeout(function () { if (top().name === 'splash') tab('welcome'); }, 1600);
    return h('div', { class: 'screen' },
      h('button', { class: 'splash', type: 'button', 'aria-label': 'Open Arrive', onclick: function () { clearTimeout(timer); tab('welcome'); } },
        h('span', { class: 'splash__logo' }, icon('map-pin')),
        h('h1', { class: 'splash__name', text: 'ARRIVE' }),
        h('p', { class: 'splash__tag', text: 'Your student life, in one place.' })));
  };

  SCREENS.welcome = function () {
    function deco(name, css) { var d = icon(name); d.classList.add('deco'); d.style.cssText = css; return d; }
    return h('div', { class: 'screen welcome' },
      h('div', { class: 'welcome__hero' },
        deco('users', 'left:60px;top:120px;width:80px;height:80px'),
        deco('calendar', 'left:250px;top:90px;width:84px;height:84px'),
        deco('wallet', 'left:290px;top:240px;width:84px;height:84px'),
        deco('globe', 'left:70px;top:300px;width:96px;height:96px'),
        h('span', { class: 'welcome__logo' }, icon('map-pin'))),
      h('div', { class: 'welcome__sheet' },
        h('h1', { text: 'Welcome to Arrive' }),
        h('p', { text: 'Everything you need for student life in the UK — university, money, transport, jobs and community — in one calm, guided place.' }),
        h('button', { class: 'btn', type: 'button', onclick: function () { go('interests'); } }, 'Get started'),
        h('button', { class: 'btn-text', type: 'button', onclick: function () { state.ob = true; save(); tab('home'); announce('Signed in to the sample account.'); } }, 'I already have an account')));
  };

  function obShell(step, edit, body, foot) {
    return h('div', { class: 'screen ob' },
      h('div', { class: 'ob-top' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back', onclick: back }, icon('chevron-left')),
        edit ? null : h('div', { class: 'dots', role: 'img', 'aria-label': 'Step ' + (step + 1) + ' of 4' }, [0, 1, 2, 3].map(function (i) { return h('span', { class: i === step ? 'on' : null }); })),
        edit ? null : h('button', { class: 'skip', type: 'button', onclick: foot.skip }, 'Skip')),
      h('div', { class: 'ob-body' }, body),
      h('div', { class: 'ob-foot' }, h('button', { class: 'btn', type: 'button', onclick: foot.next }, foot.label)));
  }

  SCREENS.interests = function (args) {
    var picked = args.picked || (args.picked = state.interests.slice());
    function toggle(name, id) {
      var i = picked.indexOf(name);
      if (i >= 0) picked.splice(i, 1); else picked.push(name);
      refresh(id);
    }
    function commit() { state.interests = INTERESTS.filter(function (n) { return picked.indexOf(n) >= 0; }); save(); }
    return obShell(1, args.edit, [
      h('h1', { class: 'ob-title', text: 'What are you into?' }),
      h('p', { class: 'ob-sub', text: 'Pick a few and we\'ll tailor events, groups and places near you.' }),
      h('div', { class: 'pick', role: 'group', 'aria-label': 'Interests' }, INTERESTS.map(function (n, i) {
        var id = 'int-' + i;
        return h('button', { id: id, type: 'button', 'aria-pressed': picked.indexOf(n) >= 0 ? 'true' : 'false', onclick: function () { toggle(n, id); } }, n);
      })),
    ], args.edit
      ? { label: 'Save', next: function () { commit(); back(); toast('Interests saved.'); } }
      : { label: 'Continue', next: function () { commit(); go('focus'); }, skip: function () { go('focus'); } });
  };

  SCREENS.focus = function (args) {
    var picked = args.picked || (args.picked = state.focus.slice());
    return obShell(2, false, [
      h('h1', { class: 'ob-title', text: 'What do you need help with?' }),
      h('p', { class: 'ob-sub', text: 'We\'ll put these front and centre on your home screen.' }),
      h('div', { class: 'focus-list', role: 'group', 'aria-label': 'Help with' }, FOCUS.map(function (f) {
        var id = 'focus-' + f[0];
        return h('button', { id: id, class: 'focus', type: 'button', 'aria-pressed': picked.indexOf(f[0]) >= 0 ? 'true' : 'false', onclick: function () {
          var i = picked.indexOf(f[0]);
          if (i >= 0) picked.splice(i, 1); else picked.push(f[0]);
          refresh(id);
        } }, h('span', { class: 'tile' }, icon(f[3])), h('span', null, h('b', { text: f[1] }), h('small', { text: f[2] })), h('span', { class: 'tick' }, icon('check')));
      })),
    ], { label: 'Continue', next: function () { state.focus = picked.slice(); save(); go('ready'); }, skip: function () { go('ready'); } });
  };

  SCREENS.ready = function () {
    return h('div', { class: 'screen ob' },
      h('div', { class: 'ready' },
        h('span', { class: 'ready__mark' }, icon('check')),
        h('h1', { text: 'You\'re all set, Bobby' }),
        h('p', { text: 'Let\'s make student life simpler. Your first-week checklist is ready when you are.' })),
      h('div', { class: 'ob-foot' }, h('button', { class: 'btn', type: 'button', onclick: function () { state.ob = true; save(); tab('home'); } }, 'Enter Arrive')));
  };

  // ======================================================= Home
  function taskCard(id) {
    var d = DETAIL[id];
    return h('li', null, h('button', { class: 'card task', type: 'button', onclick: function () { go('task', { id: id }); } },
      h('span', { class: 'tile' }, icon(d.icon)),
      h('span', { class: 'task__main' },
        h('b', { text: d.title }), h('span', { class: 'task__desc', text: d.desc }),
        h('span', { class: 'task__meta' }, icon('clock'), d.when, badge(d.badge))),
      h('span', { class: 'chev' }, icon('chevron-right'))));
  }
  function placeCard(p) {
    var inner = [h('span', { class: 'thumb' }, icon(p.icon)),
      h('span', { class: 'task__main' },
        h('span', { class: 'place__line' }, h('b', { text: p.n }), badge(p.badge)),
        h('span', { class: 'place__meta' }, icon('map-pin'), h('span', { text: p.dist }), h('span', { text: p.meta })))];
    if (p.go) return h('li', null, h('button', { class: 'card place', type: 'button', onclick: function () { go(p.go); } }, inner, h('span', { class: 'chev' }, icon('chevron-right'))));
    return h('li', { class: 'card place' }, inner);
  }

  SCREENS.home = function () {
    var list = fw(), done = countDone(list), left = list.length - done, p = pct(done, list.length);
    var todo = UP_NEXT.filter(function (id) { return !state.done[id]; });
    return h('div', { class: 'screen' },
      h('div', { class: 'scroll' },
        h('div', { class: 'home-head' },
          h('div', null, h('small', { text: 'Good morning' }), h('h1', { text: 'Bobby' })),
          h('button', { class: 'icon-btn bell', type: 'button', 'aria-label': 'Notifications, 1 new', onclick: function () { toast(todo.length ? '1 reminder: ' + DETAIL[todo[0]].title + ' — ' + DETAIL[todo[0]].when.toLowerCase() + '.' : 'No new notifications.'); } },
            icon('bell'), h('span', { class: 'dot' }))),
        h('div', { class: 'pad' },
          h('p', { class: 'today', text: todo.length ? 'You have ' + todo.length + ' thing' + (todo.length === 1 ? '' : 's') + ' to take care of today.' : 'You\'re all caught up for today.' }),
          h('section', { class: 'progress', 'aria-label': 'Your first week' },
            h('div', { class: 'progress__top' },
              h('div', null, h('small', { text: 'YOUR FIRST WEEK' }), h('b', { text: left ? 'You\'re settling in nicely' : 'Your first week is done' })),
              h('span', { class: 'progress__pct', text: p + '%' })),
            h('div', { class: 'track', role: 'progressbar', 'aria-label': 'First-week progress', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(p) },
              h('i', { style: 'width:' + p + '%' })),
            h('p', { text: done + ' of ' + list.length + ' first-week tasks done · ' + (left ? left + ' to go' : 'all done') })),
          h('div', { class: 'quick' },
            h('button', { type: 'button', onclick: function () { go('transport'); } }, h('span', { class: 'tile' }, icon('bus')), 'Transport'),
            h('button', { type: 'button', onclick: function () { go('jobs'); } }, h('span', { class: 'tile' }, icon('briefcase')), 'Jobs'),
            h('button', { type: 'button', onclick: function () { tab('community'); } }, h('span', { class: 'tile' }, icon('calendar')), 'Events'),
            h('button', { type: 'button', onclick: function () { go('money'); } }, h('span', { class: 'tile' }, icon('wallet')), 'Money')),
          secHead('Up next', 'See all', function () { tab('journey'); }),
          todo.length ? h('ul', { class: 'list' }, todo.map(taskCard)) : h('p', { class: 'card empty', text: 'All first-week tasks are done. Nice work!' }),
          secHead('Near you', 'See all', function () { tab('explore'); }),
          h('ul', { class: 'list' }, placeCard(PLACES[0])))),
      nav('home'));
  };

  // ======================================================= Journey
  SCREENS.journey = function () {
    var all = countDone(TASKS), p = journeyPct(), cur = currentId();
    return h('div', { class: 'screen' },
      h('div', { class: 'scroll' },
        h('div', { class: 'page-head' }, h('h1', { class: 'page-title', text: 'Your Journey' }), h('p', { class: 'page-sub', text: 'A guided path to settling into Coventry.' })),
        h('div', { class: 'pad' },
          h('section', { class: 'card summary', 'aria-label': 'Overall progress' },
            h('div', { class: 'summary__top' },
              h('div', null, h('b', { text: 'Overall progress' }), h('small', { text: all + ' of ' + TASKS.length + ' steps complete' })),
              h('span', { class: 'summary__pct', text: p + '%' })),
            h('div', { class: 'track', role: 'progressbar', 'aria-label': 'Journey progress', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(p) }, h('i', { style: 'width:' + p + '%' }))),
          SECTIONS.map(function (name, si) {
            var ts = secTasks(si), d = countDone(ts);
            var b = d === ts.length ? ['Complete', 'success'] : d > 0 || ts.some(function (t) { return t.id === cur; }) ? ['In progress', 'warning'] : ['Upcoming', 'muted'];
            return h('section', { class: 'jsec', 'aria-labelledby': 'sec-' + si },
              h('div', { class: 'jsec__head' }, h('h2', { id: 'sec-' + si, text: name }), badge(b)),
              h('ul', { class: 'steps' }, ts.map(function (t) {
                var isDone = !!state.done[t.id], id = 'step-' + t.id;
                return h('li', null, h('button', { id: id, class: 'step' + (isDone ? ' is-done' : t.id === cur ? ' is-current' : ''), type: 'button', role: 'checkbox', 'aria-checked': isDone ? 'true' : 'false',
                  onclick: function () { setDone(t.id, !isDone); refresh(id); } },
                  h('span', { class: 'step__mark' }, isDone ? icon('check') : null),
                  h('span', { class: 'step__text' }, h('b', { text: t.t }), h('small', { text: t.s }))));
              })));
          }))),
      nav('journey'));
  };
  function setDone(id, val) {
    state.done[id] = !!val;
    save();
    announce(taskOf(id).t + (val ? ' marked as done. ' : ' marked as not done. ') + 'First week ' + pct(countDone(fw()), fw().length) + '%, Journey ' + journeyPct() + '%.');
  }

  // ======================================================= Task detail
  SCREENS.task = function (args) {
    var d = DETAIL[args.id], t = taskOf(args.id), isDone = !!state.done[args.id];
    var secList = secTasks(t.sec);
    return h('div', { class: 'screen' },
      bar('Task'),
      h('div', { class: 'scroll' }, h('div', { class: 'pad' },
        isDone ? h('div', { class: 'done-banner', role: 'status' }, icon('check-circle'),
          h('div', null, h('b', { text: 'Nice work! Task complete' }),
            h('small', { text: SECTIONS[t.sec] + ': ' + countDone(secList) + ' of ' + secList.length + ' done · Journey now ' + journeyPct() + '%' }))) : null,
        h('span', { class: 'big-tile' }, icon(d.icon)),
        h('h2', { class: 'big-title', text: d.title }),
        h('div', { class: 'meta-row' }, badge(isDone ? ['Completed', 'success'] : d.tag), h('span', null, icon('clock'), d.mins)),
        h('div', { class: 'why' }, h('b', { text: 'Why this matters' }), h('p', { text: d.why })),
        h('section', { class: 'card box' }, h('h2', { text: 'What you’ll need' }), h('ul', { class: 'bullets' }, d.need.map(function (x) { return h('li', { text: x }); }))),
        h('section', { class: 'card box' }, h('h2', { text: 'Steps' }), h('ol', { class: 'numbered', style: 'padding:0;margin-bottom:0' }, d.steps.map(function (x) { return h('li', { text: x }); }))))),
      h('div', { class: 'foot' },
        h('button', { id: 'complete', class: 'btn' + (isDone ? ' is-done' : ''), type: 'button', 'aria-pressed': isDone ? 'true' : 'false',
          onclick: function () { setDone(args.id, !isDone); refresh('complete'); } }, isDone ? 'Completed ✓' : 'Mark as complete')));
  };

  // ======================================================= Explore
  function eventCard(e) {
    var going = !!state.going[e.id], saved = !!state.saved[e.id];
    var cover = h('div', { class: 'cover' },
      h('span', { class: 'datebox', 'aria-hidden': 'true' }, h('small', { text: e.dow }), h('b', { text: e.day }), h('small', { text: e.mon })));
    var deco = icon(e.deco); deco.classList.add('deco'); cover.appendChild(deco);
    return h('li', { class: 'card event', style: 'position:relative' },
      h('button', { class: 'event__open', type: 'button', onclick: function () { go('event', { id: e.id }); } },
        cover,
        h('span', { class: 'event__body', style: 'display:block' }, h('b', { class: 'event__title', text: e.title }),
          h('span', { class: 'event__meta' }, icon('map-pin'), e.where))),
      h('button', { id: 'save-' + e.id, class: 'save', type: 'button', 'aria-label': 'Save ' + e.title, 'aria-pressed': saved ? 'true' : 'false',
        onclick: function () { state.saved[e.id] = !saved; save(); announce(saved ? 'Removed from saved.' : 'Saved.'); refresh('save-' + e.id); } }, icon('heart')),
      h('div', { class: 'event__foot' },
        h('span', { class: 'faces', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
        h('span', { class: 'going', text: '+' + (e.going + (going ? 1 : 0)) + ' going' }),
        h('button', { id: 'join-' + e.id, class: 'join', type: 'button', 'aria-pressed': going ? 'true' : 'false', 'aria-label': (going ? 'Going to ' : 'Join ') + e.title,
          onclick: function () { state.going[e.id] = !going; save(); announce(going ? 'You left ' + e.title + '.' : 'You\'re going to ' + e.title + '.'); refresh('join-' + e.id); } }, going ? 'Going ✓' : 'Join')));
  }

  SCREENS.explore = function (args) {
    args.cat = args.cat || 'All';
    args.q = args.q || '';
    var results = h('div');
    var input = h('input', { type: 'search', placeholder: 'Search places, events, jobs', 'aria-label': 'Search places, events, jobs', maxlength: 40, autocomplete: 'off', value: args.q });
    function draw() {
      var q = input.value.trim().toLowerCase().slice(0, 40);
      args.q = input.value.slice(0, 40);
      var places = PLACES.filter(function (p) { return (args.cat === 'All' || p.cat === args.cat) && (!q || (p.n + ' ' + p.meta).toLowerCase().indexOf(q) >= 0); });
      var events = EVENTS.slice(0, 1).filter(function (e) { return args.cat === 'All' && (!q || (e.title + ' ' + e.where).toLowerCase().indexOf(q) >= 0); });
      var jobs = q ? JOBS.filter(function (j) { return (j.t + ' ' + j.co).toLowerCase().indexOf(q) >= 0; }) : [];
      results.replaceChildren();
      add(results, [
        h('div', { class: 'sec-head' }, h('h2', { text: 'Open now near you' })),
        places.length ? h('ul', { class: 'list' }, places.map(placeCard)) : h('p', { class: 'card empty', text: 'No places match.' }),
        jobs.length ? [h('div', { class: 'sec-head' }, h('h2', { text: 'Jobs' })), h('ul', { class: 'list' }, jobs.map(function (j) {
          return h('li', null, h('button', { class: 'card place', type: 'button', onclick: function () { go('job', { id: j.id }); } },
            h('span', { class: 'thumb' }, icon(j.icon)), h('span', { class: 'task__main' }, h('span', { class: 'place__line' }, h('b', { text: j.t })), h('span', { class: 'place__meta' }, h('span', { text: j.co }))),
            h('span', { class: 'chev' }, icon('chevron-right'))));
        }))] : null,
        events.length ? [h('div', { class: 'sec-head' }, h('h2', { text: 'Happening tonight' })), h('ul', { class: 'list' }, events.map(eventCard))] : null]);
    }
    input.addEventListener('input', draw);
    draw();
    var cats = ['All', 'Food', 'Groceries', 'Transport', 'Study', 'Health'];
    return h('div', { class: 'screen' },
      h('div', { class: 'scroll' },
        h('div', { class: 'page-head' }, h('h1', { class: 'page-title', text: 'Explore' }), h('p', { class: 'loc' }, icon('map-pin'), 'Coventry · CV1 5FB')),
        h('div', { class: 'pad' },
          h('label', { class: 'search' }, icon('search'), input),
          h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter places', style: 'margin-top:16px' }, cats.map(function (c) {
            return h('button', { id: 'cat-' + c, class: 'chip', type: 'button', 'aria-pressed': args.cat === c ? 'true' : 'false', onclick: function () { args.cat = c; refresh('cat-' + c); } }, c);
          })),
          results)),
      nav('explore'));
  };

  // ======================================================= Community & events
  SCREENS.community = function (args) {
    var seg = args.seg || 'events';
    function segBtn(id, label) {
      return h('button', { id: 'seg-' + id, type: 'button', role: 'tab', 'aria-selected': seg === id ? 'true' : 'false', tabindex: seg === id ? '0' : '-1',
        onclick: function () { args.seg = id; refresh('seg-' + id); } }, label);
    }
    var segs = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Show' }, segBtn('events', 'Events'), segBtn('groups', 'Groups'));
    segs.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); args.seg = seg === 'events' ? 'groups' : 'events'; refresh('seg-' + args.seg); }
    });
    function groupBtn(g) {
      var joined = !!state.groups[g[0]], id = 'grp-' + g[0];
      return h('button', { id: id, class: 'join', type: 'button', 'aria-pressed': joined ? 'true' : 'false', 'aria-label': (joined ? 'Joined ' : 'Join ') + g[1],
        onclick: function () { state.groups[g[0]] = !joined; save(); announce(joined ? 'Left ' + g[1] + '.' : 'Joined ' + g[1] + '.'); refresh(id); } }, joined ? 'Joined ✓' : 'Join');
    }
    var body = seg === 'events'
      ? [h('ul', { class: 'list', style: 'margin-top:16px' }, EVENTS.map(eventCard)),
        secHead('Popular groups', 'See all', function () { args.seg = 'groups'; refresh('seg-groups'); }),
        h('ul', { class: 'groups' }, GROUPS.map(function (g) {
          return h('li', { class: 'card group' }, h('span', { class: 'tile' }, icon(g[3])), h('b', { text: g[1] }), h('small', { text: g[2] + (state.groups[g[0]] ? ' · Joined' : '') }));
        }))]
      : [h('ul', { class: 'list', style: 'margin-top:16px' }, GROUPS.map(function (g) {
        return h('li', { class: 'card group-row' }, h('span', { class: 'tile' }, icon(g[3])), h('div', null, h('b', { text: g[1] }), h('small', { text: g[2] })), groupBtn(g));
      }))];
    return h('div', { class: 'screen' },
      h('div', { class: 'scroll' },
        h('div', { class: 'page-head' }, h('h1', { class: 'page-title', text: 'Community' }), h('p', { class: 'page-sub', text: 'Meet people and find your crowd.' })),
        h('div', { class: 'pad' }, segs, h('div', { role: 'tabpanel', 'aria-labelledby': 'seg-' + seg }, body))),
      nav('community'));
  };

  SCREENS.event = function (args) {
    var e = find(EVENTS, args.id), going = !!state.going[e.id], saved = !!state.saved[e.id];
    var deco = icon(e.deco); deco.classList.add('deco');
    return h('div', { class: 'screen' },
      h('div', { class: 'scroll' },
        h('div', { class: 'ev-hero' }, deco,
          h('button', { class: 'round round--left', type: 'button', 'aria-label': 'Back', onclick: back }, icon('chevron-left')),
          h('button', { id: 'ev-save', class: 'round round--right fav', type: 'button', 'aria-label': 'Save event', 'aria-pressed': saved ? 'true' : 'false',
            onclick: function () { state.saved[e.id] = !saved; save(); announce(saved ? 'Removed from saved.' : 'Saved.'); refresh('ev-save'); } }, icon('heart')),
          h('span', { class: 'when' }, icon('clock'), e.when)),
        h('div', { class: 'ev-sheet' },
          going ? h('div', { class: 'ok-banner', role: 'status' }, icon('check-circle'), 'You\'re going! Added to your Journey and calendar.') : null,
          h('h1', { text: e.title }),
          h('p', { class: 'host' }, h('i', { 'aria-hidden': 'true', text: e.hi }), 'Hosted by ' + e.host),
          h('div', { class: 'card facts' },
            h('div', { class: 'fact' }, h('span', { class: 'tile' }, icon('clock')), h('div', null, h('small', { text: 'Date & time' }), h('b', { text: e.date }))),
            h('div', { class: 'fact' }, h('span', { class: 'tile' }, icon('map-pin')), h('div', null, h('small', { text: 'Location' }), h('b', { text: e.loc }))),
            h('div', { class: 'fact' }, h('span', { class: 'tile' }, icon('ticket')), h('div', null, h('small', { text: 'Entry' }), h('b', { text: e.entry })))),
          h('h2', { class: 'about-h', text: 'About' }),
          h('p', { class: 'about-p', text: e.about }),
          h('div', { class: 'attend' }, h('span', { class: 'faces', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i')), (e.going + (going ? 1 : 0)) + ' students going'))),
      h('div', { class: 'foot' },
        h('div', { class: 'foot-price' }, h('small', { text: 'Entry' }), h('b', { text: 'Free' })),
        h('button', { id: 'ev-join', class: 'btn' + (going ? ' is-done' : ''), type: 'button', 'aria-pressed': going ? 'true' : 'false',
          onclick: function () { state.going[e.id] = !going; save(); announce(going ? 'You left the event.' : 'You\'re going!'); refresh('ev-join'); } }, going ? 'Going ✓' : 'Join event')));
  };

  // ======================================================= Profile
  SCREENS.profile = function () {
    function row(label, ic, fn) {
      return h('li', null, h('button', { class: 'setting', type: 'button', onclick: fn || notInDemo }, h('span', { class: 'tile' }, icon(ic)), h('span', { text: label }), h('span', { class: 'chev' }, icon('chevron-right'))));
    }
    return h('div', { class: 'screen' },
      h('div', { class: 'scroll' },
        h('div', { class: 'page-head' }, h('h1', { class: 'page-title', text: 'Profile' })),
        h('div', { class: 'pad' },
          h('section', { class: 'card me', 'aria-label': 'Your profile' },
            h('span', { class: 'avatar', 'aria-hidden': 'true', text: 'BK' }),
            h('div', null, h('b', { text: 'Bobby Keerthan' }), h('span', { text: 'Coventry University · MA Graphic Design' }), h('small', { text: 'Year 1 · International student' })),
            h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Settings', onclick: notInDemo }, icon('settings'))),
          h('h2', { class: 'group-label', text: 'PREFERENCES' }),
          h('ul', { class: 'card settings' },
            row('Interests', 'heart', function () { go('interests', { edit: true }); }),
            row('Preferred transport', 'bus', function () { go('transport'); }),
            row('Monthly budget', 'wallet', function () { go('money'); }),
            row('Event preferences', 'calendar', function () { tab('community'); }),
            row('Job availability', 'briefcase', function () { go('jobs'); })),
          h('h2', { class: 'group-label', text: 'ACCOUNT' }),
          h('ul', { class: 'card settings' },
            row('My documents', 'file-text'), row('Notification settings', 'settings'), row('Language & region', 'globe'), row('Privacy & security', 'shield')),
          h('h2', { class: 'group-label', text: 'SUPPORT' }),
          h('ul', { class: 'card settings' },
            row('Help & support', 'help-circle'), row('About Arrive', 'info'),
            row('Log out', 'log-out', function () { state.ob = false; save(); tab('welcome'); announce('Logged out of the sample account.'); })))),
      nav('profile'));
  };

  // ======================================================= Money
  SCREENS.money = function () {
    return h('div', { class: 'screen' },
      bar('Money'),
      h('div', { class: 'scroll' }, h('div', { class: 'pad' },
        h('section', { class: 'card money', 'aria-label': 'Budget' },
          h('small', { text: 'Remaining this month' }),
          h('div', { class: 'money__big' }, h('b', { text: '£' + (BUDGET - SPENT) }), h('span', { text: 'of £1,240 budget' })),
          h('div', { class: 'stack', role: 'img', 'aria-label': 'Spending so far: ' + CATS.map(function (c) { return c[0] + ' £' + c[1]; }).join(', ') },
            CATS.map(function (c) { return h('i', { style: 'flex:' + c[1] + ' 0 0;background:' + c[2] }); }))),
        h('section', { class: 'card box box--lg' },
          h('h2', { text: 'Where it goes' }),
          h('ul', { class: 'legend' }, CATS.map(function (c) {
            var inner = [h('i', { style: 'background:' + c[2] }), h('span', { text: c[0] }), h('b', { text: '£' + c[1] })];
            return h('li', null, c[0] === 'Food'
              ? h('button', { type: 'button', 'aria-label': 'Food, £' + c[1] + ', see details', onclick: function () { go('spend'); } }, inner, h('span', { class: 'chev' }, icon('chevron-right')))
              : h('div', null, inner));
          }))),
        h('section', { class: 'card box box--lg' },
          h('h2', { text: 'Upcoming payments' }),
          h('div', { class: 'pay' }, h('span', { class: 'tile' }, icon('key')), h('div', null, h('b', { text: 'Rent · Priory Hall' }), h('small', { text: 'Due 1 Oct' })), h('b', { text: '£520' })),
          h('div', { class: 'pay' }, h('span', { class: 'tile' }, icon('smartphone')), h('div', null, h('b', { text: 'Phone · giffgaff' }), h('small', { text: 'Due 3 Oct' })), h('b', { text: '£15' }))),
        h('p', { class: 'tip' }, icon('trending-up'), 'Your food spending is £34 below your monthly average. Nice.'))));
  };

  SCREENS.spend = function () {
    var food = CATS[1][1], max = Math.max.apply(null, FOOD_WEEKS.map(function (w) { return w[1]; }));
    return h('div', { class: 'screen' },
      bar('Food'),
      h('div', { class: 'scroll' }, h('div', { class: 'pad' },
        h('section', { class: 'card spent', 'aria-label': 'Food this month' },
          h('small', { text: 'Spent this month' }),
          h('div', { class: 'spent__row' }, h('b', { text: '£' + food }), h('span', { class: 'pill' }, icon('trending-up'), '£34 below avg')),
          h('p', { text: '£240 monthly budget · ' + pct(food, 240) + '% used' })),
        h('section', { class: 'card box box--lg' },
          h('h2', { text: 'By week' }),
          h('ul', { class: 'bars' }, FOOD_WEEKS.map(function (w) {
            return h('li', { class: w[1] === max ? 'on' : null, 'aria-label': w[0].replace('W', 'Week ') + ': £' + w[1] },
              h('i', { style: 'height:' + Math.round(w[1] / max * 98) + 'px' }), h('span', { 'aria-hidden': 'true', text: w[0] }));
          }))),
        h('section', { class: 'card box box--lg' },
          h('h2', { text: 'Recent transactions' }),
          FOOD_TXNS.map(function (t) {
            return h('div', { class: 'txn' }, h('span', { class: 'tile' }, icon(t[3])), h('div', null, h('b', { text: t[0] }), h('small', { text: t[1] })), h('b', { text: t[2] }));
          })))));
  };

  // ======================================================= Transport
  SCREENS.transport = function () {
    var d = DEST[state.dest];
    return h('div', { class: 'screen' },
      bar('Transport'),
      h('div', { class: 'scroll' }, h('div', { class: 'pad' },
        h('section', { class: 'card fromto', 'aria-label': 'Journey' },
          h('div', { class: 'ft' }, h('i'), h('div', null, h('small', { text: 'FROM' }), h('b', { text: 'Priory Hall' }))),
          h('div', { class: 'ft' }, h('i'), h('div', null, h('small', { text: 'TO' }), h('b', { text: d.to })))),
        h('div', { class: 'sec-head' }, h('h2', { text: 'Fastest routes' })),
        h('ul', { class: 'list' }, d.routes.map(function (r) {
          return h('li', null, h('button', { class: 'card route' + (r.best ? ' is-best' : ''), type: 'button', onclick: function () { go('route', { id: r.id }); } },
            h('span', { class: 'tile' }, icon(r.icon)),
            h('span', { class: 'route__main' }, h('div', null, h('b', { text: r.mode }), r.best ? badge(['Fastest', 'primary']) : null), h('small', { text: r.sub })),
            h('span', { class: 'route__time' }, h('b', { text: r.time }), h('small', { class: r.when === 'now' ? 'now' : 'soon', text: r.when }))));
        })),
        h('div', { class: 'sec-head' }, h('h2', { text: 'My usual routes' })),
        h('ul', { class: 'list' }, Object.keys(DEST).map(function (k) {
          var id = 'dest-' + k;
          return h('li', null, h('button', { id: id, class: 'card usual', type: 'button', 'aria-pressed': state.dest === k ? 'true' : 'false',
            onclick: function () { state.dest = k; state.started = false; save(); announce('Routes to ' + DEST[k].to + '.'); refresh(id); } },
            icon('arrow-right'), h('b', { text: DEST[k].label }), h('span', { class: 'chev' }, icon('chevron-right'))));
        })))));
  };

  SCREENS.route = function (args) {
    var d = DEST[state.dest], r = find(d.routes, args.id), started = state.started === state.dest + ':' + r.id;
    return h('div', { class: 'screen' },
      bar(r.mode + ' · ' + r.time),
      h('div', { class: 'scroll' }, h('div', { class: 'pad' },
        h('section', { class: 'next', 'aria-label': r.next[0] },
          h('small', { text: r.next[0] }), h('b', { text: r.next[1] }), h('p', { text: r.next[2] })),
        h('div', { class: 'sec-head' }, h('h2', { text: 'Your journey' })),
        h('ol', { class: 'legs', style: 'padding:0;margin:0' }, r.legs.map(function (l) {
          return h('li', { class: 'leg' + (l[3] && l[0] === 'bus' ? ' is-ride' : '') }, h('span', { class: 'tile' }, icon(l[0])), h('div', null, h('b', { text: l[1] }), h('small', { text: l[2] })));
        })),
        r.deps ? h('section', { class: 'card box' }, h('h2', { style: 'font-size:15px;line-height:20px', text: 'Live departures · ' + r.deps[0] }),
          h('ul', { class: 'deps' }, r.deps.slice(1).map(function (t, i) { return h('li', { class: i === 0 ? 'live' : null, text: t }); }))) : null)),
      h('div', { class: 'foot' },
        h('button', { id: 'start', class: 'btn' + (started ? ' is-done' : ''), type: 'button', 'aria-pressed': started ? 'true' : 'false',
          onclick: function () { state.started = started ? false : state.dest + ':' + r.id; save(); announce(started ? 'Journey ended.' : 'Journey started.'); refresh('start'); } },
          started ? 'Journey started ✓' : 'Start journey')));
  };

  // ======================================================= Jobs
  function jobCard(j) {
    var saved = !!state.jobsSaved[j.id], id = 'jsave-' + j.id;
    return h('li', { class: 'card job' },
      h('button', { class: 'job__open', type: 'button', onclick: function () { go('job', { id: j.id }); } },
        h('span', { class: 'job__head' }, h('span', { class: 'tile' }, icon(j.icon)), h('span', null, h('b', { text: j.t }), h('small', { text: j.co }))),
        h('span', { class: 'infos' }, h('span', null, icon('wallet'), j.pay), h('span', null, icon('clock'), j.hours), h('span', null, icon('map-pin'), j.dist)),
        h('span', { class: 'match' }, icon('check-circle'), h('span', { class: 'match__label', text: 'Schedule match' }), h('b', { text: j.match + '%' })),
        h('span', { class: 'mtrack', style: 'display:block' }, h('i', { style: 'width:' + j.match + '%' })),
        state.applied[j.id] ? h('span', { class: 'badge badge--success', style: 'margin-top:12px', text: 'Applied' }) : null),
      h('button', { id: id, class: 'heart', type: 'button', 'aria-label': 'Save ' + j.t, 'aria-pressed': saved ? 'true' : 'false',
        onclick: function () { state.jobsSaved[j.id] = !saved; save(); announce(saved ? 'Removed from saved jobs.' : 'Job saved.'); refresh(id); } }, icon('heart')));
  }

  SCREENS.jobs = function (args) {
    var f = args.f || 'Best match';
    var list = JOBS.filter(function (j) { return f === 'Best match' || j.cat === f; }).sort(function (a, b) { return b.match - a.match; });
    return h('div', { class: 'screen' },
      bar('Jobs'),
      h('div', { class: 'scroll' }, h('div', { class: 'pad' },
        h('section', { class: 'avail', 'aria-label': 'Your availability' },
          h('div', { class: 'avail__top' }, icon('clock'), h('b', { text: 'Your availability' }), h('button', { type: 'button', 'aria-label': 'Edit availability', onclick: notInDemo }, 'Edit')),
          h('ul', { class: 'slots' }, h('li', { text: 'Mon 17:00–22:00' }), h('li', { text: 'Wed 17:00–22:00' }), h('li', { text: 'Sat · all day' }))),
        h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter jobs', style: 'margin-top:16px' }, ['Best match', 'Café', 'Retail', 'Campus'].map(function (c) {
          return h('button', { id: 'jf-' + c.replace(' ', ''), class: 'chip', type: 'button', 'aria-pressed': f === c ? 'true' : 'false', onclick: function () { args.f = c; refresh('jf-' + c.replace(' ', '')); } }, c);
        })),
        h('p', { class: 'count', role: 'status', text: list.length + ' job' + (list.length === 1 ? '' : 's') + ' match your schedule' }),
        h('ul', { class: 'list' }, list.map(jobCard)))));
  };

  SCREENS.job = function (args) {
    var j = find(JOBS, args.id), saved = !!state.jobsSaved[j.id], applied = !!state.applied[j.id];
    return h('div', { class: 'screen' },
      bar(j.t, { srTitle: true }),
      h('div', { class: 'scroll' }, h('div', { class: 'pad' },
        h('div', { class: 'jd-head' },
          h('span', { class: 'tile' }, icon(j.icon)),
          h('h2', { text: j.t, style: 'margin-top:12px;font:700 26px/32px var(--font)' }),
          h('p', { text: j.co2 }),
          h('ul', { class: 'infos' }, h('li', { text: j.pay }), h('li', { text: j.hrs }), h('li', { text: j.dist }))),
        h('section', { class: 'fit', 'aria-label': 'Schedule match' },
          h('div', { class: 'fit__top' }, icon('check-circle'), h('b', { text: (j.match >= 90 ? 'Great' : 'Good') + ' schedule match' }), h('strong', { text: j.match + '%' })),
          h('p', { text: j.fit }),
          h('ul', { class: 'shifts' }, j.shifts.map(function (s) {
            return h('li', null, h('span', { class: 'ok' }, icon('check')), h('b', { text: s[0] }), h('span', { text: s[1] }));
          }))),
        h('h2', { class: 'about-h', style: 'margin-top:20px', text: 'About the role' }),
        h('p', { class: 'about-p', text: j.about }))),
      h('div', { class: 'foot' },
        h('button', { id: 'jd-save', class: 'icon-btn fav', type: 'button', 'aria-label': 'Save job', 'aria-pressed': saved ? 'true' : 'false',
          onclick: function () { state.jobsSaved[j.id] = !saved; save(); announce(saved ? 'Removed from saved jobs.' : 'Job saved.'); refresh('jd-save'); } }, icon('heart')),
        h('button', { id: 'apply', class: 'btn' + (applied ? ' is-done' : ''), type: 'button', 'aria-pressed': applied ? 'true' : 'false',
          onclick: function () { state.applied[j.id] = !applied; save(); announce(applied ? 'Application withdrawn.' : 'Application sent (demo only — nothing leaves your device).'); refresh('apply'); } },
          applied ? 'Applied ✓' : 'Apply now')));
  };

  // ---------- Reset demo / Esc ----------
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    if (!e.data || e.data.type !== 'reset-demo') return;
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    state = seed();
    tab('splash');
    announce('Demo reset.');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && window.parent !== window) window.parent.postMessage({ type: 'close-demo' }, location.origin);
  });

  render();
})();
