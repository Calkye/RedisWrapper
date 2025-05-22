require('dotenv').config(); 
const jwt = require('jsonwebtoken'); 

const GetTokenHelper = (req)=>{ 
  try{
    const token = req.cookies['x-refresh-token']; 
    return new Promise(async (resolve, reject)=>{ 
      try{
        if(!token){ 
          throw new Error("No refresh token found"); 
        }     
       return resolve(token); 

      }catch(error){ 
        return reject(new Error(error.message || "Unknown error occured"))
      }
    })
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}


const VerifyTokenSession = async(req, res, next)=>{
  const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET; 
  try{
    const Token = await GetTokenHelper(req); 

    jwt.verify(Token, REFRESH_TOKEN_SECRET, (error, decoded)=>{ 
      if(error){ 
        return res.status(400).json({ 
          error: "Token is invalid "
        }); 
      }; 


      req.user = decoded; 
      next(); 
    })
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured");  
  }
}



module.exports = { 
  GetTokenHelper, 
  VerifyTokenSession
}; 