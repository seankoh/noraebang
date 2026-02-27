(async () => {
  const { isAdmin } = await apiFetch('/admin/me');
  if (!isAdmin) { location.href = '/login.html'; return; }

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await apiFetch('/admin/logout', { method: 'POST' });
    location.href = '/';
  });

  // Drop zone helper
  function initDropZone(zoneId, inputId, filenameId, accept) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const filename = document.getElementById(filenameId);

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) setFile(input, zone, filename, file);
    });
    input.addEventListener('change', () => {
      if (input.files[0]) setFile(input, zone, filename, input.files[0]);
    });
  }

  function setFile(input, zone, filenameEl, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    filenameEl.textContent = `✓ ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    filenameEl.classList.remove('hidden');
    zone.classList.add('has-file');
  }

  initDropZone('video-drop', 'video-input', 'video-filename');
  initDropZone('lrc-drop', 'lrc-input', 'lrc-filename');

  const form = document.getElementById('upload-form');
  const progressWrap = document.getElementById('progress-wrap');
  const progressBar = document.getElementById('progress-bar');
  const progressPct = document.getElementById('progress-pct');
  const uploadError = document.getElementById('upload-error');
  const successMsg = document.getElementById('success-msg');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', e => {
    e.preventDefault();
    uploadError.classList.add('hidden');

    const videoFile = document.getElementById('video-input').files[0];
    const title = form.querySelector('[name=title]').value.trim();
    const artist = form.querySelector('[name=artist]').value.trim();

    if (!videoFile) { showError('Please select a video file'); return; }
    if (!title) { showError('Title is required'); return; }
    if (!artist) { showError('Artist is required'); return; }

    const formData = new FormData(form);
    if (!document.getElementById('lrc-input').files[0]) formData.delete('lrc');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    progressWrap.classList.remove('hidden');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/tracks');

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = pct + '%';
        progressPct.textContent = pct + '%';
      }
    };

    xhr.onload = () => {
      progressWrap.classList.add('hidden');
      if (xhr.status === 201) {
        const track = JSON.parse(xhr.responseText);
        document.getElementById('view-track-link').href = `/track.html?id=${track.id}`;
        form.querySelector('[type=submit]').classList.add('hidden');
        successMsg.classList.remove('hidden');
      } else {
        const err = JSON.parse(xhr.responseText);
        showError(err.error || 'Upload failed');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Track';
      }
    };

    xhr.onerror = () => {
      progressWrap.classList.add('hidden');
      showError('Upload failed — network error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload Track';
    };

    xhr.send(formData);
  });

  document.getElementById('upload-another').addEventListener('click', () => {
    form.reset();
    successMsg.classList.add('hidden');
    submitBtn.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload Track';
    ['video-drop', 'lrc-drop'].forEach(id => document.getElementById(id).classList.remove('has-file'));
    ['video-filename', 'lrc-filename'].forEach(id => document.getElementById(id).classList.add('hidden'));
  });

  function showError(msg) {
    uploadError.textContent = msg;
    uploadError.classList.remove('hidden');
  }
})();
