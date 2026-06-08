/* Global UI behaviors (no frameworks). */

// Global validation helpers
window.validateCompanyName = function(name) {
  return window.Validators.validateCompanyName(name);
};

window.validateJobRole = function(role) {
  return window.Validators.validateJobRole(role);
};

window.validatePackage = function(pkg) {
  return window.Validators.validatePackage(pkg);
};

window.validateInterviewDate = function(dateStr) {
  return window.Validators.validateDate(dateStr, true, "Interview date");
};

window.validateNotes = function(notes, maxLen = 1000) {
  return window.Validators.validateLongText(notes, maxLen, "Notes");
};

window.validatePhoneNumber = function(phone) {
  return window.Validators.validatePhoneNumber(phone);
};

window.validateGraduationYear = function(year) {
  return window.Validators.validateGraduationYear(year);
};

window.validateUrl = function(url, label) {
  return window.Validators.validateUrl(url, label);
};

window.openModalOverlay = function(overlay) {
  if (!overlay) return;
  overlay.hidden = false;
  requestAnimationFrame(function () {
    overlay.classList.add("is-open");
  });
  document.documentElement.style.overflow = "hidden";
};

window.closeModalOverlay = function(overlay) {
  if (!overlay) return;
  overlay.classList.remove("is-open");
  setTimeout(function () {
    overlay.hidden = true;
    document.documentElement.style.overflow = "";
  }, 220);
};

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function safeLucide() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function setActiveNav() {
  const page = document.body?.dataset?.page;
  if (!page) return;

  const map = {
    dashboard: "dashboard.html",
    company: "company.html",
    notes: "notes.html",
  };

  const activeHref = map[page];
  if (!activeHref) return;

  qsa(".nav__item").forEach((a) => {
    const href = a.getAttribute("href") || "";
    a.classList.toggle("is-active", href.endsWith(activeHref));
  });
}

function initSidebarToggle() {
  const btn = qs("#sidebarToggle");

  if (!btn) return;

  btn.addEventListener("click", () => {
    document.body.classList.toggle("is-sidebar-collapsed");
    // Dispatch event for other components (like charts) to resize
    window.dispatchEvent(new Event('sidebarToggle'));
  });
}

function initMobileNav() {
  const open = qs("#mobileMenu");

  if (!open) return;

  const overlay = document.createElement("div");
  overlay.className = "sidebarOverlay";
  document.body.appendChild(overlay);

  open.addEventListener("click", () => {
    document.body.classList.toggle("is-mobile-nav-open");
  });

  overlay.addEventListener("click", () => {
    document.body.classList.remove("is-mobile-nav-open");
  });

  const closeBtn = qs("#closeSidebar");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.body.classList.remove("is-mobile-nav-open");
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.body.classList.remove("is-mobile-nav-open");
    }
  });
}

function initCommandPalette() {
  const overlay = qs("#cmdkOverlay");
  const closeBtn = qs("#cmdkClose");
  const input = qs("#cmdkInput");

  if (!overlay) return;

  const openPalette = () => {
    overlay.classList.add("is-open");
    requestAnimationFrame(() => {
      if (input) {
        input.value = "";
        input.focus();
      }
      qsa(".cmdk__item", overlay).forEach(item => item.style.display = "flex");
    });
    document.documentElement.style.overflow = "hidden";
  };

  const closePalette = () => {
    overlay.classList.remove("is-open");
    document.documentElement.style.overflow = "";
  };

  if (closeBtn) {
    closeBtn.addEventListener("click", closePalette);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closePalette();
    }
  });

  document.addEventListener("keydown", (e) => {
    const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";

    if (isCmdK) {
      e.preventDefault();
      if (overlay.classList.contains("is-open")) {
        closePalette();
      } else {
        openPalette();
      }
      return;
    }

    if (e.key === "Escape" && overlay.classList.contains("is-open")) {
      closePalette();
    }
  });

  if (input) {
    input.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      qsa(".cmdk__item", overlay).forEach((item) => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? "flex" : "none";
      });
    });
  }

  qsa("[data-go]", overlay).forEach((btn) => {
    btn.addEventListener("click", () => {
      const dest = btn.getAttribute("data-go");
      if (!dest) return;
      closePalette();
      
      // If it's a logout command, handle it
      if (btn.textContent.toLowerCase().includes("logout")) {
          logout();
      } else {
          window.location.href = dest;
      }
    });
  });
}

