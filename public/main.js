let lastData = [];
let domains = new Set();

async function fetchPosts() {
  try {
    const res = await fetch('/api/webhook');
    const data = await res.json();
    
    // Veri değişmediyse güncelleme yapma
    if (JSON.stringify(data) === JSON.stringify(lastData)) {
      return;
    }
    
    lastData = data;
    updateDomainList(data);
    updateStats(data);
    updateSummary(data);
    renderPosts(data);
  } catch (error) {
    console.error('Veri alınırken hata oluştu:', error);
  }
}

function updateDomainList(data) {
  const domainSet = new Set();
  data.forEach(post => {
    if (post.body && post.body.cookies) {
      post.body.cookies.forEach(cookie => {
        const domain = cookie['Host raw'];
        if (domain) domainSet.add(domain);
      });
    }
  });
  
  domains = domainSet;
  const domainFilter = document.getElementById('domainFilter');
  const currentValue = domainFilter.value;
  
  domainFilter.innerHTML = '<option value="">Tümü</option>';
  [...domains].sort().forEach(domain => {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = domain;
    domainFilter.appendChild(option);
  });
  
  domainFilter.value = currentValue;
}

function updateStats(data) {
  const totalRequests = data.length;
  const totalCookies = data.reduce((sum, post) => sum + (post.cookieCount || 0), 0);
  const uniqueDomains = domains.size;
  
  const stats = document.getElementById('stats');
  stats.innerHTML = `
    <div class="stat-card">
      <h3>Toplam İstek</h3>
      <div class="value">${totalRequests}</div>
    </div>
    <div class="stat-card">
      <h3>Toplam Cookie</h3>
      <div class="value">${totalCookies}</div>
    </div>
    <div class="stat-card">
      <h3>Benzersiz Domain</h3>
      <div class="value">${uniqueDomains}</div>
    </div>
  `;
}

function updateSummary(data) {
  const summary = document.getElementById('summary');
  const domainStats = {};
  
  data.forEach(post => {
    if (post.body && post.body.cookies) {
      post.body.cookies.forEach(cookie => {
        const domain = cookie['Host raw'];
        if (!domainStats[domain]) {
          domainStats[domain] = { count: 0, types: new Set() };
        }
        domainStats[domain].count++;
        domainStats[domain].types.add(cookie['Name raw']);
      });
    }
  });
  
  const summaryHTML = Object.entries(domainStats)
    .sort(([,a], [,b]) => b.count - a.count)
    .map(([domain, stats]) => `
      <div class="domain-stat">
        <div class="domain-name">${domain}</div>
        <div class="domain-details">
          <span>${stats.count} cookie</span>
          <span>${stats.types.size} benzersiz</span>
        </div>
      </div>
    `).join('');
    
  summary.innerHTML = summaryHTML;
}

function renderPosts(data) {
  const list = document.getElementById('list');
  const showOnlyCookies = document.getElementById('showOnlyCookies').checked;
  const selectedDomain = document.getElementById('domainFilter').value;
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  // Filtreleme
  let filteredData = data;
  
  if (showOnlyCookies) {
    filteredData = filteredData.filter(post => post.cookieCount > 0);
  }
  
  if (selectedDomain) {
    filteredData = filteredData.filter(post => 
      post.body?.cookies?.some(cookie => cookie['Host raw'] === selectedDomain)
    );
  }
  
  if (searchTerm) {
    filteredData = filteredData.filter(post => {
      const cookieData = JSON.stringify(post.body?.cookies || []).toLowerCase();
      return cookieData.includes(searchTerm);
    });
  }
  
  list.innerHTML = '';
  
  filteredData.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';
    
    const cookieData = post.body.cookies ? formatCookieData(post.body.cookies, selectedDomain) : '';
    
    div.innerHTML = `
      <div class="post-header">
        <div class="time">${new Date(post.time).toLocaleString('tr-TR')}</div>
        <div class="cookie-count">Bu sitede ${post.cookieCount || 0} cookie bulundu</div>
      </div>
      <div class="post-content">
        ${cookieData}
        <pre>${JSON.stringify(post.body, null, 2)}</pre>
      </div>
    `;
    
    list.appendChild(div);
  });
}

function formatCookieData(cookies, selectedDomain) {
  if (!cookies || !cookies.length) return '';
  
  const filteredCookies = selectedDomain 
    ? cookies.filter(cookie => cookie['Host raw'] === selectedDomain)
    : cookies;
  
  return `
    <div class="cookie-summary">
      <h3>Cookie Özeti (${filteredCookies.length} adet)</h3>
      <ul>
        ${filteredCookies.map(cookie => `
          <li>
            <strong>${cookie['Name raw']}</strong>
            <div>Domain: ${cookie['Host raw']}</div>
            <div>Süre: ${cookie['Expires']}</div>
            ${cookie['Content raw'] ? `<div>Değer: ${cookie['Content raw'].substring(0, 30)}${cookie['Content raw'].length > 30 ? '...' : ''}</div>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

// Event Listeners
document.getElementById('showOnlyCookies').addEventListener('change', () => {
  renderPosts(lastData);
});

document.getElementById('domainFilter').addEventListener('change', () => {
  renderPosts(lastData);
});

document.getElementById('searchInput').addEventListener('input', debounce(() => {
  renderPosts(lastData);
}, 300));

document.getElementById('refreshButton').addEventListener('click', () => {
  fetchPosts();
});

// Yardımcı fonksiyonlar
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// İlk yükleme
fetchPosts();

// Her 5 saniyede bir güncelle
setInterval(fetchPosts, 5000);