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
  applyTrainerFavicon();
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
    btn.setAttribute('aria-label', 'Switch to dark mode');
    btn.title = 'Switch to dark mode';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-sun theme-icon"></i> Light';
    btn.setAttribute('aria-label', 'Switch to light mode');
    btn.title = 'Switch to light mode';
  }
}

function injectToggleButton() {
  // Don't inject if already in HTML
  if (document.getElementById('themeToggle')) return;

  const btn = document.createElement('button');
  btn.id        = 'themeToggle';
  btn.type      = 'button';
  btn.className = 'btn-theme';
  btn.onclick   = toggleTheme;

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

    const theme = localStorage.getItem('cs-theme') || 'dark';
    updateToggleButton(theme);
  } else {
    btn.innerHTML = '<i class="fa-solid fa-sun theme-icon"></i> Light';
  }
}

function getDefaultFaviconHref() {
  const existing = document.querySelector('link[rel~="icon"]');
  return existing?.getAttribute('data-default-href') || 'CoachSyncLogo.png';
}

function inferFaviconType(src) {
  const value = String(src || '');
  if (value.startsWith('data:image/svg')) return 'image/svg+xml';
  if (value.startsWith('data:image/jpeg')) return 'image/jpeg';
  if (value.startsWith('data:image/webp')) return 'image/webp';
  return 'image/png';
}

function setCoachSyncFavicon(src) {
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  if (!link.getAttribute('data-default-href')) {
    link.setAttribute('data-default-href', link.getAttribute('href') || 'CoachSyncLogo.png');
  }

  link.type = inferFaviconType(src);
  link.href = src || getDefaultFaviconHref();
}

function resetCoachSyncFavicon() {
  setCoachSyncFavicon(getDefaultFaviconHref());
}

async function applyTrainerFavicon() {
  try {
    if (!window.firebase || !firebase.apps || firebase.apps.length === 0 || !firebase.auth || !firebase.firestore) return;

    firebase.auth().onAuthStateChanged(async user => {
      try {
        if (!user) {
          resetCoachSyncFavicon();
          return;
        }

        const db = firebase.firestore();
        const userSnap = await db.collection('users').doc(user.uid).get();
        if (!userSnap.exists) {
          resetCoachSyncFavicon();
          return;
        }

        const userData = userSnap.data();
        const trainerId = userData.role === 'trainer' ? user.uid : userData.trainerId;
        if (!trainerId) {
          resetCoachSyncFavicon();
          return;
        }

        const trainerData = trainerId === user.uid
          ? userData
          : (await db.collection('users').doc(trainerId).get()).data();

        if (trainerData?.logoUrl) {
          setCoachSyncFavicon(trainerData.logoUrl);
        } else {
          resetCoachSyncFavicon();
        }
      } catch (e) {
        resetCoachSyncFavicon();
      }
    });
  } catch (e) {
    resetCoachSyncFavicon();
  }
}

window.setCoachSyncFavicon = setCoachSyncFavicon;
window.resetCoachSyncFavicon = resetCoachSyncFavicon;
