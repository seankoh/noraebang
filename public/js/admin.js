(async () => {
  const { isAdmin } = await apiFetch('/admin/me');
  if (!isAdmin) { location.href = '/login.html'; return; }

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await apiFetch('/admin/logout', { method: 'POST' });
    location.href = '/';
  });

  let tracks = [];

  async function loadAll() {
    const { tracks: t, total } = await apiFetch('/tracks?limit=500');
    tracks = t;

    // Stats
    document.getElementById('stat-tracks').textContent = total.toLocaleString();
    document.getElementById('stat-views').textContent = tracks.reduce((s, t) => s + t.views, 0).toLocaleString();
    document.getElementById('stat-likes').textContent = tracks.reduce((s, t) => s + (t.like_count || 0), 0).toLocaleString();

    // Comment count (separate query per track is expensive; show "—" for MVP)
    document.getElementById('stat-comments').textContent = '—';

    renderTable();
  }

  function renderTable() {
    const tbody = document.getElementById('track-table-body');
    const noTracks = document.getElementById('no-tracks');

    if (tracks.length === 0) {
      tbody.innerHTML = '';
      noTracks.classList.remove('hidden');
      return;
    }
    noTracks.classList.add('hidden');

    tbody.innerHTML = tracks.map(t => `
      <tr class="border-b border-gray-800 hover:bg-gray-800/50 transition" data-id="${t.id}">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-8 rounded bg-gray-800 overflow-hidden shrink-0">
              ${t.thumbnail_path
                ? `<img src="/uploads/thumbnails/${t.thumbnail_path}" class="w-full h-full object-cover" alt="">`
                : '<div class="w-full h-full flex items-center justify-center text-gray-600 text-xs">🎤</div>'}
            </div>
            <div class="min-w-0">
              <a href="/track.html?id=${t.id}" class="font-medium text-white hover:text-amber-400 truncate block">${escapeHtml(t.title)}</a>
              <p class="text-gray-500 text-xs truncate">${escapeHtml(t.artist)}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 text-gray-400 hidden md:table-cell">${t.genre || '—'}</td>
        <td class="px-4 py-3 text-gray-400 hidden md:table-cell">${t.language || '—'}</td>
        <td class="px-4 py-3 text-right text-gray-400">${t.views.toLocaleString()}</td>
        <td class="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">${(t.like_count || 0).toLocaleString()}</td>
        <td class="px-4 py-3 text-right">
          <div class="flex gap-2 justify-end">
            <button class="edit-btn text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-gray-700" data-id="${t.id}">Edit</button>
            <button class="delete-btn text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-gray-700" data-id="${t.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEdit(parseInt(btn.dataset.id)));
    });
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteTrack(parseInt(btn.dataset.id)));
    });
  }

  async function deleteTrack(id) {
    const track = tracks.find(t => t.id === id);
    if (!confirm(`Delete "${track?.title}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/tracks/${id}`, { method: 'DELETE' });
      tracks = tracks.filter(t => t.id !== id);
      renderTable();
      updateStats();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  function updateStats() {
    document.getElementById('stat-tracks').textContent = tracks.length.toLocaleString();
    document.getElementById('stat-views').textContent = tracks.reduce((s, t) => s + t.views, 0).toLocaleString();
    document.getElementById('stat-likes').textContent = tracks.reduce((s, t) => s + (t.like_count || 0), 0).toLocaleString();
  }

  // Edit modal
  const modal = document.getElementById('edit-modal');

  function openEdit(id) {
    const t = tracks.find(t => t.id === id);
    if (!t) return;
    document.getElementById('edit-id').value = t.id;
    document.getElementById('edit-title').value = t.title;
    document.getElementById('edit-artist').value = t.artist;
    document.getElementById('edit-genre').value = t.genre || '';
    document.getElementById('edit-language').value = t.language || '';
    document.getElementById('edit-error').classList.add('hidden');
    modal.classList.remove('hidden');
  }

  document.getElementById('edit-cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

  document.getElementById('edit-save-btn').addEventListener('click', async () => {
    const id = parseInt(document.getElementById('edit-id').value);
    const title = document.getElementById('edit-title').value.trim();
    const artist = document.getElementById('edit-artist').value.trim();
    const genre = document.getElementById('edit-genre').value;
    const language = document.getElementById('edit-language').value;
    const errEl = document.getElementById('edit-error');

    if (!title || !artist) { errEl.textContent = 'Title and artist required'; errEl.classList.remove('hidden'); return; }

    try {
      const updated = await apiFetch(`/tracks/${id}`, {
        method: 'PATCH',
        body: { title, artist, genre: genre || null, language: language || null }
      });
      const idx = tracks.findIndex(t => t.id === id);
      if (idx >= 0) tracks[idx] = { ...tracks[idx], ...updated };
      renderTable();
      modal.classList.add('hidden');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  await loadAll();
})();
