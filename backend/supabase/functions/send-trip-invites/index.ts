import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// The fully patched CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Catch the preflight request immediately
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { emails, tripName, inviteLink, inviterName } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'TravelMate <onboarding@resend.dev>',
        to: emails, 
        subject: `${inviterName} invited you to join ${tripName}! ✈️`,
        html: `
          <div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h2>You've been invited!</h2>
            <p><strong>${inviterName}</strong> has invited you to coordinate the upcoming <strong>${tripName}</strong> trip on TravelMate.</p>
            <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 8px; margin-top: 20px;">
              Join the Trip
            </a>
          </div>
        `
      })
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})