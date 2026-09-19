/* RADIOMED — SPA (vanilla JS) — all routes incl. settings + delete + sample preview */
const API = "";
let AUTH_TOKEN = localStorage.getItem("radiomed.token") || null;
let CURRENT_USER = null;
try { CURRENT_USER = JSON.parse(localStorage.getItem("radiomed.user") || "null"); } catch (e) {}

const MODALITY_SAMPLES = {
  "MRI":   { img: "/static/assets/samples/meningioma.jpg", classes: "Glioma · Meningioma · Pituitary · No Tumor" },
  "X-Ray": { img: "/static/assets/samples/xray_pneumonia.jpg", classes: "Normal · Pneumonia" },
  "CT":    { img: "/static/assets/samples/ct_adenocarcinoma.png", classes: "Normal · Adenocarcinoma · Large Cell · Squamous" },
};

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  let res;
  try { res = await fetch(API + path, { ...opts, headers }); }
  catch (e) { throw new Error(`Network error: ${e.message}`); }
  let data = null;
  const ctype = res.headers.get("content-type") || "";
  if (ctype.includes("application/json")) data = await res.json().catch(() => null);
  else if (ctype.includes("application/pdf")) { const blob = await res.blob(); return { ok: res.ok, status: res.status, blob }; }
  else { data = await res.text().catch(() => null); }
  if (!res.ok) {
    const err = new Error((data && data.message) || `Request failed (${res.status})`);
    err.payload = data; err.status = res.status; throw err;
  }
  return { ok: true, status: res.status, data };
}

function toast(msg, type = "default", ttl = 3500) {
  const stack = document.getElementById("toast-stack");
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => { el.classList.add("removing"); setTimeout(() => el.remove(), 250); }, ttl);
}

function animateIn(el) { el.classList.remove("page-enter"); void el.offsetWidth; el.classList.add("page-enter"); }

const ROUTES = ["landing", "login", "register", "dashboard", "diagnose", "patients", "models", "settings"];

function currentRoute() {
  const h = location.hash.replace(/^#\/?/, "") || "landing";
  return ROUTES.includes(h) ? h : "landing";
}

function navigate(route) { location.hash = `#/${route}`; }
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

function render() {
  const route = currentRoute();
  const root = document.getElementById("root");
  const isAuthRoute = (route === "login" || route === "register");
  const isLanding = (route === "landing");
  if (!AUTH_TOKEN && !isAuthRoute && !isLanding) { location.hash = "#/landing"; return render(); }
  if (AUTH_TOKEN && isAuthRoute) { location.hash = "#/dashboard"; return render(); }
  if (route === "landing") { root.innerHTML = ""; renderLanding(); return; }
  if (route === "login" || route === "register") {
    root.innerHTML = "";
    root.appendChild(document.getElementById("tpl-auth").content.cloneNode(true));
    renderAuth(route === "register");
    return;
  }
  root.innerHTML = "";
  root.appendChild(document.getElementById("tpl-app").content.cloneNode(true));
  hydrateShell();
  const content = document.getElementById("content");
  animateIn(content);
  document.querySelectorAll(".sidebar__link").forEach(a => a.classList.toggle("is-active", a.dataset.route === route));
  const crumb = { dashboard: "Overview", diagnose: "New diagnosis", patients: "Patient records", models: "Model registry", settings: "Settings" }[route] || "—";
  document.getElementById("crumb-current").textContent = crumb;
  switch (route) {
    case "dashboard": renderDashboard(content); break;
    case "diagnose":  renderDiagnose(content); break;
    case "patients":  renderPatients(content); break;
    case "models":    renderModels(content); break;
    case "settings":  renderSettings(content); break;
  }
}

function hydrateShell() {
  const initials = (CURRENT_USER?.name || "DR").split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  document.getElementById("sb-avatar").textContent = initials;
  document.getElementById("sb-name").textContent = CURRENT_USER?.name || "—";
  document.getElementById("sb-role").textContent = CURRENT_USER?.role || "clinician";
  document.getElementById("sb-logout").addEventListener("click", signOut);
  document.getElementById("btn-new-diagnosis").addEventListener("click", () => navigate("diagnose"));
}

function signOut() {
  AUTH_TOKEN = null; CURRENT_USER = null;
  localStorage.removeItem("radiomed.token");
  localStorage.removeItem("radiomed.user");
  toast("Signed out.", "success");
  navigate("landing");
}

const ICON_USER = `<svg class="field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19.2c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/></svg>`;
const ICON_MAIL = `<svg class="field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/></svg>`;
const ICON_LOCK = `<svg class="field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
const ICON_ARROW = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
const ICON_EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_EYE_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2"/><path d="M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.2 4.1"/><path d="M6.1 6.1C3.9 7.8 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.8-.8"/></svg>`;

function renderAuth(isRegister) {
  const panelLink = document.getElementById("auth-panel-link");
  panelLink.innerHTML = isRegister
    ? `<a class="auth__panel-link" href="#/login">Already have an account? Sign in ${ICON_ARROW}</a>`
    : `<a class="auth__panel-link" href="#/register">New here? Create an account ${ICON_ARROW}</a>`;

  const submitLabel = isRegister ? "Create account" : "Sign in";
  const card = document.getElementById("auth-card");
  card.innerHTML = `
    <h1>${isRegister ? "Create your account" : "Welcome back"}</h1>
    <p class="auth__card-sub">${isRegister
      ? "Set up a clinician workspace. You'll be reviewing MRI, CT, and X-ray studies in under a minute."
      : "Enter your credentials to access the diagnostic workbench."}</p>
    <form id="auth-form">
      ${isRegister ? `<div class="field">
        <label class="field__label" for="af-name">Full name</label>
        <div class="field__control">${ICON_USER}<input class="field__input" id="af-name" name="name" type="text" required placeholder="Dr. Maya Costache" autocomplete="name"></div>
      </div>` : ""}
      <div class="field">
        <label class="field__label" for="af-email">Email</label>
        <div class="field__control">${ICON_MAIL}<input class="field__input" id="af-email" name="email" type="email" required placeholder="you@hospital.org" autocomplete="email"></div>
      </div>
      <div class="field">
        <label class="field__label" for="af-pw">Password</label>
        <div class="field__control has-toggle">
          ${ICON_LOCK}
          <input class="field__input" id="af-pw" name="password" type="password" required minlength="8" placeholder="••••••••" autocomplete="${isRegister ? "new-password" : "current-password"}">
          <button type="button" class="field__toggle" id="af-pw-toggle" aria-label="Show password">${ICON_EYE}</button>
        </div>
        ${isRegister ? `<div class="field__hint">Use at least 8 characters. We hash with bcrypt (12 rounds).</div>` : ""}
      </div>
      <button class="btn btn--primary btn--block btn--lg" type="submit" id="auth-submit"><span id="auth-submit-label">${submitLabel}</span> ${ICON_ARROW}</button>
      <div id="auth-error" class="field__error" style="margin-top:10px"></div>
    </form>
    <div class="auth__or">or</div>
    <div class="auth__switch">${isRegister
      ? `Already have an account? <a href="#/login">Sign in ${ICON_ARROW}</a>`
      : `New here? <a href="#/register">Create an account ${ICON_ARROW}</a>`}</div>
    ${!isRegister ? `<div class="auth__demo-box"><strong>Demo credentials</strong><br>Email: <code>demo@radiomed.ai</code> · Password: <code>radiomed123</code></div>` : ""}
  `;

  const toggle = document.getElementById("af-pw-toggle");
  const pw = document.getElementById("af-pw");
  toggle.addEventListener("click", () => {
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    toggle.innerHTML = show ? ICON_EYE_OFF : ICON_EYE;
    toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  const form = document.getElementById("auth-form");
  const errEl = document.getElementById("auth-error");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";
    const submit = document.getElementById("auth-submit");
    const label = document.getElementById("auth-submit-label");
    submit.disabled = true;
    label.textContent = isRegister ? "Creating account…" : "Signing in…";
    const fd = new FormData(form);
    const payload = {};
    fd.forEach((v, k) => payload[k] = v);
    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const { data } = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
      AUTH_TOKEN = data.token;
      CURRENT_USER = data.user;
      localStorage.setItem("radiomed.token", AUTH_TOKEN);
      localStorage.setItem("radiomed.user", JSON.stringify(CURRENT_USER));
      toast(isRegister ? "Account created — welcome." : "Signed in.", "success");
      navigate("dashboard");
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      submit.disabled = false;
      label.textContent = submitLabel;
    }
  });
}

