const tabBtns = document.querySelectorAll(".tab-btn")
const loginForms = document.querySelectorAll(".login-form")

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab

    tabBtns.forEach((b) => b.classList.remove("active"))
    btn.classList.add("active")

    loginForms.forEach((form) => {
      if (form.id === `${tabName}LoginForm`) {
        form.classList.add("active")
      } else {
        form.classList.remove("active")
      }
    })
  })
})

document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const username = document.getElementById("username").value
  const password = document.getElementById("password").value

  if (!username || !password) {
    alert("Por favor, preencha todos os campos")
    return
  }

  try {
    // Tenta login do cliente admin (usa username conforme backend)
    const data = await window.apiClient.loginClient(username, password)

    console.log("[v0] Login successful:", data.role)

    // Redirect based on role
    if (data.role === "super_admin") {
      window.location.href = "super-admin.html" // Super admin dashboard (to be created)
    } else {
      window.location.href = "admin.html" // Client admin panel
    }
  } catch (error) {
    console.error("[v0] Login error:", error)
    alert(`Erro ao fazer login: ${error.message}`)
  }
})

document.getElementById("clientLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const token = document.getElementById("token").value

  if (!token) {
    alert("Por favor, insira o token")
    return
  }

  try {
    const data = await window.apiClient.loginToken(token)

    console.log("[v0] Token login successful")

    // Apply client theme if available
    if (data.client) {
      applyClientTheme(data.client)
    }

    window.location.href = "index.html"
  } catch (error) {
    console.error("[v0] Token login error:", error)
    alert(`Token inválido: ${error.message}`)
  }
})

function applyClientTheme(client) {
  const root = document.documentElement

  if (client.primary_color) root.style.setProperty("--accent", client.primary_color)
  if (client.secondary_color) root.style.setProperty("--accent-hover", client.secondary_color)
  if (client.accent_color) root.style.setProperty("--success", client.accent_color)
  if (client.text_color) root.style.setProperty("--text-primary", client.text_color)
  // persist theme for app
  try {
    localStorage.setItem("client_theme", JSON.stringify(client))
  } catch {}
}
