require('dotenv').config(); 
const stripeKey = process.env.STRIPE_API_KEY;
const Stripe = require('stripe');
const stripe = Stripe(stripeKey);

app.post('/api/create-checkout-session', async (req, res) => {
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
      success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/cancel',
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Stripe session failed', raw: err.message });
  }
});


app.post('/api/success', async(req, res)=>{ 
  const session_id = req.query.session_id; 
  if(!session_id) return res.status(400).json({error: "Missing session id"}); 
  const session = await stripe.checkout.sessions.retrieve(session_id); 
  const customer = await stripe.customers.retrieve(session.customer); 


  return res.status(200).json({ 
    message: "Payment sucesssful"
  }); 
}); 



describe('Stripe Payment Integration Test', () => {
  let sessionId = '';

  it('should create a Stripe checkout session (real call)', async () => {
    const res = await request(app).post('/api/create-checkout-session').send();

    expect(res.status).toBe(200);
    console.log('[PAYMENT SESSION URL]: ', res.body.url);
    console.log('[SESSION ID]: ', res.body.sessionId);

    sessionId = res.body.sessionId;
    expect(sessionId).toMatch(/^cs_test_/); // session ID format
  });





});
