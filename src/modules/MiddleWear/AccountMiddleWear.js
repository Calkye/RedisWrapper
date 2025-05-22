const VerifyTempUserWithEmailAndPassword = require('../caching/VerifyTempUserWithEmailAndPassword.js'); 



const AccountMiddleWear = async(req, res, next)=>{ 
  const {username, password} = req.body;
  if(!username || !password){ 
    return res.status(400).json({success: false, message: "Username and password required"}); 
  }
  try{
    const {success, message, user} = await VerifyTempUserWithEmailAndPassword(username, password); 

    if(!success){ 
      return res.status(401).json({success: success, message: message}); 
    }; 

    req.user = user;

    next(); 
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  } 
}


module.exports = AccountMiddleWear; 