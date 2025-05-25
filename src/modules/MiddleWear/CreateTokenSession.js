require('dotenv').config(); 
const jwt = require('jsonwebtoken'); 


const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || '2c380296672e95e9706379c6006de54937bb63ce781bf64313f339c6e438ed4e9e2f309433437d6c02018d0407c75c8aa97562d426c55ac6f66cbf1c232ada74'; 

const CreateToken = (username)=>{
  try{
    return new Promise(async (resolve, reject)=>{ 
      try{ 
        const Token = jwt.sign({username: username}, REFRESH_TOKEN_SECRET); 

        return resolve(Token); 
      }catch(error){ 
        return reject(new Error(error.message || "Unknown error occured")); 
      }
    })


  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}


const CreateTokenSession = async(req, res, next)=>{ 
  try{
    const { username, tempAccount } = req.body ?? req.user ?? {};
    const Token = await CreateToken(username);
    if(tempAccount){ 
      res.cookie('x-refresh-token', Token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'Strict', 
      maxAge: 7 * 24 * 60  * 60 * 1000 
    });
    
      return next();  
    }

    res.cookie('x-refresh-token', Token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'Strict', 
      maxAge: 32 * 24 * 60  * 60 * 1000
    });

    return next(); 
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}

module.exports = { 
  CreateToken, 
  CreateTokenSession
};  