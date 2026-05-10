/* Global UI behaviors (no frameworks). */

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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.body.classList.remove("is-mobile-nav-open");
    }
  });
}

function initCommandPalette() {
  const openBtn = qs("#openCommand");
  const overlay = qs("#cmdkOverlay");
  const closeBtn = qs("#cmdkClose");
  const input = qs("#cmdkInput");

  if (!overlay) return;

  /* FORCE HIDE ON LOAD */
  overlay.hidden = true;
  overlay.style.display = "none";

  const openPalette = () => {
    overlay.hidden = false;
    overlay.style.display = "flex";

    requestAnimationFrame(() => {
      if (input) input.focus();
    });
  };

  const closePalette = () => {
    overlay.hidden = true;
    overlay.style.display = "none";
  };

  if (openBtn) {
    openBtn.addEventListener("click", openPalette);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closePalette);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closePalette();
    }
  });

  document.addEventListener("keydown", (e) => {
    const isCmdK =
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "k";

    if (isCmdK) {
      e.preventDefault();

      if (overlay.hidden) {
        openPalette();
      } else {
        closePalette();
      }

      return;
    }

    if (e.key === "Escape") {
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

      window.location.href = dest;
    });
  });
}

function checkAuth() {
  const page = document.body?.dataset?.page;
  if (page && page !== "login") {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "index.html";
      return;
    }
  }

  // Auto-redirect from login if already logged in
  if (page === "login") {
    const token = localStorage.getItem("token");
    if (token) {
      window.location.href = "dashboard.html";
      return;
    }
  }

  const profiles = qsa(".miniProfile");
  profiles.forEach((p) => {
    p.style.cursor = "pointer";
    p.addEventListener("click", () => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (window.Toast) {
        window.Toast.info("Profile Info", `Logged in as ${user.name || 'User'}`);
      }
    });
  });

  const logoutBtns = qsa("#logoutBtn, [data-logout]");
  logoutBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("index.html");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  safeLucide();
  setActiveNav();
  initSidebarToggle();
  initMobileNav();
  initCommandPalette();
});

// Handle browser back button / bfcache
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    checkAuth();
  }
});