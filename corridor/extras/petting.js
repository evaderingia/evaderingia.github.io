(() => {
  const names = ['可乐', '大宝宝', '布丁'];
  const key = 'corridor.dog-pets.v1';
  let counts = [0, 0, 0];
  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(saved)) counts = names.map((_, i) =>
        Number.isSafeInteger(saved[i]) && saved[i] >= 0 ? saved[i] : 0);
    } catch {}
  };
  const render = root => {
    root.querySelectorAll('[data-pet-count]').forEach((el, i) => {
      el.textContent = counts[i];
    });
  };
  window.openDogCorner = root => { read(); render(root); };
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-pet-dog]');
    if (!button) return;
    const root = button.closest('.dog-corner');
    const i = Number(button.dataset.petDog);
    read();
    counts[i]++;
    try { localStorage.setItem(key, JSON.stringify(counts)); } catch {}
    render(root);
    root.querySelector('[role="status"]').textContent = names[i] + '被摸了 ' + counts[i] + ' 次';
    const photo = root.querySelector('.dog-photo');
    const box = photo.getBoundingClientRect();
    const zone = button.getBoundingClientRect();
    const x = event.detail ? event.clientX : zone.left + zone.width / 2;
    const y = event.detail ? event.clientY : zone.top + zone.height / 2;
    const burst = document.createElement('span');
    burst.className = 'dog-burst';
    burst.setAttribute('aria-hidden', 'true');
    burst.style.left = (x - box.left) + 'px';
    burst.style.top = (y - box.top) + 'px';
    burst.innerHTML = '<b>♥</b><i>✦</i><em>✧</em>';
    photo.append(burst);
    setTimeout(() => burst.remove(), 820);
  });
})();
