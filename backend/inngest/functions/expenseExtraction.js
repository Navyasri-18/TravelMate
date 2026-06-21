// =============================================================
// Inngest Function: Expense Extraction
// =============================================================
// Triggered by: "app/expense.extraction.triggered"
// Source: Supabase Edge Function (trigger-expense-extraction)
//
// Flow:
//   1. User sends a chat message in a trip
//   2. Edge function fires this event via HTTP POST
//   3. This function calls Groq AI to extract expense items
//   4. Saves extracted expenses to Supabase DB
//
// Event data shape:
//   { trip_id, message_id, message_content, triggered_at }
// =============================================================

import { inngest } from "../client.js";
import { groq, GROQ_MODEL } from "../../config/groqClient.js";
import { supabase } from "../../config/supabaseClient.js";

/**
 * System prompt for the AI expense extractor.
 * Instructs the model to return structured JSON from natural language.
 */
const EXTRACTION_SYSTEM_PROMPT = `You are an expense extraction assistant for a travel app.
Given a chat message, extract any expense or cost information mentioned.

Return a JSON object with a single key "expenses" whose value is an array of expense objects.
Each expense object should have:
- "description": short description of the expense (string)
- "amount": the total amount in numbers only (number)
- "currency": the currency code, default "USD" if not specified (string)
- "category": one of "food", "transport", "accommodation", "activities", "shopping", "other" (string)
- "split_count": number of people splitting, if mentioned (number or null)
- "per_person": amount per person if split is mentioned (number or null)

If no expenses are found in the message, return: {"expenses": []}

IMPORTANT:
- Only return the JSON object described above, no other text
- Parse amounts carefully — "$45 split 3 ways" means amount=45, split_count=3, per_person=15
- Handle various formats: "$45", "45 dollars", "€30", "30 EUR", etc.`;

const expenseExtractionFunction = inngest.createFunction(
  {
    id: "expense-extraction",
    name: "AI Expense Extraction",
    retries: 2,
  },
  { event: "app/expense.extraction.triggered" },
  async ({ event, step }) => {
    const { trip_id, message_id, message_content } = event.data;

    console.log(
      `[Expense Extraction] Processing message ${message_id} for trip ${trip_id}`,
    );

    // ---------------------------------------------------------
    // Step 0: Fetch the trip's authoritative currency from Supabase
    // ---------------------------------------------------------
    const tripCurrency = await step.run("fetch-trip-currency", async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("currency")
        .eq("id", trip_id)
        .single();

      if (error || !data) {
        console.error(
          "[Expense Extraction] Failed to fetch trip currency for trip",
          trip_id,
          error?.message,
        );
        throw new Error(
          `Could not fetch currency for trip ${trip_id}: ${error?.message ?? "no data"}`,
        );
      }

      const currency = data.currency;
      if (currency !== "INR" && currency !== "USD") {
        throw new Error(
          `Unexpected currency value "${currency}" for trip ${trip_id} — expected "INR" or "USD"`,
        );
      }

      console.log(`[Expense Extraction] Trip ${trip_id} currency: ${currency}`);
      return currency;
    });

    // ---------------------------------------------------------
    // Step 1: Extract expenses from message using Groq AI
    // ---------------------------------------------------------
    const extracted = await step.run("extract-expenses-with-ai", async () => {
      if (!groq) {
        console.warn(
          "[Expense Extraction] Groq client not available — GROQ_API_KEY not set",
        );
        return { items: [], skipped: true };
      }

      try {
        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
            { role: "user", content: message_content },
          ],
          temperature: 0.1, // Low temp for structured output
          max_tokens: 1024,
          response_format: { type: "json_object" },
        });

        const responseText =
          completion.choices[0]?.message?.content?.trim() || "[]";

        let parsed;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          console.error(
            "[Expense Extraction] Failed to parse AI response:",
            responseText,
          );
          return { items: [], parseError: true };
        }

        // Handle both { expenses: [...] } and direct [...] formats
        const items = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.expenses)
            ? parsed.expenses
            : [];

        console.log(
          `[Expense Extraction] AI found ${items.length} expense(s) in message`,
        );
        return { items, skipped: false };
      } catch (error) {
        console.error("[Expense Extraction] Groq API error:", error.message);
        throw error; // Let Inngest retry
      }
    });

    // If no expenses found or extraction was skipped, exit early
    if (extracted.skipped || extracted.items.length === 0) {
      console.log(
        `[Expense Extraction] No expenses to save for message ${message_id}`,
      );
      return {
        success: true,
        trip_id,
        message_id,
        expenses_found: 0,
        skipped: extracted.skipped || false,
      };
    }

    // ---------------------------------------------------------
    // Step 2: Save extracted expenses to Supabase
    // ---------------------------------------------------------
    const saved = await step.run("save-expenses-to-db", async () => {
      // NOTE: split_count and per_person_amount are extracted from the message and stored
      // here for informational purposes, but they are NOT consumed by the approval flow.
      // approve_expense_suggestion (a Postgres RPC) performs an equal split among all
      // trip members regardless of these values — this is a deliberate v1 scope decision,
      // not a bug. source_message_id is stored to link each suggestion back to its origin.
      const expenseRows = extracted.items.map((item) => ({
        trip_id,
        source_message_id: message_id,
        description: item.description || "Unnamed expense",
        amount: Number(item.amount) || 0,
        currency: tripCurrency, // always use the trip's own currency, never the model's guess
        category: item.category || "other",
        split_count: item.split_count || null,
        per_person_amount: item.per_person || null,
        extraction_status: "extracted",
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("expense_suggestions")
        .insert(expenseRows)
        .select("id");

      if (error) {
        console.error("[Expense Extraction] DB insert error:", error.message);
        throw error; // Let Inngest retry
      }

      console.log(`[Expense Extraction] Saved ${data.length} expense(s) to DB`);
      return { count: data.length, ids: data.map((r) => r.id) };
    });

    // ---------------------------------------------------------
    // Step 3: Update the original message to mark it as processed
    // ---------------------------------------------------------
    await step.run("mark-message-processed", async () => {
      const { error } = await supabase
        .from("messages")
        .update({ expense_extracted: true })
        .eq("id", message_id);

      if (error) {
        // Non-critical — log but don't fail the function
        console.warn(
          "[Expense Extraction] Could not mark message as processed:",
          error.message,
        );
      }
    });

    return {
      success: true,
      trip_id,
      message_id,
      expenses_found: saved.count,
      expense_ids: saved.ids,
    };
  },
);

export default expenseExtractionFunction;
