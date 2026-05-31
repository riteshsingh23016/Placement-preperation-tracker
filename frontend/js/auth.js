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

/**
 * Validates email format according to strict production requirements
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Trim before validation
  const trimmed = email.trim();
  
  // No spaces anywhere
  if (/\s/.test(trimmed)) return false;
  
  // Exactly one @ symbol
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  
  const [local, domain] = parts;
  
  // Valid local part before @
  if (!local) return false;
  
  // Valid domain after @ (must contain at least one dot)
  if (!domain || !domain.includes('.')) return false;
  
  const domainParts = domain.split('.');
  
  // Domain extension must be at least 2 characters
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  
  // No empty parts in domain (e.g. you@.edu or you@college.)
  if (domainParts.some(p => p === "")) return false;

  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  let currentMode = "login";
  let selectedRole = null;

  const roleSelection = qs("#roleSelection");
  const authContent = qs("#authContent");
  const roleCards = qsa(".role-card");
  const backBtn = qs("#backToRole");

  const authForm = qs("#authForm");
  const nameField = qs("#nameField");
  const loginExtras = qs("#loginExtras");
  const adminNote = qs("#adminNote");
  const submitBtnText = qs("#submitBtnText");
  
  const panelTitle = qs("#panelTitle");
  const panelSubtitle = qs("#panelSubtitle");
  const authTabs = qs("#authTabs");

  // Role Selection Logic
  roleCards.forEach(card => {
    card.addEventListener("click", () => {
      selectedRole = card.dataset.role;
      showAuthForm();
    });
  });

  backBtn.addEventListener("click", () => {
    roleSelection.style.display = "block";
    authContent.style.display = "none";
    selectedRole = null;
    authContent.removeAttribute("data-active-role");
  });

  function showAuthForm() {
    roleSelection.style.display = "none";
    authContent.style.display = "block";
    authContent.setAttribute("data-active-role", selectedRole);
    
    if (selectedRole === "admin") {
      panelTitle.textContent = "Admin Portal";
      panelSubtitle.textContent = "Sign in to manage the placement tracker.";
      authTabs.style.display = "none";
      adminNote.style.display = "block";
      currentMode = "login";
      if (nameField) nameField.style.display = "none";
      if (loginExtras) loginExtras.style.display = "flex";
      if (submitBtnText) submitBtnText.textContent = "Admin Sign in";
    } else {
      panelTitle.textContent = "Welcome";
      panelSubtitle.textContent = "Sign in or create an account to track your progress.";
      authTabs.style.display = "flex";
      adminNote.style.display = "none";
      switchToTab("login");
    }
  }

  function switchToTab(target) {
    const tabs = qsa(".auth__tab");
    tabs.forEach(t => {
      if (t.dataset.target === target) t.classList.add("is-active");
      else t.classList.remove("is-active");
    });
    currentMode = target;
    
    if (currentMode === "signup") {
      if (nameField) nameField.style.display = "grid";
      if (loginExtras) loginExtras.style.display = "none";
      if (submitBtnText) submitBtnText.textContent = "Create Account";
      if (authForm && authForm.name) authForm.name.required = true;
    } else {
      if (nameField) nameField.style.display = "none";
      if (loginExtras) loginExtras.style.display = "flex";
      if (submitBtnText) submitBtnText.textContent = "Sign in";
      if (authForm && authForm.name) authForm.name.required = false;
    }
  }

  // Tabs logic
  const tabs = qsa(".auth__tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      switchToTab(tab.dataset.target);
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
      if (window.lucide?.createIcons) window.lucide.createIcons({ root: toggle });
    });
  });

  const redirectUser = (role) => {
    if (role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "dashboard.html";
    }
  };

  const forgotBtn = qs("#forgotPassword");
  const forgotModal = qs("#forgotPasswordModal");
  const forgotClose = qs("#forgotClose");
  const forgotForm = qs("#forgotForm");
  const forgotInputState = qs("#forgotInputState");
  const forgotSuccessState = qs("#forgotSuccessState");
  const recoveryEmailDisplay = qs("#recoveryEmailDisplay");
  const forgotSuccessDoneBtn = qs("#forgotSuccessDoneBtn");

  if (forgotBtn && forgotModal) {
    forgotBtn.addEventListener("click", () => {
      // Reset state views
      if (forgotInputState) forgotInputState.style.display = "block";
      if (forgotSuccessState) forgotSuccessState.style.display = "none";
      if (forgotForm) forgotForm.reset();
      
      // Close parent auth modal overlay first
      const authModal = qs("#authModal");
      if (authModal) {
        authModal.classList.remove("is-open");
        setTimeout(() => {
          authModal.setAttribute("hidden", "");
        }, 350);
      }

      forgotModal.removeAttribute("hidden");
      setTimeout(() => {
        forgotModal.classList.add("is-open");
        if (window.lucide?.createIcons) window.lucide.createIcons({ root: forgotModal });
      }, 10);
    });
  }

  const closeForgotModal = () => {
    if (forgotModal) {
      forgotModal.classList.remove("is-open");
      setTimeout(() => {
        if (!forgotModal.classList.contains("is-open")) {
          forgotModal.setAttribute("hidden", "");
        }
      }, 350);
    }
  };

  if (forgotClose) forgotClose.addEventListener("click", closeForgotModal);
  if (forgotSuccessDoneBtn) forgotSuccessDoneBtn.addEventListener("click", closeForgotModal);
  if (forgotModal) {
    forgotModal.addEventListener("click", (e) => {
      if (e.target === forgotModal) closeForgotModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeForgotModal();
  });

  if (forgotForm) {
    forgotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailInput = qs("#forgotEmailInput");
      const email = emailInput ? emailInput.value.trim() : "";
      if (!email) {
        return toast("Please enter your email address.", "error");
      }
      if (!isValidEmail(email)) {
        return toast("Please enter a valid email address.", "error");
      }

      // Simulate sending password reset email
      if (recoveryEmailDisplay) recoveryEmailDisplay.textContent = email;
      if (forgotInputState) forgotInputState.style.display = "none";
      if (forgotSuccessState) forgotSuccessState.style.display = "block";
      if (window.lucide?.createIcons) window.lucide.createIcons({ root: forgotSuccessState });
      toast("Password reset email sent (Simulation).", "success");
    });
  }



  const API_BASE = `${window.APP_API_BASE}/auth`;

  const handleAuth = async (url, body) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Authentication failed");
      
      const user = data.data;
      
      // Role enforcement on frontend
      if (selectedRole === "admin" && user.role !== "admin") {
        throw new Error("This is a student account. Please use Student Login.");
      }
      if (selectedRole === "student" && user.role !== "student") {
        throw new Error("This is an admin account. Please use Admin Login.");
      }

      localStorage.setItem("token", user.token);
      localStorage.setItem("user", JSON.stringify(user));
      
      redirectUser(user.role);
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast(err.message, "error");
    }
  };

  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      let email = authForm.email.value.trim();
      const password = authForm.password.value;
      
      // Email validation
      if (!isValidEmail(email)) {
        return toast("Please enter a valid email address without spaces.", "error");
      }

      // Normalize email to lowercase
      email = email.toLowerCase();
      
      if (currentMode === "login") {
        if (!email || !password) return toast("Fill all fields", "error");
        handleAuth(`${API_BASE}/login`, { email, password, expectedRole: selectedRole });
      } else {
        const name = authForm.name.value.trim();
        if (!name || !email || !password) return toast("Fill all fields", "error");
        handleAuth(`${API_BASE}/signup`, { name, email, password });
      }
    });
  }
});
