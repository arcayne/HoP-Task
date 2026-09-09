const money = new Intl.NumberFormat('en-US');
const clone = value => JSON.parse(JSON.stringify(value));
const formatAmount = value => `${money.format(Math.abs(value))} USDC`;
const direction = (amount, client = 'Northstar') => amount > 0 ? `${client} owes Atlas` : amount < 0 ? `Atlas owes ${client}` : 'No amount to settle';

const SCENARIOS = {
  s1: {
    id: 's1', label: 'S1', name: 'Normal settlement', question: 'What lets the operator use the existing custody process?', asOf: '07 Sep 2026 · 10:00 UTC', opening: 0,
    events: [{ id: 's1-activity', type: 'venue', signed: 100000, title: 'Net activity accrued', detail: '+100,000 USDC · Northstar owes Atlas', time: '07 Sep · 09:00 UTC' }],
    observationAmount: 100000, observationAvailable: false, lastChecked: null, checkResult: null, handoffReviewed: false, review: null, notes: [], stale: false, sourceUnavailable: false,
    cutoff: '07 Sep 2026 · 09:15 UTC', proposalVersion: 'v1 · 09:18 UTC', destination: 'Atlas settlement wallet', sourceAccount: 'Northstar trading account · sim://acct-ns-01',
    history: [['review', 'Settlement window opened', 'Amount to settle confirmed from source records', '07 Sep · 09:00 UTC']]
  },
  s2: {
    id: 's2', label: 'S2', name: 'Missed windows', question: 'What happens when settlement windows are missed?', asOf: '03 Sep 2026 · 14:00 UTC', opening: 0,
    events: [], replayIndex: 0, observationAmount: 110000, observationAvailable: false, lastChecked: null, checkResult: null, handoffReviewed: false, review: null, notes: [], stale: false, sourceUnavailable: false,
    cutoff: '03 Sep 2026 · 13:15 UTC', proposalVersion: 'v3 · 13:18 UTC', destination: 'Atlas settlement wallet', sourceAccount: 'Northstar trading account · sim://acct-ns-01',
    replaySteps: [
      { id: 's2-activity-1', type: 'venue', signed: 100000, title: 'First window · net activity accrued', detail: '+100,000 USDC · Northstar owes Atlas', time: '01 Sep 2026 · 09:00 UTC' },
      { id: 's2-window-1', type: 'workflow', title: 'First settlement window missed', detail: 'No result review recorded', time: '01 Sep 2026 · 17:00 UTC' },
      { id: 's2-activity-2', type: 'venue', signed: -20000, title: 'Second window · Northstar earned 20,000', detail: '-20,000 USDC · amount to settle becomes 80,000', time: '02 Sep 2026 · 09:00 UTC' },
      { id: 's2-window-2', type: 'workflow', title: 'Second settlement window missed', detail: 'No result review recorded', time: '02 Sep 2026 · 17:00 UTC' },
      { id: 's2-activity-3', type: 'venue', signed: 30000, title: 'Third window · new activity accrued', detail: '+30,000 USDC · amount to settle becomes 110,000', time: '03 Sep 2026 · 09:00 UTC' },
      { id: 's2-proposal', type: 'workflow', title: 'Current amount ready for review', detail: '110,000 USDC · controls evaluated', time: '03 Sep 2026 · 09:18 UTC' }
    ],
    history: []
  },
  s3: {
    id: 's3', label: 'S3', name: 'Settlement not observed', question: 'What do we do when settlement evidence is not visible?', asOf: '07 Sep 2026 · 15:00 UTC', opening: 0,
    events: [
      { id: 's3-activity-1', type: 'venue', signed: 110000, title: 'Activity carried from earlier windows', detail: '+110,000 USDC · Northstar owes Atlas', time: '07 Sep 2026 · 13:15 UTC' },
      { id: 's3-activity-2', type: 'venue', signed: 15000, postCutoff: true, title: 'New activity accrued', detail: '+15,000 USDC · current amount to settle 125,000', time: '07 Sep 2026 · 14:30 UTC' }
    ],
    observationAmount: 110000, observationAvailable: false, lastChecked: '07 Sep 2026 · 15:00 UTC', checkResult: 'no-match', handoffReviewed: true, review: { decision: 'disagree', comment: 'Reported externally; matching source evidence is still missing.', amount: 125000, version: 'v3', time: '07 Sep 2026 · 15:00 UTC' }, notes: [{ body: 'Operator reports paying 110,000 USDC externally; verify in the existing custody workflow.', reference: 'reported://northstar-110k', owner: 'Atlas Settlement Operations', time: '07 Sep 2026 · 15:00 UTC' }], stale: false, sourceUnavailable: false,
    cutoff: '07 Sep 2026 · 13:15 UTC', proposalVersion: 'v3 · 13:18 UTC', destination: 'Atlas settlement wallet', sourceAccount: 'Northstar trading account · sim://acct-ns-01',
    history: [
      ['review', 'Shadow result reviewed', 'Disagreed · operator reported paying 110,000 USDC; no matching source evidence', '07 Sep 2026 · 13:24 UTC'],
      ['activity', 'New activity accrued', '+15,000 USDC · current amount to settle 125,000', '07 Sep 2026 · 14:30 UTC'],
      ['checked', 'Settlement evidence checked', 'No matching settlement observed', '07 Sep 2026 · 15:00 UTC']
    ]
  },
  s4: {
    id: 's4', label: 'M1', name: 'Position mismatch', question: 'What happens when source positions disagree?', asOf: '07 Sep 2026 · 13:00 UTC', opening: 0,
    events: [{ id: 's4-activity', type: 'venue', signed: 110000, title: 'Validated venue activity', detail: '+110,000 USDC · last validated amount', time: '07 Sep 2026 · 12:00 UTC' }],
    observationAmount: 0, observationAvailable: false, lastChecked: null, checkResult: 'no-match', handoffReviewed: false, review: null, notes: [], stale: false, sourceUnavailable: false, positionMismatch: true, correctedSnapshot: false, validatedAt: '07 Sep 2026 · 12:00 UTC', discrepancyDetectedAt: '07 Sep 2026 · 13:00 UTC',
    cutoff: '07 Sep 2026 · 13:00 UTC', proposalVersion: 'v1 · 12:00 UTC', destination: 'Atlas settlement wallet', sourceAccount: 'Northstar trading account · sim://acct-ns-01',
    discrepancy: 'Custody shows 20,000 USDC less than expected. No available transaction explains the difference.', history: [['checked', 'Position discrepancy detected', 'Custody expected 1,000,000 · reported 980,000', '07 Sep 2026 · 13:00 UTC']]
  }
};

