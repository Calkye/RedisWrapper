
const rateLimit = require('express-rate-limit');
const express = require('express'); 

const router = express.Router(); 

router.use(rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes 
  max: 15, 
  message: {error: "Too many requests. Please try again later"},
  standardHeaders: true, 
  legacyHeaders: false
})); 

const AuthAccountMiddleWare = require('../modules/MiddleWear/AuthAccountMiddleWare.js'); 


router.post('/loginAccount', AuthAccountMiddleWare, async(req, res)=>{
  try{
    // Since Auth Account middleWare attaches user data, we can access both redis data and mongoDb data. 
    
    return res.status(200).json({ 
      message: "Successfully logged in", 
      redis_user: req.user.redis_user, 
      user: req.user
    }); 
  }catch(error){ 
    console.error('[ERROR]: ', error); 
    return res.status(500).json({ 
      error: error.message
    })
  }

})


module.exports = router; 