/* Notification Center & Global Reminders */

class NotificationManager {
  constructor() {
    this.panel = document.getElementById("ncPanel");
    this.list = document.getElementById("ncList");
    this.toggleBtn = document.getElementById("ncToggle");
    this.badge = document.getElementById("notifBadge");
    this.markAllBtn = document.getElementById("markAllRead");
    
    this.notifications = [];
    this.timerInterval = null;
    
    this.init();
  }

  init() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.panel.classList.toggle("is-open");
        if (this.panel.classList.contains("is-open")) {
          this.loadNotifications();
        }
      });
    }

    if (this.markAllBtn) {
      this.markAllBtn.addEventListener("click", () => this.markAllAsRead());
    }

    document.addEventListener("click", (e) => {
      if (this.panel && !this.panel.contains(e.target) && !e.target.closest("#ncToggle")) {
        this.panel.classList.remove("is-open");
      }
    });

    this.loadNotifications();
    this.startGlobalTimer();
  }

  async loadNotifications() {
    if (!window.NotificationApi) return;
    try {
      const res = await window.NotificationApi.list();
      if (res.success) {
        // Only re-render if data actually changed to prevent flickering
        const newNotifs = JSON.stringify(res.data);
        if (newNotifs !== JSON.stringify(this.notifications)) {
          this.notifications = res.data;
          this.renderNotifications();
          this.updateBadges();
        }
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }

  renderNotifications() {
    if (!this.list) return;
    
    if (this.notifications.length === 0) {
      this.list.innerHTML = `
        <div class="empty-state">
          <i data-lucide="bell-off"></i>
          <div class="empty-state__title">All caught up!</div>
          <div class="empty-state__text">No new notifications at the moment.</div>
        </div>
      `;
    } else {
      this.list.innerHTML = this.notifications.map(n => `
        <div class="nc-item ${n.read ? '' : 'is-unread'}" data-id="${n._id}">
          ${n.read ? '' : '<div class="nc-item__dot"></div>'}
          <div class="nc-item__icon">
            ${this.getIcon(n.type)}
          </div>
          <div class="nc-item__content">
            <div class="nc-item__title">${n.title}</div>
            <div class="nc-item__desc">${n.message}</div>
            <div class="nc-item__time">${this.formatTime(n.createdAt)}</div>
          </div>
        </div>
      `).join("");

      // Add click listeners to items
      this.list.querySelectorAll(".nc-item").forEach(item => {
        const notif = this.notifications.find(n => n._id === item.dataset.id);
        item.addEventListener("click", () => this.handleNotificationClick(notif));
      });
    }
    
    if (window.lucide) window.lucide.createIcons();
  }

  updateBadges() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    
    if (this.badge) {
      if (unreadCount > 0) {
        this.badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
        this.badge.hidden = false;
      } else {
        this.badge.hidden = true;
      }
    }
  }

  async handleNotificationClick(notif) {
    if (!notif) return;

    // Mark as read
    if (!notif.read) {
      await this.markAsRead(notif._id);
    }

    // Handle redirection/modal logic
    if (notif.company) {
      // Store company ID to open modal automatically
      sessionStorage.setItem("pendingCompanyId", notif.company);
      
      // Redirect to companies page if not already there
      if (!window.location.pathname.includes("company.html")) {
        window.location.href = "company.html";
      } else {
        // If already on companies page, the page logic should handle the pending ID
        if (window.handlePendingCompany) {
          window.handlePendingCompany();
        }
      }
    }
    
    this.panel.classList.remove("is-open");
  }

  async markAsRead(id) {
    try {
      await window.NotificationApi.markAsRead(id);
      this.notifications = this.notifications.map(n => 
        n._id === id ? { ...n, read: true } : n
      );
      this.renderNotifications();
      this.updateBadges();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }

  async markAllAsRead() {
    try {
      await window.NotificationApi.markAllAsRead();
      this.notifications = this.notifications.map(n => ({ ...n, read: true }));
      this.renderNotifications();
      this.updateBadges();
      if (window.Toast) window.Toast.success("Success", "All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }

  getIcon(type) {
    switch (type) {
      case "interview": return '<i data-lucide="calendar" style="color: var(--indigo)"></i>';
      case "deadline": return '<i data-lucide="clock" style="color: var(--warn)"></i>';
      case "status_change": return '<i data-lucide="refresh-cw" style="color: var(--blue)"></i>';
      default: return '<i data-lucide="bell" style="color: var(--subtle)"></i>';
    }
  }

  formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  }

  /**
   * Countdown Logic
   * Uses a single interval to update all countdown elements in DOM
   */
  startGlobalTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    const updateAll = () => {
      const timers = document.querySelectorAll("[data-countdown]");
      timers.forEach(el => {
        const date = new Date(el.dataset.countdown);
        el.innerHTML = this.getCountdownMarkup(date);
      });
    };

    updateAll();
    this.timerInterval = setInterval(updateAll, 60000); // Update every minute
  }

  getCountdownMarkup(date) {
    const now = new Date();
    now.setHours(0,0,0,0);
    const target = new Date(date);
    target.setHours(0,0,0,0);
    
    const diffTime = target - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let cls = "countdown";
    let text = "";
    let icon = "clock";

    if (diffDays === 0) {
      cls += " countdown--urgent";
      text = "Today";
      icon = "alert-circle";
    } else if (diffDays === 1) {
      cls += " countdown--soon";
      text = "Tomorrow";
    } else if (diffDays < 0) {
      cls += " countdown--overdue";
      text = `${Math.abs(diffDays)}d overdue`;
      icon = "alert-triangle";
    } else {
      text = `${diffDays} days left`;
    }

    return `<span class="${cls}"><i data-lucide="${icon}" style="width:14px;height:14px"></i>${text}</span>`;
  }
}

window.NotificationManager = new NotificationManager();
