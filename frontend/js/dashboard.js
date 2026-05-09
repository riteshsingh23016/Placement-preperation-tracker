/* Dashboard charts + quick actions (frontend-only demo data). */

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

function initProgressChart() {
  const canvas = qs("#progressChart");
  if (!canvas || !window.Chart) return;

  const indigo = getCssVar("--indigo") || "#7c6bff";
  const blue = getCssVar("--blue") || "#66a7ff";
  const text = getCssVar("--muted") || "rgba(255,255,255,0.7)";

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, rgba(indigo, 0.38));
  gradient.addColorStop(1, rgba(indigo, 0.02));

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = [2, 3, 2, 4, 3, 4, 5];

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Progress",
          data,
          tension: 0.35,
          borderColor: rgba(blue, 0.95),
          backgroundColor: gradient,
          fill: true,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          pointBackgroundColor: rgba(indigo, 0.95),
          pointBorderColor: rgba("#0b1020", 0),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(10, 15, 30, 0.92)",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          titleColor: "rgba(255,255,255,0.92)",
          bodyColor: "rgba(255,255,255,0.75)",
          displayColors: false,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: text, font: { weight: 600 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: text, font: { weight: 600 }, precision: 0 },
        },
      },
    },
  });

  qsa(".segmented__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      qsa(".segmented__btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      const range = btn.getAttribute("data-range") || "7";
      const map = {
        "7": { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], data: [2, 3, 2, 4, 3, 4, 5] },
        "30": { labels: ["W1", "W2", "W3", "W4"], data: [7, 10, 12, 15] },
        "90": { labels: ["M1", "M2", "M3"], data: [16, 20, 24] },
      };
      const next = map[range] || map["7"];
      chart.data.labels = next.labels;
      chart.data.datasets[0].data = next.data;
      chart.update();
    });
  });
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
  initProgressChart();
  initQuickActions();
});

