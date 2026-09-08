const money = new Intl.NumberFormat('en-US');
const clone = value => JSON.parse(JSON.stringify(value));
const formatAmount = value => `${money.format(Math.abs(value))} USDC`;
const direction = (amount, client = 'Northstar') => amount > 0 ? `${client} owes Atlas` : amount < 0 ? `Atlas owes ${client}` : 'No current obligation';

const SCENARIOS = {
  s1: {
    id: 's1', label: 'S1', name: 'Normal settlement', question: 'What lets the operator approve this settlement?', asOf: '07 Sep 2026 · 10:00 UTC', opening: 0,
    events: [{ id: 's1-activity', type: 'venue', signed: 100000, title: 'Net activity accrued', detail: '+100,000 USDC · Northstar owes Atlas', time: '07 Sep · 09:00 UTC' }],
    instructions: [], observationAvailable: false, lastChecked: null, checkResult: null, stale: false, escalated: false,
    cutoff: '07 Sep 2026 · 09:15 UTC', proposalVersion: 'v1 · 09:18 UTC', destination: 'Atlas settlement wallet', sourceAccount: 'Northstar trading account · sim://acct-ns-01',
    history: [['proposal', 'Settlement proposal created', '100,000 USDC · controls evaluated', '07 Sep · 09:18 UTC'], ['review', 'Window opened for review', 'Current obligation confirmed from source records', '07 Sep · 09:00 UTC']]
  },
  s2: {
    id: 's2', label: 'S2', name: 'Missed windows', question: 'What happens when nobody approves?', asOf: '07 Sep 2026 · 14:00 UTC', opening: 0,
    events: [], instructions: [], replayIndex: 0, observationAvailable: false, lastChecked: null, checkResult: null, stale: false, escalated: false,
    cutoff: '07 Sep 2026 · 13:15 UTC', proposalVersion: 'v3 · 13:18 UTC', destination: 'Atlas settlement wallet', sourceAccount: 'Northstar trading account · sim://acct-ns-01',
    replaySteps: [
      { id: 's2-activity-1', type: 'venue', signed: 100000, title: 'First window · net activity accrued', detail: '+100,000 USDC · Northstar owes Atlas', time: '01 Sep 2026 · 09:00 UTC' },
      { id: 's2-window-1', type: 'workflow', title: 'First settlement window missed', detail: 'No approval · no instruction issued', time: '01 Sep 2026 · 17:00 UTC' },
      { id: 's2-activity-2', type: 'venue', signed: -20000, title: 'Second window · Northstar earned 20,000', detail: '-20,000 USDC · obligation becomes 80,000', time: '02 Sep 2026 · 09:00 UTC' },
      { id: 's2-window-2', type: 'workflow', title: 'Second settlement window missed', detail: 'No approval · no instruction issued', time: '02 Sep 2026 · 17:00 UTC' },
      { id: 's2-activity-3', type: 'venue', signed: 30000, title: 'Third window · new activity accrued', detail: '+30,000 USDC · obligation becomes 110,000', time: '03 Sep 2026 · 09:00 UTC' },
      { id: 's2-proposal', type: 'workflow', title: 'Current proposal created', detail: '110,000 USDC · controls evaluated', time: '03 Sep 2026 · 09:18 UTC' }
    ],
    history: []
  },
  s3: {
    id: 's3', label: 'S3', name: 'Settlement not observed', question: 'What do we do when settlement is not visible?', asOf: '07 Sep 2026 · 15:00 UTC', opening: 0,
    events: [{ id: 's3-activity-1', type: 'venue', signed: 110000, title: 'Instruction-window activity accrued', detail: '+110,000 USDC · Northstar owes Atlas', time: '07 Sep 2026 · 13:15 UTC' }, { id: 's3-activity-2', type: 'venue', signed: 15000, postCutoff: true, title: 'Post-cutoff activity accrued', detail: '+15,000 USDC · current obligation 125,000', time: '07 Sep 2026 · 14:30 UTC' }],
    instructions: [{ id: 'sim-instruction-110k-01', amount: 110000, status: 'Awaiting settlement', issuedAt: '07 Sep 2026 · 13:24 UTC', cutoff: '07 Sep 2026 · 13:15 UTC', proposalVersion: 'v3 · 13:18 UTC', sourceAccount: 'Northstar trading account · sim://acct-ns-01', destination: 'Atlas settlement wallet · sim://acct-atlas-01' }],
    observationAvailable: false, lastChecked: null, checkResult: null, stale: false, escalated: false,
    cutoff: '07 Sep 2026 · 13:15 UTC', proposalVersion: 'v3 · 13:18 UTC', destination: 'Atlas settlement wallet', sourceAccount: 'Northstar trading account · sim://acct-ns-01',
    history: [['issued', 'Instruction issued for external execution', '110,000 USDC · no matching settlement observed', '07 Sep 2026 · 13:24 UTC'], ['activity', 'Post-cutoff activity accrued', '+15,000 USDC · current obligation 125,000', '07 Sep 2026 · 14:30 UTC']]
  }
};

