require('dotenv').config(); 

const validator = require('validator'); 
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 

const cookieParser = require('cookie-parser');
     
const CreateMongoDbConnection = require('../CreateMongoDbConnection.js'); 
const CreateRedisDbConnection = require('../CreateConnectionToRedis.js'); 

const express = require('express'); 
const app = express(); 

app.use(cookieParser()); 
app.use(express.json()); 

const request = require('supertest'); 

if(!process.env.REFRESH_TOKEN_SECRET){ 
  throw new Error("REFRESH_TOKEN_SECRET must be set in enviroment"); 
}; 

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET; 

const USER_COLLECTION = process.env.USER_COLLECTION || "Users"; 


const CreateAccountWithRedisMiddleWare = async(req, res, next)=>{ 
  const { username, email, tempAccount } = req.body; 
  if(!username && !email){ 
    return res.status(400).json({ 
      error: "user data is required, please provide all required fields"
    })
  }
  
  try{
    const RedisClient = await CreateRedisDbConnection(); 
    // Add in check to see if user already exists; 

    // User Key 

    let EXPIRE_IN_SECONDS; 
    const date = new Date(); 
    if(tempAccount){ 
      date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
      EXPIRE_IN_SECONDS = 7 * 24 * 60 * 60  // 7 days ahead 
    }else{ 
      date.setTime(date.getTime() + 32 * 24 * 60 * 60 * 1000); // 32 days ahead
      EXPIRE_IN_SECONDS = 32 * 24 * 60 * 60
    }; 
    
    const userGroup = `user:`
    const defaultKey = `${userGroup}username:${username}:un_verified`; 
    const userData = await RedisClient.get(defaultKey); 

    if(userData){ 
      return res.status(400).json({ 
        error: "User already exists in database"
      }); 
    }; 

    const value = { 
      username: username, 
      email: email, 
      tempAccount: tempAccount, // Will be dymanic to tempAccount as it's a truthy value  
      expiresIn: date, // expire in 7 or 32 days
      verified: false
    }; 

    
    await RedisClient.set(defaultKey, JSON.stringify(value), 'EX', EXPIRE_IN_SECONDS).catch((error)=>{
      throw new Error(error?.message || "Unknown error occured"); 
    }); 

    req.user_redis = value; 
    next(); 
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    })
  }
}



const AuthAccountMiddleWear = async(req, res, next)=>{ 
  const { username, email, password } = req.body; 

  if(!username || !email || !password){ // Provide the check here to prevent unessesarcy db connections
    return res.status(400).json({
      error: "Authentication failed"
    }); 
  }
  const MongoClient = await CreateMongoDbConnection(); 
  const db = await MongoClient.db();
  
  const UserCollection = db.collection(USER_COLLECTION);  
  
  try{
    const REFRESH_TOKEN_SECRET= process.env.REFRESH_TOKEN_SECRET; 
    const refreshToken = req.cookies['x-refresh-token']; 
    
    const rawHeader = req.headers['authorization'] || '';
    const apiKey = rawHeader.replace(/bearer\s?/i, '').trim();

    
    const CurrentUserData = await UserCollection.findOne({ 
      username,     
      email
    }); 

    if(!CurrentUserData){ 
        return res.status(404).json({ 
          error: "No user found"
        }); 
    }; 

    const {username: savedUsername, password: savedPassword, email: savedEmail, apiKey: savedApikey } = CurrentUserData; 

    // Eealy password check 
    const isMatch = await bcrypt.compare(password, savedPassword); 
    if(!isMatch) return res.status(400).json({error: "Auth failed"}); 

    if(!apiKey || !refreshToken){
      // Generate AuthToken and Grab api key 
      const newToken = await CreateToken(username); 

      res.cookie('x-refresh-token', newToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict'
      })


      req.user = CurrentUserData; 

      if(!apiKey && savedApikey){
        res.header('authorization', `bearer ${savedApikey}`)
      }
      return next(); 
    };

    // Api key and refresh token are provided so authenticate as normal 
    if(apiKey !== savedApikey){ 
      return res.status(400).json({ 
        error: "Auth failed"
      }); 
    }

    try{

      const decoded = await jwt.verify(refreshToken, REFRESH_TOKEN_SECRET); 
      req.user = CurrentUserData; 
      return next();

    }catch(error){

      if(error.name === 'TokenExpiredError'){ 
        const newRefreshToken = await CreateToken(username); 
        res.cookie('x-refresh-token', newRefreshToken, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'strict'
        });

        req.user = CurrentUserData; 
        return next(); 
      
      }
      
      return res.status(400).json({error: "Auth failed"}); 
    
    }
  }catch(error){
    console.error('[ERROR]: ', error.message || "Unknown error occured"); 
    return res.status(500).json({ 
      error: error.message
    })
  } 
}


