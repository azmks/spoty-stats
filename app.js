/**
 * Spotify Webflow Integration JavaScript (Ultra Robusto + Auto-Creación de DOM)
 */

const DEFAULT_CLIENT_ID = 'TU_SPOTIFY_CLIENT_ID';
const SCOPE = 'user-top-read user-read-private';

// Helper SHA-256 de respaldo (funciona sin HTTPS y en file://)
function sha256Pure(ascii) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  var mathPow = Math.pow, maxWord = mathPow(2, 32), lengthProperty = 'length', i, j;
  var words = [], asciiLength = ascii[lengthProperty] * 8;
  var hash = sha256Pure.h = sha256Pure.h || [];
  var k = sha256Pure.k = sha256Pure.k || [];
  var primeCounter = k[lengthProperty];
  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return;
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength);
  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16);
    var oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2];
      var a = hash[0], e = hash[4];
      var temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
          w[i - 16]
          + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
          + w[i - 7]
          + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
        ) | 0);
      var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  var binaryArray = [];
  for (i = 0; i < 8; i++) {
    binaryArray.push((hash[i] >> 24) & 255);
    binaryArray.push((hash[i] >> 16) & 255);
    binaryArray.push((hash[i] >> 8) & 255);
    binaryArray.push(hash[i] & 255);
  }
  return new Uint8Array(binaryArray);
}

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  let digestBytes;
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      digestBytes = new Uint8Array(digest);
    } catch (e) {
      digestBytes = sha256Pure(codeVerifier);
    }
  } else {
    digestBytes = sha256Pure(codeVerifier);
  }

  let binaryString = '';
  for (let i = 0; i < digestBytes.length; i++) {
    binaryString += String.fromCharCode(digestBytes[i]);
  }

  return btoa(binaryString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function getRedirectUri() {
  if (window.location.origin === 'null' || !window.location.origin) {
    return window.location.href.split('?')[0].split('#')[0];
  }
  return window.location.origin + window.location.pathname;
}

// Iniciar sesión en Spotify
async function loginToSpotify() {
  try {
    const inputEl = document.getElementById('client-id-input');
    let clientId = inputEl ? inputEl.value.trim() : '';
    if (!clientId) {
      clientId = localStorage.getItem('spotify_client_id') || DEFAULT_CLIENT_ID;
    }

    if (!clientId || clientId === 'TU_SPOTIFY_CLIENT_ID') {
      alert('⚠️ Por favor ingresa tu Client ID de Spotify.\n\n1. Ve a https://developer.spotify.com/dashboard\n2. Crea una app y copia tu Client ID.\n3. Pégalo en la variable CLIENT_ID o en la casilla de texto.');
      if (inputEl) inputEl.focus();
      return;
    }

    localStorage.setItem('spotify_client_id', clientId);

    const verifier = generateRandomString(128);
    const challenge = await generateCodeChallenge(verifier);
    localStorage.setItem('spotify_code_verifier', verifier);

    const redirectUri = getRedirectUri();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPE,
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: challenge
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    console.log("Redirigiendo a Spotify:", authUrl);
    window.location.href = authUrl;
  } catch (err) {
    alert("❌ Error al conectar: " + err.message);
  }
}

async function getAccessToken(code) {
  const verifier = localStorage.getItem('spotify_code_verifier');
  const clientId = localStorage.getItem('spotify_client_id') || DEFAULT_CLIENT_ID;
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
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
      window.history.replaceState({}, document.title, window.location.pathname);
      return data.access_token;
    } else {
      alert('❌ Error de Spotify: ' + (data.error_description || data.error));
    }
  } catch (err) {
    alert('❌ Error de red al conectar con Spotify.');
  }
  return null;
}

function getValidToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiresAt = localStorage.getItem('spotify_token_expires_at');
  if (!token || !expiresAt) return null;
  if (Date.now() >= parseInt(expiresAt, 10)) {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expires_at');
    return null;
  }
  return token;
}

