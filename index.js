require('dotenv').config(); 
const express = require('express'); 
const http = require('http'); 
const socketIo = require('socket.io'); 

const cors = require('cors'); 
const morgan = require('morgan'); 
const cookieParser = require('cookie-parser'); 

const helmet = require('helmet');

const CreateAccountRoute = require('./src/routes/CreateAccountRoute.js'); 
const VerifyAccountRoute = require('./src/routes/VerifyAccountRoute.js'); 
const CacheRoute = require('./src/routes/AppLogicRoutes/CacheRoute.js'); 
const PaymentRoutes = require('./src/routes/PaymentRoutes.js'); 
const StripePromoCodeRoute = require('./src/routes/stripePromoCodeRoute.js'); 
const {router: DashBoardRoute, ApiUsageUpdate} = require('./src/routes/AppLogicRoutes/DashBoardRoute.js'); 

const AuthAccountMiddleWare = require("./src/modules/MiddleWear/AuthAccountMiddleWare.js"); 

const frontendUrl = process.env.FRONTEND_URL


const app = express(); 
const server = http.createServer(app); 
const io = socketIo(server, { 
  cors: { 
    origin: frontendUrl, 
    credentials: true
  }
})

const { attachAccountType, rateLimiterSelector } = require('./src/modules/MiddleWear/rateLimit.js'); 

// Middle Wear 
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));



app.use(express.json()); 
app.use(cookieParser()); 

app.set('trust proxy', 1); // Trust first proxy (Railway/load balancer)

// Mount routes with base parth eg /api 
app.use('/api', CreateAccountRoute); 
app.use('/api', VerifyAccountRoute); 
app.use('/api/app', attachAccountType, rateLimiterSelector, CacheRoute); 
app.use('/api/dashboard', DashBoardRoute); 
app.use('/api/payments', PaymentRoutes); 
app.use('/api/stripe', StripePromoCodeRoute); 

// Socket Io routes 
ApiUsageUpdate(io); 

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

server.listen(port, ()=>{ 
  console.log(`RedisWrapper API server is listening on port: ${port}`)
})



module.exports = app; 