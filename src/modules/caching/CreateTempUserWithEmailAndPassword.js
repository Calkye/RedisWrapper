require('dotenv').config(); 
const CreateConnectionToRedis = require('../../CreateConnectionToRedis.js'); 
const bcrypt = require('bcrypt'); 

const saltrounds = 10 || parseInt(process.env.BCRYPT_ROUNDS); 

const CreateTempUserWithEmailAndPassword = async(username, password, email, tempAccount )=>{
  if(!username || !password || !email){ 
    return { success: false, message: "Username, Password and Email are all required"}; 
  }; 

  if(typeof saltrounds !== "number" || isNaN(saltrounds)){ 
    throw new Error("Invalid salt rounds: must be a number")
  }

  const hashedPassword = await bcrypt.hash(password, saltrounds); 

  try{
    const client = await CreateConnectionToRedis(); 
    const user = tempAccount 
    ?  { 
      username: username, 
      email: email, 
      password: hashedPassword, 
      type: 'TempAccount', 
      Expires: "7 days",
      CreatedAt: new Date()
    }
    : { 
      username: username, 
      email: email, 
      password: hashedPassword, 
      type: 'default', 
      Expires: "32 days",
      CreatedAt: new Date()
    };

    const key = `user:${username}`; 

    await client.set(key, JSON.stringify(user), {
      EX: 60 * 60 * 24 * 7 // 7 days
    });

    return { success: true, message: "Successfully created Temp User", source: "Redis"}
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}

module.exports = CreateTempUserWithEmailAndPassword; 