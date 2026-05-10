const NOTIF_API_BASE = "http://localhost:5000/api/notifications";

const NotificationApi = {
  async list() {
    return window.CompanyApi.request(NOTIF_API_BASE);
  },

  async markAsRead(id) {
    return window.CompanyApi.request(`${NOTIF_API_BASE}/${id}/read`, {
      method: "PUT",
    });
  },

  async markAllAsRead() {
    return window.CompanyApi.request(`${NOTIF_API_BASE}/read-all`, {
      method: "PUT",
    });
  },

  async remove(id) {
    return window.CompanyApi.request(`${NOTIF_API_BASE}/${id}`, {
      method: "DELETE",
    });
  },
};

window.NotificationApi = NotificationApi;
