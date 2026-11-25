(() => {
  const key = 'corridor.theme';
  const initial = new URL(location.href).searchParams.get('theme');
  let saved;
  try { saved = localStorage.getItem(key); } catch {}
  const page = document.documentElement;
  const apply = day => {
    page.dataset.corridorTheme = day ? 'day' : 'night';
    document.querySelector('.hero')?.classList.toggle('daylit', day);
  };
  apply(initial === 'day' || (initial !== 'night' && saved === 'day'));
  document.addEventListener('DOMContentLoaded', () => apply(page.dataset.corridorTheme === 'day'), {once:true});
  window.setCorridorDaylight = day => {
    apply(day);
    try { localStorage.setItem(key, day ? 'day' : 'night'); } catch {}
    const url = new URL(location.href);
    url.searchParams.set('theme', day ? 'day' : 'night');
    try { history.replaceState(history.state, '', url); } catch {}
  };
  function carryTheme(event) {
    const link = event.target.closest('a[href]');
    if (!link || link.getAttribute('href').startsWith('#')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.protocol !== location.protocol ||
        !url.pathname.endsWith('.html')) return;
    url.searchParams.set('theme', page.dataset.corridorTheme);
    link.href = url.href;
  }
  for (const event of ['focusin','pointerdown','click','auxclick']) {
    document.addEventListener(event, carryTheme, true);
  }
})();
