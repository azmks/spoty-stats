/**
 * Spotify Webflow Integration JavaScript
 * PKCE OAuth 2.0 Flow & Stats Fetching
 */

// Default Configuration
let spotifyConfig = {
  clientId: localStorage.getItem('spotify_client_id') || '',
  redirectUri: window.location.origin + window.location.pathname,
  scope: 'user-top-read user-read-private',
  timeRange: 'short_term' // short_term (1 month), medium_term (6 months), long_term (all time)
};

// --- 1. PKCE Helper Functions ---
function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// --- 2. Spotify OAuth Login ---
async function loginToSpotify() {
  const clientId = document.getElementById('client-id-input')?.value.trim() || spotifyConfig.clientId;
  
  if (!clientId) {
    showToast('⚠️ Por favor ingresa un Client ID de Spotify válido.');
    return;
  }

  localStorage.setItem('spotify_client_id', clientId);
  
  const verifier = generateRandomString(128);
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem('spotify_code_verifier', verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: spotifyConfig.scope,
    redirect_uri: spotifyConfig.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// --- 3. Exchange Code for Access Token ---
async function getAccessToken(code) {
  const verifier = localStorage.getItem('spotify_code_verifier');
  const clientId = localStorage.getItem('spotify_client_id') || spotifyConfig.clientId;

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: spotifyConfig.redirectUri,
    code_verifier: verifier
  });

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await response.json();

    if (data.access_token) {
      const expiresAt = Date.now() + (data.expires_in * 1000);
      localStorage.setItem('spotify_access_token', data.access_token);
      localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
      
      // Clean query string from browser address bar
      window.history.replaceState({}, document.title, window.location.pathname);
      return data.access_token;
    } else {
      console.error('Error obteniendo token:', data);
      showToast('❌ Error en autenticación con Spotify: ' + (data.error_description || data.error));
      return null;
    }
  } catch (err) {
    console.error('Error de red al obtener token:', err);
    showToast('❌ Error de red al conectar con Spotify.');
    return null;
  }
}

// Check if stored token is valid
function getValidToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiresAt = localStorage.getItem('spotify_token_expires_at');
  
  if (!token || !expiresAt) return null;
  
  if (Date.now() >= parseInt(expiresAt, 10)) {
    console.warn('El token de Spotify ha expirado.');
    logoutSpotify();
    return null;
  }
  
  return token;
}

function logoutSpotify() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_token_expires_at');
  localStorage.removeItem('spotify_code_verifier');
  showToast('🔒 Sesión cerrada de Spotify.');
  setTimeout(() => window.location.reload(), 1000);
}

// --- 4. Fetch Spotify Data ---
async function fetchSpotifyStats(token, timeRange = 'short_term') {
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch User Profile
  let userProfile = null;
  try {
    const userRes = await fetch('https://api.spotify.com/v1/me', { headers });
    if (userRes.ok) userProfile = await userRes.json();
  } catch (e) { console.warn('Could not fetch profile', e); }

  // Fetch Top Artists
  const artistsRes = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=10&time_range=${timeRange}`, { headers });
  if (artistsRes.status === 401) {
    logoutSpotify();
    throw new Error('Token expirado');
  }
  const artistsData = await artistsRes.json();

  // Fetch Top Tracks (limit 20 to extract top albums cleanly)
  const tracksRes = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=${timeRange}`, { headers });
  const tracksData = await tracksRes.json();

  // Deduce Top Albums from top listening tracks
  const albumsMap = new Map();
  if (tracksData.items) {
    tracksData.items.forEach(track => {
      const album = track.album;
      if (!albumsMap.has(album.id)) {
        albumsMap.set(album.id, {
          id: album.id,
          name: album.name,
          artist: album.artists.map(a => a.name).join(', '),
          image: album.images[0]?.url,
          url: album.external_urls.spotify
        });
      }
    });
  }
  const topAlbums = Array.from(albumsMap.values()).slice(0, 10);

  return {
    user: userProfile,
    artists: artistsData.items || [],
    tracks: (tracksData.items || []).slice(0, 10),
    albums: topAlbums
  };
}

