const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

let limitersCache = null;
let storeCache = null;

// Create MongoStore with URI and collection name (NOT a live collection object)
function createMongoStore() {
  if (storeCache) return storeCache;

  storeCache = new MongoStore({
    uri: process.env.MONGODB_URI, // must be set in .env
    collectionName: 'rateLimits',
    expireTimeMs: 7 * 24 * 60 * 60 * 1000, // 1 week
  });

  return storeCache;
}

function createLimiters() {
  if (limitersCache) return limitersCache;

  const store = createMongoStore();

  const defaultAccountLimiter = rateLimit({
    windowMs: 7 * 24 * 60 * 60 * 1000,
    max: 2500,
    message: { error: "Rate limit exceeded: 2,500 requests per week" },
    keyGenerator: (req) => {
      const auth = req.headers['authorization'];
      if (!auth) return req.ip; // fallback to IP if no auth header
      return auth.replace(/^Bearer\s+/i, '').trim(); // only the key part
    },
    standardHeaders: true,
    legacyHeaders: false,
    store,
  });

  const trialAccountLimiter = rateLimit({
    windowMs: 7 * 24 * 60 * 60 * 1000,
    max: 1000,
    message: { error: "Rate limit exceeded: 1,000 requests per week" },
    keyGenerator: (req) => {
      const auth = req.headers['authorization'];
      if (!auth) return req.ip; // fallback to IP if no auth header
      return auth.replace(/^Bearer\s+/i, '').trim(); // only the key part
    },    
    standardHeaders: true,
    legacyHeaders: false,
    store,
  });

  const tier1AccountLimit = rateLimit({
    windowMs: 7 * 24 * 60 * 60 * 1000,
    max: 4500,
    message: { error: "Rate limit exceeded: 4,500 requests per week" },
    keyGenerator: (req) => {
      const auth = req.headers['authorization'];
      if (!auth) return req.ip; // fallback to IP if no auth header
      return auth.replace(/^Bearer\s+/i, '').trim(); // only the key part
    },    
    standardHeaders: true,
    legacyHeaders: false,
    store,
  });

  limitersCache = { defaultAccountLimiter, trialAccountLimiter, tier1AccountLimit };
  return limitersCache;
}

// Middleware to get account type from API key
const createMongoDbConnection = require('../../CreateMongoDbConnection.js');

async function attachAccountType(req, res, next) {
  try {
    const apiKey = req.headers['authorization']?.replace('Bearer', '').trim();
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const client = await createMongoDbConnection();
    const db = client.db();
    const Users = db.collection('Users');
    const user = await Users.findOne({ apiKey });

    if (!user) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    req.accountType = user.type; // 'default', 'TempAccount', or 'Tier 1'
    console.log('attachAccountType passed for:', apiKey, 'with type', user.type);

    next();
  } catch (err) {
    console.error('Error fetching account type:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware to apply correct limiter
function rateLimiterSelector(req, res, next) {
  const { defaultAccountLimiter, trialAccountLimiter, tier1AccountLimit } = createLimiters();

  if (req.accountType === 'default') {
    return defaultAccountLimiter(req, res, next);
  } else if (req.accountType === 'TempAccount') {
    return trialAccountLimiter(req, res, next);
  } else if (req.accountType === 'Tier 1') {
    return tier1AccountLimit(req, res, next);
  } else {
    return res.status(403).json({ error: 'Unknown account type' });
  }
}

module.exports = {
  attachAccountType,
  rateLimiterSelector,
};
