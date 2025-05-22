const VerifyTempUserWithEmailAndPassword = require('../../modules/caching/VerifyTempUserWithEmailAndPassword.js'); 
const CreateTempUserWithEmailAndPassword = require('../../modules/caching/CreateTempUserWithEmailAndPassword.js'); 





describe('Account Creation and verification testing', ()=>{ 
  it('Should Successfully create a account', async()=>{ 
    const user = { 
      username: "test", 
      password: "test", 
      email: "test@gmail.com"
    }
    const {success, message, source} = await CreateTempUserWithEmailAndPassword(user.username, user.password, user.email); 

    expect(success).toBe(true); 
    expect(source).toBe('Redis'); 

    const {success: VerifiedSuccess, message: VerifiedMessage, user: VerifiedUser} = await VerifyTempUserWithEmailAndPassword(user.username, user.password); 

    expect(VerifiedSuccess).toBe(true); 
    expect(VerifiedUser).toBeDefined(); 
  })


})