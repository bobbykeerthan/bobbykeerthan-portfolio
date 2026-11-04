// Magazine engine: page-flip on desktop, fade with reduced motion, swipe on phones.
// Deep links: /ui-ux/#cashsplit opens that page directly.
(function () {
  'use strict';

  var root = document.documentElement;
  var book = document.getElementById('book');
  var head = document.getElementById('run-head');
  var toggle = document.getElementById('view-toggle');
  var reading = root.classList.contains('is-reading');
  var headSection = head && head.querySelector('[data-section]');
  var pages = Array.prototype.slice.call(book.querySelectorAll('.page'));
  var mode = root.classList.contains('mode-flow') ? 'flow'
    : root.classList.contains('mode-fade') ? 'fade' : 'flip';
  var DESIGN_W = 1754;
  var DESIGN_H = 1240;
  var current = 0;
  var flip = null;

  // ---------- Page ids and deep links ----------
  var idToIndex = {};
  pages.forEach(function (page, i) {
    page.setAttribute('aria-label', 'Page ' + (i + 1) + ' of ' + pages.length +
      (page.dataset.title ? ' — ' + page.dataset.title : ''));
    [page.dataset.id].concat((page.dataset.alias || '').split(' ')).forEach(function (id) {
      if (id) idToIndex[id] = i;
    });
  });

  function indexFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    return Object.prototype.hasOwnProperty.call(idToIndex, id) ? idToIndex[id] : null;
  }

  // ---------- Spreads ----------
  // Desktop shows two pages side by side. Like a printed magazine, the cover
  // stands alone on the right, then pages pair up (2–3, 4–5 …); a last even
  // page stands alone on the left as the back cover. Phones show one page.
  var twoUp = mode !== 'flow';
  function spreadOf(i) {
    if (!twoUp) return [i];
    if (i === 0) return [0];
    var left = i % 2 === 1 ? i : i - 1;
    return left + 1 < pages.length ? [left, left + 1] : [left];
  }

  // ---------- Menu ----------
  var elCurrent = document.querySelector('[data-current]');
  var elTotal = document.querySelector('[data-total]');
  var btnPrev = document.querySelector('[data-prev]');
  var btnNext = document.querySelector('[data-next]');
  elTotal.textContent = pages.length;

  // i = the page asked for (its id goes in the address bar); the whole spread is shown
  function onPageChange(i) {
    var spread = spreadOf(i);
    current = i;
    elCurrent.textContent = spread.map(function (n) { return n + 1; }).join('–');
    btnPrev.disabled = spread[0] === 0;
    btnNext.disabled = spread[spread.length - 1] === pages.length - 1;
    pages.forEach(function (p, n) {
      var on = spread.indexOf(n) !== -1;
      p.classList.toggle('is-current', on);
      p.classList.toggle('is-left', on && spread.length === 2 && n === spread[0]);
      p.classList.toggle('is-right', on && (spread.length === 2 ? n === spread[1] : n === 0));
      p.classList.toggle('is-back', on && spread.length === 1 && n !== 0);
    });
    // Load images for this spread and the two either side, so turning never shows blank pages
    var lo = Math.max(0, spread[0] - 4), hi = Math.min(pages.length - 1, spread[spread.length - 1] + 4);
    for (var n = lo; n <= hi; n++) {
      Array.prototype.forEach.call(pages[n].querySelectorAll('img[loading="lazy"]'), function (img) {
        img.loading = 'eager';
      });
    }
    // A closed magazine (front or back cover) slides to the middle of the desk
    book.classList.toggle('is-closed-front', twoUp && spread[0] === 0);
    book.classList.toggle('is-closed-back', twoUp && spread.length === 1 && spread[0] !== 0);
    placeToggle();
    // Running header: the section(s) on show; hidden while the magazine is closed
    if (head) {
      var names = [];
      spread.forEach(function (n) {
        var name = (pages[n].dataset.title || '').split(' — ')[0];
        if (name && names.indexOf(name) < 0) names.push(name);
      });
      headSection.textContent = names.join(' · ');
      head.classList.toggle('is-closed', spread.length === 1);
    }
    var hash = i === 0 ? '' : '#' + pages[i].dataset.id;
    if (location.hash !== hash && history.replaceState) {
      history.replaceState(null, '', location.pathname + location.search + hash);
    }
  }

  // ---------- Desktop scaling ----------
  // Each page is the largest landscape page that fits half the stage;
  // its 1754 × 1240 canvas is then scaled to that width.
  var stage = document.getElementById('stage');
  var pageW = 0;

  // ---------- Reading view toggle ----------
  // In the magazine: pinned inside the top-right corner of the visible pages (one page when closed).
  // In Reading view (desktop): top-right of the screen, to switch back. Phones/tablets: hidden.
  function placeToggle() {
    if (!toggle || mode === 'flow' || !pageW) return;
    var r = stage.getBoundingClientRect(), bh = Math.round(pageW * DESIGN_H / DESIGN_W);
    var closed = book.classList.contains('is-closed-front') || book.classList.contains('is-closed-back');
    var right = r.left + r.width / 2 + (closed ? pageW / 2 : pageW);
    toggle.style.right = Math.round(window.innerWidth - right + 14) + 'px';
    toggle.style.top = Math.round(r.top + (r.height - bh) / 2 + 14) + 'px';
  }
  if (toggle) {
    toggle.querySelector('[data-label]').textContent = reading ? 'Magazine view' : 'Reading view';
    toggle.setAttribute('aria-pressed', reading ? 'true' : 'false');
    toggle.setAttribute('aria-label', reading ? 'Switch back to the magazine view' : 'Switch to reading view: larger text in a single column');
    toggle.addEventListener('click', function () {
      try { localStorage.setItem('bk-view', reading ? 'magazine' : 'reading'); } catch (e) { return; }
      location.reload(); // reopens on the same page: the address keeps the current page
    });
    // show it once it has its first position, then let it follow the cover's slide
    setTimeout(function () { toggle.classList.add('is-placed'); }, 100);
  }
  function fitCanvas() {
    if (mode === 'flow') return;
    pageW = Math.floor(Math.min(stage.clientWidth / 2, stage.clientHeight * DESIGN_W / DESIGN_H));
    book.style.minWidth = '';
    book.style.maxWidth = '';
    book.style.width = (pageW * 2) + 'px';
    book.style.setProperty('--pw', pageW + 'px');
    if (mode === 'fade') book.style.height = Math.round(pageW * DESIGN_H / DESIGN_W) + 'px';
    book.style.setProperty('--s', (pageW / DESIGN_W).toFixed(5));
    if (flip) flip.update();
    if (head) {
      // line the header up with the open spread, just above its top edge
      var r = stage.getBoundingClientRect(), bw = pageW * 2, bh = Math.round(pageW * DESIGN_H / DESIGN_W);
      var top = r.top + (r.height - bh) / 2;
      head.style.left = Math.round(r.left + (r.width - bw) / 2) + 'px';
      head.style.width = bw + 'px';
      head.style.top = Math.round(top - 38) + 'px';
      head.classList.toggle('no-room', top < 52);
    }
    placeToggle();
  }

  // ---------- Navigation per mode ----------
  function goTo(i, instant) {
    i = Math.max(0, Math.min(pages.length - 1, i));
    if (mode === 'flip' && flip) {
      var from = spreadOf(current)[0], to = spreadOf(i)[0];
      if (from === to) { onPageChange(i); return; }
      var neighbour = spreadOf(to > from ? from + spreadOf(current).length : from - 1)[0] === to;
      if (instant) { flip.turnToPage(to); onPageChange(i); return; }
      pendingTarget = i;
      // Turn from the bottom corner, the way a hand turns a magazine page. A jump further away
      // (Contents, index strip) is one animated turn that lands on the target spread.
      if (!neighbour) flip.flip(to, 'bottom');
      else if (to > from) flip.flipNext('bottom'); else flip.flipPrev('bottom');
    } else if (mode === 'flow') {
      var smooth = !instant && Math.abs(i - current) === 1 &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      book.scrollTo({ left: pages[i].offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
      // Some browsers drop smooth scrolls (background tab, snap quirks): make sure we land
      setTimeout(function () {
        if (current === i && Math.abs(book.scrollLeft - pages[i].offsetLeft) > 2) book.scrollTo({ left: pages[i].offsetLeft });
      }, 700);
      pages[i].scrollTop = 0;
      onPageChange(i);
    } else {
      onPageChange(i);
    }
  }
  function step(dir) {
    var spread = spreadOf(current);
    goTo(dir > 0 ? spread[spread.length - 1] + 1 : spread[0] - 1);
  }
  function next() { step(1); }
  function prev() { step(-1); }

  var start = indexFromHash() || 0;
  var pendingTarget = null;

  if (mode === 'flip' && window.St && window.St.PageFlip) {
    fitCanvas();
    flip = new window.St.PageFlip(book, {
      width: DESIGN_W,
      height: DESIGN_H,
      size: 'stretch',
      minWidth: 200,
      maxWidth: 6000,
      minHeight: 100,
      maxHeight: 6000,
      usePortrait: false,
      showCover: true,
      drawShadow: true,
      maxShadowOpacity: 0.55,
      flippingTime: 1100,
      mobileScrollSupport: false,
      startPage: spreadOf(start)[0],
    });
    flip.loadFromHTML(pages);
    // showCover makes the cover and a lone back page stiff board that swings like a door;
    // a magazine is paper, so every page gets the soft curl
    pages.forEach(function (p, i) {
      var pg = flip.getPage(i);
      pg.setDensity('soft');
      pg.setDrawingDensity('soft');
    });
    // page-flip sets min/max width from the options above; fitCanvas undoes that
    book.style.minHeight = '';
    fitCanvas();
    flip.on('flip', function (e) {
      var i = pendingTarget !== null && spreadOf(pendingTarget)[0] === spreadOf(e.data)[0] ? pendingTarget : e.data;
      pendingTarget = null;
      onPageChange(i);
    });
    // Opening the front cover / turning back from the back cover: slide to centre as the page turns
    flip.on('changeState', function (e) {
      if (e.data === 'flipping' || e.data === 'user_fold') {
        book.classList.remove('is-closed-front', 'is-closed-back');
      } else if (e.data === 'read') {
        onPageChange(current);
      }
    });
    onPageChange(start);
    window.addEventListener('resize', fitCanvas);
  } else if (mode === 'flow') {
    var scrollTimer;
    book.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var i = Math.round(book.scrollLeft / pages[0].getBoundingClientRect().width);
        if (i !== current) onPageChange(Math.max(0, Math.min(pages.length - 1, i)));
      }, 80);
    }, { passive: true });
    window.addEventListener('resize', function () {
      book.scrollTo({ left: pages[current].offsetLeft });
    });
    // Stop the browser restoring an old swipe position over the deep link
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    goTo(start, true);
    window.addEventListener('load', function () { goTo(current, true); });
  } else {
    mode = 'fade';
    root.classList.remove('mode-flip');
    root.classList.add('mode-fade');
    fitCanvas();
    window.addEventListener('resize', fitCanvas);
    onPageChange(start);
  }

  // Crossing the phone/desktop breakpoint needs the other layout: reload in place
  var mqFlow = window.matchMedia('(max-width: 1023px), (max-height: 559px)');
  var onModeChange = function () { location.reload(); };
  if (mqFlow.addEventListener) mqFlow.addEventListener('change', onModeChange);
  else mqFlow.addListener(onModeChange);

  // ---------- Controls ----------
  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);

  // In-magazine links (#id) jump to that page instead of scrolling
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!Object.prototype.hasOwnProperty.call(idToIndex, id)) return;
    e.preventDefault();
    goTo(idToIndex[id]);
    if (mode !== 'flip') book.focus({ preventScroll: true });
  });

  window.addEventListener('hashchange', function () {
    var i = indexFromHash();
    if (i !== null && i !== current) goTo(i);
  });

  document.addEventListener('keydown', function (e) {
    if (dialog.open || e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
  });

  // ---------- "Try the app" pop-up ----------
  var dialog = document.getElementById('app-dialog');
  var frame = dialog.querySelector('iframe');
  var phone = dialog.querySelector('.app-dialog__phone');
  var device = dialog.querySelector('.app-dialog__device');
  var opener = null;

  function fitPhone() {
    if (!dialog.open || (mode === 'flow' && !reading)) return;
    // phone frame: 426 × 898; browser window (desktop dashboards): 1440 × 900 page + 40 title bar
    var browser = dialog.classList.contains('is-browser');
    var fw = browser ? 1440 : 426, fh = browser ? 940 : 898;
    var s = Math.min(1, (device.clientHeight - 32) / fh, (device.clientWidth - 32) / fw);
    phone.style.setProperty('--ps', s.toFixed(4));
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-app]');
    if (!btn) return;
    opener = btn;
    var app = btn.dataset.app.replace(/[^a-z0-9-]/g, '');
    var view = mode === 'flow' && !reading ? 'full' : 'frame';
    dialog.classList.toggle('is-browser', btn.dataset.appFrame === 'browser');
    frame.title = btn.dataset.appTitle || 'App demo';
    dialog.setAttribute('aria-label', frame.title);
    frame.src = '../apps/' + app + '/index.html?view=' + view;
    dialog.showModal();
    fitPhone();
  });
  window.addEventListener('resize', fitPhone);

  dialog.querySelector('[data-app-close]').addEventListener('click', function () { dialog.close(); });
  dialog.querySelector('[data-app-reset]').addEventListener('click', function () {
    if (frame.contentWindow) frame.contentWindow.postMessage({ type: 'reset-demo' }, location.origin);
  });
  dialog.addEventListener('click', function (e) { if (e.target === dialog || e.target === device) dialog.close(); });
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== frame.contentWindow) return;
    if (e.data && e.data.type === 'close-demo' && dialog.open) dialog.close();
  });
  dialog.addEventListener('close', function () {
    frame.src = 'about:blank';
    // Return focus to the button; if its page has been turned away, to the book
    if (opener && opener.offsetParent !== null) opener.focus();
    else book.focus({ preventScroll: true });
    if (frame.contains(document.activeElement) || document.activeElement === frame) book.focus({ preventScroll: true });
  });
  // turn on the cover's slide animation once the opening position is settled
  setTimeout(function () { book.classList.add('is-ready'); }, 100);
})();
