// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import Stripe from "npm:stripe@^13.0.0"
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
export const acceptedErrorMessages = [ "Event in the past","Event is already canceled"];
const stripeKey = Deno.env.get("STRIPE_KEY")

const stripe = new Stripe(stripeKey, {
  //apiVersion: "2023-08-16",
})

export const cancelSubscription = async (subscriptionId:string)=>{
  try{
    const response = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      },
    );

    console.log(response);

    return {
      success:true,
      message:"done",
      response:response,
    };
  }catch(err){
    console.log("Error on cancel subscription",err);
    
    return {
      success:false,
      message:err?.message,
    }
  }
}

export const cancelMeeting = async(uuid:string,reason:string="Not Required")=>{
  try{
    const url = `https://api.calendly.com/scheduled_events/${uuid}/cancellation`

    const response = await axiod({
      method: 'post',
    url: url,
    headers: { 
    'Authorization': 'Bearer eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzIzMDg4MTkzLCJqdGkiOiIxOGZkN2IzMS1lODE1LTQ4NDktODYxMC1mZTRkODkwMzA3NmEiLCJ1c2VyX3V1aWQiOiJlNjIwYWIwZC1hNzc5LTQ5YzItYTdiNy00MTI2ZGQ0YWYxZWEifQ.ZJkplXjMvf8ZSGLEw_t-W6ED_qghjNTiPX2tugjc8BmI22QtrTmi1-TRBOzB_FFkYM0Fi6sOQtxsnHawBiGybQ', 
    'Content-Type': 'application/json', 
    'Cookie': '__cf_bm=J_q1PuxjOOTzdn_DqvVxKzfJ7oTWHPU.N3fSEcKLXVc-1721990188-1.0.1.1-Q.zGIV4wxgTkIGpH722ElvG5RfPljeqOBO66d1dOpNvDc7VN2V1WCIGGUc8.ddmhuOS6qnxLzGs87Q3R3lsPFA; _cfuvid=MHnBlRlp7ug2tJr8mpGPsIa0FI.bnmKCNou0MUUaSxQ-1721988733107-0.0.1.1-604800000'
  },
    data : {
      reason:reason,
    }
    })

    console.log(response.data)

    if(response?.status===201){
      return {
        success:true,
        message:"done",
      };
    }else{
      return {
        success:false,
        message:response?.data?.data?.message,
      }
    }
  }
  catch(err){
    // console.log("Error on cancel",err);
    if(acceptedErrorMessages?.includes(err?.response?.data?.message)){
      return {
        success:true,
        message:err?.message,
      }
    }
    return {
      success:false,
      message:err?.message,
    }
  }
}
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  try{
    console.log("Staring cancel subscription")
    console.log("req method",req?.method);
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers:corsHeaders   })
    }
    if(req?.method!=="POST"){
      return new Response(
        JSON.stringify({ message: "Method not allowed" }),
        { headers: { "Content-Type": "application/json" }, status: 405 },
      )
    }
  const body = await req.json()
    console.log("body",body)
  const email = body?.email;
  const historyId = body?.historyId;

  if(!email || !historyId){
    return new Response(
      JSON.stringify({ message: "Invalid params, email and historyId is required!" }),
      { headers: { "Content-Type": "application/json" }, status: 400 },
    )
  }

  const supabase = createClient(
    "https://lrustdadugzpmnmlgbrq.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxydXN0ZGFkdWd6cG1ubWxnYnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjExMjIzMjgsImV4cCI6MjAzNjY5ODMyOH0.60F1_V00J0xY-lj1lTeHfPtyITvZhkBu5eyAjHe3lTg"
  )

  const { data: userData, error: userError } = await supabase.from('users').select('*').eq('email', email)

  if (!userData || !userData.length) {
    return new Response(
      JSON.stringify({ message: "User not found" }),
      { headers: { "Content-Type": "application/json" }, status: 400 },
    )
  }

  const user = userData?.[0]

  const {
    data: historyData,
    error: historyError
  } = await supabase.from('history').select('*').eq('id', historyId).eq("userId",user?.userId);
  // console.log("historyData",historyData)

  if (!historyData || !historyData.length) {
    return new Response(
      JSON.stringify({ message: "Subscription not found" }),
      { headers: { "Content-Type": "application/json" }, status: 400 },
    )
  }

  const history = historyData?.[0]

  if(!history?.subscription||history?.paymentStatus!=="Completed"){
    return new Response(
      JSON.stringify({ message: "Not a valid subscription" }),
      { headers: { "Content-Type": "application/json" }, status: 400 },
    )
  }

  const meetingUri = history?.meetingUri;

  if(meetingUri?.trim()){
    const meetingId = meetingUri?.split("/").pop();

    const response =  await cancelMeeting(meetingId,"Subscription cancelled");
  }

  const subscriptionId = history?.subscriptionId;

  console.log("subscriptionId",subscriptionId)

  const cancelSubscriptionResponse = await cancelSubscription(subscriptionId);
  console.log("cancelSubscriptionResponse",cancelSubscriptionResponse)
  // update history 
  if(!cancelSubscriptionResponse?.success){
    return new Response(
      JSON.stringify({ message: cancelSubscriptionResponse?.message }),
      { headers: { "Content-Type": "application/json" }, status: 400
    })
  }
  const { error: updateError } = await supabase.from('history').update({paymentStatus: "Cancelled By User"}).eq('id', historyId);

  if(updateError){
    return new Response(
      JSON.stringify({ message: "Error cancelling subscription" }),
      { headers: { "Content-Type": "application/json" }, status: 400 },
    )
  }

  const data ={
    message:"Subscription cancelled successfully",
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
}catch(err){
  console.log(err);
  return new Response(JSON.stringify({ message: err?.message}), {
    headers: { 'Content-Type': 'application/json' },
    status: 400,
  })
}
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/cancel-subscription' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
