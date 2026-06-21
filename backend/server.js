// =============================================================
// TravelMate Backend — Express + Inngest Server
// =============================================================
// This is the persistent Node.js server that:
//   1. Hosts the Inngest serve() endpoint at /api/inngest
//   2. Runs background Inngest functions (AI processing, etc.)
//   3. Provides API endpoints for the frontend and edge functions
//
// Start: npm run dev  (uses nodemon for auto-reload)
// =============================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/index.js";

const app = express();
const PORT = process.env.PORT || 8080;

// ---------------------
// Middleware
// ---------------------
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite dev server (frontend)
      "http://localhost:3000", // Alternative frontend port
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// ---------------------
// Health Check
// ---------------------
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "travelmate-backend",
    timestamp: new Date().toISOString(),
    inngest: {
      functions: functions.length,
      endpoint: "/api/inngest",
    },
  });
});

// ---------------------
// Inngest Serve Endpoint
// ---------------------
// This is where Inngest sends events and receives function definitions.
// The Supabase edge functions POST events here (the "bridge" pattern).
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  })
);

// ---------------------
// Start Server
// ---------------------
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  TravelMate Backend                                  ║
║  Server running on http://localhost:${PORT}             ║
║  Inngest endpoint: http://localhost:${PORT}/api/inngest ║
║  Health check:     http://localhost:${PORT}/api/health  ║
║                                                      ║
║  Registered Inngest functions: ${functions.length}                   ║
╚══════════════════════════════════════════════════════╝
  `);
});

export default app;
