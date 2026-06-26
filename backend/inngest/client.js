// =============================================================
// Inngest Client
// =============================================================
// Shared Inngest client instance used by all functions.
// The app ID groups all functions under the "travelmate-backend"
// namespace in the Inngest dashboard.
//
// INNGEST_SIGNING_KEY must be set in the environment (Render env vars
// for production, .env for local dev).
// =============================================================

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "travelmate-backend",
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
