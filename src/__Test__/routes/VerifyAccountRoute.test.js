const request = require('supertest'); 
const CreateAccountRoute = require('../../routes/CreateAccountRoute.js'); 
const VerifyAccountRoute = require("../../routes/VerifyAccountRoute.js"); 

const cookieParser = require('cookie-parser'); 


const express = require('express');

const app = express(); 
app.use(cookieParser())
app.use(express.json()); 


app.use('/', CreateAccountRoute); 
app.use('/', VerifyAccountRoute); 


describe('Testing Authentication', ()=>{
  const user = { 
    username: "test", 
    password: "test", 
    email: "test@gmail.com", 
  }



  const agent = request.agent(app); 

  it('Login flow should work successfully', async()=>{
    const createRes = await agent 
      .post('/createAccount')
      .send(user); 

    const VerifyRes = await agent
      .post('/verifyAccount')
      .send(user); 

    expect(VerifyRes.status).toBe(200); 
    expect(VerifyRes.body.user).toBeDefined(); 
  })

})