require('dotenv').config(); 
const express = require('express'); 
const cors = require('cors'); 
const morgan = require('morgan'); 
const cookieParser = require('cookie-parser'); 

const CreateAccountRoute = require('./src/routes/CreateAccountRoute.js'); 
const VerifyAccountRoute = require('./src/routes/VerifyAccountRoute.js'); 
const CacheRoute = require('./src/routes/AppLogicRoutes/CacheRoute.js'); 
const PaymentRoutes = require('./src/routes/PaymentRoutess.js'); 




const app = express(); 

const { attachAccountType, rateLimiterSelector } = require('./src/modules/MiddleWear/rateLimit.js'); 

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
// Middle Wear 
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));

app.use(express.json()); 
app.use(morgan('dev')); 
app.use(cookieParser()); 

// Mount routes with base parth eg /api 
app.use('/api', CreateAccountRoute); 
app.use('/api', VerifyAccountRoute); 
app.use('/api/app', attachAccountType, rateLimiterSelector, CacheRoute); 
app.use('/api/payments', PaymentRoutes); 

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


