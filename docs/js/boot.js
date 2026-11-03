// Runs in <head> so the right layout is chosen before the first paint.
// flow  = phones/tablets: swipe one page at a time, text reflows
// flip  = desktop: page-flip
// fade  = desktop with reduced motion: simple cross-fade instead of the flip
(function () {
  var root = document.documentElement;
  var flow = window.matchMedia('(max-width: 1023px), (max-height: 559px)').matches;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.remove('no-js');
  root.classList.add(flow ? 'is-flow' : 'is-canvas', flow ? 'mode-flow' : still ? 'mode-fade' : 'mode-flip');
  // fonts: apply the preloaded Google Fonts stylesheet without blocking the first paint
  var pre = document.getElementById('font-css');
  if (pre) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = pre.href;
    document.head.appendChild(css);
  }
})();
