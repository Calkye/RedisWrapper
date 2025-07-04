require('dotenv').config(); 
const CreateMongoDbConnection = require('../../CreateMongoDbConnection.js'); 

const bcrypt = require('bcrypt'); 

const saltrounds = 10; 

const CreateAccountWithEmailAndPassword = async(username, password, email, tempAccount, apiKey)=>{ 
  if(!username || !password || !email){ 
    throw new Error("Username, Password and Email are all required");  
  }

  if(typeof saltrounds !== "number" || isNaN(saltrounds)){ 
    throw new Error("Invalid salt rounds: must be a number")
  }
  const hashedPassword = await bcrypt.hash(password, saltrounds); 

  
  try{
    const client = await CreateMongoDbConnection(); 
    const db = await client.db(); 
    const UserCollection = await db.collection('Users'); 
    const user = tempAccount 
      ? { 
        username: username, 
        email: email, 
        password: hashedPassword, 
        apiKey: apiKey, 
        type: 'TempAccount', 
        Expires: "7 days",
        CreatedAt: new Date()
      }
      : {
        username: username,
        email: email,  
        password: hashedPassword,
        apiKey: apiKey,  
        type: 'default', 
        Expires: "32 days",
        CreatedAt: new Date()
      };


    const newUser = await UserCollection.insertOne(user); 
    const insertedUser = await UserCollection.findOne({_id: newUser.insertedId})
    
    return {status: 201, message: "Successfully created new user", source: "database", result: insertedUser};  
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}


module.exports = CreateAccountWithEmailAndPassword; 