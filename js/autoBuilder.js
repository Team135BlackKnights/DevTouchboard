import { nt4Client, currentConnected } from "./ui.js";

// -------------------- Field + Robot constants --------------------
const FIELD = {
  width: 8.0692,     // meters (y in WPI field coords)
  halfLength: 8.2705 // meters (x from BLUE wall to center line)
};

const ROBOT = {
  width: 0.962,      // meters
  length: 0.834,     // meters
  rearGap: 0.254     // 10 inches in meters
};

const START_POSES = {
  LEFT:   { x: 4.398, y: 0.475, headingDeg: 0 },
  CENTER: { x: 3.62, y: 4.0346, headingDeg: 0 },
  RIGHT:  { x: 4.398, y: 7.586, headingDeg: 0 }
};

// -------------------- DOM --------------------
const orderHolder = document.querySelector(".orderHolder");
const savedDropdown = document.querySelector(".savedDropdown");
const finalStringPre = document.querySelector(".finalString");

const saveNameInput = document.querySelector(".saveName");
const saveBtn = document.querySelector(".save");
const deleteBtn = document.querySelector(".delete");
const clearBtn = document.querySelector(".clear");
const sendBtn = document.querySelector(".send");

const startBtns = Array.from(document.querySelectorAll(".startBtn"));
const startMarkers = Array.from(document.querySelectorAll(".startMarker"));
const zones = Array.from(document.querySelectorAll(".zone"));

const plannedPath = document.getElementById("plannedPath");
const waypointsG = document.getElementById("waypoints");
const robotOutline = document.getElementById("robotOutline");

const paramModal = document.getElementById("paramModal");
const paramTitle = document.getElementById("paramModalTitle");
const paramSelect = document.getElementById("paramModalSelect");
const paramCancel = document.getElementById("paramModalCancel");
const paramOk = document.getElementById("paramModalOk");

let toastHost = document.getElementById("toastHost");
if (!toastHost) {
  toastHost = document.createElement("div");
  toastHost.id = "toastHost";
  toastHost.className = "toastHost";
  document.body.appendChild(toastHost);
}

// -------------------- State --------------------
let currentStart = "CENTER";
let selectedSaveIndex = -1;
let pendingModalResolve = null;

// -------------------- Utils --------------------
function clampInt(n, lo, hi) {
  const v = Math.round(Number(n));
  if (Number.isNaN(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

// WPI field coords (x forward from BLUE, y left->right)
// -> SVG coords (x right, y down) for our "blue up" half-field view:
//   xSvg = y
//   ySvg = halfLength - x
function fieldToSvg(pt) {
  return { x: pt.y, y: FIELD.halfLength - pt.x };
}

function fmt(n, digits = 3) {
  return Number(n).toFixed(digits).replace(/\.?0+$/, "");
}

function toast(msg, kind = "ok") {
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  toastHost.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 180);
  }, 1100);
}

function pulseSend() {
  if (!sendBtn) return;
  sendBtn.classList.remove("sendPulse");
  // force reflow
  void sendBtn.offsetWidth;
  sendBtn.classList.add("sendPulse");
  if (navigator.vibrate) navigator.vibrate(35);
}

function stepLabel(step) {
  switch (step.type) {
    case "CHUTE":
      return `Chute (at ${step.atSecondsRemaining}s remaining)`;
    case "DEPOT":
      return `Depot (at ${step.atSecondsRemaining}s remaining)`;
    case "INTAKE":
      return `Intake (until ${step.untilSecondsRemaining}s remaining)`;
    case "TRENCH":
      return `Trench (${step.choice} at ${step.atSecondsRemaining}s remaining)`;
    case "HANG":
      return `Hang (at ${step.atSecondsRemaining}s remaining)`;
    default:
      return step.type;
  }
}

function showModal({ title, options, defaultValue }) {
  paramTitle.textContent = title;
  paramSelect.innerHTML = "";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = String(opt.value);
    o.textContent = opt.label;
    paramSelect.appendChild(o);
  }
  paramSelect.value = String(defaultValue);

  paramModal.classList.remove("hidden");

  return new Promise((resolve) => {
    pendingModalResolve = resolve;
  });
}

function hideModal() {
  paramModal.classList.add("hidden");
  pendingModalResolve = null;
}

paramCancel?.addEventListener("click", () => {
  if (pendingModalResolve) pendingModalResolve(null);
  hideModal();
});

paramOk?.addEventListener("click", () => {
  if (pendingModalResolve) pendingModalResolve(paramSelect.value);
  hideModal();
});

