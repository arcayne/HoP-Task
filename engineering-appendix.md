# Range off-chain settlement: engineering appendix

**Status:** optional reference, 8 September 2026  
**Audience:** Range product, operations, compliance, and engineering  
**Decision this document supports:** whether the two week cut is the right first pilot

Start with the [short pilot proposal](spec.md). This appendix preserves the detailed accounting, controls, examples and acceptance rules for engineering follow-up; it is not required interview preparation.

## 1. The product decision

Range should give Atlas operations one reliable answer for each institutional client, account relationship, and asset: **what is the current amount to settle, whether it is safe to act on, and what evidence supports that answer.**

For the first pilot, Range does not execute custody transfers or try to infer an in-progress payment. An authorized operator uses Atlas's existing custody process outside Range. Range marks the amount as settled only when it later observes sufficient matching evidence.

The first cycle is an MVP pilot. **Pilot assumption — shadow mode:** During these two weeks, Range compares its calculation and control result with the existing process. The output is informational: Range does not authorize or stop live transfers, and the existing custody process remains authoritative. The short pilot proposal owns product scope. This appendix supplies implementation detail within that scope; it does not add a live approval, manual adjustment or metrics workstream.

This proves the control and decision layer first: calculation, reconciliation, controls, an operator case, and an auditable result.

Atlas Exchange is the Range customer. Northstar Institutional is the illustrative pilot institution. The first scope is one account relationship and USDC.

Atlas's operator coordinates the settlement decision. Whoever controls the paying custody account must authorize the transfer through the existing process; access to Range does not give Atlas authority over Northstar's wallet. Confirm the institution-side handoff and approver with the pilot participants.

## 2. What is already available

The task gives Range read access to venue activity, custody-account activity, balances, transactions, positions, account ownership, the last successfully settled position, and configured policies and controls. No new read connectors, vendor-specific custody integrations, or KYC are required.

The pilot adds reconciliation, calculation, controls, exception cases and review history, with observed settlements arriving through existing connectors. External custody execution continues independently.

## 3. Core model

### Amount to settle: the backend calculation contract

For this pilot, calculate Northstar Institutional's USDC relationship. The same contract can later apply to each institution, venue/custody account relationship, and asset. The amount is a net settlement obligation, not the gross custody balance or the value of the mirrored margin account. The last successfully settled position supplied by the existing system anchors the calculation; its balance must not simply be added as an amount owed.

For the pilot, agree a baseline time `t0` and an opening unsettled amount `A0`. After a fully reconciled settlement, `A0 = 0`; onboarding with an existing remainder requires an explicitly agreed opening amount. At an hourly cutoff `T`:

```
A(T) = A0 + sum(Ve for t0 < effective_time(e) <= T)
          - sum(Sm for t0 < effective_time(m) <= T)

Ve = signed settlement-relevant venue activity
Sm = signed, matched, successfully observed settlement movement
```

The sign determines direction. A positive amount means the institution owes Atlas; a negative amount means Atlas owes the institution. The interface always spells out the direction instead of relying on a signed number.

| Input | Sign in the pilot calculation | Inclusion rule |
|---|---|---|
| Realized P&L | Northstar loss is positive; Northstar profit is negative. | Include posted, settlement-eligible realized P&L. |
| Fees | Fee charged to Northstar is positive; rebate is negative. | Include the agreed posted fee categories. |
| Funding | Funding paid by Northstar is positive; received is negative. | Include posted funding once. |
| Settlement movement | Northstar → Atlas is positive; Atlas → Northstar is negative. | Subtract only movements matched to this relationship and supported by sufficient settlement evidence. |
| Unrealized P&L, margin allocations, collateral deposits and withdrawals | No automatic contribution to the amount. | They can affect reconciliation, funds and risk checks; their settlement treatment must be agreed before inclusion. |

These accounting rules are proposed pilot assumptions, not facts supplied by the task. BE and the PM must validate them with Atlas operations before implementation. Do not count both a venue aggregate and the component P&L, fees or funding already included in it.

**Hourly worked example, USDC:**

| Cutoff | Newly included venue activity | Newly observed settlement | Current amount |
|---|---:|---:|---:|
| 09:00 | +100,000 | 0 | +100,000 |
| 10:00 | −20,000 | 0 | +80,000 |
| 11:00 | +30,000 | 0 | +110,000 |
| 12:00 | +15,000 | 0 | +125,000 |
| 13:00 | 0 | +110,000 | +15,000 |

