// =============================================
//  CONFIGURATION
// =============================================
const USE_API = false;
const API_URL = '/api';

// =============================================
//  STATE
// =============================================
let allListings = [];

// =============================================
//  SPA PAGE SWITCHING
// =============================================
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.add('hidden');
  });

  const target = document.getElementById('page-' + pageName);
  if (target) {
    target.classList.remove('hidden');
  }

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.remove('active');
    const onclick = link.getAttribute('onclick') || '';
    if (onclick.includes("'" + pageName + "'")) {
      link.classList.add('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pageName === 'marketplace') {
    loadListings();
  }
  if (pageName === 'home') {
    loadStats();
    loadFeatured();
  }
}

// =============================================
//  AUTH & NAV
// =============================================
function updateNavAuth() {
  const container = document.getElementById('navAuth');
  if (!container) return;

  const user = JSON.parse(localStorage.getItem('ml_user') || 'null');

  if (user && user.loggedIn) {
    // Logged in - show profile dropdown
    const initials = user.fullName
      ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : (user.username ? user.username.slice(0, 2).toUpperCase() : 'U');
    const displayName = user.fullName || user.username || user.email.split('@')[0];

    container.innerHTML = `
      <div class="user-profile" id="userProfile" onclick="toggleDropdown(event)">
        <div class="user-avatar">${initials}</div>
        <span class="user-name">${displayName}</span>
        <span style="color:#888; font-size:12px;">▼</span>
        <div class="user-dropdown" id="userDropdown">
          <button class="dropdown-item" onclick="showPage('home'); closeDropdown();">🏠 Home</button>
          <button class="dropdown-item" onclick="showPage('marketplace'); closeDropdown();">🛒 Marketplace</button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" onclick="handleLogout(); closeDropdown();">🚪 Logout</button>
        </div>
      </div>
      <button class="btn-outline-cyan" onclick="openModal()">+ List Account</button>
    `;
  } else {
    // Logged out - show login + signup
    container.innerHTML = `
      <button class="btn-login" onclick="showPage('login')">Login</button>
      <button class="btn-signup" onclick="openSignupModal()">Sign Up</button>
      <button class="btn-outline-cyan" onclick="openModal()">+ List Account</button>
    `;
  }
}

function toggleDropdown(e) {
  e.stopPropagation();
  const profile = document.getElementById('userProfile');
  if (profile) {
    profile.classList.toggle('active');
  }
}

function closeDropdown() {
  const profile = document.getElementById('userProfile');
  if (profile) {
    profile.classList.remove('active');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', () => {
  closeDropdown();
});

function handleLogout() {
  localStorage.removeItem('ml_user');
  updateNavAuth();
  showPage('home');
}

// =============================================
//  INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
  showPage('home');

  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', handleOverlayClick);
  }

  const signupOverlay = document.getElementById('signup-modal-overlay');
  if (signupOverlay) {
    signupOverlay.addEventListener('click', (e) => {
      if (e.target === signupOverlay) closeSignupModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeSignupModal();
    }
  });
});

// =============================================
//  LOAD LISTINGS
// =============================================
async function loadListings() {
  const grid = document.getElementById('listingsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-msg">Loading Lobby...</div>';

  if (USE_API) {
    const res = await fetch(`${API_URL}/listings`);
    allListings = await res.json();
  } else {
    allListings = JSON.parse(localStorage.getItem('ml_listings') || '[]');
    if (allListings.length === 0) {
      allListings = getSampleListings();
      localStorage.setItem('ml_listings', JSON.stringify(allListings));
    }
  }

  filterListings();
}

async function loadStats() {
  let stats;

  if (USE_API) {
    const res = await fetch(`${API_URL}/listings/stats`);
    stats = await res.json();
  } else {
    const listings = JSON.parse(localStorage.getItem('ml_listings') || '[]');
    const prices = listings.map(l => l.price);
    stats = {
      totalListings: listings.length,
      avgPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      totalSkins: listings.reduce((a, l) => a + (l.skinsCount || 0), 0)
    };
  }

  const totalEl = document.getElementById('totalListings');
  const avgEl = document.getElementById('avgPrice');
  const skinsEl = document.getElementById('totalSkins');

  if (totalEl) totalEl.textContent = stats.totalListings;
  if (avgEl) avgEl.textContent = 'Rs ' + stats.avgPrice.toLocaleString();
  if (skinsEl) skinsEl.textContent = stats.totalSkins.toLocaleString();
}

// =============================================
//  FEATURED ACCOUNTS
// =============================================
function loadFeatured() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  let listings = JSON.parse(localStorage.getItem('ml_listings') || '[]');
  if (listings.length === 0) {
    listings = getSampleListings();
  }

  const featured = listings.slice(0, 4);
  grid.innerHTML = featured.map(l => `
    <div class="account-card">
      ${l.imageUrl
        ? `<img class="card-image" src="${l.imageUrl}" alt="${escapeHtml(l.title)}" onerror="this.style.display='none'">`
        : `<div class="card-image-placeholder">⚔️</div>`
      }
      <div class="card-info">
        <h3>${escapeHtml(l.title)}</h3>
        <p class="seller-name">🛡 Seller: ${escapeHtml(l.sellerName)}</p>
        <div class="stats">
          ${l.stars ? `<span>⭐ ${l.stars} Stars</span>` : ''}
          <span>🎨 ${l.skinsCount} Skins</span>
          <span>🏆 ${l.points.toLocaleString()} pts</span>
        </div>
        <p class="highlight-skins">${escapeHtml(l.highlightSkins).split(',').map(s => s.trim()).join(' • ')}</p>
        <div class="card-footer">
          <div class="price">
            <small>Price</small>
            Rs ${l.price.toLocaleString()}
          </div>
          <a href="https://wa.me/${sanitizePhone(l.whatsapp)}?text=${encodeURIComponent('Hi, I am interested in your MLBB account: ' + l.title)}"
             target="_blank" class="buy-btn">Buy Now</a>
        </div>
      </div>
    </div>
  `).join('');
}

