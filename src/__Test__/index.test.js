
const { CreateTokenSession } = require("../modules/MiddleWear/CreateTokenSession.js");  
const CreateConnectionToRedis = require('../CreateConnectionToRedis.js'); 
const CreateAccountRoute = require('../routes/CreateAccountRoute.js'); 

const express = require('express'); 

const request = require('supertest');

const CreateMongoDbConnection = require('../CreateMongoDbConnection.js'); 








describe('Intergration testing', ()=>{
  let app; 

  beforeAll(async()=>{ 
    app = express(); 
    app.use(express.json()); 
    app.use('/', CreateTokenSession, CreateAccountRoute); // Mount the route on a base path 
    const client = await CreateMongoDbConnection(); 
    const db = await client.db();
    const collections = await db.collections(); 
    for(let collection of collections){ 
      await collection.deleteMany({}); 
    }
  }); 


  afterAll(async()=>{ 
    const client = await CreateConnectionToRedis(); 
    await client.quit(); 
  })
  it('refreshToken Should successfully be created', async()=>{ 
    const user = { 
      username: "test", 
      password :"test", 
      email: "test@gmail.com", 
      tempAccount: false
    }
    const response = await request(app)
      .post('/createAccount')
      .send(user); 

    
    console.log('[SET COOKIE]: ', response.headers); 
    expect(response.headers['set-cookie']).toBeDefined(); 
    expect(response.headers['set-cookie'][0]).toMatch(/x-refresh-token=/);



  })


  it('Should successfully create a temporary account', async()=>{
    const user = { 
      username: "Test", 
      password: "test", 
      email: "test@gmail.com", 
      tempAccount: true,
    } 
    const response = await request(app)
      .post('/createAccount')
      .send(user); 
    
    
   
    console.log('[STATUS CODE]: ', response.status); 
    console.log('[RESPONSE BODY]: ', response.body); 
      
    expect(response.status).toBe(201);
     
  });


});