The hourly increment can be written `A(T) = A(previous) + new venue activity − new observed settlements`, but the result must also be reproducible from the baseline and unique source events. Re-reading the same hour or settlement must not change it. Use fixed-precision asset amounts, not floating-point arithmetic.

**Evidence and version rules for BE:**

- Every input has a source, stable identity, relationship, asset, effective timestamp, observation timestamp, and signed value. Deduplicate repeated reads and the two sides of the same transfer; one economic settlement is applied once.
- Compute against a common cutoff covered by all required sources. A recently fetched response does not prove that its activity is complete. Persist source coverage and freshness alongside the result.
- Keep the pilot baseline stable and replay events after it. A partial settlement reduces the remainder; it does not reset the baseline to zero. If a baseline is later advanced, carry forward the exact remainder and exclude events already included.
- Late or corrected records create a new calculation version with the reason for the change. Do not silently alter the evidence attached to an earlier operator decision. Ambiguous corrections require review.
- Record calculation version, cutoff, opening amount, component totals, included event references, observed settlements, and result together. Concurrent hourly and Check again runs must not publish conflicting versions or apply an observation twice.

Settlement windows do not create separate debts. They are moments to review the latest amount. If Northstar owes 100,000 USDC at one window, earns 20,000 before the next, and then owes another 30,000, the current amount to settle is 110,000 USDC. There is one current amount, not three payments waiting to be made.

An external transfer does not change this amount merely because an operator says it was initiated. It counts against the amount only after matching settlement evidence is observed. New activity can increase or reduce the amount independently; zero caused by offsetting activity does not mean a transfer occurred.

### Observed settlement

Range marks settlement as observed when available source records provide sufficient evidence that the transfer occurred for the relevant relationship, asset, direction, and amount. The exact matching rule, such as a transaction reference plus amount and direction, is a pilot dependency to agree with Atlas.

**Check again** asks Range to re-evaluate the available connected records. It does not approve, send, retry, or manually confirm a payment. With no new eligible activity, corrections or matching settlement evidence, the amount stays unchanged. If new venue activity arrives, the calculation can change even when no settlement is observed.

A match needs the agreed account mapping, asset/network, direction, amount, source reference and source-specific success/finality evidence. An amount-only match or a balance change alone is insufficient. A movement need not equal the latest total: an observed 110,000 USDC settlement can reduce a current 125,000 USDC amount. Conflicting, partial or multiple candidate records remain reviewable until the matching rule is satisfied.

### Operator state

Each relationship has one clear operational state:

| State | Meaning | Operator action |
|---|---|---|
| Up to date | A valid current calculation is zero and no blocking reason remains. | Review history if needed. |
| Ready to settle | A nonzero amount has complete, fresh evidence and passes configured controls. | Compare the recommendation with the existing process and record a comparison review. |
| Needs attention | Evidence is stale, incomplete, inconsistent, or a control requires review or blocks a recommendation. | Inspect and comment on the result; investigate through the existing process. |

Observed settlement is a recorded result in the calculation and history, not an operational state or a claim that Range watched a payment in progress. The queue can show a new nonzero amount after an earlier settlement has been observed.

Evaluate blocking data and controls before the zero-amount state. A stale zero is still Needs attention. Up to date means a valid current calculation is zero; history explains whether settlement, offsetting activity, or both produced it.

## 4. MVP workflow

1. **Reconcile hourly.** Range calculates the current amount from agreed venue activity and observed settlements. It records the calculation version, source as-of time, and any discrepancy with the agreed venue position.
2. **Open settlement windows twice daily.** A window makes eligible cases visible for review; it does not create a payment or reset the amount.
3. **Apply deterministic controls.** Range evaluates data freshness and completeness, account and asset mapping, reconciliation agreement, available settlement funds where configured, and applicable policy or compliance controls.
4. **Give the operator a decision.** The queue shows the amount, direction, readiness, as-of time, and next permitted action. The case explains calculation, controls, source records, and any exception.
5. **Compare with the existing process.** A reviewer records agreement or disagreement with Range's amount and control result. The authorized payer continues using the existing custody process independently; a Range review does not initiate, approve or hold that transfer.
6. **Check for evidence.** Hourly runs and operator-triggered Check again use the same matching and calculation rules. Range applies a matching observed movement once and recalculates the remainder. A successful check with no new records leaves the amount unchanged; an unavailable or stale source changes readiness and explains the limitation.

### Reconciliation timing and controls