// --- 5. Demo Data Generator (Fallback for testing UI without login) ---
function getDemoData() {
  return {
    user: {
      display_name: 'Melómano Demo',
      images: [{ url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' }]
    },
    artists: [
      { id: '1', name: 'The Weeknd', genres: ['pop', 'r&b'], images: [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '2', name: 'Bad Bunny', genres: ['reggaeton', 'latin pop'], images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '3', name: 'Dua Lipa', genres: ['dance pop', 'uk pop'], images: [{ url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '4', name: 'Rosalía', genres: ['flamenco urbano', 'r&b'], images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '5', name: 'Arctic Monkeys', genres: ['indie rock', 'garage rock'], images: [{ url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '6', name: 'Billie Eilish', genres: ['art pop', 'electropop'], images: [{ url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '7', name: 'Taylor Swift', genres: ['pop', 'singer-songwriter'], images: [{ url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '8', name: 'Bizarrap', genres: ['trap argentino', 'edm'], images: [{ url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '9', name: 'Coldplay', genres: ['britpop', 'pop rock'], images: [{ url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '10', name: 'Kendrick Lamar', genres: ['conscious hip hop', 'rap'], images: [{ url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } }
    ],
    tracks: [
      { id: 't1', name: 'Blinding Lights', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } },
      { id: 't2', name: 'As It Was', artists: [{ name: 'Harry Styles' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } },
      { id: 't3', name: 'Stay', artists: [{ name: 'The Kid LAROI' }, { name: 'Justin Bieber' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } },
      { id: 't4', name: 'Starboy', artists: [{ name: 'The Weeknd' }, { name: 'Daft Punk' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } },
      { id: 't5', name: 'Levitating', artists: [{ name: 'Dua Lipa' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } },
      { id: 't6', name: 'Despechá', artists: [{ name: 'Rosalía' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } },
      { id: 't7', name: 'Heat Waves', artists: [{ name: 'Glass Animals' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } },
      { id: 't8', name: 'Do I Wanna Know?', artists: [{ name: 'Arctic Monkeys' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } },
      { id: '9', name: 'Montero (Call Me By Your Name)', artists: [{ name: 'Lil Nas X' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } },
      { id: 't10', name: 'Flowers', artists: [{ name: 'Miley Cyrus' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } }
    ],
    albums: [
      { id: 'a1', name: 'After Hours', artist: 'The Weeknd', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&auto=format&fit=crop&q=80', url: '#' },
      { id: 'a2', name: 'Un Verano Sin Ti', artist: 'Bad Bunny', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80', url: '#' },
      { id: 'a3', name: 'Future Nostalgia', artist: 'Dua Lipa', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80', url: '#' },
      { id: 'a4', name: 'MOTOMAMI', artist: 'Rosalía', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80', url: '#' },
      { id: 'a5', name: 'AM', artist: 'Arctic Monkeys', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&auto=format&fit=crop&q=80', url: '#' },
      { id: 'a6', name: 'Harry\'s House', artist: 'Harry Styles', image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80', url: '#' },
      { id: 'a7', name: 'Midnights', artist: 'Taylor Swift', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&auto=format&fit=crop&q=80', url: '#' },
      { id: 'a8', name: 'When We All Fall Asleep...', artist: 'Billie Eilish', image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&auto=format&fit=crop&q=80', url: '#' },
      { id: 'a9', name: 'Starboy', artist: 'The Weeknd', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80', url: '#' },
      { id: 'a10', name: 'Music of the Spheres', artist: 'Coldplay', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80', url: '#' }
    ]
  };
}

// --- 6. Render Data into Webflow Elements ---
function renderStats(data) {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const statsContainer = document.getElementById('stats-container');
  const userContainer = document.getElementById('user-profile-badge');

  if (loginBtn && data.user && data.user.display_name !== 'Melómano Demo') {
    loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  }

  if (statsContainer) statsContainer.style.display = 'block';

  // Render User Badge if available
  if (userContainer && data.user) {
    const avatarUrl = data.user.images?.[0]?.url || 'https://via.placeholder.com/40';
    userContainer.innerHTML = `
      <div class="user-profile">
        <img src="${avatarUrl}" class="user-avatar" alt="${data.user.display_name}">
        <div>
          <div class="user-name">${data.user.display_name}</div>
          <div style="font-size:0.75rem; color: var(--spotify-green);">✓ Conectado</div>
        </div>
      </div>
    `;
  }

  // Render Top 10 Artists
  const artistsEl = document.getElementById('top-artists');
  if (artistsEl) {
    artistsEl.innerHTML = data.artists.map((artist, idx) => `
      <a href="${artist.external_urls?.spotify || '#'}" target="_blank" class="stat-card artist" title="Escuchar a ${artist.name}">
        <span class="stat-number">#${idx + 1}</span>
        <div class="stat-card-img-wrapper">
          <img src="${artist.images[0]?.url}" alt="${artist.name}" loading="lazy">
        </div>
        <div class="stat-title">${artist.name}</div>
        <div class="stat-subtitle">${(artist.genres || []).slice(0, 2).join(', ') || 'Artista Spotify'}</div>
      </a>
    `).join('');
  }

  // Render Top 10 Tracks
  const tracksEl = document.getElementById('top-tracks');
  if (tracksEl) {
    tracksEl.innerHTML = data.tracks.map((track, idx) => `
      <a href="${track.external_urls?.spotify || '#'}" target="_blank" class="stat-card" title="Escuchar ${track.name}">
        <span class="stat-number">#${idx + 1}</span>
        <div class="stat-card-img-wrapper">
          <img src="${track.album.images[0]?.url}" alt="${track.name}" loading="lazy">
        </div>
        <div class="stat-title">${track.name}</div>
        <div class="stat-subtitle">${track.artists.map(a => a.name).join(', ')}</div>
      </a>
    `).join('');
  }

  // Render Top 10 Albums
  const albumsEl = document.getElementById('top-albums');
  if (albumsEl) {
    albumsEl.innerHTML = data.albums.map((album, idx) => `
      <a href="${album.url || '#'}" target="_blank" class="stat-card" title="Ver álbum ${album.name}">
        <span class="stat-number">#${idx + 1}</span>
        <div class="stat-card-img-wrapper">
          <img src="${album.image}" alt="${album.name}" loading="lazy">
        </div>
        <div class="stat-title">${album.name}</div>
        <div class="stat-subtitle">${album.artist}</div>
      </a>
    `).join('');
  }
}

// Show loading skeletons
function showSkeletons() {
  const ids = ['top-artists', 'top-tracks', 'top-albums'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = Array(5).fill(0).map(() => `<div class="skeleton skeleton-card"></div>`).join('');
    }
  });
}

// Toast Notifications Helper
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- 7. Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  const clientIdInput = document.getElementById('client-id-input');
  if (clientIdInput && spotifyConfig.clientId) {
    clientIdInput.value = spotifyConfig.clientId;
  }

  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loginToSpotify();
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutSpotify();
    });
  }

  const demoBtn = document.getElementById('demo-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      renderStats(getDemoData());
      showToast('🎨 Mostrando datos de demostración.');
    });
  }

  // Time Filters setup
  const timeBtns = document.querySelectorAll('.time-btn');
  timeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      timeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = btn.dataset.range || 'short_term';
      spotifyConfig.timeRange = range;
      
      const token = getValidToken();
      if (token) {
        showSkeletons();
        try {
          const statsData = await fetchSpotifyStats(token, range);
          renderStats(statsData);
        } catch (err) {
          console.error(err);
        }
      } else {
        renderStats(getDemoData());
      }
    });
  });

  // Check OAuth callback code or existing valid token
  let token = getValidToken();

  if (code) {
    showSkeletons();
    token = await getAccessToken(code);
  }

  if (token) {
    showSkeletons();
    try {
      const statsData = await fetchSpotifyStats(token, spotifyConfig.timeRange);
      renderStats(statsData);
      showToast('✅ ¡Estadísticas de Spotify cargadas con éxito!');
    } catch (err) {
      console.error('Error al cargar datos:', err);
      renderStats(getDemoData());
    }
  } else {
    // Default to demo view so interface looks impressive right away
    renderStats(getDemoData());
  }
});