function renderLanding() {
  document.getElementById("root").innerHTML = `
    <div class="landing">
      <nav class="landing-nav">
        <a href="#/landing" class="landing-nav__brand"><div class="landing-nav__mark"></div><div><div class="landing-nav__name">Radiomed</div><div class="landing-nav__tag">Clinical Decision Support</div></div></a>
        <div class="landing-nav__links">
          <a href="javascript:void(0)" onclick="document.getElementById('how-it-works').scrollIntoView({behavior:'smooth'});return false;">How it works</a>
          <a href="javascript:void(0)" onclick="document.getElementById('models').scrollIntoView({behavior:'smooth'});return false;">Models</a>
          <a href="javascript:void(0)" onclick="document.getElementById('examples').scrollIntoView({behavior:'smooth'});return false;">Examples</a>
          <a href="javascript:void(0)" onclick="document.getElementById('about').scrollIntoView({behavior:'smooth'});return false;">About</a>
        </div>
        <div class="landing-nav__actions">
          <a href="#/login" class="btn btn--sm">Sign in</a>
          <a href="#/register" class="btn btn--primary btn--sm">Get started <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
        </div>
      </nav>
      <section class="hero">
        <div class="hero__inner">
          <div class="hero__content">
            <h1 class="hero__title">Smarter Diagnosis.<br><em>Better Care.</em></h1>
            <p class="hero__sub">Radiomed pairs three validated DenseNet classifiers with Grad-CAM explainability, automated PDF reporting, and a full audit trail — built for reading rooms where seconds matter and trust is non-negotiable.</p>
            <div class="hero__cta">
              <a href="#/diagnose" class="btn btn--primary btn--lg">Start diagnosis <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
              <a href="javascript:void(0)" class="btn btn--lg" onclick="document.getElementById('how-it-works').scrollIntoView({behavior:'smooth'});return false;">See how it works</a>
            </div>
            <div class="hero__trust">
              <div class="hero__trust-item"><div class="hero__trust-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/></svg></div><div><div class="hero__trust-label">Accurate</div><div class="hero__trust-sub">Validated CNN classifiers</div></div></div>
              <div class="hero__trust-item"><div class="hero__trust-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div><div><div class="hero__trust-label">Explainable</div><div class="hero__trust-sub">Grad-CAM activation maps</div></div></div>
              <div class="hero__trust-item"><div class="hero__trust-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg></div><div><div class="hero__trust-label">Reported</div><div class="hero__trust-sub">Auto-generated PDFs</div></div></div>
              <div class="hero__trust-item"><div class="hero__trust-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><div><div class="hero__trust-label">Secure</div><div class="hero__trust-sub">JWT auth · anonymized intake</div></div></div>
            </div>
          </div>
          <div class="hero__visual">
            <div class="hero__mockup">
              <div class="hero__mockup-bar"><span></span><span></span><span></span></div>
              <div class="hero__mockup-body">
                <div class="hero__mockup-tile"><img src="/static/assets/samples/glioma.jpg" alt="Brain MRI"><div class="hero__mockup-tile-cap"><span>Brain MRI</span><span class="conf">99.8%</span></div></div>
                <div class="hero__mockup-tile"><img src="/static/assets/samples/xray_pneumonia.jpg" alt="Chest X-ray"><div class="hero__mockup-tile-cap"><span>Chest X-ray</span><span class="conf">99.2%</span></div></div>
                <div class="hero__mockup-tile"><img src="/static/assets/samples/ct_adenocarcinoma.png" alt="Lung CT"><div class="hero__mockup-tile-cap"><span>Lung CT</span><span class="conf">87.4%</span></div></div>
                <div class="hero__mockup-tile"><img src="/static/assets/samples/no_tumor.jpg" alt="Brain MRI normal"><div class="hero__mockup-tile-cap"><span>Brain MRI</span><span class="conf">99.9%</span></div></div>
              </div>
            </div>
            <div class="hero__card-overlay hero__card-overlay-1"><div class="hero__card-overlay-head"><div><div class="hero__card-overlay-label">Brain MRI</div><div class="hero__card-overlay-finding">Pituitary Tumor</div></div><div class="hero__card-overlay-conf hero__card-overlay-conf--teal">99.8%</div></div><div class="hero__card-overlay-bar"><div class="hero__card-overlay-fill hero__card-overlay-fill--teal" style="width:99%"></div></div></div>
            <div class="hero__card-overlay hero__card-overlay-2"><div class="hero__card-overlay-head"><div><div class="hero__card-overlay-label">Chest X-ray</div><div class="hero__card-overlay-finding">Pneumonia</div></div><div class="hero__card-overlay-conf hero__card-overlay-conf--clay">99.2%</div></div><div class="hero__card-overlay-bar"><div class="hero__card-overlay-fill hero__card-overlay-fill--clay" style="width:99%"></div></div></div>
          </div>
        </div>
      </section>
      <section class="stats-strip">
        <div class="stats-strip__inner">
          <div class="stats-strip__item"><div class="stats-strip__num">3</div><div class="stats-strip__label">Validated models</div></div>
          <div class="stats-strip__item"><div class="stats-strip__num">10</div><div class="stats-strip__label">Pathologies covered</div></div>
          <div class="stats-strip__item"><div class="stats-strip__num">&lt; 3<span class="stats-strip__num-unit">s</span></div><div class="stats-strip__label">Inference time</div></div>
          <div class="stats-strip__item"><div class="stats-strip__num">14,616</div><div class="stats-strip__label">Training images</div></div>
        </div>
      </section>
      <section class="section" id="models">
        <div class="section__inner">
          <div class="section__head"><div><div class="section__kicker">Validated models</div><h2 class="section__title">Three specialized networks, one workflow.</h2><p class="section__sub">Each model is a DenseNet121 fine-tuned on a labelled medical imaging dataset. Predictions return per-class probabilities and Grad-CAM activation overlays so clinicians can see where the model looked.</p></div></div>
          <div class="model-grid">
            <div class="model-card"><div class="model-card__image"><img src="/static/assets/samples/meningioma.jpg" alt="Brain MRI scan"><span class="model-card__chip model-card__chip--teal">MRI</span></div><div class="model-card__body"><div class="model-card__num">Model 01 · Brain</div><h3 class="model-card__title">Brain tumour classifier</h3><p class="model-card__desc">Trained on 7,023 MRI axial slices to distinguish glioma, meningioma, pituitary adenoma, and normal tissue. Grad-CAM highlights the tumour bed.</p><div class="model-card__classes"><span class="chip">Glioma</span><span class="chip">Meningioma</span><span class="chip">Pituitary</span><span class="chip">No Tumor</span></div></div></div>
            <div class="model-card"><div class="model-card__image"><img src="/static/assets/samples/xray_pneumonia.jpg" alt="Chest X-ray"><span class="model-card__chip model-card__chip--clay">X-Ray</span></div><div class="model-card__body"><div class="model-card__num">Model 02 · Chest</div><h3 class="model-card__title">Pneumonia detector</h3><p class="model-card__desc">Trained on 5,863 paediatric chest X-rays. Identifies consolidation consistent with pneumonia and overlays the Grad-CAM activation region.</p><div class="model-card__classes"><span class="chip">Normal</span><span class="chip">Pneumonia</span></div></div></div>
            <div class="model-card"><div class="model-card__image"><img src="/static/assets/samples/ct_adenocarcinoma.png" alt="Lung CT scan"><span class="model-card__chip model-card__chip--sage">CT</span></div><div class="model-card__body"><div class="model-card__num">Model 03 · Lung</div><h3 class="model-card__title">Lung cancer classifier</h3><p class="model-card__desc">Trained on 1,730 axial CT slices to predict histological subtype — adenocarcinoma, large cell, squamous cell, or normal.</p><div class="model-card__classes"><span class="chip">Normal</span><span class="chip">Adenocarcinoma</span><span class="chip">Large Cell</span><span class="chip">Squamous</span></div></div></div>
          </div>
        </div>
      </section>
      <section class="section" id="how-it-works">
        <div class="section__inner">
          <div class="section__head"><div><div class="section__kicker">Workflow</div><h2 class="section__title">From image to insight, in four steps.</h2><p class="section__sub">A complete diagnostic pipeline — preprocessing, inference, Grad-CAM explainability, and PDF report generation — typically completes in under three seconds per scan.</p></div></div>
          <div class="steps">
            <div class="step"><div class="step__connector"></div><div class="step__num">1</div><div class="step__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div><h3 class="step__title">Upload scan</h3><p class="step__desc">Drag and drop an MRI, CT, or X-ray image. Patient identifiers are anonymized at intake — no PHI is stored.</p></div>
            <div class="step"><div class="step__connector"></div><div class="step__num">2</div><div class="step__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg></div><h3 class="step__title">AI analysis</h3><p class="step__desc">The image is resized to 224×224, normalized, and passed through the modality-specific DenseNet classifier.</p></div>
            <div class="step"><div class="step__connector"></div><div class="step__num">3</div><div class="step__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg></div><h3 class="step__title">View results</h3><p class="step__desc">Per-class probabilities, predicted label, severity tier, and Grad-CAM overlay highlighting the regions driving the prediction.</p></div>
            <div class="step"><div class="step__num">4</div><div class="step__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg></div><h3 class="step__title">Get report</h3><p class="step__desc">A clinician-ready PDF report — full page, branded, with the prediction banner, confidence, images, and clinical note.</p></div>
          </div>
        </div>
      </section>
      <section class="section" id="examples">
        <div class="section__inner">
          <div class="section__head"><div><div class="section__kicker">Case gallery</div><h2 class="section__title">Real predictions from real scans.</h2><p class="section__sub">Each tile below is an actual inference run from the Radiomed pipeline — the same prediction, confidence, and Grad-CAM overlay the platform surfaces in every clinical report.</p></div></div>
          <div class="examples">
            <div class="example"><div class="example__image"><img src="/static/assets/samples/no_tumor.jpg" alt="Brain MRI normal"><span class="example__badge example__badge--normal">Normal</span></div><div class="example__meta"><div class="example__finding">No Tumor</div><div class="example__sub"><span>Brain MRI · 4 classes</span><span class="conf">99.99%</span></div></div></div>
            <div class="example"><div class="example__image"><img src="/static/assets/samples/xray_pneumonia.jpg" alt="Chest X-ray pneumonia"><span class="example__badge example__badge--abnormal">Abnormal</span></div><div class="example__meta"><div class="example__finding">Pneumonia</div><div class="example__sub"><span>Chest X-ray · 2 classes</span><span class="conf">99.20%</span></div></div></div>
            <div class="example"><div class="example__image"><img src="/static/assets/samples/ct_adenocarcinoma.png" alt="Lung CT adenocarcinoma"><span class="example__badge example__badge--abnormal">Abnormal</span></div><div class="example__meta"><div class="example__finding">Adenocarcinoma</div><div class="example__sub"><span>Lung CT · 4-class histology</span><span class="conf">37.55%</span></div></div></div>
          </div>
        </div>
      </section>
      <section class="cta-section" id="about">
        <div class="cta-section__inner">
          <div class="cta-section__kicker">Get started</div>
          <h2 class="cta-section__title">Ready to put your scans to work?</h2>
          <p class="cta-section__sub">Spin up Radiomed locally and run your first diagnosis in under a minute. The demo workspace includes a seeded clinician account and sample images for all three modalities.</p>
          <div class="cta-section__actions">
            <a href="#/register" class="btn btn--lg btn--on-dark">Create an account <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
            <a href="#/login" class="btn btn--lg btn--ghost-on-dark">Sign in</a>
          </div>
        </div>
      </section>
      <footer class="footer">
        <div class="footer__inner">
          <div><div class="footer__brand"><div class="landing-nav__mark" style="width:24px;height:24px"></div><div class="landing-nav__name" style="font-size:16px">Radiomed</div></div><p class="footer__desc">An automated medical image diagnosis assistant built on validated DenseNet classifiers and Grad-CAM explainability. For clinical decision support only — not a substitute for licensed radiologist review.</p></div>
          <div class="footer__col"><div class="footer__col-title">Product</div><ul><li><a href="#/dashboard">Dashboard</a></li><li><a href="#/diagnose">New diagnosis</a></li><li><a href="#/patients">Patient records</a></li><li><a href="#/models">Model registry</a></li></ul></div>
          <div class="footer__col"><div class="footer__col-title">Models</div><ul><li><a href="javascript:void(0)" onclick="document.getElementById('models').scrollIntoView({behavior:'smooth'});return false;">Brain tumour (MRI)</a></li><li><a href="javascript:void(0)" onclick="document.getElementById('models').scrollIntoView({behavior:'smooth'});return false;">Pneumonia (X-Ray)</a></li><li><a href="javascript:void(0)" onclick="document.getElementById('models').scrollIntoView({behavior:'smooth'});return false;">Lung cancer (CT)</a></li></ul></div>
          <div class="footer__col"><div class="footer__col-title">Resources</div><ul><li><a href="javascript:void(0)" onclick="document.getElementById('how-it-works').scrollIntoView({behavior:'smooth'});return false;">How it works</a></li><li><a href="javascript:void(0)" onclick="document.getElementById('examples').scrollIntoView({behavior:'smooth'});return false;">Case gallery</a></li><li><a href="javascript:void(0)" onclick="document.getElementById('about').scrollIntoView({behavior:'smooth'});return false;">About</a></li></ul></div>
        </div>
        <div class="footer__bottom"><div>© 2026 Radiomed · Clinical Decision Support</div><div>HIPAA-ready · Anonymized intake · JWT auth</div></div>
      </footer>
    </div>
  `;
}

