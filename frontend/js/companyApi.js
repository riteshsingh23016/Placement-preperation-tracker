const API_BASE = "http://localhost:5000/api/companies";

class ApiError extends Error {
  constructor(message, status, errors = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function request(url, options = {}) {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...options,
    });

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
      throw new ApiError(
        data.message || "Request failed",
        response.status,
        data.errors || null
      );
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(
      "Cannot connect to backend server",
      0
    );
  }
}

const CompanyApi = {
  async list() {
    return request(API_BASE);
  },

  async create(body) {
    return request(API_BASE, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async update(id, body) {
    return request(`${API_BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async remove(id) {
    return request(`${API_BASE}/${id}`, {
      method: "DELETE",
    });
  },

  async getAnalytics() {
    return request(`${API_BASE}/analytics`);
  },

  request,
};

window.CompanyApi = CompanyApi;
window.CompanyApi.ApiError = ApiError;