const state = { scenarioId: 's1', scenario: clone(SCENARIOS.s1), view: 'queue', filter: 'all', reviewOpen: false, reviewSnapshot: null, toastTimer: null, modalReturnFocus: null };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function financialEvents(scenario) {
  return scenario.replaySteps ? [...scenario.replaySteps.slice(0, scenario.replayIndex + 1), ...(scenario.events || [])] : (scenario.events || []);
}
function projectScenario(scenario) {
  const events = financialEvents(scenario);
  const venueActivity = events.filter(event => event.type === 'venue').reduce((total, event) => total + event.signed, 0);
  const confirmedSettlements = events.filter(event => event.type === 'settlement').reduce((total, event) => total + event.signed, 0);
  return { venueActivity, confirmedSettlements, obligation: scenario.opening + venueActivity - confirmedSettlements, postCutoffActivity: events.filter(event => event.type === 'venue' && event.postCutoff).reduce((total, event) => total + event.signed, 0) };
}
const currentObligation = scenario => projectScenario(scenario).obligation;
const activeInstruction = scenario => scenario.instructions[scenario.instructions.length - 1] || null;
const replayComplete = scenario => !scenario.replaySteps || scenario.replayIndex >= scenario.replaySteps.length - 1;
const canReview = scenario => !scenario.stale && !activeInstruction(scenario) && (!scenario.replaySteps || replayComplete(scenario)) && currentObligation(scenario) !== 0;
const nowLabel = () => 'Just now';

function resetScenario(id = state.scenarioId) {
  state.scenarioId = id; state.scenario = clone(SCENARIOS[id]); state.view = 'queue'; state.filter = 'all'; state.reviewOpen = false; state.reviewSnapshot = null; closeModal(); render();
}

function statusFor(scenario) {
  const instruction = activeInstruction(scenario); const obligation = currentObligation(scenario);
  if (instruction?.status === 'Settled') return obligation === 0 ? { key: 'settled', label: 'Settled', copy: 'Settlement observed · no current obligation' } : { key: 'residual', label: 'Residual to review', copy: `${formatAmount(obligation)} remains after settlement` };
  if (instruction?.status === 'Awaiting settlement') return { key: 'awaiting', label: 'Awaiting settlement', copy: scenario.checkResult === 'no-match' ? 'No matching settlement observed · check again' : 'Issued for execution in your custody tool' };
  if (scenario.stale) return { key: 'blocked', label: 'Review changed', copy: 'Refresh required before approval' };
  if (scenario.replaySteps && !replayComplete(scenario)) return { key: 'replay', label: 'Replay next event', copy: 'Advance through the missed settlement windows' };
  return { key: 'ready', label: 'Ready for review', copy: 'Controls available for this proposal' };
}

function renderQueue() {
  const s = state.scenario; const status = statusFor(s); const projection = projectScenario(s); const instruction = activeInstruction(s);
  const instructionText = !instruction ? '<span class="payment-none">None issued</span>' : instruction.status === 'Settled' ? '<span class="payment-none">Settled</span><span class="subtle-label">Matching observation recorded</span>' : `<span class="payment-progress">${formatAmount(instruction.amount)} · Awaiting settlement</span><span class="subtle-label">Issued for external execution</span>`;
  const actionLabel = status.key === 'replay' ? 'Open case' : 'Open case';
  return `<section class="page-header"><div><p class="eyebrow">Atlas Exchange / settlements</p><div class="title-row"><h1>Settlement queue</h1><span class="live-pill"><span class="pulse"></span>Northstar only</span></div><p class="page-description">One settlement relationship requires a clear next action.</p></div><div class="header-actions"><button class="button button-primary" type="button" data-action="reset"><span class="button-icon">⟲</span>Reset walkthrough</button></div></section>
    <section class="queue-card single-queue-card" aria-labelledby="queue-title"><div class="section-heading"><div><div class="section-title-row"><h2 id="queue-title">Northstar Capital</h2><span class="record-count">Trading account · USDC</span></div><p>Current obligation and issued instruction are separate facts.</p></div><div class="queue-source"><span class="footer-dot"></span>Source data as of <strong>${s.asOf}</strong></div></div>
      <div class="queue-table-wrap"><table class="queue-table"><thead><tr><th>Relationship</th><th>Current obligation</th><th>Settlement instruction</th><th>Readiness</th><th>Source data as of</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody><tr><td><div class="client-cell"><span class="client-avatar">NC</span><span><span class="cell-title">Northstar Capital</span><span class="cell-subtitle">Atlas / Trading account · USDC</span></span></div></td><td class="amount-cell"><span class="amount ${projection.obligation < 0 ? 'negative' : projection.obligation === 0 ? 'zero' : 'positive'}">${formatAmount(projection.obligation)}</span><span class="subtle-label">${direction(projection.obligation)}</span></td><td class="payment-cell">${instructionText}</td><td><span class="state-badge ${status.key === 'awaiting' ? 'blocked' : status.key === 'settled' ? 'confirmed' : status.key === 'residual' ? 'ready' : status.key === 'replay' ? 'ready' : status.key === 'blocked' ? 'blocked' : 'ready'}"><span class="badge-dot"></span>${status.label}</span><span class="subtle-label">${status.copy}</span></td><td class="time-cell"><strong>${s.asOf.split(' · ')[0]}</strong>${s.asOf.split(' · ').slice(1).join(' · ')}</td><td><button class="row-action" type="button" data-action="open-row">${actionLabel}</button></td></tr></tbody></table></div>
      <div class="queue-footer"><span><span class="footer-dot"></span>Illustrative source records · not a live feed</span><button class="text-button" type="button" data-action="show-freshness">View source freshness <span>→</span></button></div>
    </section>
    <section class="queue-note-grid"><article class="principles-card"><div class="card-kicker"><span class="kicker-icon">✓</span>Next action</div><h2>${nextActionTitle(s, 'queue')}</h2><p>${nextActionCopy(s, 'queue')}</p><button class="button button-primary" type="button" data-action="presenter-action">${presenterActionLabel(s, 'queue')}</button></article><article class="attention-card"><div class="card-kicker"><span class="kicker-icon amber">i</span>Pilot boundary</div><h2>Manual custody execution</h2><p>Range creates a fixed, approved instruction. An authorized operator initiates and authorizes the transfer in the existing custody tool; Range later verifies matching observed records.</p><button class="text-button" type="button" data-action="show-pilot-note">Read pilot note <span>→</span></button></article></section>`;
}

