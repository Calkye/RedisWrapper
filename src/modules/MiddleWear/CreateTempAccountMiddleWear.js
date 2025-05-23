const CreateTempUserWithEmailAndPassword = require('../caching/CreateTempUserWithEmailAndPassword.js'); 

const CreateTempAccountMiddleWear = async(req, res, next)=>{
  try{
    const { username, password, tempAccount, email} = req.body ?? {}; 

    const {success, message, source } = await CreateTempUserWithEmailAndPassword(username, password, email,  tempAccount); 

    if(!success){ 
      return res.status(400).json({message: message ?? "Unknown error occured"})
    }

    return next(); 
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    })
  }
}



module.exports = CreateTempAccountMiddleWear; 