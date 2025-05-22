const AccountMiddleWear = require('../../modules/MiddleWear/AccountMiddleWear.js'); 
const CreateAccountRoute = require('../../routes/CreateAccountRoute.js'); 
const { CreateTokenSession } = require('../../modules/MiddleWear/CreateTokenSession.js'); 
const cookieParser = require('cookie-parser'); 

const request = require('supertest'); 

const express = require('express'); 

const app = express(); 
app.use(express.json()); 
app.use(cookieParser()); 

app.post('/createAccount', CreateTokenSession, CreateAccountRoute); 
app.post('/verifyAccount', AccountMiddleWear, async(req, res)=>{ 
  try{
    return res.status(200).json({ 
      message: 'success', 
      user: req.user
    })

  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    })
  }
}); 


describe('Account middle wear testing', ()=>{ 
  it('Account middlewear should successfully verify Account from Redis', async()=>{ 
    const user = { 
      username: "test", 
      password: "test", 
      email: "test", 
      tempAccount: true
    }; 

    const CreationRes = await request(app)
      .post('/createAccount')
      .send(user); 


    const cookie = CreationRes.headers['set-cookie'][0].split(';')[0];
    console.log('[Cookie]: ', cookie); 


    const VerificationRes = await request(app)
      .post('/verifyAccount')
      .set('Cookie', [cookie]) 
      .send(user); 
    
    expect(VerificationRes.status).toBe(200); 
  })
})