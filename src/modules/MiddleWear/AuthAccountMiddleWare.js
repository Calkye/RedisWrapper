require('dotenv').config(); 
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 

const CreateMongoDbConnection = require('../../CreateMongoDbConnection.js'); 
const CreateRedisDbConnection = require('../../CreateConnectionToRedis.js'); 

const { CreateToken } = require('./CreateTokenSession.js');  

const USER_COLLECTION = process.env.USER_COLLECTION || "Users"; 


const AuthAccountMiddleWare = async(req, res, next)=>{ 
  const { username, email, password } = req.body ? req.body : {} ;
   


  const MongoClient = await CreateMongoDbConnection(); 
  const db = await MongoClient.db();
  
  const UserCollection = db.collection(USER_COLLECTION);  
  
  try{
    const REFRESH_TOKEN_SECRET= process.env.REFRESH_TOKEN_SECRET; 
    const refreshToken = req.cookies['x-refresh-token']; 
    
    const rawHeader = req.headers['authorization'] || '';
    const apiKey = rawHeader.replace(/bearer\s?/i, '').trim();

    let CurrentUserData; 

    if(apiKey){ 
      CurrentUserData = await UserCollection.findOne({ 
        apiKey
      });
      if(!CurrentUserData || CurrentUserData.apiKey !== apiKey){ 
        return res.status(400).json({error: "Invalid credentials"}) 
      }
      req.user = CurrentUserData;

      return next();
      
    }else if(username && email){  
      
      CurrentUserData = await UserCollection.findOne({ 
        username, 
        email
      });  

      if(!CurrentUserData){ 
        return res.status(404).json({ 
          error: "No user found"
        }); 
      }; 

    }else{ 
      return res.status(400).json({ 
        error: "Missing credentials"
      }); 
    }


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

module.exports = AuthAccountMiddleWare; 