paramModal?.addEventListener("click", (e) => {
  if (e.target === paramModal) {
    if (pendingModalResolve) pendingModalResolve(null);
    hideModal();
  }
});

// -------------------- Plan model --------------------
function getStoredPlans() {
  const raw = localStorage.getItem("paths2026");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStoredPlans(plans) {
  localStorage.setItem("paths2026", JSON.stringify(plans));
}

function getCurrentPlan() {
  const raw = localStorage.getItem("currentPlan2026");
  if (!raw) return { start: "CENTER", steps: [] };
  try {
    const plan = JSON.parse(raw);
    if (!plan || typeof plan !== "object") return { start: "CENTER", steps: [] };
    if (!Array.isArray(plan.steps)) plan.steps = [];
    if (!plan.start) plan.start = "CENTER";
    return plan;
  } catch {
    return { start: "CENTER", steps: [] };
  }
}

function setCurrentPlan(plan) {
  localStorage.setItem("currentPlan2026", JSON.stringify(plan));
}

function setCurrentStart(startKey) {
  currentStart = startKey;
  const plan = getCurrentPlan();
  plan.start = startKey;
  setCurrentPlan(plan);

  for (const b of startBtns) b.classList.toggle("active", b.dataset.start === startKey);
  for (const m of startMarkers) m.classList.toggle("active", m.dataset.start === startKey);

  render();
}

function addStep(step) {
  const plan = getCurrentPlan();
  plan.steps.push(step);
  setCurrentPlan(plan);
  render();
}

function removeStep(index) {
  const plan = getCurrentPlan();
  plan.steps.splice(index, 1);
  setCurrentPlan(plan);
  render();
}

function moveStep(from, to) {
  const plan = getCurrentPlan();
  const [it] = plan.steps.splice(from, 1);
  plan.steps.splice(to, 0, it);
  setCurrentPlan(plan);
  render();
}

// -------------------- Build robot outline --------------------
function updateRobotOutline() {
  const start = START_POSES[currentStart];
  if (!start) return;

  const rearGap = ROBOT.rearGap;

  const x0 = start.x;
  const y0 = start.y;

  const L = ROBOT.length;
  const W = ROBOT.width;

  const pts = [
    { x: x0 - L / 2, y: y0 - W / 2 },
    { x: x0 + L / 2, y: y0 - W / 2 },
    { x: x0 + L / 2, y: y0 + W / 2 },
    { x: x0 - L / 2, y: y0 + W / 2 },
    { x: x0 - L / 2, y: y0 + W / 2 - rearGap },
    { x: x0 - L / 2, y: y0 - W / 2 + rearGap },
    { x: x0 - L / 2, y: y0 - W / 2 }
  ];

  const svgPts = pts.map(fieldToSvg);
  const d = "M " + svgPts.map(p => `${fmt(p.x)} ${fmt(p.y)}`).join(" L ");
  robotOutline.setAttribute("d", d);
}

// -------------------- Waypoints / Polyline --------------------
function clearWaypoints() {
  waypointsG.innerHTML = "";
  plannedPath.setAttribute("points", "");
}

function rebuildWaypointsFromPlan(plan) {
  clearWaypoints();

  const pointsField = [];
  pointsField.push(START_POSES[plan.start]);

  for (const step of plan.steps) {
    if (step.anchor) pointsField.push(step.anchor);
  }

  const pointsSvg = pointsField.map(fieldToSvg);
  plannedPath.setAttribute(
    "points",
    pointsSvg.map(p => `${fmt(p.x)} ${fmt(p.y)}`).join(" ")
  );

  // Draw animation on the line only (no waypoint motion)
  try {
    const len = plannedPath.getTotalLength();
    plannedPath.classList.remove("reveal");
    plannedPath.style.strokeDasharray = `${len}`;
    plannedPath.style.strokeDashoffset = `${len}`;
    plannedPath.getBoundingClientRect();
    plannedPath.classList.add("reveal");
  } catch { /* ignore */ }

  for (let i = 0; i < pointsSvg.length; i++) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("class", "waypoint");
    c.setAttribute("cx", fmt(pointsSvg[i].x));
    c.setAttribute("cy", fmt(pointsSvg[i].y));
    c.setAttribute("r", "0.085");
    c.setAttribute("vector-effect", "non-scaling-stroke");
    c.style.animationDelay = `${i * 0.06}s`; // fade-in only
    waypointsG.appendChild(c);
  }
}

