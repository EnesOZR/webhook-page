async function fetchPosts() {
  const res = await fetch('/api/webhook');
  const data = await res.json();
  const list = document.getElementById('list');
  list.innerHTML = '';
  data.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `
      <div class="time">${new Date(post.time).toLocaleString('tr-TR')}</div>
      <div class="cookie-count">Bu sitede ${post.cookieCount} cookie bulundu</div>
      <pre>${JSON.stringify(post.body, null, 2)}</pre>
    `;
    list.appendChild(div);
  });
}
fetchPosts();
setInterval(fetchPosts, 5000);
