// STATE
const ADMIN_PASSWORD = "Wapdam";
let adminOpen = false;
let adminAuthed = false;
let adminView = "list"; 
let editId = null;
let selectedAccent = "#6366f1";
let i2cStep = "upload"; 
let i2cImgBase64 = null;
let i2cMediaType = "image/png";
let i2cImgSrc = null;
let i2cPreviewData = null;
let pwAttempts = 0;
let pwLocked = false;
let pwLockTimer = 0;
let pwLockInterval = null;

// PASSWORD GATE
function setupPwGate() {
  const inp = document.getElementById("pw-input"), err = document.getElementById("pw-err"), btn = document.getElementById("pw-submit");
  const icon= document.getElementById("pw-icon"), hint= document.getElementById("pw-hint"), box = document.getElementById("pw-box");

  inp.addEventListener("keydown", e => { if (e.key === "Enter") attempt(); });
  btn.addEventListener("click", attempt);

  function attempt() {
    if (pwLocked) return;
    if (inp.value === (window._adminPw || ADMIN_PASSWORD)) {
      adminAuthed = true; adminOpen = true;
      hide(document.getElementById("pw-gate"));
      renderAdmin();
    } else {
      pwAttempts++; inp.classList.add("error"); inp.value = ""; show(err);
      const rem = 3 - pwAttempts;
      err.textContent = rem > 0 ? `Incorrect password. ${rem} attempt${rem !== 1 ? "s" : ""} remaining.` : "Incorrect password.";
      box.style.animation = "shake 0.4s ease";
      setTimeout(() => { box.style.animation = "none"; }, 400);
      if (pwAttempts >= 3) {
        pwLocked = true; pwLockTimer = 30; btn.disabled = true; icon.textContent = "🚫";
        btn.textContent = `Locked (${pwLockTimer}s)`; hint.textContent = `Too many attempts. Wait ${pwLockTimer}s`; inp.disabled = true;
        pwLockInterval = setInterval(() => {
          pwLockTimer--;
          btn.textContent = `Locked (${pwLockTimer}s)`; hint.textContent = `Too many attempts. Wait ${pwLockTimer}s`;
          if (pwLockTimer <= 0) {
            clearInterval(pwLockInterval); pwLocked = false; btn.disabled = false; inp.disabled = false;
            icon.textContent = "🔐"; hint.textContent = "Enter your password to continue"; btn.textContent = "Unlock Admin"; hide(err);
          }
        }, 1000);
      }
      setTimeout(() => inp.classList.remove("error"), 1000);
    }
  }
}

// ADMIN CORE
function renderAdmin() {
  const panel = document.getElementById("admin-panel");
  show(panel);
  renderAdminList();
  showAdminListView();
  populateGhConfigUI();
  initAdminTabs();
}

function showAdminListView() {
  adminView = "list";
  show(document.getElementById("admin-list-view"));
  hide(document.getElementById("admin-form-view"));
  show(document.getElementById("admin-add-btn"));
}

function showAdminFormView(editing = false) {
  adminView = "add";
  hide(document.getElementById("admin-list-view"));
  show(document.getElementById("admin-form-view"));
  hide(document.getElementById("admin-add-btn"));
  document.getElementById("admin-form-header").textContent = editing ? "Edit Dataset" : "New Dataset";
  document.getElementById("form-save-btn").textContent = editing ? "Save Changes" : "Add Dataset";
  resetI2C(); initChartTypeChips(); renderFormPreview();
}

