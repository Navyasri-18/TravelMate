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

IMPORTANT — single transaction vs multiple expenses:
A message describing ONE payment with amounts attributed to specific people
(e.g. "I paid 4500 for food, @Ayemen owes 2300, @Tej owes 1200") describes
ONE transaction with a breakdown of who owes what — NOT three separate
expenses. In this case, return exactly ONE expense object representing the
total payment, and do not create separate line items for each named amount.
Only return multiple expense objects if the message genuinely describes
multiple distinct purchases (e.g. "paid 500 for lunch and 200 for a taxi").

Return a JSON object with a single key "expenses" whose value is an array of expense objects.
Each expense object should have:
- "description": short description of the expense (string)
- "amount": the TOTAL amount of the transaction in numbers only (number) — if the
  message names specific people and amounts, this should be the sum of those
  amounts, not any single named amount
- "currency": the currency code, default "USD" if not specified (string)
- "category": one of "food", "transport", "accommodation", "activities", "shopping", "other" (string)
- "split_count": number of people splitting, if mentioned (number or null)
- "per_person": amount per person if split is mentioned (number or null)

If no expenses are found in the message, return: {"expenses": []}

IMPORTANT:
- Only return the JSON object described above, no other text
- A message naming multiple people and their individual owed amounts is ONE
  expense object, not one object per named person
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
    const { trip_id, message_id, message_content, shares } = event.data;

    console.log(
      `[Expense Extraction] Processing message ${message_id} for trip ${trip_id}`,
    );

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
    // Step 2: Fetch message sender (always the payer)
    // ---------------------------------------------------------
    const payerId = await step.run("fetch-message-sender", async () => {
      const { data: msg, error } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("id", message_id)
        .single();

      if (error) {
        console.warn(
          "[Expense Extraction] Could not fetch sender_id:",
          error.message,
        );
        return null;
      }
      return msg?.sender_id ?? null;
    });

    // ---------------------------------------------------------
    // Step 3: Save extracted expenses to Supabase
    // ---------------------------------------------------------
    const saved = await step.run("save-expenses-to-db", async () => {
      const hasShares = Array.isArray(shares) && shares.length > 0;

      let expenseRows;

      if (hasShares) {
        // Custom split: insert exactly ONE row with summed amount and full shares array.
        // Sender is always the payer; ignore the AI's per-item breakdown.
        const totalAmount = shares.reduce(
          (sum, s) => sum + (Number(s.amount) || 0),
          0,
        );
        expenseRows = [
          {
            trip_id,
            message_id,
            suggested_description:
              extracted.items[0]?.description || "Shared expense",
            suggested_amount: totalAmount,
            suggested_category: extracted.items[0]?.category || "other",
            suggested_shares: shares,
            suggested_payer_id: payerId,
          },
        ];
      } else {
        // Equal/no split: one row per AI-extracted item (existing behaviour).
        expenseRows = extracted.items.map((item) => ({
          trip_id,
          message_id,
          suggested_description: item.description || "Unnamed expense",
          suggested_amount: Number(item.amount) || 0,
          suggested_category: item.category || "other",
          suggested_shares: null,
          suggested_payer_id: payerId,
        }));
      }

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
    // NOTE: Commented out because the messages table doesn't have an expense_extracted column yet.
    // Ayemen will add the column in a future schema migration.
    /*
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
    */

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
