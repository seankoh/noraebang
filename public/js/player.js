(async () => {
  const trackId = new URLSearchParams(location.search).get('id');
  if (!trackId) { location.href = '/'; return; }

  const video = document.getElementById('video-player');
  const likeBtn = document.getElementById('like-btn');
  const likeIcon = document.getElementById('like-icon');
  const likeCount = document.getElementById('like-count');
  const theaterBtn = document.getElementById('theater-btn');
  const lyricsToggleBtn = document.getElementById('lyrics-toggle-btn');
  const mobileLyrics = document.getElementById('mobile-lyrics');
  const lyricsPanel = document.getElementById('lyrics-panel');
  const noLyrics = document.getElementById('no-lyrics');
  const commentList = document.getElementById('comment-list');
  const noComments = document.getElementById('no-comments');
  const commentForm = document.getElementById('comment-form');
  const commentError = document.getElementById('comment-error');
  const loadMoreBtn = document.getElementById('load-more-comments');

  let lrcLines = [];
  let activeLine = -1;
  let commentPage = 1;
  let commentTotal = 0;

  // ── Load track ──────────────────────────────────────────────────────────────
  try {
    const track = await apiFetch(`/tracks/${trackId}`);

    document.title = `${track.title} — 노래방`;
    document.getElementById('track-title').textContent = track.title;
    document.getElementById('track-artist').textContent = track.artist;
    document.getElementById('track-views').textContent = `${track.views.toLocaleString()} views`;

    if (track.genre) {
      const el = document.getElementById('track-genre');
      el.textContent = track.genre;
      el.classList.remove('hidden');
    }
    if (track.language) {
      const el = document.getElementById('track-language');
      el.textContent = track.language;
      el.classList.remove('hidden');
    }

    video.src = `/uploads/videos/${track.video_path}`;

    // Load LRC
    if (track.lrc_path) {
      try {
        const res = await fetch(`/uploads/lrc/${track.lrc_path}`);
        const text = await res.text();
        lrcLines = parseLRC(text);
        if (lrcLines.length > 0) {
          noLyrics.remove();
          renderLrcPanel();
        }
      } catch { /* No lyrics */ }
    }
  } catch {
    document.getElementById('track-title').textContent = 'Track not found';
    return;
  }

  // ── Admin check ──────────────────────────────────────────────────────────────
  const { isAdmin } = await apiFetch('/admin/me');
  if (isAdmin) document.getElementById('admin-links').classList.replace('hidden', 'flex');

  // ── Like state ───────────────────────────────────────────────────────────────
  const likeState = await apiFetch(`/tracks/${trackId}/like`);
  updateLikeUI(likeState.liked, likeState.count);

  likeBtn.addEventListener('click', async () => {
    try {
      const res = await apiFetch(`/tracks/${trackId}/like`, { method: 'POST' });
      updateLikeUI(res.liked, res.count);
    } catch {}
  });

  function updateLikeUI(liked, count) {
    likeIcon.textContent = liked ? '❤️' : '🤍';
    likeCount.textContent = count.toLocaleString();
    likeBtn.classList.toggle('text-red-400', liked);
  }

  // ── Theater mode ──────────────────────────────────────────────────────────────
  theaterBtn.addEventListener('click', () => {
    document.body.classList.toggle('theater');
    theaterBtn.textContent = document.body.classList.contains('theater') ? '⛶ Exit Theater' : '⛶ Theater';
  });

  // ── Mobile lyrics toggle ──────────────────────────────────────────────────────
  lyricsToggleBtn.addEventListener('click', () => {
    mobileLyrics.classList.toggle('hidden');
  });

  // ── LRC Panel render ──────────────────────────────────────────────────────────
  function renderLrcPanel() {
    lyricsPanel.innerHTML = lrcLines.map((l, i) =>
      `<div class="lrc-line" data-idx="${i}">${escapeHtml(l.text)}</div>`
    ).join('');

    // Click to seek
    lyricsPanel.querySelectorAll('.lrc-line').forEach((el, i) => {
      el.addEventListener('click', () => { video.currentTime = lrcLines[i].time; video.play(); });
    });
  }

  // ── LRC Sync Engine ───────────────────────────────────────────────────────────
  function syncLyrics(currentTime) {
    if (lrcLines.length === 0) return;

    // Binary search for last line with time <= currentTime
    let lo = 0, hi = lrcLines.length - 1, idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lrcLines[mid].time <= currentTime) { idx = mid; lo = mid + 1; }
      else hi = mid - 1;
    }

    if (idx === activeLine) return;
    activeLine = idx;

    // Desktop panel
    lyricsPanel.querySelectorAll('.lrc-line').forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });
    if (idx >= 0) {
      const active = lyricsPanel.querySelector(`.lrc-line[data-idx="${idx}"]`);
      active?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    // Mobile 3-line window
    document.getElementById('mobile-lrc-prev').textContent = idx > 0 ? lrcLines[idx - 1].text : '';
    document.getElementById('mobile-lrc-active').textContent = idx >= 0 ? lrcLines[idx].text : '';
    document.getElementById('mobile-lrc-next').textContent = idx < lrcLines.length - 1 ? lrcLines[idx + 1].text : '';
  }

  video.addEventListener('timeupdate', () => syncLyrics(video.currentTime));

  // ── Comments ──────────────────────────────────────────────────────────────────
  async function loadComments(reset = false) {
    if (reset) { commentPage = 1; commentList.innerHTML = ''; }

    const { comments, total } = await apiFetch(`/tracks/${trackId}/comments?page=${commentPage}&limit=20`);
    commentTotal = total;

    if (total === 0) {
      noComments.classList.remove('hidden');
    } else {
      noComments.classList.add('hidden');
      commentList.insertAdjacentHTML('beforeend', comments.map(commentCard).join(''));
    }

    loadMoreBtn.classList.toggle('hidden', commentList.children.length >= total);
  }

  function commentCard(c) {
    return `
      <div class="flex gap-3 items-start">
        <div class="w-8 h-8 rounded-full bg-amber-500 text-black font-bold text-sm flex items-center justify-center shrink-0">
          ${escapeHtml(c.name[0].toUpperCase())}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-semibold text-white">${escapeHtml(c.name)}</span>
            <span class="text-xs text-gray-500">${timeAgo(c.created_at)}</span>
          </div>
          <p class="text-sm text-gray-300 mt-0.5 break-words">${escapeHtml(c.content)}</p>
        </div>
      </div>`;
  }

  loadMoreBtn.addEventListener('click', () => { commentPage++; loadComments(); });

  commentForm.addEventListener('submit', async e => {
    e.preventDefault();
    commentError.classList.add('hidden');
    const name = document.getElementById('comment-name').value.trim();
    const content = document.getElementById('comment-content').value.trim();
    if (!name || !content) {
      commentError.textContent = 'Name and comment are required';
      commentError.classList.remove('hidden');
      return;
    }
    try {
      const comment = await apiFetch(`/tracks/${trackId}/comments`, {
        method: 'POST',
        body: { name, content }
      });
      noComments.classList.add('hidden');
      commentList.insertAdjacentHTML('afterbegin', commentCard(comment));
      commentForm.reset();
    } catch (err) {
      commentError.textContent = err.message;
      commentError.classList.remove('hidden');
    }
  });

  await loadComments(true);
})();