// =============================================
//  FILTER & SORT
// =============================================
function filterListings() {
  const searchInput = document.getElementById('searchInput');
  const minPriceInput = document.getElementById('minPrice');
  const maxPriceInput = document.getElementById('maxPrice');
  const sortByInput = document.getElementById('sortBy');

  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const minPrice = minPriceInput ? (parseInt(minPriceInput.value) || 0) : 0;
  const maxPrice = maxPriceInput ? (parseInt(maxPriceInput.value) || Infinity) : Infinity;
  const sortBy = sortByInput ? sortByInput.value : 'newest';

  let filtered = allListings.filter(l => {
    const matchSearch = !search ||
      (l.title && l.title.toLowerCase().includes(search)) ||
      (l.sellerName && l.sellerName.toLowerCase().includes(search)) ||
      (l.highlightSkins && l.highlightSkins.toLowerCase().includes(search));
    const matchPrice = l.price >= minPrice && l.price <= maxPrice;
    return matchSearch && matchPrice;
  });

  switch (sortBy) {
    case 'price_asc':    filtered.sort((a, b) => a.price - b.price); break;
    case 'price_desc':   filtered.sort((a, b) => b.price - a.price); break;
    case 'skins_desc':   filtered.sort((a, b) => b.skinsCount - a.skinsCount); break;
    case 'points_desc':  filtered.sort((a, b) => b.points - a.points); break;
    default:             filtered.sort((a, b) => (b.id || 0) - (a.id || 0)); break;
  }

  renderListings(filtered);
}

function renderListings(listings) {
  const grid = document.getElementById('listingsGrid');
  if (!grid) return;

  if (listings.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No Accounts Found</h3>
        <p>Try adjusting your filters or search term.</p>
        <button class="btn-outline-cyan" onclick="clearFilters()">Clear Filters</button>
      </div>`;
    return;
  }

  grid.innerHTML = listings.map(l => `
    <div class="account-card">
      ${l.imageUrl
        ? `<img class="card-image" src="${l.imageUrl}" alt="${escapeHtml(l.title)}" onerror="this.style.display='none'">`
        : `<div class="card-image-placeholder">⚔️</div>`
      }
      <div class="card-info">
        <h3>${escapeHtml(l.title)}</h3>
        <p class="seller-name">🛡 Seller: ${escapeHtml(l.sellerName)}</p>
        <div class="stats">
          ${l.stars ? `<span>⭐ ${l.stars} Stars</span>` : ''}
          <span>🎨 ${l.skinsCount} Skins</span>
          <span>🏆 ${l.points.toLocaleString()} pts</span>
        </div>
        <p class="highlight-skins">${escapeHtml(l.highlightSkins).split(',').map(s => s.trim()).join(' • ')}</p>
        <div class="card-footer">
          <div class="price">
            <small>Price</small>
            Rs ${l.price.toLocaleString()}
          </div>
          <a href="https://wa.me/${sanitizePhone(l.whatsapp)}?text=${encodeURIComponent('Hi, I am interested in your MLBB account: ' + l.title)}"
             target="_blank" class="buy-btn">Buy Now</a>
        </div>
      </div>
    </div>
  `).join('');
}

// =============================================
//  MODAL
// =============================================
function openModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  const form = document.getElementById('listingForm');
  if (form) form.reset();
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) {
    closeModal();
  }
}

// =============================================
//  SIGNUP MODAL
// =============================================
function openSignupModal() {
  const overlay = document.getElementById('signup-modal-overlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeSignupModal() {
  const overlay = document.getElementById('signup-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  const form = document.getElementById('signupForm');
  if (form) form.reset();
}

// =============================================
//  SUBMIT LISTING
// =============================================
async function submitListing(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('submitBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting...';
  }

  const data = {
    title:          form.title.value.trim(),
    sellerName:     form.sellerName.value.trim(),
    whatsapp:       form.whatsapp.value.trim(),
    price:          parseInt(form.price.value),
    skinsCount:     parseInt(form.skinsCount.value),
    stars:          form.stars.value ? parseInt(form.stars.value) : null,
    points:         parseInt(form.points.value),
    highlightSkins: form.highlightSkins.value.trim(),
    imageUrl:       form.imageUrl.value.trim() || null,
    createdAt:      new Date().toISOString()
  };

  if (USE_API) {
    const res = await fetch(`${API_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      await loadListings();
      await loadStats();
      closeModal();
    } else {
      alert('Something went wrong. Please try again.');
    }
  } else {
    const listings = JSON.parse(localStorage.getItem('ml_listings') || '[]');
    data.id = Date.now();
    listings.unshift(data);
    localStorage.setItem('ml_listings', JSON.stringify(listings));
    allListings = listings;
    filterListings();
    loadStats();
    loadFeatured();
    closeModal();
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Submit Listing';
  }
}

