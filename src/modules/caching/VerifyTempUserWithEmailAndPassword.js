require('dotenv').config(); 

const CreateConnectionToRedis = require('../../CreateConnectionToRedis.js'); 

const bcrypt = require('bcrypt'); 



const VerifyTempUserWithEmailAndPassword = async(username, password )=>{ 
  if(!username || !password){ 
    return { success: false, message: "Username and Password are required"}; 
  }
  try{
    const client = await CreateConnectionToRedis();
    const key = `user:${username}`; 
    const userData = await client.get(key); 
    if(!userData){ 
     return { success: false, message: "User not found"};  
    }

    const user = JSON.parse(userData); 

    const passwordMatch = await bcrypt.compare(password, user.password); 
    if(!passwordMatch){ 
      return {success: false, message: "Incorrect password"}; 
    }
    return { success: true, message: "User Verified", user }; 
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}


module.exports = VerifyTempUserWithEmailAndPassword; 

