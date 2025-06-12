let lastData = [];

async function fetchPosts() {
  try {
    const res = await fetch('/api/webhook');
    const data = await res.json();
    
    // Veri değişmediyse güncelleme yapma
    if (JSON.stringify(data) === JSON.stringify(lastData)) {
      return;
    }
    
    lastData = data;
    updateStats(data);
    renderPosts(data);
  } catch (error) {
    console.error('Veri alınırken hata oluştu:', error);
  }
}

function updateStats(data) {
  const stats = document.getElementById('stats');
  const totalRequests = data.length;
  const totalCookies = data.reduce((sum, post) => sum + (post.cookieCount || 0), 0);
  
  stats.innerHTML = `
    <div>Toplam İstek: ${totalRequests}</div>
    <div>Toplam Cookie: ${totalCookies}</div>
  `;
}

function renderPosts(data) {
  const list = document.getElementById('list');
  const showOnlyCookies = document.getElementById('showOnlyCookies').checked;
  
  // Filtreleme
  const filteredData = showOnlyCookies 
    ? data.filter(post => post.cookieCount > 0)
    : data;
  
  list.innerHTML = '';
  
  filteredData.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';
    
    // Cookie verilerini daha okunabilir formata dönüştür
    const cookieData = post.body.cookies ? formatCookieData(post.body.cookies) : '';
    
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

function formatCookieData(cookies) {
  if (!cookies || !cookies.length) return '';
  
  return `
    <div class="cookie-summary">
      <h3>Cookie Özeti:</h3>
      <ul>
        ${cookies.map(cookie => `
          <li>
            <strong>${cookie['Name raw']}</strong> - 
            Domain: ${cookie['Host raw']}, 
            Expires: ${cookie['Expires']}
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

// İlk yükleme
fetchPosts();

// Her 5 saniyede bir güncelle
setInterval(fetchPosts, 5000);