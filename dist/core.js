export const DAY = 86400000;
export const DEFAULTS = { tuition: 93000, start: '2026-09-07', end: '2027-06-11' };
export function chinaDate(date) { return Date.parse(date + 'T00:00:00+08:00'); }
export function dateKey(time) { return new Date(time + 8 * 3600000).toISOString().slice(0, 10); }
export function validSettings(value) {
  return Boolean(value && Number.isFinite(value.tuition) && value.tuition >= 0 && value.tuition <= 10000000 && /^\d{4}-\d{2}-\d{2}$/.test(value.start) && /^\d{4}-\d{2}-\d{2}$/.test(value.end) && Number.isFinite(chinaDate(value.start)) && Number.isFinite(chinaDate(value.end)) && dateKey(chinaDate(value.start)) === value.start && dateKey(chinaDate(value.end)) === value.end && value.start >= '2026-08-31' && value.end <= '2027-09-05' && chinaDate(value.end) >= chinaDate(value.start) && schoolDays(value).length > 0);
}
export function annual(settings, now = Date.now()) {
  const start = chinaDate(settings.start), end = chinaDate(settings.end) + DAY;
  const days = schoolDays(settings), duration = days.length * DAY;
  const elapsed = days.reduce((sum, day) => sum + Math.min(DAY, Math.max(0, now - day)), 0);
  const spent = settings.tuition * elapsed / duration;
  const active = days.some(day => now >= day && now < day + DAY), nextDay = days.find(day => day > now);
  return { start, end, duration, elapsed, spent, remaining: Math.max(0, settings.tuition - spent), progress: elapsed / duration, rate: settings.tuition / (duration / 1000), daysLeft: days.filter(day => day + DAY > now).length, totalDays: days.length, active, nextDay, firstDay: days[0], lastDayEnd: days.at(-1) + DAY };
}
export function freshTimer(mode = 'focus', minutes = 25) { return { mode, duration: minutes * 60000, elapsed: 0, startedAt: null, firstStartedAt: null, rate: null, task: '', id: null }; }
export function timerElapsed(timer, now = Date.now()) {
  const ms = Math.max(0, timer.elapsed + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt)));
  return timer.mode === 'focus' ? Math.min(timer.duration, ms) : ms;
}
export function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(seconds / 3600), m = Math.floor(seconds / 60) % 60, s = seconds % 60;
  return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
export const PERIODS = [
  ['2026-08-31', '注册与迎新', 'induction'], ['2026-09-07', '第一学期 · 教学周', 'teaching'],
  ['2026-09-28', '国庆假期与学校关闭日', 'holiday'], ['2026-10-05', '第一学期 · 教学周', 'teaching'],
  ['2026-12-14', '第一学期 · 复习周', 'reading'], ['2026-12-28', '第一学期 · 考试周', 'exam'],
  ['2027-01-11', '冬季学校', 'school'], ['2027-02-01', '春节假期与学校关闭日', 'holiday'],
  ['2027-02-15', '注册与迎新', 'induction'], ['2027-02-22', '第二学期 · 教学周', 'teaching'],
  ['2027-05-24', '第二学期 · 复习周', 'reading'], ['2027-05-31', '第二学期 · 考试周', 'exam'],
  ['2027-06-14', '夏季学校', 'school'], ['2027-07-19', '补考复习周', 'reading'],
  ['2027-08-02', '补考周', 'exam'], ['2027-08-09', '夏季学校', 'school'], ['2027-09-06', '校历覆盖结束', 'outside']
];
export function academicPeriod(now) {
  if (now < chinaDate(PERIODS[0][0]) || now >= chinaDate(PERIODS.at(-1)[0])) return { label: '校历范围之外', kind: 'outside', week: null };
  const i = PERIODS.findLastIndex(p => chinaDate(p[0]) <= now);
  const [date, label, kind] = PERIODS[i];
  const term2 = now >= chinaDate('2027-02-22');
  const base = term2 ? chinaDate('2027-02-22') : chinaDate('2026-09-07');
  const week = kind === 'teaching' ? Math.floor((now - base) / DAY / 7) + 1 - (!term2 && now >= chinaDate('2026-10-05') ? 1 : 0) : null;
  return { date, label, kind, week };
}
// Exact red/purple non-weekend exceptions within teaching, reading, and exam phases.
// Other holidays/closures are already inside excluded semester-break phases.
export const EXCLUDED_DATES = new Map([
  ['2026-09-25', '中秋节'], ['2026-12-24', '学校关闭日'], ['2026-12-25', '圣诞节 / 学校关闭日'],
  ['2027-01-01', '元旦'], ['2027-04-05', '清明节'], ['2027-05-03', '学校关闭日'],
  ['2027-05-04', '学校关闭日'], ['2027-06-09', '端午节']
]);
export function schoolDay(date) {
  const time = chinaDate(date), p = academicPeriod(time), weekday = new Date(time + 8 * 3600000).getUTCDay();
  if (EXCLUDED_DATES.has(date)) return { active: false, kind: 'holiday', label: EXCLUDED_DATES.get(date) };
  if (weekday === 0 || weekday === 6) return { active: false, kind: 'weekend', label: '周末 · 不计费' };
  return { ...p, active: ['teaching', 'reading', 'exam'].includes(p.kind) };
}
const schoolDayCache = new Map();
export function schoolDays(settings) {
  const key = settings.start + '|' + settings.end;
  if (schoolDayCache.has(key)) return schoolDayCache.get(key);
  const days = [], end = chinaDate(settings.end);
  for (let time = chinaDate(settings.start); time <= end; time += DAY) if (schoolDay(dateKey(time)).active) days.push(time);
  if (schoolDayCache.size > 100) schoolDayCache.clear();
  schoolDayCache.set(key, days); return days;
}
export function schoolOverlap(intervals, settings) {
  const days = schoolDays(settings);
  return intervals.reduce((sum, interval) => {
    if (!Array.isArray(interval) || interval.length !== 2 || !interval.every(Number.isFinite)) return sum;
    return sum + days.reduce((value, day) => value + Math.max(0, Math.min(day + DAY, interval[1]) - Math.max(day, interval[0])), 0);
  }, 0);
}
