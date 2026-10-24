// Simulasi mekanisme tampak samping: satu baris titik (40 pin) dilihat dari samping.
// Urutan sama dengan firmware: roller turun -> lintasan reset (kiri->kanan) -> roller naik
// -> lintasan setel (kanan->kiri, serpentine) dengan pulsa solenoid di tiap pin yang harus timbul.

const $ = id => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const S = 4.5;                       // px per mm
const X0 = 50, COLS = 20;
const PIN_W = 1.5 * S, PIN_H = 34;
const PLATE_TOP = 100, UP_TOP = PLATE_TOP - 12, DOWN_TOP = PLATE_TOP;
const PLUNGER_REST = 140, PLUNGER_HIT = UP_TOP + PIN_H;   // ujung plunger saat mendorong pin penuh
const ROLLER_R = 10, ROLLER_DOWN = PLATE_TOP - ROLLER_R, ROLLER_UP = 62, ROLLER_LEAD = 22;
const V = 60 * S;                    // carriage 60 mm/s
const PULSE = 0.03, SETTLE = 0.02, SERVO = 0.3;
const PARK_L = 40, PARK_R = X0 + (COLS - 1) * 6 * S + 2.5 * S + ROLLER_LEAD + 30;

const pinX = k => X0 + Math.floor(k / 2) * 6 * S + (k % 2) * 2.5 * S;
const pinCenter = k => pinX(k) + PIN_W / 2;

const el = (tag, attrs, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent && parent.appendChild(n);
  return n;
};

// Pola target satu baris titik dari halaman: baris braille r, baris titik d (0 atas .. 2 bawah).
function rowPattern(lines, r, d) {
  const cells = lines[r] ? lines[r].cells : [];
  const out = [];
  for (let c = 0; c < COLS; c++) {
    const dots = cells[c] ? cells[c].dots : new Set();
    out.push(dots.has(d + 1), dots.has(d + 4));
  }
  return out;
}

// Estimasi waktu nyata satu halaman: 1 lintasan reset + 12 lintasan setel serpentine + pulsa.
function pageTime(lines) {
  const pass = (PARK_R - PARK_L) / V;
  let pulses = 0;
  for (let r = 0; r < 4; r++) for (let d = 0; d < 3; d++) pulses += rowPattern(lines, r, d).filter(Boolean).length;
  return 2 * SERVO + pass + 12 * pass + pulses * (PULSE + SETTLE);
}

