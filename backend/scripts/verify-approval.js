// node backend/scripts/verify-approval.js <suggestion_id> <message_id>

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from the backend directory's .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { supabase } = await import("../config/supabaseClient.js");

async function main() {
  const suggestionId = process.argv[2];
  const messageId = process.argv[3];

  console.log("========================================");
  console.log("TravelMate Approval Verification Tool");
  console.log("========================================\n");

  // ==========================================
  // CHECK 1: Approval math verification
  // ==========================================
  console.log("=== CHECK 1 ===");
  if (!suggestionId) {
    console.log("Skipping CHECK 1: suggestion_id command-line argument was not provided.");
    console.log("Usage: node backend/scripts/verify-approval.js <suggestion_id> <message_id>\n");
  } else {
    try {
      console.log(`Verifying approval for suggestion_id: ${suggestionId}`);

      // Fetch suggestion and associated message BEFORE running the RPC
      const { data: suggestionBefore, error: suggestionErrBefore } = await supabase
        .from("expense_suggestions")
        .select("*")
        .eq("id", suggestionId)
        .single();

      let expectedSender = null;
      let originalMessageId = null;

      if (suggestionErrBefore || !suggestionBefore) {
        console.warn(`[Warning] Could not fetch suggestion before RPC: ${suggestionErrBefore?.message || "Not found"}`);
      } else {
        originalMessageId = suggestionBefore.message_id || suggestionBefore.source_message_id;
        if (originalMessageId) {
          const { data: message, error: messageErr } = await supabase
            .from("messages")
            .select("*")
            .eq("id", originalMessageId)
            .single();

          if (messageErr || !message) {
            console.warn(`[Warning] Could not fetch original message ${originalMessageId}: ${messageErr?.message || "Not found"}`);
          } else {
            expectedSender = message.sender_id || message.user_id;
          }
        }
      }

      // 1. Call the approve_expense_suggestion RPC
      console.log("Calling approve_expense_suggestion RPC...");
      const { data: rpcResult, error: rpcErr } = await supabase
        .rpc("approve_expense_suggestion", { suggestion_id: suggestionId });

      // 2. Print the raw return value
      console.log("Raw RPC Return Value:", rpcResult);
      if (rpcErr) {
        console.error("RPC execution error details:", rpcErr);
      }

      // Check if it returned success. Let's look for success field in the returned data.
      const isSuccess = rpcResult && (rpcResult.success === true || rpcResult.success === "true");

      if (isSuccess) {
        // Query the suggestion table again to get the created_expense_id in case it's not in the RPC return
        const { data: suggestionAfter } = await supabase
          .from("expense_suggestions")
          .select("*")
          .eq("id", suggestionId)
          .single();

        const expenseId = rpcResult.expense_id || rpcResult.created_expense_id || rpcResult.id || suggestionAfter?.created_expense_id;

        if (!expenseId) {
          console.log("FAIL: RPC reported success, but no expense_id or created_expense_id was found in the RPC response or suggestion row.");
        } else {
          // 3. Query the expenses table and print details
          const { data: expense, error: expenseErr } = await supabase
            .from("expenses")
            .select("*")
            .eq("id", expenseId)
            .single();

          if (expenseErr || !expense) {
            console.log(`FAIL: Could not query expenses table for ID ${expenseId}: ${expenseErr?.message || "Not found"}`);
          } else {
            console.log("\n--- Expense Row ---");
            console.log(`id: ${expense.id}`);
            console.log(`trip_id: ${expense.trip_id}`);
            console.log(`paid_by (payer_id): ${expense.payer_id}`);
            console.log(`amount: ${expense.amount}`);

            // 4. Query the expense_shares table
            const { data: shares, error: sharesErr } = await supabase
              .from("expense_shares")
              .select("*")
              .eq("expense_id", expenseId);

            if (sharesErr) {
              console.log(`FAIL: Could not query expense_shares: ${sharesErr.message}`);
            } else {
              console.log("\n--- Expense Shares Rows ---");
              shares.forEach((row, idx) => {
                console.log(`[Share #${idx + 1}] owed_by: ${row.user_id}, owed_to: ${expense.payer_id}, amount: ${row.amount_owed}`);
              });

              // 5. Sum all the amount values from the share rows
              const sumShares = shares.reduce((acc, val) => acc + (Number(val.amount_owed) || 0), 0);
              console.log(`\nSum of all shares amount: ${sumShares}`);
              console.log(`Original expense amount: ${expense.amount}`);

              const diff = Math.abs(sumShares - expense.amount);
              if (diff <= 0.05) {
                console.log(`PASS: Sum of shares (${sumShares}) matches original expense amount (${expense.amount}) within 0.05 tolerance.`);
              } else {
                console.log(`FAIL: Sum of shares (${sumShares}) does not match original expense amount (${expense.amount}). Difference: ${diff}`);
              }

              // 6. Print a PASS/FAIL line confirming paid_by matches expected sender
              console.log("\n--- Sender Verification ---");
              console.log(`Expected sender (message author): ${expectedSender}`);
              console.log(`Actual paid_by (expense payer_id): ${expense.payer_id}`);
              
              if (!expectedSender) {
                console.log("FAIL: Could not determine expected sender because original message or suggestion message_id was missing/invalid.");
              } else if (expense.payer_id === expectedSender) {
                console.log("PASS: paid_by matches the expected sender.");
              } else {
                console.log(`FAIL: paid_by (${expense.payer_id}) does not match the expected sender (${expectedSender}).`);
              }
            }
          }
        }
      } else {
        console.log("FAIL: RPC did not return success. Skipping further validation steps in CHECK 1.");
      }
    } catch (err) {
      console.error("An error occurred during CHECK 1:", err);
    }
  }
  console.log("\n");

  // ==========================================
  // CHECK 2: expense_extracted warning check
  // ==========================================
  console.log("=== CHECK 2 ===");
  if (!messageId) {
    console.log("Skipping CHECK 2: message_id command-line argument was not provided.");
    console.log("Usage: node backend/scripts/verify-approval.js <suggestion_id> <message_id>\n");
  } else {
    try {
      console.log(`Checking message_id: ${messageId}`);

      // 1. Query the messages table
      const { data: message, error: messageErr } = await supabase
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .single();

      if (messageErr) {
        console.log(`FAIL: Could not query messages table: ${messageErr.message}`);
      } else if (!message) {
        console.log("FAIL: Message not found in database.");
      } else {
        const expenseExtracted = message.expense_extracted;
        console.log(`expense_extracted column value: ${expenseExtracted}`);

        // 2. Print PASS/FAIL line
        if (expenseExtracted === true) {
          console.log("PASS: expense_extracted is true");
        } else {
          console.log("FAIL: expense_extracted is false or null");
          console.log("Raw row data:", message);
        }
      }
    } catch (err) {
      console.error("An error occurred during CHECK 2:", err);
    }
  }
  console.log("========================================\n");
}

main().catch(console.error);
