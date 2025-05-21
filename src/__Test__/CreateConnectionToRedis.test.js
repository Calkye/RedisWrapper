const { createClient } = require('redis');

require('dotenv').config(); 

let RedisClient = null; 

// Difference between Production and Testing enviroments, in testing we close the connection after a request. In production we keep the connection open. 

const sleep = (ms)=> new Promise((resolve)=> setTimeout(resolve, ms)); 

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

        RedisClient = client; 
        
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


describe('testing', ()=>{ 
  beforeEach(()=>{
    RedisClient = null; 
  })

  describe('testing enviroment', ()=>{ 
    it('Should create a connection successfully in the test enviroment and quit after a test', async()=>{  
      process.env.DEVELOPMENT_MODE = 'testing'; 
      const Client1 = await CreateConnectionToRedis();

      await sleep(50);

      const Client2 = await CreateConnectionToRedis();

      expect(Client1).not.toBe(Client2);  

    })

  });


  describe('Production enviroment', ()=>{ 
    it('should keep the connection alive after creating a connection and reuse it', async()=>{ 
      process.env.DEVELOPMENT_MODE = 'production'; 
      const client1 = await CreateConnectionToRedis(); 

      expect(client1).toBeDefined(); 

      const client2 = await CreateConnectionToRedis(); 

      expect(client1).toBe(client2); 

      await client1.quit(); 
    }, 10000)
  })
})