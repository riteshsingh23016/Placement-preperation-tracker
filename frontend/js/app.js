/* Global UI behaviors (no frameworks). */

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
  open.addEventListener("click", () => {
    document.body.classList.toggle("is-mobile-nav-open");
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

  const open = () => {
    overlay.hidden = false;
    requestAnimationFrame(() => input && input.focus());
  };

  const close = () => {
    overlay.hidden = true;
  };

  if (openBtn) openBtn.addEventListener("click", open);
  if (closeBtn) closeBtn.addEventListener("click", close);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", (e) => {
    const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
    if (isCmdK) {
      e.preventDefault();
      overlay.hidden ? open() : close();
      return;
    }
    if (e.key === "Escape") close();
  });

  qsa("[data-go]", overlay).forEach((btn) => {
    btn.addEventListener("click", () => {
      const dest = btn.getAttribute("data-go");
      if (!dest) return;
      window.location.href = dest;
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  safeLucide();
  setActiveNav();
  initSidebarToggle();
  initMobileNav();
  initCommandPalette();
});

