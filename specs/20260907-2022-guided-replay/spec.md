# Guided replay and settlement calculation: implementation specification

Status: proposed, awaiting approval. Existing product files have not been changed during the audit. Working directory: `/Users/dearkane/Documents/dev/range/task`.

## Objective

Make the existing prototype reliable to present and easy to operate. Preserve its current visual identity and two-screen product model. Replace disconnected scenario totals with a small deterministic event calculation, then use it to explain how source activity becomes an obligation, an approved instruction, and a confirmed settlement.

The site remains a local synthetic prototype. A calculation module is not a new production backend, API, connector, or accounting platform.

## Observed current state

The project is five static files with no package manager or Git repository. The existing server responds at `http://localhost:4173`. `app.js` owns fixtures, calculations, navigation, state, and rendered case content. `styles.css` supplies a usable green/neutral design system.

The audit captured and inspected twelve screenshots in `work/ux-audit`. A separate read-only agent checked source behavior. Major findings:

- S3 confirmation of 110,000 against 125,000 produces an internal 15,000 remainder but the queue and case force the visible amount to zero. Confirmation also overwrites trading activity and clamps reverse obligations to zero.
- The All filter omits confirmed rows; the initial queue advertises three relationships while displaying two. Cedar's row incorrectly says Northstar owes Atlas.
- The scenario buttons jump to endpoints. S2 cannot replay the skipped-window sequence; the sole presenter action changes from arbitrary +5,000 activity to confirmation without explaining the next step.
- Queue summaries and guidance contradict active or confirmed instructions. Dates and freshness are disconnected from the selected scenario.
- Approval has two dialogs plus a mock-acknowledgment checkbox. The second dialog's Back action exits the whole review.
- A fixed, dense presenter bar and small text compete with the main story. S3 creates horizontal overflow at the observed laptop viewport. Supporting-row actions lead only to a toast.

## Scope and presentation choice

Recommended default: a guided presenter walkthrough attached to the existing prototype, with an expandable event calculation. The user has been asked whether a separate calculation explainer is preferred; placement is optional, but both forms use the same calculation and examples.

The presenter layer explains events and directs the operator action. It must not become a new navigation hierarchy inside the simulated Range product.

In scope:

1. Repair financial projection, statuses, filters, directions, dates, and navigation against the existing PRD.
2. Introduce a pure event reducer with no external dependencies and readable synthetic fixtures.
3. Add step-by-step presentation guidance and a calculation breakdown.
4. Simplify mock approval to one review dialog with an explicit simulated approval action.
5. Verify calculation invariants and replay the three scenarios through the browser.

Out of scope: production backend, new integrations, real payments, live agent generation, cancellation/amendment/replacement of submitted instructions, automatic financial recovery, new product screens, authentication, deployment, broad redesign, and rebuilding the deck.

## Financial contract

Use signed integer units for the pure calculation, with 1 USDC represented by 1,000,000 units in this prototype. Positive means the relationship's client owes Atlas; negative means Atlas owes that client. A positive confirmed movement is client → Atlas and reduces a positive obligation; a negative movement is Atlas → client. Formatting is the only place that uses the absolute value with the correct relationship-specific direction label.

For a fixed client/account/asset relationship:

`Current net obligation = opening obligation + sum(signed venue activity) - sum(signed confirmed settlements)`

Submission, approval, skipped windows, investigation, and an unknown result have zero effect on the financial total. They affect workflow state. A submitted instruction is not an extra debt and is not subtracted as if it had settled.

Activity, instructions, and settlement observations remain separately identifiable. Do not overwrite source activity with a residual. A confirmation references its instruction and has a stable observation ID; apply each confirmed financial movement once. Multiple observations of the same movement must not double-reduce the obligation. Conflicting evidence is an exception, not a second financial event.

The replay recomputes state from the opening balance and selected event prefix. Previous inspects recorded steps without changing the current run; operator actions are disabled in that historical view. Next moves forward through recorded history until the current step. “Resume current step” returns directly to the latest state. New incoming events and operator actions are possible only at the latest step. Restart explicitly clears the synthetic run. This avoids branching or duplicated operator actions and is not a financial undo or cancellation feature.

