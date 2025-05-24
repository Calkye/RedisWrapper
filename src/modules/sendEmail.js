require('dotenv').config(); 

const { Resend } = require('resend'); 

const resend = new Resend(process.env.RESEND_API_KEY)

const sendEmail = async(to, subject, html)=>{
  try{
  const data = await resend.emails.send({ 
    from: process.env.FROM_EMAIL, 
    to, 
    subject, 
    html
  }); 
  return true; 
  }catch(error){ 
    throw new Error('Email failed to send'); 
  }
}


module.exports = sendEmail; 