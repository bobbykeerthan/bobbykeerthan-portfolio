// Shopdesk — working demo of an online-store dashboard. Browser only; order status
// changes are saved in localStorage. Typed text is only ever set with textContent/value.
(function () {
  'use strict';

  var D = window.SHOP_DATA;
  var ICONS = window.SHOP_ICONS;
  var STORE_KEY = 'shopdesk-demo-v1';
  var PER_PAGE = 8;

  // ---------- Saved state: only what the visitor changes ----------
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (s && s.v === 1 && s.status && typeof s.status === 'object') return s;
    } catch (e) { /* storage blocked or corrupt: start fresh */ }
    return { v: 1, status: {}, shippedAt: {} };
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) { /* session only */ } }
  var saved = load();

  function statusOf(o) {
    var s = saved.status[o.id];
    return s === 'shipped' && o.status === 'to-ship' ? 'shipped' : o.status;
  }

  // ---------- Helpers ----------
  function icon(name, cls) {
    var s = document.createElement('span');
    s.className = 'icon' + (cls ? ' ' + cls : '');
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
  var gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
  var gbp0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
  function money(p) { return gbp.format(p / 100); }
  function money0(p) { return gbp0.format(p / 100); }
  function num(n) { return n.toLocaleString('en-GB'); }
  function initials(name) { return name.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }
  function day(d) { return d + ' Oct'; }
  function avatar(name) { return h('span', { class: 'avatar', 'aria-hidden': 'true', text: initials(name) }); }

  function orderSums(o) {
    var sub = 0, count = 0;
    o.items.forEach(function (it) { sub += D.products[it[0]].price * it[1]; count += it[1]; });
    var delivery = sub >= 10000 ? 0 : 800; // free delivery from £100
    return { sub: sub, delivery: delivery, total: sub + delivery, count: count };
  }
  var STATUS = { 'to-ship': 'To ship', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
  function statusBadge(s) { return h('span', { class: 'badge badge--' + s, text: STATUS[s] }); }
  function stockBadge(p) {
    if (p.stock === 0) return h('span', { class: 'badge badge--out', text: 'Out of stock' });
    if (p.stock <= p.reorder) return h('span', { class: 'badge badge--low', text: p.stock + ' left' });
    return h('span', { class: 'badge badge--in', text: 'In stock' });
  }
  function toShipCount() { return D.orders.filter(function (o) { return statusOf(o) === 'to-ship'; }).length; }
  function lowStock() { return D.products.filter(function (p) { return p.stock > 0 && p.stock <= p.reorder; }); }
  function outOfStock() { return D.products.filter(function (p) { return p.stock === 0; }); }

  var live = document.getElementById('live');
  function announce(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }

  // ---------- Navigation ----------
  var view = { name: 'overview' };
  var lists = { orders: { filter: 'all', page: 1, q: '' }, products: { page: 1, q: '' }, customers: { page: 1, q: '' } };
  function go(name, extra, keepFocus) {
    view = Object.assign({ name: name }, extra || {});
    closeDrawer();
    render(keepFocus);
  }

  var sidebar = document.getElementById('sidebar');
  var topbar = document.getElementById('topbar');
  var content = document.getElementById('content');

  function renderSidebar() {
    var items = [['overview', 'Overview', 'grid'], ['orders', 'Orders', 'bag'], ['products', 'Products', 'box'], ['customers', 'Customers', 'users']];
    var section = view.name === 'order' ? 'orders' : view.name;
    var n = toShipCount();
    sidebar.replaceChildren(
      h('div', { class: 'brand' },
        h('span', { class: 'brand__tile' }, icon('bag')),
        h('div', null, h('p', { class: 'brand__name', text: 'Shopdesk' }), h('p', { class: 'brand__store', text: D.store }))),
      h('p', { class: 'menu-label', text: 'MENU' }),
      h('nav', { 'aria-label': 'Main' }, h('ul', { class: 'nav' }, items.map(function (it) {
        return h('li', null, h('button', {
          class: 'nav__item', type: 'button', 'aria-current': section === it[0] ? 'page' : null,
          onclick: function () { go(it[0]); },
        }, icon(it[2]), h('span', { class: 'nav__label', text: it[1] }),
          it[0] === 'orders' && n ? h('span', { class: 'nav__badge', text: String(n), 'aria-label': n + ' to ship' }) : null));
      }))),
      h('div', { class: 'owner' }, avatar(D.owner.name),
        h('div', null, h('p', { class: 'owner__name', text: D.owner.name }), h('p', { class: 'owner__role', text: D.owner.role }))));
  }

  function renderTopbar(title, sub) {
    var key = ['orders', 'products', 'customers'].indexOf(view.name) >= 0 ? view.name : null;
    var input = h('input', {
      type: 'search', placeholder: 'Search orders, products…', 'aria-label': 'Search orders, products and customers',
      maxlength: 60, autocomplete: 'off', value: key ? lists[key].q : '',
    });
    input.addEventListener('input', function () {
      var q = input.value.slice(0, 60);
      var target = key || 'orders';
      lists[target].q = q;
      lists[target].page = 1;
      if (!key) { go('orders'); focusSearch(); } else render(true);
    });
    topbar.replaceChildren(
      h('button', { class: 'menu-btn', type: 'button', 'aria-label': 'Open menu', 'aria-expanded': 'false', onclick: openDrawer }, icon('grid')),
      h('div', { class: 'heading' }, h('h1', { tabindex: '-1', text: title }), h('p', { text: sub })),
      h('div', { class: 'search', role: 'search' }, icon('search'), input),
      h('div', { class: 'range' }, icon('calendar'), h('span', { text: 'Last 7 days' }), icon('chevron-down')),
      avatar(D.owner.name));
  }
  function focusSearch() {
    var i = topbar.querySelector('input');
    if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }

  function openDrawer() { sidebar.classList.add('is-open'); var b = sidebar.querySelector('.nav__item'); if (b) b.focus(); }
  function closeDrawer() { sidebar.classList.remove('is-open'); }
  document.addEventListener('click', function (e) {
    if (sidebar.classList.contains('is-open') && !sidebar.contains(e.target) && !e.target.closest('.menu-btn')) closeDrawer();
  });

  // ---------- Shared pieces ----------
  function pager(state, total, noun, onPage) {
    var pages = Math.max(1, Math.ceil(total / PER_PAGE));
    var p = Math.min(state.page, pages);
    var from = total ? (p - 1) * PER_PAGE + 1 : 0, to = Math.min(total, p * PER_PAGE);
    var nums = [];
    if (pages <= 6) for (var i = 1; i <= pages; i++) nums.push(i);
    else if (p <= 3) nums = [1, 2, 3, '…', pages];
    else if (p >= pages - 2) nums = [1, '…', pages - 2, pages - 1, pages];
    else nums = [1, '…', p - 1, p, p + 1, '…', pages];
    function btn(label, target, extra) {
      return h('button', Object.assign({ type: 'button', onclick: function () { onPage(target); } }, extra), label);
    }
    return h('div', { class: 'pager' },
      h('p', { class: 'pager__info', text: 'Showing ' + from + '–' + to + ' of ' + num(total) + ' ' + (total === 1 ? noun.replace(/s$/, '') : noun) }),
      h('nav', { class: 'pager__btns', 'aria-label': 'Pages' },
        btn(icon('chevron-left'), p - 1, { 'aria-label': 'Previous page', disabled: p === 1 }),
        nums.map(function (n) {
          return n === '…' ? h('span', { 'aria-hidden': 'true', text: '…' })
            : btn(String(n), n, { 'aria-current': n === p ? 'page' : null, 'aria-label': 'Page ' + n });
        }),
        btn(icon('chevron-right'), p + 1, { 'aria-label': 'Next page', disabled: p === pages })));
  }

  function ordersTable(rows) {
    return h('table', { class: 'tbl tbl--rows' },
      h('colgroup', null, [120, 266, 136, 96, 126, null, 64].map(function (w) { return h('col', w ? { style: null, width: w } : null); })),
      h('thead', null, h('tr', null, ['Order', 'Customer', 'Date', 'Items', 'Total', 'Status', ''].map(function (t, i) {
        return h('th', { scope: 'col' }, i === 6 ? h('span', { class: 'sr-only', text: 'Open' }) : t);
      }))),
      h('tbody', null, rows.map(function (o) {
        var c = D.customer(o.cust), s = orderSums(o), st = statusOf(o);
        var open = function () { go('order', { id: o.id }); };
        return h('tr', { onclick: open },
          h('td', { class: 'strong' }, h('button', { class: 'row-link', type: 'button', onclick: function (e) { e.stopPropagation(); open(); }, 'aria-label': 'Order #' + o.id + ', ' + c.name }, '#' + o.id)),
          h('td', { class: 'wide' }, h('span', { class: 'cust' }, avatar(c.name), h('span', { class: 'name', text: c.name }))),
          h('td', { 'data-label': 'Date' }, day(o.day)),
          h('td', { 'data-label': 'Items' }, String(s.count)),
          h('td', { class: 'strong right' }, money(s.total)),
          h('td', { class: 'right' }, statusBadge(st)),
          h('td', { class: 'hide-sm' }, icon('chevron-right', 'chev')));
      })));
  }

  // ---------- Screens ----------
  function overview() {
    renderTopbar('Overview', 'Good morning, Ellie. Here is how Kiln & Co. is doing.');
    var low = lowStock().sort(function (a, b) { return a.stock - b.stock; });
    var kpis = h('section', { class: 'grid-4', 'aria-label': 'Key numbers' }, D.kpis.map(function (k) {
      var value = k.value === null ? String(low.length) : k.value;
      var chipCls = k.warn ? 'chip chip--warn' : k.up ? 'chip chip--up' : 'chip chip--down';
      return h('div', { class: 'card kpi' },
        h('div', { class: 'kpi__top' }, h('p', { class: 'kpi__label', text: k.label }), h('span', { class: 'tile' }, icon(k.icon))),
        h('p', { class: 'kpi__value', text: value }),
        h('p', { class: 'kpi__trend' }, h('span', { class: chipCls }, icon(k.warn ? 'alert' : k.up ? 'arrow-up' : 'arrow-down'), k.trend), k.note));
    }));
    var top = h('section', { class: 'card card--pad', 'aria-labelledby': 'top-t' },
      h('div', { class: 'card__head' }, h('div', null, h('h2', { class: 'card__title', id: 'top-t', text: 'Top products' }), h('p', { class: 'card__sub', text: 'Best sellers in the last 7 days' }))),
      h('ul', { class: 'plist' }, D.top.map(function (t) {
        var p = D.products[t[0]];
        return h('li', null, h('div', { class: 'prow' }, h('span', { class: 'thumb' }, icon('box')),
          h('div', { class: 'prow__text' }, h('p', { class: 'prow__name', text: p.name }), h('p', { class: 'prow__meta', text: t[1] + ' sold' })),
          h('p', { class: 'prow__value', text: money0(t[2]) })));
      })));
    var cats = h('section', { class: 'card card--pad', 'aria-labelledby': 'cat-t' },
      h('div', { class: 'card__head' }, h('div', null, h('h2', { class: 'card__title', id: 'cat-t', text: 'Sales by category' }), h('p', { class: 'card__sub', text: 'Last 7 days · £8,420 total' }))),
      h('ul', { class: 'bars', style: null }, D.categories.map(function (c) {
        var fill = h('span', { class: 'bar__fill' });
        fill.style.width = Math.round(c[2] / 37 * 84) + '%'; // longest bar fills 84% of the track, as designed
        return h('li', { class: 'bar' }, h('span', { text: c[0] }), h('span', { class: 'bar__track' }, fill), h('span', { class: 'bar__value', text: money0(c[1]) + ' · ' + c[2] + '%' }));
      })));
    cats.querySelector('.bars').style.marginTop = '18px';
    var lowCard = h('section', { class: 'card card--pad', 'aria-labelledby': 'low-t' },
      h('div', { class: 'card__head' },
        h('div', null, h('h2', { class: 'card__title', id: 'low-t', text: 'Low stock' }), h('p', { class: 'card__sub', text: low.length + ' products need restocking' })),
        h('span', { class: 'chip chip--warn' }, icon('alert'), low.length + ' products')),
      h('ul', { class: 'plist' }, low.slice(0, 4).map(function (p) {
        return h('li', null, h('div', { class: 'prow' }, h('span', { class: 'thumb' }, icon('box')),
          h('div', { class: 'prow__text' }, h('p', { class: 'prow__name', text: p.name }), h('p', { class: 'prow__meta', text: p.cat + ' · reorder at ' + p.reorder })),
          stockBadge(p)));
      })),
      h('button', { class: 'link', type: 'button', onclick: function () { go('products'); } }, 'View all products'));
    var recent = h('section', { class: 'card table-card', 'aria-labelledby': 'rec-t' },
      h('div', { class: 'table-card__head' }, h('h2', { class: 'card__title', id: 'rec-t', text: 'Recent orders' }),
        h('button', { class: 'link', type: 'button', onclick: function () { lists.orders.filter = 'all'; go('orders'); } }, 'View all orders')),
      ordersTable(D.orders.slice(0, 5)));
    return [kpis, h('div', { class: 'row-2' }, salesChart(), top), h('div', { class: 'row-3' }, cats, lowCard), recent];
  }

  function salesChart() {
    var W = D.week, NS = 'http://www.w3.org/2000/svg';
    function s(tag, attrs, kids) {
      var el = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      (kids || []).forEach(function (c) { el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
      return el;
    }
    var x = function (i) { return 48 + i * 640 / 6; };
    var y = function (v) { return 200 - v / 1500 * 200; };
    var line = function (vals) { return vals.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' '); };
    var svg = s('svg', { viewBox: '0 0 696 228', role: 'img', 'aria-label': 'Sales this week: ' + W.days.map(function (d, i) { return d + ' £' + num(W.thisWeek[i]); }).join(', ') + '. Last week totalled £7,490.' }, []);
    [[0, '£1.5k'], [67, '£1k'], [133, '£500'], [200, '£0']].forEach(function (g) {
      svg.appendChild(s('rect', { x: 48, y: g[0], width: 640, height: 1, fill: '#E2E8F0' }));
      svg.appendChild(s('text', { x: 0, y: g[0] + 4 }, [g[1]]));
    });
    W.days.forEach(function (d, i) { svg.appendChild(s('text', { x: x(i), y: 222, 'text-anchor': 'middle' }, [d])); });
    svg.appendChild(s('path', { d: line(W.thisWeek) + ' L688 200 L48 200 Z', fill: 'rgba(173,52,62,0.10)' }));
    svg.appendChild(s('path', { d: line(W.lastWeek), fill: 'none', stroke: '#474747', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    svg.appendChild(s('path', { d: line(W.thisWeek), fill: 'none', stroke: '#AD343E', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
    W.thisWeek.forEach(function (v, i) { svg.appendChild(s('circle', { cx: x(i), cy: y(v), r: 4, fill: '#fff', stroke: '#AD343E', 'stroke-width': 2 })); });
    svg.appendChild(s('rect', { x: 644, y: -2, width: 53, height: 22, rx: 6, fill: '#000' }));
    svg.appendChild(s('text', { x: 670.5, y: 13, 'text-anchor': 'middle', class: 'badge-text' }, ['£1,260']));
    return h('section', { class: 'card card--pad chart', 'aria-labelledby': 'sales-t' },
      h('div', { class: 'card__head' },
        h('div', null, h('h2', { class: 'card__title', id: 'sales-t', text: 'Sales' }), h('p', { class: 'card__sub', text: 'This week compared with last week' })),
        h('div', { class: 'switch', 'aria-hidden': 'true' }, h('span', { class: 'is-on', text: '7 days' }), h('span', { text: '4 weeks' }))),
      h('div', { class: 'legend' },
        h('div', null, h('i'), 'This week', h('b', { text: '£8,420' })),
        h('div', null, h('i', { class: 'is-last' }), 'Last week', h('b', { text: '£7,490' }))),
      h('div', { class: 'plot' }, svg));
  }

  function matchQ(q) {
    var t = q.trim().toLowerCase();
    return function () { return Array.prototype.some.call(arguments, function (s) { return String(s).toLowerCase().indexOf(t) >= 0; }); };
  }

  function orders() {
    var st = lists.orders;
    renderTopbar('Orders', num(D.orders.length) + ' orders in the last 7 days · ' + toShipCount() + ' to ship');
    var m = matchQ(st.q);
    var rows = D.orders.filter(function (o) {
      if (st.filter !== 'all' && statusOf(o) !== st.filter) return false;
      return !st.q.trim() || m('#' + o.id, String(o.id), D.customer(o.cust).name);
    });
    var tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Filter by status' },
      [['all', 'All'], ['to-ship', 'To ship'], ['shipped', 'Shipped'], ['delivered', 'Delivered']].map(function (t) {
        return h('button', { type: 'button', 'aria-pressed': st.filter === t[0] ? 'true' : 'false',
          onclick: function () { st.filter = t[0]; st.page = 1; render(true); announce(t[1] + ': ' + countFor(t[0]) + ' orders'); } }, t[1]);
      }));
    var pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    st.page = Math.min(st.page, pages);
    var slice = rows.slice((st.page - 1) * PER_PAGE, st.page * PER_PAGE);
    return [tabs, h('section', { class: 'card table-card', 'aria-label': 'Orders' },
      slice.length ? ordersTable(slice) : h('p', { class: 'empty', text: 'No orders match.' }),
      pager(st, rows.length, 'orders', function (p) { st.page = p; render(true); }))];
  }
  function countFor(f) { return D.orders.filter(function (o) { return f === 'all' || statusOf(o) === f; }).length; }

  function order() {
    var o = D.orders.filter(function (x) { return x.id === view.id; })[0];
    if (!o) { view = { name: 'orders' }; return orders(); }
    var c = D.customer(o.cust), s = orderSums(o), st = statusOf(o);
    renderTopbar('Order #' + o.id, 'Placed on ' + day(o.day) + ' at ' + o.time + ' · paid by card');
    var placed = day(o.day) + ', ' + o.time;
    var steps;
    if (st === 'cancelled') {
      steps = [['done', 'Order placed', placed], ['stop', 'Cancelled', day(o.day)]];
    } else {
      var shippedMeta = saved.shippedAt[o.id] || day(Math.min(D.today, o.day + 1)) + ', 15:30';
      steps = [
        ['done', 'Order placed', placed],
        ['done', 'Payment received', placed],
        st === 'to-ship' ? ['now', 'Waiting to be shipped', 'Ship by ' + day(o.day + 2)] : ['done', 'Shipped', shippedMeta],
        st === 'delivered' ? ['done', 'Delivered', day(Math.min(D.today, o.day + 2))] : ['todo', 'Delivered', '—'],
      ];
    }
    var progress = h('section', { class: 'card card--pad', 'aria-labelledby': 'prog-t' },
      h('h2', { class: 'card__title', id: 'prog-t', text: 'Order progress' }),
      h('ol', { class: 'steps' }, steps.map(function (p) {
        return h('li', { class: 'step step--' + p[0] },
          h('span', { class: 'dot dot--' + p[0] }, p[0] === 'done' ? icon('check') : p[0] === 'stop' ? icon('x') : null),
          h('div', null, h('p', { class: 'step__title', text: p[1] }), h('p', { class: 'step__meta', text: p[2] })));
      })),
      st === 'to-ship' ? h('button', { class: 'primary', type: 'button', onclick: function () { markShipped(o); } }, icon('truck'), 'Mark as shipped') : null);
    return [
      h('button', { class: 'back', type: 'button', onclick: function () { go('orders'); } }, icon('chevron-left'), 'Back to orders'),
      h('div', { class: 'details' },
        h('section', { class: 'card card--pad', 'aria-labelledby': 'items-t' },
          h('div', { class: 'card__head' }, h('h2', { class: 'card__title', id: 'items-t', text: 'Items (' + s.count + ')' }), statusBadge(st)),
          h('ul', { class: 'plist' }, o.items.map(function (it) {
            var p = D.products[it[0]];
            return h('li', null, h('div', { class: 'prow' }, h('span', { class: 'thumb' }, icon('box')),
              h('div', { class: 'prow__text' }, h('p', { class: 'prow__name', text: p.name }), h('p', { class: 'prow__meta', text: it[1] + ' × ' + money(p.price) })),
              h('p', { class: 'prow__value', text: money(p.price * it[1]) })));
          })),
          h('div', { class: 'totals' },
            h('div', null, 'Subtotal', h('b', { text: money(s.sub) })),
            h('div', null, 'Delivery', h('b', { text: s.delivery ? money(s.delivery) : 'Free' })),
            h('div', { class: 'grand' }, 'Total', h('b', { text: money(s.total) })))),
        h('div', { class: 'side' },
          h('section', { class: 'card card--pad', 'aria-labelledby': 'cust-t' },
            h('h2', { class: 'card__title', id: 'cust-t', text: 'Customer' }),
            h('div', { class: 'customer' }, avatar(c.name),
              h('div', null, h('p', { class: 'cust__name', text: c.name }), h('p', { class: 'cust__email', text: c.email }))),
            h('p', { class: 'addr-label', text: 'Delivery address' }),
            h('p', { class: 'addr', text: c.address })),
          progress)),
    ];
  }

  function markShipped(o) {
    // Stamp with the visitor's clock, but never earlier than an hour after the order was placed
    var now = new Date(), mins = now.getHours() * 60 + now.getMinutes();
    var t = o.time.split(':'), placed = (+t[0]) * 60 + (+t[1]);
    var shipDay = Math.min(D.today, o.day + (o.day < D.today ? 1 : 0));
    if (shipDay === o.day) mins = Math.min(23 * 60 + 59, Math.max(mins, placed + 60));
    saved.status[o.id] = 'shipped';
    saved.shippedAt[o.id] = day(shipDay) + ', ' + ('0' + Math.floor(mins / 60)).slice(-2) + ':' + ('0' + mins % 60).slice(-2);
    save();
    render();
    announce('Order #' + o.id + ' marked as shipped.');
  }

  function products() {
    var st = lists.products, m = matchQ(st.q);
    renderTopbar('Products', D.products.length + ' products · ' + lowStock().length + ' low in stock · ' + outOfStock().length + ' out of stock');
    var rows = D.products.filter(function (p) { return !st.q.trim() || m(p.name, p.cat); });
    var pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    st.page = Math.min(st.page, pages);
    var slice = rows.slice((st.page - 1) * PER_PAGE, st.page * PER_PAGE);
    var table = h('table', { class: 'tbl' },
      h('colgroup', null, [346, 156, 116, 116, 136, null].map(function (w) { return h('col', w ? { width: w } : null); })),
      h('thead', null, h('tr', null, ['Product', 'Category', 'Price', 'Stock', 'Sold (7 days)', 'Status'].map(function (t) { return h('th', { scope: 'col', text: t }); }))),
      h('tbody', null, slice.map(function (p) {
        return h('tr', null,
          h('td', { class: 'wide' }, h('span', { class: 'prod' }, h('span', { class: 'thumb' }, icon('box')), h('span', { class: 'prow__name', text: p.name }))),
          h('td', { 'data-label': 'Category' }, p.cat),
          h('td', { class: 'strong', 'data-label': 'Price' }, money(p.price)),
          h('td', { 'data-label': 'Stock' }, String(p.stock)),
          h('td', { 'data-label': 'Sold' }, String(p.sold)),
          h('td', null, stockBadge(p)));
      })));
    return [h('section', { class: 'card table-card', 'aria-label': 'Products' },
      slice.length ? table : h('p', { class: 'empty', text: 'No products match.' }),
      pager(st, rows.length, 'products', function (p) { st.page = p; render(true); }))];
  }

  function customers() {
    var st = lists.customers;
    renderTopbar('Customers', num(D.totalCustomers) + ' customers · ' + D.newThisMonth + ' new this month');
    var q = st.q.trim(), m = matchQ(st.q), idx = [];
    for (var i = 0; i < D.totalCustomers; i++) {
      if (!q) { idx = null; break; }
      var c = D.customer(i);
      if (m(c.name, c.email, c.city)) idx.push(i);
    }
    var total = idx ? idx.length : D.totalCustomers;
    var pages = Math.max(1, Math.ceil(total / PER_PAGE));
    st.page = Math.min(st.page, pages);
    var shown = [];
    for (var k = (st.page - 1) * PER_PAGE; k < Math.min(total, st.page * PER_PAGE); k++) shown.push(D.customer(idx ? idx[k] : k));
    var table = h('table', { class: 'tbl' },
      h('colgroup', null, [376, 116, 156, 156, null].map(function (w) { return h('col', w ? { width: w } : null); })),
      h('thead', null, h('tr', null, ['Customer', 'Orders', 'Total spent', 'Last order', 'Location'].map(function (t) { return h('th', { scope: 'col', text: t }); }))),
      h('tbody', null, shown.map(function (c) {
        return h('tr', null,
          h('td', { class: 'wide' }, h('span', { class: 'cust' }, avatar(c.name),
            h('span', { class: 'cust__text' }, h('p', { class: 'cust__name', text: c.name }), h('p', { class: 'cust__email', text: c.email })))),
          h('td', { 'data-label': 'Orders' }, String(c.orders)),
          h('td', { class: 'strong', 'data-label': 'Spent' }, money(c.spent)),
          h('td', { 'data-label': 'Last order' }, day(c.last)),
          h('td', { 'data-label': '' }, c.city));
      })));
    return [h('section', { class: 'card table-card', 'aria-label': 'Customers' },
      shown.length ? table : h('p', { class: 'empty', text: 'No customers match.' }),
      pager(st, total, 'customers', function (p) { st.page = p; render(true); }))];
  }

  var SCREENS = { overview: overview, orders: orders, order: order, products: products, customers: customers };
  function render(keepFocus) {
    var hadSearch = document.activeElement && document.activeElement.type === 'search';
    var focusedLabel = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('aria-label');
    var parts = SCREENS[view.name]();
    renderSidebar();
    content.replaceChildren.apply(content, parts);
    if (hadSearch) focusSearch();
    else if (keepFocus) {
      var same = focusedLabel && content.querySelector('[aria-label="' + focusedLabel.replace(/"/g, '') + '"]');
      if (same) same.focus(); else content.focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
      var h1 = topbar.querySelector('h1');
      if (h1) h1.focus({ preventScroll: true });
    }
  }

  // ---------- Reset demo / Esc (from the magazine's pop-up) ----------
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    if (!e.data || e.data.type !== 'reset-demo') return;
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    saved = { v: 1, status: {}, shippedAt: {} };
    lists = { orders: { filter: 'all', page: 1, q: '' }, products: { page: 1, q: '' }, customers: { page: 1, q: '' } };
    go('overview');
    announce('Demo reset.');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (sidebar.classList.contains('is-open')) { closeDrawer(); topbar.querySelector('.menu-btn').focus(); return; }
    if (window.parent !== window) window.parent.postMessage({ type: 'close-demo' }, location.origin);
  });

  render();
})();