export function initMechanism() {
  const svg = $("mech-svg");
  const gBack = el("g", {}, svg), gPins = el("g", {}, svg), gFront = el("g", {}, svg);

  // Statis: rel, pelat, silikon, penanda sel.
  el("line", { x1: 10, y1: 196, x2: 630, y2: 196, stroke: "var(--dim)", "stroke-dasharray": "4 4" }, gBack);
  el("rect", { x: 30, y: PLATE_TOP, width: 580, height: 16, fill: "#0e2233", stroke: "var(--cyan)" }, gFront);
  el("rect", { x: 30, y: PLATE_TOP + 16, width: 580, height: 6, fill: "#3a2d4d", opacity: .9 }, gFront);
  for (let c = 0; c < COLS; c += 5) {
    const t = el("text", { x: pinX(c * 2), y: 212, fill: "var(--dim)", "font-size": 10 }, gFront);
    t.textContent = "sel " + (c + 1);
  }
  const lbl = (x, y, s, fill = "var(--text)") => { const t = el("text", { x, y, fill, "font-size": 11 }, gFront); t.textContent = s; };
  lbl(32, 14, "roller reset (SG90)", "var(--gold)");
  lbl(520, 230, "rel GT2 / NEMA17");
  lbl(32, 236, "pelat pin + silikon 1 mm (penahan gesek)", "var(--dim)");

  const pins = [];
  for (let k = 0; k < COLS * 2; k++) {
    pins.push({ top: DOWN_TOP, node: el("rect", { x: pinX(k), y: DOWN_TOP, width: PIN_W, height: PIN_H, rx: 3 }, gPins) });
  }

  // Bergerak: rangka-C, roller, carriage, solenoid, plunger.
  const frame = el("path", { fill: "none", stroke: "var(--dim)", "stroke-dasharray": "3 3" }, gBack);
  const roller = el("circle", { r: ROLLER_R, fill: "rgba(255,180,61,.15)", stroke: "var(--gold)", "stroke-width": 2 }, gFront);
  const axle = el("circle", { r: 2, fill: "var(--gold)" }, gFront);
  const carriage = el("rect", { y: 160, width: 60, height: 30, fill: "rgba(61,230,255,.1)", stroke: "var(--cyan)" }, gFront);
  const sol = el("rect", { y: 140, width: 14, height: 20, fill: "#0e2233", stroke: "var(--cyan)" }, gFront);
  const plunger = el("rect", { width: 4, fill: "var(--cyan)" }, gFront);
  const flash = el("circle", { r: 7, fill: "var(--cyan)", opacity: 0 }, gFront);

  let page = null, view = { r: 0, d: 0 };
  let phys = null;                       // phys[r][d] = array 40 bool, keadaan pin fisik
  let st = { phase: "idle", cx: PARK_L, cy: ROLLER_UP, plunger: PLUNGER_REST, targets: [], t: 0, real: 0 };
  let speed = 0.5, last = 0, raf = 0;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("mech-auto").checked = !reduce;

  const PHASE_TEXT = {
    idle: "Siap. Tekan Jalankan untuk mengganti halaman.",
    rollerDown: "Servo menurunkan roller reset.",
    reset: "Lintasan reset: roller menekan semua pin timbul ke bawah.",
    rollerUp: "Servo mengangkat roller.",
    set: "Lintasan setel: solenoid mendorong pin yang harus timbul.",
    done: "Selesai. Buzzer berbunyi dua kali, halaman siap diraba.",
  };
  function setPhase(p) {
    st.phase = p;
    $("mech-phase").textContent = PHASE_TEXT[p];
    $("mech-run").textContent = p === "idle" || p === "done" ? "▶ Jalankan" : (raf ? "❚❚ Jeda" : "▶ Lanjut");
  }

  function syncPinsFromPhys() {
    phys[view.r][view.d].forEach((up, k) => { pins[k].top = up ? UP_TOP : DOWN_TOP; });
  }

  function render() {
    const rx = st.cx + ROLLER_LEAD;
    roller.setAttribute("cx", rx); roller.setAttribute("cy", st.cy);
    axle.setAttribute("cx", rx); axle.setAttribute("cy", st.cy);
    frame.setAttribute("d", `M${rx} ${st.cy}V24H${st.cx + 50}V175H${st.cx + 36}`);
    carriage.setAttribute("x", st.cx - 24);
    sol.setAttribute("x", st.cx - 7);
    plunger.setAttribute("x", st.cx - 2);
    plunger.setAttribute("y", st.plunger);
    plunger.setAttribute("height", 160 - st.plunger);
    flash.setAttribute("cx", st.cx); flash.setAttribute("cy", st.plunger);
    flash.setAttribute("opacity", st.phase === "set" && st.plunger < PLUNGER_REST - 2 ? .5 : 0);
    pins.forEach(p => {
      p.node.setAttribute("y", p.top);
      const up = p.top < PLATE_TOP - 6;
      p.node.setAttribute("fill", up ? "var(--gold)" : "#2a4558");
    });
    $("mech-real").textContent = st.real.toFixed(2) + " s";
  }

  function step(dt) {
    st.real += dt;
    const rx = st.cx + ROLLER_LEAD;
    switch (st.phase) {
      case "rollerDown":
        st.cy = Math.min(ROLLER_DOWN, st.cy + (ROLLER_DOWN - ROLLER_UP) / SERVO * dt);
        if (st.cy >= ROLLER_DOWN) setPhase("reset");
        break;
      case "reset":
        st.cx = Math.min(PARK_R, st.cx + V * dt);
        // Kontak geometris roller-pin: pin ditekan sampai menyentuh lingkar bawah roller.
        pins.forEach((p, k) => {
          const dx = Math.abs(pinCenter(k) - (st.cx + ROLLER_LEAD));
          if (dx < ROLLER_R) p.top = Math.max(p.top, st.cy + Math.sqrt(ROLLER_R ** 2 - dx ** 2));
          if (pinCenter(k) < st.cx + ROLLER_LEAD - ROLLER_R) p.top = Math.max(p.top, DOWN_TOP);
        });
        if (st.cx >= PARK_R) setPhase("rollerUp");
        break;
      case "rollerUp":
        st.cy = Math.max(ROLLER_UP, st.cy - (ROLLER_DOWN - ROLLER_UP) / SERVO * dt);
        if (st.cy <= ROLLER_UP) { st.targets = targetsFor(view).reverse(); st.t = 0; setPhase("set"); }
        break;
      case "set": {
        const k = st.targets[0];
        const goal = k === undefined ? PARK_L : pinCenter(k);
        if (st.cx > goal) { st.cx = Math.max(goal, st.cx - V * dt); break; }
        if (k === undefined) { finish(); break; }
        st.t += dt;
        if (st.t < PULSE) st.plunger = PLUNGER_REST - (PLUNGER_REST - PLUNGER_HIT) * (st.t / PULSE);
        else st.plunger = Math.min(PLUNGER_REST, PLUNGER_HIT + (PLUNGER_REST - PLUNGER_HIT) * ((st.t - PULSE) / SETTLE));
        // Plunger hanya mendorong; saat mundur pin tetap di atas karena gesekan silikon.
        pins[k].top = Math.min(pins[k].top, st.plunger - PIN_H);
        if (st.t >= PULSE + SETTLE) { pins[k].top = UP_TOP; st.plunger = PLUNGER_REST; st.targets.shift(); st.t = 0; }
        break;
      }
    }
  }

  function targetsFor(v) {
    return rowPattern(page.lines, v.r, v.d).map((up, k) => up ? k : -1).filter(k => k >= 0);
  }

  function finish() {
    st.cx = PARK_L;
    phys = [0, 1, 2, 3].map(r => [0, 1, 2].map(d => rowPattern(page.lines, r, d)));
    syncPinsFromPhys();
    stop(); setPhase("done");
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000) * speed;
    last = ts;
    // Sub-langkah agar pulsa 30 ms tidak terlewat saat kecepatan tinggi.
    for (let i = 0; i < 5 && st.phase !== "done" && st.phase !== "idle"; i++) step(dt / 5);
    render();
    if (st.phase !== "done" && st.phase !== "idle") raf = requestAnimationFrame(loop);
  }
  function start() { last = performance.now(); raf = requestAnimationFrame(loop); setPhase(st.phase); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  function run() {
    if (!page) return;
    if (st.phase === "idle" || st.phase === "done") {
      st = { phase: "rollerDown", cx: PARK_L, cy: ROLLER_UP, plunger: PLUNGER_REST, targets: [], t: 0, real: 0 };
      syncPinsFromPhys();
      setPhase("rollerDown");
      start();
    } else if (raf) { stop(); setPhase(st.phase); }
    else start();
  }

  function changeView() {
    view = { r: +$("mech-line").value, d: +$("mech-dotrow").value };
    if (st.phase === "idle" || st.phase === "done") { syncPinsFromPhys(); render(); }
  }

  $("mech-run").onclick = run;
  $("mech-line").onchange = changeView;
  $("mech-dotrow").onchange = changeView;
  $("mech-speed").oninput = e => { speed = +e.target.value; $("mech-speed-out").textContent = speed + "×"; };

  document.addEventListener("braille:page", e => {
    page = e.detail;
    $("mech-page").textContent = pageTime(page.lines).toFixed(0) + " s";
    if (!phys) phys = [0, 1, 2, 3].map(() => [0, 1, 2].map(() => Array(COLS * 2).fill(false)));
    stop();
    st.phase = "idle";
    syncPinsFromPhys();
    render();
    setPhase("idle");
    if ($("mech-auto").checked) run();
  });
  render();
}
