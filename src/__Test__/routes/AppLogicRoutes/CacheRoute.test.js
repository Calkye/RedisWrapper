const request = require('supertest'); 

const CreateAccountRoute = require('../../../routes/CreateAccountRoute.js'); 
const VerifyAccountRoute = require('../../../routes/VerifyAccountRoute.js'); 
const CacheRoute = require('../../../routes/AppLogicRoutes/CacheRoute.js'); 

const cookieParser = require('cookie-parser');
const express = require('express'); 

const app = express(); 
app.use(cookieParser()); 
app.use(express.json()); 

app.use('/', CreateAccountRoute); 
app.use('/', VerifyAccountRoute); 
app.use('/', CacheRoute); 


// describe('CacheRoute testing', () => { 
//   const user = { 
//     username: "test", 
//     password: "test", 
//     email: "test@gmail.com", 
//   }; 

//   const data = { 
//     id: 1,
//     data: { info: "some important data" }
//   };

//   const data2 = { 
//     id: 1,
//     data: { info: "Some Updated Data" }
//   };

//   const agent = request.agent(app); 

//   beforeAll(async () => {
//     await agent.post('/createAccount').send(user); 
//     await agent.post('/verifyAccount').send(user); 
//   });

//   it("Should cache data on a verified account", async () => {    
//     const cacheRes = await agent.post('/CacheRoute').send(data); 
//     expect(cacheRes.status).toBe(200); 
//     expect(cacheRes.body.key).toContain(user.username);  // lowercase 'key' to match your route response
//   }); 

//   it("Should update cached data", async () => {    
//     await agent.post('/CacheRoute').send(data);     
//     const updateRes = await agent.put('/CacheRoute').send(data2);
//     expect(updateRes.status).toBe(200);  
//   });

//   it("Should fetch the currently stored data", async () => {    
//     await agent.post('/CacheRoute').send(data);     
//     const fetchRes = await agent.post('/CacheRoute/fetch').send({ id: data.id }); 
//     expect(fetchRes.status).toBe(200);  
//     expect(fetchRes.body.data).toHaveProperty('info', data.data.info);
//   });

//   it("Should delete cached data", async () => {
//     await agent.post('/CacheRoute').send(data);
//     const deleteRes = await agent.delete('/CacheRoute').send({ id: data.id });
//     expect(deleteRes.status).toBe(200);
//     expect(deleteRes.body.message).toBe("Successfully deleted key");

//     // Try fetching after deletion — should return 404
//     const fetchRes = await agent.post('/CacheRoute/fetch').send({ id: data.id });
//     expect(fetchRes.status).toBe(404);
//   });
// });


describe('Edge case testing', () => { 
  const agent1 = request.agent(app); 
  const agent2 = request.agent(app); 

  const user1 = { 
    username: "test1", 
    password: "test1", 
    email: "test1@gmail.com"
  };

  const user2 = { 
    username: "test2", 
    password: "test2", 
    email: "test2@gmail.com"
  };

  const data1 = { 
    id: 1,
    data: { info: "some important data" }
  }; 

  const updatedData1 = { 
    id: 1,
    data: { info: "Agent 1 got hacked, hehe" }
  }; 

  beforeAll(async () => { 
    await agent1.post('/createAccount').send(user1);
    await agent1.post('/verifyAccount').send(user1);
    
    await agent2.post('/createAccount').send(user2);
    await agent2.post('/verifyAccount').send(user2);
  });

  it('Should reject when another user tries to edit another user\'s data', async () => {
    await agent1.post('/CacheRoute').send(data1); 

    // Agent2 tries to update Agent1's cached data by id
    const editRes = await agent2.put('/CacheRoute').send(updatedData1); 

    expect(editRes.status).toBe(400);  // Not found because agent2 has no data with that id
  }); 

  it('Should reject when another user tries to delete another user\'s data', async () => { 
    await agent1.post('/CacheRoute').send(data1); 

    // Agent2 tries to delete Agent1's cached data by id
    const delRes = await agent2.delete('/CacheRoute').send({ id: data1.id });

    expect(delRes.status).toBe(400);
  }); 

  it('Should reject when another user tries to read another user\'s data', async () => { 
    await agent1.post('/CacheRoute').send(data1); 

    // Agent2 tries to fetch Agent1's cached data by id
    const readRes = await agent2.post('/CacheRoute/fetch').send({ id: data1.id }); 

    expect(readRes.status).toBe(400);
  });
});
