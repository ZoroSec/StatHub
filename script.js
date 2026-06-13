// STATE
let activeCat = "economy";
let activeDs = null;
let currentView = "cards";
let dsView = "chart";

// MAIN SITE RENDER
function renderSite() {
  const site = document.getElementById("site");
  show(site);
  hide(document.getElementById("ds-page-wrap"));

  const totalPoints = allDs.reduce((sum, ds) => sum + (ds.data?.length || 0), 0);
  const totalInsights = allDs.reduce((sum, ds) => sum + (ds.insights?.length || 0), 0);
  document.getElementById("hero-stats").innerHTML = [
    { value: allDs.length, label: "Tracked datasets across the library" },
    { value: totalInsights, label: "Publisher-style insights captured" },
    { value: totalPoints, label: "Chart points available to explore" }
  ].map(item => `<div class="hero-stat"><div class="hero-stat-value">${item.value}</div><div class="hero-stat-label">${item.label}</div></div>`).join("");

  const featured = [...allDs].sort((a, b) => (b.data?.length || 0) - (a.data?.length || 0))[0] || allDs[0];
  window._featuredDs = featured;
  if (featured) {
    document.getElementById("hero-brief-title").textContent = featured.title;
    document.getElementById("hero-brief-sub").textContent = featured.subtitle || "A featured view into the current dataset library.";
    document.getElementById("hero-brief-meta").innerHTML = [
      featured.source, `${featured.data?.length || 0} data points`,
      `${featured.insights?.length || 0} insights`, featured.chartType
    ].filter(Boolean).map(item => `<span class="brief-chip">${item}</span>`).join("");
    const briefChart = document.getElementById("hero-brief-chart");
    requestAnimationFrame(() => renderChart(briefChart, featured, 170, false));
  }

  // Category pills
  const pillsEl = document.getElementById("cat-pills");
  pillsEl.innerHTML = "";
  const navLinksEl = document.getElementById("nav-links");
  if (navLinksEl) navLinksEl.innerHTML = "";
  const miTopicsEl = document.getElementById("mi-topics");
  if (miTopicsEl) miTopicsEl.innerHTML = "";
  const byCat = {};
  CATEGORIES.forEach(c => { byCat[c.id] = allDs.filter(d => d.category === c.id); });
  
  CATEGORIES.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "cat-pill" + (activeCat === c.id ? " active" : "");
    btn.innerHTML = `<span>${c.icon}</span>${c.label}${byCat[c.id].length > 0 ? `<span class="cat-pill-count">(${byCat[c.id].length})</span>` : ""}`;
    btn.onclick = () => { activeCat = c.id; renderSite(); };
    pillsEl.appendChild(btn);

    if (navLinksEl) {
      const link = document.createElement("button");
      link.className = "nav-link-pill" + (activeCat === c.id ? " active" : "");
      link.innerHTML = `<span class="nav-link-icon">${c.icon}</span><span>${c.label}</span>`;
      link.onclick = () => {
        activeCat = c.id; renderSite();
        requestAnimationFrame(() => {
          const target = document.getElementById("cat-pills") || document.getElementById("cards-grid");
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      };
      navLinksEl.appendChild(link);
    }

    if (miTopicsEl && byCat[c.id].length > 0) {
      const topic = document.createElement("div");
      topic.className = "mi-topic";
      topic.textContent = c.label;
      miTopicsEl.appendChild(topic);
    }
  });

  // Map Grid Initialization
  const mapGrid = document.getElementById("mi-map-grid");
  if (mapGrid && !mapGrid.dataset.ready) {
    const worldMask = new Set(["5-6","5-7","5-8","5-9","6-5","6-6","6-7","6-8","6-9","6-10","7-4","7-5","7-6","7-7","7-8","7-9","7-10","8-5","8-6","8-7","8-8","8-9","9-6","9-7","9-8","9-9","10-7","10-8","10-9","5-14","5-15","5-16","6-13","6-14","6-15","6-16","6-17","7-13","7-14","7-15","7-16","7-17","7-18","8-13","8-14","8-15","8-16","8-17","8-18","8-19","9-13","9-14","9-15","9-16","9-17","9-18","9-19","9-20","10-14","10-15","10-16","10-17","10-18","10-19","10-20","11-14","11-15","11-16","11-17","11-18","11-19","6-21","6-22","7-20","7-21","7-22","7-23","8-20","8-21","8-22","8-23","8-24","9-20","9-21","9-22","9-23","9-24","10-21","10-22","10-23"]);
    mapGrid.innerHTML = "";
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 26; c++) {
        const dot = document.createElement("span");
        dot.className = "mi-dot" + (worldMask.has(`${r}-${c}`) ? " on" : "");
        mapGrid.appendChild(dot);
      }
    }
    mapGrid.dataset.ready = "true";
  }

  // Cards
  const grid = document.getElementById("cards-grid");
  const tableWrap = document.getElementById("table-view-wrap");
  const empty = document.getElementById("empty-state");
  let catDs = byCat[activeCat] || [];
  catDs = applyFilters(catDs);
  grid.innerHTML = ""; tableWrap.innerHTML = "";

  if (catDs.length === 0) { show(empty); hide(grid); hide(tableWrap); return; }
  hide(empty);

  if (currentView === "table") {
    hide(grid); show(tableWrap);
    const rows = catDs.map(ds => `
      <tr onclick="openDataset(allDs.find(d=>d.id==='${ds.id}'))">
        <td><span style="color:${ds.accent};font-weight:700">${ds.title}</span></td>
        <td style="color:var(--ink-soft)">${ds.subtitle || ""}</td>
        <td>${ds.data?.length || 0} pts</td>
        <td>${ds.source || ""}</td>
        <td><span style="color:${ds.accent}">${ds.chartType}</span></td>
        <td style="font-weight:700;color:${ds.accent}">${ds.data?.[ds.data.length-1]?.value ?? "—"}${ds.unit||""}</td>
        <td><button class="pin-btn ${ds.pinned?'pinned':''}" onclick="event.stopPropagation();togglePin('${ds.id}')">${ds.pinned?'📌':'📍'}</button></td>
      </tr>`).join("");
    tableWrap.innerHTML = `<table><thead><tr><th>Title</th><th>Subtitle</th><th>Points</th><th>Source</th><th>Type</th><th>Latest</th><th>Pin</th></tr></thead><tbody>${rows}</tbody></table>`;
    return;
  }

  show(grid); hide(tableWrap);
  catDs.forEach((ds, i) => {
    const latest = ds.data?.[ds.data.length - 1];
    const card = document.createElement("div");
    card.className = "ds-card fade-up";
    card.style.animationDelay = (i * 0.05) + "s";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="ds-card-source" style="color:${ds.accent};margin-bottom:0">${ds.source}</div>
        <button class="pin-btn ${ds.pinned?'pinned':''}" onclick="event.stopPropagation();togglePin('${ds.id}')" title="${ds.pinned?'Unpin':'Pin to featured'}">${ds.pinned?'📌':'📍'}</button>
      </div>
      <div class="ds-card-title">${ds.title}</div>
      <div class="ds-card-sub">${ds.subtitle || ""}</div>
      <div class="ds-card-kpi">
        <div class="ds-card-kpi-value" style="color:${ds.accent}">${latest ? `${latest.value}${ds.unit || ""}` : "—"}</div>
        <div class="ds-card-kpi-label">Latest value</div>
      </div>
      <div class="ds-card-chart" id="mini-${ds.id}"></div>
      <div class="ds-card-tags">
        <span class="tag tag-accent" style="background:${ds.accent}18;color:${ds.accent}">${ds.chartType}</span>
        ${ds.report ? `<span class="tag">Report</span>` : ""}
        ${ds.insights?.length > 0 ? `<span class="tag">${ds.insights.length} insights</span>` : ""}
        <span class="tag">${ds.data.length} pts</span>
        ${ds.pinned ? `<span class="tag" style="background:#fbbf2418;color:#fbbf24">📌 Featured</span>` : ""}
      </div>`;
    card.onmouseenter = () => { card.style.borderColor = ds.accent + "55"; card.style.boxShadow = `0 24px 52px ${ds.accent}18`; };
    card.onmouseleave = () => { card.style.borderColor = "rgba(191, 206, 223, 0.92)"; card.style.boxShadow = ""; };
    card.onclick = () => openDataset(ds);
    grid.appendChild(card);
    requestAnimationFrame(() => {
      const mc = document.getElementById("mini-" + ds.id);
      if (mc) renderChart(mc, ds, 160, false);
    });
  });
}

// VIEW TOGGLE
function setView(v) {
  currentView = v;
  document.getElementById("view-cards-btn").classList.toggle("active", v === "cards");
  document.getElementById("view-table-btn").classList.toggle("active", v === "table");
  renderSite();
}
function setDsView(v) {
  dsView = v;
  document.getElementById("ds-view-chart-btn").classList.toggle("active", v === "chart");
  document.getElementById("ds-view-table-btn").classList.toggle("active", v === "table");
  const chartBox = document.getElementById("chart-box");
  const tableWrap = document.getElementById("ds-table-wrap");
  if (v === "chart") { show(chartBox); hide(tableWrap); } else { hide(chartBox); show(tableWrap); }
}

// SEARCH
function setupSearch() {
  const inp = document.getElementById("search-input");
  const res = document.getElementById("search-results");
  inp.addEventListener("input", () => {
    const q = inp.value.trim();
    if (q.length < 2) { hide(res); return; }
    const matches = allDs.filter(d => d.title.toLowerCase().includes(q.toLowerCase()) || (d.subtitle || "").toLowerCase().includes(q.toLowerCase()));
    if (matches.length === 0) { res.innerHTML = `<div id="search-empty">No results found</div>`; }
    else {
      res.innerHTML = matches.map(d => `
        <div class="search-item" data-id="${d.id}"><span style="color:${d.accent}">▦</span>
          <div><div class="search-item-title">${d.title}</div><div class="search-item-sub">${d.subtitle || ""}</div></div>
        </div>`).join("");
      res.querySelectorAll(".search-item").forEach(el => { el.onclick = () => { const ds = allDs.find(d => d.id === el.dataset.id); if (ds) { inp.value = ""; hide(res); openDataset(ds); } }; });
    }
    show(res);
  });
  document.addEventListener("click", e => { if (!document.getElementById("search-wrap").contains(e.target)) hide(res); });
}

// FILTERS
function clearFilters() {
  document.getElementById("filter-sort").value = "default";
  document.getElementById("date-from").value = "";
  document.getElementById("date-to").value = "";
  renderSite();
}
function applyFilters(datasets) {
  const sort = document.getElementById("filter-sort")?.value || "default";
  const fromY = parseInt(document.getElementById("date-from")?.value) || null;
  const toY   = parseInt(document.getElementById("date-to")?.value) || null;
  let result = [...datasets];
  if (fromY || toY) {
    result = result.map(ds => {
      const filtered = ds.data.filter(d => {
        const y = parseInt(d.label);
        if (fromY && y < fromY) return false;
        if (toY   && y > toY  ) return false;
        return true;
      });
      return { ...ds, data: filtered };
    }).filter(ds => ds.data.length > 0);
  }
  if (sort === "az") result.sort((a,b) => a.title.localeCompare(b.title));
  else if (sort === "za") result.sort((a,b) => b.title.localeCompare(a.title));
  else if (sort === "most-data") result.sort((a,b) => (b.data?.length||0) - (a.data?.length||0));
  else if (sort === "pinned") result.sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0));
  return result;
}

// DATASET PAGE
function openDataset(ds) {
  activeDs = ds;
  dsView = "chart";
  hide(document.getElementById("site"));
  const page = document.getElementById("ds-page-wrap");
  show(page);
  history.replaceState(null, "", "#ds=" + ds.id);

  document.getElementById("ds-source").textContent = ds.source;
  document.getElementById("ds-source").style.color = ds.accent;
  document.getElementById("ds-title").textContent = ds.title;
  document.getElementById("ds-subtitle").textContent = ds.subtitle || "";

  const dsNavLinks = document.getElementById("ds-nav-links");
  if (dsNavLinks) {
    dsNavLinks.innerHTML = "";
    CATEGORIES.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "nav-link-pill" + (ds.category === c.id ? " active" : "");
      btn.innerHTML = `<span class="nav-link-icon">${c.icon}</span><span>${c.label}</span>`;
      btn.onclick = () => {
        activeCat = c.id; document.getElementById("ds-back").click();
        requestAnimationFrame(() => {
          const target = document.getElementById("cat-pills");
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      };
      dsNavLinks.appendChild(btn);
    });
  }

  document.getElementById("btn-download-png").onclick = downloadPNG;
  document.getElementById("btn-download-csv").onclick = downloadCSV;
  document.getElementById("btn-share").onclick = shareLink;
  document.getElementById("btn-embed").onclick = showEmbed;

  setDsView("chart");

  const ksRow = document.getElementById("ks-row");
  ksRow.style.gridTemplateColumns = `repeat(${ds.keyStats?.length || 1}, 1fr)`;
  ksRow.innerHTML = (ds.keyStats || []).map(k => {
    const trendColor = k.trendDir === "up" ? "#34d399" : k.trendDir === "down" ? "#f87171" : "#94a3b8";
    const trendHtml = k.trend ? `<div style="font-size:12px;color:${trendColor};margin-top:4px;">${k.trend}</div>` : "";
    return `<div class="ks-card"><div class="ks-val" style="color:${ds.accent}">${k.value}</div><div class="ks-lbl">${k.label}${k.year ? ` · ${k.year}` : ""}</div>${trendHtml}</div>`;
  }).join("");

  const vals = ds.data.map(d => d.value);
  const mx = Math.max(...vals), mn = Math.min(...vals);
  const latest = ds.data[ds.data.length - 1], prev = ds.data[ds.data.length - 2];
  const trend = prev ? (latest.value - prev.value).toFixed(1) : "0";
  const tUp = Number(trend) >= 0;
  document.getElementById("ticker-row").innerHTML = [
    {label:"Latest", value:`${latest?.value}${ds.unit}`, color:ds.accent},
    {label:"Change", value:`${tUp?"+":""}${trend}${ds.unit}`, color:tUp?"#34d399":"#f87171"},
    {label:"Max", value:`${mx}${ds.unit}`, color:"#94a3b8"},
    {label:"Min", value:`${mn}${ds.unit}`, color:"#94a3b8"},
  ].map(s => `<div class="ticker-cell"><div class="ticker-val" style="color:${s.color}">${s.value}</div><div class="ticker-lbl">${s.label}</div></div>`).join("");

  const chartBox = document.getElementById("chart-box");
  chartBox.style.background = "rgba(255, 255, 255, 0.95)";
  chartBox.style.border = `1px solid ${ds.accent}25`;
  document.getElementById("chart-box-hint").style.color = ds.accent;
  const chartInner = document.getElementById("chart-box-inner");
  requestAnimationFrame(() => {
    renderChart(chartInner, ds, 380, true);
    if (ds.showCompare !== false && ds.compareData?.length > 0) renderCompareOverlay(chartInner, ds);
    if (ds.annotations?.length > 0) renderAnnotations(chartInner, ds);
  });

  renderDataHeatmap(ds);
  renderDsTable(ds);

  let metaItems = [];
  if (ds.source) metaItems.push(`<span style="display:inline-flex;align-items:center;gap:4px;">📌 ${ds.source}</span>`);
  if (ds.lastUpdated) metaItems.push(`<span>🗓 Updated: ${ds.lastUpdated}</span>`);
  if (ds.notes) metaItems.push(`<span style="font-style:italic;">* ${ds.notes}</span>`);
  if (metaItems.length) {
    const existingMeta = document.getElementById("ds-meta-row");
    if (existingMeta) existingMeta.remove();
    const metaDiv = document.createElement("div");
    metaDiv.id = "ds-meta-row";
    metaDiv.style.cssText = "display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--ink-soft);margin-bottom:20px;";
    metaDiv.innerHTML = metaItems.join("");
    document.getElementById("ds-subtitle").after(metaDiv);
  }

  const bottom = document.getElementById("ds-bottom");
  const hasBoth = ds.report && ds.insights?.length;
  bottom.style.gridTemplateColumns = hasBoth ? "1fr 1fr" : "1fr";
  let html = "";
  if (ds.report) html += `<div class="report-box"><div class="report-box-lbl">Report</div><p class="report-text">${ds.report}</p></div>`;
  if (ds.insights?.length > 0) {
    html += `<div class="report-box" style="border-color:${ds.accent}25"><div class="report-box-lbl" style="color:${ds.accent}">Key Insights</div><div class="insights-list">
      ${ds.insights.map((ins,i) => `<div class="insight-item" style="animation-delay:${i*0.07}s"><span class="insight-bullet" style="color:${ds.accent}">✦</span><span class="insight-text">${ins}</span></div>`).join("")}
    </div></div>`;
  }
  bottom.innerHTML = html;

  renderRelated(ds);
}

function renderDataHeatmap(ds) {
  const section = document.getElementById("heatmap-section"), grid = document.getElementById("heatmap-grid"), labels = document.getElementById("heatmap-labels"), legend = document.getElementById("heatmap-legend");
  if (!ds.data || ds.data.length < 4) { hide(section); return; }
  show(section);
  const vals = ds.data.map(d => d.value);
  const vMin = Math.min(...vals), vMax = Math.max(...vals), vRange = vMax - vMin || 1;
  const cols = 7, data = [...ds.data];
  while (data.length % cols !== 0) data.push(null);
  labels.innerHTML = data.slice(0,cols).map(d => `<div class="hm-day-label">${d ? String(d.label).slice(0,3) : ""}</div>`).join("");
  grid.innerHTML = "";
  data.forEach(d => {
    const cell = document.createElement("div");
    cell.className = "hm-cell";
    if (!d) cell.style.background = "transparent";
    else { const t = (d.value - vMin) / vRange; cell.style.background = heatColor(t); cell.style.opacity = 0.85 + t * 0.15; cell.title = `${d.label}: ${d.value}${ds.unit || ""}`; }
    grid.appendChild(cell);
  });
  legend.innerHTML = [{ color: heatColor(0), label: `Low (${vMin}${ds.unit||""})` }, { color: heatColor(0.5), label: "Mid" }, { color: heatColor(1), label: `High (${vMax}${ds.unit||""})` }]
    .map(l => `<div class="hm-legend-item"><div class="hm-legend-dot" style="background:${l.color}"></div>${l.label}</div>`).join("");
}

function renderDsTable(ds) {
  const wrap = document.getElementById("ds-table-inner");
  const rows = ds.data.map(d => `<tr><td>${d.label}</td><td style="font-variant-numeric:tabular-nums;font-weight:700">${d.value}${ds.unit || ""}</td></tr>`).join("");
  wrap.innerHTML = `<div id="table-view-wrap"><table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderRelated(ds) {
  const related = allDs.filter(d => d.id !== ds.id && (d.category === ds.category || d.chartType === ds.chartType)).slice(0, 3);
  const section = document.getElementById("related-section"), grid = document.getElementById("related-grid");
  if (related.length === 0) { hide(section); return; }
  show(section);
  grid.innerHTML = related.map(r => `<div class="related-card" onclick="openDataset(allDs.find(d=>d.id==='${r.id}'))"><div class="related-card-title" style="color:${r.accent}">${r.title}</div><div class="related-card-sub">${r.subtitle || ""}</div></div>`).join("");
}

// ACTION BUTTONS
function togglePin(id) { allDs = allDs.map(d => d.id === id ? { ...d, pinned: !d.pinned } : d); persistDs(); renderSite(); }

function downloadPNG() {
  const svg = document.querySelector("#chart-box-inner svg");
  if (!svg) return;
  const data = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const rect = svg.getBoundingClientRect();
  canvas.width = rect.width * 2; canvas.height = rect.height * 2;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = new Image(); const blob = new Blob([data], {type:"image/svg+xml"}); const url = URL.createObjectURL(blob);
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url);
    const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = (activeDs?.title || "chart") + ".png"; a.click();
  };
  img.src = url;
}

