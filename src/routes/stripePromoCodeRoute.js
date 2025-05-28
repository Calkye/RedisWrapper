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
    // Check if user already has a commission code
    const existingUser = await UserCollection.findOne({ username });
    if (existingUser?.commissionCode) {
      return res.status(400).json({
        error: "Commission code already exists",
        commissionCode: existingUser.commissionCode
      });
    }

    const newCommissionCode = `${username.toUpperCase()}_REF`;

    // Check if promo code already exists (just in case)
    const codeExists = await PromoCodeTrackingCollection.findOne({ code: newCommissionCode });
    if (codeExists) {
      return res.status(400).json({ error: "Commission code already taken" });
    }
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
      refresh_url: process.env.REFRESH_URL, // or your real route
      return_url: process.env.RETURN_URL,
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
    await UserCollection.updateOne({ username }, {
      $set: {
        commissionCode: newCommissionCode, 
        stripeAccountId: stripeAccount.id
      }
    });

    return res.status(200).json({
      message: "Commission code created successfully. Any user who uses this code will credit 30% commission to the creator.",
      commissionCode: newCommissionCode, 
      stripeAccountId: stripeAccount.Id, 
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

router.get('/test-login-link/:accountId', async(req, res)=>{
  const { accountId } = req.params; 
  try{
    const loginLink = await stripe.accounts.createLoginLink(accountId); 
    res.redirect(loginLink.url); 
  }catch(error){
    return res.status(500).json({ 
      error: error.message
    })
  }
})

module.exports = router;
