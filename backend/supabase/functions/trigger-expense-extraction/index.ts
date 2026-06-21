import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const INNGEST_EVENT_KEY = Deno.env.get("INNGEST_EVENT_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), { status: 401, headers: corsHeaders })
    }

    const { trip_id, message_id, message_content } = await req.json()

    if (!trip_id || !message_id || !message_content) {
      return new Response(
        JSON.stringify({ error: "Missing required payload parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const response = await fetch(`https://inn.gs/e/${INNGEST_EVENT_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "app/expense.extraction.triggered",
        data: { trip_id, message_id, message_content }
      })
    })

    if (!response.ok) {
      throw new Error(`Inngest endpoint rejected event: ${response.statusText}`)
    }

    return new Response(
      JSON.stringify({ triggered: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    // Typecast 'err' as an Error object to satisfy strict TypeScript rules
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})