**Proposed cadence:** hourly reconciliation, plus a fresh evaluation at each of two daily settlement windows and on Check again. Hourly runs keep operations informed between windows; two daily windows limit manual custody work in the first pilot. These are starting choices to validate against activity, source latency, custody cutoffs and risk policy, not a claim that hourly data is always safe. More frequent or event-driven reconciliation comes later if the pilot needs it. Prevent overlapping runs for the same relationship.

Reconciliation must compare like-for-like positions at the same cutoff. Mirrored venue assets and custody balances are not necessarily equal. Agree the bridge from the last successfully settled position to each source's expected current position, including eligible venue activity, settlement movements and separately classified collateral movements. Compare each expected position with its reported source position; show the unexplained difference. Never use a discrepancy as an automatic balancing adjustment to the amount to settle.

| Check | Ready only when | What blocks Range from recommending settlement |
|---|---|---|
| Source quality | Required sources cover the cutoff and meet configured freshness limits. | Stale, missing, incomplete or unavailable required data. |
| Account and asset mapping | Institution, account, asset/network and destination match configured records. | Unknown, conflicting or unauthorized mapping/destination. |
| Reconciliation | Position differences are explained or within an explicitly configured tolerance. | Unexplained difference beyond tolerance; no agreed reconciliation bridge. |
| Settlement funds and risk | The payer has the required available funds, and configured margin/risk checks pass. | Insufficient available funds or a breached configured risk limit. A total balance alone is insufficient. |
| Policy and compliance | Applicable policy/license controls pass and required reviews are complete. | A hard policy block or an outstanding required human review. |
| Unresolved settlement evidence | There is no unresolved report or evidence of a transfer that might already cover the amount. | A reported attempt with unknown outcome, conflicting records, or an unexplained excess movement. |

Each check returns pass, review or block with a reason, evidence and owner. Freshness thresholds, tolerances and review limits are configuration decisions to agree with the team. A control requiring review identifies a question for the existing operations/compliance process; it is not permission to bypass a hard block. Range withholds a proceed recommendation when blocked. Review agreement/disagreement and case notes remain available on that result, while transfers initiated in external custody tools remain outside Range's control.

An absent settlement record is normal before anyone expects settlement. Raise an exception when an operator reports an attempt, evidence conflicts, or an agreed review deadline passes without expected evidence. Check again by itself must not imply that a transfer was attempted or failed.

### Worked reconciliation example: the amount is explainable, but a position is not

**Illustrative accounting arrangement to validate with Atlas.** Start with 1,000,000 USDC in Northstar's designated custody account, mirrored as 1,000,000 USDC of venue account equity. For this example, realized losses reduce venue equity before funds move in custody. There are no other assets, unrealized P&L, collateral movements or fees outside the stated activity. Compare venue equity with its expected equity and custody balance with its expected balance; do not compare a gross margin allocation with equity.

At 12:00, posted realized losses of 110,000 USDC explain venue equity of 890,000 USDC. Custody still holds 1,000,000 USDC, and no settlement is observed. Reconciliation passes: the 110,000 USDC difference is the explained amount Northstar owes Atlas.

At 13:00, no new eligible activity or settlement has arrived. Both sources report coverage through 13:00, but the custody balance now reads 980,000 USDC without a supporting movement:

| Position at 13:00 | Expected from baseline and records | Reported position | Unexplained difference: reported − expected |
|---|---:|---:|---:|
| Venue account equity | 1,000,000 − 110,000 = 890,000 | 890,000 | 0 |
| Northstar custody balance | 1,000,000 − 0 observed movements = 1,000,000 | 980,000 | −20,000 |

The raw custody-to-venue difference is now 90,000 USDC, but Range must not replace the calculated 110,000 USDC amount with 90,000 or infer that 20,000 settled. The custody activity and balance disagree. Source coverage is a prerequisite for reconciliation, not proof that the records are internally consistent. Assume the 20,000 discrepancy exceeds the configured tolerance.

**What the operator sees:** “Needs attention. Last validated amount: Northstar owes Atlas 110,000 USDC, as of 12:00. The 13:00 custody balance is 20,000 USDC below the balance explained by available records. Review custody activity and the balance snapshot.” The case links the baseline, venue loss entries, custody activity and both balance snapshots. Range blocks a new proceed recommendation and assigns the exception to operations; the last validated amount remains visible with its age.

**Resolution in this example:** operations identifies a custody reporting error and obtains a corrected source snapshot showing 1,000,000 USDC. Range reruns reconciliation, records the corrected evidence in a new version and returns to Ready to settle if all other controls pass. The amount remains 110,000 USDC. No settlement event or balancing adjustment is invented. If the discrepancy remains unexplained, the case stays open.

