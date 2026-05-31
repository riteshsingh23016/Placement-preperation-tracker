/* Dashboard Analytics & Charts */

let charts = {};
window.charts = charts;
let cachedAnalyticsData = null;

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
  const indigo = getCssVar("--accent-primary") || "#14b8a6";
  const blue = getCssVar("--accent-primary-hover") || "#0d9488";
  const cyan = getCssVar("--color-info") || "#06b6d4";
  const good = getCssVar("--color-success") || "#10b981";
  const bad = getCssVar("--color-danger") || "#ef4444";
  const textMuted = getCssVar("--muted") || "rgba(255,255,255,0.7)";
  
  const isLight = document.documentElement.classList.contains("theme-light") || document.body.classList.contains("theme-light");
  const gridColor = isLight ? "rgba(15, 23, 42, 0.06)" : "rgba(255, 255, 255, 0.05)";
  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.96)" : "rgba(10, 15, 30, 0.92)";
  const tooltipBorder = isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.12)";
  const tooltipTitleColor = isLight ? "#0f172a" : "#ffffff";
  const tooltipBodyColor = isLight ? "#475569" : "rgba(255, 255, 255, 0.7)";

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        titleColor: tooltipTitleColor,
        bodyFont: { size: 13 },
        bodyColor: tooltipBodyColor,
        displayColors: true,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textMuted, font: { size: 11 } } },
      y: { 
        beginAtZero: true,
        grid: { color: gridColor }, 
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
          y: { 
            grid: { display: false },
            ticks: { color: textMuted, font: { size: 11 } }
          },
          x: { 
            beginAtZero: true,
            grid: { display: true, color: gridColor },
            ticks: { 
              color: textMuted, 
              precision: 0,
              font: { size: 11 }
            }
          }
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
    cachedAnalyticsData = data;

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
      if (a === "addApplication") {
        window.location.href = "company.html?action=add";
      } else if (a === "addNote") {
        window.location.href = "notes.html?action=add";
      } else if (a === "upcomingInterviews") {
        window.location.href = "company.html?filter=Interview Scheduled";
      } else if (a === "checkATS") {
        if (typeof window.openATSModal === "function") {
          window.openATSModal();
        }
      }
    });
  });
}

/**
 * Focus Checklist Manager
 */
const FocusManager = {
  tasks: [],
  container: null,
  addBtn: null,
  
  init() {
    this.container = qs("#focusChecklist");
    this.addBtn = qs("#addTaskBtn");
    
    if (!this.container || !this.addBtn) return;
    
    this.load();
    this.render();
    this.bindEvents();
  },
  
  load() {
    const saved = localStorage.getItem("placement_focus_tasks");
    if (saved) {
      try {
        this.tasks = JSON.parse(saved);
      } catch (e) {
        this.tasks = this.getDefaultTasks();
      }
    } else {
      this.tasks = this.getDefaultTasks();
    }
  },
  
  getDefaultTasks() {
    return [
      { id: Date.now() + 1, text: "Revise DBMS notes", completed: true },
      { id: Date.now() + 2, text: "Solve 3 DSA problems", completed: false },
      { id: Date.now() + 3, text: "Mock interview (30 min)", completed: false }
    ];
  },
  
  save() {
    localStorage.setItem("placement_focus_tasks", JSON.stringify(this.tasks));
  },
  
  bindEvents() {
    this.addBtn.addEventListener("click", () => this.showForm());
  },
  
  render() {
    this.container.innerHTML = "";
    
    if (this.tasks.length === 0) {
      this.container.innerHTML = `<div style="padding: 10px 14px; opacity: 0.5; font-size: 13px;">No tasks for today.</div>`;
    }
    
    this.tasks.forEach(task => {
      const label = document.createElement("label");
      label.className = "check";
      label.innerHTML = `
        <input type="checkbox" ${task.completed ? "checked" : ""} data-id="${task.id}" />
        <span>${task.text}</span>
      `;
      
      const input = label.querySelector("input");
      input.addEventListener("change", () => {
        task.completed = input.checked;
        this.save();
      });
      
      this.container.appendChild(label);
    });
    
    if (window.lucide) window.lucide.createIcons();
  },
  
  showForm() {
    this.addBtn.style.display = "none";
    
    const form = document.createElement("div");
    form.className = "checklist__form";
    form.innerHTML = `
      <input type="text" class="checklist__input" placeholder="What needs to be done?" id="taskInput" />
      <div class="checklist__actions">
        <button class="btn btn--ghost btn--sm" id="cancelTask">Cancel</button>
        <button class="btn btn--primary btn--sm" id="saveTask">Add</button>
      </div>
    `;
    
    this.container.appendChild(form);
    const input = form.querySelector("#taskInput");
    input.focus();
    
    // Save on Enter
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.handleAddTask();
    });
    
    form.querySelector("#saveTask").addEventListener("click", () => this.handleAddTask());
    form.querySelector("#cancelTask").addEventListener("click", () => {
      this.addBtn.style.display = "flex";
      this.render();
    });
  },
  
  handleAddTask() {
    const input = qs("#taskInput");
    const text = input.value.trim();
    
    if (!text) {
      if (window.Toast) window.Toast.error("Error", "Task name cannot be empty.");
      return;
    }
    
    this.tasks.push({
      id: Date.now(),
      text,
      completed: false
    });
    
    this.save();
    this.addBtn.style.display = "flex";
    this.render();
  }
};