window.clearAuthStorage = function() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.toLowerCase().includes("auth") || k.toLowerCase().includes("user")) {
        localStorage.removeItem(k);
      }
    });
  } catch (e) {
    console.error("Error clearing localStorage:", e);
  }
  
  try {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("role");
    const keys = Object.keys(sessionStorage);
    keys.forEach(k => {
      if (k.toLowerCase().includes("auth") || k.toLowerCase().includes("user")) {
        sessionStorage.removeItem(k);
      }
    });
  } catch (e) {
    console.error("Error clearing sessionStorage:", e);
  }
};

function checkAuth() {
  const page = document.body?.dataset?.page;
  const token = localStorage.getItem("token");
  const userJson = localStorage.getItem("user");
  let user = null;

  try {
    if (userJson) user = JSON.parse(userJson);
  } catch (e) {
    console.error("Invalid user data in storage");
    window.clearAuthStorage();
  }

  const isValidAdmin = token && user && user.role === "admin";
  const isValidStudent = token && user && (user.role === "student" || user.role === "user");

  // Protection for internal pages (Dashboard, Company, Notes, Admin)
  if (page && page !== "login") {
    if (page === "admin" && !isValidAdmin) {
      window.location.href = isValidStudent ? "dashboard.html" : "index.html";
      return;
    }

    const studentPages = ["dashboard", "company", "notes"];
    if (studentPages.includes(page) && !isValidStudent) {
      window.location.href = isValidAdmin ? "admin.html" : "index.html";
      return;
    }
  }

  // On login page, clear any old auth token/user data so it always starts clean
  if (page === "login") {
    window.clearAuthStorage();
  }
}

window.logout = function() {
  window.clearAuthStorage();
  window.location.replace("index.html");
};

