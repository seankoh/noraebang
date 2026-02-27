(async () => {
  const q = new URLSearchParams(location.search).get('q') || '';
  const input = document.getElementById('search-input');
  const resultInfo = document.getElementById('result-info');
  const resultGrid = document.getElementById('result-grid');
  const emptyState = document.getElementById('empty-state');

  input.value = q;
  document.title = q ? `"${q}" — 노래방` : 'Search — 노래방';

  const { isAdmin } = await apiFetch('/admin/me');
  if (isAdmin) document.getElementById('admin-links').classList.replace('hidden', 'flex');

  document.getElementById('search-form').addEventListener('submit', e => {
    e.preventDefault();
    const newQ = input.value.trim();
    if (!newQ) return;
    history.pushState({}, '', `/search.html?q=${encodeURIComponent(newQ)}`);
    doSearch(newQ);
  });

  function trackCard(t) {
    const thumb = t.thumbnail_path
      ? `/uploads/thumbnails/${t.thumbnail_path}`
      : `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><rect fill='%231f2937' width='640' height='360'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='80' fill='%234b5563'>🎤</text></svg>`;
    return `
      <a href="/track.html?id=${t.id}" class="block bg-gray-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-amber-400 transition-all">
        <div class="aspect-video bg-gray-800 overflow-hidden">
          <img src="${thumb}" class="w-full h-full object-cover" loading="lazy" alt="${escapeHtml(t.title)}">
        </div>
        <div class="p-3">
          <p class="font-semibold text-white truncate">${escapeHtml(t.title)}</p>
          <p class="text-sm text-gray-400 truncate">${escapeHtml(t.artist)}</p>
          <div class="flex gap-3 text-xs text-gray-500 mt-1">
            <span>${t.views.toLocaleString()} views</span>
            <span>${timeAgo(t.created_at)}</span>
          </div>
        </div>
      </a>`;
  }

  async function doSearch(query) {
    if (!query) return;
    resultGrid.innerHTML = '';
    resultInfo.textContent = 'Searching...';
    emptyState.classList.add('hidden');

    try {
      const { results, total } = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
      resultInfo.textContent = total === 0 ? '' : `${total} result${total !== 1 ? 's' : ''} for "${query}"`;

      if (results.length === 0) {
        emptyState.classList.remove('hidden');
      } else {
        resultGrid.innerHTML = results.map(trackCard).join('');
      }
    } catch {
      resultInfo.textContent = 'Search failed. Please try again.';
    }
  }

  if (q) doSearch(q);
})();
