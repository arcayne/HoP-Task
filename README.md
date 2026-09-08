# Range settlement operations prototype

A local, fixture-driven prototype implementing the focused Range site direction. It is intentionally synthetic: Range calculates the amount to settle, reconciles source records, checks configured policies and controls, and creates a settlement instruction. An authorized operator uses the existing custody process outside Range, then Range checks available records to determine whether settlement happened. No backend, authentication, custody API, external messages, live agent calls, or financial APIs are connected.

## Run locally

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173/>. Use the collapsible presenter controls at the bottom to reset and switch between S1, S2, and S3.

## Walkthroughs

- **S1 — Normal settlement:** open Northstar, review and approve the exact 100,000 USDC proposal, use the existing custody process in the simulated handoff, Check again with no matching record, then use the presenter to simulate a settlement record arriving and Check again. The amount to settle becomes 0.
- **S2 — Missed windows:** switch to S2 and use **Next event** to replay 100,000 → 80,000 → 110,000. Earlier windows create no instructions. Review and create one 110,000 USDC instruction, ending at the custody transfer outside Range.
- **S3 — Settlement not observed:** open the case, Check again with no match, inspect the investigation, optionally escalate locally, simulate a settlement record arriving, then Check again. The original 110,000 instruction becomes Settled and 15,000 remains as a separate amount to settle.

The review dialog creates one stable illustrative instruction reference. **Copy instruction** never creates another instruction. **Check again** only inspects available synthetic observations; it does not send, retry, approve, or claim a fresh upstream fetch. Source data as of and Last checked remain separate.

`fallback.html` is a static, print-friendly Northstar-only capture of the ready case and S3 before/after observation. It contains no functioning controls.

## Files

- `index.html` — focused Northstar-only prototype shell and presenter controls
- `styles.css` — existing operations UI styling plus handoff, observation, and presenter states
- `app.js` — signed-event projection, manual handoff, stable instructions, check-again behavior, guided exercises, evidence, history, and focus handling
- `fallback.html` — static fallback capture for deck use
