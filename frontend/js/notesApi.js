const API_BASE_NOTES = "http://localhost:5000/api/notes";

const NotesApi = {
  async request(url, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "index.html";
        }
        throw new window.CompanyApi.ApiError(
          data.message || "Request failed",
          response.status,
          data.errors || null
        );
      }

      return data;
    } catch (err) {
      if (err instanceof window.CompanyApi.ApiError) throw err;
      throw new window.CompanyApi.ApiError("Cannot connect to backend server", 0);
    }
  },

  async list() {
    return this.request(API_BASE_NOTES);
  },

  async create(body) {
    return this.request(API_BASE_NOTES, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async update(id, body) {
    return this.request(`${API_BASE_NOTES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async remove(id) {
    return this.request(`${API_BASE_NOTES}/${id}`, {
      method: "DELETE",
    });
  },
};

window.NotesApi = NotesApi;

const API_BASE_COLLECTIONS = "http://localhost:5000/api/collections";

const CollectionApi = {
  async request(url, options = {}) {
    // Re-use logic from NotesApi but for collections
    return NotesApi.request(url, options);
  },

  async list() {
    return this.request(API_BASE_COLLECTIONS);
  },

  async create(body) {
    return this.request(API_BASE_COLLECTIONS, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async update(id, body) {
    return this.request(`${API_BASE_COLLECTIONS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async remove(id) {
    return this.request(`${API_BASE_COLLECTIONS}/${id}`, {
      method: "DELETE",
    });
  },
};

window.CollectionApi = CollectionApi;
