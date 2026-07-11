import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "turso",
  dbCredentials: {
    // Node-only script (drizzle-kit runs under Node, not the Worker), so a
    // bare file: URL is fine here even though the Worker's @libsql/client/web
    // requires http(s)/ws(s)/libsql: — see README "Local DB gotcha".
    url: process.env.TURSO_URL ?? "file:./local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
