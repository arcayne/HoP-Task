# Range off-chain settlement: pilot proposal

**Interview pre read · about seven minutes · discussion draft**

## The decision

Give Atlas Exchange one clear answer for Northstar Institutional: **what is the amount to settle, is it safe and permitted to proceed, and why**

With one backend engineer and one frontend engineer, I would spend the first two weeks proving calculation, controls and the operator workflow in comparison mode. The authorized payer uses the existing custody process. Range observes the resulting settlement through existing read connectors.

**Comparison mode:** compare Range's results with the existing process. Range's recommendations do not authorize or stop live transfers during this pilot.

**Already available:** account mapping, last successfully settled positions, current venue/custody activity and balances, and configured policies and controls.

**Pilot assumptions:** one account relationship, USDC, agreed realized P&L, fees and funding. These accounting rules need validation with Atlas.

## 1. The workflow


**Automatic:** reconcile hourly and at two daily settlement windows.

**On human request:** the operator can rerun using available connected records. 

The agent does not trigger this action in the MVP. Start with two windows to limit manual review work, validate the cadence against source latency, risk and custody cutoffs. A window reviews the latest amount, it creates no separate debt.

| Operator state | Meaning and next step |
|---|---|
| **Up to date** | A valid current calculation is zero. No settlement action needed. |
| **Ready to settle** | The amount is nonzero and checks pass. Review before proceeding externally. |
| **Needs attention** | Evidence or controls prevent proceeding. Open the case and resolve the named issue. |

Stale or invalid evidence takes priority even when the last amount was zero. Range cannot infer that a transfer is in progress from an operator review.

## 2. Calculate the amount; then verify the positions

**Hourly calculation, for one relationship and asset:**

```text
Current amount = opening unsettled amount
              + signed eligible venue activity
              − signed observed settlements
```

Positive means Northstar owes Atlas; negative means Atlas owes Northstar. Count each source event and economic settlement once. Replay from an agreed baseline, preserving calculation versions and source cutoffs.

| What arrives | Amount Northstar owes Atlas |
|---|---:|
| 100k loss | 100k |
| 20k profit | 80k |
| 30k further loss | 110k |
| 15k new activity | 125k |
| Matching 110k settlement observed | **15k** |

New activity can change the amount without a transfer. A reported payment cannot reduce it without matching evidence. Rechecking identical inputs changes nothing.

**Reconciliation checks whether the source positions make sense.** In this example, Northstar starts with 1m USDC in custody, mirrored as venue equity. A 110k trading loss leaves 890k of venue equity and 110k owed to Atlas. No funds have moved, so custody should still show 1m:

| Position | Expected | Reported | Unexplained difference |
|---|---:|---:|---:|
| Venue equity | 890k | 890k | 0 |
| Custody balance | 1m | 980k | **−20k** |

**Range flags:** “Custody shows 20k less than expected. No available transaction explains the difference.” It shows **Needs attention** alongside the last validated 110k amount and timestamp. It does not assume the missing 20k was paid to Atlas.

**In the MVP:** detecting and explaining this difference is in scope. Operations investigates through the existing process; Range does not provide an accounting correction tool. The next section explains how the result comes back.

## 3. What blocks settlement, and who resolves it?

| Block or review reason | Required response |
|---|---|
| Stale, incomplete or disagreeing records | Preserve the last validated result; obtain evidence and rerun. |
| Insufficient available funds, invalid destination or policy/risk breach | Explain the failed configured check; route to operations or compliance. |
| Expected settlement has missing or ambiguous evidence | Investigate before recommending another transfer. A timeout does not prove failure. |

The case gives the operator **reason → source evidence → owner → next action**. A block means Range cannot recommend proceeding; the MVP pilot does not control the live custody process.

**How an investigation comes back into Range:**

1. Operations checks the venue/custody tools and follows up with the source owner. In Range, they can add a short case note and transaction reference or link.
2. A missing transaction or corrected balance must arrive through the existing read connectors. A note, uploaded receipt or direct database edit is not a financial correction mechanism in this MVP.
3. The next scheduled run, or a human **Check again**, re-evaluates those records. Range saves a new calculation/check result and updates the case if the checks pass. If the required evidence is still unavailable, the case stays open.

