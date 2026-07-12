import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "turso",
  dbCredentials: {
    // Loaded from the root .env via dotenv above. NO file: fallback — a silent
    // fallback pushes tables to a local file while the Worker talks to Turso,
    // producing "no such table" with a green push. Fail loudly instead.
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
