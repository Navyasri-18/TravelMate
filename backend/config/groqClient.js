// =============================================================
// Groq AI Client
// =============================================================
// Used for AI-powered features like expense extraction from
// chat messages. Groq provides fast LLM inference.
//
// Get your API key at: https://console.groq.com/keys
// Set it in .env: GROQ_API_KEY=gsk_...
// =============================================================

import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn(
    "⚠️  GROQ_API_KEY not set — AI features (expense extraction) will not work."
  );
}

export const groq = apiKey ? new Groq({ apiKey }) : null;

export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
