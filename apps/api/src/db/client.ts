// Drizzle client over libSQL/Turso (HTTP — Worker-compatible).

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/web";
import type { Env } from "../env.js";
import * as schema from "./schema.js";

export type DB = ReturnType<typeof createDb>;

export function createDb(env: Env) {
  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

export { schema };
