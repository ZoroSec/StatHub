// CONFIG & CONSTANTS
const ACCENTS = ["#8b5cf6","#f97316","#6366f1","#a855f7","#fb923c","#7c3aed","#c084fc","#38bdf8","#34d399","#f59e0b"];

function heatColor(t) {
  if (t < 0.33) {
    const r = Math.round(99 + (168-99)*t/0.33);
    const g = Math.round(102 + (85-102)*t/0.33);
    const b = Math.round(241 + (247-241)*t/0.33);
    return `rgb(${r},${g},${b})`;
  } else if (t < 0.67) {
    const s = (t - 0.33) / 0.34;
    const r = Math.round(168 + (249-168)*s);
    const g = Math.round(85 + (115-85)*s);
    const b = Math.round(247 + (22-247)*s);
    return `rgb(${r},${g},${b})`;
  } else {
    const s = (t - 0.67) / 0.33;
    const r = Math.round(249 + (251-249)*s);
    const g = Math.round(115 + (146-115)*s);
    const b = Math.round(22 + (9-22)*s);
    return `rgb(${r},${g},${b})`;
  }
}

const CATEGORIES = [
  { id:"economy",     label:"Economy",     icon:"◈" },
  { id:"technology",  label:"Technology",  icon:"⬡" },
  { id:"health",      label:"Health",      icon:"♡" },
  { id:"sports",      label:"Sports",      icon:"◎" },
  { id:"environment", label:"Environment", icon:"◉" },
  { id:"other",       label:"Other",       icon:"◌" },
];

const SEED = [
  {
    id:"gdp-growth", category:"economy",
    title:"Global GDP Growth Rate", subtitle:"Annual % change — 2015 to 2024",
    unit:"%", source:"World Bank, 2024", chartType:"area", accent:"#6366f1",
    data:[
      {label:"2015",value:2.9},{label:"2016",value:2.6},{label:"2017",value:3.3},
      {label:"2018",value:3.1},{label:"2019",value:2.6},{label:"2020",value:-3.1},
      {label:"2021",value:6.0},{label:"2022",value:3.5},{label:"2023",value:3.1},{label:"2024",value:3.2},
    ],
    keyStats:[
      {label:"Peak growth",value:"6.0%",year:"2021",trendDir:"up"},
      {label:"Worst year",value:"−3.1%",year:"2020",trendDir:"down"},
      {label:"10yr avg",value:"2.8%",year:"",trendDir:"neutral"},
    ],
    report:"Global GDP contracted sharply in 2020 due to the COVID-19 pandemic, recording a −3.1% decline — the worst since the Great Depression. The subsequent 2021 rebound of 6.0% was driven by pent-up demand, fiscal stimulus, and vaccine rollouts.",
    insights:[
      "The pandemic caused a larger GDP shock than the 2008 financial crisis.",
      "2021's 6% bounce was the fastest global recovery in post-war history.",
      "India and China together accounted for over 40% of global growth in 2023.",
    ],
  },
  {
    id:"ai-market", category:"technology",
    title:"AI Market Size", subtitle:"Global revenue in USD billions — 2020 to 2024",
    unit:"$B", source:"IDC, 2024", chartType:"bar", accent:"#a78bfa",
    data:[
      {label:"2020",value:62},{label:"2021",value:87},{label:"2022",value:120},
      {label:"2023",value:197},{label:"2024",value:305},
    ],
    keyStats:[
      {label:"2024 size",value:"$305B",year:"",trendDir:"up"},
      {label:"YoY growth",value:"+55%",year:"2023–24",trendDir:"up"},
      {label:"5yr growth",value:"+392%",year:"",trendDir:"up"},
    ],
    report:"The AI market has experienced explosive growth, driven primarily by generative AI adoption following the launch of ChatGPT in late 2022. Enterprise software, cloud AI services, and hardware (particularly GPUs) have seen the highest spend.",
    insights:[
      "ChatGPT's launch triggered a 3x acceleration in enterprise AI adoption.",
      "NVIDIA's GPU business grew 200%+ YoY in 2023–24.",
      "Healthcare and finance are the top two industries by AI spend.",
    ],
  },
  {
    id:"ipl-viewership", category:"sports",
    title:"IPL TV Viewership", subtitle:"Total viewers in millions per season",
    unit:"M", source:"BCCI / BARC, 2024", chartType:"bar", accent:"#fbbf24",
    data:[
      {label:"2019",value:462},{label:"2020",value:405},{label:"2021",value:380},
      {label:"2022",value:505},{label:"2023",value:530},{label:"2024",value:590},
    ],
    keyStats:[
      {label:"2024 viewers",value:"590M",year:"",trendDir:"up"},
      {label:"COVID low",value:"380M",year:"2021",trendDir:"down"},
      {label:"6yr growth",value:"+28%",year:"",trendDir:"up"},
    ],
    report:"IPL viewership has grown consistently, making it the most-watched cricket league globally. The 2022 expansion to 10 teams and JioCinema's free-streaming deal drove a massive spike in digital viewership.",
    insights:[
      "JioCinema's free streaming in 2023 added 300M+ digital viewers.",
      "The IPL brand value crossed $10 billion in 2024.",
      "Women's IPL debuted in 2023 with 50M+ viewers in its first season.",
    ],
  },
];