function renderAdminList() {
  const listEl = document.getElementById("admin-ds-list"), emptyEl = document.getElementById("admin-empty"), header = document.getElementById("admin-list-header");
  header.textContent = allDs.length + " datasets";
  if (allDs.length === 0) { listEl.innerHTML = ""; show(emptyEl); return; }
  hide(emptyEl); listEl.innerHTML = "";
  allDs.forEach(ds => {
    const row = document.createElement("div"); row.className = "admin-ds-row";
    const catLabel = CATEGORIES.find(c => c.id === ds.category)?.label || ds.category;
    row.innerHTML = `<div class="drag-handle" title="Drag to reorder">⠿</div><div class="admin-ds-dot" style="background:${ds.accent}"></div>
      <div class="admin-ds-info"><div class="admin-ds-name">${ds.title}</div><div class="admin-ds-meta">${catLabel} · ${ds.chartType} · ${ds.data.length} pts · ${ds.source}</div></div>
      <div class="admin-ds-sparkline" id="sp-${ds.id}"></div><div class="admin-ds-actions"><button class="btn-edit">Edit</button><button class="btn-delete">Delete</button></div>`;
    row.querySelector(".btn-edit").onclick = () => openEdit(ds);
    row.querySelector(".btn-delete").onclick = () => { allDs = allDs.filter(d => d.id !== ds.id); persistDs(); renderAdminList(); showToast("Deleted"); };
    setupDragReorder(row, ds.id); listEl.appendChild(row);
    requestAnimationFrame(() => { const sp = document.getElementById("sp-" + ds.id); if (sp) renderChart(sp, ds, 36, false); });
  });
}

function openEdit(ds) {
  editId = ds.id; selectedAccent = ds.accent;
  document.getElementById("f-title").value = ds.title; document.getElementById("f-subtitle").value = ds.subtitle || "";
  document.getElementById("f-unit").value = ds.unit || ""; document.getElementById("f-source").value = ds.source || "";
  document.getElementById("f-notes").value = ds.notes || ""; document.getElementById("f-updated").value = ds.lastUpdated || "";
  document.getElementById("f-category").value = ds.category; document.getElementById("f-charttype").value = ds.chartType;
  document.getElementById("f-data").value = ds.data.map(r => `${r.label}, ${r.value}`).join("\n");
  document.getElementById("f-compare").value = (ds.compareData||[]).map(r=>`${r.label}, ${r.value}`).join("\n");
  document.getElementById("f-compare-label").value = ds.compareLabel || ""; document.getElementById("f-report").value = ds.report || "";
  document.getElementById("f-insights").value = (ds.insights || []).join("\n");
  const ks = ds.keyStats || [];
  for(let i=1; i<=3; i++) {
    document.getElementById(`ks${i}l`).value = ks[i-1]?.label || ""; document.getElementById(`ks${i}v`).value = ks[i-1]?.value || "";
    document.getElementById(`ks${i}y`).value = ks[i-1]?.year || ""; document.getElementById(`ks${i}t`).value = ks[i-1]?.trend || "";
    setTrendBadge(`tb${i}`, ks[i-1]?.trendDir || (i===3?"down":"up"));
  }
  const setTog = (id, val) => { const el=document.getElementById(id); if(el) el.classList.toggle("on", val !== false); };
  setTog("tog-labels", ds.showLabels !== false); setTog("tog-neg", ds.negativeRed !== false);
  setTog("tog-trend", !!ds.showTrendLine); setTog("tog-compare", ds.showCompare !== false);
  setTog("tog-published", ds.published !== false); setTog("tog-png", ds.allowPng !== false);
  setTog("tog-csv", ds.allowCsv !== false); setTog("tog-embed", ds.allowEmbed !== false);
  setAnnotations(ds.annotations || []); showAdminFormView(true); buildAccentSwatches();
  document.querySelectorAll(".ctype-chip").forEach(c => c.classList.toggle("active", c.dataset.type === ds.chartType));
  renderFormPreview();
}