function renderQueueView() { $('#main-content').innerHTML = renderQueue(); }

function nextActionTitle(s, view) {
  if (s.id === 's2' && !replayComplete(s)) return 'Replay the missed windows.';
  const instruction = activeInstruction(s);
  if (!instruction) return view === 'queue' ? 'Start with the Northstar case.' : 'Review the exact proposal.';
  if (instruction.status === 'Awaiting settlement') return s.observationAvailable ? 'Check the settlement record.' : s.checkResult === 'no-match' ? 'No match yet. Keep the instruction unresolved.' : 'Check available settlement evidence.';
  if (currentObligation(s) > 0) return 'Review the remaining obligation separately.';
  return 'Walkthrough complete.';
}
function nextActionCopy(s, view) {
  const instruction = activeInstruction(s);
  if (s.id === 's2' && !replayComplete(s)) return `Current projection: ${formatAmount(currentObligation(s))} owed. Use Next event to follow the two missed windows without creating instructions.`;
  if (!instruction) return view === 'queue' ? 'Open Northstar to inspect the proposal, evidence version, and controls.' : `The proposal is ${formatAmount(currentObligation(s))} in the Northstar → Atlas direction. Approval creates an instruction for external execution only.`;
  if (instruction.status === 'Awaiting settlement') return s.observationAvailable ? 'A simulated matching record is available. Check again to apply it once.' : s.checkResult === 'no-match' ? 'No matching settlement was observed. This does not establish whether the transfer was initiated.' : 'Last checked is separate from Source data as of. Checking again never retries or sends.';
  if (currentObligation(s) > 0) return `${formatAmount(currentObligation(s))} remains owed after the original instruction settled. It needs a new review and separate approval.`;
  return 'The matching settlement was observed and applied once. No instruction remains unresolved.';
}
function presenterActionLabel(s, view) {
  if (s.id === 's2' && !replayComplete(s)) return 'Next event';
  if (view === 'queue') return 'Open Northstar case';
  const instruction = activeInstruction(s);
  if (!instruction) return 'Review settlement';
  if (instruction.status === 'Awaiting settlement') return s.observationAvailable ? 'Check again' : s.checkResult === 'no-match' ? 'Simulate settlement record arriving' : 'Check again';
  return currentObligation(s) > 0 ? 'Residual remains' : 'Walkthrough complete';
}

function renderCase() {
  const s = state.scenario; const projection = projectScenario(s); const instruction = activeInstruction(s); const status = statusFor(s); const reviewAvailable = canReview(s);
  $('#main-content').innerHTML = `<div class="case-view"><a class="back-link" href="#queue" data-action="back-to-queue">← Back to settlement queue</a><div class="case-header"><div><div class="breadcrumbs"><a href="#queue" data-action="back-to-queue">Settlement queue</a><span>/</span><span>Northstar Capital</span></div><div class="case-heading"><span class="client-avatar">NC</span><div><h1>Northstar Capital</h1><p>Atlas / Trading account · USDC <span class="record-count">Case NS-014</span></p></div></div></div><div class="case-header-actions"><button class="button button-secondary" type="button" data-action="show-freshness">View source freshness</button>${reviewAvailable ? `<button class="button button-primary" type="button" data-action="open-review">${projection.obligation < 0 ? 'Review reverse settlement' : 'Review settlement'}</button>` : ''}</div></div><div class="case-question"><span class="question-mark">?</span><div><strong>${s.question}</strong><p>${nextActionCopy(s, 'case')}</p></div></div>${instruction?.status === 'Awaiting settlement' ? `<div class="case-alert"><span class="alert-icon">↗</span><div><strong>Instruction issued for external execution</strong><p>Range has not observed a matching settlement. This does not establish whether the transfer has been initiated. Do not create another overlapping instruction.</p></div></div>` : instruction?.status === 'Settled' ? `<div class="case-alert settled-alert"><span class="alert-icon">✓</span><div><strong>Matching settlement observed</strong><p>The original instruction was marked Settled from a matching account, asset, direction, amount, and reference observation. It was applied once.</p></div></div>` : ''}<div class="case-grid"><div class="case-column"><article class="detail-card position-card"><div class="position-top"><div><span class="position-label">Current obligation</span><div class="position-amount">${formatAmount(projection.obligation)}</div><span class="position-direction">${direction(projection.obligation)}</span></div><div class="position-asof">Source data as of<strong>${s.asOf}</strong></div></div><div class="position-breakdown"><div class="breakdown-cell"><span>Signed venue activity</span><strong>${projection.venueActivity < 0 ? '−' : ''}${formatAmount(projection.venueActivity)}</strong></div><div class="breakdown-cell"><span>Confirmed settlements</span><strong>${projection.confirmedSettlements ? formatAmount(projection.confirmedSettlements) : '0 USDC'}</strong></div></div></article>${renderInstructionCard(s, instruction, projection)}${renderHandoffCard(s, instruction)}${renderEventReplay(s)}${renderHistoryCard(s)}</div><div class="case-column">${renderChecksCard(s, instruction)}${renderEvidenceCard(s)}${s.id === 's3' && instruction?.status === 'Awaiting settlement' ? renderInvestigationCard(s) : renderGuidanceCard(s, instruction, projection)}</div></div></div>`;
}