// STATE
let allDs = [];

// HELPERS
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || Date.now().toString(); }
function show(el) { if(el) el.classList.remove("hidden"); }
function hide(el) { if(el) el.classList.add("hidden"); }
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  show(t);
  setTimeout(() => hide(t), 2500);
}

// STORAGE
function getGhConfig() {
  return {
    owner: localStorage.getItem("gh-owner") || "ZoroSec",
    repo:  localStorage.getItem("gh-repo")  || "StatHub",
    path:  localStorage.getItem("gh-path")  || "data.json",
    token: localStorage.getItem("gh-token") || "", 
  };
}
function saveGhConfig(owner, repo, path, token) {
  localStorage.setItem("gh-owner", owner);
  localStorage.setItem("gh-repo",  repo);
  localStorage.setItem("gh-path",  path || "data.json");
  if (token) localStorage.setItem("gh-token", token);
}

let _ghFileSha = null;

async function loadDs() {
  const { owner, repo, path } = getGhConfig();
  if (owner && repo) {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const res = await fetch(url, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
      if (res.ok) {
        const json = await res.json();
        _ghFileSha = json.sha;
        const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g,""))));
        allDs = JSON.parse(decoded);
        return;
      }
    } catch (e) { console.warn("GitHub load failed:", e); }
  }
  try {
    const saved = localStorage.getItem("dv-datasets-local");
    allDs = saved ? JSON.parse(saved) : SEED;
  } catch { allDs = SEED; }
}

async function persistDs() {
  const { owner, repo, path, token } = getGhConfig();
  try { localStorage.setItem("dv-datasets-local", JSON.stringify(allDs)); } catch {}

  if (!owner || !repo || !token) {
    showToast("⚠ GitHub not configured — saved locally only");
    return;
  }
  try {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(allDs, null, 2))));
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const body = { message: "Update datasets via StatHub admin", content, ...( _ghFileSha ? { sha: _ghFileSha } : {} ) };
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || res.status); }
    const result = await res.json();
    _ghFileSha = result.content?.sha || _ghFileSha;
    showToast("✓ Saved to GitHub");
  } catch(e) {
    showToast("❌ GitHub save failed: " + e.message);
    console.error("GitHub persist error:", e);
  }
}