// -------------------- Render UI --------------------
function renderPlanList(plan) {
  orderHolder.innerHTML = "";

  plan.steps.forEach((step, idx) => {
    const row = document.createElement("div");
    row.className = "ordered";
    row.draggable = true;
    row.dataset.index = String(idx);

    const label = document.createElement("div");
    label.className = "orderedLabel";
    label.textContent = `${idx + 1}. ${stepLabel(step)}`;

    const del = document.createElement("button");
    del.className = "orderedRemove";
    del.textContent = "×";
    del.addEventListener("click", () => removeStep(idx));

    row.appendChild(label);
    row.appendChild(del);

    row.addEventListener("dragstart", (e) => {
      row.classList.add("dragging");
      e.dataTransfer.setData("text/plain", String(idx));
      e.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragend", () => row.classList.remove("dragging"));

    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData("text/plain"));
      const to = idx;
      if (!Number.isFinite(from) || from === to) return;
      moveStep(from, to);
    });

    orderHolder.appendChild(row);
  });
}

function renderSavedDropdown() {
  const plans = getStoredPlans();

  if (!savedDropdown) return;

  // preserve selection if possible
  const prev = savedDropdown.value;

  savedDropdown.innerHTML = `<option value="">(select a path)</option>`;
  plans.forEach((p, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = p.name || `Path ${idx + 1}`;
    savedDropdown.appendChild(opt);
  });

  if (prev !== "" && Number.isFinite(Number(prev)) && plans[Number(prev)]) {
    savedDropdown.value = prev;
    selectedSaveIndex = Number(prev);
  } else {
    // keep selectedSaveIndex in sync
    if (selectedSaveIndex >= 0 && selectedSaveIndex < plans.length) {
      savedDropdown.value = String(selectedSaveIndex);
    } else {
      selectedSaveIndex = -1;
      savedDropdown.value = "";
    }
  }
}
savedDropdown?.addEventListener("change", () => {
  const plans = getStoredPlans();
  const idx = Number(savedDropdown.value);
  if (!Number.isFinite(idx) || idx < 0 || idx >= plans.length) {
    selectedSaveIndex = -1;
    return;
  }
  selectedSaveIndex = idx;
  setFromString(plans[idx].value);
  toast(`Loaded: ${plans[idx].name}`, "ok");
});


// -------------------- Serialize / Deserialize --------------------

// UI save string (keeps anchors so reload still draws correctly)
function buildUISaveString() {
  const plan = getCurrentPlan();
  return JSON.stringify({
    version: 2026,
    start: plan.start,
    steps: plan.steps
  });
}

// ROBOT payload (NO anchors)
function buildRobotObject() {
  const plan = getCurrentPlan();
  const stripStep = (s) => {
    if (s.type === "INTAKE") return { type: s.type, untilSecondsRemaining: s.untilSecondsRemaining };
    if (s.type === "TRENCH") return { type: s.type, choice: s.choice, atSecondsRemaining: s.atSecondsRemaining };
    if (s.type === "CHUTE") return { type: s.type, atSecondsRemaining: s.atSecondsRemaining };
    if (s.type === "DEPOT") return { type: s.type, atSecondsRemaining: s.atSecondsRemaining };
    if (s.type === "HANG") return { type: s.type, atSecondsRemaining: s.atSecondsRemaining };
    return { type: s.type };
  };

  return {
    version: 2026,
    start: plan.start,
    startPose: START_POSES[plan.start],
    steps: plan.steps.map(stripStep)
  };
}

function updateFinalString() {
  const obj = buildRobotObject();
  const s = JSON.stringify(obj);
  localStorage.setItem("currentPath", s); // UI.js publishes this on connect
  finalStringPre.textContent = s;
  return s;
}

export function setFromString(str) {
  try {
    const obj = JSON.parse(str);
    const start = obj.start ?? "CENTER";
    const steps = Array.isArray(obj.steps) ? obj.steps : [];
    setCurrentPlan({ start, steps });
    currentStart = start;
    setCurrentStart(start);
    render();
  } catch {
    // ignore
  }
}

// -------------------- Event wiring --------------------
startBtns.forEach((b) => b.addEventListener("click", () => setCurrentStart(b.dataset.start)));
startMarkers.forEach((m) => m.addEventListener("click", () => setCurrentStart(m.dataset.start)));