async function renderDashboard(el) {
  el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-head__kicker">${greeting()}, ${escapeHtml((CURRENT_USER?.name || "clinician").split(/\s+/)[0])}</div>
        <h1 class="page-head__title">Reading room overview</h1>
        <p class="page-head__sub">A live snapshot of your diagnostic activity across MRI, CT, and X-ray studies. Findings marked critical require clinician sign-off within 24 hours per protocol.</p>
      </div>
      <div class="page-head__actions">
        <button class="btn" id="dash-refresh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg> Refresh</button>
        <button class="btn btn--primary" onclick="location.hash='#/diagnose'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> New diagnosis</button>
      </div>
    </div>
    <div class="grid-4" id="dash-stats" style="margin-bottom:24px">
      <div class="stat"><div class="stat__label">Total studies</div><div class="stat__value skeleton" style="width:80px;height:32px"></div></div>
      <div class="stat"><div class="stat__label">Critical</div><div class="stat__value skeleton" style="width:60px;height:32px"></div></div>
      <div class="stat"><div class="stat__label">Abnormal</div><div class="stat__value skeleton" style="width:60px;height:32px"></div></div>
      <div class="stat"><div class="stat__label">Normal</div><div class="stat__value skeleton" style="width:60px;height:32px"></div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card__head"><div><div class="card__title">Recent studies</div><div class="card__subtitle">Your last 6 reads</div></div><a href="#/patients" class="text-sm">View all →</a></div>
        <div class="card__body" style="padding:0"><table class="table"><thead><tr><th>Patient</th><th>Modality</th><th>Finding</th><th>Conf.</th><th>When</th></tr></thead><tbody id="dash-recent"><tr><td colspan="5" style="text-align:center;padding:24px;color:var(--c-ink-3)">Loading…</td></tr></tbody></table></div>
      </div>
      <div class="card">
        <div class="card__head"><div><div class="card__title">Modality distribution</div><div class="card__subtitle">Breakdown of your activity</div></div></div>
        <div class="card__body" id="dash-modality"><div class="empty"><div class="empty__icon"></div><div class="empty__hint">No data yet.</div></div></div>
      </div>
    </div>
  `;
  document.getElementById("dash-refresh").addEventListener("click", () => renderDashboard(el));
  try {
    const [{ data: stats }, { data: scans }] = await Promise.all([api("/api/dashboard/stats"), api("/api/scans")]);
    document.getElementById("dash-stats").innerHTML = `
      <div class="stat"><div class="stat__label">Total studies</div><div class="stat__value">${stats.total_scans}</div><div class="stat__delta">All-time activity</div></div>
      <div class="stat"><div class="stat__label">Critical</div><div class="stat__value" style="color:var(--c-coral)">${stats.critical}</div><div class="stat__delta">Requires sign-off</div></div>
      <div class="stat"><div class="stat__label">Abnormal</div><div class="stat__value" style="color:var(--c-clay)">${stats.abnormal}</div><div class="stat__delta">Pending follow-up</div></div>
      <div class="stat"><div class="stat__label">Normal</div><div class="stat__value" style="color:var(--c-teal)">${stats.normal}</div><div class="stat__delta">No acute finding</div></div>
    `;
    const tbody = document.getElementById("dash-recent");
    const recent = (scans.scans || []).slice(0, 6);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><div class="empty__icon"></div><div class="empty__title">No studies yet</div><div class="empty__hint">Run your first diagnosis to populate this list.</div></div></td></tr>`;
    } else {
      tbody.innerHTML = recent.map(s => `
        <tr style="cursor:pointer" data-scan="${s.id}">
          <td><strong class="mono">${escapeHtml(s.patient_code)}</strong>${s.age ? ` <span class="muted">· ${s.age}${s.sex ? "/" + s.sex[0].toUpperCase() : ""}</span>` : ""}</td>
          <td>${modalityChip(s.modality)}</td>
          <td>${severityBadge(s.severity)} <span style="color:var(--c-ink);font-weight:500">${escapeHtml(s.predicted_label)}</span></td>
          <td>${confidenceCell(s.confidence)}</td>
          <td class="muted text-sm">${timeAgo(s.created_at)}</td>
        </tr>`).join("");
    }
    const md = document.getElementById("dash-modality");
    const mod = stats.by_modality || {};
    const keys = Object.keys(mod);
    if (keys.length === 0) {
      md.innerHTML = `<div class="empty"><div class="empty__icon"></div><div class="empty__hint">No scans recorded yet.</div></div>`;
    } else {
      const total = Object.values(mod).reduce((a, b) => a + b, 0) || 1;
      md.innerHTML = `
        <div class="problist" style="gap:14px">
          ${keys.sort((a, b) => mod[b] - mod[a]).map((k, i) => {
            const pct = Math.round((mod[k] / total) * 100);
            return `<div class="problist__row is-predicted" style="animation-delay:${i*80}ms"><div class="problist__label">${escapeHtml(k)}</div><div class="problist__bar"><div class="problist__fill" style="width:${pct}%"></div></div><div class="problist__pct">${mod[k]} · ${pct}%</div></div>`;
          }).join("")}
        </div>`;
    }
  } catch (e) {
    toast(`Failed to load dashboard: ${e.message}`, "error");
  }
}

