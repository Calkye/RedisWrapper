const { createClient } = require('redis');

// Testing Connection using singleton pattern 
// Note: This is for testing only, use a proper SingletTon Class to manage database connections

let RedisClient = null; 

const CreateConnectionToRedis = ()=>{ 
  const env = process.env.DEVELOPMENT_MODE || 'production';

  if(env === 'testing'){ 
    return new Promise(async(resolve, reject)=>{ 
      try{
        if(RedisClient) return resolve(RedisClient); 

        const client = RedisClient = createClient({ 
          url: process.env.REDIS_URL
        });                                                                                       

        await RedisClient.connect(); 

        setImmediate(async()=>{ 
          await client.quit(); 
          if(RedisClient === client){ 
            RedisClient = null; 
          }; 
        });
        
        return resolve(RedisClient); 
      }catch(error){ 
        reject(new Error(error.message)); 
      }
    })
  }

  // Production enviroment 
  return new Promise(async(resolve, reject)=>{ 
    try{
      if(RedisClient !== null){ 
        return resolve(RedisClient); 
      }
      RedisClient = createClient({
        url: process.env.REDIS_URL
      }); 

      await RedisClient.connect();

      return resolve(RedisClient); 
    }catch(error){ 
      console.error('[CONNECTION ERROR]: ', error.message)
      reject(new Error(error)); 
    }
  })
}


module.exports = CreateConnectionToRedis; 