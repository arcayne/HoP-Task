# HoP / Range shadow settlement prototype

A local, fixture-driven interview prototype for comparing Range's calculation and evidence with Atlas's existing process. It uses synthetic records for Northstar Institutional and USDC.

**Shadow prototype · illustrative data.** Compare Range's results with the existing process. Range does not authorize or stop live transfers. This site does not build the production backend, connect custody providers, or implement agent execution.

## Run locally

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173/>. Use the collapsible presenter controls to reset and switch between the three main exercises. **More cases** contains the position-mismatch example.

## Walkthroughs

- **S1 — Normal settlement:** start with 100,000 USDC Ready to settle. Review the result, agree or disagree with an optional comment, Check again before any expected settlement, simulate a qualifying source record, then Check again. The observed settlement reduces the amount to zero once.
- **S2 — Missed windows:** use **Next event** to replay 100,000 → 80,000 → 110,000. Missed review windows create no debts or payment state. Review the current result only.
- **S3 — Settlement not observed:** start with 125,000 owed, a contextual operator report of 110,000 paid, and no qualifying source evidence. Add a case note, Check again, inspect the manual investigation, simulate a source record arriving, then Check again. The observed 110,000 leaves 15,000.
- **M1 — Position mismatch:** inspect 110,000 USDC validated at 12:00 UTC with a 20,000 custody discrepancy detected at 13:00 UTC. Simulate a corrected custody snapshot and Check again; the 110,000 amount remains, with no fabricated settlement or replacement amount.

## Interaction model

- **Review result** records agreement or disagreement with Range's current result. It never authorizes a transfer or changes money.
- **Add case note** stores short session-local context and an optional transaction reference/link as text. Notes do not match or settle records.
- **Check again** evaluates the deterministic fixture projection. It distinguishes no new evidence, a changed result, an unavailable check, and a qualifying observed settlement. Repeated checks are idempotent for financial events.
- Presenter controls simulate source records or corrected snapshots; they never silently perform the operator's Check again action.

`fallback.html` is a static, print-friendly Northstar-only capture with no functioning controls.

## Files

- `index.html` — shadow prototype shell and presenter controls
- `styles.css` — existing operations UI styling and focused review/note states
- `app.js` — signed-event projection, shadow reviews, notes, refresh semantics, guided exercises, and evidence/history
- `fallback.html` — static fallback capture for deck use
- `specs/` and `work/` — included implementation and audit artifacts

## Reading the proposal

- `spec.html` is the readable in-site version of the pilot proposal.
- `spec.md` is the Markdown source used for that page.
- `engineering-appendix.html` and `engineering-appendix.md` contain the implementation reference detail.
- The prototype links to the pilot spec from its top bar, and the spec links back to the walkthrough.