## 5. What we ship in two weeks

### In scope

- One pilot settlement arrangement: Northstar Institutional, one account relationship, USDC.
- Deterministic calculation from agreed realized P&L, fees, funding, and observed settlements.
- Hourly reconciliation and two daily review windows.
- Freshness, completeness, reconciliation, mapping, balance, and configured-policy checks with a pass, review, or block reason.
- A queue and case showing the amount, direction, as-of time, evidence, controls, and next action.
- Comparison review, human-triggered Check again, and an exception case with a named owner, notes/references and auditable history. Investigation and escalation use existing tools.
- Agent foundation: define the first read-only skill, permission-scoped source access, fixtures and evaluation cases. The skill is not triggered automatically in this MVP.
- Versioned fixtures and QA coverage for the agreed scenarios before MVP use.

### Handled manually

- Investigating a missing, partial, or conflicting custody observation.
- Obtaining transaction IDs, custody links, and supporting records from existing tools.
- Resolving an accounting or policy dispute with the appropriate operations or compliance owner.

### Deferred

- Creating, sending, cancelling, replacing, or tracking custody transfers from Range.
- Inferring that a payment is in progress from an operator action.
- Preventing duplicate transfers made in an external custody tool.
- Automated recovery from a failed, timed-out, partial, or ambiguous external transfer.
- New connectors, custody integrations, KYC, cross-asset netting, and wider client or asset coverage.

The duplicate-transfer risk is explicit: the pilot can calculate one current amount and make observed settlements visible, but it cannot prevent a user from initiating the same transfer twice in an external tool. This is a reason to keep the pilot cohort small and use the existing operational controls until a later execution design is validated.

## 6. Exceptions and evidence rules

The system never turns missing evidence into a financial conclusion. A case needs attention when data is stale or incomplete, positions disagree, a policy blocks settlement, or a custody record cannot be matched safely.

The case shows source references and their observation times, the last reconciled amount, the reason it is not ready, and the named next step. An operator may escalate, but cannot override a hard block or mark settlement as observed without the required evidence.

During this MVP, operations investigates exceptions manually while the team builds the first agent skill, permission-scoped reads, fixtures and evaluation cases. The skill is not triggered automatically. The next increment starts with a read-only evidence brief that an operator can review.

The first useful next step for a later agent is narrow: collect candidate transaction IDs or custody links from available records, explain why each could match, and identify what remains unknown. The operator confirms the evidence; deterministic reconciliation then updates Range. The agent does not change an amount, clear a case, approve settlement, or bypass a policy.

### Exception workflow and operator resolution

**First-cycle boundary: manual investigation plus agent foundation.** Range detects and explains exceptions, stores a named owner plus short notes and source references, and reruns deterministic checks. Operations investigates in existing venue/custody tools and escalates through its existing process. Missing or corrected financial records must arrive through the existing read connectors. A human can request Check again; the MVP agent does not exist and cannot trigger it. Notes and links are contextual evidence, not commands to change an amount or mark settlement observed. There is no receipt-upload ingestion, manual financial adjustment or direct database-edit workflow in scope. If connectors cannot supply the required evidence, the case stays unresolved and that limitation is recorded for discovery.

Range persists calculation versions, check results, source references and case history. Only a new valid source-backed calculation/check result changes financial values or clears the corresponding block. Comparison review records agreement or disagreement with Range's result; it does not authorize a live payment. Range's blocks apply to its recommendations, while the existing process continues to govern live transfers.

Keep one active case for the relationship and asset, with separately recorded reasons. A new hourly result updates its evidence and amount instead of creating another case for the same unresolved issue.

Conceptual lifecycle: `Open → Investigating externally → Waiting for connected evidence → Resolved by checks`. In the first cycle, notes describe investigation progress; Range clears an exception reason only when the relevant deterministic checks pass. There is no manual financial-resolution or approval-state editor.

Record an operations owner, reason, age, last update and next action. The operator can inspect linked records, add a reference or note and request a refresh; investigation and escalation use the existing operations/compliance process. Closing a note or accepting an explanation does not mark settlement as observed. Resolution requires the relevant deterministic checks to pass; a persisting or recurring problem keeps or reopens the case. Richer assignment, evidence-association and resolution-approval workflows require discovery after this MVP.

