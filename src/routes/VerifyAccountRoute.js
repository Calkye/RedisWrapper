const express = require('express'); 
const router = express.Router(); 

const AccountMiddleWear = require('../modules/MiddleWear/AccountMiddleWear.js'); 
const { CreateToken } = require('../modules/MiddleWear/CreateTokenSession.js'); 
const VerifyAccountWithEmailAndPassword = require("../modules/database/VerifyAccountWithEmailAndPassword.js"); 
const LoginUserWithEmailAndPassword = require('../modules/database/LoginUserWithEmailAndPassword.js'); 

router.post('/verifyAccount', AccountMiddleWear, async(req, res)=>{ 
  // Now check the details on the database, verify the username and password match before proceeding. 
  const {
    username, 
    password, 
    email
  } = req.body;
  const {success, status, message, UserData} = await VerifyAccountWithEmailAndPassword(username, email, password); 
 
 
  if(!success){ 
    return res.status(status).json({
      error: message
    }); 
  }

  return res.status(200).json({ 
    user: UserData, 
    message: message
  }); 
})

router.post('/loginAccount', async(req, res)=>{
  try{
    const { 
      username, 
      password, 
      email
    } = req.body; 
    const { success, status, message, user} = await LoginUserWithEmailAndPassword(username, email, password); 
    const token = await CreateToken(username); 
    res.header('x-refresh-token', token); 
    req.user = user; 


    if(!success){ 
      return res.status(status).json({error: message}); 
    }
    return res.status(status).json({ 
      message: message, 
      user: user, 
      refreshToken: token
    }); 
  }catch(error){ 
    console.error('[ERROR]: ', error); 
    return res.status(500).json({ 
      error: error.message
    })
  }

})


module.exports = router; 