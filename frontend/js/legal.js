/* Legal Modals Controller */
document.addEventListener("DOMContentLoaded", () => {
  const privacyModal = document.getElementById("privacyModal");
  const termsModal = document.getElementById("termsModal");
  
  const privacyClose = document.getElementById("privacyClose");
  const termsClose = document.getElementById("termsClose");
  
  const footerPrivacy = document.getElementById("footerPrivacy");
  const footerTerms = document.getElementById("footerTerms");
  
  const authPrivacy = document.getElementById("authPrivacy");
  const authTerms = document.getElementById("authTerms");

  function openModal(modal) {
    if (!modal) return;
    modal.removeAttribute("hidden");
    // Trigger animation
    setTimeout(() => {
      modal.classList.add("is-open");
    }, 10);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    setTimeout(() => {
      if (!modal.classList.contains("is-open")) {
        modal.setAttribute("hidden", "");
      }
    }, 350); // Match CSS transition duration
  }

  if (footerPrivacy) footerPrivacy.addEventListener("click", () => openModal(privacyModal));
  if (footerTerms) footerTerms.addEventListener("click", () => openModal(termsModal));
  if (authPrivacy) authPrivacy.addEventListener("click", () => openModal(privacyModal));
  if (authTerms) authTerms.addEventListener("click", () => openModal(termsModal));

  if (privacyClose) privacyClose.addEventListener("click", () => closeModal(privacyModal));
  if (termsClose) termsClose.addEventListener("click", () => closeModal(termsModal));

  // Click outside to close
  [privacyModal, termsModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal(privacyModal);
      closeModal(termsModal);
    }
  });
});
