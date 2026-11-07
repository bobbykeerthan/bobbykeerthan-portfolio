// Phones: a short note that the magazines are designed for bigger screens, once per tab.
// "Continue on phone" closes it for as long as that tab stays open (sessionStorage), including
// reloads and moving between pages; opening the site in a new tab shows it once again.
(function () {
  'use strict';
  var KEY = 'bk-phone-notice';
  if (!window.matchMedia('(max-width: 767px), (max-height: 500px) and (pointer: coarse)').matches) return;
  try {
    if (sessionStorage.getItem(KEY)) return;
  } catch (e) {
    return; // storage blocked: don't show a note we couldn't stop repeating
  }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;
    return n;
  }

  var root = document.documentElement;
  var box = el('div', { class: 'phone-notice', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pn-title', 'aria-describedby': 'pn-text' });
  var card = el('div', { class: 'phone-notice__card' });
  var btn = el('button', { class: 'phone-notice__btn', type: 'button' }, 'Continue on phone');
  card.appendChild(el('p', { class: 'phone-notice__kicker' }, 'Bobby Keerthan · Portfolio 2026'));
  card.appendChild(el('h2', { class: 'phone-notice__title', id: 'pn-title' }, 'Best on a bigger screen'));
  card.appendChild(el('p', { class: 'phone-notice__text', id: 'pn-text' },
    'These magazines are designed as two-page spreads for a laptop or desktop. On your phone the same pages are rearranged, so you can still read everything.'));
  card.appendChild(btn);
  box.appendChild(card);

  function close() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
    root.classList.remove('has-notice');
    box.remove();
    document.removeEventListener('keydown', onKey, true);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); btn.focus(); } // the only control: keep focus here
  }
  btn.addEventListener('click', close);

  function show() {
    document.body.appendChild(box);
    root.classList.add('has-notice');
    document.addEventListener('keydown', onKey, true);
    btn.focus();
  }
  if (document.body) show();
  else document.addEventListener('DOMContentLoaded', show);
})();