function openAdd() {
  editId = null; selectedAccent = "#6366f1";
  ["f-title","f-subtitle","f-unit","f-source","f-notes","f-updated","f-compare","f-compare-label","f-report","f-insights"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("f-category").value = "economy"; document.getElementById("f-charttype").value = "bar";
  document.getElementById("f-data").value = "2020, 10\n2021, 20\n2022, 30";
  ["ks1l","ks1v","ks1y","ks1t","ks2l","ks2v","ks2y","ks2t","ks3l","ks3v","ks3y","ks3t"].forEach(id => { const el=document.getElementById(id); if(el) el.value=""; });
  setTrendBadge("tb1","up"); setTrendBadge("tb2","up"); setTrendBadge("tb3","down");
  ["tog-labels","tog-neg","tog-compare","tog-published","tog-png","tog-csv","tog-embed"].forEach(id => { const el=document.getElementById(id); if(el) el.classList.add("on"); });
  document.getElementById("tog-trend")?.classList.remove("on"); setAnnotations([]); showAdminFormView(false); buildAccentSwatches();
  document.querySelectorAll(".ctype-chip").forEach(c => c.classList.toggle("active", c.dataset.type === "bar"));
  renderFormPreview();
}

function buildAccentSwatches() {
  const wrap = document.getElementById("accent-swatches"); wrap.innerHTML = "";
  ACCENTS.forEach(a => {
    const s = document.createElement("div"); s.className = "accent-swatch" + (a === selectedAccent ? " active" : "");
    s.style.background = a;
    s.onclick = () => {
      selectedAccent = a; document.querySelectorAll(".accent-swatch").forEach(el => el.classList.remove("active"));
      s.classList.add("active"); renderFormPreview();
    };
    wrap.appendChild(s);
  });
}

function initChartTypeChips() {
  document.querySelectorAll(".ctype-chip").forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll(".ctype-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active"); document.getElementById("f-charttype").value = chip.dataset.type;
      renderFormPreview();
    };
  });
}

function cycleTrendBadge(id) {
  const el = document.getElementById(id); const states = ["up","down","neutral"], labels = ["↑ Up","↓ Down","— Neutral"];
  let cur = states.findIndex(s => el.classList.contains(s)); if (cur < 0) cur = 0;
  const next = (cur + 1) % 3; el.classList.remove(...states); el.classList.add(states[next]); el.textContent = labels[next];
}
function getTrendDir(id) {
  const el = document.getElementById(id); if (!el) return "neutral";
  if (el.classList.contains("up")) return "up"; if (el.classList.contains("down")) return "down"; return "neutral";
}
function setTrendBadge(id, dir) {
  const el = document.getElementById(id); if (!el) return;
  const labels = { up:"↑ Up", down:"↓ Down", neutral:"— Neutral" };
  el.classList.remove("up","down","neutral"); el.classList.add(dir || "neutral"); el.textContent = labels[dir] || "— Neutral";
}

function addAnnotationRow(label="", note="") {
  const list = document.getElementById("ann-list"), row = document.createElement("div"); row.className = "ann-row-inp";
  row.innerHTML = `<span class="ann-lbl-sm">Point</span><input class="inp" placeholder="" style="max-width:80px;" data-ann-label value="${label}" /><span class="ann-lbl-sm">Note</span><input class="inp" placeholder="" data-ann-note value="${note}" /><button type="button" onclick="this.parentElement.remove()" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:14px;padding:0 4px;">✕</button>`;
  list.appendChild(row);
}
function getAnnotations() {
  const labels = document.querySelectorAll("[data-ann-label]"), notes = document.querySelectorAll("[data-ann-note]"), anns = [];
  labels.forEach((el, i) => { if (el.value.trim() && notes[i]?.value.trim()) anns.push({ label: el.value.trim(), note: notes[i].value.trim() }); });
  return anns;
}
function setAnnotations(anns) {
  document.getElementById("ann-list").innerHTML = "";
  const defaults = anns && anns.length > 0 ? anns : [{ label:"", note:"" }, { label:"", note:"" }];
  defaults.forEach(a => addAnnotationRow(a.label || "", a.note || ""));
}