The backend stores calculation versions, check results and case notes with actor/time and source references. Reviewers record agreement or disagreement with a result; this is not live payment approval. Evidence ingestion and manual adjustment workflows need discovery before they are added.

## 4. What should the agent investigate?

**Agent foundation is part of this MVP; agent-assisted investigation is the next increment.** During this MVP, operations investigates manually while we create the first agent skill, define its permitted reads, prepare fixtures, and test candidate-record and gap explanations. The skill is not triggered automatically. In the next increment, it helps operations find relevant transactions and explain missing or conflicting evidence. For example, Range shows 125k owed and the operator reports paying 110k. The agent gathers two candidate records:

| Evidence | Agent assessment |
|---|---|
| `CUST-741`: 110k to Atlas; receiving record missing | Relevant candidate; obtain the corresponding receipt. |
| `CUST-742`: 110k to Northstar's own account | Different destination; not settlement to Atlas. |

**Agent recommendation:** “Keep 125k open. Check the receiving record for CUST-741. CUST-742 does not settle this amount.” The output cites the source records and names what remains unknown.

The operator reviews the proposed association. Once sufficient receipt evidence arrives through the existing connectors, deterministic matching revalidates and applies 110k once, leaving **15k**. Readiness still depends on current controls.

The next-increment agent gathers and explains evidence automatically. It does not approve payments, change accounting rules, clear hard blocks or retry transfers. Evaluate it on correct citations, unsupported matches and investigation time before live use.

## 5. What we prove in the two-week pilot

1. **Can we trust the answer?** Agree the accounting and evidence rules, then replay real examples with known outcomes. Build calculation, reconciliation and controls first. If the sources cannot support a reliable answer, narrow the pilot before adding automation.
2. **Can an operator act on it?** Build the queue, case, evidence and notes around those examples. Test whether operators can explain the amount and choose the correct next step without help. Use their mistakes to improve the workflow.
3. **What did we learn in comparison mode?** Check missed windows, partial observations, stale data and repeated refreshes. Close the two weeks with an operator/engineering retrospective: what was wrong, what was confusing, and what should we build next?

**FE contract:** display the backend's versioned amount, direction, readiness, evidence and allowed actions. The prototype guides layout; FE does not recalculate money. Detailed rules and known prototype follow-ups are in the appendix.

**Manual now:** custody execution and exception investigation, plus the first agent skill and its evaluation fixtures. 
**Next:** agent-assisted evidence gathering, built on the MVP foundation. 
**Later:** authorized settlement-instruction delivery, approval integration and recovery, followed by broader coverage. Sending instructions and moving funds are distinct; both Range managed delivery and execution are deferred in this first cut.

I would use this proposal, the prototype, the team's issue tracker and shared test cases to align the work. BE owns calculation and checks; FE builds against their agreed outputs. I own assumptions, prioritization and PM led operator QA; engineers own implementation and technical testing. Review evidence and blockers together, and adjust scope when assumptions fail.

## 6. Product success and pilot learning

**The product hypothesis:** operators can reach a correct, evidence-backed settlement decision with less manual investigation.

**Proposed KPIs as the product develops:**

| KPI | Goal |
|---|---|
| Incorrect amounts or payment directions | Zero errors |
| Missed settlement blocks | Zero misses |
| Cases requiring manual investigation (%) | Decrease |
| Active investigation time (minutes per case) | Decrease |

**First-cycle scope:** no metrics dashboard, instrumentation or formal KPI collection. At the end of two weeks, review observed errors, operator feedback and unresolved assumptions with the team, then choose the next improvement. This retrospective is qualitative learning, not a measured performance claim. Engineering QA remains part of delivery.

## Walk through the first-cycle cases

**Let’s explore the prototype together:** review a normal settlement, follow the amount across missed windows, and investigate a case where settlement has not been observed. For each case, we can test whether the amount, evidence and next operator action are clear.

These cases illustrate the intended MVP. Investigation remains manual in the first cycle; agent support follows later.

**[Explore the interactive prototype →](https://arcayne.github.io/HoP-Task/)**

The [engineering appendix](engineering-appendix.md) is available for questions about calculation rules and implementation.
