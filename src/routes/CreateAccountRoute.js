const express = require('express'); 

// Require Middle Wear 
const CreateTempAccountMiddleWear = require('../modules/MiddleWear/CreateTempAccountMiddleWear.js'); 

const CreateAccountWithEmailAndPassword = require('../modules/database/CreateAccountWithEmailAndPassword.js');
const { CreateTokenSession } = require('../modules/MiddleWear/CreateTokenSession.js'); 
const generateApiKey = require('../modules/generateApiKey.js'); 


const router = express.Router(); 


router.post('/createAccount', CreateTokenSession, CreateTempAccountMiddleWear, async(req, res)=>{ 
  try{
    const {username, password, tempAccount, email } = req.body ?? {}; 
    const apiKey = generateApiKey(); 
    
    const NewUser = await CreateAccountWithEmailAndPassword(username, password, email, tempAccount, apiKey); 
    if(NewUser.status === 201){
      return res.status(201).json({
        message: NewUser.message, 
        apiKey
      });
     }
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    })
  }
}); 




module.exports = router; 