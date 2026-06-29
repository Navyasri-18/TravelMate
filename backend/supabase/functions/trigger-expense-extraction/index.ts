import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const INNGEST_EVENT_KEY = Deno.env.get("INNGEST_EVENT_KEY")
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")

serve(async (req) => {
  try {
    // 1. SECURITY: Verify internal caller
    const secretHeader = req.headers.get('x-webhook-secret')
    if (secretHeader !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized caller" }), { status: 401 })
    }

    const payload = await req.json()
    const record = payload.record
    if (!record) {
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), { status: 400 })
    }

    // 2. PAYLOAD MAPPING: Extract the message details
    const trip_id = record.trip_id
    const message_id = record.id
    const message_content = record.content
    const shares = record.shares || null
    
    // CUSTOM PAYER UPGRADE: Capture the parsed mention payer from the message row
    const payer_id = record.payer_id || record.suggested_payer_id || null

    // 3. FILTERING: Early-exit check
    if (record.deleted_at !== null || !message_content || message_content.trim() === '') {
      return new Response(JSON.stringify({ skipped: true, reason: "Empty or deleted message" }), { status: 200 })
    }

    // 4. FIRE INNGEST PAYLOAD
    const response = await fetch(`https://inn.gs/e/${INNGEST_EVENT_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "app/expense.extraction.triggered",
        data: { 
          trip_id, 
          message_id, 
          message_content, 
          shares, 
          payer_id
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Inngest endpoint rejected event: ${response.statusText}`)
    }

    return new Response(JSON.stringify({ triggered: true }), { status: 200 })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 })
  }
})