| Difficult case | First-cycle behavior | How work resumes |
|---|---|---|
| Venue and custody data disagree | Preserve the last validated result, label the newer calculation unverified, show the difference and affected source references. Operations investigates. | Correct or explain the source difference, then rerun the checks. |
| Stale or incomplete data | Show the last validated amount with its timestamp and Needs attention. An empty response is not a zero balance. | Obtain complete current records and rerun. |
| Settlement not observed after an expected external action | Do not deduct the reported payment. New eligible activity may still change the calculated amount. Show what was checked and ask the operator for a custody reference; keep Range's recommendation blocked while the outcome is unclear. | Matching connected evidence is applied once, or authoritative connected evidence resolves that no settlement occurred and controls are rerun. A note alone cannot resolve the financial outcome. |
| Partial observed settlement | Apply the proven movement once, show the remainder and the supporting records. Keep the case open for the remainder; do not describe partial observation as proof that a particular transfer failed. | Review the remainder through the existing process. |
| More settled than currently owed | Preserve the signed result, explain the excess and flag Needs attention. Do not automatically recommend a reverse transfer. | Operations resolves the cause and reviews the resulting amount and direction. |
| Failed external settlement instruction | Record the operator report and available failure evidence. A failed attempt is not a settlement and does not reduce the amount. | Operations verifies the outcome in the custody system before deciding on a further attempt. |
| Timeout or ambiguous result | Treat it as unknown, not failed. Keep the case open and prevent a new Range recommendation pending investigation. | Obtain authoritative evidence and rerun reconciliation. No automatic retry. |

The last two cases answer the task's settlement-instruction question while preserving the first-cycle boundary: Range has no instruction transport or execution state machine in this pilot. It can record reported or observed evidence and guide the operator. Reliable authorized instruction delivery remains a later product increment with acknowledgment, idempotency, status reconciliation and recovery designed together.

### What should the agent investigate? Next agent increment

**Triggering sequence:** In this MVP, an operator manually invokes the skill on a selected exception. The team inspects its citations, candidate matches and explanation of gaps, then records what worked. It is not triggered by a schedule or exception automatically. The next increment makes this a supported case action; an automatic trigger comes only after the manual evaluation shows that the evidence brief is reliable.

The first candidate is **settlement not observed after an expected external action**. It has a concrete input, bounded read access, and a useful output an operator can verify. Start with this rather than a general-purpose financial agent.

1. An exception opens with the calculation version, reason, relevant accounts, asset and time range.
2. The agent reads only authorized existing records, control results and case history. It gathers candidate custody transactions or venue entries and compares identifiers, amount, direction and time.
3. It returns a short evidence brief: facts with source links, candidate matches, contradictions, missing information, and a recommended next step. If evidence is insufficient, it says what is unknown and escalates.
4. Operations reviews the proposed match or explanation; compliance handles policy questions. The decision and evidence are recorded against the case version.
5. The deterministic matcher and control evaluator revalidate the evidence. They apply a valid movement once and publish the new amount/readiness, or leave the case unresolved.

| Responsibility | Automatic | Human boundary |
|---|---|---|
| Deterministic system, sprint one | Calculate, reconcile, run configured controls, match qualifying settlement evidence, update readiness, open/update cases and audit history. | Humans agree accounting rules and control configuration; unresolved evidence stays blocked or in review. |
| Agent, next increment | Gather read-only evidence, explain differences, draft case summaries and recommend actions. | Operator validates proposed evidence associations; compliance decides policy-review cases. |
| Operator | Review a specific amount/evidence version and record agreement or disagreement in the MVP review. | External transfer decisions and authorization remain in the existing process. |
| Deferred execution workflow | None in sprint one. | No agent-created transfer, retry, cancellation, policy override, or ledger adjustment. Design and authorize separately. |

Do not treat an agent's confidence score as settlement evidence. Before introducing it, evaluate known matches, no-match cases, conflicting sources and misleading record text; require source-backed claims, permission-scoped reads and safe escalation. Measure whether it reduces evidence-gathering time without increasing unsupported matches. If it does not, retain manual investigation.

### Worked agent example: find the evidence for a reported 110,000 USDC payment

**Next increment; not part of the first two-week build.** This is a separate case from the reconciliation example above. Record references below are illustrative; the product would link to the authorized source records.

Range shows 125,000 USDC owed: 110,000 from earlier activity plus 15,000 of new activity. An operator reports that Northstar paid 110,000 through its custody provider. This report opens an investigation but does not reduce the amount. For this example, the agreed automatic matching rule requires a successful custody debit and corresponding Atlas receipt with a shared transfer reference, matching asset/network, accounts, direction and amount.

