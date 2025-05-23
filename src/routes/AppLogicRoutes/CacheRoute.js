const express = require('express');
const router = express.Router();

const AccountMiddleWear = require('../../modules/MiddleWear/AccountMiddleWear.js');
const CreateConnectionToRedis = require('../../CreateConnectionToRedis.js');

router.use(AccountMiddleWear); // Adds req.user

// POST - Create new cache entry
router.post('/CacheRoute', async (req, res) => {
  const RedisClient = await CreateConnectionToRedis();
  const { username } = req.user;
  const { data, id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {
    const key = `username:${username}:type:data:id:${id}`;

    const expectedKeyPrefix = `username:${req.user.username}:type:data:id:`;
    if (!key.startsWith(expectedKeyPrefix)) {
      return res.status(401).json({ error: "Unauthorized" });
    }


    const value = typeof data === 'string' ? data : JSON.stringify(data);
    await RedisClient.set(key, value);

    return res.status(200).json({
      message: "Successfully cached data",
      key,
      data
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT - Update existing cache entry
router.put('/CacheRoute', async (req, res) => {
  const RedisClient = await CreateConnectionToRedis();
  const { username } = req.user;
  const { data, id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {
    const key = `username:${username}:type:data:id:${id}`;

    const expectedKeyPrefix = `username:${req.user.username}:type:data:id:`;
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
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {
    const key = `username:${username}:type:data:id:${id}`;
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
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {
    const key = `username:${username}:type:data:id:${id}`;

    const expectedKeyPrefix = `username:${req.user.username}:type:data:id:`;
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

module.exports = router;
