require('dotenv').config(); 
const express = require('express'); 
const AuthAccountMiddleWare = require('../../modules/MiddleWear/AuthAccountMiddleWare.js'); 
const CreateMongoDbConnection = require('../../CreateMongoDbConnection.js'); 

const validator = require('validator'); 
const USER_COLLECTION = process.env.USER_COLLECTION; 
const RATE_LIMIT_COLLECTION = process.env.RATE_LIMIT_COLLECTION;
const generateApiKey = require('../../modules/generateApiKey.js');  

const router = express.Router(); 

router.use(AuthAccountMiddleWare);

router.post('/delete/user', async(req, res)=>{ 
  try{

    const MongoClient = await CreateMongoDbConnection(); 
    const Db = await MongoClient.db(); 
    const UsersCollection = Db.collection(USER_COLLECTION); 

    const DeletedUser = await UsersCollection.deleteOne({apiKey: req.users.apiKey}); 

    return res.status(204).json({
      message: 'Successfully deleted user', 
      deletedUser: DeletedUser 
    }); 
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    }); 
  }
})

router.post('/update/apiKeys', async(req, res)=>{ 
  const currentApiKey = req.user.apiKey; 
  try{
    const MongoClient = await CreateMongoDbConnection(); 
    const Db = await MongoClient.db(); 
    const UsersCollection = await Db.collection(USER_COLLECTION); 
    const ApiKeyCollection = await Db.collection(RATE_LIMIT_COLLECTION); 

    const CurrentUserData = await UsersCollection.findOne({apiKey: currentApiKey}); 
    if(!CurrentUserData) return res.status(400).json({error: "No user found"}); 

    const newApikey = generateApiKey(); 

    const updatedUserData = await UsersCollection.updateOne({apiKey: currentApiKey}, {$set: { 
      apiKey: newApikey
    }}); 

    const CurrentRateLimit = await ApiKeyCollection.findOne({_id: currentApiKey}); 



    const date = new Date(); 
    date.setTime(date.getTime() + 32 * 24 * 60 * 60 * 1000); // Add 32 days in ms
    
    const NewRateLimitDocu = await ApiKeyCollection.insertOne({
      _id: newApikey, 
      counter: CurrentRateLimit?.counter ? CurrentRateLimit.counter : 0, 
      expirationDate: date
    })
    
    // Check if CurrentRatelimit exists or not, if it does then delete it, else ignore it to prevent errors. 
    if(CurrentRateLimit){ 
      const deletedRateLimit = await ApiKeyCollection.deleteOne({_id: currentApiKey}); 
    }

    return res.status(200).json({ 
      message: "Successfully updated Apikey", 
      updatedData: updatedUserData, 
      apiKey: newApikey
    });
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    }); 
  }
})

router.post('/update/Username', async(req, res)=>{ 
  const { username } = req.body; 
  if(!req.body || !req.user){ 
    return res.status(400).json({error: "User must be authenticated"}); 
  }; 
  try{
    if(typeof username !== 'string'){ 
      return res.status(400).json({error: "Incorrect username, it must be a string"})
    }; 
    if(username.trim().length < 3){ 
      return res.status(400).json({error: "Username must be greater then 3 characters"}); 
    }

    const MongoClient = await CreateMongoDbConnection(); 
    const Db = await MongoClient.db();
    const UsersCollection = await Db.collection(USER_COLLECTION); 

    const IsUsernameTaken = await UsersCollection.findOne({username: username}); 
    if(IsUsernameTaken) return res.status(400).json({error: "Username already taken"}); 
    
    const UpdatedUser = await UsersCollection.updateOne({apiKey: req.user.apiKey}, {$set: { 
      username: username
    }}); 

    return res.status(200).json({ 
      message: "Successfully updated username", 
      updatedData: UpdatedUser
    }); 
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    })
  }
})

router.post('/update/Email', async(req, res)=>{ 
  if(!req.body || !req.user){ 
    return res.status(400).json({error: "User must be authenticated"})
  }; 
  try{
    const { email } = req.body; 
    if(typeof email !== 'string'){
      return res.status(400).json({error: "Must be a valid Email"}); 
    }

    if(!validator.isEmail(email)){ 
      return res.status(400).json({ 
        error: "Must be a valid email"
      }); 
    }

    const MongoDbClient = await CreateMongoDbConnection(); 
    const Db = await MongoDbClient.db(); 
    const UserCollection =  await Db.collection(USER_COLLECTION); 
    const CurrentUserData = await UserCollection.findOne({apiKey: req.user.apiKey}); 
    if(CurrentUserData.email === email){ 
      return res.status(400).json({error: "User must provide a new email, cannot update to current email"})
    }

    const CurrentUser = UserCollection.updateOne({apiKey: req.user.apiKey}, {$set: { 
      email: email
    }}); 

    return res.status(200).json({
      message: "Updated User Successfully", 
      updatedData: CurrentUser
    }); 

  }catch(error){ 
    console.error('[ERROR UPDATING EMAIL]: ', error.message); 
    return res.status(500).json({
      error: error.message
    })
  }
})

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
        let counter; 
        if(CurrentRateLimitData?.counter){ 
          counter = CurrentRateLimitData.counter; 
        }else{ 
          counter = 0; 
        }
 
        // Send ApiUsuage 
        console.log("Current User Exists: ", apiKey);
        console.log("Current Rate usuage: ", counter, " For Account ", apiKey); 
        console.log('RATE_LIMIT-COLLECTION: ', RATE_LIMIT_COLLECTION); 
        let limit; 

        if(type === 'default'){ 
          limit = 2500 
        }else if(type === 'trial'){ 
          limit = 1500 
        }else if(type === 'Tier 1'){ 
          limit = 4500
        }; 
        if(!counter){ 
          return socket.emit('Usage_Data', ({usage: counter, limit}))  
        }else{ 
          return socket.emit('Usage_Data', ({usage: counter, limit}))
        }
        
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