const express = require('express'); 
const router = express.Router(); 

router.post('/verifyAccount', async(req, res)=>{ 
  const {username, password } = req.body ?? {}; 
  


})


module.exports = router; 