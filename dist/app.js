import {
  DAY,
  DEFAULTS,
  EXCLUDED_DATES,
  annual,
  academicPeriod,
  schoolDay,
  schoolOverlap,
  PERIODS,
  chinaDate,
  dateKey,
  freshTimer,
  timerElapsed,
  formatTime,
  validSettings,
} from "./core.js";
import { updateCassette } from "./cassette.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const KEY = "study-worth-campus-v2";
let storageWarned = false,
  toastTimeout,
  lastSecond = -1;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => ($("#toast").hidden = true), 4000);
}
function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    const timer = saved?.timer;
    const validTimer =
      timer &&
      ["focus", "stopwatch"].includes(timer.mode) &&
      Number.isFinite(timer.duration) &&
      timer.duration >= 60000 &&
      timer.duration <= 480 * 60000 &&
      Number.isFinite(timer.elapsed) &&
      timer.elapsed >= 0 &&
      (timer.startedAt === null || Number.isFinite(timer.startedAt)) &&
      Array.isArray(timer.intervals) &&
      (timer.rate === null ||
        (Number.isFinite(timer.rate) && timer.rate >= 0)) &&
      (timer.firstStartedAt === null || validSettings(timer.billingSettings));
    return {
      settings: validSettings(saved?.settings)
        ? saved.settings
        : { ...DEFAULTS },
      timer: validTimer ? timer : { ...freshTimer(), intervals: [] },
      records: Array.isArray(saved?.records)
        ? saved.records
            .filter(
              (r) =>
                r &&
                Number.isFinite(r.ms) &&
                r.ms > 0 &&
                Number.isFinite(r.cost) &&
                r.cost >= 0 &&
                Number.isFinite(r.end) &&
                typeof r.task === "string" &&
                typeof r.id === "string" &&
                Array.isArray(r.intervals) &&
                validSettings(r.billingSettings),
            )
            .slice(0, 5000)
        : [],
    };
  } catch {
    return {
      settings: { ...DEFAULTS },
      timer: { ...freshTimer(), intervals: [] },
      records: [],
    };
  }
}
let state = readState();
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    if (!storageWarned) {
      toast("浏览器无法保存数据，本次设置和记录只在当前页面保留。");
      storageWarned = true;
    }
  }
}
const money = (value, digits = 2) =>
  "¥" +
  value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const dateLabel = (value) => value.replaceAll("-", ".");
