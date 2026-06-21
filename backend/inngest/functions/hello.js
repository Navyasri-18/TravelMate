// =============================================================
// Inngest Function: Hello World (Test)
// =============================================================
// A simple test function to verify Inngest is wired up correctly.
//
// Trigger: Send event "test/hello.world" from Inngest Dev UI
// Expected: Returns { message: "Hello from TravelMate!" }
//
// How to test:
//   1. Start backend: npm run dev
//   2. Start Inngest dev: npx inngest-cli@latest dev -u http://localhost:8080/api/inngest
//   3. Open http://localhost:8288
//   4. Send event: { name: "test/hello.world", data: {} }
// =============================================================

import { inngest } from "../client.js";

const helloFunction = inngest.createFunction(
  {
    id: "hello-world",
    name: "Hello World Test",
  },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const greeting = await step.run("generate-greeting", async () => {
      const name = event.data?.name || "TravelMate";
      console.log(`Hello function triggered with name: ${name}`);
      return `Hello from ${name}!`;
    });

    return {
      message: greeting,
      receivedAt: new Date().toISOString(),
      eventData: event.data,
    };
  }
);

export default helloFunction;
