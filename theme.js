/* ═══════════════════════════════════════════════
   CoachSync — Theme (light / dark) manager
   Reads from localStorage, applies before first paint,
   injects toggle button into .nav-right automatically.
   ═══════════════════════════════════════════════ */

(function () {
  // Apply theme immediately to avoid flash
  const saved = localStorage.getItem('cs-theme') || 'dark';
  if (saved === 'light') document.documentElement.classList.add('light-mode-pre');
})();

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('cs-theme') || 'dark';
  applyTheme(saved, false);
  injectToggleButton();
});

function applyTheme(theme, animate = true) {
  if (!animate) {
    document.body.style.transition = 'none';
  }
  if (theme === 'light') {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
  }
  localStorage.setItem('cs-theme', theme);
  updateToggleButton(theme);

  // Re-enable transitions after applying
  if (!animate) {
    requestAnimationFrame(() => {
      document.body.style.transition = '';
    });
  }
}

function toggleTheme() {
  const current = localStorage.getItem('cs-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark', true);
}

function updateToggleButton(theme) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  if (theme === 'light') {
    btn.innerHTML = '<i class="fa-solid fa-moon theme-icon"></i> Dark';
    btn.title = 'Switch to dark mode';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-sun theme-icon"></i> Light';
    btn.title = 'Switch to light mode';
  }
}

function injectToggleButton() {
  // Don't inject if already in HTML
  if (document.getElementById('themeToggle')) return;

  const btn = document.createElement('button');
  btn.id        = 'themeToggle';
  btn.className = 'btn-theme';
  btn.onclick   = toggleTheme;

  const theme = localStorage.getItem('cs-theme') || 'dark';
  updateToggleButton(theme);

  // Try common nav containers in order of preference
  const target =
    document.querySelector('.nav-right') ||
    document.querySelector('.top-nav')   ||
    document.querySelector('nav');

  if (target) {
    // Insert before the logout button if possible
    const logout = target.querySelector('.btn-logout');
    if (logout) {
      target.insertBefore(btn, logout);
    } else {
      target.appendChild(btn);
    }
  }
}