async function profileRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const url = `${window.APP_API_BASE || "http://localhost:5000/api"}${endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(url, {
    headers,
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      window.clearAuthStorage();
      window.location.replace("index.html");
    }
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function renderProfileFields(role, data = {}) {
  const container = document.getElementById("profileFieldsContainer");
  if (!container) return;

  const getVal = (field) => {
    if (field === "email") {
      if (data.email) return data.email;
      if (data.user && data.user.email) return data.user.email;
      if (data.profile && data.profile.email) return data.profile.email;
      if (data.currentUser && data.currentUser.email) return data.currentUser.email;

      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u.email) return u.email;
          if (u.user && u.user.email) return u.user.email;
          if (u.profile && u.profile.email) return u.profile.email;
          if (u.currentUser && u.currentUser.email) return u.currentUser.email;
        }
      } catch (e) {}
    }
    return data[field] || "";
  };

  let html = `
    <label class="modalField">
      <span class="modalField__label">Full Name <span class="req">*</span></span>
      <input class="modalField__input" type="text" name="name" value="${getVal('name')}" required placeholder="Enter your full name" />
      <span class="modalField__error" id="errProfileName" style="color: var(--color-danger); font-size: 11px; margin-top: 4px; display: block;"></span>
    </label>
    <label class="modalField">
      <span class="modalField__label">Email (Readonly)</span>
      <input class="modalField__input" type="email" name="email" value="${getVal('email')}" readonly />
    </label>
    <label class="modalField">
      <span class="modalField__label">Phone Number</span>
      <input class="modalField__input" type="text" name="phoneNumber" value="${getVal('phoneNumber')}" placeholder="e.g. +1234567890" />
    </label>
  `;

  if (role === "student") {
    html += `
      <label class="modalField">
        <span class="modalField__label">College Name</span>
        <input class="modalField__input" type="text" name="collegeName" value="${getVal('collegeName')}" placeholder="e.g. Stanford University" />
      </label>
      <label class="modalField">
        <span class="modalField__label">Course / Degree</span>
        <input class="modalField__input" type="text" name="course" value="${getVal('course')}" placeholder="e.g. B.Tech Computer Science" />
      </label>
      <label class="modalField">
        <span class="modalField__label">Branch / Department</span>
        <input class="modalField__input" type="text" name="branch" value="${getVal('branch')}" placeholder="e.g. IT" />
      </label>
      <label class="modalField">
        <span class="modalField__label">Graduation Year</span>
        <input class="modalField__input" type="text" name="graduationYear" value="${getVal('graduationYear')}" placeholder="e.g. 2026" />
      </label>
      <label class="modalField">
        <span class="modalField__label">Skills</span>
        <input class="modalField__input" type="text" name="skills" value="${getVal('skills')}" placeholder="e.g. Javascript, Node.js, React" />
      </label>
      <label class="modalField">
        <span class="modalField__label">LinkedIn URL</span>
        <input class="modalField__input" type="url" name="linkedinUrl" value="${getVal('linkedinUrl')}" placeholder="https://linkedin.com/in/username" />
        <span class="modalField__error" id="errProfileLinkedin" style="color: var(--color-danger); font-size: 11px; margin-top: 4px; display: block;"></span>
      </label>
      <label class="modalField">
        <span class="modalField__label">GitHub URL</span>
        <input class="modalField__input" type="url" name="githubUrl" value="${getVal('githubUrl')}" placeholder="https://github.com/username" />
        <span class="modalField__error" id="errProfileGithub" style="color: var(--color-danger); font-size: 11px; margin-top: 4px; display: block;"></span>
      </label>
      <label class="modalField">
        <span class="modalField__label">Resume URL</span>
        <input class="modalField__input" type="url" name="resumeUrl" value="${getVal('resumeUrl')}" placeholder="https://drive.google.com/..." />
        <span class="modalField__error" id="errProfileResume" style="color: var(--color-danger); font-size: 11px; margin-top: 4px; display: block;"></span>
      </label>
    `;
  } else if (role === "admin") {
    html += `
      <label class="modalField">
        <span class="modalField__label">Department</span>
        <input class="modalField__input" type="text" name="department" value="${getVal('department')}" placeholder="e.g. Placement Cell" />
      </label>
      <label class="modalField">
        <span class="modalField__label">Designation</span>
        <input class="modalField__input" type="text" name="designation" value="${getVal('designation')}" placeholder="e.g. Director" />
      </label>
      <label class="modalField">
        <span class="modalField__label">Office Location</span>
        <input class="modalField__input" type="text" name="officeLocation" value="${getVal('officeLocation')}" placeholder="e.g. Block A, Room 101" />
      </label>
    `;
  }

  html += `
    <label class="modalField modalField--full">
      <span class="modalField__label">Short Bio</span>
      <textarea class="modalField__input" name="bio" rows="3" placeholder="Tell us about yourself...">${getVal('bio')}</textarea>
    </label>
  `;

  container.innerHTML = html;
}

function initPasswordToggles(container) {
  const wrappers = container.querySelectorAll(".password-input-wrapper");
  wrappers.forEach(wrapper => {
    const input = wrapper.querySelector("input");
    const btn = wrapper.querySelector(".password-toggle-btn");
    if (!input || !btn) return;
    
    // Prevent duplicate event listeners
    if (btn.dataset.toggleInitialized) return;
    btn.dataset.toggleInitialized = "true";
    
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const type = input.type === "password" ? "text" : "password";
      input.type = type;
      
      // Cleanly replace button content and let Lucide re-create the icon to prevent duplicates/bugs
      btn.innerHTML = `<i data-lucide="${type === 'password' ? 'eye' : 'eye-off'}"></i>`;
      if (window.lucide) window.lucide.createIcons({ root: btn });
    });
  });
}

function initUserMenu() {
  const userChip = document.querySelector(".topbar .pill, .topbar .miniProfile");
  if (!userChip) return;

  const userRole = localStorage.getItem("role") || (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).role : "student");

  // 1. Inject Dropdown HTML
  if (!document.getElementById("userDropdown")) {
    const dropdown = document.createElement("div");
    dropdown.className = "user-dropdown";
    dropdown.id = "userDropdown";
    dropdown.innerHTML = `
      <button class="user-dropdown__item" id="dropdownProfileBtn">
        <i data-lucide="user"></i>
        <span>Profile</span>
      </button>
      <button class="user-dropdown__item" id="dropdownPasswordBtn">
        <i data-lucide="key-round"></i>
        <span>Change Password</span>
      </button>
      <div class="user-dropdown__divider"></div>
      <button class="user-dropdown__item user-dropdown__item--danger" id="dropdownLogoutBtn">
        <i data-lucide="log-out"></i>
        <span>Logout</span>
      </button>
    `;
    userChip.appendChild(dropdown);
  }

  // 2. Inject Profile Modal HTML
  if (!document.getElementById("profileModalOverlay")) {
    const pModal = document.createElement("div");
    pModal.className = "modalOverlay";
    pModal.id = "profileModalOverlay";
    pModal.hidden = true;
    pModal.innerHTML = `
      <div class="modal glass" style="width: min(680px, 92vw); max-height: min(90vh, 850px);">
        <div class="modal__glow" aria-hidden="true"></div>
        <header class="modal__header">
          <div>
            <h2 class="modal__title">Edit Profile</h2>
            <p class="modal__subtitle">Manage your personal and professional details.</p>
          </div>
          <button class="iconBtn" type="button" id="closeProfileModal" aria-label="Close">
            <i data-lucide="x"></i>
          </button>
        </header>
        <form class="modalForm" id="profileForm" novalidate>
          <div class="modalForm__grid" id="profileFieldsContainer">
            <!-- Rendered dynamically -->
          </div>
          <footer class="modal__footer" style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; gap: 10px;">
              <button class="btn btn--ghost" type="button" id="cancelProfileModal">Cancel</button>
              ${userRole === 'student' ? `
                <button class="btn btn--secondary" type="button" id="downloadProfileReportBtn" style="gap: 6px; display: flex; align-items: center;">
                  <i data-lucide="download"></i>
                  <span>Download My Report</span>
                </button>
              ` : ''}
            </div>
            <button class="btn btn--primary glowBtn" type="submit">
              <i data-lucide="check"></i>
              <span>Save Changes</span>
            </button>
          </footer>
        </form>
      </div>
    `;
    document.body.appendChild(pModal);

    const dlProfileBtn = document.getElementById("downloadProfileReportBtn");
    if (dlProfileBtn) {
      dlProfileBtn.addEventListener("click", () => {
        window.PdfGenerator.triggerStudentDownload(null, dlProfileBtn);
      });
    }
  }

  // 3. Inject Change Password Modal HTML
  if (!document.getElementById("passwordModalOverlay")) {
    const passModal = document.createElement("div");
    passModal.className = "modalOverlay";
    passModal.id = "passwordModalOverlay";
    passModal.hidden = true;
    passModal.innerHTML = `
      <div class="modal modal--sm glass">
        <div class="modal__glow" aria-hidden="true"></div>
        <header class="modal__header">
          <div>
            <h2 class="modal__title">Change Password</h2>
            <p class="modal__subtitle">Update your account password.</p>
          </div>
          <button class="iconBtn" type="button" id="closePasswordModal" aria-label="Close">
            <i data-lucide="x"></i>
          </button>
        </header>
        <form class="modalForm" id="passwordForm" novalidate>
          <div style="display: grid; gap: 14px;">
            <label class="modalField">
              <span class="modalField__label">Current Password <span class="req">*</span></span>
              <div class="password-input-wrapper">
                <input class="modalField__input" type="password" name="currentPassword" id="currentPassword" autocomplete="current-password" required placeholder="••••••••" />
                <button class="password-toggle-btn" type="button" tabindex="-1">
                  <i data-lucide="eye"></i>
                </button>
              </div>
              <span class="modalField__error" id="errCurrentPassword" style="color: var(--color-danger); font-size: 11px; margin-top: 4px; display: block;"></span>
            </label>
            <label class="modalField">
              <span class="modalField__label">New Password <span class="req">*</span></span>
              <div class="password-input-wrapper">
                <input class="modalField__input" type="password" name="newPassword" id="newPassword" autocomplete="new-password" required placeholder="••••••••" />
                <button class="password-toggle-btn" type="button" tabindex="-1">
                  <i data-lucide="eye"></i>
                </button>
              </div>
              <span class="modalField__error" id="errNewPassword" style="color: var(--color-danger); font-size: 11px; margin-top: 4px; display: block;"></span>
            </label>
            <label class="modalField">
              <span class="modalField__label">Confirm New Password <span class="req">*</span></span>
              <div class="password-input-wrapper">
                <input class="modalField__input" type="password" name="confirmPassword" id="confirmPassword" autocomplete="new-password" required placeholder="••••••••" />
                <button class="password-toggle-btn" type="button" tabindex="-1">
                  <i data-lucide="eye"></i>
                </button>
              </div>
              <span class="modalField__error" id="errConfirmPassword" style="color: var(--color-danger); font-size: 11px; margin-top: 4px; display: block;"></span>
            </label>
          </div>
          <footer class="modal__footer" style="margin-top: 20px;">
            <button class="btn btn--ghost" type="button" id="cancelPasswordModal">Cancel</button>
            <button class="btn btn--primary glowBtn" type="submit">
              <i data-lucide="check"></i>
              <span>Change Password</span>
            </button>
          </footer>
        </form>
      </div>
    `;
    document.body.appendChild(passModal);
  }

  if (window.lucide) window.lucide.createIcons();

  const dropdown = document.getElementById("userDropdown");
  const profileModalOverlay = document.getElementById("profileModalOverlay");
  const passwordModalOverlay = document.getElementById("passwordModalOverlay");

  // Sidebar settings button delegation
  const navSettings = document.getElementById("navSettings");
  if (navSettings) {
    navSettings.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.classList.remove("is-mobile-nav-open");
      const profileBtn = document.getElementById("dropdownProfileBtn");
      if (profileBtn) profileBtn.click();
    });
  }

  // Dropdown toggle logic
  userChip.addEventListener("click", (e) => {
    if (e.target.closest("#userDropdown")) return;
    e.stopPropagation();
    dropdown.classList.toggle("is-open");
  });

  document.addEventListener("click", (e) => {
    if (!userChip.contains(e.target)) {
      dropdown.classList.remove("is-open");
    }
  });

  // Dropdown buttons events
  document.getElementById("dropdownLogoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.logout();
  });

  document.getElementById("dropdownProfileBtn").addEventListener("click", async (e) => {
    e.stopPropagation();
    dropdown.classList.remove("is-open");
    
    // 1. Try to load cached user from localStorage
    let cachedUser = null;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        cachedUser = JSON.parse(userStr);
      }
    } catch (err) {
      console.error("Failed to parse cached user for profile rendering", err);
    }

    if (cachedUser) {
      // Instantly render form with fallback values from localStorage
      renderProfileFields(userRole, cachedUser);
    } else {
      // Render clean loading state if no cache is available
      const container = document.getElementById("profileFieldsContainer");
      if (container) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--text-secondary); gap: 10px;">
            <i data-lucide="loader-2" style="animation: spin 1s linear infinite;"></i>
            <span>Loading profile details...</span>
          </div>
        `;
      }
    }

    // Instantly open the profile modal overlay to guarantee maximum responsiveness
    if (window.lucide) window.lucide.createIcons({ root: profileModalOverlay });
    window.openModalOverlay(profileModalOverlay);

    // 2. Fetch fresh profile details from API
    try {
      const res = await profileRequest("/auth/profile");
      if (res.success) {
        renderProfileFields(userRole, res.data);
        if (window.lucide) window.lucide.createIcons({ root: profileModalOverlay });
      } else {
        window.Toast.error("Error", res.message || "Failed to load profile");
      }
    } catch (err) {
      window.Toast.error("Error", err.message || "Failed to load profile");
    }
  });

  document.getElementById("dropdownPasswordBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.remove("is-open");
    
    // Reset inputs & errors
    document.getElementById("passwordForm").reset();
    document.getElementById("errCurrentPassword").textContent = "";
    document.getElementById("errNewPassword").textContent = "";
    document.getElementById("errConfirmPassword").textContent = "";
    
    // Make sure types are reset to password
    passwordModalOverlay.querySelectorAll("input").forEach(inp => inp.type = "password");
    passwordModalOverlay.querySelectorAll(".password-toggle-btn").forEach(btn => {
      btn.innerHTML = '<i data-lucide="eye"></i>';
    });
    if (window.lucide) window.lucide.createIcons({ root: passwordModalOverlay });

    window.openModalOverlay(passwordModalOverlay);
  });

  // Modal Closes
  document.getElementById("closeProfileModal").addEventListener("click", () => window.closeModalOverlay(profileModalOverlay));
  document.getElementById("cancelProfileModal").addEventListener("click", () => window.closeModalOverlay(profileModalOverlay));
  document.getElementById("closePasswordModal").addEventListener("click", () => window.closeModalOverlay(passwordModalOverlay));
  document.getElementById("cancelPasswordModal").addEventListener("click", () => window.closeModalOverlay(passwordModalOverlay));

  // Password hide/show toggle listeners
  initPasswordToggles(passwordModalOverlay);

  // Profile Form Submit
  const profileForm = document.getElementById("profileForm");
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = profileForm.querySelector("input[name='name']");
    const errName = document.getElementById("errProfileName");
    if (errName) errName.textContent = "";

    let hasErrors = false;
    let firstInvalid = null;

    profileForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));

    const nameErr = window.Validators.validateName(nameInput.value, "Full Name", true);
    if (nameErr) {
      if (errName) errName.textContent = nameErr;
      nameInput.classList.add("is-invalid");
      hasErrors = true;
      if (!firstInvalid) firstInvalid = nameInput;
    }

    const phoneInput = profileForm.querySelector("input[name='phoneNumber']");
    if (phoneInput) {
      const phoneErr = window.Validators.validatePhoneNumber(phoneInput.value, false);
      if (phoneErr) {
        window.Toast.error("Validation Error", phoneErr);
        phoneInput.classList.add("is-invalid");
        hasErrors = true;
        if (!firstInvalid) firstInvalid = phoneInput;
      }
    }

    const gradInput = profileForm.querySelector("input[name='graduationYear']");
    if (gradInput) {
      const gradErr = window.Validators.validateGraduationYear(gradInput.value);
      if (gradErr) {
        window.Toast.error("Validation Error", gradErr);
        gradInput.classList.add("is-invalid");
        hasErrors = true;
        if (!firstInvalid) firstInvalid = gradInput;
      }
    }

    const errLinkedin = document.getElementById("errProfileLinkedin");
    const errGithub = document.getElementById("errProfileGithub");
    const errResume = document.getElementById("errProfileResume");
    if (errLinkedin) errLinkedin.textContent = "";
    if (errGithub) errGithub.textContent = "";
    if (errResume) errResume.textContent = "";

    const linkedinInput = profileForm.querySelector("input[name='linkedinUrl']");
    if (linkedinInput) {
      const linkErr = window.Validators.validateUrl(linkedinInput.value, "LinkedIn URL");
      if (linkErr) {
        if (errLinkedin) errLinkedin.textContent = linkErr;
        linkedinInput.classList.add("is-invalid");
        hasErrors = true;
        if (!firstInvalid) firstInvalid = linkedinInput;
      }
    }

    const githubInput = profileForm.querySelector("input[name='githubUrl']");
    if (githubInput) {
      const gitErr = window.Validators.validateUrl(githubInput.value, "GitHub URL");
      if (gitErr) {
        if (errGithub) errGithub.textContent = gitErr;
        githubInput.classList.add("is-invalid");
        hasErrors = true;
        if (!firstInvalid) firstInvalid = githubInput;
      }
    }

    const resumeInput = profileForm.querySelector("input[name='resumeUrl']");
    if (resumeInput) {
      const resErr = window.Validators.validateUrl(resumeInput.value, "Resume URL");
      if (resErr) {
        if (errResume) errResume.textContent = resErr;
        resumeInput.classList.add("is-invalid");
        hasErrors = true;
        if (!firstInvalid) firstInvalid = resumeInput;
      }
    }

    const textLimits = [
      { name: "collegeName", label: "College Name", max: 150 },
      { name: "course", label: "Course / Degree", max: 150 },
      { name: "branch", label: "Branch / Department", max: 150 },
      { name: "skills", label: "Skills", max: 150 },
      { name: "department", label: "Department", max: 150 },
      { name: "designation", label: "Designation", max: 150 },
      { name: "officeLocation", label: "Office Location", max: 150 }
    ];

    for (const item of textLimits) {
      const input = profileForm.querySelector(`input[name='${item.name}']`);
      if (input) {
        const val = input.value.trim();
        const txtErr = window.Validators.validateProfileText(val, item.label, false, 2, item.max);
        if (txtErr) {
          window.Toast.error("Validation Error", txtErr);
          input.classList.add("is-invalid");
          hasErrors = true;
          if (!firstInvalid) firstInvalid = input;
        }
      }
    }

    const bioInput = profileForm.querySelector("textarea[name='bio']");
    if (bioInput) {
      const bioErr = window.Validators.validateLongText(bioInput.value, 5000, "Short Bio", false);
      if (bioErr) {
        window.Toast.error("Validation Error", bioErr);
        bioInput.classList.add("is-invalid");
        hasErrors = true;
        if (!firstInvalid) firstInvalid = bioInput;
      }
    }

    if (hasErrors) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const body = {};
    const inputs = profileForm.querySelectorAll("input, textarea");
    inputs.forEach(input => {
      if (input.name) {
        body[input.name] = input.value;
      }
    });

    try {
      const res = await profileRequest("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(body)
      });

      if (res.success) {
        window.Toast.success("Success", "Profile updated successfully");
        
        // Update caches
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const u = JSON.parse(userStr);
          u.name = res.data.name;
          localStorage.setItem("user", JSON.stringify(u));
        }

        // Update displays
        const nameDisplays = document.querySelectorAll("#userNameDisplay, .miniProfile__name");
        nameDisplays.forEach(el => el.textContent = res.data.name);

        window.closeModalOverlay(profileModalOverlay);
      } else {
        window.Toast.error("Error", res.message || "Failed to save profile");
      }
    } catch (err) {
      window.Toast.error("Error", err.message || "Failed to save profile");
    }
  });

  // Password Form Submit
  const passwordForm = document.getElementById("passwordForm");
  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const currentPass = document.getElementById("currentPassword").value;
    const newPass = document.getElementById("newPassword").value;
    const confirmPass = document.getElementById("confirmPassword").value;

    const errCurrent = document.getElementById("errCurrentPassword");
    const errNew = document.getElementById("errNewPassword");
    const errConfirm = document.getElementById("errConfirmPassword");

    errCurrent.textContent = "";
    errNew.textContent = "";
    errConfirm.textContent = "";
    passwordForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));

    let hasErrors = false;
    let firstInvalid = null;

    if (!currentPass) {
      errCurrent.textContent = "Current password is required";
      document.getElementById("currentPassword").classList.add("is-invalid");
      hasErrors = true;
      if (!firstInvalid) firstInvalid = document.getElementById("currentPassword");
    }

    const newPassErr = window.Validators.validatePasswordComplexity(newPass, "New password");
    if (newPassErr) {
      errNew.textContent = newPassErr;
      document.getElementById("newPassword").classList.add("is-invalid");
      hasErrors = true;
      if (!firstInvalid) firstInvalid = document.getElementById("newPassword");
    }

    if (!confirmPass) {
      errConfirm.textContent = "Confirm password is required";
      document.getElementById("confirmPassword").classList.add("is-invalid");
      hasErrors = true;
      if (!firstInvalid) firstInvalid = document.getElementById("confirmPassword");
    } else if (newPass !== confirmPass) {
      errConfirm.textContent = "Passwords do not match";
      document.getElementById("confirmPassword").classList.add("is-invalid");
      hasErrors = true;
      if (!firstInvalid) firstInvalid = document.getElementById("confirmPassword");
    }

    if (newPass && currentPass && newPass === currentPass) {
      errNew.textContent = "New password cannot be same as current password";
      document.getElementById("newPassword").classList.add("is-invalid");
      hasErrors = true;
      if (!firstInvalid) firstInvalid = document.getElementById("newPassword");
    }

    if (hasErrors) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    try {
      const res = await profileRequest("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass,
          confirmPassword: confirmPass
        })
      });

      if (res.success) {
        window.Toast.success("Success", "Password changed successfully! Logging out...");
        window.closeModalOverlay(passwordModalOverlay);
        setTimeout(() => {
          window.logout();
        }, 1500);
      } else {
        window.Toast.error("Error", res.message || "Failed to change password");
      }
    } catch (err) {
      errCurrent.textContent = err.message || "Failed to change password";
      window.Toast.error("Error", err.message || "Failed to change password");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  safeLucide();
  setActiveNav();
  initSidebarToggle();
  initMobileNav();
  initCommandPalette();
  initUserMenu();

  // Fix Student Logout
  document.addEventListener("click", (e) => {
      const logoutTarget = e.target.closest("[data-logout]");
      if (logoutTarget) {
          e.preventDefault();
          window.logout();
      }
  });
});

// Handle browser back button / bfcache
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    checkAuth();
  }
});