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


describe('CacheRoute testing', () => {
  let app;
  let apiKey;

  const user = {
    username: "test",
    password: "test",
    email: "test@gmail.com",
    tempAccount: true
  };

  const data = {
    id: 1,
    data: { info: "some important data" }
  };

  const data2 = {
    id: 1,
    data: { info: "Some Updated Data" }
  };

  beforeAll(async () => {
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/', CreateAccountRoute);
    app.use('/', VerifyAccountRoute);
    app.use('/', CacheRoute);

    const response = await request(app).post('/createAccount').send(user);
    apiKey = response.body.apiKey;
  });

  it("Should cache data on a verified account", async () => {
    const cacheRes = await request(app)
      .post('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(data);

    expect(cacheRes.status).toBe(200);
    expect(cacheRes.body.key).toContain(user.username);
  });

  it("Should update cached data", async () => {
    await request(app)
      .post('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(data);

    const updateRes = await request(app)
      .put('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(data2);

    expect(updateRes.status).toBe(200);
  });

  it("Should fetch the currently stored data", async () => {
    await request(app)
      .post('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(data);

    const fetchRes = await request(app)
      .post('/CacheRoute/fetch')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ id: data.id });

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.data).toHaveProperty('info', data.data.info);
  });

  it("Should delete cached data", async () => {
    await request(app)
      .post('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(data);

    const deleteRes = await request(app)
      .delete('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ id: data.id });

    expect(deleteRes.status).toBe(200);

    const fetchRes = await request(app)
      .post('/CacheRoute/fetch')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ id: data.id });

    expect(fetchRes.status).toBe(404);
  });
});



describe('Edge case testing', () => {
  let app;
  let apiKey1, apiKey2;

  const user1 = {
    username: "test1",
    password: "test1",
    email: "test1@gmail.com",
    tempAccount: true
  };

  const user2 = {
    username: "test2",
    password: "test2",
    email: "test2@gmail.com",
    tempAccount: true
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
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/', CreateAccountRoute);
    app.use('/', VerifyAccountRoute);
    app.use('/', CacheRoute);

    const res1 = await request(app).post('/createAccount').send(user1);
    apiKey1 = res1.body.apiKey;

    const res2 = await request(app).post('/createAccount').send(user2);
    apiKey2 = res2.body.apiKey;
  });

  it("Should reject another user's update", async () => {
    await request(app)
      .post('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey1}`)
      .send(data1);

    const editRes = await request(app)
      .put('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey2}`)
      .send(updatedData1);

    expect(editRes.status).toBe(404); // Not found for that user's scope
  });

  it("Should reject another user's delete", async () => {
    await request(app)
      .post('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey1}`)
      .send(data1);

    const delRes = await request(app)
      .delete('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey2}`)
      .send({ id: data1.id });

    console.info('[DEL RESPONSE]: ', delRes.body)
    expect(delRes.status).toBe(404);
  });

  it("Should reject another user's read", async () => {
    await request(app)
      .post('/CacheRoute')
      .set('Authorization', `Bearer ${apiKey1}`)
      .send(data1);

    const readRes = await request(app)
      .post('/CacheRoute/fetch')
      .set('Authorization', `Bearer ${apiKey2}`)
      .send({ id: data1.id });

    expect(readRes.status).toBe(404);
  });
});