async function fetchSpotifyStats(token, timeRange = 'short_term') {
  const headers = { Authorization: `Bearer ${token}` };

  let userProfile = null;
  try {
    const userRes = await fetch('https://api.spotify.com/v1/me', { headers });
    if (userRes.ok) userProfile = await userRes.json();
  } catch (e) {}

  const artistsRes = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=10&time_range=${timeRange}`, { headers });
  if (artistsRes.status === 401) {
    localStorage.removeItem('spotify_access_token');
    window.location.reload();
    return;
  }
  const artistsData = await artistsRes.json();

  const tracksRes = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=${timeRange}`, { headers });
  const tracksData = await tracksRes.json();

  const albumsMap = new Map();
  if (tracksData.items) {
    tracksData.items.forEach(track => {
      const album = track.album;
      if (!albumsMap.has(album.id)) {
        albumsMap.set(album.id, {
          id: album.id,
          name: album.name,
          artist: album.artists.map(a => a.name).join(', '),
          image: (album.images && album.images[0]) ? album.images[0].url : '',
          url: album.external_urls ? album.external_urls.spotify : '#'
        });
      }
    });
  }

  return {
    user: userProfile,
    artists: artistsData.items || [],
    tracks: (tracksData.items || []).slice(0, 10),
    albums: Array.from(albumsMap.values()).slice(0, 10)
  };
}

