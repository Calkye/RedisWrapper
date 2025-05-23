const express = require('express'); 
const router = express.Router(); 

const AccountMiddleWear = require('../../modules/MiddleWear/AccountMiddleWear.js'); 
const CreateConnectionToRedis = require('../../CreateConnectionToRedis.js'); 

router.use(AccountMiddleWear); 
 

router.post('/CacheRoute', async(req, res)=>{
  const { username } = req.user; 
  const cacheData = req.body.data;
  const id = String(req.body.id);  
  const RedisClient = await CreateConnectionToRedis(); 

  if(!id){ 
    return res.status(400).json({ 
      error: "please provide a custom Id tag under req.body.id"
    }); 
  }

  try{
    const Key = `username:${username}:type:data:id:${id}`;
    const valueToCache = typeof cacheData === 'string' ? cacheData : JSON.stringify(cacheData); 
    await RedisClient.set(Key, valueToCache);

    return res.status(200).json({ 
      message: "Successfully Cached data", 
      Key: Key, 
      cacheData: cacheData
    });
  }catch(error){
    return res.status(500).json({ 
      error: error.message
    }); 
  }
});

router.put('/CacheRoute', async(req, res)=>{ 
  const RedisClient = await CreateConnectionToRedis(); 

  const { username } = req.user;
  const cacheData = req.body.data; 
  const id = String(req.body.id); 
  if(!id) return res.status(400).json({error: "please provide a custom Id tage under req.body.id"})
  
  try{  
    const Key = `username:${username}:type:data:id:${id}`;

    const CurrentData = await RedisClient.get(Key); 

    if(!CurrentData){ 
      return res.status(400).json({ 
        error: "data not found"
      }); 
    }; 

    const valueToCache = typeof cacheData === 'string' ? cacheData : JSON.stringify(cacheData); 
    await RedisClient.set(Key, valueToCache);
    
    return res.status(200).json({ 
      message: "Successfully updated cached data", 
      Key, 
      cacheData
    }); 
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    }); 
  }
});


router.post('/CacheRoute/fetch', async (req, res) => {
  const RedisClient = await CreateConnectionToRedis(); 
  const { username } = req.user;
  const id = String(req.body.id); 

  if (!id) {
    return res.status(400).json({
      error: "please provide a custom Id tag under req.body.id"
    });
  }

  try {
    const Key = `username:${username}:type:data:id:${id}`;
    const CurrentData = await RedisClient.get(Key);

    if (!CurrentData) {
      return res.status(404).json({
        error: "No data found"
      });
    }

    return res.status(200).json({
      message: "Found data",
      id: id,
      data: JSON.parse(CurrentData) // optionally parse if you stored JSON
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});



module.exports = router; 