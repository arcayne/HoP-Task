# Prototype consistency alignment

## Objective

Align the live prototype, static fallback, README, deck, and current MVP PRD around the simplified pilot boundary: Range calculates the amount to settle, applies controls, gives the operator the external handoff details, and records settlement only from observed evidence.

## Scope

- Remove the Range-created instruction model from the prototype state, visible copy, scenarios, checks, and handoff.
- Keep the deterministic amount calculation and observed-settlement idempotency.
- Make readiness the relationship state: Up to date, Ready to settle, or Needs attention.
- Keep the external custody action outside Range. A reviewed handoff records the amount and destination but does not claim a transfer is in progress.
- Let Check again evaluate evidence without depending on a Range instruction.
- Keep S1, S2, S3, and the 110,000 to 15,000 observed-settlement example.
- Keep agent investigation out of the sprint-one prototype. Describe manual investigation only.
- Use Northstar Institutional across the site, fallback, deck, and PRD bundle.
- Update deck slide 4 status wording and slide 7's carried-activity label.
- Mark the former scope PRD as superseded by the current MVP PRD.

## Non goals

- No custody integration, payment execution, transfer tracking, duplicate prevention, automated recovery, or agent implementation.
- No visual redesign or framework change.

## Acceptance criteria

1. No rendered site, fallback, or README copy says that Range creates, issues, tracks, or blocks a custody transfer.
2. S1: 100,000 USDC is ready, the handoff is reviewed, then a matching observed settlement reduces the amount to zero once.
3. S2: missed windows replay 100,000 to 80,000 to 110,000 and end with the current amount ready for an external handoff.
4. S3: 125,000 USDC remains open when evidence is absent; an observed 110,000 USDC settlement leaves 15,000 USDC.
5. A repeated Check again cannot apply the same observed settlement twice.
6. The visible prototype, fallback, deck, README, and current PRD use amount-to-settle terminology and Northstar Institutional.

## Verification

- Run targeted model tests for S1 through S3 and repeated checks.
- Inspect rendered site states for S1 and S3 in the browser.
- Render and inspect the amended slide deck.
- Search the public prototype/fallback/README for legacy instruction wording.
