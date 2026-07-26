

// =============================================
//  CONFIGURATION — change this to your backend
//  If you have no backend, listings save to
//  localStorage (browser only, local machine).
// =============================================
const USE_API = false;         // set true if you have the Node backend running
const API_URL = '/api';        // your API base URL when USE_API is true

// =============================================
//  STATE
// =============================================
let allListings = [];

// =============================================
//  INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  loadListings();
  loadStats();
});

// =============================================
//  LOAD LISTINGS
// =============================================
async function loadListings() {
  const grid = document.getElementById('listingsGrid');
  grid.innerHTML = '<div class="loading-msg">Loading Lobby...</div>';

  if (USE_API) {
    const res = await fetch(`${API_URL}/listings`);
    allListings = await res.json();
  } else {
    allListings = JSON.parse(localStorage.getItem('ml_listings') || '[]');
    // Add the original sample listings if empty
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
      totalSkins: listings.reduce((a, l) => a + l.skinsCount, 0)
    };
  }

  document.getElementById('totalListings').textContent = stats.totalListings;
  document.getElementById('avgPrice').textContent = 'Rs ' + stats.avgPrice.toLocaleString();
  document.getElementById('totalSkins').textContent = stats.totalSkins.toLocaleString();
}

// =============================================
//  FILTER & SORT LISTINGS
// =============================================
function filterListings() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
  const maxPrice = parseInt(document.getElementById('maxPrice').value) || Infinity;
  const sortBy = document.getElementById('sortBy').value;

  let filtered = allListings.filter(l => {
    const matchSearch = !search ||
      l.title.toLowerCase().includes(search) ||
      l.sellerName.toLowerCase().includes(search) ||
      l.highlightSkins.toLowerCase().includes(search);
    const matchPrice = l.price >= minPrice && l.price <= maxPrice;
    return matchSearch && matchPrice;
  });

  // Sort
  switch (sortBy) {
    case 'price_asc':    filtered.sort((a, b) => a.price - b.price); break;
    case 'price_desc':   filtered.sort((a, b) => b.price - a.price); break;
    case 'skins_desc':   filtered.sort((a, b) => b.skinsCount - a.skinsCount); break;
    case 'points_desc':  filtered.sort((a, b) => b.points - a.points); break;
    default:             filtered.sort((a, b) => (b.id || 0) - (a.id || 0)); break;
  }

  renderListings(filtered);
}

// =============================================
//  RENDER LISTINGS
// =============================================
function renderListings(listings) {
  const grid = document.getElementById('listingsGrid');

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
  document.getElementById('modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('listingForm').reset();
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// =============================================
//  SUBMIT LISTING
// =============================================
async function submitListing(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

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
    // Save to localStorage
    const listings = JSON.parse(localStorage.getItem('ml_listings') || '[]');
    data.id = Date.now();
    listings.unshift(data);
    localStorage.setItem('ml_listings', JSON.stringify(listings));
    allListings = listings;
    filterListings();
    loadStats();
    closeModal();
  }

  btn.disabled = false;
  btn.textContent = 'Submit Listing';
}

// =============================================
//  HELPERS
// =============================================
function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.getElementById('sortBy').value = 'newest';
  filterListings();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizePhone(phone) {
  return phone.replace(/[^0-9]/g, '');
}

// =============================================
//  SAMPLE DATA (shows on first load, no backend)
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

