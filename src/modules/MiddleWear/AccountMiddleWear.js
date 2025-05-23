require('dotenv').config(); 

const VerifyAccountWithEmailAndPassword = require('../database/VerifyAccountWithEmailAndPassword.js'); 
const VerifyTempUserWithEmailAndPassword = require('../caching/VerifyTempUserWithEmailAndPassword.js'); 
const jwt = require('jsonwebtoken'); 


const AccountMiddleWear = async(req, res, next)=>{ 
  const {username, password, email} = req.body;
  const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;   
  const refreshToken = req.cookies['x-refresh-token']; 

  if(!username || !password){ 
    return res.status(400).json({success: false, message: "Username and password required"}); 
  }
  try{
    let user; 
    const {success, message, user: tempUser} = await VerifyTempUserWithEmailAndPassword(username, password); 

    // Originally set user to Tempuser. If not Successful, it will be over-ridden to UserData.
    user = tempUser; 

    if(!success){ 
      const {success, status, message, UserData} = await VerifyAccountWithEmailAndPassword(username, email, password); 
      
      if(!success){ 
        return res.status(status).json({
          error: message
        }); 
      }  
      user = UserData; 
    }; 


    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (error, decoded)=>{ 
      if(error) return res.status(401).json({error: error.message}); 
      req.user = user; 
      return next();
    }); 
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  } 
}


module.exports = AccountMiddleWear; 