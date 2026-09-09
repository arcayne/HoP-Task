# Self review

The key ambiguity was whether a reviewed external handoff should create a Range transfer object. The approved PRD explicitly defers transfer creation and tracking, so the prototype records only a reviewed handoff in its local history. It does not block later action or claim that an external transfer has started.

The amount calculation retains observed settlements as the only event that reduces the balance. S3 uses an observed 110,000 USDC settlement against a 125,000 USDC current amount, leaving 15,000 USDC.

All customer-facing wording now uses `amount to settle`, `settlement evidence`, `observed settlement`, and `external handoff`. The site, PRD, static capture, and deck explicitly avoid a Range-created transfer or an in-progress-payment state.

Validation completed on 2026-09-08: S1-S3 regression pass, interactive normal-settlement walkthrough, static capture inspection, and final deck rendering plus structural validation.
