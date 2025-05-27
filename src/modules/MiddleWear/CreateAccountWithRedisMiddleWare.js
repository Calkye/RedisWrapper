const CreateRedisDbConnection = require('../../CreateConnectionToRedis'); 

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



module.exports = CreateAccountWithRedisMiddleWare; 