function getFormData() {
  const data = document.getElementById("f-data").value.split("\n").map(r => r.trim()).filter(Boolean).map(r => {
    const parts = r.split(","); return { label: parts[0]?.trim(), value: parseFloat(parts[1]) };
  }).filter(r => r.label && !isNaN(r.value));
  const compareData = document.getElementById("f-compare").value.split("\n").map(r => r.trim()).filter(Boolean).map(r => {
    const parts = r.split(","); return { label: parts[0]?.trim(), value: parseFloat(parts[1]) };
  }).filter(r => r.label && !isNaN(r.value));
  const insights = document.getElementById("f-insights").value.split("\n").map(s=>s.trim()).filter(Boolean);
  const keyStats = [
    { label:document.getElementById("ks1l").value, value:document.getElementById("ks1v").value, year:document.getElementById("ks1y").value, trend:document.getElementById("ks1t").value, trendDir:getTrendDir("tb1") },
    { label:document.getElementById("ks2l").value, value:document.getElementById("ks2v").value, year:document.getElementById("ks2y").value, trend:document.getElementById("ks2t").value, trendDir:getTrendDir("tb2") },
    { label:document.getElementById("ks3l").value, value:document.getElementById("ks3v").value, year:document.getElementById("ks3y").value, trend:document.getElementById("ks3t").value, trendDir:getTrendDir("tb3") },
  ].filter(k => k.label && k.value);

  return {
    title: document.getElementById("f-title").value.trim(), subtitle: document.getElementById("f-subtitle").value.trim(),
    unit: document.getElementById("f-unit").value.trim(), source: document.getElementById("f-source").value.trim(),
    notes: document.getElementById("f-notes").value.trim(), lastUpdated: document.getElementById("f-updated").value,
    category: document.getElementById("f-category").value, chartType: document.getElementById("f-charttype").value,
    accent: selectedAccent, report: document.getElementById("f-report").value.trim(), compareData,
    compareLabel: document.getElementById("f-compare-label").value.trim(), annotations: getAnnotations(),
    showLabels: document.getElementById("tog-labels").classList.contains("on"), negativeRed: document.getElementById("tog-neg").classList.contains("on"),
    showTrendLine: document.getElementById("tog-trend").classList.contains("on"), showCompare: document.getElementById("tog-compare").classList.contains("on"),
    published: document.getElementById("tog-published").classList.contains("on"), allowPng: document.getElementById("tog-png").classList.contains("on"),
    allowCsv: document.getElementById("tog-csv").classList.contains("on"), allowEmbed: document.getElementById("tog-embed").classList.contains("on"),
    data, insights, keyStats,
  };
}

function renderFormPreview() {
  const fd = getFormData(), pw = document.getElementById("form-preview-wrap"), pc = document.getElementById("form-preview-chart");
  if (fd.data.length === 0) { hide(pw); return; }
  show(pw); const previewDs = { ...fd, id: "form-preview" };
  requestAnimationFrame(() => renderChart(pc, previewDs, 140, true));
}

["f-title","f-subtitle","f-unit","f-source","f-data","f-report","f-insights","f-category","f-charttype","f-notes","f-compare","f-compare-label","ks1l","ks1v","ks1y","ks1t","ks2l","ks2v","ks2y","ks2t","ks3l","ks3v","ks3y","ks3t"]
.forEach(id => { document.getElementById(id)?.addEventListener("input", renderFormPreview); document.getElementById(id)?.addEventListener("change", renderFormPreview); });

document.getElementById("admin-add-btn").onclick = openAdd;
document.getElementById("form-save-btn").onclick = () => {
  const fd = getFormData();
  if (!fd.title) { showToast("Title is required"); return; }
  if (fd.data.length === 0) { showToast("Add at least one data point"); return; }
  const id = editId || slugify(fd.title), ds = { ...fd, id };
  if (editId) allDs = allDs.map(d => d.id === editId ? ds : d); else allDs = [...allDs, ds];
  persistDs(); showToast(editId ? "Dataset updated ✓" : "Dataset added ✓");
  editId = null; renderAdminList(); showAdminListView();
};
document.getElementById("form-cancel-btn").onclick = () => { editId = null; renderAdminList(); showAdminListView(); };

