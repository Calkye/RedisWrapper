const CreateAccountWithEmailAndPassword = require('../../modules/database/CreateAccountWithEmailAndPassword.js'); 
const VerifyAccountWithEmailAndPassword = require('../../modules/database/VerifyAccountWithEmailAndPassword.js'); 



const user = { 
  username: "test", 
  password: "test", 
  email: "test@gmail.com"
}

describe('Account data testing', ()=>{
  it("Should successfully create a account in the database", async()=>{ 
    const {status, message, source} = await CreateAccountWithEmailAndPassword(user.username, user.password, user.email); 
    expect(status).toBe(201); 
    expect(source).toBe('database'); 
  }); 

  it("Should Create a account and verify the username and password", async()=>{ 
    await CreateAccountWithEmailAndPassword(user.username, user.password, user.email); 
    const {success, status, message, UserData} = await VerifyAccountWithEmailAndPassword(user.username, user.email, user.password); 
    expect(success).toBe(true); 
    expect(UserData).toBeDefined(); 

  })

})