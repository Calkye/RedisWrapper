const jwt = require('jsonwebtoken'); 
const CreateConnectionToRedis = require('../../CreateConnectionToRedis.js'); 

const VERIFICATION_SECRET = process.env.EMAIL_VERIFY_SECRET || "631811e442f41ef2fc4ce273007c9270125650ac6334e042bc5f8124b45c95607debd4448ff2a6baf9c2486bd32952f1ecd59763e4fe5a3a28026b6af8e4e0c5"; 


const sendEmail = require('../sendEmail.js'); 

const Address = process.env.TOKEN_ADDRESS;

const sendVerificationEmail = async(username, email)=>{ 
  const token = jwt.sign({ username, email }, VERIFICATION_SECRET); 
  const client = await CreateConnectionToRedis(); 
  await client.set(`verify:${username}`, token, { 
    EX: 60 * 15 // 15 minutes
  }); 

  const link = `${Address}/api/verify-email?token=${token}`;
  const subject = 'Verify your waterbase account'; 
  const body = `
  <p>Click the link to verify your email:</p><a href="${link}">${link}</a>`;
  await sendEmail(email, subject, body);  // leave body as HTML now
}


const sendApiEmail = async(email, apiKey)=>{
  console.debug('[DEBUG EMAIL SENT]: ', apiKey); 
  const subject = `Successfully Verified waterbase account`; 
  const body = ` 
  <p>Thank you for signing up to Waterbase, Here is your Api Key: </p>
  <p>${apiKey}</p>
  `

  await sendEmail(email, subject, body); 

}


module.exports = {
  sendVerificationEmail,
  sendApiEmail
}; 