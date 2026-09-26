/**
 * Spotify Webflow Integration JavaScript (Versión 100% Infallible y Confiable)
 */

const DEFAULT_CLIENT_ID = '9783bc1d37f14c03990d5f9091e68b2f';
const SCOPE = 'user-top-read user-read-private';

// ====== TUS DATOS FIJOS ======
// Cuando descargues tus datos (presionando Ctrl + Shift + E tras iniciar sesión), pégalos aquí reemplazando el "null".
const OWNER_STATS = null;
// =============================

// Storage Seguro
const safeStorage = {
  memory: {},
  getItem(key) {
    try { return localStorage.getItem(key); } catch (e) { return this.memory[key] || null; }
  },
  setItem(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { this.memory[key] = val; }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); } catch (e) { delete this.memory[key]; }
  }
};

// Algoritmo SHA-256 limpio sin mutación de estado persistente
function sha256Pure(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;

  var words = [];
  var asciiLength = ascii[lengthProperty] * 8;
  
  var hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  var k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength);
  
  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16);
    var oldHash = hash.slice(0);

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
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
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

// Función Principal de Inicio de Sesión
async function loginToSpotify() {
  console.log("🟢 [Spotify] Iniciando loginToSpotify...");
  try {
    const mainInput = document.getElementById('client-id-input');
    let clientId = mainInput ? mainInput.value.trim() : '';

    if (!clientId) {
      clientId = safeStorage.getItem('spotify_client_id') || DEFAULT_CLIENT_ID;
    }

    // Si el Client ID no está configurado o es el valor placeholder
    if (!clientId || clientId === 'TU_SPOTIFY_CLIENT_ID') {
      const userEntered = prompt(
        "🔑 Configuración de Spotify:\n\nIngresa tu Spotify Client ID (obtenido en https://developer.spotify.com/dashboard):\n\nRedirect URI requerida: " + getRedirectUri()
      );
      if (userEntered && userEntered.trim()) {
        clientId = userEntered.trim();
        safeStorage.setItem('spotify_client_id', clientId);
        if (mainInput) mainInput.value = clientId;
      } else {
        console.warn("⚠️ No se ingresó Client ID.");
        return;
      }
    }

    await executeSpotifyRedirect(clientId);
  } catch (err) {
    console.error("❌ Error en loginToSpotify:", err);
    alert("❌ Error al redirigir a Spotify: " + err.message);
  }
}

// Exponer globalmente
window.loginToSpotify = loginToSpotify;

async function executeSpotifyRedirect(clientId) {
  safeStorage.setItem('spotify_client_id', clientId);

  const verifier = generateRandomString(128);
  const challenge = await generateCodeChallenge(verifier);
  safeStorage.setItem('spotify_code_verifier', verifier);

  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPE,
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    show_dialog: 'true'
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log("🚀 Redirigiendo a:", authUrl);

  // Redirección inmediata garantizada
  if (window.self !== window.top) {
    window.open(authUrl, '_blank');
  } else {
    window.location.href = authUrl;
  }
}

async function getAccessToken(code) {
  const verifier = safeStorage.getItem('spotify_code_verifier');
  const clientId = safeStorage.getItem('spotify_client_id') || DEFAULT_CLIENT_ID;
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
      safeStorage.setItem('spotify_access_token', data.access_token);
      safeStorage.setItem('spotify_token_expires_at', expiresAt.toString());
      window.history.replaceState({}, document.title, window.location.pathname);
      return data.access_token;
    } else {
      alert('❌ Error de Spotify: ' + (data.error_description || data.error));
    }
  } catch (err) {
    alert('❌ Error de red al obtener token de Spotify.');
  }
  return null;
}

function getValidToken() {
  const token = safeStorage.getItem('spotify_access_token');
  const expiresAt = safeStorage.getItem('spotify_token_expires_at');
  if (!token || !expiresAt) return null;
  if (Date.now() >= parseInt(expiresAt, 10)) {
    safeStorage.removeItem('spotify_access_token');
    safeStorage.removeItem('spotify_token_expires_at');
    return null;
  }
  return token;
}

async function fetchSpotifyStats(token, timeRange = 'medium_term') {
  const headers = { Authorization: `Bearer ${token}` };

  let userProfile = null;
  try {
    const userRes = await fetch('https://api.spotify.com/v1/me', { headers });
    if (userRes.ok) userProfile = await userRes.json();
  } catch (e) {}

  const artistsRes = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=10&time_range=${timeRange}`, { headers });
  if (artistsRes.status === 401) {
    safeStorage.removeItem('spotify_access_token');
    window.location.reload();
    return;
  }
  if (!artistsRes.ok) {
    const errObj = await artistsRes.json().catch(() => ({}));
    throw new Error(errObj.error?.message || "Error al conectar con Spotify");
  }
  const artistsData = await artistsRes.json();

  const tracksRes = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${timeRange}`, { headers });
  if (!tracksRes.ok) {
    const errObj = await tracksRes.json().catch(() => ({}));
    throw new Error(errObj.error?.message || "Error al obtener canciones");
  }
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


