// The email address never appears whole in the HTML, so simple scrapers miss it.
// <a class="js-email" data-u="name" data-d="example.com">name [at] example [dot] com</a>
(function () {
  'use strict';
  var links = document.querySelectorAll('a.js-email');
  Array.prototype.forEach.call(links, function (a) {
    var address = a.getAttribute('data-u') + '@' + a.getAttribute('data-d');
    a.href = 'mailto:' + address;
    a.textContent = address;
  });
})();