function renderInstructionCard(s, instruction, projection) {
  if (!instruction) return `<article class="detail-card payment-card"><div class="detail-card-header"><h2>Settlement instruction</h2><span class="state-badge ready"><span class="badge-dot"></span>None issued</span></div><div class="payment-main"><p class="modal-note" style="margin:0">No instruction exists yet. Reviewing a proposal does not create an executable transfer; approval creates a fixed set of instructions for external custody execution.</p></div><div class="payment-note"><strong>Next step:</strong> inspect the exact proposal, controls, destination, and source data as of time.</div></article>`;
  const settled = instruction.status === 'Settled';
  return `<article class="detail-card payment-card"><div class="detail-card-header"><h2>Settlement instruction</h2><span class="state-badge ${settled ? 'confirmed' : 'blocked'}"><span class="badge-dot"></span>${settled ? 'Settled' : 'Awaiting settlement'}</span></div><div class="payment-main"><div class="payment-amount-line"><div><div class="payment-amount">${formatAmount(instruction.amount)}</div><div class="payment-direction">Northstar → Atlas · USDC</div></div><span class="unknown-banner" style="background:${settled ? '#e8f5eb;color:#2f6d57' : '#eaf3fa;color:#426a8e'}"><span></span>${settled ? 'Matching record observed' : 'Issued · not observed'}</span></div><div class="payment-meta"><div class="meta-item"><span>Issued</span><strong>${instruction.issuedAt}</strong></div><div class="meta-item"><span>Cutoff</span><strong>${instruction.cutoff}</strong></div><div class="meta-item"><span>Reference</span><strong>${instruction.id}</strong></div><div class="meta-item"><span>Destination</span><strong>${instruction.destination}</strong></div><div class="meta-item"><span>Last checked</span><strong>${s.lastChecked || 'Not checked yet'}</strong></div><div class="meta-item"><span>Source data as of</span><strong>${s.asOf}</strong></div></div>${s.checkResult === 'no-match' ? '<div class="check-result-banner no-match"><strong>No matching settlement observed.</strong> The instruction and current obligation are unchanged.</div>' : s.checkResult === 'matched' ? '<div class="check-result-banner matched"><strong>Matching settlement observed.</strong> The instruction is settled; check evidence below for the correlated record.</div>' : s.checkResult === 'unavailable' ? '<div class="check-result-banner no-match"><strong>Evidence check unavailable.</strong> The instruction and previous financial result are preserved. Try again or escalate.</div>' : ''}</div><div class="payment-note"><strong>Manual custody execution:</strong> execute this instruction in the existing custody tool, then use Check again to inspect available observations.</div><div class="instruction-actions"><button class="button button-secondary" type="button" data-action="copy-instruction">Copy instruction</button><button class="button button-primary" type="button" data-action="check-again">Check again</button></div></article>`;
}

function renderHandoffCard(s, instruction) {
  if (!instruction) return '';
  return `<article class="detail-card handoff-card"><div class="detail-card-header"><h2>Execute in your custody tool</h2><span class="illustrative">External handoff</span></div><div class="handoff-body"><p>Range created this approved instruction. An authorized operator initiates and authorizes the transfer in the existing custody workflow. This prototype does not connect to Fireblocks, Copper, or any custody provider.</p><div class="handoff-grid"><div><span>Instruction</span><strong>${instruction.id}</strong></div><div><span>Amount / direction</span><strong>${formatAmount(instruction.amount)} · Northstar → Atlas</strong></div><div><span>Source account</span><strong>${instruction.sourceAccount}</strong></div><div><span>Destination</span><strong>${instruction.destination}</strong></div></div><button class="text-button" type="button" data-action="copy-instruction">Copy these fields as plain text <span>→</span></button></div></article>`;
}

