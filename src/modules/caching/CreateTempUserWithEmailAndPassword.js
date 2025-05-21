const CreateConnectionToRedis = require('../../CreateConnectionToRedis.js'); 


const CreateTempUserWithEmailAndPassword = async(username, password)=>{ 
  if(!password){ 
    return {success: false, message: "Password is required"}; 
  }

  if(!username){ 
    return {success: false, message: "Username is required"}; 
  }; 

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

    await client.set(key, JSON.stringify(user)); 

    return { success: true, message: "Successfully created Temp User", source: "Redis"}
  }catch(error){ 
    throw new Error(error); 
  }
}

module.exports = CreateTempUserWithEmailAndPassword; 