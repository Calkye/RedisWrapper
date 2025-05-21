const CreateConnectionToRedis = require('../CreateConnectionToRedis.js'); 
const request = require('supertest'); 
const express = require('express'); 


const app = express(); 
app.use(express.json()); 

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


const CreateTempAccountMiddleWear = async(req, res, next)=>{
  try{
    const { username, password} = req.body ?? {}; 
    
    const {success, message, source } = await CreateTempUserWithEmailAndPassword(username, password); 

    if(!success){ 
      return res.status(400).json({message: message})
    }

    req.body.TempAccount = true;
     
    next(); 
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    })
  }
}



app.post('/createAccount', CreateTempAccountMiddleWear, async(req, res)=>{ 
  try{
    const {username, password, TempAccount} = req.body ?? {}; 
    if(TempAccount){ 
      return res.status(200).json({
        message: "Account Created and Cached"  // THIS must match your test!
      })
    }

    // Since It's not a Temp account, Add it to the database. 

  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    })
  }
})




describe('Route testing', ()=>{ 
  afterAll(async()=>{ 
    const client = await CreateConnectionToRedis(); 
    await client.quit(); 
  })

  it('Should Successfully create a temp account using middleWear', async()=>{ 
    const user = { 
      username: "test", 
      password: "test"
    }
    const response = await request(app)
      .post('/createAccount')
      .send(user); 
    
    expect(response.body).toEqual({ 
      message: "Account Created and Cached"
    })



  }); 
  it('Should throw a error if a username or password is not provided', async()=>{ 

    const response = await request(app).post('/createAccount'); 
    expect(response.status).toBe(400); 
  })

})