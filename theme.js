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

let coachSyncManifestUrl = null;
let coachSyncIconUpdateId = 0;

function inferFaviconType(src) {
  const value = String(src || '');
  if (value.startsWith('data:image/svg')) return 'image/svg+xml';
  if (value.startsWith('data:image/jpeg')) return 'image/jpeg';
  if (value.startsWith('data:image/webp')) return 'image/webp';
  return 'image/png';
}

function ensureHeadLink(rel, selector = `link[rel="${rel}"]`) {
  let link = document.querySelector(selector);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  return link;
}

function replaceHeadLink(rel, href, type, attrs = {}) {
  document.querySelectorAll(`link[rel="${rel}"]`).forEach(el => el.remove());
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (type) link.type = type;
  Object.entries(attrs).forEach(([key, value]) => link.setAttribute(key, value));
  document.head.appendChild(link);
  return link;
}

function makeSquarePngIcon(src, size = 192) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);

        const scale = Math.min((size * 0.84) / img.width, (size * 0.84) / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const x = Math.round((size - w) / 2);
        const y = Math.round((size - h) / 2);
        ctx.drawImage(img, x, y, w, h);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

async function setCoachSyncFavicon(src) {
  const updateId = ++coachSyncIconUpdateId;
  const iconSrc = src || getDefaultFaviconHref();
  const defaultHref = getDefaultFaviconHref();
  const squareIconSrc = await makeSquarePngIcon(iconSrc, 192);
  if (updateId !== coachSyncIconUpdateId) return;

  document.querySelectorAll('link[rel~="icon"]').forEach(el => el.remove());
  replaceHeadLink('icon', squareIconSrc, 'image/png', { sizes: '32x32', 'data-default-href': defaultHref });
  replaceHeadLink('shortcut icon', squareIconSrc, 'image/png', { 'data-default-href': defaultHref });
  setCoachSyncTouchIcon(squareIconSrc);
  setCoachSyncManifest(squareIconSrc, 'image/png');
}

function setCoachSyncTouchIcon(src) {
  const touchIcon = ensureHeadLink('apple-touch-icon');
  if (!touchIcon.getAttribute('data-default-href')) {
    touchIcon.setAttribute('data-default-href', touchIcon.getAttribute('href') || 'CoachSyncLogo.png');
  }
  touchIcon.href = src || touchIcon.getAttribute('data-default-href') || 'CoachSyncLogo.png';
}

function setCoachSyncManifest(iconSrc, iconType) {
  const manifest = {
    name: 'CoachSync',
    short_name: 'CoachSync',
    start_url: './index.html',
    scope: './',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      { src: iconSrc, sizes: '192x192', type: iconType, purpose: 'any' },
      { src: iconSrc, sizes: '512x512', type: iconType, purpose: 'any' },
      { src: iconSrc, sizes: '512x512', type: iconType, purpose: 'maskable' }
    ]
  };

  if (coachSyncManifestUrl) URL.revokeObjectURL(coachSyncManifestUrl);
  coachSyncManifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));

  const link = ensureHeadLink('manifest');
  link.href = coachSyncManifestUrl;
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