// IMAGE TO CHART
function i2cSetStep(step) {
  i2cStep = step;
  hide(document.getElementById("i2c-upload")); hide(document.getElementById("i2c-loaded"));
  hide(document.getElementById("i2c-preview")); hide(document.getElementById("i2c-done"));
  if (step === "upload") show(document.getElementById("i2c-upload")); if (step === "loaded") show(document.getElementById("i2c-loaded"));
  if (step === "preview") show(document.getElementById("i2c-preview")); if (step === "done") show(document.getElementById("i2c-done"));
}
function resetI2C() { i2cImgBase64 = null; i2cImgSrc = null; i2cPreviewData = null; hide(document.getElementById("img-err")); i2cSetStep("upload"); }
function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  i2cMediaType = file.type || "image/png"; const reader = new FileReader();
  reader.onload = ev => {
    i2cImgSrc = ev.target.result; i2cImgBase64 = ev.target.result.split(",")[1];
    document.getElementById("img-preview-img").src = i2cImgSrc; hide(document.getElementById("img-err"));
    const btn = document.getElementById("img-extract-btn"); btn.className = "ready"; btn.innerHTML = "Extract &amp; Preview Chart Data";
    i2cSetStep("loaded");
  };
  reader.readAsDataURL(file);
}
document.getElementById("img-dropzone").onclick = () => document.getElementById("img-file-input").click();
document.getElementById("img-dropzone").ondragover = e => e.preventDefault();
document.getElementById("img-dropzone").ondrop = e => { e.preventDefault(); handleImageFile(e.dataTransfer.files?.[0]); };
document.getElementById("img-file-input").onchange = e => handleImageFile(e.target.files?.[0]);
document.getElementById("img-clear-btn").onclick = resetI2C;
document.getElementById("img-extract-btn").onclick = async () => {
  if (!i2cImgBase64) return;
  const btn = document.getElementById("img-extract-btn"); btn.className = "loading"; btn.innerHTML = `<span class="spin">⟳</span> Analysing image with Claude…`;
  hide(document.getElementById("img-err"));
  try {
    const GEMINI_KEY = ""; // Original API key handling
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: i2cMediaType, data: i2cImgBase64 } }, { text: `You are a data extraction specialist. Analyze this chart image carefully and extract ALL visible data.\n\nReturn ONLY a valid JSON object — no markdown, no backticks, no explanation. Use this exact schema:\n{\n  "title": "chart title if visible, otherwise empty string",\n  "subtitle": "axis labels or description",\n  "unit": "unit symbol only: %, $, M, B, K, etc. Empty string if none.",\n  "chartType": "bar, line, or area — pick best match",\n  "source": "data source if mentioned, otherwise empty string",\n  "data": [{"label": "x-axis label", "value": numeric_value}, ...]\n}\nExtract EVERY visible data point. Labels are strings. Values are numbers. Sort chronologically.` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1200 }
      })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    const clean = (json.candidates?.[0]?.content?.parts?.[0]?.text || "").replace(/```json|```/g,"").trim();
    const parsed = JSON.parse(clean);
    if (!parsed.data || parsed.data.length === 0) throw new Error("No data");
    i2cPreviewData = parsed;
    document.getElementById("ext-original-img").src = i2cImgSrc; document.getElementById("ext-count-lbl").textContent = `Extracted (${parsed.data.length} points)`;
    document.getElementById("ext-meta-title").textContent = parsed.title || "—"; document.getElementById("ext-meta-unit").textContent = parsed.unit || "—";
    document.getElementById("ext-meta-type").textContent = parsed.chartType;
    const extChart = document.getElementById("ext-chart-wrap"), previewDs = { ...parsed, id:"ext-preview", accent:"#6366f1" };
    requestAnimationFrame(() => renderChart(extChart, previewDs, 144, false)); i2cSetStep("preview");
  } catch(e) {
    const errEl = document.getElementById("img-err"); errEl.textContent = "Couldn't extract data: " + (e?.message || "Unknown error");
    show(errEl); btn.className = "ready"; btn.innerHTML = "Extract &amp; Preview Chart Data";
  }
};
document.getElementById("ext-confirm-btn").onclick = () => {
  if (!i2cPreviewData) return;
  const p = i2cPreviewData;
  if (p.title) document.getElementById("f-title").value = p.title; if (p.subtitle) document.getElementById("f-subtitle").value = p.subtitle;
  if (p.unit) document.getElementById("f-unit").value = p.unit; if (p.source) document.getElementById("f-source").value = p.source;
  if (p.chartType) document.getElementById("f-charttype").value= p.chartType; if (p.data) document.getElementById("f-data").value = p.data.map(r=>`${r.label}, ${r.value}`).join("\n");
  i2cSetStep("done"); renderFormPreview(); showToast("Data extracted ✓ — review and fill in any missing fields");
};
document.getElementById("ext-retry-btn").onclick = () => { i2cSetStep("loaded"); };
document.getElementById("img2chart-retry-btn").onclick = resetI2C;