// Datos Demo
function getDemoData() {
  return {
    user: { display_name: 'Usuario Demo (Vista Previa)', images: [{ url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' }] },
    artists: [
      { id: '1', name: 'The Weeknd', genres: ['pop', 'r&b'], images: [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: 'https://open.spotify.com' } },
      { id: '2', name: 'Bad Bunny', genres: ['reggaeton', 'latin pop'], images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: 'https://open.spotify.com' } },
      { id: '3', name: 'Dua Lipa', genres: ['dance pop', 'uk pop'], images: [{ url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: 'https://open.spotify.com' } },
      { id: '4', name: 'Rosalía', genres: ['flamenco urbano'], images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: 'https://open.spotify.com' } },
      { id: '5', name: 'Arctic Monkeys', genres: ['indie rock'], images: [{ url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: 'https://open.spotify.com' } }
    ],
    tracks: [
      { id: 't1', name: 'Blinding Lights', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: 'https://open.spotify.com' } },
      { id: 't2', name: 'As It Was', artists: [{ name: 'Harry Styles' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: 'https://open.spotify.com' } },
      { id: 't3', name: 'Despechá', artists: [{ name: 'Rosalía' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: 'https://open.spotify.com' } }
    ],
    albums: [
      { id: 'a1', name: 'After Hours', artist: 'The Weeknd', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&auto=format&fit=crop&q=80', url: 'https://open.spotify.com' },
      { id: 'a2', name: 'Un Verano Sin Ti', artist: 'Bad Bunny', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80', url: 'https://open.spotify.com' }
    ]
  };
}

// Extracción segura de URL de imagen
function getSafeImgUrl(imagesArray, fallbackText = 'Música') {
  if (Array.isArray(imagesArray) && imagesArray.length > 0 && imagesArray[0] && imagesArray[0].url) {
    return imagesArray[0].url;
  }
  return `https://via.placeholder.com/300/181818/1db954?text=${encodeURIComponent(fallbackText)}`;
}

// Auto-creación de estructura DOM si faltan elementos en Webflow
function ensureDOMStructure() {
  let statsContainer = document.getElementById('stats-container');
  if (!statsContainer) {
    statsContainer = document.createElement('div');
    statsContainer.id = 'stats-container';
    statsContainer.style.marginTop = '30px';
    document.body.appendChild(statsContainer);
  }
  statsContainer.style.display = 'block';

  let artistsEl = document.getElementById('top-artists');
  if (!artistsEl) {
    const sec = document.createElement('div');
    sec.style.marginBottom = '40px';
    sec.innerHTML = `<h3 style="color:#ffffff;margin-bottom:16px;font-size:1.4rem;font-weight:700;">🎤 Top 10 Artistas</h3><div id="top-artists" class="stats-grid"></div>`;
    statsContainer.appendChild(sec);
  }

  let tracksEl = document.getElementById('top-tracks');
  if (!tracksEl) {
    const sec = document.createElement('div');
    sec.style.marginBottom = '40px';
    sec.innerHTML = `<h3 style="color:#ffffff;margin-bottom:16px;font-size:1.4rem;font-weight:700;">🎵 Top 10 Canciones</h3><div id="top-tracks" class="stats-grid"></div>`;
    statsContainer.appendChild(sec);
  }

  let albumsEl = document.getElementById('top-albums');
  if (!albumsEl) {
    const sec = document.createElement('div');
    sec.style.marginBottom = '40px';
    sec.innerHTML = `<h3 style="color:#ffffff;margin-bottom:16px;font-size:1.4rem;font-weight:700;">💿 Top 10 Álbumes</h3><div id="top-albums" class="stats-grid"></div>`;
    statsContainer.appendChild(sec);
  }
}

// Renderizar tarjetas en el DOM
function renderStats(data) {
  ensureDOMStructure();

  const userContainer = document.getElementById('user-profile-badge');
  if (userContainer && data.user) {
    const avatarUrl = getSafeImgUrl(data.user.images, 'Usuario');
    userContainer.innerHTML = `
      <div class="user-profile">
        <img src="${avatarUrl}" class="user-avatar" alt="${data.user.display_name}">
        <div>
          <div class="user-name">${data.user.display_name}</div>
        </div>
      </div>
    `;
  }

  const artistsEl = document.getElementById('top-artists');
  if (artistsEl && data.artists) {
    artistsEl.innerHTML = data.artists.map((artist, idx) => {
      const imgUrl = getSafeImgUrl(artist.images, artist.name);
      const genres = (artist.genres || []).slice(0, 2).join(', ') || 'Artista';
      const link = artist.external_urls ? artist.external_urls.spotify : '#';
      return `
        <a href="${link}" target="_blank" class="stat-card artist">
          <span class="stat-number">#${idx + 1}</span>
          <div class="stat-card-img-wrapper">
            <img src="${imgUrl}" alt="${artist.name}">
          </div>
          <div class="stat-title">${artist.name}</div>
          <div class="stat-subtitle">${genres}</div>
        </a>
      `;
    }).join('');
  }

  const tracksEl = document.getElementById('top-tracks');
  if (tracksEl && data.tracks) {
    tracksEl.innerHTML = data.tracks.map((track, idx) => {
      const imgUrl = getSafeImgUrl(track.album ? track.album.images : null, track.name);
      const artistNames = (track.artists || []).map(a => a.name).join(', ');
      const link = track.external_urls ? track.external_urls.spotify : '#';
      return `
        <a href="${link}" target="_blank" class="stat-card">
          <span class="stat-number">#${idx + 1}</span>
          <div class="stat-card-img-wrapper">
            <img src="${imgUrl}" alt="${track.name}">
          </div>
          <div class="stat-title">${track.name}</div>
          <div class="stat-subtitle">${artistNames}</div>
        </a>
      `;
    }).join('');
  }

  const albumsEl = document.getElementById('top-albums');
  if (albumsEl && data.albums) {
    albumsEl.innerHTML = data.albums.map((album, idx) => {
      const imgUrl = album.image || 'https://via.placeholder.com/300/181818/1db954?text=Album';
      const link = album.url || '#';
      return `
        <a href="${link}" target="_blank" class="stat-card">
          <span class="stat-number">#${idx + 1}</span>
          <div class="stat-card-img-wrapper">
            <img src="${imgUrl}" alt="${album.name}">
          </div>
          <div class="stat-title">${album.name}</div>
          <div class="stat-subtitle">${album.artist}</div>
        </a>
      `;
    }).join('');
  }
}

// Delegación global de clics para Webflow
document.addEventListener('click', function (e) {
  const loginBtn = e.target.closest('#login-btn');
  if (loginBtn) {
    e.preventDefault();
    loginToSpotify();
    return;
  }

  const demoBtn = e.target.closest('#demo-btn');
  if (demoBtn) {
    e.preventDefault();
    console.log("Activando vista previa demo...");
    renderStats(getDemoData());
    return;
  }
});

// Inicialización auto-ejecutable
async function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  const storedId = localStorage.getItem('spotify_client_id');
  const inputEl = document.getElementById('client-id-input');
  if (inputEl && storedId) {
    inputEl.value = storedId;
  }

  let token = getValidToken();

  if (code) {
    token = await getAccessToken(code);
  }

  if (token) {
    try {
      const statsData = await fetchSpotifyStats(token);
      if (statsData) renderStats(statsData);
    } catch (err) {
      console.error(err);
      renderStats(getDemoData());
    }
  } else {
    // Renderizar Vista Previa Demo por defecto inmediatamente
    renderStats(getDemoData());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
