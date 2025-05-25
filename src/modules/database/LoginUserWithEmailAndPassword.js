const CreateMongoDbConnection = require('../../CreateMongoDbConnection.js'); 
const bcrypt = require('bcrypt'); 


const LoginUserWithEmailAndPassword = async (username, email, password) => {
  try {
    const client = await CreateMongoDbConnection(); 
    const db = client.db(); 
    const UserCollection = db.collection('Users'); 

    const userData = await UserCollection.findOne({ username }); 
    if (!userData) return { success: false, status: 404, message: "No user found" }; 

    const { password: savedPassword, email: savedEmail } = userData;

    const passwordMatch = await bcrypt.compare(password, savedPassword); 
    if (!passwordMatch) return { success: false, status: 403, message: "Incorrect password" }; 

    if (email !== savedEmail) {
      return { success: false, status: 403, message: "Incorrect email" }; 
    }

    // ✅ All checks passed
    return {
      success: true,
      status: 200,
      message: "Successfully signed in",
      user: userData
    };

  } catch (error) {
    throw new Error(error.message || "Unknown error occurred"); 
  }
};



module.exports = LoginUserWithEmailAndPassword; 