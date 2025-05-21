const express = require('express'); 

// Require Middle Wear 
const CreateTempAccountMiddleWear = require('../modules/MiddleWear/CreateTempAccountMiddleWear.js'); 


const router = express.Router(); 


router.post('/createAccount', CreateTempAccountMiddleWear, async(req, res)=>{ 
  try{
    const {username, password } = req.body ?? {}; 


    // Temp account check is handled by middleWear.   
     return res.status(200).json({
        message: "Account Created and Cached"
      })
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    })
  }
})




module.exports = router; 