function renderDiagnose(el) {
  el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-head__kicker">New study</div>
        <h1 class="page-head__title">Analyze a scan</h1>
        <p class="page-head__sub">Upload a medical image and select the corresponding modality. The pipeline runs preprocessing, inference, and Grad-CAM explainability in sequence — typically under three seconds on a CPU node.</p>
      </div>
    </div>
    <div class="card">
      <div class="card__head"><div><div class="card__title">Study details</div><div class="card__subtitle">Patient identifiers are anonymized at intake</div></div></div>
      <div class="card__body">
        <div class="field-row">
          <div class="field"><label class="field__label" for="d-patient-name">Patient name <span class="muted">· optional</span></label><input class="field__input" id="d-patient-name" type="text" placeholder="John Doe"><div class="field__hint">Optional. If omitted, the report will show only the patient code.</div></div>
          <div class="field"><label class="field__label" for="d-patient-code">Patient code <span class="muted">· auto-generated</span></label><div class="flex center gap-2"><input class="field__input mono" id="d-patient-code" type="text" readonly placeholder="RM-2026-0001" style="background:var(--c-bg-alt);color:var(--c-ink-2)"><button class="btn btn--sm" id="btn-regen-code" type="button" title="Regenerate code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg></button></div><div class="field__hint">Auto-generated from the server. Click the icon to fetch a fresh code.</div></div>
        </div>
        <div class="field-row">
          <div class="field"><label class="field__label">Age <span class="muted">· optional</span></label><input class="field__input" id="d-age" type="number" min="0" max="130" placeholder="54"></div>
          <div class="field"><label class="field__label">Sex <span class="muted">· optional</span></label><select class="field__select" id="d-sex"><option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></div>
        </div>
        <div class="field">
          <label class="field__label">Modality <span class="muted">· click a sample to select</span></label>
          <div class="modality-preview" id="modality-preview">
            ${Object.entries(MODALITY_SAMPLES).map(([m, info]) => `
              <div class="modality-preview__tile ${m === 'MRI' ? 'is-active' : ''}" data-modality="${m}">
                <img src="${info.img}" alt="${m} sample">
                <div class="modality-preview__classes">${info.classes}</div>
                <div class="modality-preview__cap"><span>${m}</span><span>▶</span></div>
              </div>`).join("")}
          </div>
        </div>
        <div class="field">
          <label class="field__label">Image</label>
          <div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="Upload image">
            <input type="file" id="file-input" accept="image/*" style="display:none">
            <div class="dropzone__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
            <div class="dropzone__title">Drop image here, or click to browse</div>
            <div class="dropzone__hint" id="dz-hint">Accepts PNG, JPG, BMP. Recommended: 224×224 or larger, single slice.</div>
            <div class="dropzone__preview" id="dz-preview" style="display:none"></div>
          </div>
        </div>
        <div id="modality-guidance" class="text-sm muted" style="margin-bottom:18px;max-width:60ch;line-height:1.6"><strong style="color:var(--c-ink-2)">MRI guidance.</strong> Use a T1c axial slice through the level of the lateral ventricles. The brain-tumor classifier covers glioma, meningioma, pituitary adenoma, and no-tumor.</div>
        <div class="flex between" style="gap:14px;align-items:center">
          <div class="muted text-sm" id="ready-status">Select an image to enable analysis.</div>
          <button class="btn btn--primary btn--lg" id="btn-analyze" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg> Run analysis</button>
        </div>
      </div>
    </div>
    <div id="result-area"></div>
  `;

  let selectedModality = "MRI";
  const preview = document.getElementById("modality-preview");
  preview.querySelectorAll(".modality-preview__tile").forEach(tile => {
    tile.addEventListener("click", () => {
      preview.querySelectorAll(".modality-preview__tile").forEach(t => t.classList.remove("is-active"));
      tile.classList.add("is-active");
      selectedModality = tile.dataset.modality;
      updateGuidance();
      updateReady();
    });
  });

  function updateGuidance() {
    const g = document.getElementById("modality-guidance");
    const map = {
      "MRI":   "<strong style=\"color:var(--c-ink-2)\">MRI guidance.</strong> Use a T1c axial slice through the level of the lateral ventricles. The brain-tumor classifier covers glioma, meningioma, pituitary adenoma, and no-tumor.",
      "X-Ray": "<strong style=\"color:var(--c-ink-2)\">X-Ray guidance.</strong> Use a single frontal PA chest radiograph. The pneumonia classifier distinguishes normal from pneumonia; Grad-CAM is overlaid when pneumonia is predicted.",
      "CT":    "<strong style=\"color:var(--c-ink-2)\">CT guidance.</strong> Use an axial lung-window slice through the suspicious nodule. The lung-cancer classifier covers adenocarcinoma, large cell carcinoma, squamous cell carcinoma, and normal.",
    };
    g.innerHTML = map[selectedModality];
  }

  async function refreshPatientCode() {
    const codeInput = document.getElementById("d-patient-code");
    codeInput.value = "Generating…";
    codeInput.disabled = true;
    try { const { data } = await api("/api/patients/next-code"); codeInput.value = data.code; }
    catch (err) { const year = new Date().getFullYear(); codeInput.value = `RM-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`; }
    finally { codeInput.disabled = false; }
  }
  refreshPatientCode();
  document.getElementById("btn-regen-code").addEventListener("click", refreshPatientCode);

  const dz = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  let selectedFile = null;
  dz.addEventListener("click", () => fileInput.click());
  dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener("change", () => { if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]); });
  ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("is-drag"); }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("is-drag"); }));
  dz.addEventListener("drop", e => { if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });

  function handleFile(file) {
    if (!file.type.startsWith("image/")) { toast("Please select an image file.", "error"); return; }
    selectedFile = file;
    const prev = document.getElementById("dz-preview");
    prev.innerHTML = "";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = "Selected scan preview";
    prev.appendChild(img);
    const cap = document.createElement("div");
    cap.className = "text-xs muted";
    cap.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
    prev.appendChild(cap);
    prev.style.display = "flex";
    document.getElementById("dz-hint").textContent = "Replace or drag another image.";
    updateReady();
  }

  function updateReady() {
    const code = document.getElementById("d-patient-code").value.trim();
    const ready = code.length > 0 && selectedFile !== null;
    document.getElementById("btn-analyze").disabled = !ready;
    document.getElementById("ready-status").textContent = ready ? "Ready to run inference." : (code.length === 0 ? "Waiting for patient code…" : "Select an image to continue.");
  }
  document.getElementById("d-patient-code").addEventListener("input", updateReady);

  document.getElementById("btn-analyze").addEventListener("click", async () => {
    const btn = document.getElementById("btn-analyze");
    btn.disabled = true;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/></svg> Running…`;
    showPhases();
    const phaseEls = document.querySelectorAll("#result-area .phase");
    phaseEls[0].classList.add("is-active");
    setTimeout(() => { phaseEls[0].classList.remove("is-active"); phaseEls[0].classList.add("is-done"); phaseEls[1].classList.add("is-active"); }, 350);
    setTimeout(() => { phaseEls[1].classList.remove("is-active"); phaseEls[1].classList.add("is-done"); phaseEls[2].classList.add("is-active"); }, 900);

    const fd = new FormData();
    fd.append("image", selectedFile);
    fd.append("modality", selectedModality);
    fd.append("patient_code", document.getElementById("d-patient-code").value.trim());
    fd.append("patient_name", document.getElementById("d-patient-name").value.trim());
    const age = document.getElementById("d-age").value;
    if (age) fd.append("age", age);
    const sex = document.getElementById("d-sex").value;
    if (sex) fd.append("sex", sex);

    try {
      const { data } = await api("/api/diagnose", { method: "POST", body: fd });
      setTimeout(() => { phaseEls[2].classList.remove("is-active"); phaseEls[2].classList.add("is-done"); renderResult(data); }, 500);
    } catch (err) {
      document.getElementById("result-area").innerHTML = `
        <div class="card" style="margin-top:22px;border-left:3px solid var(--c-coral)">
          <div class="card__body">
            <div style="font-weight:600;color:var(--c-coral);margin-bottom:4px">Inference failed</div>
            <div class="text-sm">${escapeHtml(err.message)}</div>
            ${err.status === 503 ? `<div class="text-sm muted" style="margin-top:8px">Copy your trained .keras files into the <code>models/</code> directory and restart the server.</div>` : ""}
          </div>
        </div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg> Run analysis`;
    }
  });

  function showPhases() {
    document.getElementById("result-area").innerHTML = `
      <div class="phases" style="margin-top:22px">
        <div class="phase"><span class="phase__dot"></span><span>Preprocessing image — resizing to 224×224, normalizing intensity</span></div>
        <div class="phase"><span class="phase__dot"></span><span>Running forward pass through selected model</span></div>
        <div class="phase"><span class="phase__dot"></span><span>Computing Grad-CAM explainability overlay</span></div>
      </div>
    `;
  }

  function renderResult(data) {
    const sevBadge = severityBadge(data.severity);
    const pct = Math.round(data.confidence * 100);
    const probsHtml = (data.probabilities || []).map(p => {
      const isPred = p.label === data.predicted_label;
      const w = Math.max(2, Math.round(p.prob * 100));
      return `<div class="problist__row ${isPred ? "is-predicted" : ""}"><div class="problist__label">${escapeHtml(p.label)}</div><div class="problist__bar"><div class="problist__fill" style="width:${w}%"></div></div><div class="problist__pct">${(p.prob * 100).toFixed(1)}%</div></div>`;
    }).join("");

    const gradcamHeatmapHtml = data.gradcam_b64
      ? `<div class="result__image-tile"><div class="result__image-frame"><img src="data:image/png;base64,${data.gradcam_b64}" alt="Grad-CAM heatmap overlay"></div><figcaption><span class="result__image-tag">Grad-CAM overlay</span><span class="result__image-dim">JET heatmap</span></figcaption></div>`
      : `<div class="result__image-tile"><div class="result__image-frame" style="background:var(--c-bg-alt)"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--c-line-strong)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg></div><figcaption><span class="result__image-tag">Grad-CAM overlay</span><span class="result__image-dim">n/a — normal finding</span></figcaption></div>`;
    const gradcamSolidHtml = data.gradcam_solid_b64
      ? `<div class="result__image-tile"><div class="result__image-frame"><img src="data:image/png;base64,${data.gradcam_solid_b64}" alt="Solid highlight overlay"></div><figcaption><span class="result__image-tag">Highlight overlay</span><span class="result__image-dim">${severityColorLabel(data.severity)}</span></figcaption></div>`
      : gradcamHeatmapHtml;
    const initialGradcamHtml = gradcamSolidHtml;
    const patientLine = data.patient_name ? `${escapeHtml(data.patient_name)} · <span class="mono">${escapeHtml(data.patient_code)}</span>` : `<span class="mono">${escapeHtml(data.patient_code)}</span>`;

    document.getElementById("result-area").innerHTML = `
      <div class="card" style="margin-top:22px">
        <div class="card__head">
          <div><div class="card__title">Interpretation</div><div class="card__subtitle">Patient ${patientLine} · ${data.modality} · Scan #${data.scan_id}</div></div>
          ${sevBadge}
        </div>
        <div class="card__body">
          <div class="result__headline">
            <div><div class="result__prediction">${escapeHtml(data.predicted_label)}</div><div class="result__prediction-sub">${data.severity === "normal" ? "No acute finding detected" : (data.severity === "critical" ? "Critical finding — recommend urgent review" : "Abnormal finding detected")}</div></div>
            <div class="result__confidence"><div class="result__confidence-num">${pct}%</div><div class="text-xs muted">confidence</div></div>
          </div>
          <div class="problist" style="margin-bottom:20px">${probsHtml}</div>
          <div class="flex between" style="margin-bottom:12px;align-items:center">
            <div class="text-xs muted" style="letter-spacing:0.08em;text-transform:uppercase;font-weight:600">Visual evidence</div>
            ${data.gradcam_b64 && data.gradcam_solid_b64 ? `<div class="segment" id="overlay-mode-toggle" role="tablist"><button class="segment__option is-active" data-mode="solid">Highlight</button><button class="segment__option" data-mode="heatmap">Heatmap</button></div>` : ""}
          </div>
          <div class="result__images" id="gradcam-container">
            <div class="result__image-tile"><div class="result__image-frame"><img src="${data.image_url}" alt="Original image"></div><figcaption><span class="result__image-tag">Original · ${data.modality}</span><span class="result__image-dim">224×224 normalized</span></figcaption></div>
            ${initialGradcamHtml}
          </div>
          ${data.clinical_note ? `<div style="margin-top:22px;padding:16px 18px;background:var(--c-surface-soft);border-left:3px solid var(--c-teal);border-radius:0 var(--r-sm) var(--r-sm) 0"><div class="text-xs muted" style="letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;font-weight:600">Clinical note</div><div class="text-sm" style="line-height:1.6;color:var(--c-ink)">${escapeHtml(data.clinical_note)}</div></div>` : ""}
          <div class="flex" style="gap:10px;margin-top:20px;justify-content:flex-end">
            <button class="btn" id="btn-redo">Run another scan</button>
            <button class="btn btn--primary" id="btn-report" data-scan="${data.scan_id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg> Generate PDF report</button>
          </div>
        </div>
      </div>
    `;

    if (data.gradcam_b64 && data.gradcam_solid_b64) {
      document.querySelectorAll("#overlay-mode-toggle .segment__option").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll("#overlay-mode-toggle .segment__option").forEach(b => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          const mode = btn.dataset.mode;
          const container = document.getElementById("gradcam-container");
          const tiles = container.querySelectorAll(".result__image-tile");
          if (tiles.length >= 2) { tiles[1].remove(); container.insertAdjacentHTML("beforeend", mode === "heatmap" ? gradcamHeatmapHtml : gradcamSolidHtml); }
        });
      });
    }

    document.getElementById("btn-redo").addEventListener("click", () => renderDiagnose(document.getElementById("content")));
    document.getElementById("btn-report").addEventListener("click", async (e) => {
      const scanId = e.currentTarget.dataset.scan;
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/></svg> Generating…`;
      try {
        await api(`/api/scans/${scanId}/report`, { method: "POST" });
        toast("Report generated. Opening in new tab…", "success");
        window.open(`/api/scans/${scanId}/report.pdf`, "_blank");
      } catch (err) { toast(`Report failed: ${err.message}`, "error"); }
      finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg> Generate PDF report`;
      }
    });
  }
}