// BULK IMPORT
document.getElementById("bulk-csv-input").addEventListener("change", function(e) {
  const file = e.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const lines = ev.target.result.split("\n").filter(l => l.trim()), headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim()); if (cols.length < 3) continue;
      const row = {}; headers.forEach((h, idx) => row[h] = cols[idx] || "");
      const data = (row["data"] || "").split("|").map(p => { const [label, val] = p.split(":"); return { label: label?.trim(), value: parseFloat(val) }; }).filter(d => d.label && !isNaN(d.value));
      if (!row["title"] || data.length === 0) continue;
      const ds = { id: slugify(row["title"]), title: row["title"], subtitle: row["subtitle"] || "", unit: row["unit"] || "", source: row["source"] || "", category: row["category"] || "other", chartType: row["charttype"] || "bar", accent: ACCENTS[imported % ACCENTS.length], data, insights: (row["insights"] || "").split("|").map(s=>s.trim()).filter(Boolean), report: row["report"] || "", keyStats: [] };
      if (!allDs.find(d => d.id === ds.id)) { allDs.push(ds); imported++; }
    }
    persistDs(); document.getElementById("bulk-import-result").textContent = `✓ Imported ${imported} dataset${imported !== 1 ? "s" : ""}`;
    e.target.value = ""; if (imported > 0) renderAdminList();
  };
  reader.readAsText(file);
});

// PASSWORD & CONFIG
function changePassword() {
  const np = document.getElementById("new-pw-input").value, nc = document.getElementById("new-pw-confirm").value, err = document.getElementById("change-pw-err");
  if (!np) { err.textContent = "Enter a new password"; return; }
  if (np !== nc) { err.textContent = "Passwords don't match"; return; }
  window._adminPw = np; localStorage.setItem("dv-admin-pw", np);
  document.getElementById("new-pw-input").value = ""; document.getElementById("new-pw-confirm").value = "";
  err.style.color = "#34d399"; err.textContent = "Password updated ✓"; setTimeout(() => { err.textContent = ""; err.style.color = "#f87171"; }, 2500);
}
function populateGhConfigUI() {
  const cfg = getGhConfig(), t = document.getElementById("gh-token-input");
  document.getElementById("gh-owner-input").value = cfg.owner; document.getElementById("gh-repo-input").value = cfg.repo; document.getElementById("gh-path-input").value = cfg.path || "data.json";
  if (t && cfg.token) t.placeholder = "••••••••  (token saved — enter new to change)";
}
function saveGhConfigFromUI() {
  const owner = document.getElementById("gh-owner-input")?.value.trim(), repo = document.getElementById("gh-repo-input")?.value.trim(), path = document.getElementById("gh-path-input")?.value.trim() || "data.json", token = document.getElementById("gh-token-input")?.value.trim(), status = document.getElementById("gh-config-status");
  if (!owner || !repo) { status.style.color = "#f87171"; status.textContent = "Owner and repo are required"; return; }
  saveGhConfig(owner, repo, path, token); status.style.color = "#34d399"; status.textContent = "Saved ✓"; setTimeout(() => { status.textContent = ""; }, 2500);
}
async function testGhConnection() {
  const { owner, repo, path, token } = getGhConfig(), status = document.getElementById("gh-config-status");
  if (!owner || !repo) { status.style.color = "#f87171"; status.textContent = "Save config first"; return; }
  status.style.color = "var(--ink-soft)"; status.textContent = "Testing…";
  try {
    const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }; if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers });
    if (res.status === 404) { status.style.color = "#f59e0b"; status.textContent = "Repo found, data.json not yet created ✓"; }
    else if (res.ok) { status.style.color = "#34d399"; status.textContent = "Connected ✓ — data.json found"; }
    else { const err = await res.json(); status.style.color = "#f87171"; status.textContent = "Error: " + (err.message || res.status); }
  } catch(e) { status.style.color = "#f87171"; status.textContent = "Network error: " + e.message; }
}

