const CreateMongoDbConnection = require('../../CreateMongoDbConnection.js');
const CreateRedisConnection = require("../../CreateConnectionToRedis.js"); 

const AuthWithApiKey = async (req, res, next) => {
  const apiKey = req.headers['authorization']?.replace('Bearer', '').trim();
  const RedisClient = await CreateRedisConnection(); 

  if (!apiKey) {
    return res.status(401).json({ error: "Missing API Key" });
  }

  try {
    const client = await CreateMongoDbConnection();
    const db = client.db(); 
    const collection = db.collection('Users');

    const user = await collection.findOne({ apiKey });
    const username = user.username; 
    const key = `verified:${username}`; 
    const isVerified = await RedisClient.get(key); 
    if(isVerified !== 'true'){ 
      return res.status(400).json({ 
        error: 'verify your email before using api key'
      })
    } 


    if (!user) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    req.user = user; 
    next();
  } catch (err) {
    return res.status(500).json({ error: "Server error validating API key" });
  }
};

module.exports = AuthWithApiKey;