const hashPassword = async(password)=>{ 
  const rawRounds = process.env.BCRYPT_ROUNDS || 10;
  const saltRounds = parseInt(rawRounds, 10); 
  if(isNaN(saltRounds)){ 
    throw new Error('Invalid salt rounds: must be a number')
  }; 

  const hashedPassword = await bcrypt.hash(password, saltRounds); 

  return hashedPassword; 
}




app.post('/api/createAccount', CreateAccountWithRedisMiddleWare, async(req, res)=>{ 
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
  let UserData; 
  UserData = await UserCollection.findOne({username, email}); 
  if(UserData) return res.status(400).json({error: "User already exists"}); 

  const hashedPassword = await hashPassword(password); 
  const normalisedEmail = email.toLowerCase(); 



  const newUser = await UserCollection.insertOne({ 
    username: username, 
    email: normalisedEmail, 
    password: hashedPassword, 
    tempAccount: tempAccount === true ? true : false,
    type: "default", 
    redis_user: req.user_redis
  });

  
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


// Protected Route 
app.post('/api/login', AuthAccountMiddleWear, async(req, res)=>{
  try{
    // Not much code is needed since auth is handled by the authaccountmiddleware 
    return res.status(200).json({ 
      message: "Successfully logged in"
    }); 
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    })
  }
})









describe('Index.js testing', ()=>{
  const FullAccountCreateEndPoint = '/api/createAccount'; 
  const FullLoginAccountEndPoint = '/api/login'; 

  describe('Route testing', ()=>{ 


    describe('Account', ()=>{ 
      const userBody = { 
        username: "test", 
        password: "email",
        email: "babaocallum@gmail.com", 
        tempAccount: true // free trial
      }

      describe('App account login testing', ()=>{ 
        afterAll(async () => {
          const client = await CreateRedisDbConnection();
          await client.flushDb(); // clears all keys in the current DB
          await client.quit();

          const mongoClient = await CreateMongoDbConnection(); 
          await mongoClient.close();
        }); 


        it('should reject if no user exists', async()=>{ 
          const response = await request(app)
            .post(FullLoginAccountEndPoint)
            .send(userBody); 

          console.log('[LOGIN RESPONSE]: ', response.body); 
          expect(response.status).not.toBe(200); 
        }); 
        it('Should Create an account, then login successfully', async()=>{ 
          await request(app)
            .post(FullAccountCreateEndPoint)
            .send(userBody);

          const response = await request(app)
            .post(FullLoginAccountEndPoint)
            .send(userBody); 

          expect(response.status).toBe(200);
        }); 

        it('Should not create a account if it already exists', async()=>{
          await request(app)
            .post(FullAccountCreateEndPoint)
            .send(userBody); 

          const response = await request(app)
            .post(FullAccountCreateEndPoint)
            .send(userBody); 

          console.log('RESPONSE STATUS]: ', response.status); 
          console.log('[RESPONSE BODY]: ', response.body); 
          expect(response.status).not.toBe(200); 
          expect(response.status).toBe(400);
        }); 

        it('Should not create a account if a invalid email is provided', async()=>{ 
          const client = await CreateRedisDbConnection();
          await client.flushDb(); // clears all keys in the current DB


          const response = await request(app)
            .post(FullAccountCreateEndPoint)
            .send({
              ...userBody, 
              email: "someNoneValidEmail"
            }); 

          console.log('[RESPONSE BODY]: ', response.body); 
          
          expect(response.status).not.toBe(200); 
        })

      }); 

    })
  })
})