// The housing is drawn once per mode or duration change. Only the hubs move during playback.
const width = 520,
  height = 330;
const canvas = document.querySelector("#cassette");
const surface = document.createElement("canvas");
const scale = 2;
for (const layer of [canvas, surface]) {
  layer.width = width * scale;
  layer.height = height * scale;
}
const ink = surface.getContext("2d");
const live = canvas.getContext("2d");
ink.scale(scale, scale);
live.scale(scale, scale);
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let faceKey = "",
  playing = false,
  visible = true,
  frame = 0,
  last = 0,
  angle = 0;

function box(x, y, w, h, r, fill, stroke, line = 1) {
  ink.beginPath();
  ink.roundRect(x, y, w, h, r);
  ink.fillStyle = fill;
  ink.fill();
  if (stroke) {
    ink.lineWidth = line;
    ink.strokeStyle = stroke;
    ink.stroke();
  }
}
function strip(x, y, w, h, color) {
  ink.fillStyle = color;
  ink.fillRect(x, y, w, h);
}
function gradient(y1, y2, stops) {
  const g = ink.createLinearGradient(0, y1, 0, y2);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}
function circle(x, y, radius, fill, stroke, line = 1) {
  ink.beginPath();
  ink.arc(x, y, radius, 0, Math.PI * 2);
  ink.fillStyle = fill;
  ink.fill();
  if (stroke) {
    ink.strokeStyle = stroke;
    ink.lineWidth = line;
    ink.stroke();
  }
}
function type(text, x, y, font, color, align = "left") {
  ink.textAlign = align;
  ink.font = font;
  ink.fillStyle = color;
  ink.fillText(text, x, y);
}
function screw(x, y, turn) {
  circle(x, y + 1, 6.2, "#162450", "#6478a8");
  circle(
    x,
    y,
    4.4,
    gradient(y - 4, y + 4, [
      [0, "#d9dee0"],
      [0.35, "#afb4b9"],
      [1, "#676e83"],
    ]),
    "#1e2943",
  );
  ink.save();
  ink.translate(x, y);
  ink.rotate(turn);
  strip(-3, -0.85, 6, 1.7, "#444d60");
  strip(-0.85, -3, 1.7, 6, "#444d60");
  ink.restore();
}
function drawHousing(mode, minutes, task) {
  ink.clearRect(0, 0, width, height);
  const blue = gradient(9, 318, [
    [0, "#475fbc"],
    [0.07, "#334eaf"],
    [0.52, "#263f97"],
    [0.94, "#293f91"],
    [1, "#465cb0"],
  ]);
  box(10, 12, 500, 309, 22, "#172957", "#172847", 1.5);
  box(10, 8, 500, 307, 22, blue, "#1b316d", 2);
  box(14, 12, 492, 297, 18, "transparent", "#6c83c6", 1);
  for (let y = 18; y < 306; y += 3.2) {
    const inset = y < 28 || y > 295 ? 12 : 4;
    strip(17 + inset, y, 486 - inset * 2, 0.62, "rgba(9,23,70,.26)");
  }
  // The paper label sits inside a moulded recess.
  box(32, 28, 456, 214, 13, "#192f6d", "#5b72b8", 2);
  box(36, 32, 448, 206, 10, "#f5efdf", "#142d67", 1);
  ink.save();
  ink.beginPath();
  ink.roundRect(36, 32, 448, 206, 10);
  ink.clip();
  strip(36, 87, 448, 6, "#f3b43c");
  strip(36, 94, 448, 7, "#f19638");
  strip(36, 102, 448, 9, "#e46a3b");
  strip(36, 112, 448, 10, "#d04c34");
  strip(36, 123, 448, 20, "#293851");
  strip(36, 144, 448, 51, "#27344a");
  // Printed fibres and shell grain are deterministic.
  for (let n = 0; n < 1750; n++) {
    const x = 36 + ((n * 151.37) % 448),
      y = 32 + ((n * 79.83) % 206);
    strip(x, y, 1, 0.8, n % 2 ? "rgba(255,255,255,.1)" : "rgba(13,26,50,.06)");
  }
  ink.restore();
  type(
    mode === "focus" ? "Focus Mix" : "Free Session",
    53,
    78,
    "italic bold 43px Georgia, serif",
    "#263956",
  );
  type(
    "STUDY TAPE",
    462,
    54,
    "bold 11px Arial, sans-serif",
    "#333e52",
    "right",
  );
  type("XJTLU  /  SUZHOU", 462, 71, "9px monospace", "#394561", "right");
  // An inset smoked window encloses both reels and the tape bridge.
  box(105, 108, 310, 84, 39, "#17243a", "#c5bba6", 2);
  box(
    108,
    111,
    304,
    78,
    38,
    gradient(111, 189, [
      [0, "#172131"],
      [0.6, "#534d4d"],
      [1, "#222c3d"],
    ]),
    "#0b1d2e",
    2,
  );
  for (const x of [151, 369]) {
    circle(x, 150, 36, "#2c292f", "#0e172a", 2);
    for (let r = 32; r >= 22; r -= 2.2) {
      ink.beginPath();
      ink.arc(x, 150, r, 0, 2 * Math.PI);
      ink.lineWidth = 0.75;
      ink.strokeStyle = "#60504a";
      ink.stroke();
    }
  }
  box(202, 129, 116, 42, 8, "#151f30", "#70737e", 1);
  box(
    206,
    132,
    108,
    36,
    5,
    gradient(132, 168, [
      [0, "#59626a"],
      [0.9, "#8c9696"],
      [1, "#586477"],
    ]),
  );
  strip(207, 150, 106, 14, "#504344");
  strip(207, 148, 106, 2, "#c0b5a1");
  for (let i = 0; i < 11; i++)
    strip(215 + i * 9, 133, 1, i % 5 === 0 ? 8 : 4, "#384558");
  type(mode === "focus" ? "A" : "B", 54, 171, "bold 44px Arial", "#f7efde");
  type("SIDE", 55, 185, "bold 8px monospace", "#f7efde");
  type(
    mode === "focus" ? String(minutes).padStart(2, "0") : "∞",
    464,
    172,
    "bold 27px Arial",
    "#f7efde",
    "right",
  );
  type(
    mode === "focus" ? "MIN" : "OPEN",
    464,
    185,
    "bold 8px monospace",
    "#f7efde",
    "right",
  );
  type("学 时", 54, 222, 'bold 16px "Microsoft YaHei",sans-serif', "#2d3d58");
  strip(107, 222, 213, 0.7, "#7e847e");
  if (task) {
    const pen = 'italic 14px "KaiTi", "Microsoft YaHei", sans-serif';
    ink.font = pen;
    let label = task.trim();
    while (label.length && ink.measureText(label + "…").width > 207)
      label = Array.from(label).slice(0, -1).join("");
    if (label !== task.trim()) label += "…";
    type(label, 109, 217, pen, "#334a6b");
  }
  type("NORMAL POSITION", 463, 221, "bold 10px monospace", "#38445b", "right");
  // Raised trapezoidal tape guard, with moulding lines and capstan openings.
  ink.beginPath();
  ink.moveTo(94, 309);
  ink.lineTo(116, 260);
  ink.quadraticCurveTo(118, 254, 126, 254);
  ink.lineTo(394, 254);
  ink.quadraticCurveTo(402, 254, 405, 260);
  ink.lineTo(427, 309);
  ink.closePath();
  ink.fillStyle = gradient(254, 310, [
    [0, "#405aa8"],
    [1, "#2e4698"],
  ]);
  ink.fill();
  ink.strokeStyle = "#7183bc";
  ink.lineWidth = 1.2;
  ink.stroke();
  for (const x of [151, 369]) {
    circle(x, 291, 10, "#112444", "#7281ae", 2);
    circle(x, 291, 6.5, "#15213b", "#293758");
  }
  for (const x of [194, 326]) {
    box(x - 6, 288, 12, 12, 3, "#14223f", "#677bb0", 1.4);
  }
  screw(26, 24, 0.45);
  screw(494, 24, 0.09);
  screw(26, 296, 0.68);
  screw(494, 296, 0.27);
  screw(260, 269, 0.4);
}
function hub(x, turn) {
  live.save();
  live.translate(x, 150);
  live.rotate(turn);
  live.beginPath();
  live.arc(0, 0, 22, 0, Math.PI * 2);
  live.fillStyle = "#151f32";
  live.fill();
  live.beginPath();
  live.arc(0, 0, 18.9, 0, Math.PI * 2);
  live.fillStyle = "#e7e2cb";
  live.fill();
  live.beginPath();
  live.arc(0, 0, 12.8, 0, Math.PI * 2);
  live.fillStyle = "#273044";
  live.fill();
  for (let k = 0; k < 6; k++) {
    live.rotate(Math.PI / 3);
    live.fillStyle = "#ede8d7";
    live.fillRect(-2.7, -15, 5.4, 6.5);
    live.fillStyle = "#8d8e85";
    live.fillRect(-2.7, -8.9, 5.4, 1.3);
  }
  live.restore();
}
function paint() {
  live.clearRect(0, 0, width, height);
  live.drawImage(surface, 0, 0, width, height);
  hub(151, angle);
  hub(369, angle + 0.22);
}
function animate(time) {
  frame = 0;
  if (!playing || !visible || document.hidden || reduce.matches) {
    last = 0;
    return;
  }
  if (!last || time - last >= 65) {
    if (last)
      angle = (angle + Math.min(time - last, 150) * 0.00065) % (2 * Math.PI);
    last = time;
    paint();
  }
  frame = requestAnimationFrame(animate);
}
function schedule() {
  if (frame) cancelAnimationFrame(frame);
  last = 0;
  frame = 0;
  if (playing && visible && !document.hidden && !reduce.matches)
    frame = requestAnimationFrame(animate);
}
export function updateCassette({ mode, duration, startedAt, task = "" }) {
  const key = JSON.stringify([mode, duration, task]);
  if (key !== faceKey) {
    faceKey = key;
    drawHousing(mode, duration / 60000, task);
    paint();
  }
  if (playing !== (startedAt !== null)) {
    playing = startedAt !== null;
    schedule();
  }
}
new IntersectionObserver((entries) => {
  visible = entries[0].isIntersecting;
  schedule();
}).observe(canvas);
reduce.addEventListener("change", schedule);
document.addEventListener("visibilitychange", schedule);