The agent reads the case and available source records and returns two candidates. The identifiers below are illustrative custody record references, such as transaction IDs. They are not Jira tickets or investigation cases; in a real workflow they would link to authorized source records.

| Candidate | Evidence found | Assessment |
|---|---|---|
| `CUST-741` | 110,000 USDC debit from the mapped Northstar account to the configured Atlas destination, posted at 13:24; transfer reference `XFER-741`. The corresponding Atlas receipt is not yet available in connected records. | Relevant candidate. Amount, direction and destination fit, but the required receipt evidence is missing. Do not treat it as reconciled settlement yet. |
| `CUST-742` | Another 110,000 USDC debit at 13:26, from the same account to a different, mapped Northstar-owned custody account; reference `XFER-742`. | Not settlement to Atlas. The same amount and nearby time are insufficient. Retain it as relevant custody activity for the separate position reconciliation. |

**Example agent response shown in the case:**

> The current amount remains 125,000 USDC. CUST-741 is a candidate for the reported 110,000 payment because the amount, direction and Atlas destination match. I cannot confirm the required Atlas receipt from the available records. CUST-742 is a transfer to Northstar's own account and should not be matched to the amount owed to Atlas. Operations should check XFER-741 with the receiving team or custody provider and obtain the corresponding receipt. Keep the case open and avoid recommending another transfer while this outcome is unresolved.

The operator reviews the cited records and requests the missing receipt through the existing process. The agent has gathered evidence and proposed the next step; it has not approved a payment, changed a balance, sent a message or cleared the exception.

**When evidence arrives:** a later connected record, `ATLAS-991`, shows a successful 110,000 USDC receipt with reference `XFER-741` and matching accounts, asset/network and direction. Operations confirms the proposed association; deterministic matching revalidates it and applies that economic settlement once. Assuming no other settlement-relevant activity has arrived, the current amount becomes `125,000 − 110,000 = 15,000 USDC`. A further refresh of these same records leaves it at 15,000.

The remaining amount becomes Ready to settle only after current reconciliation, funds and policy checks pass, including the effects of the separate custody transfer. History preserves the operator report, both candidates, the agent's explanation, human decision, supporting receipt and resulting calculation version. If the receipt never arrives or contradicts the debit, the agent escalates the unresolved evidence; it does not manufacture a match.

### Decisions and approval history

For the first cycle, record whether a comparison reviewer agrees or disagrees with a specific calculation and control result, with an optional explanatory note. A changed version has not yet been reviewed; keep the prior review attached to its original inputs. Range still calculates readiness and blocked recommendations, but no review authorizes or asserts a custody transfer. Required external approvals happen in the existing process; a future Range approval flow must define approver roles and separation of duties.

For every calculation, check, human decision and eventual agent recommendation, store: time, actor or service identity, case and calculation version, source references and coverage, amount/direction, rule/policy version, result and reason, and next action/owner. Preserve prior decisions and their inputs. A useful explanation reads: “Northstar owes 110,000 USDC: 100,000 carried forward − 20,000 earned + 30,000 new activity; no settlement observed; controls pass at this cutoff.” If it is blocked, name the failed check and what evidence will resolve it.

## 7. Thin frontend contract

Use the high-fidelity prototype for layout and interaction discussion. This PRD governs behavior; the prototype's illustrative state transitions are not the production specification.

| Surface | Minimum information and actions |
|---|---|
| Queue | Northstar relationship, amount, explicit payer/payee direction, readiness, source as-of time, exception reason and next action; open the case. |
| Case | The same amount/version, calculation components, observed settlements, control results, evidence links and history. Distinguish the latest validated amount from a newer unverified result. |
| Comparison review | Current amount, payer/payee, cutoff, evidence version and controls. Record agreement/disagreement and an optional comment for Ready, Up to date or Needs attention results. If the version changes while the review is open, show the change and require selection of the current version before saving. Prior reviews remain immutable. |
| Exception | Reason, missing/conflicting evidence, owner, age and next step. Add a reference/note or select Check again. Investigation and escalation use the existing process. |
| Check again | Show checking, completed with changes, completed with no new evidence, or unavailable. Preserve the last validated information on failure. Never show success merely because the refresh request completed. |

BE returns one versioned result used by all surfaces: relationship/asset; signed amount and explicit direction; calculation version and cutoff; source coverage; component totals and evidence references; readiness and reason codes; allowed actions; exception/owner; review history; and last-check outcome. FE displays that result and does not independently calculate money or decide permission. The exact API shape is agreed together, not prescribed here.

