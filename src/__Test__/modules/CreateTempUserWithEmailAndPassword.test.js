const CreateConnectionToRedis = require ('../CreateConnectionToRedis.js'); 

const CreateTempUserWithEmailAndPassword = async(username, password)=>{ 
  if(!password){ 
    return {success: false, message: "Password is required"}; 
  }

  if(!username){ 
    return {success: false, message: "Username is required"}; 
  }; 
  
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




describe('CreateTempUserWithEmailAndPassword should create a temp user and store it in the Redis database', ()=>{
  describe('basic account creation testing', ()=>{ 
    afterAll(async()=>{
      const client = await CreateConnectionToRedis(); 
      await client.quit(); 
    })

    it('Should successfully create a user', async()=>{ 
      const {success, message, source } = await CreateTempUserWithEmailAndPassword("test", "test"); 

      expect(success).toBe(true); 
    });

    it('Should throw a error if the password is not provided', async()=>{
      const {success} = await CreateTempUserWithEmailAndPassword("test"); 
      expect(success).toBe(false); 
    }); 
    it('Should throw a error if the username is not provided', async()=>{
      let username;  
      const { success } = await CreateTempUserWithEmailAndPassword(username, 'password'); 
      
      expect(success).toBe(false); 

    });

    it('should throw a error if both username and password are not provided', async()=>{
      const { success } = await CreateTempUserWithEmailAndPassword(); 

      expect(success).toBe(false); 

    })
  
  });
  

})