// Peter Eugene Ball exhibition companion — working demo.
// Browse the sculptures and paintings, open one, and switch between its three tabs.
// Browser only. Typed search text is only ever used with textContent/value.
(function () {
  'use strict';

  var D = window.PEB_DATA;
  var ICONS = window.PEB_ICONS;
  var TABS = [['overview', 'Overview'], ['material', 'Material & Process'], ['interp', 'Interpretation']];
  var ABOUT = [['biography', 'Biography'], ['practice', 'Practice'], ['themes', 'Themes']];

  document.body.classList.add(new URLSearchParams(location.search).get('view') === 'frame' ? 'view-frame' : 'view-full');

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
  function art(slug) { return D.artworks.filter(function (a) { return a.slug === slug; })[0]; }
  function img(a, cls) {
    return h('img', { class: cls, src: 'img/' + a.slug + '.webp', alt: a.title + ', ' + a.meta.split(' Peter')[0], width: 786, height: 786, decoding: 'async' });
  }
  var live = document.getElementById('live');
  function announce(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }

  // ---------- Navigation ----------
  var stack = [{ name: 'splash' }];
  function go(name, args) { stack.push(Object.assign({ name: name }, args || {})); render(); }
  function tab(name) { stack = [{ name: name }]; render(); }
  var appEl = document.getElementById('app');
  function render(focusSel) {
    var top = stack[stack.length - 1];
    var el = SCREENS[top.name](top);
    appEl.replaceChildren(el);
    var target = focusSel ? el.querySelector(focusSel) : el.querySelector('h1');
    if (target) { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }
  function nav(active) {
    var items = [['home', 'Home', 'home'], ['search', 'Search', 'search'], ['sculptures', 'Sculptures', 'tdesign:statue-of-jesus'],
      ['paintings', 'Paintings', 'painting'], ['about', 'About the artist', 'wordpress:post-author']];
    return h('nav', { class: 'nav', 'aria-label': 'Main' }, items.map(function (it) {
      return h('button', { type: 'button', 'aria-label': it[1], 'aria-current': it[0] === active ? 'page' : null, onclick: function () { tab(it[0]); } }, icon(it[2]));
    }));
  }

  var SCREENS = {};

  SCREENS.splash = function () {
    var timer = setTimeout(function () { if (stack[stack.length - 1].name === 'splash') tab('home'); }, 1800);
    return h('div', { class: 'screen' },
      h('button', { class: 'splash', type: 'button', 'aria-label': 'Enter the exhibition app', onclick: function () { clearTimeout(timer); tab('home'); } },
        h('h1', { class: 'splash__title', text: 'Peter Eugene Ball' }),
        h('p', { class: 'splash__sub', text: 'Exhibition app' })));
  };

  SCREENS.home = function () {
    return h('div', { class: 'screen' },
      h('div', { class: 'scroll' },
        h('div', { class: 'hero', role: 'img', 'aria-label': 'A cathedral interior with a sculpture by Peter Eugene Ball' }),
        h('h1', { class: 'home-title' }, 'Exhibition of ', h('br'), 'Peter Eugene Ball'),
        h('div', { class: 'home-body' },
          h('h2', { class: 'welcome', text: D.home.welcome }),
          h('p', { class: 'home-text', text: D.home.intro }),
          h('button', { class: 'btn-about', type: 'button', onclick: function () { tab('about'); } }, 'ABOUT ARTIST'),
          h('h2', { class: 'guide', text: 'GUIDE' }),
          h('p', { class: 'home-text', text: D.home.guide }))),
      nav('home'));
  };

  function list(kind, title) {
    var items = D.artworks.filter(function (a) { return a.kind === kind; });
    return h('div', { class: 'screen' },
      h('div', { class: 'scroll' },
        h('h1', { class: 'sr-only', text: title }),
        h('div', { class: 'top-space' }),
        h('ul', { class: 'cards', style: null }, items.map(function (a) {
          var image = img(a);
          image.loading = 'lazy';
          return h('li', null, h('button', { class: 'card', type: 'button', 'aria-label': a.title, onclick: function () { go('artwork', { slug: a.slug, tab: 0 }); } },
            image, h('span', { text: a.title })));
        }))),
      nav(kind === 'sculpture' ? 'sculptures' : 'paintings'));
  }
  SCREENS.sculptures = function () { var s = list('sculpture', 'Sculptures'); s.querySelector('.cards').style.paddingTop = '60px'; return s; };
  SCREENS.paintings = function () { var s = list('painting', 'Paintings'); s.querySelector('.cards').style.paddingTop = '70px'; return s; };

  SCREENS.artwork = function (args) {
    var a = art(args.slug);
    var i = Math.max(0, Math.min(2, args.tab || 0));
    function setTab(n, viaKeys) {
      args.tab = Math.max(0, Math.min(2, n));
      render(viaKeys ? '.dot[aria-selected="true"]' : '.panel');
      announce(TABS[args.tab][1]);
    }
    var panel = h('div', { class: 'panel', role: 'tabpanel', id: 'panel', 'aria-labelledby': 'tab-' + TABS[i][0], tabindex: '-1' });
    if (i === 0) add(panel, h('p', { text: a.overview }));
    else if (i === 1) add(panel, [h('h3', { text: 'Materials' }), h('p', { text: a.materials }), h('h3', { text: 'Craftsmanship' }), h('p', { text: a.craft })]);
    else add(panel, h('p', { text: a.interp }));
    var dots = h('div', { class: 'dots', role: 'tablist', 'aria-label': 'About this work' }, TABS.map(function (t, n) {
      return h('button', { class: 'dot', type: 'button', role: 'tab', id: 'tab-' + t[0], 'aria-selected': n === i ? 'true' : 'false', 'aria-controls': 'panel',
        'aria-label': t[1], tabindex: n === i ? '0' : '-1', onclick: function () { setTab(n); } }, h('span'));
    }));
    dots.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); setTab((i + 1) % 3, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setTab((i + 2) % 3, true); }
    });
    var scroll = h('div', { class: 'scroll' },
      img(a, 'art-img'),
      dots,
      h('div', { class: 'art-head' }, h('h1', { class: 'art-title', text: a.title }), h('p', { class: 'art-meta', text: a.meta })),
      h('div', { class: 'tabbar' },
        h('button', { class: 'arrow', type: 'button', 'aria-label': 'Previous: ' + (TABS[i - 1] || [0, ''])[1], disabled: i === 0, onclick: function () { setTab(i - 1); } }, icon('back')),
        h('h2', { class: 'tabname', text: TABS[i][1] }),
        h('button', { class: 'arrow arrow--next', type: 'button', 'aria-label': 'Next: ' + (TABS[i + 1] || [0, ''])[1], disabled: i === 2, onclick: function () { setTab(i + 1); } }, icon('back'))),
      panel);
    // swipe left/right on the text to change tabs
    var x0 = null;
    scroll.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    scroll.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 60) setTab(i + (dx < 0 ? 1 : -1));
    });
    return h('div', { class: 'screen' }, scroll, nav(a.kind === 'sculpture' ? 'sculptures' : 'paintings'));
  };

  SCREENS.about = function (args) {
    var i = args.tab || 0;
    var tabs = h('div', { class: 'about-tabs', role: 'tablist', 'aria-label': 'About the artist' }, ABOUT.map(function (t, n) {
      return h('button', { class: 'about-tab', type: 'button', role: 'tab', id: 'atab-' + t[0], 'aria-selected': n === i ? 'true' : 'false', 'aria-controls': 'apanel',
        tabindex: n === i ? '0' : '-1', onclick: function () { args.tab = n; render('.about-tab[aria-selected="true"]'); } }, t[1]);
    }));
    tabs.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        args.tab = (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
        render('.about-tab[aria-selected="true"]');
      }
    });
    return h('div', { class: 'screen' },
      h('div', { class: 'scroll' },
        h('img', { class: 'about-img', src: 'img/artist.webp', alt: 'A sculpture by Peter Eugene Ball in a church interior', width: 786, height: 789 }),
        h('h1', { class: 'about-name', text: 'Peter Eugene Ball' }),
        tabs,
        h('div', { class: 'panel', role: 'tabpanel', id: 'apanel', 'aria-labelledby': 'atab-' + ABOUT[i][0] }, h('p', { text: D.about[ABOUT[i][0]] }))),
      nav('about'));
  };

  SCREENS.search = function () {
    var results = h('ul', { class: 'results', id: 'results' });
    var input = h('input', { type: 'search', placeholder: 'Search', 'aria-label': 'Search artworks', 'aria-controls': 'results', maxlength: 40, autocomplete: 'off' });
    function draw() {
      var q = input.value.trim().toLowerCase().slice(0, 40);
      var found = D.artworks.filter(function (a) { return !q || a.title.toLowerCase().indexOf(q) >= 0 || a.meta.toLowerCase().indexOf(q) >= 0; });
      results.replaceChildren.apply(results, found.length ? found.map(function (a) {
        return h('li', null, h('button', { class: 'result', type: 'button', onclick: function () { go('artwork', { slug: a.slug, tab: 0 }); } },
          h('span', { text: a.title }), h('small', { text: a.kind === 'sculpture' ? 'Sculpture' : 'Painting' })));
      }) : [h('li', { class: 'none', text: 'No artworks match.' })]);
    }
    input.addEventListener('input', draw);
    draw();
    var s = h('div', { class: 'screen' },
      h('div', { class: 'search' },
        h('h1', { class: 'sr-only', text: 'Search' }),
        h('div', { class: 'search-box' }, h('label', null, icon('search'), input), results)),
      nav('search'));
    setTimeout(function () { input.focus(); }, 0);
    return s;
  };

  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    if (e.data && e.data.type === 'reset-demo') { stack = [{ name: 'splash' }]; render(); announce('Demo reset.'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && window.parent !== window) window.parent.postMessage({ type: 'close-demo' }, location.origin);
  });

  render();
})();
