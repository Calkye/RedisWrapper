const { createClient } = require('redis');

let RedisClient = null; 

const CreateConnectionToRedis = ()=>{ 
  const env = process.env.DEVELOPMENT_MODE || 'production';

  if(env === 'testing'){ 
    return new Promise(async(resolve, reject)=>{ 
      try{
        if(RedisClient) return resolve(RedisClient); 

        RedisClient = createClient({
          username: process.env.REDIS_USERNAME,
          password: process.env.REDIS_PASSWORD,
          socket: {
              host: process.env.REDIS_HOST,
              port: process.env.REDIS_PORT,
              tls: true
          }
        });                                                                                      

        await RedisClient.connect(); 
        
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
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT, 
            tls: true
        }
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