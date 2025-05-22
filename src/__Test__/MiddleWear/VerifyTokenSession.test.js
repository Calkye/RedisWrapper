require('dotenv').config(); 
const jwt = require('jsonwebtoken'); 
const request = require('supertest'); 

const GetTokenHelper = (req)=>{ 
  try{
    const token = req.cookies['x-refresh-token']; 
    return new Promise(async (resolve, reject)=>{ 
      try{
        if(!token){ 
          throw new Error("No refresh token found"); 
        }     
       return resolve(token); 

      }catch(error){ 
        return reject(new Error(error.message || "Unknown error occured"))
      }
    })
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}


const VerifyTokenSession = async(req, res, next)=>{
  const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET; 
  try{
    const Token = await GetTokenHelper(req); 

    jwt.verify(Token, REFRESH_TOKEN_SECRET, (error, decoded)=>{ 
      if(error){ 
        return res.status(400).json({ 
          error: "Token is invalid "
        }); 
      }; 


      req.user = decoded; 
      next(); 
    })
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured");  
  }
}

const { CreateTokenSession } = require('../../modules/MiddleWear/CreateTokenSession.js'); 
const express = require('express'); 
const cookieParser = require('cookie-parser'); 

const app = express(); 

app.use(express.json()); 
app.use(cookieParser()); 

app.post('/verifySession', VerifyTokenSession, async(req, res)=>{ 
  return res.status(200).json({ 
    message: "Successfully Verified tokens"
  })
})

app.post('/createToken', CreateTokenSession, async(req, res)=>{ 
  return res.status(200).json({ 
    message: "Successfully created tokens", 
  }); 
}); 

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET; 

describe('Token testing', ()=>{ 
 

  it('GetTokenHelper should return with a token', async()=>{ 
    const tokenString = 'fake.jwt.token'; 
    let req = { 
      cookies: { 
        'x-refresh-token': tokenString
      }
    } 

    const Token = await GetTokenHelper(req); 
    expect(Token).toBeDefined(); 
    expect(Token).toBe(tokenString)


  }); 

  it('VerifyTokenSssion should successfully verify a token', async()=>{
    const user = { username: "test", tempAccount: true };
    
    const CreateRes = await request(app)
      .post('/createToken')
      .send(user); 
    
    const cookies = CreateRes.headers['set-cookie']; 
    const verifyRes = await request(app)
      .post('/verifySession')
      .set('Cookie', cookies)
      .send(); 

    expect(verifyRes.status).toBe(200); 
    expect(verifyRes.body.message).toBe("Successfully Verified tokens"); 

  })


})