async function renderPatients(el) {
  el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-head__kicker">Patient records</div>
        <h1 class="page-head__title">Study history</h1>
        <p class="page-head__sub">A complete audit trail of interpreted studies. Filter by modality or severity, or search by patient code. Delete individual scans or clear all history.</p>
      </div>
      <div class="page-head__actions">
        <button class="btn btn--danger" id="pats-clear-all"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Clear all</button>
        <button class="btn" id="pats-refresh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg> Refresh</button>
      </div>
    </div>
    <div class="card">
      <div class="card__head">
        <div class="flex center gap-3">
          <div class="segment" id="filter-modality"><button class="segment__option is-active" data-filter="all">All</button><button class="segment__option" data-filter="MRI">MRI</button><button class="segment__option" data-filter="X-Ray">X-Ray</button><button class="segment__option" data-filter="CT">CT</button></div>
          <div class="segment" id="filter-severity"><button class="segment__option is-active" data-filter="all">Any finding</button><button class="segment__option" data-filter="normal">Normal</button><button class="segment__option" data-filter="abnormal">Abnormal</button><button class="segment__option" data-filter="critical">Critical</button></div>
        </div>
        <div class="text-sm muted" id="pats-count">—</div>
      </div>
      <div class="card__body" style="padding:0">
        <table class="table" id="pats-table">
          <thead><tr><th>Patient</th><th>Modality</th><th>Finding</th><th>Confidence</th><th>Severity</th><th>Report</th><th>Performed</th><th></th></tr></thead>
          <tbody id="pats-tbody"><tr><td colspan="8" style="text-align:center;padding:36px;color:var(--c-ink-3)">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  let allScans = [];
  let filterMod = "all", filterSev = "all";

  document.getElementById("pats-refresh").addEventListener("click", load);
  document.getElementById("pats-clear-all").addEventListener("click", async () => {
    if (!confirm("Delete ALL scans and patient records? This cannot be undone.")) return;
    try { const { data } = await api("/api/scans", { method: "DELETE" }); toast(`Deleted ${data.count} scan(s).`, "success"); load(); }
    catch (err) { toast(`Failed: ${err.message}`, "error"); }
  });
  document.querySelectorAll("#filter-modality .segment__option").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#filter-modality .segment__option").forEach(x => x.classList.remove("is-active"));
      b.classList.add("is-active"); filterMod = b.dataset.filter; renderRows();
    });
  });
  document.querySelectorAll("#filter-severity .segment__option").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#filter-severity .segment__option").forEach(x => x.classList.remove("is-active"));
      b.classList.add("is-active"); filterSev = b.dataset.filter; renderRows();
    });
  });

  async function load() {
    try { const { data } = await api("/api/scans"); allScans = data.scans || []; renderRows(); }
    catch (e) { toast(`Failed to load scans: ${e.message}`, "error"); }
  }

  function renderRows() {
    const tbody = document.getElementById("pats-tbody");
    const filtered = allScans.filter(s =>
      (filterMod === "all" || s.modality === filterMod) &&
      (filterSev === "all" || s.severity === filterSev));
    document.getElementById("pats-count").textContent = `${filtered.length} of ${allScans.length} studies`;
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty"><div class="empty__icon"></div><div class="empty__title">No studies match these filters</div><div class="empty__hint">Try clearing a filter or running a new diagnosis.</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(s => `
      <tr data-scan="${s.id}">
        <td>
          <strong class="mono">${escapeHtml(s.patient_code)}</strong>
          ${s.patient_name ? `<div class="text-xs" style="color:var(--c-ink-2)">${escapeHtml(s.patient_name)}</div>` : ""}
          ${s.age ? `<div class="muted text-xs">${s.age}${s.sex ? " · " + s.sex[0].toUpperCase() : ""}</div>` : ""}
        </td>
        <td>${modalityChip(s.modality)}</td>
        <td>${escapeHtml(s.predicted_label)}</td>
        <td>${confidenceCell(s.confidence)}</td>
        <td>${severityBadge(s.severity)}</td>
        <td>${s.report_path ? `<button class="btn btn--sm" data-report="${s.id}">Download</button>` : `<button class="btn btn--sm btn--ghost" data-generate="${s.id}">Generate</button>`}</td>
        <td class="muted text-sm">${timeAgo(s.created_at)}</td>
        <td><button class="btn btn--sm btn--ghost" data-delete="${s.id}" title="Delete scan" style="color:var(--c-coral)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-report]").forEach(b => {
      b.addEventListener("click", (e) => { e.stopPropagation(); window.open(`/api/scans/${b.dataset.report}/report.pdf`, "_blank"); });
    });
    tbody.querySelectorAll("[data-generate]").forEach(b => {
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = b.dataset.generate;
        b.disabled = true; b.textContent = "…";
        try { await api(`/api/scans/${id}/report`, { method: "POST" }); toast("Report generated.", "success"); load(); }
        catch (err) { toast(`Failed: ${err.message}`, "error"); b.disabled = false; b.textContent = "Generate"; }
      });
    });
    tbody.querySelectorAll("[data-delete]").forEach(b => {
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = b.dataset.delete;
        if (!confirm("Delete this scan and its uploaded images?")) return;
        try { await api(`/api/scans/${id}`, { method: "DELETE" }); toast("Scan deleted.", "success"); load(); }
        catch (err) { toast(`Failed: ${err.message}`, "error"); }
      });
    });
  }

  await load();
}