Opening review captures the proposal version, signed amount, direction, destination, cutoff, and relevant evidence version. Submission succeeds only if that snapshot remains unchanged and eligible and no live overlapping instruction exists. Failure leaves review open with a specific reason and requires a fresh review. The model enforces this; disabling a button is not the eligibility check.

“Confirmed” is an instruction status. Relationship readiness derives from the signed obligation, current window, evidence, controls, and live instructions. A confirmed 110,000 instruction with 15,000 still owed cannot mark the relationship cleared.

The main demo exercises full correlated confirmation. Partial or conflicting observations must not mark the instruction fully confirmed or release its unresolved remainder. They escalate; automated recovery remains outside scope and needs no additional walkthrough.

### Minimum event representation

Common fields: stable event ID, event type, effective time, observed time, relationship, asset, and illustrative source reference.

- Venue activity: signed amount, class (realized P&L / fee / funding), source ID.
- Window opened/skipped: window ID and cutoff; no financial amount effect.
- Proposal reviewed/approved: proposal version, amount, direction, destination, evidence cutoff.
- Instruction submitted: stable instruction ID and frozen approved fields.
- Outcome unknown: instruction ID and observation; no financial amount effect.
- Settlement confirmed: movement ID, instruction ID, signed settled amount and confirmation time.
- Investigation/escalation: case reference and explanatory status; no financial amount effect.

Normalize venue records into the allowed settlement classes for this exercise only. A transfer cannot be counted once as venue activity and again as confirmed settlement.

### Separate reconciliation evidence

The synthetic venue-reported net settlement position is a separate input at a named cutoff. Show calculated amount, reported amount, and discrepancy. Compare the same cutoff and accounting basis, including the same confirmed settlements. Later observed activity is separate: a newer current obligation must not be compared against an older reported amount as if both described the same time. Approval eligibility states whether the proposed amount has complete, current evidence. A few explicit fixture fields suffice; no new reconciliation subsystem is required. Do not manufacture the reported value from the calculation and describe agreement as independent verification.

Custody records support the confirmation observations and configured availability checks. Label their values and completeness as synthetic. Missing evidence blocks eligibility; the explanation cannot create the missing record.

## Demonstration sequences

Use one consistent fixture clock, with the two-per-day settlement cadence across multiple days where necessary. Values are illustrative; no funding rate or fee percentage is claimed.

### S1: Normal settlement

- Realized loss +98,000; fee +3,000; funding credit -1,000 → net 100,000.
- Window opens. Presenter text: “Review Northstar's 100,000 USDC settlement in the case.”
- Operator reviews and approves 100,000. A single frozen instruction appears; obligation remains 100,000.
- Incoming confirmed movement of 100,000 → obligation 0; no live payment; original activity remains 100,000 and confirmed settlements 100,000.

### S2: Missed windows

- Begin with net +100,000 and window 1; skip without approving.
- Realized earnings -20,000 → 80,000; skip window 2.
- New loss +30,000 → 110,000; window 3.
- Approve once for 110,000. Earlier windows remain review history, not payments.
- Confirm 110,000 → obligation 0.

### S3: Uncertain execution

- Establish the 110,000 obligation and its approved/submitted instruction with explicit setup steps or a clearly labeled scenario starting checkpoint.
- New activity +15,000 → current obligation 125,000; original instruction still 110,000.
- Outcome becomes unknown. Another instruction is blocked. Presenter directs the user to the investigation and optional simulated escalation.
- Existing instruction later confirms for 110,000 → 15,000 remains owed; no payment in progress. Copy and queue must state the residual, not treat the account as cleared.

Acceptance-only reversal: submit 100,000, then earnings -20,000, then confirm 100,000. The final obligation is -20,000, displayed as Atlas owes Northstar 20,000. No cancellation or automatic opposite payment is introduced.

## Presenter experience

Provide scenario selection, Step N of M, a short description of what just changed, and one clear next action. Initial guidance says how to begin. Keep Previous, Next event, and Restart distinct from operator review and approval.

