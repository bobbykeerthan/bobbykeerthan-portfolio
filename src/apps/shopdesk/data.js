// Shopdesk sample store: Kiln & Co., a made-up ceramics shop.
// The first eight orders, the designed products and the first eight customers are
// exactly as in the Figma file; the rest is generated from a fixed seed, so every
// visitor sees the same data (186 orders, 42 products, 1,284 customers).
(function () {
  'use strict';

  function rng(seed) { // mulberry32
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rand = rng(20261024);
  function pick(list) { return list[Math.floor(rand() * list.length)]; }
  function int(a, b) { return a + Math.floor(rand() * (b - a + 1)); }

  // ---------- Products (prices in pence) ----------
  var P = function (name, cat, price, stock, reorder, sold) { return { name: name, cat: cat, price: price, stock: stock, reorder: reorder, sold: sold }; };
  var products = [
    P('Speckled mug', 'Mugs', 2250, 4, 20, 56),
    P('Ripple bowl', 'Bowls', 2800, 6, 10, 35),
    P('Stone plate set', 'Plates', 7200, 18, 10, 12),
    P('Tall vase', 'Vases', 4000, 22, 10, 16),
    P('Matte cup', 'Cups', 1800, 2, 10, 9),
    P('Bud vase', 'Vases', 2200, 3, 10, 7),
    P('Oat dinner plate', 'Plates', 1600, 5, 10, 14),
    P('Linen serving bowl', 'Bowls', 4500, 0, 5, 4),
    P('Glazed espresso cup', 'Cups', 2400, 7, 10, 6),
    P('Fluted jug', 'Vases', 3500, 14, 6, 5),
    P('Chalk tumbler', 'Cups', 2000, 26, 10, 8),
  ];
  var finishes = ['Sage', 'Ember', 'Moss', 'Slate', 'Dune', 'Pebble', 'Honey', 'Ink', 'Clay', 'Fern', 'Ash'];
  var kinds = [['mug', 'Mugs', 2000], ['pasta bowl', 'Bowls', 3000], ['side plate', 'Plates', 1400], ['jug', 'Vases', 3600], ['tumbler', 'Cups', 1600]];
  for (var f = 0; products.length < 42; f++) {
    var k = kinds[f % kinds.length], fin = finishes[Math.floor(f / kinds.length) % finishes.length];
    products.push(P(fin + ' ' + k[0], k[1], k[2] + int(0, 4) * 100, int(14, 40), 10, int(1, 9)));
  }

  // ---------- Customers ----------
  var C = function (name, email, orders, spent, last, city, address) { return { name: name, email: email, orders: orders, spent: spent, last: last, city: city, address: address }; };
  var designed = [
    C('Amara Okafor', 'amara@example.com', 6, 41250, 24, 'Leeds', '12 Park Row, Leeds LS1 5HD'),
    C('Ben Carter', 'ben@example.com', 3, 9600, 24, 'Bristol', '8 Gloucester Road, Bristol BS7 8AE'),
    C('Chloe Ng', 'chloe@example.com', 5, 26800, 23, 'London', '41 Holloway Road, London N7 8JP'),
    C('Daniel Price', 'daniel@example.com', 2, 17600, 23, 'Manchester', '3 Oldham Street, Manchester M1 1JN'),
    C('Emma Wilson', 'emma@example.com', 1, 3200, 22, 'Coventry', '27 Far Gosford Street, Coventry CV1 5DZ'),
    C('Farah Khan', 'farah@example.com', 4, 22100, 22, 'Birmingham', '16 Moseley Road, Birmingham B12 0HJ'),
    C('George Lee', 'george@example.com', 2, 11850, 21, 'Glasgow', '9 Byres Road, Glasgow G11 5RD'),
    C('Hana Sato', 'hana@example.com', 7, 50300, 21, 'Edinburgh', '22 Leith Walk, Edinburgh EH6 5AA'),
  ];
  var firsts = ['Isla', 'Jack', 'Kiara', 'Leo', 'Maya', 'Noah', 'Olivia', 'Priya', 'Quinn', 'Rosa', 'Sami', 'Theo', 'Uma', 'Victor', 'Willow', 'Yusuf', 'Zara', 'Aiden', 'Bea', 'Callum', 'Dina', 'Ezra', 'Freya', 'Gabe', 'Holly', 'Imran', 'Jade', 'Kofi', 'Lena', 'Milo'];
  var lasts = ['Adams', 'Bose', 'Campbell', 'Diaz', 'Evans', 'Fraser', 'Green', 'Hughes', 'Iqbal', 'Jones', 'Kerr', 'Lopez', 'Murphy', 'Nolan', 'Owen', 'Patel', 'Reid', 'Shah', 'Turner', 'Walsh', 'Young', 'Zhou'];
  var cities = [['Leeds', 'LS', 'Kirkgate'], ['Bristol', 'BS', 'Stokes Croft'], ['London', 'E', 'Mare Street'], ['Manchester', 'M', 'Deansgate'], ['Coventry', 'CV', 'Gosford Street'], ['Birmingham', 'B', 'Digbeth High Street'], ['Glasgow', 'G', 'Argyle Street'], ['Edinburgh', 'EH', 'Broughton Street'], ['York', 'YO', 'Gillygate'], ['Cardiff', 'CF', 'Cowbridge Road'], ['Nottingham', 'NG', 'Mansfield Road'], ['Brighton', 'BN', 'Gloucester Road']];
  var TOTAL_CUSTOMERS = 1284, NEW_THIS_MONTH = 96;
  var custCache = {};
  // Generated lazily from the index, so 1,284 customers cost nothing until shown
  function customer(i) {
    if (i < designed.length) return designed[i];
    if (custCache[i]) return custCache[i];
    var r = rng(9000 + i);
    var first = firsts[Math.floor(r() * firsts.length)], last = lasts[Math.floor(r() * lasts.length)];
    var city = cities[Math.floor(r() * cities.length)];
    var orders = 1 + Math.floor(r() * 5);
    var c = C(first + ' ' + last, (first + '.' + last).toLowerCase() + i + '@example.com', orders,
      orders * (1800 + Math.floor(r() * 60) * 100), 20 - Math.floor(r() * 20), city[0],
      (1 + Math.floor(r() * 120)) + ' ' + city[2] + ', ' + city[0] + ' ' + city[1] + (1 + Math.floor(r() * 20)) + ' ' + (1 + Math.floor(r() * 9)) + 'AB');
    custCache[i] = c;
    return c;
  }

  // ---------- Orders (newest first) ----------
  var O = function (id, cust, day, time, items, status) { return { id: id, cust: cust, day: day, time: time, items: items, status: status }; };
  var orders = [
    O(1048, 0, 24, '10:42', [[0, 2], [1, 1]], 'to-ship'),
    O(1047, 1, 24, '09:15', [[6, 1]], 'to-ship'),
    O(1046, 2, 23, '18:03', [[0, 1], [5, 1]], 'shipped'),
    O(1045, 3, 23, '12:27', [[3, 1], [1, 2], [5, 1]], 'delivered'),
    O(1044, 4, 22, '20:51', [[8, 1]], 'delivered'),
    O(1043, 5, 22, '14:09', [[9, 1], [4, 1]], 'cancelled'),
    O(1042, 6, 21, '16:38', [[0, 1], [5, 2]], 'delivered'),
    O(1041, 7, 21, '11:20', [[10, 1]], 'delivered'),
  ];
  var toShipLeft = 10; // 12 to ship in total, as in the design
  for (var id = 1040; id >= 863; id--) {
    var n = int(1, 3), items = [];
    for (var j = 0; j < n; j++) {
      var p = int(0, products.length - 1);
      if (products[p].stock === 0) p = 2;
      items.push([p, rand() < 0.8 ? 1 : 2]);
    }
    var day = 21 - Math.floor((1040 - id) / 45);
    var st;
    if (toShipLeft > 0) { st = 'to-ship'; toShipLeft--; }
    else { var x = rand(); st = x < 0.05 ? 'cancelled' : x < 0.27 ? 'shipped' : 'delivered'; }
    orders.push(O(id, int(8, TOTAL_CUSTOMERS - 1), day, ('0' + int(8, 21)).slice(-2) + ':' + ('0' + int(0, 59)).slice(-2), items, st));
  }

  window.SHOP_DATA = {
    store: 'Kiln & Co.',
    owner: { name: 'Ellie Hart', role: 'Store owner', initials: 'EH' },
    today: 24, // the prototype's "today": 24 Oct 2026
    products: products,
    orders: orders,
    customer: customer,
    totalCustomers: TOTAL_CUSTOMERS,
    newThisMonth: NEW_THIS_MONTH,
    // Dashboard summary for the last 7 days, as designed
    kpis: [
      { label: 'Revenue', value: '£8,420', icon: 'bag', trend: '+12.4%', up: true, note: 'vs last week' },
      { label: 'Orders', value: '186', icon: 'bag', trend: '+8.1%', up: true, note: 'vs last week' },
      { label: 'Average order', value: '£45.27', icon: 'box', trend: '−3.2%', up: false, note: 'vs last week' },
      { label: 'Low stock', value: null, icon: 'alert', trend: 'Needs restock', warn: true, note: 'products' },
    ],
    week: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], thisWeek: [982, 1117, 1050, 1342, 1207, 1462, 1260], lastWeek: [890, 1040, 980, 1150, 1100, 1290, 1040] },
    categories: [['Mugs', 312000, 37], ['Bowls', 246000, 29], ['Plates', 169000, 20], ['Vases', 115000, 14]],
    top: [[0, 56, 126000], [1, 35, 98000], [2, 12, 86400], [3, 16, 64000]],
  };
})();
