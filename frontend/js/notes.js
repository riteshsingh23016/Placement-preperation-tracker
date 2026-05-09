/* Notes page (UI-only interactions). */

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

document.addEventListener("DOMContentLoaded", () => {
  const newBtn = qs("#newNoteBtn");
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      newBtn.blur();
      const cards = qsa(".noteCard");
      if (!cards.length) return;
      cards[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
      cards[0].animate([{ transform: "translateY(0)" }, { transform: "translateY(-2px)" }, { transform: "translateY(0)" }], {
        duration: 260,
        easing: "ease-out",
      });
    });
  }

  qsa(".collection").forEach((c) => {
    c.addEventListener("click", () => {
      qsa(".collection").forEach((x) => x.classList.remove("is-active"));
      c.classList.add("is-active");
    });
  });
});