// DRAG REORDER
let dragSrcId = null;
function setupDragReorder(row, dsId) {
  row.draggable = true;
  row.addEventListener("dragstart", () => { dragSrcId = dsId; row.classList.add("dragging"); });
  row.addEventListener("dragend", () => { row.classList.remove("dragging"); dragSrcId = null; });
  row.addEventListener("dragover", e => { e.preventDefault(); row.classList.add("drag-over"); });
  row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
  row.addEventListener("drop", e => {
    e.preventDefault(); row.classList.remove("drag-over");
    if (dragSrcId && dragSrcId !== dsId) {
      const fromIdx = allDs.findIndex(d => d.id === dragSrcId), toIdx = allDs.findIndex(d => d.id === dsId);
      if (fromIdx > -1 && toIdx > -1) { const moved = allDs.splice(fromIdx, 1)[0]; allDs.splice(toIdx, 0, moved); persistDs(); renderAdminList(); }
    }
  });
}

// ADMIN TABS
function initAdminTabs() {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active'); document.getElementById('tab-' + tab)?.classList.add('active');
      const addBtn = document.getElementById('admin-add-btn'); if (addBtn) addBtn.style.display = tab === 'datasets' ? '' : 'none';
      if (tab === 'github') populateGhTabUI();
    });
  });
}
function populateGhTabUI() {
  const cfg = getGhConfig(), set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; }, t = document.getElementById('gh-token-tab');
  set('gh-owner-tab', cfg.owner); set('gh-repo-tab', cfg.repo); set('gh-path-tab', cfg.path || 'data.json');
  if (t && cfg.token) t.placeholder = '•••••••• (token saved — enter new to change)';
}
function saveGhConfigTabFromUI() {
  const owner = document.getElementById('gh-owner-tab')?.value.trim(), repo = document.getElementById('gh-repo-tab')?.value.trim(), path = document.getElementById('gh-path-tab')?.value.trim() || 'data.json', token = document.getElementById('gh-token-tab')?.value.trim(), status = document.getElementById('gh-config-status-tab');
  if (!owner || !repo) { status.style.color = '#f87171'; status.textContent = 'Owner and repo are required'; return; }
  saveGhConfig(owner, repo, path, token);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; }; set('gh-owner-input', owner); set('gh-repo-input', repo); set('gh-path-input', path);
  status.style.color = '#34d399'; status.textContent = 'Saved ✓'; setTimeout(() => { status.textContent = ''; }, 2500);
}
async function testGhConnectionTab() {
  const { owner, repo, path, token } = getGhConfig(), status = document.getElementById('gh-config-status-tab');
  if (!owner || !repo) { status.style.color = '#f87171'; status.textContent = 'Save config first'; return; }
  status.style.color = 'var(--ink-soft)'; status.textContent = 'Testing…';
  try {
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers });
    if (res.status === 404) { status.style.color = '#f59e0b'; status.textContent = 'Repo found, data.json not yet created ✓'; }
    else if (res.ok) { status.style.color = '#34d399'; status.textContent = 'Connected ✓ — data.json found'; }
    else { const err = await res.json(); status.style.color = '#f87171'; status.textContent = 'Error: ' + (err.message || res.status); }
  } catch(e) { status.style.color = '#f87171'; status.textContent = 'Network error: ' + e.message; }
}
function changePasswordTab() {
  const np = document.getElementById('new-pw-tab').value, nc = document.getElementById('new-pw-confirm-tab').value, err = document.getElementById('change-pw-err-tab');
  if (!np) { err.textContent = 'Enter a new password'; return; }
  if (np !== nc) { err.textContent = "Passwords don't match"; return; }
  window._adminPw = np; localStorage.setItem('dv-admin-pw', np);
  document.getElementById('new-pw-tab').value = ''; document.getElementById('new-pw-confirm-tab').value = '';
  err.style.color = '#34d399'; err.textContent = 'Password updated ✓'; setTimeout(() => { err.textContent = ''; err.style.color = '#f87171'; }, 2500);
}

// INIT
(async function init() {
  const savedPw = localStorage.getItem("dv-admin-pw");
  if (savedPw) window._adminPw = savedPw;
  applyTheme();
  await loadDs();
  setupPwGate();
  hide(document.getElementById("loading-screen"));
  show(document.getElementById("pw-gate"));
})();