// SakuSafe — UI controller and hybrid routing.
//
// Routing policy (the heart of the app):
//   Instant scan → on-device Gemini Nano via Firebase AI Logic
//                  (InferenceMode.ONLY_ON_DEVICE). If Nano is unavailable in
//                  this browser, the local heuristic engine stands in and the
//                  result is labeled "Demo engine" — never silently faked.
//   Deep audit   → cloud Gemini 2.5 Flash via Firebase AI Logic.
//                  Falls back to the local engine (full depth) if Firebase is
//                  not configured or the call fails, again labeled honestly.
//   "Simulate on-device" toggle lets judges on ANY browser experience the
//   triage path (fast, top-3 flags) exactly as Nano users see it.

import { probeOnDevice, analyzeOnDevice, analyzeCloud, isFirebaseConfigured } from "./ai.js";
import { analyzeLocally, SAMPLES } from "./analyzer.js";

const $ = (id) => document.getElementById(id);
const els = {
  badge: $("modeBadge"), input: $("msgInput"), chips: $("sampleChips"),
  btnTriage: $("btnTriage"), btnDeep: $("btnDeep"), simulate: $("chkSimulate"),
  routeLog: $("routeLog"), result: $("result"), score: $("scoreNum"),
  gauge: $("gaugeFill"), engine: $("engineBadge"), verdict: $("verdict"),
  highlighted: $("highlighted"), flags: $("flagList"), tacticsWrap: $("tacticsWrap"),
  tacticChips: $("tacticChips"), advice: $("adviceList"),
};

let nanoState = "unsupported";

function logRoute(msg) {
  els.routeLog.textContent = msg;
}

