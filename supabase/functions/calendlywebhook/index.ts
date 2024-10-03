// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Hello from Calendly Webhook Function!")

Deno.serve(async (req) => {

  try {
    const supabase = createClient(
      "https://lrustdadugzpmnmlgbrq.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxydXN0ZGFkdWd6cG1ubWxnYnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjExMjIzMjgsImV4cCI6MjAzNjY5ODMyOH0.60F1_V00J0xY-lj1lTeHfPtyITvZhkBu5eyAjHe3lTg"
    )
    
    // 1. Get Body: Service Id, User email.


    //const body = await req.text()
    const body = await req.json()

    console.log(body)

    if (body.event == 'invitee.created') {
      const calendlyEventType = body.payload.scheduled_event.event_type;
      const meetingLink = body.payload.scheduled_event.location.join_url;
      const meetingUri = body.payload.scheduled_event.uri;
      const meetingTime = body.payload.scheduled_event.start_time;

      console.log(calendlyEventType, meetingLink, meetingTime);
      const { data: historyData, error: userError } = await supabase.from('history').select('*').eq('calendlyEventType', calendlyEventType);
          
      if (!(historyData && historyData[0])) {
        return new Response(JSON.stringify({ message: "Invalid history document"}), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const historyDocument = historyData[0];

      console.log("historyDocument")
      console.log(historyDocument);

      let paymentStatus = historyDocument.paymentStatus;

      if(historyDocument.subscription && historyDocument.paymentCount > 0) {
        paymentStatus = 'Completed'
      } else {
        paymentStatus = 'Payment Pending'
      }

      console.log({paymentStatus: paymentStatus, 
        meetingLink: meetingLink, meetingTime: meetingTime, meetingUri: meetingUri})

      const { error: updateError } = await supabase.from('history').update({paymentStatus: paymentStatus, 
        meetingLink: meetingLink, meetingTime: meetingTime, meetingUri: meetingUri}).eq('calendlyEventType', calendlyEventType);
     
     if (updateError) {
       return new Response(JSON.stringify({ message: "Invalid history"}), {
         headers: { 'Content-Type': 'application/json' },
         status: 400,
       })
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/caledlywebhook' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
