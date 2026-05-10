/* Lightweight Toast Notification System */

class ToastSystem {
  constructor() {
    this.container = document.createElement("div");
    this.container.className = "toast-container";
    document.body.appendChild(this.container);
    this.toasts = [];
    this.maxToasts = 3;
  }

  show({ title, message, type = "info", duration = 4000 }) {
    // Limit active toasts to avoid spam
    if (this.toasts.length >= this.maxToasts) {
      this.remove(this.toasts[0]);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    
    const icon = this.getIcon(type);
    
    toast.innerHTML = `
      <div class="toast__icon">${icon}</div>
      <div class="toast__content">
        <div class="toast__title">${title}</div>
        <div class="toast__message">${message}</div>
      </div>
    `;

    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    if (window.lucide) window.lucide.createIcons();

    // Auto remove
    setTimeout(() => {
      this.remove(toast);
    }, duration);
  }

  remove(toast) {
    toast.classList.remove("is-visible");
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 400); // Match transition duration
  }

  getIcon(type) {
    switch (type) {
      case "success": return '<i data-lucide="check-circle"></i>';
      case "error": return '<i data-lucide="alert-circle"></i>';
      case "warning": return '<i data-lucide="alert-triangle"></i>';
      default: return '<i data-lucide="info"></i>';
    }
  }

  success(title, message) { this.show({ title, message, type: "success" }); }
  error(title, message) { this.show({ title, message, type: "error" }); }
  info(title, message) { this.show({ title, message, type: "info" }); }
  warn(title, message) { this.show({ title, message, type: "warning" }); }
}

window.Toast = new ToastSystem();
