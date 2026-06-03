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

  // Verification State Elements
  const verificationInfoState = qs("#verificationInfoState");
  const verificationEmailDisplay = qs("#verificationEmailDisplay");
  const verificationDoneBtn = qs("#verificationDoneBtn");

  // Verification & Warning Elements
  const unverifiedAlert = qs("#unverifiedAlert");
  const verifyAccountBtn = qs("#verifyAccountBtn");
  const resendVerificationBtn = qs("#resendVerificationBtn");
  const emailVerifyOtpForm = qs("#emailVerifyOtpForm");
  const emailVerifyOtpInput = qs("#emailVerifyOtpInput");
  const emailVerifyOtpSubmitBtn = qs("#emailVerifyOtpSubmitBtn");
  const resendVerificationLinkBtn = qs("#resendVerificationLinkBtn");
  const verificationBackBtn = qs("#verificationBackBtn");
  
  let unverifiedEmail = ""; // To store the email for resend/OTP verification

  // Forgot Password OTP Elements
  const forgotOtpState = qs("#forgotOtpState");
  const otpResetForm = qs("#otpResetForm");
  const otpEmailHidden = qs("#otpEmailHidden");

  // Check URL query parameters for verification status
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("verified") === "true") {
    toast("Email verified successfully! You can now sign in.", "success");
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (urlParams.get("verified") === "false") {
    const err = urlParams.get("error") || "verification_failed";
    const msg = err === "invalid_or_expired_token"
      ? "The verification link is invalid or has expired. Please sign up again or resend verification."
      : "Email verification failed.";
    toast(msg, "error");
    window.history.replaceState({}, document.title, window.location.pathname);
  }

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
    
    // Clear and reset form to start empty and override browser autofill leaks
    if (authForm) {
      authForm.reset();
      authForm.email.value = "";
      authForm.password.value = "";
      if (authForm.name) authForm.name.value = "";
    }
    
    // Reset verification info states if backing out or reloading
    if (verificationInfoState) verificationInfoState.style.display = "none";
    if (authForm) authForm.style.display = "block";
    if (unverifiedAlert) unverifiedAlert.style.display = "none";
    const resendWarningBox = document.getElementById("resendWarningBox");
    if (resendWarningBox) resendWarningBox.style.display = "none";
    const verificationWarningBox = document.getElementById("verificationWarningBox");
    if (verificationWarningBox) verificationWarningBox.style.display = "none";
    
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
    
    if (unverifiedAlert) unverifiedAlert.style.display = "none";

    const resendWarningBox = document.getElementById("resendWarningBox");
    if (resendWarningBox) resendWarningBox.style.display = "none";
    const verificationWarningBox = document.getElementById("verificationWarningBox");
    if (verificationWarningBox) verificationWarningBox.style.display = "none";

    // Clear form inputs on tab switch to prevent browser autofill/crossover leaks
    if (authForm) {
      authForm.reset();
      authForm.email.value = "";
      authForm.password.value = "";
      if (authForm.name) authForm.name.value = "";
    }
    
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
      const control = toggle.closest(".field__control") || toggle.closest(".field");
      const input = qs("input", control);
      if (!input) return;
      const next = input.type === "password" ? "text" : "password";
      input.type = next;
      // Reconstruct element content to ensure fresh Lucide render of the eye/eye-off icon
      toggle.innerHTML = `<i data-lucide="${next === "password" ? "eye" : "eye-off"}"></i>`;
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
      if (forgotOtpState) forgotOtpState.style.display = "none";
      if (forgotSuccessState) forgotSuccessState.style.display = "none";
      if (forgotForm) forgotForm.reset();
      if (otpResetForm) otpResetForm.reset();

      const forgotWarningBox = document.getElementById("forgotWarningBox");
      if (forgotWarningBox) forgotWarningBox.style.display = "none";
      
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
    const forgotWarningBox = document.getElementById("forgotWarningBox");
    if (forgotWarningBox) forgotWarningBox.style.display = "none";

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

  const API_BASE = `${window.APP_API_BASE}/auth`;

  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailInput = qs("#forgotEmailInput");
      const email = emailInput ? emailInput.value.trim() : "";
      if (!email) {
        return toast("Please enter your email address.", "error");
      }
      if (!isValidEmail(email)) {
        return toast("Please enter a valid email address.", "error");
      }

      const forgotWarningBox = document.getElementById("forgotWarningBox");
      const forgotWarningText = document.getElementById("forgotWarningText");
      if (forgotWarningBox) forgotWarningBox.style.display = "none";

      try {
        const res = await fetch(`${API_BASE}/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!data.success) {
          if (res.status === 403 && data.isSandboxError) {
            if (forgotWarningBox && forgotWarningText) {
              forgotWarningText.textContent = data.message;
              forgotWarningBox.style.display = "block";
              if (window.lucide?.createIcons) window.lucide.createIcons({ root: forgotWarningBox });
            }
            return; // Return early without throwing to prevent duplicate toast
          }
          throw new Error(data.message || "Failed to process request");
        }

        if (otpEmailHidden) otpEmailHidden.value = email;
        if (recoveryEmailDisplay) recoveryEmailDisplay.textContent = email;
        if (forgotInputState) forgotInputState.style.display = "none";
        if (forgotOtpState) {
          forgotOtpState.style.display = "block";
          if (window.lucide?.createIcons) window.lucide.createIcons({ root: forgotOtpState });
        }
        toast("Verification OTP code sent to your email.", "success");
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  if (otpResetForm) {
    otpResetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = otpEmailHidden ? otpEmailHidden.value : "";
      const otpInput = qs("#forgotOtpInput");
      const otp = otpInput ? otpInput.value.trim() : "";
      const newPasswordInput = qs("#forgotNewPasswordInput");
      const newPassword = newPasswordInput ? newPasswordInput.value : "";
      const confirmPasswordInput = qs("#forgotConfirmPasswordInput");
      const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";

      if (!otp || !newPassword || !confirmPassword) {
        return toast("Please fill in all fields.", "error");
      }
      if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        return toast("OTP must be a 6-digit number.", "error");
      }
      if (newPassword !== confirmPassword) {
        return toast("Passwords do not match.", "error");
      }
      if (newPassword.length < 6) {
        return toast("Password must be at least 6 characters.", "error");
      }

      try {
        const res = await fetch(`${API_BASE}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, newPassword })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to reset password");

        if (forgotOtpState) forgotOtpState.style.display = "none";
        if (forgotSuccessState) {
          forgotSuccessState.style.display = "block";
          if (window.lucide?.createIcons) window.lucide.createIcons({ root: forgotSuccessState });
        }
        toast("Password updated successfully!", "success");
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  if (verificationDoneBtn) {
    verificationDoneBtn.addEventListener("click", () => {
      if (verificationInfoState) verificationInfoState.style.display = "none";
      if (authForm) {
        authForm.style.display = "block";
        authForm.reset();
      }
      if (authTabs) authTabs.style.display = "flex";
      switchToTab("login");
    });
  }

  const handleAuth = async (url, body) => {
    try {
      if (unverifiedAlert) unverifiedAlert.style.display = "none";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.success) {
        if (data.isNotVerified) {
          unverifiedEmail = body.email;
          if (unverifiedAlert) {
            unverifiedAlert.style.display = "block";
            if (window.lucide?.createIcons) window.lucide.createIcons({ root: unverifiedAlert });
          }
        }
        throw new Error(data.message || "Authentication failed");
      }
      
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

  const handleSignup = async (url, body) => {
    const resendWarningBox = document.getElementById("resendWarningBox");
    const resendWarningText = document.getElementById("resendWarningText");
    if (resendWarningBox) resendWarningBox.style.display = "none";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 403 && data.isSandboxError) {
          if (resendWarningBox && resendWarningText) {
            resendWarningText.textContent = data.message;
            resendWarningBox.style.display = "block";
            if (window.lucide?.createIcons) window.lucide.createIcons({ root: resendWarningBox });
          }
          return; // Return early without throwing to prevent duplicate toast
        }
        throw new Error(data.message || "Registration failed");
      }

      unverifiedEmail = body.email;
      if (verificationEmailDisplay) verificationEmailDisplay.textContent = body.email;
      
      if (authForm) authForm.style.display = "none";
      if (authTabs) authTabs.style.display = "none";
      panelTitle.textContent = "Check Your Email";
      panelSubtitle.textContent = "Please verify your account to get started.";
      
      if (verificationInfoState) {
        verificationInfoState.style.display = "block";
        if (window.lucide?.createIcons) window.lucide.createIcons({ root: verificationInfoState });
      }
      toast("Verification email and OTP sent. Please check your inbox.", "success");
    } catch (err) {
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
        handleSignup(`${API_BASE}/signup`, { name, email, password });
      }
    });
  }

  // Hook up warn/verification action buttons
  if (verifyAccountBtn) {
    verifyAccountBtn.addEventListener("click", () => {
      if (unverifiedAlert) unverifiedAlert.style.display = "none";
      if (authForm) authForm.style.display = "none";
      if (authTabs) authTabs.style.display = "none";
      panelTitle.textContent = "Verify Your Email";
      panelSubtitle.textContent = "Please verify your account to get started.";
      if (verificationEmailDisplay) verificationEmailDisplay.textContent = unverifiedEmail;
      if (verificationInfoState) {
        verificationInfoState.style.display = "block";
        if (window.lucide?.createIcons) window.lucide.createIcons({ root: verificationInfoState });
      }
    });
  }

  const triggerResend = async (btn) => {
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>Sending...</span>`;

    const verificationWarningBox = document.getElementById("verificationWarningBox");
    const verificationWarningText = document.getElementById("verificationWarningText");
    if (verificationWarningBox) verificationWarningBox.style.display = "none";

    try {
      const res = await fetch(`${window.APP_API_BASE}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail })
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 403 && data.isSandboxError) {
          if (verificationWarningBox && verificationWarningText) {
            verificationWarningText.textContent = data.message;
            verificationWarningBox.style.display = "block";
            if (window.lucide?.createIcons) window.lucide.createIcons({ root: verificationWarningBox });
          }
          return; // Return early without throwing to prevent duplicate toast
        }
        throw new Error(data.message || "Failed to resend email");
      }
      toast("Verification email and OTP resent successfully!", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  };

  if (resendVerificationBtn) {
    resendVerificationBtn.addEventListener("click", () => triggerResend(resendVerificationBtn));
  }
  if (resendVerificationLinkBtn) {
    resendVerificationLinkBtn.addEventListener("click", () => triggerResend(resendVerificationLinkBtn));
  }

  const goBackToSignIn = () => {
    if (verificationInfoState) verificationInfoState.style.display = "none";
    if (authForm) {
      authForm.style.display = "block";
      authForm.reset();
    }
    if (authTabs) authTabs.style.display = "flex";
    switchToTab("login");
  };

  if (verificationBackBtn) verificationBackBtn.addEventListener("click", goBackToSignIn);
  if (verificationDoneBtn) verificationDoneBtn.addEventListener("click", goBackToSignIn);

  if (emailVerifyOtpForm) {
    emailVerifyOtpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const otpInput = qs("#emailVerifyOtpInput");
      const otp = otpInput ? otpInput.value.trim() : "";
      
      if (!otp) {
        return toast("Please enter the 6-digit verification code.", "error");
      }
      if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        return toast("Verification code must be a 6-digit number.", "error");
      }

      const submitBtn = qs("#emailVerifyOtpSubmitBtn");
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Verifying...</span>`;

      try {
        const res = await fetch(`${window.APP_API_BASE}/auth/verify-email-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: unverifiedEmail, otp })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Verification failed");

        toast("Email verified successfully! You can now sign in.", "success");
        if (otpInput) otpInput.value = "";
        
        goBackToSignIn();
      } catch (err) {
        toast(err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
});
