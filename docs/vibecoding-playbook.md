# Vibecoding Playbook — StellarSend

How to run agent sessions on this repo so that context stays complete, prompts stay sharp,
and a **fresh session with an empty context window still knows what it's doing**.

---

## The three-file system

| File | Role | Lifecycle |
|---|---|---|
| `CLAUDE.md` (root) | **Durable brief.** Architecture, landmines, scope lock, working agreement. | Rarely changes |
| `docs/STATE.md` | **Working memory.** What's done, what's next, what we learned. | Rewritten every session |
| `.agents/skills/*/SKILL.md` | **Domain truth.** Stellar SDK/SEP specifics. Beats stale training data. | Read on demand |

`CLAUDE.md` is auto-loaded by Claude Code. `STATE.md` you point at explicitly.
Skills get pulled in only when the task touches them — that's the point: they stay out of
the context window until needed.

**Why this beats one giant doc:** a 3000-line context file gets skimmed, and the middle of it
gets ignored under pressure. Short + layered survives.

---

## Session start prompt (copy-paste)

```
Read CLAUDE.md and docs/STATE.md.

Then tell me, before writing any code:
1. What you understand the current blocker to be
2. What you plan to do about it, in order
3. Anything in STATE.md that looks stale or contradicts what you see in the repo

Do not start coding until I confirm.
```

That last clause matters. It turns the first turn into a **cheap alignment check** instead of
an expensive wrong-direction sprint.

---

## Session end prompt (copy-paste) — do not skip

```
We're wrapping up. Update docs/STATE.md:

- Move anything now VERIFIED (you actually ran it) into Done. Not "wrote the code" — ran it.
- Rewrite "Right now": current thread, blocker, next 3 actions
- Append any new finding to the Decisions table — especially anything that cost us time
- Add a session log entry; delete the oldest if there are more than 3
- If CLAUDE.md's "Current state" or landmines are now wrong, fix them too

Keep it under one screen. Be honest about what's still broken.
```

**This is the whole answer to your point 3.** Context windows are lossy; a file on disk is not.
STATE.md is how session N+1 inherits session N's brain.

---

## Anatomy of a good task prompt

Weak:
> "wire up the submit endpoint"

Strong:
```
Task: wire POST /transfers/:id/submit to produce a real testnet tx hash.

Context: pathPayment.ts already has submitPathPayment(). The route at
apps/api/src/routes/transfer.ts:99 is a TODO(BE1) stub returning a fake ok.

Before coding: read .agents/skills/dapp/SKILL.md — I don't want invented SDK signatures.

Do:
- resolve destination pubkey from the beneficiary/receiver
- call submitPathPayment(), persist stellarTxHash on the transfer row
- recordEvent(SUBMITTED), enqueue QUEUE_SETTLEMENT
- return the hash

Constraints:
- amounts stay strings (7dp), no float math
- re-quote if the quote is expired rather than submitting a stale rate
- if the Worker can't sign, STOP and tell me — do not mock the hash

Done when: I can hit the endpoint and open the hash on Stellar Expert.
```

The pattern: **Task → Context (where the code lives) → Read this first → Do → Constraints →
Done-when.** The "Done when" is the part people skip, and it's the part that prevents
"I've implemented it!" on code that was never run.

---

## Rules that keep vibecoding from going sideways

**1. Force skill reads on Stellar work.** Say *"read `.agents/skills/dapp/SKILL.md` first."*
Models confabulate SDK signatures with total confidence. The skill pack exists precisely
because training data on Stellar specifics is unreliable.

**2. Ban fake success.** Put it in the prompt: *"If it doesn't work, say so. Never fabricate a
tx hash, a quote, or a passing test."* A hallucinated hash in a demo to judges is a
catastrophic failure mode, and it is a *likely* one if you reward the appearance of progress.

**3. Demand the verified/assumed split.** End tasks with *"state what you actually ran vs what
you're assuming."* This single question surfaces most silent breakage.

**4. One thread per session.** Don't wire the submit route and redesign the UI in the same
session. Context pollution is what makes long sessions degrade.

**5. Ask for the plan before the diff** on anything non-trivial. Cheap to redirect a plan;
expensive to redirect 400 lines.

**6. Re-anchor when the session gets long.** If it's drifting: *"Re-read CLAUDE.md. Are we still
on the demo backbone, or have we drifted into nice-to-haves?"*

---

## Sequencing — what to actually build, in order

The scope lock in `CLAUDE.md` is the priority list. Right now the honest state is: **the demo
backbone does not exist yet.** `submit` is a stub, so there is no tx hash, so there is no pitch.

1. **Spike ed25519 on Workers.** Nothing downstream is trustworthy until this is green.
2. **Real quote** from `strictReceivePaths`.
3. **Wire submit → real tx hash.** ← the demo now exists
4. Status stepper reaching COMPLETED.
5. Receiver claim + mock payout.
6. Then, and only then, consider one nice-to-have.

Resist reordering. Every hour spent on Freighter or multi-currency before step 3 is an hour
spent on a project that cannot yet demo.

---

## Worked example — the ed25519 spike

```
Read CLAUDE.md, then .agents/skills/dapp/SKILL.md.

Goal: settle risk #1. Prove a Cloudflare Worker with nodejs_compat can sign AND submit
a Stellar testnet transaction.

Smallest possible test: a temporary route that friendbot-funds a keypair, builds a trivial
payment, signs it, submits it, returns the hash. Nothing else.

Then:
- If it works: tell me the hash, and record the finding in docs/STATE.md.
- If Keypair.fromSecret() fails in the isolate: try @noble/ed25519 + WebCrypto.
- If that also fails: STOP. Do not work around it. Tell me — this means Workers is the
  wrong runtime and we need to decide, not patch.

I want the truth here, not a green checkmark.
```

That last line is not decoration. This spike is the one place where a comforting answer is
actively dangerous — if signing doesn't work on Workers, you need to find out on day 1 with
time to migrate, not on day 12 with a demo to give.
