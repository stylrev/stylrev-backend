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
//import { createCustomer } from "./payment"
import { DateTime } from "https://cdn.skypack.dev/luxon";


console.log("Hello from Stripe Webhook Function!")

Deno.serve(async (req) => {

  try {
    const supabase = createClient(
      "https://lrustdadugzpmnmlgbrq.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxydXN0ZGFkdWd6cG1ubWxnYnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjExMjIzMjgsImV4cCI6MjAzNjY5ODMyOH0.60F1_V00J0xY-lj1lTeHfPtyITvZhkBu5eyAjHe3lTg"
    )
    
    // 1. Get Body: Service Id, User email.


    const body = await req.text()
    console.log("body", body)
    const signature = await req.headers.get('stripe-signature');
 

    const event = await stripe.webhooks.constructEventAsync(body, signature, "whsec_Ok0cNZCcbhi8Up7FqToPIVdd6RUpfYne");

    console.log(`event type ${event.type}`);
    console.log(event.data.object)

    // Handle the event
    if (event.type =='checkout.session.completed') {

      
          const checkoutSuccess = event.data.object;
          // Then define and call a function to handle the event payment_intent.succeeded
          console.log(`Event type ${event.type}`, checkoutSuccess);

          const checkoutId = checkoutSuccess?.id;
          const subscriptionId = checkoutSuccess?.subscription;

          const { data: historyData, error: userError } = await supabase.from('history').select('*').eq('checkoutId', checkoutId);
          
          if (!(historyData && historyData[0])) {
            return new Response(JSON.stringify({ message: "Invalid history document"}), {
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            })
          }

          const historyDocument = historyData[0];

          console.log("historyDocument")
          console.log(historyDocument);

          console.log(checkoutId)

          let calendlyLink = historyDocument.calendlyLink;
          let paymentStatus = historyDocument.paymentStatus;

        


          if (historyDocument.paymentCount == 0) {
            // create new calendly link.
            paymentStatus = "Completed"

            let paymentCount = historyDocument.paymentCount;
            if (!historyDocument.subscription) {
              paymentCount = paymentCount + 1;
            }

            let lastSubscriptionCompletionDate = null
            if(historyDocument?.subscription){

            lastSubscriptionCompletionDate = historyDocument?.subscription_completion_date;
            if(!lastSubscriptionCompletionDate) {
              lastSubscriptionCompletionDate = DateTime.now().toISO(); 
            }

            if(historyDocument?.paymentType==="Monthly"){
              lastSubscriptionCompletionDate = DateTime.now().plus({months:1}).toISO();
            }else if(historyDocument?.paymentType==="Yearly"){
              lastSubscriptionCompletionDate = DateTime.now().plus({years:1}).toISO();
            }
          }


            

            console.log(paymentStatus, calendlyLink, paymentCount, checkoutId)

            const { error: updateError } = await supabase.from('history').update({paymentStatus: paymentStatus, stripeStatus: "Paid",
              calendlyLink: calendlyLink, paymentCount: paymentCount, subscriptionId: subscriptionId,subscription_completion_date:lastSubscriptionCompletionDate}).eq('checkoutId', checkoutId);
          
            if (updateError) {
              return new Response(JSON.stringify({ message: "Invalid history"}), {
                headers: { 'Content-Type': 'application/json' },
                status: 400,
              })
            }
            
          }
        } else if (event.type == 'invoice.payment_succeeded') {
          await new Promise(resolve => setTimeout(resolve, 10000));
          const invoiceSuccess = event.data.object;
          // Then define and call a function to handle the event payment_intent.succeeded
          console.log(`Event type ${event.type}`, invoiceSuccess);

          const subscriptionId = invoiceSuccess?.subscription;

          const { data: historyData, error: userError } = await supabase.from('history').select('*').eq('subscriptionId', subscriptionId);
          
          if (!(historyData && historyData[0])) {
            return new Response(JSON.stringify({ message: "Invalid history document"}), {
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            })
          }

          const historyDocument = historyData[0];

          console.log("historyDocument")
          console.log(historyDocument);

          let calendlyLink = historyDocument.calendlyLink;
          let calendlyEventType = historyDocument.calendlyLink;
          let calendlyResource = historyDocument.calendlyLink;
          let paymentStatus = historyDocument.paymentStatus;

          if (historyDocument.subscription) {
            // create new calendly link.
            if (historyDocument.paymentCount > 0) {
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
                  headers: { 'Content-Type': 'application/json' },
                  status: 400,
                })
              }

              calendlyLink = responseCalendly.data.resource.scheduling_url;
              calendlyEventType = responseCalendly.data.resource.uri;
              calendlyResource = responseCalendly.data.resource;
              paymentStatus = "Schedule Call"

            }
            debugger
            let paymentCount = historyDocument?.paymentCount + 1;
            debugger

            let lastSubscriptionCompletionDate = null
            if(historyDocument?.subscription){

            lastSubscriptionCompletionDate = historyDocument?.subscription_completion_date;
            if(!lastSubscriptionCompletionDate) {
              lastSubscriptionCompletionDate = DateTime.now().toISO(); 
            }

            if(historyDocument?.paymentType==="Monthly"){
              lastSubscriptionCompletionDate = DateTime.now().plus({months:1}).toISO();
            }else if(historyDocument?.paymentType==="Yearly"){
              lastSubscriptionCompletionDate = DateTime.now().plus({years:1}).toISO();
            }
          }
              

            const { error: updateError } = await supabase.from('history').update({paymentStatus: paymentStatus, stripeStatus: "Paid",
                calendlyLink: calendlyLink, calendlyEventType: calendlyEventType, calendlyResource: calendlyResource, paymentCount: paymentCount, subscriptionId: subscriptionId,subscription_completion_date:lastSubscriptionCompletionDate}).eq('subscriptionId', subscriptionId);
                debugger
            if (updateError) {
              console.log(updateError)
              return new Response(JSON.stringify({ message: "Invalid history"}), {
                headers: { 'Content-Type': 'application/json' },
                status: 400,
              })
            }

          }
            
    }

    return new Response("success", {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({ message: error?.message}), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
  
})


/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripewebhook' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
