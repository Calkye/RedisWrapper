const request = require('supertest'); 

const CreateAccountRoute = require('../../../routes/CreateAccountRoute.js'); 
const VerifyAccountRoute = require('../../../routes/VerifyAccountRoute.js'); 
const CacheRoute = require('../../../routes/AppLogicRoutes/CacheRoute.js'); 

const CookieParser = require('cookie-parser'); 

const express = require('express'); 
const cookieParser = require('cookie-parser');
const app = express(); 

app.use(cookieParser()); 
app.use(express.json()); 

app.use('/', CreateAccountRoute); 
app.use('/', VerifyAccountRoute); 
app.use('/', CacheRoute); 


describe('CacheRoute testing', ()=>{ 
  const user = { 
    username: "test", 
    password: "test", 
    email: "test@gmail.com", 
  }; 

  const data = { 
    ...user, 
    data: { 
      info: "some important data"
    },
    id: 1 // This can be set as anything, will be parsed as a string in the Key. 
  }

  const data2 = { 
    ...user, 
    data: { 
      info: "Some Updated Data"
    },
    id: 1 // This can be set as anything, will be parsed as a string in the Key. 
  }

  const agent = request.agent(app); 

  it("Should Cache data on a verified account", async()=>{ 
    await agent.post('/createAccount').send(user); 
    await agent.post('/verifyAccount').send(user); 
    
    const cacheRes = await agent.post('/CacheRoute').send(data); 
    expect(cacheRes.status).toBe(200); 
    expect(cacheRes.body.Key).toContain(user.username); 
  }); 


  it("Should Cache data, then update it", async()=>{ 
    await agent.post('/createAccount').send(user); 
    await agent.post('/verifyAccount').send(user); 
    
    await agent.post('/CacheRoute').send(data); 
  
    const UpdateRes = await agent.post('/CacheRoute').send(data2);

    expect(UpdateRes.status).toBe(200);  
  });

  it("Should fetch the currently stored data", async()=>{ 
    await agent.post('/createAccount').send(user); 
    await agent.post('/verifyAccount').send(user); 
    
    const fetchRes = await agent.post('/CacheRoute/fetch').send(data); 
  
    console.log('[DATA]: ', fetchRes.body); 

    expect(fetchRes.status).toBe(200);  
  })
  




})