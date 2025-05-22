require('dotenv').config(); 

const VerifyTempUserWithEmailAndPassword = require('../caching/VerifyTempUserWithEmailAndPassword.js'); 
const jwt = require('jsonwebtoken'); 


const AccountMiddleWear = async(req, res, next)=>{ 
  const {username, password} = req.body;
  const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;   
  const refreshToken = req.cookies['x-refresh-token']; 

  if(!username || !password){ 
    return res.status(400).json({success: false, message: "Username and password required"}); 
  }
  try{
    const {success, message, user} = await VerifyTempUserWithEmailAndPassword(username, password); 

    if(!success){ 
      return res.status(401).json({success: success, message: message}); 
    }; 


    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (error, decoded)=>{ 
      if(error) return res.status(error.status).json({error: error.message}); 
      req.user = user; 
      return next();
    }); 
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  } 
}


module.exports = AccountMiddleWear; 