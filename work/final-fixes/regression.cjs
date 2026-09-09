const fs = require('fs');
const vm = require('vm');

const appSource = fs.readFileSync('/Users/dearkane/Documents/dev/range/task/app.js', 'utf8');
const executable = appSource.split("document.addEventListener('click'")[0];
vm.runInNewContext(executable + `
render = () => {}; renderPresenter = () => {}; showToast = () => {}; closeModal = () => {}; openModal = () => {};
const check = (value, message) => { if (!value) throw Error(message); };

state.scenario = clone(SCENARIOS.s1); state.view = 'case';
check(currentAmount(state.scenario) === 100000, 'S1 opening amount');
check(statusFor(state.scenario).label === 'Ready to settle', 'S1 readiness');
state.scenario.handoffReviewed = true;
checkAgain(); check(currentAmount(state.scenario) === 100000, 'S1 no evidence preserves amount');
check(statusFor(state.scenario).label === 'Needs attention', 'S1 missing evidence needs attention');
simulateObservation(); checkAgain();
check(currentAmount(state.scenario) === 0, 'S1 observed settlement clears amount');
checkAgain(); check(currentAmount(state.scenario) === 0, 'S1 repeat check is idempotent');

state.scenario = clone(SCENARIOS.s2);
for (const [index, amount] of [100000, 100000, 80000, 80000, 110000, 110000].entries()) {
  state.scenario.replayIndex = index;
  check(currentAmount(state.scenario) === amount, 'S2 replay ' + index);
}
check(statusFor(state.scenario).label === 'Ready to settle', 'S2 final readiness');

state.scenario = clone(SCENARIOS.s3);
check(currentAmount(state.scenario) === 125000, 'S3 opening amount');
check(statusFor(state.scenario).label === 'Needs attention', 'S3 missing evidence needs attention');
simulateObservation(); checkAgain();
check(currentAmount(state.scenario) === 15000, 'S3 observed 110k leaves 15k');
check(statusFor(state.scenario).label === 'Ready to settle', 'S3 residual is a current amount');
checkAgain(); check(currentAmount(state.scenario) === 15000, 'S3 repeat check is idempotent');

state.scenario = clone(SCENARIOS.s4);
check(currentAmount(state.scenario) === 110000, 'M1 validated amount');
check(statusFor(state.scenario).label === 'Needs attention', 'M1 position mismatch needs attention');
check(nextActionCopy(state.scenario, 'case').includes('07 Sep 2026 · 12:00 UTC'), 'M1 keeps validated timestamp');
check(nextActionCopy(state.scenario, 'case').includes('07 Sep 2026 · 13:00 UTC'), 'M1 shows discrepancy timestamp');
state.scenario.correctedSnapshot = true; checkAgain();
check(state.scenario.positionMismatch === false, 'M1 corrected snapshot clears mismatch');
check(currentAmount(state.scenario) === 110000, 'M1 corrected snapshot preserves amount');

check(!${JSON.stringify(appSource)}.includes('sim-instruction'), 'no Range instruction model');
check(!${JSON.stringify(appSource)}.includes('Overlap protection'), 'no duplicate-transfer control claim');
console.log('PASS: S1-S3 amounts, readiness, observed settlement, repeat-check idempotency, and M1 mismatch correction');
`, { Intl, console, setTimeout, clearTimeout });
