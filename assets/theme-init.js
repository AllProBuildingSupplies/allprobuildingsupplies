/* Apply saved theme before first paint to avoid a dark/light flash. */
(function apbsThemeInit() {
  var light = false;
  try { light = localStorage.getItem('apbs_theme') === 'light'; } catch (e) {}
  var root = document.documentElement;
  root.classList.toggle('theme-light', light);
  root.style.colorScheme = light ? 'light' : 'dark';
  var metas = document.querySelectorAll('meta[name="theme-color"]');
  for (var i = 0; i < metas.length; i++) {
    metas[i].setAttribute('content', light ? '#FFFFFF' : '#0C1117');
  }
})();
