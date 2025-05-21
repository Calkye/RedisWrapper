const express = require('express'); 

// Require Middle Wear 
const CreateTempAccountMiddleWear = require('../modules/MiddleWear/CreateTempAccountMiddleWear.js'); 


const router = express.Router(); 



router.post('/createAccount/Temp', CreateTempAccountMiddleWear, async(req, res)=>{ 
  try{ 

    // For testing only, put in some actual production code later
    return res.status(200).json({
      message: "Successfully created a temp account"
    })

  }catch(error){ 
    return res.status(500).json({ 
      error: error.memessage
    })
  }
})




module.exports = router; 