function downloadCSV() {
  if (!activeDs) return;
  const rows = [["Label", "Value"], ...activeDs.data.map(d => [d.label, d.value])];
  const csv = rows.map(r => r.join(",")).join("\n");
  const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = (activeDs.title || "data") + ".csv"; a.click();
}

function shareLink() {
  if (!activeDs) return;
  const url = window.location.origin + window.location.pathname + "#ds=" + activeDs.id;
  navigator.clipboard.writeText(url).then(() => showToast("Link copied to clipboard ✓")).catch(() => prompt("Copy this link:", url));
}

function showEmbed() {
  if (!activeDs) return;
  const url = window.location.origin + window.location.pathname + "#ds=" + activeDs.id;
  const code = `<iframe src="${url}" width="800" height="500" frameborder="0" style="border-radius:16px;border:1px solid #e2e8f0;" title="${activeDs.title}"></iframe>`;
  document.getElementById("embed-code").value = code;
  show(document.getElementById("embed-modal"));
}
function copyEmbed() {
  const ta = document.getElementById("embed-code"); ta.select();
  navigator.clipboard.writeText(ta.value).then(() => showToast("Embed code copied ✓"));
}

function checkDeepLink() {
  const hash = location.hash;
  if (hash.startsWith("#ds=")) {
    const id = hash.slice(4);
    const ds = allDs.find(d => d.id === id);
    if (ds) setTimeout(() => openDataset(ds), 100);
  }
}

document.getElementById("ds-back").onclick = () => {
  activeDs = null; hide(document.getElementById("ds-page-wrap")); renderSite();
  history.replaceState(null, "", location.pathname);
};

// Admin shortcut: Ctrl+Shift+` → open admin panel
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.shiftKey && e.key === "`") {
    e.preventDefault();
    window.location.href = "admin.html";
  }
});

// INIT
(async function init() {
  applyTheme();
  await loadDs();
  setupSearch();
  hide(document.getElementById("loading-screen"));
  renderSite();
  checkDeepLink();
})();