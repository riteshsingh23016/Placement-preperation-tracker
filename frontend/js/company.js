/* Companies page (UI-only interactions). */

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = qs("#addCompanyBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      addBtn.blur();
      const topbar = qs(".topbar");
      if (!topbar) return;
      topbar.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-1px)" }, { transform: "translateY(0)" }],
        { duration: 240, easing: "ease-out" },
      );
    });
  }

  qsa(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      qsa(".chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
    });
  });
});

