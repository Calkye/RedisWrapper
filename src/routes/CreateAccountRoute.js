require('dotenv').config(); 

const validator = require('validator'); 
const express = require('express'); 
const rateLimit = require('express-rate-limit'); 
const jwt = require('jsonwebtoken'); 



const CreateAccountWithRedisMiddleWare = require('../modules/MiddleWear/CreateAccountWithRedisMiddleWare.js'); 
const hashPassword = require('../modules/hashPassword.js'); 

const CreateAccountWithEmailAndPassword = require('../modules/database/CreateAccountWithEmailAndPassword.js');
const { CreateTokenSession } = require('../modules/MiddleWear/CreateTokenSession.js'); 
const generateApiKey = require('../modules/generateApiKey.js'); 

const { sendVerificationEmail, sendApiEmail} = require('../modules/caching/SendVerificationEmail.js'); 

const CreateConnectionToRedis = require('../CreateConnectionToRedis.js');
const CreateMongoDbConnection = require('../CreateMongoDbConnection.js'); 

const router = express.Router(); 
router.use(rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes 
  max: 5, // Limit each ip to 5 requests 
  message: { 
    error: "Too many requests. Please try again later"
  }, 
  standardHeaders: true, 
  legacyHeaders: false
})); 


const VERIFICATION_SECRET = process.env.EMAIL_VERIFY_SECRET;
const USER_COLLECTION = process.env.USER_COLLECTION || "Users"; 


router.post('/createAccount', CreateAccountWithRedisMiddleWare, async(req, res)=>{ 
  try{
  const { username, email, password, tempAccount } = req.body; 
  if(!username || !email || !password){ 
    return res.status(400).json({ 
      error: "please provide valid input"
    }); 
  }; 
  
  if(!validator.isEmail(email)){ 
    return res.status(400).json({error: "Invalid emai format"}); 
  }; 

  if(typeof username !== 'string' || username.trim().length < 3){ 
    return res.status(400).json({error: "Username must be at least 3 characters"}); 
  }

  
  const MongoClient = await CreateMongoDbConnection(); 
  const db = await MongoClient.db(); 
  const UserCollection = await db.collection(USER_COLLECTION); 
    
  const existingUser = await UserCollection.findOne({ 
    $or: [{ username }, { email }] 
  });
  if(existingUser){
    if(existingUser.username === username) return res.status(400).json({ error: "username already taken" });
    if(existingUser.email === email) return res.status(400).json({ error: "email already taken" });
  }
    let UserData; 

  UserData = await UserCollection.findOne({username, email}); 
  if(UserData) return res.status(400).json({error: "User already exists"}); 

  const hashedPassword = await hashPassword(password); 
  const normalisedEmail = email.toLowerCase(); 

  const parsedData = JSON.parse(req.user_redis); 

  const newUser = await UserCollection.insertOne({ 
    username: username, 
    email: normalisedEmail, 
    password: hashedPassword, 
    tempAccount: tempAccount === true ? true : false,
    type: "default", 
    redis_user: parsedData
  });

  await sendVerificationEmail(username, email); 

  UserData = await UserCollection.findOne({username, email})

  return res.status(200).json({ 
    message: newUser,
    redis_user: req.user_redis, 
    stored_user: UserData //Also Contains stored redis_user 
  }); 

  }catch(error){
    return res.status(500).json({ 
      error: error.message
    }); 
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

  const { username, email: payloadEmail } = payload;

  let RedisClient;
  let mongoClient; 
  try {
    RedisClient = await CreateConnectionToRedis();
    mongoClient = await CreateMongoDbConnection(); 
  } catch (err) {
    console.error("Redis connection failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
  
  try {
    const userGroup = `user:`
    const defaultKey = `${userGroup}username:${username}:un_verified`;

    const db = await mongoClient.db(); 
    const UserCollection = await db.collection(USER_COLLECTION); 

    // Early check

    
    const user = await UserCollection.findOne({ username });

    if (!user) {
      return res.status(400).json({
        error: "User not found"
      });
    }

    if (user.verified) {
      return res.status(400).json({
        error: "User is already verified"
      });
    }

    let userDataString = await RedisClient.get(defaultKey);
    let userData = userDataString ? JSON.parse(userDataString) : null;


    if (!userData) {
      const StoredUserData = await UserCollection.findOne({ username }); 
      if (!StoredUserData) { 
        return res.status(400).json({ error: "User not found" }); 
      }
      userData = StoredUserData.redis_user;
    }

    const { email } = userData;     
        // Change user to verified user. 

    // generate a new key setting the user to verified instead of unverified
    const newKey = `${userGroup}:username:${username}:verified`; 


    // Delete the default key and make a new one 
    await RedisClient.del(defaultKey); 
    
    userData.verified = true; 

    // Set the new key to the previous RedisData updating the user to verified 
    await RedisClient.set(newKey, JSON.stringify(userData));  
    
    userData = await RedisClient.get(newKey); 
    const apiKey = generateApiKey();

    await UserCollection.updateOne({username}, {$set: {
      apiKey: apiKey, 
      verified: true, 
      redis_user: userData
    }}); 

    // Send the api email 
    await sendApiEmail(email, apiKey); 
    
    return res.status(200).json({ 
      message: "Your email was verified successfully. An API key has been sent to your email."
    })
  } catch (err) {
    console.error("Redis operation failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;