// =============================================
//  LOGIN
// =============================================
function handleLogin(e) {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const password = e.target.password.value;

  const users = JSON.parse(localStorage.getItem('ml_users') || '[]');
  const user = users.find(u => (u.email === email || u.username === email) && u.password === password);

  if (user) {
    localStorage.setItem('ml_user', JSON.stringify({
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      loggedIn: true
    }));
    updateNavAuth();
    alert('Welcome back, ' + (user.fullName || user.username) + '!');
    showPage('home');
  } else {
    alert('Invalid email/username or password.');
  }
}

// =============================================
//  SIGNUP
// =============================================
function handleSignup(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('signupBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Creating Account...';
  }

  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;

  if (password !== confirmPassword) {
    alert('Passwords do not match!');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
    return;
  }

  const data = {
    fullName: form.fullName.value.trim(),
    email: form.email.value.trim(),
    username: form.username.value.trim(),
    phone: form.phone.value.trim() || null,
    password: password,
    createdAt: new Date().toISOString()
  };

  const users = JSON.parse(localStorage.getItem('ml_users') || '[]');

  if (users.find(u => u.email === data.email)) {
    alert('An account with this email already exists.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
    return;
  }

  if (users.find(u => u.username === data.username)) {
    alert('This username is already taken.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
    return;
  }

  users.push(data);
  localStorage.setItem('ml_users', JSON.stringify(users));
  localStorage.setItem('ml_user', JSON.stringify({
    email: data.email,
    username: data.username,
    fullName: data.fullName,
    loggedIn: true
  }));

  updateNavAuth();
  alert('Account created successfully! Welcome to ML-Store Nepal, ' + data.fullName + '!');
  closeSignupModal();
  showPage('home');

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

// =============================================
//  HELPERS
// =============================================
function clearFilters() {
  const searchInput = document.getElementById('searchInput');
  const minPrice = document.getElementById('minPrice');
  const maxPrice = document.getElementById('maxPrice');
  const sortBy = document.getElementById('sortBy');

  if (searchInput) searchInput.value = '';
  if (minPrice) minPrice.value = '';
  if (maxPrice) maxPrice.value = '';
  if (sortBy) sortBy.value = 'newest';
  filterListings();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizePhone(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

// =============================================
//  SAMPLE DATA
// =============================================
function getSampleListings() {
  return [
    { id:1, title:'Renowned Collector I',  sellerName:'Sabin',    whatsapp:'977980000001', stars:89,   skinsCount:312, points:82420,  highlightSkins:'KOF, Jujutsu Kaisen, Lucky Box',   price:8500,  imageUrl:null, createdAt:'2025-01-01T00:00:00Z' },
    { id:2, title:'Exalted Collector II',  sellerName:'Zenos',    whatsapp:'977980000002', stars:null, skinsCount:347, points:129515, highlightSkins:'Legend, Kishin, Hunter x Hunter',   price:12000, imageUrl:null, createdAt:'2025-01-02T00:00:00Z' },
    { id:3, title:'Mega Collector III',    sellerName:'Admin',    whatsapp:'977980000003', stars:null, skinsCount:513, points:202760, highlightSkins:'Legend, Naruto, Zenith',            price:25000, imageUrl:null, createdAt:'2025-01-03T00:00:00Z' },
    { id:4, title:'Renowned II',           sellerName:'Abhisekh', whatsapp:'977980000004', stars:null, skinsCount:218, points:72470,  highlightSkins:'Neo-Beast, Kishin, HxH',            price:5000,  imageUrl:null, createdAt:'2025-01-04T00:00:00Z' },
    { id:5, title:'Exalted II',            sellerName:'Safal',    whatsapp:'977980000005', stars:null, skinsCount:404, points:126830, highlightSkins:'Legend, Naruto, Aspirant',          price:30000, imageUrl:null, createdAt:'2025-01-05T00:00:00Z' },
    { id:6, title:'Exalted IV',            sellerName:'Safal',    whatsapp:'977980000006', stars:null, skinsCount:371, points:104035, highlightSkins:'Legend, KOF, Prime',                price:25000, imageUrl:null, createdAt:'2025-01-06T00:00:00Z' },
  ];
}
