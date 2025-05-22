require('dotenv').config(); 
const jwt = require('jsonwebtoken'); 
const request = require('supertest'); 
const cookieParser = require('cookie-parser'); 

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || '2c380296672e95e9706379c6006de54937bb63ce781bf64313f339c6e438ed4e9e2f309433437d6c02018d0407c75c8aa97562d426c55ac6f66cbf1c232ada74'; 

const CreateToken = (username)=>{
  try{
    return new Promise(async (resolve, reject)=>{ 
      try{ 
        const Token = jwt.sign({username}, REFRESH_TOKEN_SECRET); 

        return resolve(Token); 
      }catch(error){ 
        return reject(new Error(error.message || "Unknown error occured")); 
      }
    })


  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}

const CreateTokenSession = async(req, res, next)=>{ 
  try{
    const { username, tempAccount } = req.body ?? {};
    const Token = await CreateToken(username);
    if(tempAccount){ 
      res.cookie('x-refresh-token', Token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'Strict', 
      maxAge: 7 * 24 * 60  * 60 * 1000 
    });
    
      return next();  
    }

    res.cookie('x-refresh-token', Token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'Strict', 
      maxAge: 32 * 24 * 60  * 60 * 1000
    });

    return next(); 
  }catch(error){ 
    throw new Error(error.message || "Unknown error occured"); 
  }
}

const express = require('express'); 
const app = express();

app.use(cookieParser()); 
app.use(express.json()); 

app.use('/createToken', CreateTokenSession, async(req, res)=>{ 
  try{
    return res.status(200).json({ 
      message: "Token Created!"
    })


  }catch(error){ 
    return res.status(500).json({ 
      error: error.message 
    })
  }
})


describe('Testing', ()=>{ 
  describe('Create  Token Testing', ()=>{ 
    it('Should Successfully create a token', async()=>{
      const username = "test";  
      const Token = await CreateToken(username);      
      expect(Token).toBeDefined(); 
    })

    it('Should Succesfully create a refreshToken', async()=>{ 
      const user = { 
        username: "test", 
        tempAccount: true
      };

      const response = await request(app)
        .post('/createToken')
        .send(user); 

      console.log('[SET-COOKIE-HEADER]: ', response.headers['set-cookie']); 
      expect(response.headers['set-cookie']).toBeDefined(); 
      expect(response.headers['set-cookie'][0]).toMatch(/x-refresh-token=/); 
    })

  })

})

