/* Landing Page Interactivity */

document.addEventListener("DOMContentLoaded", () => {
  const landingNav = document.querySelector(".landing-nav");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const drawerClose = document.getElementById("drawerClose");
  const drawerOverlay = document.getElementById("drawerOverlay");
  const mobileDrawer = document.getElementById("mobileDrawer");

  const tabStudentBtn = document.getElementById("tabStudentBtn");
  const tabAdminBtn = document.getElementById("tabAdminBtn");
  const showcaseStudentContent = document.getElementById("showcaseStudentContent");
  const showcaseAdminContent = document.getElementById("showcaseAdminContent");

  const authModal = document.getElementById("authModal");
  const modalClose = document.getElementById("modalClose");
  const roleSelection = document.getElementById("roleSelection");
  const authContent = document.getElementById("authContent");

  // 1. Sticky Navbar scroll handler
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      landingNav.classList.add("is-scrolled");
    } else {
      landingNav.classList.remove("is-scrolled");
    }
  });

  // 2. Mobile Drawer Navigation toggle
  function openDrawer() {
    mobileDrawer.classList.add("is-open");
    drawerOverlay.classList.add("is-open");
    document.documentElement.style.overflow = "hidden";
  }

  function closeDrawer() {
    mobileDrawer.classList.remove("is-open");
    drawerOverlay.classList.remove("is-open");
    document.documentElement.style.overflow = "";
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener("click", openDrawer);
  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);

  const drawerLinks = document.querySelectorAll(".mobile-drawer__link");
  drawerLinks.forEach(link => link.addEventListener("click", closeDrawer));

  // 3. Tabbed dashboard preview switches
  if (tabStudentBtn && tabAdminBtn) {
    tabStudentBtn.addEventListener("click", () => {
      tabStudentBtn.classList.add("is-active");
      tabAdminBtn.classList.remove("is-active");
      showcaseStudentContent.classList.add("is-active");
      showcaseAdminContent.classList.remove("is-active");
    });

    tabAdminBtn.addEventListener("click", () => {
      tabAdminBtn.classList.add("is-active");
      tabStudentBtn.classList.remove("is-active");
      showcaseAdminContent.classList.add("is-active");
      showcaseStudentContent.classList.remove("is-active");
    });
  }

  // 4. Modal Auth open/close delegation
  window.openAuthModal = function() {
    if (!authModal) return;
    
    // Always start at role selection for a clean experience
    if (roleSelection) roleSelection.style.display = "block";
    if (authContent) authContent.style.display = "none";

    authModal.classList.add("is-open");
    document.documentElement.style.overflow = "hidden";
    closeDrawer();
  };

  window.closeAuthModal = function() {
    if (!authModal) return;
    authModal.classList.remove("is-open");
    document.documentElement.style.overflow = "";
  };

  if (modalClose) modalClose.addEventListener("click", window.closeAuthModal);
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) {
        window.closeAuthModal();
      }
    });
  }

  // Bind all triggers to open auth modal
  const triggers = document.querySelectorAll("[data-action='open-auth']");
  triggers.forEach(trigger => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      window.openAuthModal();
    });
  });

  // 5. Session token check (dynamic Go to Dashboard state)
  const token = localStorage.getItem("token");
  const userJson = localStorage.getItem("user");
  if (token && userJson) {
    try {
      const user = JSON.parse(userJson);
      const dashboardHref = user.role === "admin" ? "admin.html" : "dashboard.html";

      // Modify Navbar CTA actions
      const navGetStarted = document.getElementById("navGetStarted");
      const navSignIn = document.getElementById("navSignIn");
      
      if (navGetStarted) {
        navGetStarted.innerHTML = 'Go to Dashboard <i data-lucide="arrow-right"></i>';
        navGetStarted.onclick = (e) => {
          e.preventDefault();
          window.location.href = dashboardHref;
        };
        // Re-render Lucide icons
        if (window.lucide) window.lucide.createIcons({ root: navGetStarted });
      }
      
      if (navSignIn) {
        navSignIn.style.display = "none";
      }

      // Modify Mobile Drawer CTA actions
      const drawerGetStarted = document.getElementById("drawerGetStarted");
      const drawerSignIn = document.getElementById("drawerSignIn");

      if (drawerGetStarted) {
        drawerGetStarted.innerHTML = 'Go to Dashboard <i data-lucide="arrow-right"></i>';
        drawerGetStarted.onclick = (e) => {
          e.preventDefault();
          window.location.href = dashboardHref;
        };
        if (window.lucide) window.lucide.createIcons({ root: drawerGetStarted });
      }

      if (drawerSignIn) {
        drawerSignIn.style.display = "none";
      }

      // Modify Hero CTA action
      const heroGetStarted = document.getElementById("heroGetStarted");
      if (heroGetStarted) {
        heroGetStarted.innerHTML = 'Go to Dashboard <i data-lucide="arrow-right"></i>';
        heroGetStarted.setAttribute("data-action", "go-dashboard");
        heroGetStarted.onclick = (e) => {
          e.preventDefault();
          window.location.href = dashboardHref;
        };
        if (window.lucide) window.lucide.createIcons({ root: heroGetStarted });
      }

    } catch (e) {
      console.error("Session decode failed:", e);
    }
  }

  // Navbar theme toggle click handling
  const landingThemeToggle = document.getElementById("landingThemeToggle");
  if (landingThemeToggle) {
    landingThemeToggle.addEventListener("click", () => {
      if (window.toggleTheme) window.toggleTheme();
    });
  }

  // Auto-trigger auth modal if redirected from legal/outer pages with query parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("auth") === "open" || urlParams.get("auth") === "login") {
    setTimeout(() => {
      if (window.openAuthModal) window.openAuthModal();
    }, 150);
  }

  // Pre-initialize icons on landing specific divs
  if (window.lucide) {
    window.lucide.createIcons();
  }
});