function setModeBadge() {
  const sim = els.simulate.checked;
  if (sim) {
    els.badge.textContent = "🧪 Simulating on-device triage";
    els.badge.className = "badge badge-ondevice";
  } else if (nanoState === "available") {
    els.badge.textContent = "⚡ Gemini Nano available — instant scan stays on this device";
    els.badge.className = "badge badge-ondevice";
  } else if (isFirebaseConfigured()) {
    els.badge.textContent = "☁️ Cloud route via Firebase AI Logic (Nano not in this browser)";
    els.badge.className = "badge badge-cloud";
  } else {
    els.badge.textContent = "🧪 Demo mode — add a Firebase config to go live (docs/FIREBASE-SETUP.md)";
    els.badge.className = "badge badge-demo";
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function highlight(text, flags) {
  let out = escapeHtml(text);
  // Longest excerpts first so nested matches don't fragment.
  const excerpts = [...new Set(flags.map((f) => f.excerpt).filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  for (const ex of excerpts) {
    const esc = escapeHtml(ex).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(esc, "gi"), (m) => `<mark>${m}</mark>`);
  }
  return out;
}

function scoreColor(score) {
  if (score >= 60) return "var(--bad)";
  if (score >= 35) return "var(--warn)";
  if (score >= 15) return "#ffd23d";
  return "var(--good)";
}

function render(text, analysis, engineLabel, engineClass) {
  els.result.classList.remove("hidden");
  els.score.textContent = analysis.riskScore;
  els.gauge.style.width = `${analysis.riskScore}%`;
  els.gauge.style.background = scoreColor(analysis.riskScore);
  els.engine.textContent = engineLabel;
  els.engine.className = `badge ${engineClass}`;
  els.verdict.textContent = analysis.verdict;
  els.highlighted.innerHTML = highlight(text, analysis.redFlags);

  els.flags.innerHTML = analysis.redFlags.length
    ? analysis.redFlags.map((f) => `
      <li>
        <span class="flag-name">${escapeHtml(f.pattern)}</span>
        ${f.excerpt ? ` — <span class="flag-ex">“${escapeHtml(f.excerpt)}”</span>` : ""}
        <span class="flag-why">${escapeHtml(f.explanation)}</span>
      </li>`).join("")
    : `<li class="none">No red-flag patterns matched. Stay alert anyway — new scam scripts appear daily.</li>`;

  if (analysis.tactics && analysis.tactics.length) {
    els.tacticsWrap.classList.remove("hidden");
    els.tacticChips.innerHTML = analysis.tactics.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("");
  } else {
    els.tacticsWrap.classList.add("hidden");
  }

  els.advice.innerHTML = (analysis.advice || []).map((a) => `<li>${escapeHtml(a)}</li>`).join("");
  els.result.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getTextOrWarn() {
  const text = els.input.value.trim();
  if (text.length < 10) {
    logRoute("⚠️ Paste a message first (at least a sentence or two).");
    els.input.focus();
    return null;
  }
  return text;
}

async function runTriage() {
  const text = getTextOrWarn();
  if (!text) return;
  els.btnTriage.disabled = true;
  const t0 = performance.now();
  try {
    if (els.simulate.checked) {
      logRoute("🧪 Simulated on-device triage (local engine, top-3 flags) — same UX as the Nano path.");
      render(text, analyzeLocally(text, "triage"), "🧪 Simulated on-device (demo engine)", "badge-demo");
      return;
    }
    if (nanoState === "available" && isFirebaseConfigured()) {
      logRoute("⚡ Routing to Gemini Nano ON-DEVICE via Firebase AI Logic… your text is not uploaded.");
      const analysis = await analyzeOnDevice(text);
      const ms = Math.round(performance.now() - t0);
      logRoute(`⚡ Analyzed on-device by Gemini Nano in ${ms} ms — 0 bytes of your message left this device.`);
      render(text, analysis, "⚡ Gemini Nano · on-device via Firebase AI Logic", "badge-ondevice");
      return;
    }
    const reason = !isFirebaseConfigured()
      ? "Firebase not configured — running the built-in demo engine. See docs/FIREBASE-SETUP.md to go live."
      : `Gemini Nano is ${nanoState} in this browser — running the built-in demo engine for triage.`;
    logRoute(`🧪 ${reason}`);
    render(text, analyzeLocally(text, "triage"), "🧪 Demo engine (local triage)", "badge-demo");
  } catch (err) {
    logRoute(`⚠️ On-device model call failed (${err.message}). Falling back to the local demo engine.`);
    render(text, analyzeLocally(text, "triage"), "🧪 Demo engine (fallback)", "badge-demo");
  } finally {
    els.btnTriage.disabled = false;
  }
}

async function runDeep() {
  const text = getTextOrWarn();
  if (!text) return;
  els.btnDeep.disabled = true;
  const t0 = performance.now();
  try {
    if (isFirebaseConfigured()) {
      logRoute("☁️ Escalating to Gemini 2.5 Flash via Firebase AI Logic (cloud)…");
      const analysis = await analyzeCloud(text);
      const ms = Math.round(performance.now() - t0);
      logRoute(`☁️ Deep audit completed by Gemini cloud in ${ms} ms via Firebase AI Logic.`);
      render(text, analysis, "☁️ Gemini 2.5 Flash · cloud via Firebase AI Logic", "badge-cloud");
      return;
    }
    logRoute("🧪 Firebase not configured — deep audit running on the built-in demo engine. See docs/FIREBASE-SETUP.md to go live.");
    render(text, analyzeLocally(text, "deep"), "🧪 Demo engine (local deep audit)", "badge-demo");
  } catch (err) {
    logRoute(`⚠️ Cloud call failed (${err.message}). Falling back to the local demo engine.`);
    render(text, analyzeLocally(text, "deep"), "🧪 Demo engine (fallback)", "badge-demo");
  } finally {
    els.btnDeep.disabled = false;
  }
}

function init() {
  for (const s of SAMPLES) {
    const b = document.createElement("button");
    b.className = "sample-chip";
    b.textContent = s.label;
    b.addEventListener("click", () => { els.input.value = s.text; els.input.focus(); });
    els.chips.appendChild(b);
  }
  els.btnTriage.addEventListener("click", runTriage);
  els.btnDeep.addEventListener("click", runDeep);
  els.simulate.addEventListener("change", setModeBadge);
  probeOnDevice().then((r) => { nanoState = r.state; setModeBadge(); });
  setModeBadge();
}

init();
