const express = require('express'); 
const cors = require('cors'); 
const morgan = require('morgan')

const CreateAccountRoute = require('./src/routes/CreateAccountRoute.js'); 

// Require custom middlewear 
const { CreateTokenSession } = require("./src/modules/MiddleWear/CreateTokenSession.js"); 

const app = express(); 

// Middle Wear 
app.use(cors()); 
app.use(express.json()); 
app.use(morgan('dev')); 


// Mount routes with base parth eg /api 

app.use('/api', CreateTokenSession, CreateAccountRoute); 


// Basic health check route 
app.get('/', (req, res)=>{
  res.status(200).json({
    message: "RedisWrapper SaaS is running!"
  })
})

// Catch all 404 
app.use((req, res)=>{ 
  res.status(404).json({message: "Route not found"})
});

// Global error handler 
app.use((err, req, res, next)=>{ 
  console.error('Global error handler: ', err); 
  res.status(500).json({error: "internal server error"}); 
}); 

const port = process.env.PORT || 3000; 

app.listen(port, ()=>{ 
  console.log(`RedisWrapper API server is listening on port: ${port}`)
})


