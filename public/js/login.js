(async () => {
  // If already admin, redirect
  const { isAdmin } = await apiFetch('/admin/me');
  if (isAdmin) { location.href = '/admin.html'; return; }

  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-msg');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    errorMsg.classList.add('hidden');
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    try {
      await apiFetch('/admin/login', { method: 'POST', body: { username, password } });
      location.href = '/admin.html';
    } catch (err) {
      errorMsg.textContent = err.message || 'Invalid credentials';
      errorMsg.classList.remove('hidden');
      btn.textContent = 'Sign in';
      btn.disabled = false;
    }
  });
})();