function renderChecksCard(s, instruction) {
  const settled = instruction?.status === 'Settled'; const awaiting = instruction?.status === 'Awaiting settlement';
  const rows = [
    ['✓', '', 'Reconciliation', 'Agreed venue position matches available source records', 'Pass', ''],
    ['✓', '', 'Settlement-fund availability', instruction ? 'Approved at proposal version; not a custody balance claim' : 'Sufficient illustrative balance for this proposal', instruction ? 'Recorded' : 'Pass', instruction ? 'neutral' : ''],
    [awaiting ? '!' : '✓', awaiting ? 'warn' : '', 'Settlement observation', awaiting ? 'No matching settlement record is available' : settled ? 'Matching movement is correlated to this instruction' : 'No issued instruction to observe', awaiting ? 'Review' : settled ? 'Pass' : 'Not applicable', awaiting ? 'warn' : settled ? '' : 'neutral'],
    [instruction ? '✓' : '✓', '', 'Overlap protection', instruction && awaiting ? 'Unresolved instruction blocks another issue' : 'No unresolved instruction blocks this proposal', instruction && awaiting ? 'Block active' : 'Pass', instruction && awaiting ? 'neutral' : '']
  ];
  return `<article class="detail-card"><div class="detail-card-header"><h2>Checks & evidence</h2><small>${instruction ? `Proposal ${instruction.proposalVersion.split(' · ')[0]}` : 'Current proposal'}</small></div><div class="check-list">${rows.map(row => `<div class="check-row"><span class="check-icon ${row[1]}">${row[0]}</span><div><strong>${row[2]}</strong><small>${row[3]}</small></div><span class="check-result ${row[5]} ${row[4] === 'Not applicable' ? 'neutral' : ''}">${row[4]}</span></div>`).join('')}</div></article>`;
}

function renderEvidenceCard(s) {
  const instruction = activeInstruction(s); const observation = s.observationAvailable ? 'A simulated matching settlement record is available to Check again.' : 'No matching settlement record is currently available.';
  return `<article class="detail-card evidence-card"><div class="detail-card-header"><h2>Source records</h2><small>Expandable · illustrative IDs</small></div><details class="evidence-item"><summary>Position reconciliation</summary><div class="evidence-content">Venue activity, account boundary, and confirmed settlement observations are reconciled for the current source snapshot.<span class="record-tag">sim://position-northstar-${s.id}</span><br>Source data as of ${s.asOf}</div></details><details class="evidence-item"><summary>Instruction correlation</summary><div class="evidence-content">${instruction ? `The issued reference is ${instruction.id}. ${observation} A balance change alone is not sufficient to mark this Settled.` : 'No instruction has been issued.'}<span class="record-tag">sim://proposal-${s.id}-${s.proposalVersion.split(' · ')[0]}</span></div></details><details class="evidence-item"><summary>Freshness & check history</summary><div class="evidence-content">Last checked: ${s.lastChecked || 'Not checked yet'}. Source data as of: ${s.asOf}. A check inspects the latest available snapshot; it does not claim a fresh upstream fetch or alter source timestamps.</div></details></article>`;
}

function renderInvestigationCard(s) {
  return `<article class="detail-card investigation-card"><div class="detail-card-header"><h2>Illustrative investigation</h2><span class="illustrative">Synthetic case</span></div><div class="investigation-body"><p class="investigation-lead">The available records show an issued 110,000 USDC instruction and 15,000 USDC of activity after its cutoff. No matching settlement is visible. This does not establish whether the transfer was initiated.</p><div class="investigation-section"><h3>Known facts</h3><ul class="fact-list"><li>110,000 USDC was issued at 13:24 UTC for external execution.</li><li>The current obligation is 125,000 USDC, including the issued amount.</li><li>No matching account, asset, direction, amount, and reference observation is available.</li></ul></div><div class="investigation-section"><h3>Missing evidence</h3><p>Settlement confirmation from the existing custody workflow and a correlated observed record.</p></div><div class="investigation-section"><h3>Recommended human follow-up</h3><p>Check the external custody workflow with an authorized operator. The illustrative agent cannot determine non-execution from absence of a record.</p></div><div class="escalation-row"><p><strong>Local handoff only:</strong> no email or external notification is sent.</p><button class="button button-secondary" type="button" data-action="escalate">${s.escalated ? 'Handoff recorded' : 'Escalate case'}</button></div></div></article>`;
}

function renderGuidanceCard(s, instruction, projection) {
  const settled = instruction?.status === 'Settled'; const residual = projection.obligation;
  return `<article class="detail-card investigation-card"><div class="detail-card-header"><h2>Operator guidance</h2><span class="illustrative">Prototype note</span></div><div class="investigation-body"><p class="investigation-lead">${settled ? 'The matching settlement was observed and applied once. The original instruction is no longer unresolved.' : instruction ? 'The issued amount is frozen while external execution remains unobserved. New activity changes the obligation, not the instruction.' : 'Review the exact amount and evidence before creating an instruction for external execution.'}</p><div class="investigation-section"><h3>Next action</h3><p>${nextActionCopy(s, 'case')}</p></div>${settled && residual > 0 ? `<div class="investigation-section"><h3>Residual obligation</h3><p>${formatAmount(residual)} remains owed. It requires a separate review and approval; no new instruction is issued automatically.</p></div>` : ''}${s.id === 's2' ? `<div class="investigation-section"><h3>Reversal acceptance case</h3><p>Submit 100,000 USDC, then apply 20,000 USDC of Northstar earnings. The instruction remains 100,000 while the economic obligation becomes 80,000; if it settles, Atlas owes Northstar 20,000. No automatic reverse instruction is created.</p></div>` : ''}</div></article>`;
}