// Datos Demo para el botón de ejemplo
function getDemoData() {
  return {
    user: { display_name: 'Usuario Demo (Ejemplo)' },
    artists: [
      { id: '1', name: 'The Weeknd', genres: ['pop', 'r&b'], images: [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '2', name: 'Bad Bunny', genres: ['reggaeton', 'latin pop'], images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } },
      { id: '3', name: 'Taylor Swift', genres: ['pop'], images: [{ url: 'https://images.unsplash.com/photo-1599839619722-39751411ea63?w=400&auto=format&fit=crop&q=80' }], external_urls: { spotify: '#' } }
    ],
    tracks: [
      { id: 't1', name: 'Blinding Lights', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } },
      { id: 't2', name: 'Dakiti', artists: [{ name: 'Bad Bunny' }], album: { images: [{ url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80' }] }, external_urls: { spotify: '#' } }
    ],
    albums: [
      { id: 'a1', name: 'After Hours', artist: 'The Weeknd', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&auto=format&fit=crop&q=80', url: '#' },
      { id: 'a2', name: 'El Último Tour Del Mundo', artist: 'Bad Bunny', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80', url: '#' }
    ]
  };
}

function getSafeImgUrl(imagesArray, fallbackText = 'Música') {
  if (Array.isArray(imagesArray) && imagesArray.length > 0 && imagesArray[0] && imagesArray[0].url) {
    return imagesArray[0].url;
  }
  return `https://via.placeholder.com/300/181818/1db954?text=${encodeURIComponent(fallbackText)}`;
}

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

function renderStats(data) {
  ensureDOMStructure();

  if ((!data.artists || data.artists.length === 0) && (!data.tracks || data.tracks.length === 0)) {
    document.getElementById('stats-container').innerHTML = `<div style="background: #282828; color: white; padding: 30px; border-radius: 8px; text-align: center; margin-top: 20px;"><h2>🎧 No hay suficientes datos</h2><p>Spotify indica que no tienes suficientes reproducciones recientes para generar tu Top 10.</p></div>`;
    return;
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
          <div class="stat-card-img-wrapper"><img src="${imgUrl}" alt="${artist.name}"></div>
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
          <div class="stat-card-img-wrapper"><img src="${imgUrl}" alt="${track.name}"></div>
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
          <div class="stat-card-img-wrapper"><img src="${imgUrl}" alt="${album.name}"></div>
          <div class="stat-title">${album.name}</div>
          <div class="stat-subtitle">${album.artist}</div>
        </a>
      `;
    }).join('');
  }
}

// Listener Global de Clics
document.addEventListener('click', function (e) {
  const demoBtn = e.target.closest('#demo-btn');
  if (demoBtn) {
    e.preventDefault();
    renderStats(OWNER_STATS || getDemoData());
    return;
  }

  // Buscar cualquier botón o enlace que contenga texto o ID/clase de login
  const loginBtn = e.target.closest('#login-btn, .login-btn, [data-spotify-login]');
  const isGenericSpotifyBtn = e.target.closest('.spotify-btn');

  if (loginBtn || isGenericSpotifyBtn) {
    e.preventDefault();
    if (OWNER_STATS) {
      renderStats(OWNER_STATS);
    } else {
      loginToSpotify();
    }
    return;
  }
});

async function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  // Si hay error en la redirección (ej. canceló) y tenemos los datos fijos, los mostramos silenciando el error.
  if (error) {
    if (OWNER_STATS) {
      renderStats(OWNER_STATS);
    }
    return;
  }

  const storedId = safeStorage.getItem('spotify_client_id');
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
      window.lastFetchedStats = statsData; // Guardar para exportar
      
      // Si el dueño configuró sus datos fijos, SIEMPRE forzamos a mostrar sus datos, incluso si el que inició sesión es otra persona.
      if (OWNER_STATS) {
        renderStats(OWNER_STATS);
      } else {
        if (statsData) renderStats(statsData);
      }
    } catch (err) {
      console.error("Error al cargar las estadísticas de Spotify:", err);
      // Si da error (ej. User not registered), mostramos silenciosamente los datos fijos (si existen).
      if (OWNER_STATS) {
        renderStats(OWNER_STATS);
      } else {
        let statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
          statsContainer.style.display = 'block';
          statsContainer.innerHTML = `<div style="background: #e22134; color: white; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center;"><h3>⚠️ Ups, un problema</h3><p>${err.message}</p><p style="font-size: 0.9em; margin-top: 10px; opacity: 0.9;">(Nota: Si dice "User not registered", el dueño de la app debe agregar tu email en el Dashboard de Spotify).</p></div>`;
        } else {
          alert("Error de Spotify: " + err.message);
        }
      }
    }
  }
}

// Función oculta para que el dueño exporte sus datos (Ctrl + Shift + E)
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'e' || e.key === 'E') {
    if (e.ctrlKey && e.shiftKey) {
      if (window.lastFetchedStats) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.lastFetchedStats, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "mis_datos_spotify.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        alert("¡Tus datos han sido descargados!\n\nAbre el archivo mis_datos_spotify.json, copia todo el contenido y reemplázalo donde dice 'const OWNER_STATS = null;' en la parte superior de app.js");
      } else {
        alert("Primero debes iniciar sesión exitosamente para descargar tus datos.");
      }
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
