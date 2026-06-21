// =============================================================
// Inngest Client
// =============================================================
// Shared Inngest client instance used by all functions.
// The app ID groups all functions under the "travelmate" namespace
// in the Inngest dashboard.
// =============================================================

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "travelmate",
});
