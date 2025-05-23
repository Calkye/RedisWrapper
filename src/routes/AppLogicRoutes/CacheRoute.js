const { v4: uuidv4 } = require('uuid');
const express = require('express');
const router = express.Router();

const AuthWithApiKey = require('../../modules/MiddleWear/AuthWithApiKey.js'); 
const CreateConnectionToRedis = require('../../CreateConnectionToRedis.js');

router.use(AuthWithApiKey); // Adds req.user

// POST - Create new cache entry
router.post('/CacheRoute', async (req, res) => {
  const RedisClient = await CreateConnectionToRedis();
  const { username } = req.user;
  const { key: customKey, data, prefix = '' } = req.body; // custom prefix optional
  const id = customKey || uuidv4();

  try {
    const key = `client:username:${username}:${prefix}${id}`;
    const expectedKeyPrefix = `client:username:${username}:${prefix}`;

    if (!key.startsWith(expectedKeyPrefix)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const value = typeof data === 'string' ? data : JSON.stringify(data);
    await RedisClient.set(key, value);

    return res.status(200).json({
      message: "Successfully cached data",
      key,
      data,
      id
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT - Update existing cache entry
router.put('/CacheRoute', async (req, res) => {
  const RedisClient = await CreateConnectionToRedis();
  const { username } = req.user;
  const { data, id, prefix = '' } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {
    const key = `client:username:${username}:${prefix}${id}`;
    const expectedKeyPrefix = `client:username:${username}:${prefix}`;

    if (!key.startsWith(expectedKeyPrefix)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existing = await RedisClient.get(key);
    if (!existing) {
      return res.status(404).json({ error: "Data not found" });
    }

    const value = typeof data === 'string' ? data : JSON.stringify(data);
    await RedisClient.set(key, value);

    return res.status(200).json({
      message: "Successfully updated cached data",
      key,
      data
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST - Fetch a cache entry
router.post('/CacheRoute/fetch', async (req, res) => {
  const RedisClient = await CreateConnectionToRedis();
  const { username } = req.user;
  const { id, prefix = '' } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {
    const key = `client:username:${username}:${prefix}${id}`;
    const cached = await RedisClient.get(key);

    if (!cached) {
      return res.status(404).json({ error: "No data found" });
    }

    return res.status(200).json({
      message: "Data fetched successfully",
      id,
      data: JSON.parse(cached)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE - Delete a cache entry
router.delete('/CacheRoute', async (req, res) => {
  const RedisClient = await CreateConnectionToRedis();
  const { username } = req.user;
  const { id, prefix = '' } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {
    const key = `client:username:${username}:${prefix}${id}`;
    const expectedKeyPrefix = `client:username:${username}:${prefix}`;

    if (!key.startsWith(expectedKeyPrefix)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await RedisClient.del(key);
    if (result === 0) {
      return res.status(404).json({ error: "Key not found or already deleted" });
    }

    return res.status(200).json({
      message: "Successfully deleted key",
      id,
      key
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST - Get all keys under a user prefix
router.post('/CacheRoute/all', async (req, res) => {
  const redisClient = await CreateConnectionToRedis();
  const { username } = req.user;
  const { key: prefix = '' } = req.body; // prefix to scan for

  try {
    const pattern = `client:username:${username}:${prefix}*`;

    let cursor = '0'; 
    const keys = [];

    do {
      const reply = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });

      cursor = reply.cursor;
      keys.push(...reply.keys);
    } while (cursor !== '0');

    if (keys.length === 0) {
      return res.json([]);
    }

    const values = await Promise.all(
      keys.map(async key => {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      })
    );

    return res.status(200).json(values.filter(Boolean));
  } catch (err) {
    console.error('[ERROR in /CacheRoute/all]:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
