// Anchor client calls (SEP-24/31). For the MVP this wraps a mock anchor we control.

import { Hono } from "hono";
import type { AppContext } from "../env.js";

const anchor = new Hono<AppContext>();

// Mock SEP-24 interactive deposit URL (real anchor returns a hosted URL).
anchor.get("/info", (c) =>
  c.json({
    mock: true,
    deposit: { enabled: true },
    withdraw: { enabled: true },
    note: "Mock anchor for MVP — see TODO(INFRA/BE3) to wire a real demo anchor.",
  }),
);

export default anchor;