function resetTimer(
  mode = state.timer.mode,
  minutes = state.timer.duration / 60000,
) {
  const task = $("#task-name").value;
  state.timer = { ...freshTimer(mode, minutes), task, intervals: [] };
  persist();
  syncControls();
  tick();
}
function syncControls() {
  const t = state.timer,
    active = t.startedAt !== null || t.elapsed > 0;
  $$(".mode-tabs button").forEach((b) => {
    b.classList.toggle("selected", b.dataset.mode === t.mode);
    b.disabled = active;
    b.setAttribute("aria-pressed", String(b.dataset.mode === t.mode));
  });
  $$(".duration-options button").forEach((button) => {
    const minutes = t.duration / 60000;
    const selected =
      t.mode === "focus" &&
      (button.dataset.minutes
        ? +button.dataset.minutes === minutes
        : ![25, 50].includes(minutes));
    button.disabled = active;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $("#custom-duration").textContent = [25, 50].includes(t.duration / 60000)
    ? "自定义"
    : `${t.duration / 60000} 分钟`;
  $("#duration-options").hidden = t.mode !== "focus";
  $("#task-name").value = t.task || "";
  $("#task-name").disabled = active;
  $("#start-label").textContent =
    t.startedAt !== null ? "暂停计时" : t.elapsed > 0 ? "继续专注" : "开始专注";
  updateCassette(t);
  $("#finish-timer").disabled = !active;
  $(".focus-card").classList.toggle("is-running", t.startedAt !== null);
}
function pause(now = Date.now()) {
  const t = state.timer;
  if (t.startedAt === null) return;
  const elapsed = timerElapsed(t, now),
    interval = Math.max(0, elapsed - t.elapsed);
  if (interval > 0) t.intervals.push([t.startedAt, t.startedAt + interval]);
  t.elapsed = elapsed;
  t.startedAt = null;
}
function finish(automatic = false, now = Date.now()) {
  pause(now);
  const t = state.timer;
  if (t.elapsed > 0) {
    const end = t.intervals.at(-1)?.[1] || now;
    const record = {
      id: t.id,
      task: t.task || "未命名专注",
      mode: t.mode,
      ms: t.elapsed,
      start: t.firstStartedAt,
      end,
      cost: (schoolOverlap(t.intervals, t.billingSettings) / 1000) * t.rate,
      rate: t.rate,
      billingSettings: t.billingSettings,
      intervals: t.intervals,
    };
    if (!state.records.some((r) => r.id === record.id))
      state.records.unshift(record);
    state.records = state.records.slice(0, 5000);
  }
  resetTimer();
  renderRecords();
  toast(automatic ? "计时结束，本次专注已保存。" : "本次专注已保存。");
}
$("#start-timer").addEventListener("click", () => {
  if (state.timer.startedAt !== null) pause();
  else {
    const now = Date.now(),
      t = state.timer;
    if (t.firstStartedAt === null) {
      t.firstStartedAt = now;
      t.billingSettings = { ...state.settings };
      t.rate = annual(state.settings, now).rate;
      t.task = $("#task-name").value.trim();
      t.id = crypto.randomUUID();
    }
    t.startedAt = now;
  }
  persist();
  syncControls();
  tick();
});
$("#task-name").addEventListener("input", (e) => {
  state.timer.task = e.target.value;
  updateCassette(state.timer);
  persist();
});
$("#finish-timer").addEventListener("click", () => finish());
$("#reset-timer").addEventListener("click", () => {
  if (timerElapsed(state.timer) > 0) $("#reset-dialog").showModal();
  else resetTimer();
});
$("#confirm-reset").addEventListener("click", () => {
  $("#reset-dialog").close();
  resetTimer();
  toast("计时已重置。");
});
$$("[data-mode]").forEach((b) =>
  b.addEventListener("click", () => resetTimer(b.dataset.mode)),
);
$$("[data-minutes]").forEach((b) =>
  b.addEventListener("click", () => resetTimer("focus", +b.dataset.minutes)),
);
$("#custom-duration").addEventListener("click", () =>
  $("#duration-dialog").showModal(),
);
$("#duration-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!e.target.reportValidity()) return;
  resetTimer("focus", +$("#custom-minutes").value);
  $("#duration-dialog").close();
});
$$(".dialog-close").forEach((b) =>
  b.addEventListener("click", () => b.closest("dialog").close()),
);
$$("dialog").forEach((dialog) =>
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  }),
);
$$(".settings-open").forEach((b) =>
  b.addEventListener("click", () => {
    const option = state.settings.tuitionOption === "custom" ? "custom" : [93000, 99000].includes(state.settings.tuition) ? String(state.settings.tuition) : "custom";
    $$("[name=tuition-option]").forEach(input => input.checked = input.value === option);
    $("#tuition-input").value = state.settings.tuition;
    $("#start-input").value = state.settings.start;
    $("#end-input").value = state.settings.end;
    $("#settings-error").textContent = "";
    syncTuitionChoice();
    $("#settings-dialog").showModal();
  }),
);
function selectedTuition() {
  const option = $("[name=tuition-option]:checked")?.value;
  return option === "custom" ? ($("#tuition-input").value === "" ? NaN : Number($("#tuition-input").value)) : Number(option);
}
function syncTuitionChoice() {
  const custom = $("[name=tuition-option]:checked")?.value === "custom";
  $("#custom-tuition-field").hidden = !custom;
  $("#tuition-input").disabled = !custom;
  $("#tuition-input").required = custom;
  renderSettingsSummary();
}
function renderSettingsSummary() {
  const settings = {
    tuition: selectedTuition(),
    start: $("#start-input").value,
    end: $("#end-input").value,
  };
  $("#settings-summary").textContent = validSettings(settings)
    ? (() => {
        const a = annual(settings);
        return `共 ${a.totalDays} 个在校日 · ${money(a.rate * 86400)} / 日 · ${money(a.rate, 6)} / 秒`;
      })()
    : "请选择至少包含一个在校日的有效日期范围。";
}
$$("[name=tuition-option]").forEach(input => input.addEventListener("change", syncTuitionChoice));
$$("#settings-form input").forEach((input) =>
  input.addEventListener("input", renderSettingsSummary),
);
$("#settings-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!e.target.reportValidity()) return;
  const settings = {
    tuition: selectedTuition(),
    tuitionOption: $("[name=tuition-option]:checked")?.value,
    start: $("#start-input").value,
    end: $("#end-input").value,
  };
  if (!validSettings(settings)) {
    $("#settings-error").textContent =
      "请选择校历范围（2026.08.31–2027.09.05）内的有效日期，至少包含一个在校计费日，结束日不能早于开始日。";
    return;
  }
  state.settings = settings;
  persist();
  $("#settings-dialog").close();
  tick();
  renderStats();
  refreshMonth();
  toast(
    state.timer.firstStartedAt !== null
      ? "设置已更新。本次专注按开始时的费率计算。"
      : "已更新学费和学年设置。",
  );
});
const deck = $(".focus-card");
function syncFullscreen() {
  const expanded =
    Boolean(document.fullscreenElement) ||
    deck.classList.contains("focus-expanded");
  $("#fullscreen").title = expanded ? "退出全屏" : "全屏专注";
  $("#fullscreen").setAttribute("aria-label", $("#fullscreen").title);
  $("#fullscreen").setAttribute("aria-pressed", String(expanded));
}
function fallbackFullscreen(on) {
  deck.classList.toggle("focus-expanded", on);
  for (const selector of [
    ".masthead",
    ".page-heading",
    ".ledger-layout",
    ".recent-section",
    "footer",
  ])
    $(selector).inert = on;
  document.body.style.overflow = on ? "hidden" : "";
  syncFullscreen();
}
$("#fullscreen").addEventListener("click", async () => {
  if (deck.classList.contains("focus-expanded"))
    return fallbackFullscreen(false);
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await deck.requestFullscreen();
  } catch {
    fallbackFullscreen(true);
  }
});
document.addEventListener("fullscreenchange", syncFullscreen);
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    deck.classList.contains("focus-expanded") &&
    !document.querySelector("dialog[open]")
  ) {
    fallbackFullscreen(false);
    $("#fullscreen").focus();
  }
});
const viewTitles = {
  timer: "专注随身听",
  calendar: "学年校历",
  history: "专注记录",
};
function showView(view) {
  if (!Object.hasOwn(viewTitles, view)) view = "timer";
  if (view !== "timer" && deck.classList.contains("focus-expanded"))
    fallbackFullscreen(false);
  for (const key of Object.keys(viewTitles))
    document.getElementById(key + "-view").hidden = key !== view;
  $$(".nav-item").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === view);
    if (link.dataset.view === view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  $("#page-title").textContent = viewTitles[view];
  if (view === "calendar") renderCalendar();
  if (view === "history") renderRecords();
}
window.addEventListener("hashchange", () => {
  showView(location.hash.slice(1));
  window.scrollTo(0, 0);
});
$(".skip").addEventListener("click", (e) => {
  e.preventDefault();
  $("#main").focus();
});
function todayIntervals(intervals, now) {
  const start = chinaDate(dateKey(now)),
    end = start + DAY;
  return intervals
    .filter(
      (interval) =>
        Array.isArray(interval) &&
        interval.length === 2 &&
        interval.every(Number.isFinite),
    )
    .map((interval) => [
      Math.max(start, interval[0]),
      Math.min(end, interval[1]),
    ])
    .filter((interval) => interval[1] > interval[0]);
}
function renderStats(now = Date.now()) {
  const t = state.timer,
    elapsed = timerElapsed(t, now);
  const intervals = [...t.intervals];
  if (t.startedAt !== null)
    intervals.push([
      t.startedAt,
      t.startedAt + Math.max(0, elapsed - t.elapsed),
    ]);
  const today = todayIntervals(intervals, now);
  let ms = today.reduce((sum, interval) => sum + interval[1] - interval[0], 0),
    cost =
      (schoolOverlap(today, t.billingSettings || state.settings) / 1000) *
      (t.rate || 0);
  for (const r of state.records) {
    const today = todayIntervals(r.intervals, now);
    ms += today.reduce((sum, interval) => sum + interval[1] - interval[0], 0);
    cost += (schoolOverlap(today, r.billingSettings) / 1000) * r.rate;
  }
  $("#today-focus").textContent = (ms / 60000).toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });
  $("#today-sessions").textContent = state.records.filter(
    (r) => dateKey(r.end) === dateKey(now),
  ).length;
  $("#today-worth").textContent = money(cost);
  $("#all-minutes").textContent = durationLabel(
    state.records.reduce((s, r) => s + r.ms, 0),
  );
  $("#all-count").textContent = state.records.length + " 次";
  $("#all-worth").textContent = money(
    state.records.reduce((s, r) => s + r.cost, 0),
  );
}
function recordRow(record) {
  const row = document.createElement("div");
  row.className = "record-row";
  const task = document.createElement("div");
  task.className = "record-task";
  const icon = document.createElement("span");
  icon.textContent = "✓";
  const description = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = record.task;
  const date = document.createElement("small");
  date.textContent = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(record.end);
  description.append(name, date);
  task.append(icon, description);
  const mode = document.createElement("span");
  mode.textContent = record.mode === "focus" ? "番茄专注" : "正向计时";
  const duration = document.createElement("span");
  duration.textContent = formatTime(record.ms);
  const worth = document.createElement("span");
  worth.className = "record-value";
  worth.textContent = money(record.cost, record.cost < 0.01 ? 4 : 2);
  row.append(task, mode, duration, worth);
  return row;
}
function durationLabel(ms) {
  if (ms > 0 && ms < 60000) return Math.max(1, Math.round(ms / 1000)) + " 秒";
  return (
    (ms / 60000).toLocaleString("zh-CN", { maximumFractionDigits: 1 }) + " 分钟"
  );
}
function emptyRecords(fullPage) {
  const empty = document.createElement("div");
  empty.className = fullPage ? "history-empty" : "empty-state";
  empty.innerHTML = fullPage
    ? '<div class="empty-tape" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24"><use href="#i-tape"></use></svg></div><h2>还没有专注记录</h2><p>完成计时或选择「结束并保存」，即可在这里回看任务和时长。</p><a class="outline-button" href="#timer">前往专注台</a>'
    : '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-tape"></use></svg><span>完成一次专注后，这里会显示最近的记录。</span>';
  return empty;
}
function renderRecords() {
  const recent = $("#recent-records"),
    history = $("#all-records");
  recent.replaceChildren();
  history.replaceChildren();
  if (!state.records.length) {
    recent.append(emptyRecords(false));
    history.append(emptyRecords(true));
  } else {
    state.records
      .slice(0, 3)
      .forEach((record) => recent.append(recordRow(record)));
    const days = new Map();
    for (const record of state.records) {
      const key = dateKey(record.end);
      if (!days.has(key)) days.set(key, []);
      days.get(key).push(record);
    }
    for (const [key, records] of [...days].sort(([a], [b]) =>
      b.localeCompare(a),
    )) {
      const group = document.createElement("section");
      group.className = "record-group";
      const heading = document.createElement("header");
      const date = document.createElement("h2"),
        total = document.createElement("span");
      date.textContent = dateLabel(key);
      total.textContent =
        records.length +
        " 次专注 · " +
        durationLabel(records.reduce((sum, record) => sum + record.ms, 0));
      heading.append(date, total);
      const labels = document.createElement("div");
      labels.className = "record-labels record-row";
      labels.innerHTML =
        "<span>任务</span><span>模式</span><span>时长</span><span>时间价值</span>";
      group.append(heading, labels);
      records.forEach((record) => group.append(recordRow(record)));
      history.append(group);
    }
  }
  renderStats();
}
let calendarDay,
  monthIndex,
  selectedDate,
  yearOverview = false;
