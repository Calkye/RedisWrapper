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
const PROMOS_CODE_TRACKING_COLLECTION = process.env.PROMOS_CODE_TRACKING_COLLECTION; 


router.post('/create-checkout-session', AuthAccountMiddleWare, async (req, res) => {
  const client = await CreateMongoDbConnection(); 
  const db = await client.db(); 
  const UserCollection = await db.collection(USER_COLLECTION);
  let PromoCodeTrackingCollection; 
  let CommissionCode; 
  let CommissionCodeData; 
  let commissionAmount; 
  let CommisionCodeOwner; 


  try {
    let session; 
    if(CommissionCodeData?.isActive){        
          PromoCodeTrackingCollection = await db.collection(PROMOS_CODE_TRACKING_COLLECTION); 
          
          CommissionCode = req.body.commissionCode; 
          CommissionCodeData = await PromoCodeTrackingCollection.findOne({ 
            code: CommissionCode
          }); 
          commissionAmount = Math.floor(2000 * 0.3)
          CommisionCodeOwner = await UserCollection.findOne({username: CommissionCodeData.createdBy}); 

      
        session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: 'price_1RSEizRK3iVe1gReVjefT4SF',
            quantity: 1,
          }
        ],
        subscription_data: { 
          application_fee_percent: 70,
          transfer_data: { 
            destination: CommisionCodeOwner?.stripeAccountId || ''
          }
        },
        metadata: { 
          refferedBy: CommissionCodeData?.createdBy || '', // User who created promoCode 
          promoCode: CommissionCode, 
          transfer_group: `group_${req.user._id}`,

        },
        success_url: `${frontendUrl}/checkout?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/cancel`
      });


      await PromoCodeTrackingCollection.updateOne({code: CommissionCode}, { 
        $inc: {usageCount: 1}, 
        $push: {usersReferred: req.user._id}
      }); 
      await UserCollection.updateOne({_id: req.user._id}, {$set: { 
        [`CommissionCodeUsed.${CommissionCode}`]: true, 
      }})
    }else{ 
        session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: 'price_1RSEizRK3iVe1gReVjefT4SF',
            quantity: 1,
          }
        ],
        metadata: { 
          refferedBy: CommissionCodeData?.createdBy || '', // User who created promoCode 
          promoCode: CommissionCode,
          transfer_group: `group_${req.user._id}`,

        },
        success_url: `${frontendUrl}/checkout?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/profile`,
      });
    }

    const { username, email } = req.user; 
    await UserCollection.updateOne({_id: req.user._id}, {$set: {
      PaymentSession: session.id, 
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
  const PromoCodeTrackingCollection = await db.collection(PROMOS_CODE_TRACKING_COLLECTION); 


  if(!UserData) return res.status(400).json({error: "Invalid credentials"});

  
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id query param' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = session.metadata; 
    const { refferedBy, promoCode, transfer_group } = metadata; 
    
    // session.payment_status can be 'paid' or 'unpaid'
    if (session.payment_status === 'paid') {
      const tokenHeader = req.headers['authorization'];
      const { apikey } = UserData; 
      const token = tokenHeader 
      ? tokenHeader.replace(/Bearer\s/i, '').trim()
      : apikey; 
      const usedComissionCodes = UserData.CommissionCodeUsed || {}; 
      const ComissionCodeCheck = usedComissionCodes[promoCode]; 
      if(ComissionCodeCheck){ 
        // Handle stripe api payouts 
        const RefferedUser = await UserCollection.findOne({username: refferedBy});
        if(!RefferedUser || !RefferedUser.stripeAccountId){ 
          console.warn(`Referer ${refferedBy} has no stripe account`); 
        }else{ 
          const connectedAccountId = RefferedUser.stripeAccountId; 
          const priceAmount = 2000; // Full price in cents 
          const commissionAmount = Math.floor(priceAmount * 0.3); // use this consistently
          try{
            await PromoCodeTrackingCollection.updateOne(
              { code: promoCode },
              {
                $inc: { commissionsEarned: commissionAmount },
                $push: { payouts: { userId: RefferedUser._id, sessionId, amount: commissionAmount, date: new Date() } }
              }
           );
            
          }catch(error){ 
            console.error(`Stripe transfer failed: ${error}`)
          }; 
        }
      }
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


router.post('/test/top-up-platform', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2000, // $20.00
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.status(200).json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Top-up error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 