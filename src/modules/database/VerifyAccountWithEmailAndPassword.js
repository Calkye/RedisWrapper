require('dotenv').config(); 

const CreateMongoDbConnection = require('../../CreateMongoDbConnection.js'); 
const bcrypt = require('bcrypt'); 

const VerifyAccountWithEmailAndPassword = async(username, email, password)=>{ 
  if(!username || !password || !email){
    throw new Error("Both username, password and email are required"); 
  }
  try{
    const client = await CreateMongoDbConnection(); 
    const db = await client.db();
    const UserCollection = await db.collection('Users'); 

    const UserKey = { 
      username: username, 
      email: email, 
    }
    const UserData = await UserCollection.findOne(UserKey); 

    if(!UserData){ 
      return {success: false, status: 404, message: "Unable to find user data"}; 
    }
    const isMatch = await bcrypt.compare(password, UserData.password)
    if(!isMatch) return {success: false, status: 400, message: "Incorrect username or password"}; 


    return { success: true, status: 200, message: "Verified User data", UserData}; 
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}

module.exports = VerifyAccountWithEmailAndPassword; 