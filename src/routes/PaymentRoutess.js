const Stripe = require('stripe');
const stripe = Stripe('sk_test_51RSEcGRK3iVe1gRezdaq7yye1SH7VdA1jy9OfR3lmrUH0zxN8mVT3lM13ZD6OlNg2yiQabwYvPaqrXXBQjkiOQUb00S4rw9Xsd'); // test key only
const express = require('express'); 
const router = express.Router(); 
const CreateMongoDbConnection = require('../CreateMongoDbConnection.js'); 
const { token } = require('morgan');


router.post('/create-checkout-session', async (req, res) => {
  try {
    const tokenHeader = req.headers['authorization'];
    if (!tokenHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }



    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1RSEizRK3iVe1gReVjefT4SF',
          quantity: 1,
        }
      ],
      success_url: 'http://localhost:5173/checkout?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/cancel',
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Stripe session failed', raw: err.message });
  }
});

router.get('/check-session', async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id query param' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    

    // session.payment_status can be 'paid' or 'unpaid'
    if (session.payment_status === 'paid') {
      const client = await CreateMongoDbConnection(); 
      const tokenHeader = req.headers['authorization'];
      if (!tokenHeader) {
        return res.status(401).json({ error: 'Missing Authorization header' });
      }

      const token = tokenHeader.replace(/Bearer\s/i, '').trim(); // more robust

      const db = await client.db(); 
      const userCollection = await db.collection('Users'); 

      const UserData = await userCollection.findOne({ apiKey: token }); 
      if(UserData){ 
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + 32);
        
        await userCollection.updateOne(
          {apiKey: token}, 
          {$set: {
            type: "Tier 1",
            expires: expiresDate
          }}
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