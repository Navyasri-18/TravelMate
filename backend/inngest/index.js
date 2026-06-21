// =============================================================
// Inngest Functions Registry
// =============================================================
// All Inngest functions must be registered here.
// This array is passed to the serve() handler in server.js.
//
// To add a new function:
//   1. Create it in ./functions/<name>.js
//   2. Import it below
//   3. Add it to the functions array
// =============================================================

import helloFunction from "./functions/hello.js";
import expenseExtractionFunction from "./functions/expenseExtraction.js";

export const functions = [helloFunction, expenseExtractionFunction];
