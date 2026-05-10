/* Dashboard Analytics & Charts */

let charts = {};

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function rgba(hex, alpha) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Animated counter for numbers
 */
function animateValue(id, start, end, duration) {
  const obj = typeof id === "string" ? qs(id) : id;
  if (!obj) return;
  
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const current = Math.floor(progress * (end - start) + start);
    obj.textContent = current;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

/**
 * Show empty state in chart container
 */
function showEmptyState(canvasId, title, text) {
  const canvas = qs(`#${canvasId}`);
  if (!canvas) return;
  
  const container = canvas.parentElement;
  container.innerHTML = `
    <div class="empty-state">
      <i data-lucide="bar-chart-3"></i>
      <div class="empty-state__title">${title}</div>
      <div class="empty-state__text">${text}</div>
    </div>
    <canvas id="${canvasId}" style="display:none"></canvas>
  `;
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Initialize or update charts
 */
function renderCharts(data) {
  const indigo = getCssVar("--indigo") || "#7c6bff";
  const blue = getCssVar("--blue") || "#66a7ff";
  const cyan = getCssVar("--cyan") || "#4fe3ff";
  const good = getCssVar("--good") || "#3ddc97";
  const bad = getCssVar("--bad") || "#ff5a7a";
  const textMuted = getCssVar("--muted") || "rgba(255,255,255,0.7)";
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(10, 15, 30, 0.92)",
        borderColor: "rgba(255,255,255,0.12)",
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        displayColors: true,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textMuted, font: { size: 11 } } },
      y: { 
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,0.05)" }, 
        ticks: { 
          color: textMuted, 
          precision: 0,
          font: { size: 11 }
        } 
      }
    }
  };

  // 1. Trend Chart (Line/Area) - Fill gaps for 12 months
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendLabels = [];
  const trendValues = [];
  
  // Create last 12 months data structure
  let current = new Date();
  for (let i = 11; i >= 0; i--) {
    let d = new Date(current.getFullYear(), current.getMonth() - i, 1);
    let m = d.getMonth() + 1;
    let y = d.getFullYear();
    
    trendLabels.push(`${months[m-1]} ${y}`);
    
    const match = (data.monthlyTrend || []).find(item => item._id.month === m && item._id.year === y);
    trendValues.push(match ? match.count : 0);
  }

  const trendCtx = qs("#trendChart").getContext("2d");
  if (charts.trend) charts.trend.destroy();
  charts.trend = new Chart(trendCtx, {
    type: "line",
    data: {
      labels: trendLabels,
      datasets: [{
        label: "Applications",
        data: trendValues,
        borderColor: blue,
        backgroundColor: rgba(blue, 0.1),
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2
      }]
    },
    options: {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        x: { 
          ...chartOptions.scales.x, 
          ticks: { 
            ...chartOptions.scales.x.ticks, 
            maxRotation: 45, 
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 12
          } 
        }
      }
    }
  });

  // 2. Status Chart (Doughnut)
  if (data.statusDistribution && data.statusDistribution.length > 0) {
    const ctx = qs("#statusChart").getContext("2d");
    const labels = data.statusDistribution.map(item => item._id);
    const values = data.statusDistribution.map(item => item.count);
    const colors = [indigo, blue, good, bad, "#ffcc66"];

    if (charts.status) charts.status.destroy();
    charts.status = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.map(c => rgba(c, 0.7)),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 12
        }]
      },
      options: {
        ...chartOptions,
        plugins: {
          ...chartOptions.plugins,
          legend: { 
            display: true, 
            position: 'bottom', 
            labels: { color: textMuted, padding: 20, usePointStyle: true, font: { size: 11 } } 
          }
        },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
  } else {
    showEmptyState("statusChart", "No Status Data", "Your application pipeline is empty.");
  }

  // 3. Priority Mix (Bar)
  if (data.priorityDistribution && data.priorityDistribution.length > 0) {
    const ctx = qs("#priorityChart").getContext("2d");
    const labels = data.priorityDistribution.map(item => item._id);
    const values = data.priorityDistribution.map(item => item.count);

    if (charts.priority) charts.priority.destroy();
    charts.priority = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Count",
          data: values,
          backgroundColor: rgba(cyan, 0.6),
          borderColor: cyan,
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 24
        }]
      },
      options: chartOptions
    });
  } else {
    showEmptyState("priorityChart", "No Priority Data", "Categorize applications by priority.");
  }

  // 4. Company Chart (Horizontal Bar)
  if (data.companyDistribution && data.companyDistribution.length > 0) {
    const ctx = qs("#companyChart").getContext("2d");
    
    // Truncate long company names
    const labels = data.companyDistribution.map(item => {
      const name = item._id || "Unknown";
      return name.length > 12 ? name.substring(0, 10) + "..." : name;
    });
    const values = data.companyDistribution.map(item => item.count);

    if (charts.company) charts.company.destroy();
    charts.company = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Applications",
          data: values,
          backgroundColor: rgba(indigo, 0.6),
          borderColor: indigo,
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 20
        }]
      },
      options: {
        ...chartOptions,
        indexAxis: 'y',
        scales: {
          y: { ...chartOptions.scales.y, grid: { display: false } },
          x: { ...chartOptions.scales.x, grid: { display: true, color: "rgba(255,255,255,0.05)" } }
        }
      }
    });
  } else {
    showEmptyState("companyChart", "No Company Data", "Apply to more companies to see this.");
  }
}

/**
 * Main dashboard update logic
 */
async function loadDashboardAnalytics() {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      const nameDisplay = qs("#userNameDisplay");
      if (nameDisplay && u.name) nameDisplay.textContent = u.name;
    } catch (e) {}
  }

  if (!window.CompanyApi) return;

  // Add loading state
  qsa(".metric, .chart-card").forEach(el => el.classList.add("is-loading"));

  try {
    const res = await window.CompanyApi.getAnalytics();
    if (!res.success) throw new Error(res.message);
    const data = res.data;

    // Update Summary Metrics with Animation
    const s = data.summary;
    animateValue("#mTotal", 0, s.total, 1000);
    animateValue("#mSelected", 0, s.selected, 1000);
    animateValue("#mRejected", 0, s.rejected, 1000);
    animateValue("#mInterviews", 0, s.interviews, 1000);
    animateValue("#mSuccessRate", 0, s.successRate, 1000);
    animateValue("#mActive", 0, s.active, 1000);

    // Render Charts
    renderCharts(data);

    // Refresh notifications if manager is ready
    if (window.NotificationManager) {
      window.NotificationManager.loadNotifications();
    }

  } catch (err) {
    console.error("Dashboard failed to load analytics:", err);
  } finally {
    qsa(".metric, .chart-card").forEach(el => {
      el.classList.remove("is-loading");
      const skeletons = qsa(".skeleton", el);
      skeletons.forEach(s => s.classList.remove("skeleton"));
    });
  }
}

function initQuickActions() {
  qsa("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const a = btn.getAttribute("data-action");
      if (a === "viewCompanies" || a === "addCompany") window.location.href = "company.html";
      if (a === "addNote") window.location.href = "notes.html";
      if (a === "addInterview") window.location.href = "company.html";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initQuickActions();
  loadDashboardAnalytics();
  
  // Refresh on focus (keep data fresh)
  window.addEventListener("focus", () => {
    loadDashboardAnalytics();
  });
});