zones.forEach((z) => {
  z.addEventListener("click", async () => {
    const stepType = z.dataset.step;
    const ax = Number(z.dataset.anchorX);
    const ay = Number(z.dataset.anchorY);
    const anchor = Number.isFinite(ax) && Number.isFinite(ay) ? { x: ax, y: ay } : null;

    const timeOptions = [];
    for (let t = 20; t >= 0; t--) timeOptions.push({ value: t, label: `${t} seconds remaining` });

    if (stepType === "INTAKE") {
      const picked = await showModal({
        title: "Intake until…",
        options: timeOptions,
        defaultValue: 9
      });
      if (picked == null) return;
      addStep({
        type: "INTAKE",
        untilSecondsRemaining: clampInt(picked, 0, 20),
        anchor
      });
      return;
    }

    if (stepType === "CHUTE") {
      const picked = await showModal({
        title: "Chute: go at…",
        options: timeOptions,
        defaultValue: 12
      });
      if (picked == null) return;
      addStep({
        type: "CHUTE",
        atSecondsRemaining: clampInt(picked, 0, 20),
        anchor
      });
      return;
    }

    if (stepType === "DEPOT") {
      const picked = await showModal({
        title: "Depot: go at…",
        options: timeOptions,
        defaultValue: 12
      });
      if (picked == null) return;
      addStep({
        type: "DEPOT",
        atSecondsRemaining: clampInt(picked, 0, 20),
        anchor
      });
      return;
    }

    if (stepType === "TRENCH") {
      const options = [
        { value: "LEFT", label: "Left Trench" },
        { value: "RIGHT", label: "Right Trench" },
        { value: "BEST", label: "Pick Best" }
      ];

      const picked = await showModal({
        title: "Trench choice",
        options,
        defaultValue: z.dataset.defaultChoice ?? "BEST"
      });
      if (picked == null) return;

      const atPicked = await showModal({
        title: "Trench: go at…",
        options: timeOptions,
        defaultValue: 10
      });
      if (atPicked == null) return;

      addStep({
        type: "TRENCH",
        choice: picked,
        atSecondsRemaining: clampInt(atPicked, 0, 20),
        anchor
      });
      return;
    }

    if (stepType === "HANG") {
      const picked = await showModal({
        title: "Hang at…",
        options: timeOptions,
        defaultValue: 5
      });
      if (picked == null) return;
      addStep({
        type: "HANG",
        atSecondsRemaining: clampInt(picked, 0, 20),
        anchor
      });
      return;
    }
  });
});

// Save / delete / clear
saveBtn?.addEventListener("click", () => {
  const name = (saveNameInput.value || "").trim();
  if (!name) return;

  const plans = getStoredPlans();
  const uiStr = buildUISaveString();

  const existing = plans.findIndex(p => p.name === name);
  if (existing >= 0) plans[existing] = { name, value: uiStr };
  else plans.push({ name, value: uiStr });

  setStoredPlans(plans);
  selectedSaveIndex = plans.findIndex(p => p.name === name);
  renderSavedDropdown();
  toast("Saved ✓", "ok");
});

deleteBtn?.addEventListener("click", () => {
  const plans = getStoredPlans();
  if (selectedSaveIndex < 0 || selectedSaveIndex >= plans.length) return;
  plans.splice(selectedSaveIndex, 1);
  setStoredPlans(plans);
  selectedSaveIndex = -1;
  renderSavedDropdown();
  toast("Deleted", "warn");
});

clearBtn?.addEventListener("click", () => {
  setCurrentPlan({ start: currentStart, steps: [] });
  render();
  toast("Cleared", "warn");
});

// Send to robot
function enableDisableSend() {
  if (!sendBtn) return;
  sendBtn.disabled = !currentConnected;
  sendBtn.textContent = currentConnected ? "Send to Robot" : "Offline";
}

sendBtn?.addEventListener("click", () => {
  if (!currentConnected) {
    toast("Offline — not sent", "bad");
    return;
  }

  const s = updateFinalString();

  try {
    nt4Client.publishTopic("/touchboard/posePlotterFinalString", "string");
  } catch { /* ignore */ }

  nt4Client.addSample("/touchboard/posePlotterFinalString", s);

  pulseSend();
  toast("Sent ✓", "ok");

  // Quick visual confirmation on the JSON panel
  if (finalStringPre) {
    finalStringPre.classList.remove("flash");
    void finalStringPre.offsetWidth;
    finalStringPre.classList.add("flash");
  }
});

// -------------------- Main render --------------------
function render() {
  const plan = getCurrentPlan();
  currentStart = plan.start;

  updateRobotOutline();
  rebuildWaypointsFromPlan(plan);
  renderPlanList(plan);
  renderSavedDropdown();
  updateFinalString();
  enableDisableSend();
}

// Initial
setCurrentStart(getCurrentPlan().start ?? "CENTER");
render();

// Poll connection status for button enabling
setInterval(enableDisableSend, 250);
