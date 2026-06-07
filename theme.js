/* ═══════════════════════════════════════════════
   CoachSync — Favicon manager
   Manages trainer-specific favicons
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  applyTrainerFavicon();
});

function getDefaultFaviconHref() {
  const existing = document.querySelector('link[rel~="icon"]');
  return existing?.getAttribute('data-default-href') || 'CoachSyncLogo.png';
}

let coachSyncManifestUrl = null;

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

function setCoachSyncFavicon(src) {
  const iconSrc = src || getDefaultFaviconHref();
  const iconType = inferFaviconType(iconSrc);
  const link = ensureHeadLink('icon', 'link[rel~="icon"]');
  if (!link.getAttribute('data-default-href')) {
    link.setAttribute('data-default-href', link.getAttribute('href') || 'CoachSyncLogo.png');
  }

  link.type = iconType;
  link.href = iconSrc;
  setCoachSyncTouchIcon(iconSrc);
  setCoachSyncManifest(iconSrc, iconType);
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