async function renderModels(el) {
  let status = { brain_mri: false, pneumonia_xray: false, lung_ct: false };
  try { const { data } = await api("/api/models/status"); status = data; } catch (e) { }

  el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-head__kicker">Model registry</div>
        <h1 class="page-head__title">Validated diagnostic models</h1>
        <p class="page-head__sub">Three independent convolutional networks drive the diagnostic pipeline. Each model was trained on labelled medical imaging data and exposes per-class outputs suitable for clinical decision support.</p>
      </div>
    </div>
    <div class="card" style="margin-bottom:20px">
      <div class="card__body">
        <div class="text-sm muted" style="letter-spacing:0.1em;text-transform:uppercase;font-weight:600;margin-bottom:8px">Model files on disk</div>
        <div class="flex gap-3" style="flex-wrap:wrap">
          <div class="badge ${status.brain_mri ? 'badge--normal' : 'badge--critical'}"><span class="badge__dot"></span>Brain MRI: ${status.brain_mri ? 'available' : 'MISSING'}</div>
          <div class="badge ${status.pneumonia_xray ? 'badge--normal' : 'badge--critical'}"><span class="badge__dot"></span>Pneumonia X-Ray: ${status.pneumonia_xray ? 'available' : 'MISSING'}</div>
          <div class="badge ${status.lung_ct ? 'badge--normal' : 'badge--critical'}"><span class="badge__dot"></span>Lung CT: ${status.lung_ct ? 'available' : 'MISSING'}</div>
        </div>
        ${(!status.brain_mri || !status.pneumonia_xray || !status.lung_ct) ? `
          <div class="text-sm" style="margin-top:12px;color:var(--c-coral);line-height:1.6">
            <strong>Setup needed:</strong> Copy your trained .keras files into the <code>models/</code> directory:
            <ul style="margin-top:6px;padding-left:18px">
              ${!status.brain_mri ? '<li><code>best_model.keras</code> (brain tumour MRI)</li>' : ''}
              ${!status.pneumonia_xray ? '<li><code>pnemonia.keras</code> (chest X-ray pneumonia)</li>' : ''}
              ${!status.lung_ct ? '<li><code>lungs_cancer_classification.keras</code> (lung CT cancer)</li>' : ''}
            </ul>
            Then restart the server.
          </div>` : `<div class="text-sm" style="margin-top:12px;color:var(--c-teal);font-weight:500">✓ All 3 models loaded — ready for inference.</div>`}
      </div>
    </div>
    <div class="grid-3">
      ${modelCard({name:"Brain tumour classifier", modality:"MRI", arch:"DenseNet121", input:"224×224×3", classes:["Glioma","Meningioma","Pituitary","No Tumor"], file:"best_model.keras", available:status.brain_mri, note:"Designed for T1c axial MRI slices. Grad-CAM highlights the tumour bed for gliomas, meningiomas, and pituitary adenomas; suppressed for normal studies."})}
      ${modelCard({name:"Pneumonia detector", modality:"X-Ray", arch:"DenseNet121", input:"224×224×3", classes:["Normal","Pneumonia"], file:"pnemonia.keras", available:status.pneumonia_xray, note:"Trained on chest X-rays. The Grad-CAM overlay draws attention to consolidation regions when pneumonia is predicted."})}
      ${modelCard({name:"Lung cancer classifier", modality:"CT", arch:"DenseNet121", input:"224×224×3", classes:["Normal","Adenocarcinoma","Large Cell","Squamous"], file:"lungs_cancer_classification.keras", available:status.lung_ct, note:"Designed for axial CT lung-window slices. Predicts histological subtype from a single slice; tissue confirmation by biopsy is required."})}
    </div>
  `;
}

function modelCard(m) {
  return `
    <div class="card">
      <div class="card__head"><div><div class="card__title">${escapeHtml(m.name)}</div><div class="card__subtitle">${m.modality} · ${m.arch}</div></div>${modalityChip(m.modality)}</div>
      <div class="card__body">
        <div class="grid-2" style="gap:10px 18px;font-size:12.5px">
          <div><span class="muted">Input shape</span><br><span class="mono">${m.input}</span></div>
          <div><span class="muted">Status</span><br><span style="color:${m.available ? 'var(--c-teal)' : 'var(--c-coral)'};font-weight:600">${m.available ? '● Available' : '● Missing'}</span></div>
        </div>
        <div style="margin-top:14px"><div class="text-xs muted" style="letter-spacing:0.1em;text-transform:uppercase;font-weight:600;margin-bottom:8px">Output classes</div><div class="flex" style="flex-wrap:wrap;gap:6px">${m.classes.map(c => `<span class="chip">${escapeHtml(c)}</span>`).join("")}</div></div>
        <div style="margin-top:14px;font-size:12.5px;color:var(--c-ink-2);line-height:1.6">${m.note}</div>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--c-line);font-size:11px;color:var(--c-ink-3);font-family:var(--font-mono)">${escapeHtml(m.file)}</div>
      </div>
    </div>`;
}

function renderSettings(el) {
  el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-head__kicker">Settings</div>
        <h1 class="page-head__title">Account &amp; workspace</h1>
        <p class="page-head__sub">Manage your clinician account, sign out of the current session, or permanently delete your account and all associated data.</p>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-section__title">Account information</div>
      <div class="settings-section__desc">Your signed-in clinician profile.</div>
      <div class="settings-row">
        <div class="settings-row__info"><div class="settings-row__label">Name</div><div class="settings-row__sub">Used on PDF reports as the reviewing clinician.</div></div>
        <div class="mono">${escapeHtml(CURRENT_USER?.name || "—")}</div>
      </div>
      <div class="settings-row">
        <div class="settings-row__info"><div class="settings-row__label">Email</div><div class="settings-row__sub">Used for sign-in.</div></div>
        <div class="mono">${escapeHtml(CURRENT_USER?.email || "—")}</div>
      </div>
      <div class="settings-row">
        <div class="settings-row__info"><div class="settings-row__label">Role</div><div class="settings-row__sub">Determines available actions.</div></div>
        <div class="chip">${escapeHtml(CURRENT_USER?.role || "clinician")}</div>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-section__title">Session</div>
      <div class="settings-section__desc">End your current session. You'll need to sign in again to access the workbench.</div>
      <div class="settings-row">
        <div class="settings-row__info"><div class="settings-row__label">Sign out</div><div class="settings-row__sub">Clears your local token. Your data is preserved.</div></div>
        <button class="btn" id="settings-signout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Sign out</button>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-section__title">Danger zone</div>
      <div class="settings-section__desc">Permanently delete your account and all associated data — scans, patient records, and uploaded images. This action cannot be undone.</div>
      <div class="settings-row">
        <div class="settings-row__info"><div class="settings-row__label" style="color:var(--c-coral)">Delete account</div><div class="settings-row__sub">All your scans, patients, reports, and the account itself will be removed from the server.</div></div>
        <button class="btn btn--danger" id="settings-delete-account"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete account</button>
      </div>
    </div>
  `;
  document.getElementById("settings-signout").addEventListener("click", signOut);
  document.getElementById("settings-delete-account").addEventListener("click", async () => {
    if (!confirm("Are you sure? This will PERMANENTLY delete your account, all scans, all patient records, and all uploaded images. This cannot be undone.")) return;
    if (!confirm("Last confirmation — click OK to proceed with account deletion.")) return;
    try {
      await api("/api/auth/account", { method: "DELETE" });
      toast("Account deleted.", "success");
      AUTH_TOKEN = null; CURRENT_USER = null;
      localStorage.removeItem("radiomed.token");
      localStorage.removeItem("radiomed.user");
      navigate("landing");
    } catch (err) { toast(`Failed: ${err.message}`, "error"); }
  });
}