function renderEventReplay(s) {
  const events = s.replaySteps ? [...s.replaySteps, ...(s.events || [])] : (s.events || []); const activeIndex = s.replaySteps ? s.replayIndex : events.length - 1; const projection = projectScenario(s);
  return `<article class="detail-card event-replay-card"><div class="detail-card-header"><div><h2>How this amount is calculated</h2><small>Opening ${formatAmount(s.opening)} + signed venue activity − confirmed settlements</small></div>${s.replaySteps ? `<div class="replay-controls"><span>Step ${Math.min(s.replayIndex + 1, s.replaySteps.length)} of ${s.replaySteps.length}</span><button class="button button-quiet" type="button" data-action="replay-next" ${replayComplete(s) ? 'disabled' : ''}>Next event →</button></div>` : '<span class="illustrative">Source projection</span>'}</div><details class="calculation-details" open><summary>Current obligation: ${formatAmount(projection.obligation)} · ${direction(projection.obligation)}</summary><div class="replay-list">${events.map((event, index) => `<div class="replay-event ${index <= activeIndex ? 'replay-event-active' : 'replay-event-future'}"><span class="replay-marker">${index <= activeIndex ? '✓' : index + 1}</span><div><strong>${event.title}</strong><small>${event.detail}</small></div><time>${event.time}</time></div>`).join('')}</div></details></article>`;
}

function renderHistoryCard(s) {
  const history = s.replaySteps ? [...s.replaySteps.slice(0, s.replayIndex + 1).map(event => [event.type === 'venue' ? 'activity' : 'review', event.title, event.detail, event.time]), ...(s.history || []).filter(event => ['issued', 'checked', 'settled', 'escalated'].includes(event[0]))] : (s.history || []);
  return `<article class="detail-card history-card" id="history"><div class="detail-card-header"><h2>Case history</h2><small>Chronological · no event undo</small></div><div class="history-list">${history.map(event => `<div class="history-item"><span class="history-dot ${event[0]}">${event[0] === 'issued' ? '↗' : event[0] === 'checked' ? '⌕' : event[0] === 'settled' ? '✓' : event[0] === 'activity' ? '+' : '·'}</span><div><div class="history-title">${event[1]}</div><div class="history-detail">${event[2]}</div></div><span class="history-time">${event[3]}</span></div>`).join('')}</div></article>`;
}

function openReview() {
  const s = state.scenario; if (!canReview(s)) { showToast('This proposal is not eligible for approval'); return; }
  state.reviewOpen = true; state.reviewSnapshot = { amount: currentObligation(s), proposalVersion: s.proposalVersion, sourceAsOf: s.asOf }; openModal(buildReviewModal()); renderPresenter();
}
function buildReviewModal() {
  const s = state.scenario; const amount = currentObligation(s); const snapshot = state.reviewSnapshot; const stale = s.stale || !snapshot || snapshot.amount !== amount || snapshot.proposalVersion !== s.proposalVersion;
  if (stale) return `<div class="modal-header"><div><h2 id="modal-title">Proposal needs refresh</h2><p>The evidence changed after this review was opened.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body"><div class="stale-box"><strong>Approval disabled</strong>This review was opened for ${formatAmount(snapshot?.amount || amount)}. The current obligation is ${formatAmount(amount)}. Refresh and inspect the changed evidence before approval.</div></div><div class="modal-footer"><button class="button button-secondary" type="button" data-action="close-modal">Close</button><button class="button button-primary" type="button" data-action="refresh-review">Refresh & review again</button></div>`;
  return `<div class="modal-header"><div><h2 id="modal-title">Review settlement</h2><p>Approve this exact proposal to create one fixed instruction for external custody execution.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body"><div class="review-amount"><span class="review-amount-label">Exact proposal</span><strong>${formatAmount(amount)}</strong><p>Northstar ${amount < 0 ? '→ Atlas' : 'owes Atlas'} · USDC</p></div><div class="review-grid"><div class="review-cell"><span>Source custody account</span><strong>${s.sourceAccount}</strong></div><div class="review-cell"><span>Destination settlement account</span><strong>${s.destination} · sim://acct-atlas-01</strong></div><div class="review-cell"><span>Cutoff / source data</span><strong>${s.cutoff} · ${s.asOf}</strong></div><div class="review-cell"><span>Proposal / evidence</span><strong>${s.proposalVersion}</strong></div></div><div class="version-bar"><span class="version-icon">✓</span><span><strong>Checks available for this version.</strong> Reconciliation, fund availability, and overlap protection are shown in the case.</span></div><p class="modal-note">Approve & create instruction records the exact amount, direction, accounts, cutoff, and evidence version. Execution happens separately in the existing custody tool; this prototype makes no financial API call.</p></div><div class="modal-footer"><button class="button button-secondary" type="button" data-action="close-modal">Keep reviewing</button><button class="button button-primary" type="button" data-action="submit-mock">Approve & create instruction</button></div>`;
}