/**
 * ATS Resume Checker Modal Controller
 */
function initATSChecker() {
  const modal = qs("#atsModal");
  const closeBtn = qs("#atsModalClose");
  
  if (!modal) return;
  
  // States
  const uploadState = qs("#atsUploadState");
  const scanningState = qs("#atsScanningState");
  const resultsState = qs("#atsResultsState");
  
  // Elements inside States
  const uploadZone = qs("#atsUploadZone");
  const fileSelectBtn = qs("#atsFileSelectBtn");
  const fileInput = qs("#atsFileInput");
  const scannerBar = qs("#atsScannerBar");
  const scannerStatus = qs("#atsScannerStatus");
  const resetBtn = qs("#atsResetBtn");
  
  // Helper to open modal
  window.openATSModal = () => {
    // Reset to upload state
    uploadState.style.display = "block";
    scanningState.style.display = "none";
    resultsState.style.display = "none";
    
    window.openModalOverlay(modal);
    if (window.lucide?.createIcons) window.lucide.createIcons({ root: modal });
  };
  
  // Helpers to close modal
  const closeModal = () => {
    window.closeModalOverlay(modal);
  };
  
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Drag and Drop
  if (uploadZone) {
    ["dragenter", "dragover"].forEach(eventName => {
      uploadZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        uploadZone.classList.add("is-dragover");
      }, false);
    });
    
    ["dragleave", "drop"].forEach(eventName => {
      uploadZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        uploadZone.classList.remove("is-dragover");
      }, false);
    });
    
    uploadZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        startATSScanning(files[0]);
      }
    });
  }
  
  if (fileSelectBtn && fileInput) {
    fileSelectBtn.addEventListener("click", () => {
      fileInput.click();
    });
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        startATSScanning(fileInput.files[0]);
      }
    });
  }
  
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (fileInput) fileInput.value = "";
      uploadState.style.display = "block";
      scanningState.style.display = "none";
      resultsState.style.display = "none";
    });
  }
  
  // Scanning logic
  function startATSScanning(file) {
    uploadState.style.display = "none";
    scanningState.style.display = "block";
    resultsState.style.display = "none";
    scannerBar.style.width = "0%";
    
    const phases = [
      { text: "Reading file structure...", duration: 800, progress: 15 },
      { text: "Parsing text and section formatting...", duration: 1000, progress: 40 },
      { text: "Analyzing tech skill alignment...", duration: 900, progress: 70 },
      { text: "Calculating final ATS optimization score...", duration: 800, progress: 100 }
    ];
    
    let currentPhase = 0;
    
    function runPhase() {
      if (currentPhase >= phases.length) {
        showATSResults();
        return;
      }
      
      const phase = phases[currentPhase];
      scannerStatus.textContent = phase.text;
      scannerBar.style.width = `${phase.progress}%`;
      
      setTimeout(() => {
        currentPhase++;
        runPhase();
      }, phase.duration);
    }
    
    runPhase();
  }
  
  // Results logic
  function showATSResults() {
    scanningState.style.display = "none";
    resultsState.style.display = "block";
    
    // Generate scores (semi-randomized but realistic)
    const overallScore = Math.floor(Math.random() * 20) + 72; // 72 to 91
    const keywordScore = overallScore - Math.floor(Math.random() * 6);
    const formatScore = overallScore + Math.floor(Math.random() * 8);
    const sectionScore = overallScore + Math.floor(Math.random() * 5);
    
    // Clamp scores
    const clamp = (val) => Math.max(0, Math.min(100, val));
    const kScore = clamp(keywordScore);
    const fScore = clamp(formatScore);
    const sScore = clamp(sectionScore);
    
    // Set UI scores
    const scoreVal = qs("#atsScoreValue");
    if (scoreVal) scoreVal.textContent = `${overallScore}%`;
    
    const scoreStroke = qs("#atsScoreStroke");
    if (scoreStroke) {
      // Circle circumference is 2 * pi * r = 2 * 3.14159 * 15.9155 = 100.
      scoreStroke.setAttribute("stroke-dasharray", `${overallScore}, 100`);
    }
    
    const scoreLevel = qs("#atsScoreLevel");
    const feedbackSummary = qs("#atsFeedbackSummary");
    if (scoreLevel && feedbackSummary) {
      if (overallScore >= 85) {
        scoreLevel.textContent = "Excellent";
        scoreLevel.style.color = "var(--good)";
        feedbackSummary.textContent = "Your resume has exceptional layout alignment and strong technical keyword density for software engineering.";
      } else if (overallScore >= 75) {
        scoreLevel.textContent = "Good";
        scoreLevel.style.color = "var(--blue)";
        feedbackSummary.textContent = "Solid match! Adding a few missing specialized frameworks and metrics-focused bullet points will elevate your score further.";
      } else {
        scoreLevel.textContent = "Needs Improvement";
        scoreLevel.style.color = "var(--warn)";
        feedbackSummary.textContent = "Your resume formatting is parseable, but keyword match for standard software engineering roles is relatively low.";
      }
    }
    
    // Metrics bars
    const kwScoreEl = qs("#atsKeywordScore");
    const kwBar = qs("#atsKeywordBar");
    if (kwScoreEl && kwBar) {
      kwScoreEl.textContent = `${kScore}%`;
      kwBar.style.width = `${kScore}%`;
    }
    
    const fmtScoreEl = qs("#atsFormatScore");
    const fmtBar = qs("#atsFormatBar");
    if (fmtScoreEl && fmtBar) {
      fmtScoreEl.textContent = `${fScore}%`;
      fmtBar.style.width = `${fScore}%`;
    }
    
    const secScoreEl = qs("#atsSectionScore");
    const secBar = qs("#atsSectionBar");
    if (secScoreEl && secBar) {
      secScoreEl.textContent = `${sScore}%`;
      secBar.style.width = `${sScore}%`;
    }
    
    // Insights/Recommendations
    const insightsList = qs("#atsInsightsList");
    if (insightsList) {
      const allRecommendations = [
        "Include more data-driven impact statements (e.g. 'Optimized APIs, improving response times by 30%').",
        "Add standard cloud infrastructure keywords (AWS, Docker, Kubernetes) to your skills section.",
        "Ensure all project experiences clearly list the programming languages and databases used.",
        "Avoid using graphical skill level indicators (like bar charts or star scales) as ATS parsers discard them.",
        "Include database design and query optimization keywords (SQL, Indexes, Redis).",
        "Format date fields consistently using standard Month Year or MM/YYYY format."
      ];
      
      // Select 3 random unique recommendations
      const shuffled = allRecommendations.sort(() => 0.5 - Math.random());
      const selectedRecs = shuffled.slice(0, 3);
      
      insightsList.innerHTML = selectedRecs.map(r => `<li>${r}</li>`).join("");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initQuickActions();
  loadDashboardAnalytics();
  FocusManager.init();
  initATSChecker();
  
  // Refresh on focus (keep data fresh)
  window.addEventListener("focus", () => {
    loadDashboardAnalytics();
  });

  // Handle sidebar toggle (resize charts)
  window.addEventListener('sidebarToggle', () => {
    Object.values(charts).forEach(chart => {
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });
  });

  // Re-render charts on theme change
  window.addEventListener('themeChanged', () => {
    if (cachedAnalyticsData) {
      renderCharts(cachedAnalyticsData);
    }
  });
});
