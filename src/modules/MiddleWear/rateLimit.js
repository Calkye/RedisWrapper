const rateLimit = require('express-rate-limit');
const createMongoDbConnection = require('../../CreateMongoDbConnection.js'); 

const defaultAccountLimiter = rateLimit({
  windowMs: 7 * 24 * 60 * 60 * 1000,
  max: 2500,
  message: { error: "Rate limit exceeded: 2,500 requests per week" },
  standardHeaders: true,
  legacyHeaders: false,
});

const trialAccountLimiter = rateLimit({
  windowMs: 7 * 24 * 60 * 60 * 1000,
  max: 1000,
  message: { error: "Rate limit exceeded: 1,000 requests per week" },
  standardHeaders: true,
  legacyHeaders: false,
});

const tier1AccountLimit = rateLimit({ 
  windowMs: 7 * 24 * 60 * 60 * 1000, 
  max: 4500, 
  message: { error: "Rate limit exceeded: 4500 requets per week"}, 
  standardHeaders: true, 
  legacyHeaders: false, 
}); 

// Middleware to get account type and attach to req
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

    req.accountType = user.type; // e.g. 'default' or 'TempAccount'
    next();
  } catch (err) {
    console.error('Error fetching account type:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware to choose correct rate limiter
function rateLimiterSelector(req, res, next) {
  if (req.accountType === 'default') {
    return defaultAccountLimiter(req, res, next);
  } else if (req.accountType === 'TempAccount') {
    return trialAccountLimiter(req, res, next);
  }else if(req.accountType === 'Tier 1'){ 
   return tier1AccountLimit(req, res, next) 
  }else {
    return res.status(403).json({ error: 'Unknown account type' });
  }
}

module.exports = {
  attachAccountType,
  rateLimiterSelector,
};