function submitMock() {
  const s = state.scenario; const amount = currentObligation(s);
  if (!canReview(s) || !state.reviewSnapshot || state.reviewSnapshot.amount !== amount || state.reviewSnapshot.proposalVersion !== s.proposalVersion) { openModal(buildReviewModal()); return; }
  const instruction = { id: `sim-instruction-${Date.now().toString().slice(-6)}`, amount, status: 'Awaiting settlement', issuedAt: s.asOf, cutoff: s.cutoff, proposalVersion: s.proposalVersion, sourceAccount: s.sourceAccount, destination: `${s.destination} · sim://acct-atlas-01` };
  s.instructions.push(instruction); s.history.unshift(['issued', 'Instruction issued for external execution', `${formatAmount(amount)} · reference ${instruction.id}`, nowLabel()]);
  closeModal(); state.view = 'case'; render(); showToast('Instruction created · execute it in your custody tool');
}

function checkAgain() {
  const s = state.scenario; const instruction = activeInstruction(s);
  if (!instruction) { showToast('No issued instruction to check'); return; }
  s.lastChecked = nowLabel();
  if (s.sourceUnavailable) { s.checkResult = 'unavailable'; s.history.unshift(['checked', 'Settlement evidence check unavailable', 'Previous financial result preserved', nowLabel()]); render(); showToast('Check unavailable · instruction and balance preserved'); return; }
  if (instruction.status === 'Settled') { s.checkResult = 'matched'; render(); showToast('Same settlement observation checked · no duplicate event'); return; }
  if (s.observationAvailable) {
    const alreadyRecorded = s.events.some(event => event.type === 'settlement' && event.instructionId === instruction.id);
    if (!alreadyRecorded) s.events.push({ id: `observed-${instruction.id}`, type: 'settlement', signed: instruction.amount, instructionId: instruction.id, title: 'Matching settlement observed', detail: `${formatAmount(instruction.amount)} · correlated to ${instruction.id}`, time: nowLabel() });
    instruction.status = 'Settled'; s.checkResult = 'matched'; s.history.unshift(['settled', 'Matching settlement observed', `${formatAmount(instruction.amount)} applied once`, nowLabel()]);
    render(); showToast('Matching settlement observed · applied once');
  } else {
    s.checkResult = 'no-match'; s.history.unshift(['checked', 'Settlement evidence checked', 'No matching settlement observed · instruction unchanged', nowLabel()]); render(); showToast('No matching settlement observed · nothing changed');
  }
}
function simulateObservation() { const s = state.scenario; if (!activeInstruction(s) || activeInstruction(s).status === 'Settled') return; s.observationAvailable = true; renderPresenter(); showToast('Presenter event: simulated settlement record arriving'); }
function copyInstruction() {
  const instruction = activeInstruction(state.scenario); if (!instruction) return;
  const text = `Illustrative instruction ${instruction.id}\nAmount: ${formatAmount(instruction.amount)}\nDirection: Northstar → Atlas\nSource: ${instruction.sourceAccount}\nDestination: ${instruction.destination}\nCutoff: ${instruction.cutoff}\nIssued: ${instruction.issuedAt}`;
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
  showToast('Instruction copied as plain text · illustrative identifiers');
}
function simulateUnavailable() { state.scenario.sourceUnavailable = true; state.scenario.checkResult = 'unavailable'; state.scenario.lastChecked = nowLabel(); state.scenario.history.unshift(['checked', 'Settlement evidence check unavailable', 'Previous financial result preserved', nowLabel()]); render(); showToast('Check unavailable · instruction and balance preserved'); }
function escalate() { state.scenario.escalated = true; state.scenario.history.unshift(['escalated', 'Illustrative handoff recorded', 'Settlement Operations · local prototype only', nowLabel()]); render(); showToast('Local handoff recorded · no external notification sent'); }
function refreshReview() { const s = state.scenario; s.stale = false; s.proposalVersion = `${s.proposalVersion.split(' · ')[0]} · just now`; state.reviewSnapshot = { amount: currentObligation(s), proposalVersion: s.proposalVersion, sourceAsOf: s.asOf }; openModal(buildReviewModal()); }
function showFreshness() { openModal(`<div class="modal-header"><div><h2 id="modal-title">Source freshness</h2><p>Latest available synthetic records for this prototype.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body"><div class="review-grid"><div class="review-cell"><span>Source data as of</span><strong>${state.scenario.asOf}</strong></div><div class="review-cell"><span>Last checked</span><strong>${state.scenario.lastChecked || 'Not checked yet'}</strong></div><div class="review-cell"><span>Source mode</span><strong>Latest available snapshot</strong></div><div class="review-cell"><span>Upstream fetch</span><strong>Not simulated</strong></div></div><div class="version-bar"><span class="version-icon">i</span><span>A Check again inspects available observations. It does not claim a fresh upstream fetch or change Source data as of.</span></div></div><div class="modal-footer"><button class="button button-secondary" type="button" data-action="simulate-unavailable">Simulate unavailable check</button><button class="button button-primary" type="button" data-action="close-modal">Done</button></div>`); }
function showPilotNote() { openModal(`<div class="modal-header"><div><h2 id="modal-title">Pilot boundary</h2><p>Manual custody execution is an explicit trade-off for this prototype.</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body"><p class="modal-note" style="margin:0">Range calculates, reconciles, checks, obtains Atlas approval, and creates a fixed instruction for external use. An authorized operator initiates and authorizes the transfer in Fireblocks, Copper, or the applicable existing tool. The exact actor, permissions, and reference propagation need validation with the Range team.</p></div><div class="modal-footer"><button class="button button-primary" type="button" data-action="close-modal">Done</button></div>`); }
function showToast(message) { $('#toast-copy').textContent = message; $('#toast').classList.add('visible'); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200); }
function openModal(html) { state.modalReturnFocus = document.activeElement; $('#modal').innerHTML = html; $('#modal-backdrop').hidden = false; $('#modal').hidden = false; setTimeout(() => $('.modal-close')?.focus(), 0); }
function closeModal() { $('#modal-backdrop').hidden = true; $('#modal').hidden = true; $('#modal').innerHTML = ''; state.reviewOpen = false; state.reviewSnapshot = null; if (state.modalReturnFocus?.focus) state.modalReturnFocus.focus(); state.modalReturnFocus = null; }
function renderPresenter() {
  const s = state.scenario; const instruction = activeInstruction(s); const step = s.id === 's2' ? Math.min(s.replayIndex + 1, 7) : !instruction ? (state.view === 'queue' ? 1 : 2) : instruction.status === 'Settled' ? (currentObligation(s) > 0 ? 5 : 6) : s.checkResult === 'no-match' ? 4 : s.observationAvailable ? 5 : 3; const total = s.id === 's2' ? 7 : s.id === 's3' ? 5 : 6; const action = $('#presenter-action'); const label = presenterActionLabel(s, state.view); const irrelevant = label === 'Walkthrough complete' || label === 'Residual remains';
  $$('.scenario-button').forEach(button => button.classList.toggle('active', button.dataset.scenario === state.scenarioId)); $('#presenter-step').textContent = `Step ${step} of ${total}`; $('#presenter-summary').textContent = `${s.label} · Step ${step} of ${total}`; $('#presenter-question').textContent = s.question; $('#presenter-state').textContent = statusFor(s).label; action.textContent = label; action.hidden = irrelevant; action.disabled = irrelevant; $('#header-as-of').textContent = s.asOf;
}
function render() { if (state.view === 'case') renderCase(); else renderQueueView(); renderPresenter(); }
function navigate(view) { state.view = view; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function handlePresenterAction() { const s = state.scenario; if (s.id === 's2' && !replayComplete(s)) { s.replayIndex += 1; render(); showToast(`${s.replaySteps[s.replayIndex].title} · ${formatAmount(currentObligation(s))} obligation`); return; } if (state.view === 'queue') { navigate('case'); return; } const instruction = activeInstruction(s); if (!instruction) { openReview(); return; } if (instruction.status === 'Awaiting settlement') { if (s.observationAvailable) checkAgain(); else if (s.checkResult === 'no-match') simulateObservation(); else checkAgain(); } }

document.addEventListener('click', event => {
  const nav = event.target.closest('[data-nav]'); if (nav) { event.preventDefault(); navigate(nav.dataset.nav === 'queue' ? 'queue' : 'case'); if (nav.dataset.nav === 'history') setTimeout(() => $('#history')?.scrollIntoView({ behavior: 'smooth' }), 60); return; }
  const scenarioButton = event.target.closest('[data-scenario]'); if (scenarioButton) { resetScenario(scenarioButton.dataset.scenario); showToast(`${state.scenario.label} · ${state.scenario.name}`); return; }
  const action = event.target.closest('[data-action]'); if (!action) return; event.preventDefault();
  switch (action.dataset.action) { case 'reset': resetScenario(); showToast(`${state.scenario.label} walkthrough reset`); break; case 'open-row': navigate('case'); break; case 'open-primary': navigate('case'); break; case 'back-to-queue': navigate('queue'); break; case 'presenter-action': handlePresenterAction(); break; case 'open-review': openReview(); break; case 'submit-mock': submitMock(); break; case 'close-modal': closeModal(); break; case 'refresh-review': refreshReview(); break; case 'check-again': checkAgain(); break; case 'simulate-observation': simulateObservation(); break; case 'copy-instruction': copyInstruction(); break; case 'show-freshness': showFreshness(); break; case 'show-pilot-note': showPilotNote(); break; case 'simulate-unavailable': simulateUnavailable(); break; case 'escalate': escalate(); break; case 'replay-next': if (state.scenario.replaySteps && !replayComplete(state.scenario)) { state.scenario.replayIndex += 1; render(); } break; }
});
document.addEventListener('keydown', event => { if ($('#modal').hidden) return; if (event.key === 'Escape') { closeModal(); return; } if (event.key !== 'Tab') return; const focusable = $$('button, input, [href], summary', $('#modal')).filter(element => !element.disabled); if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } });
$('#modal-backdrop').addEventListener('click', closeModal);
render();