FE should cover loading, unavailable source, zero amount, reversed direction, Needs attention, changed-version review, empty history and repeated refresh. Comparison comments are allowed on blocked results; payment authorization and financial override actions are absent. If a result changes during review, show the change and request review of the latest version. Keep the earlier reviewed amount in history; do not relabel a newer amount as already reviewed. S1–S3 fixtures shared with BE are the starting contract, with the position-mismatch example and edge cases below added before acceptance.

**Prototype follow-up:** the current site demonstrates the main scenarios but needs these rules aligned before it is used as acceptance evidence: evaluate stale/invalid evidence before showing Up to date; distinguish an ordinary no-match refresh from a missed expected settlement; and preserve the actual reviewed amount/version when the current amount changes. Show the MVP boundary and add thin case-note/reference support; richer assignment and resolution tooling is deferred. These are specified here; this PRD revision does not claim that the site already implements them.

## 8. Required scenarios and acceptance criteria

| Scenario | Expected result |
|---|---|
| Normal settlement | Northstar owes 100,000 USDC. Controls pass. After a matching 100,000 USDC settlement is observed, the amount to settle is zero. |
| Missed windows | 100,000 USDC owed, then 20,000 USDC earned, then 30,000 USDC owed. The next review shows one current amount of 110,000 USDC. |
| Settlement not yet observed | The current amount is 125,000 USDC, including 15,000 USDC of new activity. An operator reports a 110,000 USDC payment, but matching evidence is missing. Check again with no new activity or qualifying evidence leaves 125,000 USDC open and retains the investigation case. |
| No settlement expected | With fresh, complete inputs and no reported attempt, conflicting evidence or missed expectation, Check again finds no settlement and leaves the amount and readiness unchanged. The refresh itself does not create an exception. |
| Partial later observation | A matching observed settlement of 110,000 USDC reduces the 125,000 USDC amount to 15,000 USDC. The relationship is not shown as cleared. |
| Stale or inconsistent sources | Range blocks or routes to review, preserves the last calculation, and explains which source or control prevents action. |
| Zero with stale data | Needs attention, not Up to date. A zero balance does not bypass evidence and controls. |
| Activity offsets the amount | +20,000 followed by −20,000 produces zero with no settlement event. History explains the offset. |
| Duplicate or concurrent observation | Re-reading the same movement, observing both account legs, or racing an hourly run with Check again applies it once. |
| Late data or changed review | New evidence creates a new version and requires renewed review where relevant. The old review remains tied to its original inputs. |
| Wrong direction, unknown mapping or multiple matches | No automatic match. Needs attention with source references and a named next step. |
| Failed, timed-out or excessive external settlement | Preserve the evidence and resulting accounting facts; manual resolution is required before a new recommendation. |

The calculation must be deterministic and replayable. Repeating Check again on the same observation must never apply a settlement twice. Current amounts must agree across queue, case and calculation views. History retains the amount and version at each event, which can differ from today's amount. A reviewer must be able to identify who owes whom, why Range considers the amount reliable or unsafe, and the next action without reconstructing the ledger.

## 9. Build sequence and QA

| Product question | Build and validate | Decision before expanding |
|---|---|---|
| Can we trust the answer? | Agree accounting and matching rules; build deterministic calculation, reconciliation and controls against independently checked cases. | Resolve unsupported inputs or narrow the pilot. More UI or automation will not fix an unreliable source model. |
| Can an operator act on it? | Build queue, case, evidence and notes against the shared outputs. PM-led walkthroughs test explanation and the correct next action. | Improve unclear evidence and guidance before adding more scenarios or automated actions. |
| What did we learn in the first two weeks? | Test stale data, partial observations, repeated refresh and changed versions; review observed errors and operator feedback. | Close the two weeks with a retrospective and choose the next improvement. Formal KPI collection is deferred. |

The backend carries the main uncertainty, so the frontend builds against versioned fixtures from the first days. The team uses a shared scenario set and reviews the prototype daily. The MVP review is the default end state; controlled live use needs the matching rule, controls, and operational ownership to be validated first.

### How I would run this as Head of Product

I would start with Max, engineering and an Atlas operations representative to agree the settlement definition, the actual custody handoff and one recent difficult case. I would bring the worked calculation and ask them to validate each input and source. I would involve compliance for hard blocks and review ownership, and the CTO for source coverage, matching and delivery risks. These decisions become a short assumption log with an owner and resolution date.

