const CreateConnectionToRedis = require('../../CreateConnectionToRedis.js'); 


const CreateTempUserWithEmailAndPassword = async(username, password, )=>{  
  if(!username && password){ 
    return {success: false, message: "both username and password are required"}
  }

  try{
    const client = await CreateConnectionToRedis(); 
    const user = { 
      username: username, 
      password: password, 
      type: 'TempAccount', 
      Expires: "2 days",
      CreatedAt: new Date()
    };

    const key = `user:${username}`; 

    await client.set(key, JSON.stringify(user)), { 
      EX: 60 * 60 * 168 // Temp account will expire in 7 days: Free trial
    }; 

    return { success: true, message: "Successfully created Temp User", source: "Redis"}
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}

module.exports = CreateTempUserWithEmailAndPassword; 