let userPosts = {}; // { userId: [post1, post2, ...] }

export default async function handler(req, res) {
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const { userId, ...rest } = body;
    if (!userId) return res.status(400).json({ error: 'userId missing' });
    if (!userPosts[userId]) userPosts[userId] = [];
    userPosts[userId].unshift({ time: new Date().toISOString(), ...rest });
    res.status(200).json({ status: 'ok' });
  } else if (req.method === 'GET') {
    // Kullanıcıya özel veri isteği: /api/webhook/user/[userId]
    if (req.url && req.url.startsWith('/api/webhook/user/')) {
      const userId = req.url.split('/').pop();
      if (!userPosts[userId]) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json({ userId, posts: userPosts[userId] });
    }
    // Tüm kullanıcılar ve verileri
    const userList = Object.keys(userPosts);
    res.status(200).json({ userCount: userList.length, users: userList, data: userPosts });
  } else if (req.method === 'PUT') {
    // Yeni kullanıcı sırası almak için
    const userList = Object.keys(userPosts);
    const newId = (userList.length + 1).toString();
    userPosts[newId] = [];
    res.status(200).json({ userId: newId });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