const state = { scenarioId: 's1', scenario: clone(SCENARIOS.s1), view: 'queue', reviewOpen: false, reviewSnapshot: null, toastTimer: null, modalReturnFocus: null };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = value => String(value).replace(/[&<>\"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[character]));
const replayComplete = scenario => !scenario.replaySteps || scenario.replayIndex >= scenario.replaySteps.length - 1;

function financialEvents(scenario) {
  return scenario.replaySteps ? [...scenario.replaySteps.slice(0, scenario.replayIndex + 1), ...(scenario.events || [])] : (scenario.events || []);
}
function projectScenario(scenario) {
  const events = financialEvents(scenario);
  const venueActivity = events.filter(event => event.type === 'venue').reduce((total, event) => total + event.signed, 0);
  const confirmedSettlements = events.filter(event => event.type === 'settlement').reduce((total, event) => total + event.signed, 0);
  return { venueActivity, confirmedSettlements, obligation: scenario.opening + venueActivity - confirmedSettlements };
}
const currentAmount = scenario => projectScenario(scenario).obligation;
const hasObservedSettlement = scenario => financialEvents(scenario).some(event => event.type === 'settlement');
const canReview = scenario => !scenario.stale && !scenario.sourceUnavailable && replayComplete(scenario);
const nowLabel = () => 'Just now';

function resetScenario(id = state.scenarioId) {
  state.scenarioId = id;
  state.scenario = clone(SCENARIOS[id]);
  state.view = 'queue';
  state.reviewOpen = false;
  state.reviewSnapshot = null;
  closeModal();
  render();
}

function statusFor(scenario) {
  const amount = currentAmount(scenario);
  if (scenario.positionMismatch) return { key: 'attention', label: 'Needs attention', copy: scenario.correctedSnapshot ? 'Corrected source snapshot ready to check' : `${scenario.discrepancy} Detected at ${scenario.discrepancyDetectedAt}.` };
  if (scenario.stale || scenario.sourceUnavailable || scenario.checkResult === 'no-match') return { key: 'attention', label: 'Needs attention', copy: scenario.sourceUnavailable ? 'Settlement evidence check unavailable' : scenario.stale ? 'Review changed evidence' : 'No matching settlement evidence observed' };
  if (amount === 0) return { key: 'up-to-date', label: 'Up to date', copy: hasObservedSettlement(scenario) ? 'Matching settlement observed' : 'Offsetting activity; no settlement observed' };
  return { key: 'ready', label: 'Ready to settle', copy: hasObservedSettlement(scenario) ? `${formatAmount(amount)} remains after observed settlement` : 'Configured checks pass for this result' };
}

function nextActionTitle(s, view) {
  if (s.id === 's4' && s.positionMismatch && !s.correctedSnapshot) return 'Investigate the position mismatch.';
  if (s.id === 's4' && s.correctedSnapshot && s.checkResult !== 'changed') return view === 'queue' ? 'Open the case to check the corrected snapshot.' : 'Check the corrected source snapshot.';
  if (s.id === 's2' && !replayComplete(s)) return 'Replay the missed windows.';
  if (currentAmount(s) === 0) return 'Review the settlement history.';
  if (s.sourceUnavailable) return 'Wait for settlement evidence.';
  if (s.checkResult === 'no-match') return 'Investigate the missing evidence.';
  if (s.observationAvailable) return 'Check the settlement evidence.';
  if (!s.review) return view === 'queue' ? 'Start with the Northstar case.' : 'Review the result.';
  return 'Use the existing custody process, then Check again.';
}
function nextActionCopy(s, view) {
  if (s.id === 's4' && s.positionMismatch && !s.correctedSnapshot) return `${s.discrepancy} Detected at ${s.discrepancyDetectedAt}; the last validated amount remains ${formatAmount(currentAmount(s))} from ${s.validatedAt}. No replacement amount is inferred.`;
  if (s.id === 's4' && s.correctedSnapshot && s.checkResult !== 'changed') return 'A corrected custody snapshot is available. Check again to reconcile it; no settlement event is introduced.';
  if (s.id === 's2' && !replayComplete(s)) return `Current projection: ${formatAmount(currentAmount(s))} owed. Use Next event to replay the missed windows.`;
  if (currentAmount(s) === 0) return 'The matching settlement was observed and applied once.';
  if (s.sourceUnavailable) return 'The previous calculation is preserved. Wait for a current source snapshot before acting.';
  if (s.checkResult === 'no-match') return 'No matching settlement evidence is available. This does not establish whether an external transfer was initiated.';
  if (s.observationAvailable) return 'A simulated matching settlement record is available. Check again to apply it once.';
  if (!s.review) return view === 'queue' ? 'Open Northstar to inspect the amount, evidence, controls, and destination.' : `Review ${formatAmount(currentAmount(s))}, its direction, and source data. This records feedback on Range's result, not transfer authorization.`;
  return 'Use the existing custody process outside Range. Range cannot see whether the transfer has started; Check again when evidence may be available.';
}
function presenterActionLabel(s, view) {
  if (s.id === 's4' && s.positionMismatch && !s.correctedSnapshot) return 'Simulate corrected snapshot';
  if (s.id === 's4' && s.correctedSnapshot && s.checkResult !== 'changed') return view === 'queue' ? 'Open Northstar case' : 'Check again';
  if (s.id === 's2' && !replayComplete(s)) return 'Next event';
  if (view === 'queue') return 'Open Northstar case';
  if (s.observationAvailable) return 'Check again';
  if (s.checkResult === 'no-match') return 'Simulate settlement record arriving';
  if (!s.review && canReview(s)) return 'Review result';
  if (currentAmount(s) === 0) return 'Walkthrough complete';
  return 'Check again';
}

function renderQueue() {
  const s = state.scenario; const status = statusFor(s); const projection = projectScenario(s);
  const statusClass = status.key === 'attention' ? 'blocked' : status.key === 'up-to-date' ? 'confirmed' : 'ready';
  return `<section class="page-header"><div><p class="eyebrow">Atlas Exchange / settlements</p><div class="title-row"><h1>Settlement queue</h1><span class="live-pill"><span class="pulse"></span>Northstar only</span></div><p class="page-description">One settlement relationship requires a clear next action.</p></div><div class="header-actions"><button class="button button-primary" type="button" data-action="reset"><span class="button-icon">⟲</span>Reset walkthrough</button></div></section>
    <section class="queue-card single-queue-card" aria-labelledby="queue-title"><div class="section-heading"><div><div class="section-title-row"><h2 id="queue-title">Northstar Institutional</h2><span class="record-count">Trading account · USDC</span></div><p>Review the current amount, readiness, and settlement evidence.</p></div><div class="queue-source"><span class="footer-dot"></span>Source data as of <strong>${s.asOf}</strong></div></div>
      <div class="queue-table-wrap"><table class="queue-table"><thead><tr><th>Relationship</th><th>Amount to settle</th><th>Readiness</th><th>Next action</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody><tr><td><div class="client-cell"><span class="client-avatar">NI</span><span><span class="cell-title">Northstar Institutional</span><span class="cell-subtitle">Atlas / Trading account · USDC</span></span></div></td><td class="amount-cell"><span class="amount ${projection.obligation < 0 ? 'negative' : projection.obligation === 0 ? 'zero' : 'positive'}">${formatAmount(projection.obligation)}</span><span class="subtle-label">${s.positionMismatch && !s.correctedSnapshot ? `Last validated amount · ${s.validatedAt}` : direction(projection.obligation, 'Northstar')}</span></td><td class="payment-cell"><span class="state-badge ${statusClass}"><span class="badge-dot"></span>${status.label}</span></td><td><span class="subtle-label">${status.copy}</span></td><td><button class="row-action" type="button" data-action="open-row">Open case</button></td></tr></tbody></table></div>
      <div class="queue-footer"><span><span class="footer-dot"></span>Illustrative source records · not a live feed</span><button class="text-button" type="button" data-action="show-freshness">View source freshness <span>→</span></button></div>
    </section>
    <section class="queue-note-grid"><article class="principles-card"><div class="card-kicker"><span class="kicker-icon">✓</span>Next action</div><h2>${nextActionTitle(s, 'queue')}</h2><p>${nextActionCopy(s, 'queue')}</p><button class="button button-primary" type="button" data-action="presenter-action">${presenterActionLabel(s, 'queue')}</button></article><article class="attention-card"><div class="card-kicker"><span class="kicker-icon amber">i</span>Pilot boundary</div><h2>Custody transfer outside Range</h2><p>Range gives the operator the amount, direction, destination, and evidence. Atlas uses its existing custody process; Range later checks the available records.</p><button class="text-button" type="button" data-action="show-pilot-note">Read pilot note <span>→</span></button></article></section>`;
}

function renderCase() {
  const s = state.scenario; const projection = projectScenario(s); const status = statusFor(s); const reviewAvailable = canReview(s);
  const alert = s.id === 's4' && s.positionMismatch ? `<div class="case-alert"><span class="alert-icon">!</span><div><strong>${s.discrepancy}</strong><p>Discrepancy detected at ${s.discrepancyDetectedAt}; the last validated amount was ${formatAmount(currentAmount(s))} at ${s.validatedAt}. No settlement is inferred.</p></div></div>` : s.checkResult === 'no-match' ? `<div class="case-alert"><span class="alert-icon">!</span><div><strong>No matching settlement evidence observed</strong><p>The amount remains open. Range cannot determine whether an external transfer was initiated from a missing record.</p></div></div>` : s.checkResult === 'matched' ? `<div class="case-alert settled-alert"><span class="alert-icon">✓</span><div><strong>Matching settlement observed</strong><p>Range applied the observed movement once and recalculated the current amount.</p></div></div>` : '';
  $('#main-content').innerHTML = `<div class="case-view"><a class="back-link" href="#queue" data-action="back-to-queue">← Back to settlement queue</a><div class="case-header"><div><div class="breadcrumbs"><a href="#queue" data-action="back-to-queue">Settlement queue</a><span>/</span><span>Northstar Institutional</span></div><div class="case-heading"><span class="client-avatar">NI</span><div><h1>Northstar Institutional</h1><p>Atlas / Trading account · USDC <span class="record-count">Case NS-014</span></p></div></div></div><div class="case-header-actions"><button class="button button-secondary" type="button" data-action="show-freshness">View source freshness</button>${reviewAvailable ? '<button class="button button-primary" type="button" data-action="open-review">Review result</button>' : ''}</div></div><div class="case-question"><span class="question-mark">?</span><div><strong>${s.question}</strong><p>${nextActionCopy(s, 'case')}</p></div></div>${alert}<div class="case-grid"><div class="case-column">${renderAmountCard(s, projection, status)}${renderHandoffCard(s, projection)}${renderEventReplay(s)}${renderHistoryCard(s)}</div><div class="case-column">${renderChecksCard(s)}${renderEvidenceCard(s)}${s.id === 's3' && s.checkResult === 'no-match' ? renderManualInvestigationCard(s) : renderGuidanceCard(s, projection)}${renderCaseNotes(s)}</div></div></div>`;
}

function renderAmountCard(s, projection, status) {
  const tone = status.key === 'attention' ? 'blocked' : status.key === 'up-to-date' ? 'confirmed' : 'ready';
  const badge = status.key === 'attention' ? 'Evidence needs review' : status.key === 'up-to-date' ? 'No amount remains' : 'Configured checks pass';
  const resultBanner = s.id === 's4' && s.positionMismatch ? `<div class="check-result-banner no-match"><strong>${s.discrepancy}</strong> Detected at ${s.discrepancyDetectedAt}; the last validated amount remains unchanged.</div>` : s.checkResult === 'no-match' ? '<div class="check-result-banner no-match"><strong>No matching settlement observed.</strong> The amount to settle is unchanged.</div>' : s.checkResult === 'matched' ? '<div class="check-result-banner matched"><strong>Matching settlement observed.</strong> Range applied it once and recalculated the amount.</div>' : '';
  return `<article class="detail-card payment-card"><div class="detail-card-header"><h2>Amount to settle</h2><span class="state-badge ${tone}"><span class="badge-dot"></span>${status.label}</span></div><div class="payment-main"><div class="payment-amount-line"><div><div class="payment-amount">${formatAmount(projection.obligation)}</div><div class="payment-direction">${direction(projection.obligation, 'Northstar')}</div></div><span class="unknown-banner"><span></span>${badge}</span></div><div class="payment-meta"><div class="meta-item"><span>Source data as of</span><strong>${s.asOf}</strong></div>${s.validatedAt ? `<div class="meta-item"><span>Last validated</span><strong>${s.validatedAt}</strong></div>` : ''}<div class="meta-item"><span>Last checked</span><strong>${s.lastChecked || 'Not checked yet'}</strong></div><div class="meta-item"><span>Cutoff</span><strong>${s.cutoff}</strong></div><div class="meta-item"><span>Destination</span><strong>${s.destination}</strong></div></div>${resultBanner}</div><div class="payment-note"><strong>Next step:</strong> ${nextActionCopy(s, 'case')}</div><div class="instruction-actions"><button class="button button-primary" type="button" data-action="check-again">Check again</button><button class="button button-secondary" type="button" data-action="focus-note">Add case note</button></div></article>`;
}
function renderHandoffCard(s, projection) {
  if (!s.review) return '';
  return `<article class="detail-card handoff-card"><div class="detail-card-header"><h2>Shadow review</h2><span class="illustrative">Feedback only</span></div><div class="handoff-body"><p>This records agreement or disagreement with Range's result. It does not authorize, stop, or confirm a transfer.</p><div class="handoff-grid"><div><span>Decision</span><strong>${s.review.decision === 'agree' ? 'Agreed with result' : 'Disagreed with result'}</strong></div><div><span>Amount / direction</span><strong>${formatAmount(s.review.amount)} · ${direction(s.review.amount, 'Northstar')}</strong></div><div><span>Calculation version</span><strong>${s.review.version}</strong></div><div><span>Saved</span><strong>${s.review.time}</strong></div></div>${s.review.comment ? `<p class="review-comment"><strong>Comment:</strong> ${escapeHtml(s.review.comment)}</p>` : ''}</div></article>`;
}
function renderCaseNotes(s) {
  const notes = (s.notes || []).map(note => `<div class="case-note"><div><strong>${escapeHtml(note.owner)}</strong><time>${escapeHtml(note.time)}</time></div><p>${escapeHtml(note.body)}</p>${note.reference ? `<span class="record-tag">Reference: ${escapeHtml(note.reference)}</span>` : ''}</div>`).join('');
  return `<article class="detail-card case-notes-card" id="notes"><div class="detail-card-header"><h2>Case notes</h2><small>Session-local · illustrative</small></div><div class="note-form"><label for="note-body">Add case note</label><textarea id="note-body" rows="3" maxlength="300" placeholder="Short context for the next operator"></textarea><label for="note-reference">Transaction reference or link <span>(optional)</span></label><input id="note-reference" type="text" maxlength="180" placeholder="reference:// or https://…" /><div class="note-form-footer"><span>Owner: Atlas Settlement Operations</span><button class="button button-secondary" type="button" data-action="add-note">Save note</button></div></div>${notes ? `<div class="notes-list">${notes}</div>` : '<p class="empty-notes">No notes recorded in this scenario.</p>'}</article>`;
}
function renderChecksCard(s) {
  const observation = s.positionMismatch && !s.correctedSnapshot ? ['!', 'warn', 'Position reconciliation', s.discrepancy, 'Review', 'warn'] : s.sourceUnavailable ? ['!', 'warn', 'Settlement evidence', 'Check unavailable. The previous amount remains in place.', 'Review', 'warn'] : s.checkResult === 'no-match' ? ['!', 'warn', 'Settlement evidence', 'No matching settlement record is available.', 'Review', 'warn'] : s.checkResult === 'changed' ? ['✓', '', 'Position reconciliation', 'Corrected custody snapshot matches expected position.', 'Pass', ''] : s.checkResult === 'matched' ? ['✓', '', 'Settlement evidence', 'Matching movement observed and applied once.', 'Pass', ''] : ['i', 'neutral', 'Settlement evidence', 'No observed settlement has been applied.', 'Not checked', 'neutral'];
  const reconciliation = s.positionMismatch ? ['✓', '', 'Venue activity calculation', 'Signed venue activity totals 110,000 USDC; custody comparison remains unresolved.', 'Pass', ''] : ['✓', '', 'Position reconciliation', 'Venue and custody positions reconcile at this source timestamp.', 'Pass', ''];
  const rows = [reconciliation, ['✓', '', 'Policy and compliance controls', 'Configured policies and controls pass for this amount.', 'Pass', ''], ['✓', '', 'Settlement-fund availability', 'Sufficient illustrative balance for this amount.', 'Pass', ''], observation];
  return `<article class="detail-card"><div class="detail-card-header"><h2>Checks & evidence</h2><small>Current amount</small></div><div class="check-list">${rows.map(([icon, tone, title, detail, result, resultTone]) => `<div class="check-row"><span class="check-icon ${tone}">${icon}</span><div><strong>${title}</strong><p>${detail}</p></div><span class="check-result ${resultTone}">${result}</span></div>`).join('')}</div></article>`;
}
function renderEvidenceCard(s) { const positionTiming = s.validatedAt ? `<br>Last validated amount: ${formatAmount(currentAmount(s))} at ${s.validatedAt}<br>Discrepancy detected at: ${s.discrepancyDetectedAt}` : ''; return `<article class="detail-card evidence-card"><div class="detail-card-header"><h2>Source records</h2><small>Expandable · illustrative IDs</small></div><details class="evidence-item"><summary>Position reconciliation</summary><div class="evidence-content">Venue activity, account mapping, and custody position records are compared at the source timestamp.${positionTiming}<span class="record-tag">sim://position-northstar-${s.id}</span><br>Source data as of ${s.asOf}</div></details><details class="evidence-item"><summary>Settlement observation</summary><div class="evidence-content">${s.observationAvailable ? 'A presenter-simulated qualifying source record is available for Check again.' : 'No qualifying settlement record is currently available. A report or balance change alone is not sufficient evidence.'}<span class="record-tag">sim://observation-${s.id}</span></div></details><details class="evidence-item"><summary>Freshness & check history</summary><div class="evidence-content">Last checked: ${s.lastChecked || 'Not checked yet'}. Source data as of: ${s.asOf}. A click updates Last checked only; it does not make old source data fresh.</div></details></article>`; }
function renderManualInvestigationCard(s) { return `<article class="detail-card investigation-card"><div class="detail-card-header"><h2>Manual investigation</h2><span class="illustrative">Sprint one</span></div><div class="investigation-body"><p class="investigation-lead">No matching settlement is visible for the current amount. That absence does not establish whether an external transfer happened.</p><div class="investigation-section"><h3>Known facts</h3><p>${formatAmount(currentAmount(s))} is the current amount to settle, including 15,000 USDC of new activity. The last evidence check found no matching settlement.</p></div><div class="investigation-section"><h3>Next action</h3><p>Ask the authorized operator to check the existing custody process and return any transaction reference or supporting record. Keep the case open until the evidence is clear.</p></div></div></article>`; }
function renderGuidanceCard(s, projection) {
  const observed = s.checkResult === 'matched';
  return `<article class="detail-card investigation-card"><div class="detail-card-header"><h2>Operator guidance</h2><span class="illustrative">Prototype note</span></div><div class="investigation-body"><p class="investigation-lead">${observed ? 'A matching settlement record changed the amount once. Review the current amount before any further external action.' : 'Review the amount, evidence, and destination before using the existing custody process.'}</p><div class="investigation-section"><h3>Next action</h3><p>${nextActionCopy(s, 'case')}</p></div>${observed && projection.obligation > 0 ? `<div class="investigation-section"><h3>Remaining amount to settle</h3><p>${formatAmount(projection.obligation)} remains after the observed settlement. It is a new current amount, not a replacement transfer.</p></div>` : ''}</div></article>`;
}
function renderEventReplay(s) {
  const events = s.replaySteps ? [...s.replaySteps, ...(s.events || [])] : (s.events || []); const activeIndex = s.replaySteps ? s.replayIndex : events.length - 1; const projection = projectScenario(s);
  return `<article class="detail-card event-replay-card"><div class="detail-card-header"><div><h2>How this amount is calculated</h2><small>Opening ${formatAmount(s.opening)} + signed venue activity − observed settlements</small></div>${s.replaySteps ? `<div class="replay-controls"><span>Step ${Math.min(s.replayIndex + 1, s.replaySteps.length)} of ${s.replaySteps.length}</span><button class="button button-quiet" type="button" data-action="replay-next" ${replayComplete(s) ? 'disabled' : ''}>Next event →</button></div>` : '<span class="illustrative">Source projection</span>'}</div><details class="calculation-details" open><summary>Amount to settle: ${formatAmount(projection.obligation)} · ${direction(projection.obligation, 'Northstar')}</summary><div class="replay-list">${events.map((event, index) => `<div class="replay-event ${index <= activeIndex ? 'replay-event-active' : 'replay-event-future'}"><span class="replay-marker">${index <= activeIndex ? '✓' : index + 1}</span><div><strong>${event.title}</strong><small>${event.detail}</small></div><time>${event.time}</time></div>`).join('')}</div></details></article>`;
}
function renderHistoryCard(s) {
  const history = s.replaySteps ? [...s.replaySteps.slice(0, s.replayIndex + 1).map(event => [event.type === 'venue' ? 'activity' : 'review', event.title, event.detail, event.time]), ...(s.history || [])] : (s.history || []);
  const symbol = type => type === 'settled' ? '✓' : type === 'checked' ? '⌕' : type === 'review' ? '·' : type === 'activity' ? '+' : '·';
  return `<article class="detail-card history-card" id="history"><div class="detail-card-header"><h2>Case history</h2><small>Chronological · no event undo</small></div><div class="history-list">${history.map(event => `<div class="history-item"><span class="history-dot ${event[0]}">${symbol(event[0])}</span><div><div class="history-title">${event[1]}</div><div class="history-detail">${event[2]}</div></div><span class="history-time">${event[3]}</span></div>`).join('')}</div></article>`;
}

function openReview() {
  const s = state.scenario;
  if (!canReview(s)) return showToast('This amount is not ready for review');
  state.reviewOpen = true;
  state.reviewSnapshot = { amount: currentAmount(s), proposalVersion: s.proposalVersion, sourceAsOf: s.asOf };
  openModal(buildReviewModal());
  renderPresenter();
}
function buildReviewModal() {
  const s = state.scenario; const amount = currentAmount(s); const snapshot = state.reviewSnapshot; const stale = s.stale || !snapshot || snapshot.amount !== amount || snapshot.proposalVersion !== s.proposalVersion;
  if (stale) return '<div class="modal-header"><div><h2 id="modal-title">Review needs refresh</h2><p>The evidence changed after this review opened.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body"><div class="stale-box"><strong>Review unavailable</strong> Refresh and inspect the changed evidence before comparing it with the existing custody process.</div></div><div class="modal-footer"><button class="button button-secondary" type="button" data-action="close-modal">Close</button><button class="button button-primary" type="button" data-action="refresh-review">Refresh & review again</button></div>';
  return `<div class="modal-header"><div><h2 id="modal-title">Review result</h2><p>Record whether you agree with this amount and evidence. This is feedback on Range's result, not transfer authorization.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body"><div class="review-amount"><span class="review-amount-label">Current amount to settle</span><strong>${formatAmount(amount)}</strong><p>${direction(amount, 'Northstar')} · USDC</p></div><div class="review-grid"><div class="review-cell"><span>Source custody account</span><strong>${s.sourceAccount}</strong></div><div class="review-cell"><span>Destination settlement account</span><strong>${s.destination} · sim://acct-atlas-01</strong></div><div class="review-cell"><span>Cutoff / source data</span><strong>${s.cutoff} · ${s.asOf}</strong></div><div class="review-cell"><span>Evidence version</span><strong>${s.proposalVersion}</strong></div></div><div class="version-bar"><span class="version-icon">✓</span><span><strong>Checks available for this version.</strong> Configured checks pass or are clearly marked for attention. Range does not authorize or stop live transfers.</span></div><label class="review-comment-label" for="review-comment">Optional comment</label><textarea id="review-comment" class="review-comment-input" rows="3" maxlength="300" placeholder="What should the team know about this result?"></textarea></div><div class="modal-footer"><button class="button button-secondary" type="button" data-action="save-review" data-decision="disagree">Disagree with result</button><button class="button button-primary" type="button" data-action="save-review" data-decision="agree">Agree with result</button></div>`;
}
function saveReview(decision) {
  const s = state.scenario;
  if (!canReview(s) || !state.reviewSnapshot || state.reviewSnapshot.amount !== currentAmount(s) || state.reviewSnapshot.proposalVersion !== s.proposalVersion) return openModal(buildReviewModal());
  const comment = $('#review-comment')?.value.trim() || '';
  s.handoffReviewed = true;
  s.review = { decision, comment, amount: currentAmount(s), version: s.proposalVersion, time: nowLabel() };
  s.history.unshift(['review', 'Shadow result review saved', `${decision === 'agree' ? 'Agreed' : 'Disagreed'} · ${formatAmount(currentAmount(s))} · version ${s.proposalVersion}`, nowLabel()]);
  closeModal(); state.view = 'case'; render(); showToast(`${decision === 'agree' ? 'Agreement' : 'Disagreement'} saved · no transfer authorized`);
}
function checkAgain() {
  const s = state.scenario; s.lastChecked = nowLabel();
  if (s.correctedSnapshot && s.positionMismatch) { s.positionMismatch = false; s.checkResult = 'changed'; s.history.unshift(['checked', 'Corrected custody snapshot checked', 'Reconciliation passes; 110,000 USDC remains owed', nowLabel()]); render(); return showToast('Corrected snapshot checked · amount remains 110,000 USDC'); }
  if (s.sourceUnavailable) { s.checkResult = 'unavailable'; s.history.unshift(['checked', 'Settlement evidence check unavailable', 'Previous financial result preserved', nowLabel()]); render(); return showToast('Check unavailable · amount preserved'); }
  if (s.observationAvailable) {
    const id = `observed-${s.id}-${s.observationAmount}`;
    if (!s.events.some(event => event.id === id)) s.events.push({ id, type: 'settlement', signed: s.observationAmount, title: 'Matching settlement observed', detail: `${formatAmount(s.observationAmount)} · applied once to the amount to settle`, time: nowLabel() });
    s.checkResult = 'matched'; s.history.unshift(['settled', 'Matching settlement observed', `${formatAmount(s.observationAmount)} applied once`, nowLabel()]); render(); return showToast('Matching settlement observed · applied once');
  }
  s.checkResult = 'no-match'; s.history.unshift(['checked', 'Settlement evidence checked', 'No matching settlement observed · amount unchanged', nowLabel()]); render(); showToast('No matching settlement observed · amount unchanged');
}
function addCaseNote() {
  const body = $('#note-body')?.value.trim(); const reference = $('#note-reference')?.value.trim();
  if (!body) { showToast('Add a short note before saving'); $('#note-body')?.focus(); return; }
  state.scenario.notes.push({ body, reference, owner: 'Atlas Settlement Operations', time: nowLabel() });
  state.scenario.history.unshift(['note', 'Case note added', reference ? `${body} · ${reference}` : body, nowLabel()]);
  render(); showToast('Case note saved locally for this scenario');
}
function focusNote() { $('#note-body')?.focus(); $('#notes')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
function simulateObservation() { if (currentAmount(state.scenario) === 0) return; state.scenario.observationAvailable = true; renderPresenter(); showToast('Presenter event: simulated source record arriving'); }
function simulateUnavailable() { const s = state.scenario; s.sourceUnavailable = true; s.checkResult = 'unavailable'; s.lastChecked = nowLabel(); s.history.unshift(['checked', 'Settlement evidence check unavailable', 'Previous financial result preserved', nowLabel()]); render(); showToast('Check unavailable · amount preserved'); }
function refreshReview() { const s = state.scenario; s.stale = false; s.proposalVersion = `${s.proposalVersion.split(' · ')[0]} · just now`; state.reviewSnapshot = { amount: currentAmount(s), proposalVersion: s.proposalVersion, sourceAsOf: s.asOf }; openModal(buildReviewModal()); }
function openFallback() { window.open('fallback.html', '_blank', 'noopener'); }
function showFreshness() { openModal(`<div class="modal-header"><div><h2 id="modal-title">Source freshness</h2><p>Latest available synthetic records for this prototype.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body"><div class="review-grid"><div class="review-cell"><span>Source data as of</span><strong>${state.scenario.asOf}</strong></div><div class="review-cell"><span>Last checked</span><strong>${state.scenario.lastChecked || 'Not checked yet'}</strong></div><div class="review-cell"><span>Source mode</span><strong>Latest available snapshot</strong></div><div class="review-cell"><span>Upstream fetch</span><strong>Not simulated</strong></div></div><div class="version-bar"><span class="version-icon">i</span><span>Check again evaluates available observations. It does not claim a fresh upstream fetch or change Source data as of.</span></div></div><div class="modal-footer"><button class="button button-secondary" type="button" data-action="simulate-unavailable">Simulate unavailable check</button><button class="button button-primary" type="button" data-action="close-modal">Done</button></div>`); }
function showPilotNote() { openModal('<div class="modal-header"><div><h2 id="modal-title">Pilot boundary</h2><p>Custody transfer outside Range is an explicit pilot trade-off.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body"><p class="modal-note" style="margin:0">Compare Range\'s results with the existing process. Range calculates the amount to settle, reconciles venue and custody positions, applies configured controls, and gives the operator the amount, direction, destination, and evidence. Range does not authorize or stop live transfers. Atlas uses Fireblocks, Copper, or its applicable custody process outside Range; Range later checks available records to determine whether settlement happened.</p></div><div class="modal-footer"><button class="button button-primary" type="button" data-action="close-modal">Done</button></div>'); }
function showToast(message) { $('#toast-copy').textContent = message; $('#toast').classList.add('visible'); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200); }
function openModal(html) { state.modalReturnFocus = document.activeElement; $('#modal').innerHTML = html; $('#modal-backdrop').hidden = false; $('#modal').hidden = false; setTimeout(() => $('.modal-close')?.focus(), 0); }
function closeModal() { $('#modal-backdrop').hidden = true; $('#modal').hidden = true; $('#modal').innerHTML = ''; state.reviewOpen = false; state.reviewSnapshot = null; if (state.modalReturnFocus?.focus) state.modalReturnFocus.focus(); state.modalReturnFocus = null; }
function walkthroughProgress(s, view) {
  if (s.id === 's2') return { step: s.handoffReviewed ? 7 : s.replayIndex + 1, total: 7 };
  if (s.id === 's3') return { step: s.checkResult === 'matched' ? 4 : s.observationAvailable ? 3 : view === 'queue' ? 1 : 2, total: 4 };
  if (s.checkResult === 'matched') return { step: 5, total: 5 };
  if (s.observationAvailable) return { step: 4, total: 5 };
  if (s.handoffReviewed) return { step: 3, total: 5 };
  return { step: view === 'queue' ? 1 : 2, total: 5 };
}
function renderPresenter() {
  const s = state.scenario; const { step, total } = walkthroughProgress(s, state.view); const action = $('#presenter-action'); const label = presenterActionLabel(s, state.view); const complete = label === 'Walkthrough complete';
  $$('.scenario-button').forEach(button => button.classList.toggle('active', button.dataset.scenario === state.scenarioId)); $('#presenter-step').textContent = `Step ${step} of ${total}`; $('#presenter-summary').textContent = `${s.label} · Step ${step} of ${total}`; $('#presenter-question').textContent = s.question; $('#presenter-state').textContent = complete ? 'Walkthrough complete' : statusFor(s).label; action.textContent = label; action.hidden = complete; action.disabled = complete; $('#header-as-of').textContent = s.asOf;
}
function render() { if (state.view === 'case') renderCase(); else $('#main-content').innerHTML = renderQueue(); renderPresenter(); }
function navigate(view) { state.view = view; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function handlePresenterAction() {
  const s = state.scenario;
  if (s.id === 's4' && s.positionMismatch && !s.correctedSnapshot) { s.correctedSnapshot = true; render(); return showToast('Presenter event: corrected custody snapshot arriving'); }
  if (s.id === 's4' && s.correctedSnapshot && s.checkResult !== 'changed' && state.view === 'case') return checkAgain();
  if (s.id === 's2' && !replayComplete(s)) { s.replayIndex += 1; render(); return showToast(`${s.replaySteps[s.replayIndex].title} · ${formatAmount(currentAmount(s))} amount to settle`); }
  if (state.view === 'queue') return navigate('case');
  if (s.observationAvailable) return checkAgain();
  if (s.checkResult === 'no-match') return simulateObservation();
  if (!s.handoffReviewed && canReview(s)) return openReview();
  if (currentAmount(s) !== 0) return checkAgain();
}

document.addEventListener('click', event => {
  const nav = event.target.closest('[data-nav]'); if (nav) { event.preventDefault(); navigate(nav.dataset.nav === 'queue' ? 'queue' : 'case'); if (nav.dataset.nav === 'history') setTimeout(() => $('#history')?.scrollIntoView({ behavior: 'smooth' }), 60); return; }
  const scenarioButton = event.target.closest('[data-scenario]'); if (scenarioButton) { resetScenario(scenarioButton.dataset.scenario); showToast(`${state.scenario.label} · ${state.scenario.name}`); return; }
  const action = event.target.closest('[data-action]'); if (!action) return; event.preventDefault();
  switch (action.dataset.action) { case 'reset': resetScenario(); showToast(`${state.scenario.label} walkthrough reset`); break; case 'open-row': navigate('case'); break; case 'back-to-queue': navigate('queue'); break; case 'presenter-action': handlePresenterAction(); break; case 'open-review': openReview(); break; case 'save-review': saveReview(action.dataset.decision); break; case 'add-note': addCaseNote(); break; case 'focus-note': focusNote(); break; case 'toggle-more-cases': { const more = $('#more-cases'); const expanded = more.hidden; more.hidden = !expanded; action.setAttribute('aria-expanded', String(expanded)); break; } case 'close-modal': closeModal(); break; case 'refresh-review': refreshReview(); break; case 'check-again': checkAgain(); break; case 'simulate-observation': simulateObservation(); break; case 'open-fallback': openFallback(); break; case 'show-freshness': showFreshness(); break; case 'show-pilot-note': showPilotNote(); break; case 'simulate-unavailable': simulateUnavailable(); break; case 'replay-next': { const s = state.scenario; if (s.replaySteps && !replayComplete(s)) { s.replayIndex += 1; render(); } break; } }
});
document.addEventListener('keydown', event => { if ($('#modal').hidden) return; if (event.key === 'Escape') return closeModal(); if (event.key !== 'Tab') return; const focusable = $$('button, input, [href], summary', $('#modal')).filter(element => !element.disabled); if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } });
$('#modal-backdrop').addEventListener('click', closeModal);
render();
