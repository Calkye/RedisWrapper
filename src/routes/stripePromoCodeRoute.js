require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

const express = require('express');
const router = express.Router();

const AuthAccountMiddleWare = require('../modules/MiddleWear/AuthAccountMiddleWare.js'); 
const CreateMongoDbConnection = require('../CreateMongoDbConnection.js');

const PROMOS_CODE_TRACKING_COLLECTION = process.env.PROMOS_CODE_TRACKING_COLLECTION;
const USER_COLLECTION = process.env.USER_COLLECTION;

router.post('/create-commission-code', AuthAccountMiddleWare, async (req, res) => {
  if (!req.user || !req.user.username) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const username = req.user.username.toLowerCase();

  const client = await CreateMongoDbConnection();
  const db = client.db();
  const PromoCodeTrackingCollection = db.collection(PROMOS_CODE_TRACKING_COLLECTION);
  const UserCollection = db.collection(USER_COLLECTION);

  try {
    const newCommissionCode = `${username.toUpperCase()}_REF`;


    // Check if user already has a commission code
    const existingUser = await UserCollection.findOne({ username });
    if (existingUser?.commissionCode) {
      await UserCollection.updateOne({_id: req.user._id}, {$set: { 
        commissionCode: newCommissionCode
      }});
    }


    // Check if promo code already exists (just in case)
    // const codeExists = await PromoCodeTrackingCollection.findOne({ code: newCommissionCode });
    // if (codeExists) {
    //   return res.status(400).json({ error: "Commission code already taken" });
    // }
    // Step 1 create a stripe account
    const stripeAccount = await stripe.accounts.create({
      type: 'express',
      capabilities: {
        transfers: { requested: true },
      }
    });

    // Generate a onboarding link 
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url: `https://connect.stripe.com/setup/e/${stripeAccount.id}`, // or your real route
      return_url: `${process.env.REFRESH_URL}?apiKey=${req.user.apiKey}`,
      type: 'account_onboarding',
    });

    // Insert into promo tracking collection
    await PromoCodeTrackingCollection.insertOne({
      createdBy: username,
      code: newCommissionCode,
      usageCount: 0,
      isActive: true,
      commissionsEarned: 0,
      usersReferred: [],
      createdAt: new Date()
    });

    // Update user with commission code
    const result = await UserCollection.updateOne({ _id: req.user._id }, {
      $set: {
        commissionCode: newCommissionCode,
        stripeAccountId: stripeAccount.id,
        accountLink: accountLink.url
      }
    });

    console.log("Update Result:", result);

    return res.status(200).json({
      message: "Commission code created successfully. Any user who uses this code will credit 30% commission to the creator.",
      commissionCode: newCommissionCode, 
      stripeAccountId: stripeAccount.id, 
      accountLink: accountLink.url
    });

  } catch (error) {
    console.error("Create Commission Code Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      raw: error.message
    });
  }
});

router.get('/login-link/:accountLink', AuthAccountMiddleWare, async(req, res)=>{
  const client = await CreateMongoDbConnection();
  const db = client.db();
  const PromoCodeTrackingCollection = db.collection(PROMOS_CODE_TRACKING_COLLECTION);
  const UserCollection = db.collection(USER_COLLECTION);

  const accountId = req.params.accountLink; 
  console.log('[ACCOUNT ID]: ', accountId); 
  
  try{

    const loginLink = await stripe.accounts.createLoginLink(accountId);     

    console.log('[LOGIN LINK]: ', loginLink); 
    if(loginLink){
      await UserCollection.updateOne({apiKey: req.user.apiKey}, {$set: { 
        accountLink: loginLink.url
      }}); 
    }
    
    return res.status(200).json({ 
      loginUrl: loginLink.url
    }) 

  }catch(error){
    if(error.message === 'Cannot create a login link for an account that has not completed onboarding.'){ 
      const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `https://connect.stripe.com/setup/e/${accountId}`, // or your real route
      return_url: `${process.env.REFRESH_URL}?apiKey=${req.user.apiKey}`,
      type: 'account_onboarding',
    });

    console.log('Account Link: ', accountLink); 
    if(accountLink.url){ 
      await UserCollection.updateOne({apiKey: req.user.apiKey}, {$set: { 
        accountLink: accountLink.url
      }});
    }

    return res.status(200).json({ 
      accountLink: accountLink.url
    }); 
    }

    console.error('[ERROR]: ', error.name)

    return res.status(500).json({ 
      error: error.message
    })
  }
})

router.get('/update-login-link', AuthAccountMiddleWare, async(req, res)=>{
  try{
    const { url } = req.query;
    const { apiKey } = req.user;  
    const MongoClient = await CreateMongoDbConnection(); 
    const db = await MongoClient.db(); 
    const UsersCollection = await db.collection(USER_COLLECTION); 

    const CurrentUser = await UsersCollection.updateOne({apiKey: apiKey}, {$set: { 
      accountLink: url
    }}); 

    return res.status(200).json({ 
      message: "Successfully Updated account Url", 
      loginUrl: url
    }); 
  }catch(error){ 
    return res.status(500).json({ 
      error: error.message
    })
  }
})

module.exports = router;