I would use this PRD as the shared decision record, the deck to guide the team conversation, and the site to walk through operator actions. I would use the team's existing issue tracker for a small backlog, GitHub or its equivalent for code review and versioned fixtures, and a spreadsheet or executable calculation worksheet to independently check the expected amounts. No additional planning tool is needed for a two-week pilot.

I would organize work as vertical slices: correct amount and evidence first; controls and a useful exception case second; review and observation third. Each ticket states the operator outcome, inputs, expected result and acceptance fixture. BE owns the deterministic model and consistency; FE owns displaying it and preventing misleading interactions. I own scope decisions, unresolved assumptions, operator feedback and acceptance QA, while engineers own technical testing and implementation choices.

We would agree the response contract first so FE can progress against fixtures while BE resolves data semantics. I would hold a short daily review of blockers and changed assumptions and regular working walkthroughs. New edge cases enter the shared fixtures, and material decisions go back into this PRD. If matching is not reliable, I would narrow the pilot and reduce optional polish before weakening controls.

Before calling the pilot usable, I would replay the acceptance cases with operations, compare the amounts against an independent expected calculation, record gaps, and observe whether operators can explain the amount and next step unaided. Release readiness requires deterministic replay, no duplicate application, enforced hard blocks, traceable decisions and a named exception owner. The MVP review compares outputs with the current manual process; controlled live use is a separate decision after the evidence and external controls are validated.

### What comes next

1. **Next increment:** the read-only evidence-gathering agent for the chosen exception, assessed against manual investigation using the same cases.
2. **Then:** a deliberately scoped settlement instruction and approval flow, once the executor, authorization, acknowledgment, duplicate protection and unknown-outcome handling are agreed.
3. **After the first arrangement is reliable:** revisit cadence, add arrangements/assets and richer operational reporting based on observed demand and risk.

Deferring the agent and instruction delivery is a prioritization choice, not a complete answer to the longer-term product problem. If Range expects either to be demonstrated in the first cycle, I would renegotiate the slice explicitly rather than imply that external handoff or a scripted prototype already delivers it.

## 10. Success measures and open questions

**Product hypothesis:** operators can reach a correct, evidence-backed settlement decision with less manual investigation.

**First-cycle boundary:** metrics instrumentation, dashboards and formal KPI collection are out of scope. Finish the two weeks with an operator/engineering retrospective on observed errors, confusing steps and unresolved assumptions. Use those observations to prioritize the next improvement; they are not a quantified baseline. Calculation tests, control checks and PM-led acceptance QA remain delivery work, separate from product KPI measurement.

**Proposed KPIs for later measurement:**

| KPI | Definition to use when tracking is introduced | Goal |
|---|---|---|
| Incorrect amounts or payment directions | Count incorrect calculation results against independently validated outcomes at the same cutoff. Record the reviewed sample size. | Zero errors |
| Missed settlement blocks | Count cases where Range recommends proceeding despite a required block. | Zero misses |
| Cases requiring manual investigation (%) | Cases needing human evidence gathering or discrepancy investigation / all eligible cases in the measurement period. Routine operator review is not an investigation. | Decrease |
| Active investigation time | Median human minutes per investigation, excluding time waiting for a source or counterparty. | Decrease |

Agree baselines, periods and improvement targets with Atlas when introducing measurement. Compare similar case types, particularly when assessing the later agent. Lower investigation rates or times only count as improvement if correctness is maintained. These are product goals, not first-cycle measured results or claims about custody execution speed.

The Range conversation should resolve these questions:

1. Which client, account relationship, asset, and venue accounting definition make up the first pilot?
2. What exact evidence is sufficient for Range to mark a settlement as observed?
3. Who is allowed to initiate the external custody transfer, and what existing operational controls prevent duplicate transfers during the pilot?
4. Which policies are hard blocks, and which need compliance review?
5. Which exception most deserves the next-sprint evidence-gathering agent?
6. What are the accounting bridge, eligible event types, treatment of collateral/unrealized P&L, and source deduplication keys?
7. What source freshness/completeness guarantees, reconciliation tolerances, window times and review deadlines fit Atlas's actual operations?
8. Is an MVP control-and-decision pilot the right first-cycle outcome, with agent investigation and reliable instruction delivery sequenced afterward?

The shared product boundary remains: Range calculates and controls the amount to settle; external custody systems move funds; Range observes evidence and reconciles the result. This expanded PRD is the behavioral reference for the prototype follow-ups above and for the next deck wording pass.