const monthPicker = $("#month-picker");
const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Date(Date.UTC(2026, 8 + index, 1)).toISOString().slice(0, 7),
);
monthNames.forEach((prefix, index) => {
  const option = document.createElement("option");
  option.value = index;
  option.textContent =
    prefix.slice(0, 4) + " 年 " + Number(prefix.slice(5)) + " 月";
  monthPicker.append(option);
});
function billingLabel(key) {
  if (!schoolDay(key).active) return "非计费日";
  if (key < state.settings.start || key > state.settings.end)
    return "在校日 · 计费区间外";
  return "在校计费日";
}
function selectDay(key) {
  selectedDate = key;
  const cells =
    $("#calendar-months").children[monthIndex].querySelectorAll(
      "button[data-date]",
    );
  cells.forEach((cell) => {
    if (yearOverview) cell.removeAttribute("aria-pressed");
    else cell.setAttribute("aria-pressed", String(cell.dataset.date === key));
  });
  $("#selected-month").textContent = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
  }).format(chinaDate(key));
  $("#selected-day").textContent = key.slice(5).replace("-", " / ");
  const day = schoolDay(key);
  $("#selected-phase").textContent =
    day.label.replace(" · 不计费", "") +
    (day.week ? " · 第 " + day.week + " 周" : "");
  $("#selected-billing").textContent = billingLabel(key);
}
function refreshMonth() {
  const cards = [...$("#calendar-months").children];
  if (!cards.length) return;
  $("#calendar-layout").classList.toggle("year-overview", yearOverview);
  $("#month-agenda").hidden = yearOverview;
  $("#month-controls").hidden = yearOverview;
  $("#view-month").setAttribute("aria-pressed", String(!yearOverview));
  $("#view-year").setAttribute("aria-pressed", String(yearOverview));
  cards.forEach(
    (card, index) => (card.hidden = !yearOverview && index !== monthIndex),
  );
  if (yearOverview) {
    $("#calendar-months")
      .querySelectorAll("[aria-pressed]")
      .forEach((cell) => cell.removeAttribute("aria-pressed"));
    return;
  }
  monthPicker.value = String(monthIndex);
  $("#prev-month").disabled = monthIndex === 0;
  $("#next-month").disabled = monthIndex === 11;
  const prefix = monthNames[monthIndex],
    start = prefix + "-01";
  const entries = PERIODS.filter(([key]) => key.startsWith(prefix)).map(
    ([key, label]) => [key, label],
  );
  if (!entries.some(([key]) => key === start))
    entries.unshift([start, academicPeriod(chinaDate(start)).label]);
  for (const [key, label] of EXCLUDED_DATES)
    if (key.startsWith(prefix)) entries.push([key, label]);
  const events = $("#month-events");
  events.replaceChildren();
  for (const [key, label] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    const li = document.createElement("li"),
      date = document.createElement("time"),
      title = document.createElement("span");
    date.dateTime = key;
    date.textContent = key.slice(8) + " 日";
    title.textContent = label;
    li.append(date, title);
    events.append(li);
  }
  const days = [...cards[monthIndex].querySelectorAll("button[data-date]")].map(
    (button) => button.dataset.date,
  );
  $("#month-day-count").textContent =
    "本月计费 " +
    days.filter((key) => billingLabel(key) === "在校计费日").length +
    " 天";
  const today = dateKey(Date.now());
  selectDay(
    selectedDate?.startsWith(prefix)
      ? selectedDate
      : today.startsWith(prefix)
        ? today
        : start,
  );
}
function setMonth(index) {
  monthIndex = Math.max(0, Math.min(11, index));
  refreshMonth();
}
monthPicker.addEventListener("change", () =>
  setMonth(Number(monthPicker.value)),
);
$("#prev-month").addEventListener("click", () => setMonth(monthIndex - 1));
$("#next-month").addEventListener("click", () => setMonth(monthIndex + 1));
$("#view-month").addEventListener("click", () => {
  yearOverview = false;
  refreshMonth();
});
$("#view-year").addEventListener("click", () => {
  yearOverview = true;
  refreshMonth();
});
function renderCalendar(now = Date.now()) {
  const key = dateKey(now);
  if (calendarDay === key) return;
  calendarDay = key;
  if (monthIndex === undefined) {
    const match = monthNames.indexOf(key.slice(0, 7));
    monthIndex = match >= 0 ? match : key < monthNames[0] ? 0 : 11;
  }
  const container = $("#calendar-months");
  container.replaceChildren();
  for (let index = 0; index < 12; index++) {
    const monthDate = new Date(Date.UTC(2026, 8 + index, 1)),
      year = monthDate.getUTCFullYear(),
      month = monthDate.getUTCMonth();
    const card = document.createElement("section");
    card.className = "month-card card";
    card.innerHTML = `<h3>${String(month + 1).padStart(2, "0")} 月 <span>${year}</span></h3>`;
    const grid = document.createElement("div");
    grid.className = "month-grid";
    for (const day of ["一", "二", "三", "四", "五", "六", "日"]) {
      const span = document.createElement("span");
      span.className = "weekday";
      span.textContent = day;
      grid.append(span);
    }
    const offset = (monthDate.getUTCDay() + 6) % 7,
      days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let blank = 0; blank < offset; blank++)
      grid.append(document.createElement("span"));
    for (let day = 1; day <= days; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        p = schoolDay(date);
      const span = document.createElement("button");
      span.type = "button";
      span.textContent = day;
      span.className = p.kind;
      span.dataset.date = date;
      span.tabIndex = day === 1 ? 0 : -1;
      if ((offset + day - 1) % 7 >= 5) span.classList.add("weekend");
      if (date === key) {
        span.classList.add("is-today");
        span.setAttribute("aria-current", "date");
      }
      span.title =
        `${date} · ${p.label}${p.week ? " · 第 " + p.week + " 周" : ""} · ${p.active ? "在校计费日" : "不计费"}`.replace(
          "不计费 · 不计费",
          "不计费",
        );
      span.setAttribute("aria-label", span.title);
      grid.append(span);
    }
    const today = grid.querySelector(".is-today");
    if (today) {
      grid.querySelector("button").tabIndex = -1;
      today.tabIndex = 0;
    }
    card.append(grid);
    container.append(card);
  }
  refreshMonth();
}
const months = $("#calendar-months");
months.addEventListener("click", (event) => {
  const day = event.target.closest("button[data-date]");
  if (!day) return;
  if (!yearOverview) {
    selectDay(day.dataset.date);
    return;
  }
  $("#day-title").textContent = dateLabel(day.dataset.date);
  $("#day-detail").textContent =
    schoolDay(day.dataset.date).label.replace(" · 不计费", "") +
    " · " +
    billingLabel(day.dataset.date);
  $("#day-dialog").showModal();
});
months.addEventListener("focusin", (event) => {
  const day = event.target.closest("button[data-date]");
  if (!day) return;
  day.parentElement
    .querySelectorAll("button")
    .forEach((button) => (button.tabIndex = button === day ? 0 : -1));
});
months.addEventListener("keydown", (event) => {
  const day = event.target.closest("button[data-date]");
  if (!day) return;
  const cells = [...day.parentElement.querySelectorAll("button")],
    index = cells.indexOf(day);
  const targets = {
    ArrowLeft: index - 1,
    ArrowRight: index + 1,
    ArrowUp: index - 7,
    ArrowDown: index + 7,
    Home: 0,
    End: cells.length - 1,
  };
  if (!Object.hasOwn(targets, event.key)) return;
  event.preventDefault();
  cells[Math.max(0, Math.min(cells.length - 1, targets[event.key]))].focus();
});
function renderAcademic(now) {
  const p = academicPeriod(now),
    inCalendar = p.kind !== "outside";
  $("#term-chip").textContent = !inCalendar
    ? "2026 / 27 校历"
    : now < chinaDate("2027-02-15")
      ? "第一学期"
      : "第二学期";
  $("#academic-title").textContent = p.week
    ? "教学第 " + p.week + " 周"
    : p.label;
  const next = PERIODS.find((event) => chinaDate(event[0]) > now);
  $("#next-event-title").textContent = next ? next[1] : "本学年校历已结束";
  $("#next-event-date").textContent = next
    ? `${+next[0].slice(5, 7)} 月 ${+next[0].slice(8)} 日`
    : "";
  $("#next-event-days").textContent = next
    ? "还有 " + Math.ceil((chinaDate(next[0]) - now) / DAY) + " 天"
    : "";
}
const headerDate = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "long",
  day: "numeric",
  weekday: "long",
});
let headerDay = "";
function tick() {
  const now = Date.now(),
    a = annual(state.settings, now),
    t = state.timer;
  if (
    t.startedAt !== null &&
    t.mode === "focus" &&
    timerElapsed(t, now) >= t.duration
  ) {
    finish(true, now);
    return;
  }
  const elapsed = timerElapsed(t, now),
    remaining = a.remaining
      .toLocaleString("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      })
      .split(".");
  $("#remaining-int").textContent = remaining[0];
  $("#remaining-decimal").textContent = "." + remaining[1];
  $("#spent-tuition").textContent = money(a.spent);
  $("#total-tuition").textContent = money(state.settings.tuition);
  const startToday = chinaDate(dateKey(now)),
    todayElapsed = a.elapsed - annual(state.settings, startToday).elapsed;
  $("#today-tuition").textContent = money((todayElapsed / 1000) * a.rate);
  $("#rate-second").textContent = (a.active ? a.rate : 0).toFixed(4);
  $("#annual-status").textContent =
    now < a.firstDay
      ? "等待开学"
      : now >= a.lastDayEnd
        ? "计费已结束"
        : a.active
          ? "计费中"
          : "非计费日";
  $(".live-dot").classList.toggle("inactive", !a.active);
  $("#billing-caption").textContent = a.active
    ? `只计 ${a.totalDays} 个在校日 · ${money(a.rate * 86400)} / 日`
    : a.nextDay
      ? `下次计费 ${dateLabel(dateKey(a.nextDay))} 00:00`
      : `本学年共 ${a.totalDays} 个在校计费日`;
  $("#year-progress-bar").style.width = a.progress * 100 + "%";
  $("#year-percent").textContent = (a.progress * 100).toFixed(2) + "%";
  $("#days-left").textContent = a.daysLeft;
  $("#date-range").textContent =
    dateLabel(state.settings.start) + " — " + dateLabel(state.settings.end);
  const display = t.mode === "focus" ? t.duration - elapsed : elapsed;
  $("#timer-digits").textContent = formatTime(display);
  $("#timer-digits").setAttribute(
    "aria-label",
    (t.mode === "focus" ? "剩余时间 " : "已专注 ") + formatTime(display),
  );
  $("#timer-digits").classList.toggle("long", formatTime(display).length > 5);
  const status =
    t.startedAt !== null ? "专注中" : elapsed > 0 ? "已暂停" : "待机";
  if ($("#timer-status").textContent !== status)
    $("#timer-status").textContent = status;
  const intervals = [...t.intervals];
  if (t.startedAt !== null)
    intervals.push([
      t.startedAt,
      t.startedAt + Math.max(0, elapsed - t.elapsed),
    ]);
  $("#session-cost").textContent = money(
    (schoolOverlap(intervals, t.billingSettings || state.settings) / 1000) *
      (t.rate ?? a.rate),
    4,
  );
  $("#session-estimate").textContent = a.active
    ? t.mode === "focus"
      ? `计费日 ${t.duration / 60000} 分钟 ≈ ${money((t.duration / 1000) * (t.rate ?? a.rate))}`
      : `计费日每小时 ≈ ${money(3600 * (t.rate ?? a.rate))}`
    : "非在校日专注 · 不计学费";
  if (t.startedAt !== null) document.title = formatTime(display) + " · 学时";
  else document.title = $("#page-title").textContent + " · 学时";
  if (Math.floor(now / 1000) !== lastSecond) {
    lastSecond = Math.floor(now / 1000);
    renderStats(now);
    renderAcademic(now);
    const key = dateKey(now);
    if (key !== headerDay) {
      headerDay = key;
      $("#current-date").dateTime = key;
      $("#current-date").textContent = headerDate
        .format(now)
        .replace("星期", "　星期");
    }
    if (!$("#calendar-view").hidden) renderCalendar(now);
  }
}
$("#export-records").addEventListener("click", () => {
  if (!state.records.length) {
    toast("完成第一段专注后，就可以导出记录。");
    return;
  }
  const safe = (value) =>
    '"' +
    String(value)
      .replace(/^[=+\-@\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const rows = [
    [
      "任务",
      "模式",
      "开始时间（北京时间）",
      "结束时间（北京时间）",
      "专注秒数",
      "时间价值（元）",
    ],
    ...state.records.map((r) => [
      r.task,
      r.mode === "focus" ? "番茄专注" : "正向计时",
      new Date(r.start + 8 * 3600000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19),
      new Date(r.end + 8 * 3600000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19),
      (r.ms / 1000).toFixed(3),
      r.cost.toFixed(4),
    ]),
  ];
  const blob = new Blob(
    ["\uFEFF" + rows.map((row) => row.map(safe).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `学时-专注记录-${dateKey(Date.now())}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast("专注记录已导出。");
});
window.addEventListener("storage", (e) => {
  if (e.key === KEY) {
    state = readState();
    syncControls();
    renderRecords();
    tick();
    refreshMonth();
  }
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});
syncControls();
renderRecords();
showView(location.hash.slice(1) || "timer");
tick();
setInterval(tick, 100);
