// API Client for White Label Trading System
// Handles all communication with Flask backend

const API_BASE_URL = "http://localhost:5000/api"

class APIClient {
  constructor() {
    this.accessToken = localStorage.getItem("access_token")
    this.refreshToken = localStorage.getItem("refresh_token")
    this.userRole = localStorage.getItem("user_role")
  }

  // Helper method to make authenticated requests
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    // Add authorization header if token exists
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Handle token expiration
      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          // Retry the request with new token
          headers["Authorization"] = `Bearer ${this.accessToken}`
          const retryResponse = await fetch(url, { ...options, headers })
          return await this.handleResponse(retryResponse)
        } else {
          // Refresh failed, logout
          this.logout()
          throw new Error("Session expired. Please login again.")
        }
      }

      return await this.handleResponse(response)
    } catch (error) {
      console.error("[v0] API request failed:", error)
      throw error
    }
  }

  async handleResponse(response) {
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Request failed")
    }

    return data
  }

  // ===== AUTHENTICATION =====

  async loginSuperAdmin(username, password) {
    const data = await this.request("/auth/super-admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })

    this.saveAuthData(data)
    return data
  }

  async loginClient(username, password) {
    const data = await this.request("/auth/client/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })

    this.saveAuthData(data)
    return data
  }

  async loginToken(token) {
    const data = await this.request("/auth/token/login", {
      method: "POST",
      body: JSON.stringify({ token }),
    })

    this.saveAuthData(data)
    return data
  }

  async verifyToken() {
    return await this.request("/auth/verify", { method: "GET" })
  }

  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("[v0] Logout error:", error)
    } finally {
      this.clearAuthData()
      window.location.href = "login.html"
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) return false

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.refreshToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        this.accessToken = data.access_token
        localStorage.setItem("access_token", data.access_token)
        return true
      }
      return false
    } catch (error) {
      console.error("[v0] Token refresh failed:", error)
      return false
    }
  }

  saveAuthData(data) {
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token
    this.userRole = data.role

    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)
    localStorage.setItem("user_role", data.role)
    localStorage.setItem("user_data", JSON.stringify(data.user || data.token))

    // Save client theme if token user
    if (data.client) {
      localStorage.setItem("client_theme", JSON.stringify(data.client))
    }

    // Save customization if available
    if (data.customization) {
      localStorage.setItem("client_customization", JSON.stringify(data.customization))
    }
  }

  clearAuthData() {
    this.accessToken = null
    this.refreshToken = null
    this.userRole = null

    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user_role")
    localStorage.removeItem("user_data")
    localStorage.removeItem("client_theme")
    localStorage.removeItem("client_customization")
  }

  // ===== CLIENT ADMIN ENDPOINTS =====

  async getClientProfile() {
    return await this.request("/client/profile", { method: "GET" })
  }

  async updateClientProfile(data) {
    return await this.request("/client/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async updateClientTheme(colors) {
    return await this.request("/client/theme", {
      method: "PUT",
      body: JSON.stringify(colors),
    })
  }

  async getClientCustomization() {
    return await this.request("/client/customization", { method: "GET" })
  }

  async updateClientCustomization(settings) {
    return await this.request("/client/customization", {
      method: "PUT",
      body: JSON.stringify(settings),
    })
  }

  async getClientTokens() {
    return await this.request("/client/tokens", { method: "GET" })
  }

  async createClientToken(tokenData) {
    return await this.request("/client/tokens", {
      method: "POST",
      body: JSON.stringify(tokenData),
    })
  }

  async deleteClientToken(tokenId) {
    return await this.request(`/client/tokens/${tokenId}`, { method: "DELETE" })
  }

  async toggleClientToken(tokenId) {
    return await this.request(`/client/tokens/${tokenId}/toggle`, { method: "PUT" })
  }

  // ===== SUPER ADMIN ENDPOINTS =====

  async getSuperAdminDashboard() {
    return await this.request("/super-admin/dashboard/stats", { method: "GET" })
  }

  async getAllClients(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return await this.request(`/super-admin/clients?${queryString}`, { method: "GET" })
  }

  async getClientDetails(clientId) {
    return await this.request(`/super-admin/clients/${clientId}`, { method: "GET" })
  }

  async createClient(clientData) {
    return await this.request("/super-admin/clients", {
      method: "POST",
      body: JSON.stringify(clientData),
    })
  }

  async updateClient(clientId, clientData) {
    return await this.request(`/super-admin/clients/${clientId}`, {
      method: "PUT",
      body: JSON.stringify(clientData),
    })
  }

  async deleteClient(clientId) {
    return await this.request(`/super-admin/clients/${clientId}`, { method: "DELETE" })
  }

  async toggleClientStatus(clientId) {
    return await this.request(`/super-admin/clients/${clientId}/toggle`, { method: "PUT" })
  }

  async getSystemAnalytics(days = 30) {
    return await this.request(`/super-admin/dashboard/analytics?days=${days}`, { method: "GET" })
  }

  async getRecentActivity(limit = 50) {
    return await this.request(`/super-admin/dashboard/recent-activity?limit=${limit}`, { method: "GET" })
  }

  async getSystemSettings() {
    return await this.request("/super-admin/settings", { method: "GET" })
  }

  async updateSystemSetting(key, value, description) {
    return await this.request(`/super-admin/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ setting_value: value, description }),
    })
  }
}

// Create global instance
window.apiClient = new APIClient()