function severityBadge(severity) {
  const map = { normal: { cls: "badge--normal", label: "Normal" }, abnormal: { cls: "badge--warn", label: "Abnormal" }, critical: { cls: "badge--critical", label: "Critical" } };
  const m = map[severity] || { cls: "badge--neutral", label: severity };
  return `<span class="badge ${m.cls}"><span class="badge__dot"></span>${m.label}</span>`;
}
function modalityChip(modality) {
  const colors = { "MRI": { bg: "var(--c-teal-50)", fg: "var(--c-teal-700)", bd: "var(--c-teal-20)" }, "X-Ray": { bg: "var(--c-clay-50)", fg: "#8C5424", bd: "#ECD4B5" }, "CT": { bg: "var(--c-sage-50)", fg: "#3F5A3D", bd: "#C8D5BE" } };
  const c = colors[modality] || colors["MRI"];
  return `<span class="chip" style="background:${c.bg};color:${c.fg};border-color:${c.bd};font-weight:600">${escapeHtml(modality)}</span>`;
}
function confidenceCell(value) {
  const pct = Math.round((value || 0) * 100);
  return `<div class="confidence"><div class="confidence__bar"><div class="confidence__fill" style="width:${pct}%"></div></div><span class="tnum">${pct}%</span></div>`;
}
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "Z");
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function escapeHtml(str) { if (str == null) return ""; return String(str).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function greeting() { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 18) return "Good afternoon"; return "Good evening"; }
function severityColorLabel(severity) { const m = { critical: "red · critical", abnormal: "green · abnormal", normal: "blue · normal" }; return m[severity] || severity; }

const styleSheet = document.createElement("style");
styleSheet.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    const s = document.getElementById("topbar-search");
    if (s) s.focus();
  }
});
