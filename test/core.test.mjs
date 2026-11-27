import test from 'node:test';
import assert from 'node:assert/strict';
import { annual, schoolDays, schoolDay, schoolOverlap, chinaDate, DEFAULTS, DAY, timerElapsed, freshTimer, academicPeriod, dateKey, validSettings, formatTime } from '../dist/core.js';
test('annual tuition uses 157 campus weekdays, from teaching start to final exam', () => {
  const start = chinaDate(DEFAULTS.start), end = chinaDate(DEFAULTS.end) + DAY;
  assert.equal(schoolDays(DEFAULTS).length, 157);
  assert.equal(schoolDays({ ...DEFAULTS, end: '2027-01-08' }).length, 81);
  assert.equal(schoolDays({ ...DEFAULTS, start: '2027-02-22' }).length, 76);
  assert.equal(annual(DEFAULTS).duration, 157 * DAY);
  assert.equal(annual(DEFAULTS, start - 1).spent, 0);
  assert.equal(annual(DEFAULTS, start - 1).remaining, 93000);
  assert.equal(annual(DEFAULTS, start).active, true);
  assert.equal(annual(DEFAULTS, end).remaining, 0);
  assert.equal(annual(DEFAULTS, end + DAY).spent, 93000);
  assert.equal(annual(DEFAULTS, end).daysLeft, 0);
});
test('per second rate and live balance reconcile without rounding accumulation', () => {
  const start = chinaDate(DEFAULTS.start), before = annual(DEFAULTS, start + DAY), after = annual(DEFAULTS, start + DAY + 1000);
  assert.ok(Math.abs(before.remaining - after.remaining - before.rate) < 1e-10);
  assert.ok(Math.abs(after.remaining + after.spent - DEFAULTS.tuition) < 1e-10);
});
test('holidays, weekends, induction, and winter/summer schools do not charge', () => {
  for (const date of ['2026-08-31', '2026-09-12', '2026-09-25', '2026-09-28', '2026-10-02', '2026-12-24', '2026-12-25', '2027-01-01', '2027-01-11', '2027-02-05', '2027-02-15', '2027-04-05', '2027-05-03', '2027-05-04', '2027-06-09', '2027-06-14']) {
    assert.equal(schoolDay(date).active, false, date);
    const a = annual(DEFAULTS, chinaDate(date));
    const b = annual(DEFAULTS, chinaDate(date) + DAY - 1);
    assert.equal(a.spent, b.spent, date + ' must stay frozen');
  }
  assert.equal(schoolDay('2027-04-21').active, true, 'graduation does not suspend teaching');
  assert.equal(schoolDay('2027-01-08').active, true, 'final day included');
});
test('campus overlap splits sessions over weekends, midnights, and holidays', () => {
  const friday = chinaDate('2026-11-27');
  assert.equal(schoolOverlap([[friday + 23 * 3600000, friday + 3 * DAY + 3600000]], DEFAULTS), 2 * 3600000);
  const beforeChristmas = chinaDate('2026-12-23');
  assert.equal(schoolOverlap([[beforeChristmas, chinaDate('2026-12-28') + 3600000]], DEFAULTS), DAY + 3600000);
  assert.equal(schoolOverlap([[chinaDate('2026-09-05'), chinaDate('2026-09-08')]], DEFAULTS), DAY);
  assert.equal(schoolOverlap([[chinaDate('2027-06-11'), chinaDate('2027-06-15')]], DEFAULTS), DAY);
});
test('zero tuition, custom inclusive day, and optional resit extension are supported', () => {
  assert.equal(annual({ ...DEFAULTS, tuition: 0 }).spent, 0);
  assert.equal(annual({ tuition: 100, start: '2026-11-25', end: '2026-11-25' }).duration, DAY);
  assert.equal(schoolDays({ ...DEFAULTS, end: '2027-08-06' }).length, 172);
  const fridayEnd = chinaDate('2026-11-28');
  assert.equal(annual(DEFAULTS, fridayEnd).spent, annual(DEFAULTS, fridayEnd + 2 * DAY).spent);
  assert.equal(annual(DEFAULTS, fridayEnd).nextDay, fridayEnd + 2 * DAY);
});
test('pause excludes inactive time, countdown caps background completion, stopwatch continues', () => {
  const t = { ...freshTimer(), elapsed: 30000, startedAt: 100000 };
  assert.equal(timerElapsed(t, 110000), 40000);
  assert.equal(timerElapsed({ ...t, startedAt: null }, 110000), 30000);
  assert.equal(timerElapsed(t, 10000000), 1500000);
  assert.equal(timerElapsed({ ...t, mode: 'stopwatch' }, 10000000), 9930000);
  assert.equal(timerElapsed(t, 90000), 30000);
});
test('calendar teaching weeks handle National Day interruption and semester boundary', () => {
  assert.equal(academicPeriod(chinaDate('2026-11-25')).week, 11);
  assert.equal(academicPeriod(chinaDate('2026-09-28')).kind, 'holiday');
  assert.equal(academicPeriod(chinaDate('2026-10-05')).week, 4);
  assert.equal(academicPeriod(chinaDate('2026-12-14')).kind, 'reading');
  assert.equal(academicPeriod(chinaDate('2027-02-22')).week, 1);
  assert.equal(academicPeriod(chinaDate('2027-05-17')).week, 13);
  assert.equal(academicPeriod(chinaDate('2027-09-06')).kind, 'outside');
});
test('China day rollover, settings constraints and timer labels', () => {
  assert.equal(dateKey(Date.parse('2026-11-25T16:00:00Z')), '2026-11-26');
  assert.equal(validSettings(DEFAULTS), true);
  assert.equal(validSettings({ ...DEFAULTS, end: '2026-08-01' }), false);
  assert.equal(validSettings({ ...DEFAULTS, tuition: Infinity }), false);
  assert.equal(validSettings({ ...DEFAULTS, start: '2026-02-30' }), false);
  assert.equal(validSettings({ ...DEFAULTS, start: '2026-11-28', end: '2026-11-29' }), false);
  assert.equal(validSettings({ ...DEFAULTS, end: '2028-01-01' }), false);
  assert.equal(formatTime(1500000), '25:00');
  assert.equal(formatTime(3600000), '01:00:00');
});
