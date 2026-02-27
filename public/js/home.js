const state = { page: 1, loading: false, done: false, genre: '', language: '', sort: 'newest' };

function trackCard(t) {
  const thumb = t.thumbnail_path
    ? `/uploads/thumbnails/${t.thumbnail_path}`
    : `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><rect fill='%231f2937' width='640' height='360'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='80' fill='%234b5563'>🎤</text></svg>`;
  return `
    <a href="/track.html?id=${t.id}" class="track-card block bg-gray-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-amber-400 transition-all">
      <div class="aspect-video bg-gray-800 overflow-hidden">
        <img src="${thumb}" class="track-thumb w-full h-full object-cover" loading="lazy" alt="${escapeHtml(t.title)}">
      </div>
      <div class="p-3">
        <p class="font-semibold text-white truncate">${escapeHtml(t.title)}</p>
        <p class="text-sm text-gray-400 truncate">${escapeHtml(t.artist)}</p>
        <div class="flex gap-3 text-xs text-gray-500 mt-1">
          <span>${t.views.toLocaleString()} views</span>
          <span>❤ ${(t.like_count || 0).toLocaleString()}</span>
          <span>${timeAgo(t.created_at)}</span>
        </div>
        ${t.genre ? `<span class="mt-1 inline-block text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">${escapeHtml(t.genre)}</span>` : ''}
      </div>
    </a>`;
}

function skeletonCards(n) {
  return Array.from({ length: n }, () => `
    <div class="bg-gray-900 rounded-xl overflow-hidden">
      <div class="aspect-video skeleton"></div>
      <div class="p-3 space-y-2">
        <div class="skeleton h-4 rounded w-3/4"></div>
        <div class="skeleton h-3 rounded w-1/2"></div>
      </div>
    </div>`).join('');
}

async function loadTracks(reset = false) {
  if (state.loading || state.done) return;
  state.loading = true;

  const grid = document.getElementById('track-grid');
  if (reset) {
    grid.innerHTML = skeletonCards(8);
    state.page = 1;
    state.done = false;
  }

  try {
    const params = new URLSearchParams({ page: state.page, limit: 20, sort: state.sort });
    if (state.genre) params.set('genre', state.genre);
    if (state.language) params.set('language', state.language);

    const { tracks, total } = await apiFetch(`/tracks?${params}`);

    if (reset) grid.innerHTML = '';

    if (tracks.length === 0 && state.page === 1) {
      document.getElementById('empty-state').classList.remove('hidden');
    } else {
      document.getElementById('empty-state').classList.add('hidden');
      grid.insertAdjacentHTML('beforeend', tracks.map(trackCard).join(''));
      if (grid.children.length >= total) state.done = true;
      else state.page++;
    }
  } catch (e) {
    if (reset) grid.innerHTML = `<p class="col-span-full text-center text-red-400 py-10">Failed to load tracks</p>`;
  }

  state.loading = false;
}

// Filter pills
document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    const { filter, value } = btn.dataset;
    document.querySelectorAll(`[data-filter="${filter}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state[filter] = value;
    state.done = false;
    loadTracks(true);
  });
});

// Infinite scroll
const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) loadTracks();
}, { rootMargin: '200px' });
observer.observe(document.getElementById('sentinel'));

// Init
(async () => {
  const { isAdmin } = await apiFetch('/admin/me');
  if (isAdmin) document.getElementById('admin-links').classList.replace('hidden', 'flex');
  loadTracks(true);
})();
