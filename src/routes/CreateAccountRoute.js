require('dotenv').config(); 
const express = require('express'); 
const jwt = require('jsonwebtoken'); 
const VERIFICATION_SECRET = process.env.EMAIL_VERIFY_SECRET;

const CreateTempAccountMiddleWear = require('../modules/MiddleWear/CreateTempAccountMiddleWear.js'); 
const CreateAccountWithEmailAndPassword = require('../modules/database/CreateAccountWithEmailAndPassword.js');
const { CreateTokenSession } = require('../modules/MiddleWear/CreateTokenSession.js'); 
const generateApiKey = require('../modules/generateApiKey.js'); 

const { sendVerificationEmail, sendApiEmail} = require('../modules/caching/SendVerificationEmail.js'); 

const CreateConnectionToRedis = require('../CreateConnectionToRedis.js');
const CreateMongoDbConnection = require('../CreateMongoDbConnection.js'); 

const router = express.Router(); 

router.post('/createAccount', CreateTokenSession, CreateTempAccountMiddleWear, async (req, res) => { 
  try {
    const { username, password, tempAccount, email } = req.body ?? {}; 
    const apiKey = generateApiKey(); 


    await sendVerificationEmail(username, email);
    const NewUser = await CreateAccountWithEmailAndPassword(username, password, email, tempAccount, apiKey); 
    
    if (NewUser.status === 201) {
      return res.status(201).json({
        message: NewUser.message, 
        apiKey
      });
    }

  } catch (error) { 
    return res.status(500).json({ error: error.message });
  }
}); 

router.get('/verify-email', async (req, res) => {
  const { token } = req.query; // <-- get from query

  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  let payload;
  try {
    payload = jwt.verify(token, VERIFICATION_SECRET);
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  const { username } = payload;

  let client;
  let mongoClient; 
  try {
    client = await CreateConnectionToRedis();
    mongoClient = await CreateMongoDbConnection(); 
  } catch (err) {
    console.error("Redis connection failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }

  try {
    const isAlreadyVerified = await client.get(`verified:${username}`);
    if (isAlreadyVerified) {
      return res.status(200).json({ message: `${username} is already verified.` });
    }
    const db = await mongoClient.db(); 
    const UserCollection = db.collection('Users'); 
    const user = await UserCollection.findOne({ username: username }); 

    const {email, apiKey} = user || {}; 
    await sendApiEmail(email, apiKey); 
    


    const storedToken = await client.get(`verify:${username}`);
    if (!storedToken || storedToken !== token) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    await client.set(`verified:${username}`, 'true');
    await client.del(`verify:${username}`);

    return res.status(200).json({ 
      message: `${username} has been successfully verified`, 
      apiKey
    });

  } catch (err) {
    console.error("Redis operation failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;
