/* Login/Signup UI & API logic */

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function toast(message, type = "info") {
  if (window.Toast) {
    if (type === "success") window.Toast.success("Success", message);
    else if (type === "error") window.Toast.error("Error", message);
    else if (type === "warning") window.Toast.warn("Warning", message);
    else window.Toast.info("Info", message);
  } else {
    console.log(`[Toast ${type}]: ${message}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  let currentMode = "login";
  const authForm = qs("#authForm");
  const nameField = qs("#nameField");
  const loginExtras = qs("#loginExtras");
  const demoExtras = qs("#demoExtras");
  const submitBtnText = qs("#submitBtnText");
  const demo = qs("#demoLogin");
  
  // Tabs logic
  const tabs = qsa(".auth__tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      currentMode = tab.dataset.target;
      
      if (currentMode === "signup") {
        if (nameField) nameField.style.display = "grid";
        if (loginExtras) loginExtras.style.display = "none";
        if (demoExtras) demoExtras.style.display = "none";
        if (submitBtnText) submitBtnText.textContent = "Create Account";
        if (authForm && authForm.name) authForm.name.required = true;
      } else {
        if (nameField) nameField.style.display = "none";
        if (loginExtras) loginExtras.style.display = "flex";
        if (demoExtras) demoExtras.style.display = "block";
        if (submitBtnText) submitBtnText.textContent = "Sign in";
        if (authForm && authForm.name) authForm.name.required = false;
      }
    });
  });

  // Password toggle
  qsa(".togglePassword, #togglePassword").forEach(toggle => {
    toggle.addEventListener("click", () => {
      const control = toggle.closest(".field__control");
      const input = qs("input", control);
      if (!input) return;
      const next = input.type === "password" ? "text" : "password";
      input.type = next;
      const icon = toggle.querySelector("[data-lucide]");
      if (icon) icon.setAttribute("data-lucide", next === "password" ? "eye" : "eye-off");
      if (window.lucide?.createIcons) window.lucide.createIcons();
    });
  });

  const goDashboard = () => {
    window.location.href = "dashboard.html";
  };

  const forgotBtn = qs("#forgotPassword");
  if (forgotBtn) {
    forgotBtn.addEventListener("click", () => {
      toast("Password reset is not available in the demo.", "info");
    });
  }

  if (demo) demo.addEventListener("click", () => {
    toast("Demo mode is disabled. Please create an account.", "error");
  });

  const API_BASE = "http://localhost:5000/api/auth";

  const handleAuth = async (url, body) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Authentication failed");
      
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data));
      goDashboard();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = authForm.email.value;
      const password = authForm.password.value;
      
      if (currentMode === "login") {
        if (!email || !password) return toast("Fill all fields", "error");
        handleAuth(`${API_BASE}/login`, { email, password });
      } else {
        const name = authForm.name.value;
        if (!name || !email || !password) return toast("Fill all fields", "error");
        handleAuth(`${API_BASE}/signup`, { name, email, password });
      }
    });
  }
});