At operator-action steps, do not let Next event silently approve or bypass the product action. Explain the required click and bring the relevant existing section into view. At incoming-event steps, name the next event precisely, such as “Confirm original 110,000 payment,” rather than an ambiguous generic action.

Presenter controls should be collapsible, readable during screen sharing, and reserve space rather than obscuring product actions. Test 1280×800 and 1440×900, with a 1024px-width fallback that avoids whole-page horizontal overflow. Do not spend scope on mobile design.

The expandable “How this amount is calculated” view shows a running event table:

| Event | Effect on obligation | Running obligation | Instruction effect |
|---|---:|---:|---|
| Opening position | 0 | 0 | None |
| Trading loss | +98,000 | 98,000 | None |
| Fee | +3,000 | 101,000 | None |
| Funding credit | -1,000 | 100,000 | None |
| Approval and submission | 0 | 100,000 | 100,000 may execute |
| Confirmed movement | -100,000 | 0 | Original confirmed |

Keep the richer teaching narrative in the presenter layer. The product case needs only a clear balance, active/last payment, and expandable breakdown. The same calculation feeds both.

## Targeted UX repairs

- Single review dialog: show exact amount, direction, destination, cutoff, and evidence version, with “Approve and send · simulation.” No extra acknowledgment workflow. Keep a persistent prototype label.
- Retain stale-proposal validation at submission. Controls on the presenter remain unavailable while a review dialog is open; stale evidence is exercised through a dedicated deterministic fixture/test.
- Use real navigation state and bring Investigation / History to the matching section. Back links and dialog close restore a sensible focus target. Avoid pretending supporting rows have a complete case; give their visible action a small read-only explanation or make the limitation explicit.
- Derive All/Attention/Ready counts from displayed relationships. All includes confirmed/zero relationships. Derive names and direction per row.
- Separate active-payment eligibility checks from recorded checks at approval. A confirmed historical instruction cannot continue blocking a new review. A remaining obligation is visible and reviewable subject to the normal window and controls, without automatically sending it.
- Derive as-of, source freshness, and explanatory status from the scenario clock; do not show the same 43-minute age and conflicting source time everywhere.
- Keep instructional copy concise. Increase the smallest presenter and supporting labels to readable sizes and avoid two-line button labels where adequate width is available.

## Implementation and verification

Suggested changes: new pure `settlement-model.mjs` plus fixtures; adapt `app.js`; update the existing shell and styles; add focused calculation tests. No framework migration or dependency installation is needed. Preserve originals before editing because this directory has no Git history.

Work packages:

1. Financial model and regression cases: signed events, immutable instructions, confirmation identity, S1–S3 and reversal.
2. Existing UI consistency: render from projection, correct filtering, statuses, directions, approval and navigation.
3. Presenter replay and evidence walkthrough: state progression, guidance, running calculation, visual cleanup.

Acceptance:

- Every canonical value is consistent across queue, case, history, review, and calculation.
- Replaying the same confirmed movement cannot change the result twice. Submitted/unknown events never reduce the debt.
- Confirmation keeps new activity outstanding; negative obligations survive.
- No second overlapping submission; no stale proposal can be sent; no cancellation UI.
- Change evidence between review and submission in a focused model test; the old snapshot must fail even if no button state changed.
- Inspect earlier replay steps and resume without duplicating activity, approval, submission, or confirmation events; historical views cannot issue operator actions.
- S2 shows actual chronological steps, not only its endpoint.
- S3 demonstrates new activity while a payment is pending and preserves its 15,000 residual.
- Operator actions and presenter events are distinguishable; the next step is always stated.
- Keyboard focus, dialog closure, scenario reset, navigation, and queue filters work.
- Normal and uncertain cases remain legible without horizontal page overflow at laptop sizes.

Verify pure calculations with meaningful tests, then use the in-app browser to replay the actual interactions and inspect screenshots. Check console errors. Static fallback content and README must be checked against the resulting implementation before it is called presentation-ready; update them only as necessary for consistency.

## Approval and remaining choices

No source edits have been made. The presentation placement is the only optional design choice; the recommended default is the integrated presenter layer. The substantive scope is ready for approval under the agentic-delivery-playbook.