// CHARTS
function buildChart(ds, width, height, interactive = false) {
  if (!ds.data || ds.data.length === 0) return "";
  const pad = interactive ? { top: 14, right: 14, bottom: 36, left: 46 } : { top: 8, right: 8, bottom: 28, left: 36 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;
  const vals = ds.data.map(d => d.value);
  const rawMin = Math.min(...vals), rawMax = Math.max(...vals);
  const hasNeg = rawMin < 0;
  const vMin = hasNeg ? rawMin * 1.1 : 0;
  const vMax = rawMax * 1.1 || 1;
  const vRange = vMax - vMin;
  const yScale = v => H - ((v - vMin) / vRange) * H;
  const xStep = W / ds.data.length;
  const xCenter = (i) => pad.left + xStep * i + xStep / 2;
  const accent = ds.accent || "#6366f1";

  const gridLines = 4; let grid = "", yLabels = "";
  for (let i = 0; i <= gridLines; i++) {
    const v = vMin + (vRange / gridLines) * (gridLines - i);
    const y = pad.top + (H / gridLines) * i;
    grid += `<line x1="${pad.left}" y1="${y}" x2="${pad.left + W}" y2="${y}" class="chart-grid-line" />`;
    const lv = Math.abs(v) >= 100 ? Math.round(v) : v.toFixed(1);
    yLabels += `<text x="${pad.left - 6}" y="${y + 3}" class="chart-axis-text" text-anchor="end" style="${interactive ? 'font-size:12px' : ''}">${lv}</text>`;
  }
  let zeroLine = "";
  if (hasNeg) {
    const zy = pad.top + yScale(0);
    zeroLine = `<line x1="${pad.left}" y1="${zy}" x2="${pad.left + W}" y2="${zy}" stroke="#334155" stroke-dasharray="4 2" />`;
  }
  const every = Math.max(1, Math.ceil(ds.data.length / 7));
  let xLabels = "";
  ds.data.forEach((d, i) => {
    if (i % every === 0 || i === ds.data.length - 1) {
      const x = xCenter(i);
      xLabels += `<text x="${x}" y="${pad.top + H + (interactive ? 22 : 18)}" class="chart-axis-text" text-anchor="middle" style="${interactive ? 'font-size:12px' : ''}">${d.label}</text>`;
    }
  });

  let chartBody = ""; const uid = ds.id + "-" + Date.now();
  if (ds.chartType === "bar") {
    const bw = Math.max(4, xStep * 0.58);
    const normVals = vals.map(v => (v - Math.min(...vals)) / (Math.max(...vals) - Math.min(...vals) || 1));
    ds.data.forEach((d, i) => {
      const x = xCenter(i) - bw / 2;
      const y0 = pad.top + yScale(0), yv = pad.top + yScale(d.value);
      const bh = Math.abs(y0 - yv), by = Math.min(y0, yv);
      const isNeg = d.value < 0;
      const barColor = isNeg ? "#f87171" : heatColor(normVals[i]);
      chartBody += `<rect class="chart-bar" x="${x}" y="${by}" width="${bw}" height="${bh}" fill="${barColor}" opacity="${interactive ? 0.92 : 0.85}" rx="${interactive ? 5 : 3}" ${interactive ? `data-label="${d.label}" data-value="${d.value}"` : ""} />`;
    });
  } else if (ds.chartType === "line") {
    const pts = ds.data.map((d,i) => `${xCenter(i)},${pad.top + yScale(d.value)}`).join(" ");
    chartBody += `<polyline points="${pts}" fill="none" stroke="${accent}" stroke-width="${interactive ? 3 : 2.5}" stroke-linejoin="round" stroke-linecap="round" />`;
    if (interactive) {
      ds.data.forEach((d,i) => {
        chartBody += `<circle class="chart-dot" cx="${xCenter(i)}" cy="${pad.top+yScale(d.value)}" r="4.5" fill="${accent}" stroke="white" stroke-width="2" data-label="${d.label}" data-value="${d.value}" />`;
      });
    }
  } else {
    const pts = ds.data.map((d,i) => `${xCenter(i)},${pad.top + yScale(d.value)}`).join(" ");
    const first = xCenter(0), last = xCenter(ds.data.length-1);
    const zeroY = pad.top + yScale(Math.max(0, vMin));
    chartBody += `<defs>
        <linearGradient id="g${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stop-color="${accent}" stop-opacity="${interactive ? 0.35 : 0.25}"/>
          <stop offset="95%" stop-color="${accent}" stop-opacity="0.02"/>
        </linearGradient>
        <linearGradient id="gstroke${uid}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#8b5cf6"/><stop offset="50%" stop-color="#a855f7"/><stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
      </defs>
      <polygon points="${first},${zeroY} ${pts} ${last},${zeroY}" fill="url(#g${uid})" />
      <polyline points="${pts}" fill="none" stroke="url(#gstroke${uid})" stroke-width="${interactive ? 3 : 2.5}" stroke-linejoin="round" stroke-linecap="round" />`;
    if (interactive) {
      ds.data.forEach((d,i) => {
        chartBody += `<circle class="chart-dot" cx="${xCenter(i)}" cy="${pad.top+yScale(d.value)}" r="4.5" fill="${accent}" stroke="white" stroke-width="2" data-label="${d.label}" data-value="${d.value}" />`;
      });
    }
  }

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="chart-svg">${grid}${zeroLine}${yLabels}${xLabels}${chartBody}</svg>`;
}

function renderChart(container, ds, height = 240, interactive = false) {
  if (!container) return;
  const w = container.getBoundingClientRect().width || 400;
  container.innerHTML = buildChart(ds, w, height, interactive);
  if (interactive) attachTooltip(container, ds);
}

function attachTooltip(container, ds) {
  const tooltip = document.getElementById("chart-tooltip");
  const ttLabel = document.getElementById("tt-label");
  const ttValue = document.getElementById("tt-value");
  if(!tooltip) return;
  container.querySelectorAll("[data-label]").forEach(el => {
    el.style.cursor = "crosshair";
    el.addEventListener("mouseenter", e => {
      const label = el.dataset.label, val = parseFloat(el.dataset.value);
      ttLabel.textContent = label;
      ttValue.textContent = val + ds.unit;
      ttValue.style.color = val < 0 ? "#f87171" : ds.accent;
      tooltip.style.border = `1px solid ${ds.accent}60`;
      tooltip.style.boxShadow = `0 8px 32px ${ds.accent}20`;
      tooltip.style.display = "block";
    });
    el.addEventListener("mousemove", e => {
      tooltip.style.left = (e.clientX + 14) + "px";
      tooltip.style.top  = (e.clientY - 40) + "px";
    });
    el.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
  });
}

function renderCompareOverlay(container, ds) {
  const svg = container.querySelector("svg");
  if (!svg || !ds.compareData?.length) return;
  const mainData = ds.data, cmpData = ds.compareData;
  const w = parseFloat(svg.getAttribute("viewBox")?.split(" ")[2]) || 600;
  const h = parseFloat(svg.getAttribute("viewBox")?.split(" ")[3]) || 320;
  const pad = { top:20, bottom:40, left:52, right:16 };
  const allVals = [...mainData.map(d=>d.value), ...cmpData.map(d=>d.value)];
  const vMin = Math.min(...allVals), vMax = Math.max(...allVals);
  const range = vMax - vMin || 1;
  const innerW = w - pad.left - pad.right, innerH = h - pad.top - pad.bottom;
  const n = mainData.length;
  const xCenter = i => pad.left + (i + 0.5) * (innerW / n);
  const yScale  = v => innerH * (1 - (v - vMin) / range);
  const pts = cmpData.map((d, i) => {
    const xi = mainData.findIndex(m => m.label === d.label);
    const x = xi >= 0 ? xCenter(xi) : xCenter(Math.min(i, n-1));
    return `${x.toFixed(1)},${(pad.top + yScale(d.value)).toFixed(1)}`;
  }).join(" ");
  const label = ds.compareLabel || "Comparison";
  const overlay = document.createElementNS("http://www.w3.org/2000/svg","g");
  overlay.innerHTML = `<polyline points="${pts}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round" stroke-linecap="round" opacity="0.85" /><text x="${w - pad.right}" y="${pad.top - 4}" text-anchor="end" font-size="10" fill="#94a3b8" font-style="italic">— ${label}</text>`;
  svg.appendChild(overlay);
}

function renderAnnotations(container, ds) {
  const svg = container.querySelector("svg");
  if (!svg || !ds.annotations?.length) return;
  const w = parseFloat(svg.getAttribute("viewBox")?.split(" ")[2]) || 600;
  const h = parseFloat(svg.getAttribute("viewBox")?.split(" ")[3]) || 320;
  const pad = { top:20, bottom:40, left:52, right:16 };
  const vals = ds.data.map(d=>d.value);
  const vMin = Math.min(...vals), vMax = Math.max(...vals);
  const range = vMax - vMin || 1;
  const innerW = w - pad.left - pad.right, innerH = h - pad.top - pad.bottom;
  const n = ds.data.length;
  const xCenter = i => pad.left + (i + 0.5) * (innerW / n);
  const yScale  = v => innerH * (1 - (v - vMin) / range);
  ds.annotations.forEach(ann => {
    const idx = ds.data.findIndex(d => String(d.label) === String(ann.label));
    if (idx < 0) return;
    const x = xCenter(idx), y = pad.top + yScale(ds.data[idx].value);
    const g = document.createElementNS("http://www.w3.org/2000/svg","g");
    g.innerHTML = `<line x1="${x}" y1="${y - 6}" x2="${x}" y2="${y - 28}" stroke="${ds.accent}" stroke-width="1.5" stroke-dasharray="3 2" /><rect x="${x - 30}" y="${y - 44}" width="60" height="16" rx="4" fill="${ds.accent}" opacity="0.92" /><text x="${x}" y="${y - 32}" text-anchor="middle" font-size="9" fill="#fff" font-weight="600">${ann.note}</text>`;
    svg.appendChild(g);
  });
}

// THEME
let darkMode = localStorage.getItem("dv-theme") === "dark";
function applyTheme() {
  document.body.classList.toggle("dark", darkMode);
  const label = darkMode ? "☀ Light" : "🌙 Dark";
  document.querySelectorAll(".theme-toggle-btn, #theme-toggle").forEach(btn => btn.textContent = label);
  localStorage.setItem("dv-theme", darkMode ? "dark" : "light");
}
function toggleTheme() { darkMode = !darkMode; applyTheme(); }