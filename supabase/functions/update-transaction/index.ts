// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from 'jsr:@supabase/supabase-js@2'
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import axiod from "https://deno.land/x/axiod/mod.ts";

console.log("Hello from Functions!")

export const acceptedErrorMessages = [ "Event in the past","Event is already canceled"];

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

Deno.serve(async (req) => {
  try{
  debugger
  const supabase = createClient(
    "https://lrustdadugzpmnmlgbrq.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxydXN0ZGFkdWd6cG1ubWxnYnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjExMjIzMjgsImV4cCI6MjAzNjY5ODMyOH0.60F1_V00J0xY-lj1lTeHfPtyITvZhkBu5eyAjHe3lTg"
  )

  const time = 10*60*1000;

  const threshholdDate = new Date(Date.now() - time)?.toISOString();

  const { data: historyData, error: historyError } = await supabase.from('history').select('*').lte("purchaseTime", threshholdDate).eq("paymentStatus","Payment Pending");
  
  console.log("historyData",historyData);
  
  if (!historyData) {
    return new Response(JSON.stringify({ message: "Invalid params"}), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  debugger
  for await(const history of historyData){
    console.log("processing history",history?.id);


    const meetingUri = history?.meetingUri; // https://api.calendly.com/scheduled_events/57246154-14fc-44d9-835d-20ff878a50a2
    
    // get id (last part of uri)
    if(!meetingUri){
      console.log("Invalid meeting uri");
      continue;
    }
    const meetingId = meetingUri?.split('/')?.pop();

    const response = await cancelMeeting(meetingId, "Payment not done on time");
    debugger
    if(response.success){
      console.log("Meeting cancelled successfully");
      debugger
      // update record status to Cancelled
      const {data:update, error: updateError }  = await supabase.from('history').update({paymentStatus: 'Cancelled'}).eq('id', history.id);
      console.log({update, updateError});
      if(updateError){
        console.log("Error while updating record status to Cancelled");
      }
      console.log("Record status updated to Cancelled",history.id);
    }else if( acceptedErrorMessages?.includes(response?.message)){
      console.log("Meeting already cancelled");
      debugger
      // update record status to Cancelled
      const {data:update, error: updateError } = await supabase.from('history').update({paymentStatus: 'Cancelled'}).eq('id', history.id);
      // console.log({update, updateError});
      console.log("Record status updated to Cancelled",history.id);
    }else{
      console.log("Error while cancelling meeting",response);
    }
        // sleep for 5 seoonds
        // await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  


  const data = {
    message: "Hello from Functions!",
    headers: req.headers,
    method: req.method,
    url: req.url,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
}catch(err){
  console.log(err);
  return new Response(
    JSON.stringify({message:err?.message}),
    { headers: { "Content-Type": "application/json" } },
  )
}
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-transaction' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
