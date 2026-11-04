// Runs in <head> so the right layout is chosen before the first paint.
// flow  = phones/tablets: swipe one page at a time, text reflows
// flip  = desktop: page-flip
// fade  = desktop with reduced motion: simple cross-fade instead of the flip
// is-reading = desktop visitor switched to Reading view (flow layout on a big screen)
(function () {
  var root = document.documentElement;
  var small = window.matchMedia('(max-width: 1023px), (max-height: 559px)').matches;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Reading view (desktop): the visitor chose the reflowed, readable layout with the corner button
  var reading = false;
  if (!small) {
    try { reading = localStorage.getItem('bk-view') === 'reading'; } catch (e) { /* storage blocked */ }
  }
  var flow = small || reading;
  root.classList.remove('no-js');
  root.classList.add(flow ? 'is-flow' : 'is-canvas', flow ? 'mode-flow' : still ? 'mode-fade' : 'mode-flip');
  if (reading) root.classList.add('is-reading');
  // fonts: apply the preloaded Google Fonts stylesheet without blocking the first paint
  var pre = document.getElementById('font-css');
  if (pre) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = pre.href;
    document.head.appendChild(css);
  }
})();
