/* Login UI (frontend-only for now). */

function qs(sel, root = document) {
  return root.querySelector(sel);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = qs("#loginForm");
  const demo = qs("#demoLogin");
  const toggle = qs("#togglePassword");

  if (toggle) {
    toggle.addEventListener("click", () => {
      const input = qs('input[name="password"]');
      if (!input) return;
      const next = input.type === "password" ? "text" : "password";
      input.type = next;
      const icon = toggle.querySelector("[data-lucide]");
      if (icon) icon.setAttribute("data-lucide", next === "password" ? "eye" : "eye-off");
      if (window.lucide?.createIcons) window.lucide.createIcons();
    });
  }

  const goDashboard = () => {
    window.location.href = "dashboard.html";
  };

  if (demo) demo.addEventListener("click", goDashboard);

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      goDashboard();
    });
  }
});

