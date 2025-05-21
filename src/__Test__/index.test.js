const CreateConnectionToRedis = require('../CreateConnectionToRedis.js'); 
const CreateAccountRoute = require('../routes/CreateAccountRoute.js'); 
const express = require('express'); 

const request = require('supertest'); 








describe('Intergration testing', ()=>{
  let app; 

  beforeAll(()=>{ 
    app = express(); 
    app.use(express.json()); 
    app.use('/', CreateAccountRoute); // Mount the route on a base path 
  })


  afterAll(async()=>{ 
    const client = await CreateConnectionToRedis(); 
    await client.quit(); 
  })

  it('Should successfully create a temporary account', async()=>{
    const user = { 
      username: "Test", 
      password: "test", 
      tempAccount: true,
    } 
    const response = await request(app)
      .post('/createAccount')
      .send(user); 
    
    
   
    console.log('[STATUS CODE]: ', response.status); 
    console.log('[RESPONSE BODY]: ', response.body); 
      
    expect(response.status).toBe(200);
     
  });


});