require('dotenv').config(); 
const express = require('express'); 
const AuthAccountMiddleWare = require('../../modules/MiddleWear/AuthAccountMiddleWare.js'); 
const CreateMongoDbConnection = require('../../CreateMongoDbConnection.js'); 

const USER_COLLECTION = process.env.USER_COLLECTION; 
const RATE_LIMIT_COLLECTION = process.env.RATE_LIMIT_COLLECTION; 

const router = express.Router(); 

router.use(AuthAccountMiddleWare);

router.post('/apiKey', async(req, res)=>{ 
  if(!req.user || !req.user.apiKey) return res.status(403).json({error: "Auth failed"}); 
  return res.status(200).json({ 
    apiKey: req.user.apiKey
  }); 
}); 

const ApiUsageUpdate = async(io)=>{ 
  try{
    io.on('connection', (socket)=>{ 
      socket.on('requestUsage', async({apiKey})=>{ 
        console.log('Requested usage for account', apiKey); 
        const MongoClient = await CreateMongoDbConnection(); 
        const db = await MongoClient.db(); 
        const UsersCollection = await db.collection(USER_COLLECTION); 
        const RateLimitCollection = await db.collection(RATE_LIMIT_COLLECTION); 

        const CurrentUser = await UsersCollection.findOne({apiKey: apiKey}); 
        const { type } = CurrentUser; 

        const id = `Bearer ${apiKey}`
        const CurrentRateLimitData = await RateLimitCollection.findOne({_id: apiKey}); 

        if(!CurrentUser){ 
          return socket.emit('requestError', {status: 400, error: "User not found"}); 
        }
        const { counter } = await CurrentRateLimitData; 
        // Send ApiUsuage 
        console.log("Current User Exists: ", apiKey);
        console.log("Current Rate usuage: ", counter); 
        console.log('RATE_LIMIT-COLLECTION: ', RATE_LIMIT_COLLECTION); 
        let limit; 

        if(type === 'default'){ 
          limit = 2500 
        }else if(type === 'trial'){ 
          limit = 1500 
        }else if(type === 'Tier 1'){ 
          limit = 4500
        }; 
        socket.emit('Usage_Data', ({usage: counter, limit}))
      })


    })

  }catch(error){ 
    io.emit('error', error); 
  }
}



module.exports = { 
  router,
  ApiUsageUpdate
}; 