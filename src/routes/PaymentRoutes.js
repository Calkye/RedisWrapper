require('dotenv').config(); 
const stripeKey = process.env.STRIPE_API_KEY; 
const Stripe = require('stripe');
const stripe = Stripe(stripeKey); // test key only
const express = require('express'); 
const router = express.Router(); 
const CreateMongoDbConnection = require('../CreateMongoDbConnection.js');
const AuthAccountMiddleWare = require('../modules/MiddleWear/AuthAccountMiddleWare.js'); 

const frontendUrl = `${process.env.FRONTEND_URL}`
const USER_COLLECTION = process.env.USER_COLLECTION || 'Users'; 

router.post('/create-checkout-session', AuthAccountMiddleWare, async (req, res) => {
  const client = await CreateMongoDbConnection(); 
  const db = await client.db(); 
  const UserCollection = await db.collection(USER_COLLECTION);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1RSEizRK3iVe1gReVjefT4SF',
          quantity: 1,
        }
      ],
      success_url: `${frontendUrl}/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cancel`,
    });

    const { username, email } = req.user; 
    await UserCollection.updateOne({username, email}, {$set: {
      PaymentSession: session.id
    }});

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Stripe session failed', raw: err.message });
  }
});

router.get('/check-session', async (req, res) => {
  const sessionId = req.query.session_id; 

  const client = await CreateMongoDbConnection(); 
  const db = await client.db(); 
  const UserCollection = await db.collection(USER_COLLECTION);

  const UserData = await UserCollection.findOne({PaymentSession: sessionId}); 

  if(!UserData) return res.status(400).json({error: "Invalid credentials"});

  
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id query param' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // session.payment_status can be 'paid' or 'unpaid'
    if (session.payment_status === 'paid') {
      const tokenHeader = req.headers['authorization'];
      const { apikey } = UserData; 
      const token = tokenHeader 
      ? tokenHeader.replace(/Bearer\s/i, '').trim()
      : apikey; 

      if(UserData){ 
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + 32);
        
        await UserCollection.updateOne({apiKey: token}, {
          $set: {
            type: "Tier 1",
            expires: expiresDate
          }, 
          $unset: {PaymentSession: ""}
        }, 
        ); 
      }
      return res.status(200).json({ message: 'Payment successful', session });
    } else {
      return res.status(200).json({ message: 'Payment not completed yet', session });
    }
  } catch (err) {
    console.error('Error retrieving session:', err);
    res.status(500).json({ error: 'Failed to retrieve session', raw: err.message });
  }
});

router.get('/success', (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).send("Missing session_id");
  }
  // Optionally verify the session with Stripe here or just send a confirmation message
  res.status(200).send(`Payment succeeded! Session ID: ${sessionId}`);
});

module.exports = router; 