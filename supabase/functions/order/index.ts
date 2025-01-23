import Stripe from "npm:stripe@^13.0.0"
import axiod from "https://deno.land/x/axiod/mod.ts";
const stripeKey = Deno.env.get("STRIPE_KEY")

const stripe = new Stripe(stripeKey, {
  //apiVersion: "2023-08-16",
})
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
// import luxon
import { DateTime } from "https://cdn.skypack.dev/luxon";
//import { createCustomer } from "./payment"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Hello from Functions!")

Deno.serve(async (req) => {


  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders  })
  }

  console.log(  req.headers.get('Authorization'))
  const supabase = createClient(
    "https://lrustdadugzpmnmlgbrq.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxydXN0ZGFkdWd6cG1ubWxnYnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjExMjIzMjgsImV4cCI6MjAzNjY5ODMyOH0.60F1_V00J0xY-lj1lTeHfPtyITvZhkBu5eyAjHe3lTg"
  )

//  console.log(data1)
  debugger;
  
  // 1. Get Body: Service Id, User email.
  const { serviceId, email, paymentCycle } = await req.json()

  // 2. Get service document and user document.
  
 

  const { data: userData, error: userError } = await supabase.from('users').select('*').eq('email', email)
  const { data: serviceData, error: serviceErrors } = await supabase.from('services').select('*').eq('id', serviceId)
  
  if (!(userData && userData[0] && serviceData && serviceData[0])) {
    return new Response(JSON.stringify({ message: "Invalid params"}), {
      headers: { ...corsHeaders , 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  const userDocument = userData[0];
  const serviceDocument = serviceData[0];


  // previous history
  const { data: previousHistoryData, error: previousHistoryError } = await supabase.from('history').select('*').eq('userId', userDocument.userId).neq('subscriptionId', null).gte('subscription_completion_date', DateTime.now().toISO())
  console.log("previousHistoryData", previousHistoryData)
  if (previousHistoryData && previousHistoryData.length > 0&&(paymentCycle==='month'||paymentCycle==='year')) {
    return new Response(JSON.stringify({ message: "User already has a subscription"}), {
      headers: { ...corsHeaders , 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  // 3. If not stripe customer id create it.

  let stripeCustomerId;
  if (!userDocument.stripeCustomerId) {
  
    const customer = await stripe.customers.create({
      description: userDocument.id,
      email: userDocument.email,
    });

    stripeCustomerId = customer?.id
    const { error: updateError } = await supabase.from('users').update({stripeCustomerId: stripeCustomerId}).eq('email', email)
  } else {
    stripeCustomerId = userDocument.stripeCustomerId
  }

  
  console.log('stripeCustomerId', stripeCustomerId)

  // 4. create calendly link.

  let calStartDate = new Date();
  let calEndDate = new Date();
  calEndDate.setDate(calEndDate.getDate() + 7);

  let data = JSON.stringify({
    "name": "My Meeting",
    "host": "https://api.calendly.com/users/e620ab0d-a779-49c2-a7b7-4126dd4af1ea",
    "duration": 30,
    "timezone": "America/New_York",
    "date_setting": {
      "type": "date_range",
      "start_date": calStartDate.toISOString().split('T')[0],
      "end_date": calEndDate.toISOString().split('T')[0]
    },
    "location": {
      "kind": "google_conference"
    }
  });

  const responseCalendly = await axiod({
    method: 'post',
    url: 'https://api.calendly.com/one_off_event_types',
    headers: { 
    'Authorization': 'Bearer eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzIzMDg4MTkzLCJqdGkiOiIxOGZkN2IzMS1lODE1LTQ4NDktODYxMC1mZTRkODkwMzA3NmEiLCJ1c2VyX3V1aWQiOiJlNjIwYWIwZC1hNzc5LTQ5YzItYTdiNy00MTI2ZGQ0YWYxZWEifQ.ZJkplXjMvf8ZSGLEw_t-W6ED_qghjNTiPX2tugjc8BmI22QtrTmi1-TRBOzB_FFkYM0Fi6sOQtxsnHawBiGybQ', 
    'Content-Type': 'application/json', 
    'Cookie': '__cf_bm=J_q1PuxjOOTzdn_DqvVxKzfJ7oTWHPU.N3fSEcKLXVc-1721990188-1.0.1.1-Q.zGIV4wxgTkIGpH722ElvG5RfPljeqOBO66d1dOpNvDc7VN2V1WCIGGUc8.ddmhuOS6qnxLzGs87Q3R3lsPFA; _cfuvid=MHnBlRlp7ug2tJr8mpGPsIa0FI.bnmKCNou0MUUaSxQ-1721988733107-0.0.1.1-604800000'
  },
    data : data
  });

  console.log(responseCalendly.data)

  if(!(responseCalendly && responseCalendly.status == 201 && responseCalendly.data && responseCalendly.data.resource && responseCalendly.data.resource.scheduling_url )) {
    return new Response(JSON.stringify({ message: "Calendly error"}), {
      headers: { ...corsHeaders , 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  const calendlyLink = responseCalendly.data.resource.scheduling_url;
  const calendlyEventType = responseCalendly.data.resource.uri;
  const calendlyResource = responseCalendly.data.resource;


  // 5. create stripe checkout link.

  let subscriptionCompletionDate = null;

  const currencySymbol = "USD";
  let amount;
  let paymentType;
  let recurringConfig;
  if (serviceDocument.subscription == false && serviceDocument.oneTimePayment) {
    amount = Number(serviceDocument.oneTimePayment)
    paymentType = "One Time";
  } else if (serviceDocument.subscription == true && paymentCycle == 'month' && serviceDocument.monthlyPayment) {
    amount = Number(serviceDocument.monthlyPayment)
    paymentType = "Monthly";
    recurringConfig = {
      interval: 'month',
    }
    subscriptionCompletionDate = DateTime.now().plus({months: 1});
  } else if (serviceDocument.subscription == true && paymentCycle == 'year' && serviceDocument.yearlyPayment) {
    amount = Number(serviceDocument.yearlyPayment)
    paymentType = "Yearly";
    recurringConfig = {
      interval: 'year',
    }
    subscriptionCompletionDate = DateTime.now().plus({years: 1}).toISO();
  }

  console.log("amount", amount)

  if (!amount) {
    return new Response(JSON.stringify({ message: "Invalid amount"}), {
      headers: { ...corsHeaders , 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  let priceConfig = {
    currency: currencySymbol,
    unit_amount: amount * (10 ** 2),
    product_data: {
        name: amount + " " + currencySymbol + ", Payment Cycle: " + paymentType + ", Service: " + serviceDocument.title,
    },
  }

  let subscription = false;

  if (recurringConfig) {
    priceConfig['recurring'] = recurringConfig;
    subscription = true;
  }

  console.log(priceConfig);

  const priceResponse = await stripe.prices.create(priceConfig);

  console.log(priceResponse);

  const priceId = priceResponse.id;

  const sessionResponse = await stripe.checkout.sessions.create({
    success_url: "http://stylrev.com",
    cancel_url: "http://example.com/failure",
    customer: stripeCustomerId,
    line_items: [
        {
            price: priceId,
            quantity: 1,
        },
    ],
    mode: recurringConfig ? 'subscription' : 'payment',
    allow_promotion_codes: true
  });

  console.log("sessionResponse", sessionResponse);

  const checkoutUrl = sessionResponse?.url;
  const checkoutId = sessionResponse?.id;
  const subscriptionId = sessionResponse?.subscription;
  

  // 6. create history document.

  const purchaseTime = new Date();

  const { data: historyData, error: historyError } = await supabase.from('history')
  .insert({userId: userDocument.userId, serviceId: serviceDocument.id, stripeCustomerId: stripeCustomerId, paymentLink: checkoutUrl, paidAmount: amount, 
    calendlyLink: calendlyLink, calendlyEventType: calendlyEventType, calendlyResource: calendlyResource, 
    priceResponse: priceResponse, sessionResponse: sessionResponse, checkoutId: checkoutId, 
    subscription: subscription, subscriptionId: subscriptionId, paymentStatus: "Schedule Call", stripeStatus: "Pending", paymentCount: 0
    , purchaseTime: purchaseTime, paymentType: paymentType,
    // subscription_completion_date: subscriptionCompletionDate,
})
  .select('*');
 
  const historyDocument = historyData?.[0];

  delete historyDocument.calendlyResource;
  delete historyDocument.priceResponse;
  delete historyDocument.sessionResponse;

  return new Response(JSON.stringify({historyDocument}), {
    headers: { ...corsHeaders , 'Content-Type': 'application/json' },
    status: 200,
  })
  
})


/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/order' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
