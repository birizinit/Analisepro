// Verificar se está logado
const accessToken = localStorage.getItem("access_token")
const userRole = localStorage.getItem("user_role")

if (!accessToken || userRole !== "client_admin") {
  window.location.href = "login.html"
}

// Navegação entre seções
const navItems = document.querySelectorAll(".nav-item")
const sections = document.querySelectorAll(".content-section")

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const sectionId = item.dataset.section

    navItems.forEach((nav) => nav.classList.remove("active"))
    sections.forEach((section) => section.classList.remove("active"))

    item.classList.add("active")
    document.getElementById(sectionId).classList.add("active")
  })
})

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await window.apiClient.logout()
})

// ===== ATIVOS =====
async function loadAssets() {
  try {
    const customization = await window.apiClient.getClientCustomization()
    const assets = customization.enabled_assets || []
    const assetsList = document.getElementById("assetsList")
    const assetCount = document.getElementById("assetCount")

    assetCount.textContent = assets.length

    if (assets.length === 0) {
      assetsList.innerHTML = '<div class="empty-state">Nenhum ativo configurado</div>'
      return
    }

    assetsList.innerHTML = assets
      .map(
        (asset) => `
        <div class="asset-item">
            <span class="asset-name">${asset}</span>
            <button class="btn-remove" onclick="removeAsset('${asset}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `,
      )
      .join("")
  } catch (error) {
    console.error("[v0] Error loading assets:", error)
    alert("Erro ao carregar ativos")
  }
}

document.getElementById("addAssetBtn").addEventListener("click", async () => {
  const input = document.getElementById("newAsset")
  const asset = input.value.trim().toUpperCase()

  if (!asset) return

  try {
    const customization = await window.apiClient.getClientCustomization()
    const assets = customization.enabled_assets || []

    if (assets.includes(asset)) {
      alert("Este ativo já está na lista!")
      return
    }

    assets.push(asset)
    await window.apiClient.updateClientCustomization({ enabled_assets: assets })
    input.value = ""
    loadAssets()
  } catch (error) {
    console.error("[v0] Error adding asset:", error)
    alert("Erro ao adicionar ativo")
  }
})

async function removeAsset(asset) {
  try {
    const customization = await window.apiClient.getClientCustomization()
    const assets = customization.enabled_assets || []
    const filtered = assets.filter((a) => a !== asset)

    await window.apiClient.updateClientCustomization({ enabled_assets: filtered })
    loadAssets()
  } catch (error) {
    console.error("[v0] Error removing asset:", error)
    alert("Erro ao remover ativo")
  }
}

// ===== CONFLUÊNCIAS =====
const confluenceSlider = document.getElementById("confluenceSlider")
const confluenceValue = document.getElementById("confluenceValue")

confluenceSlider.addEventListener("input", (e) => {
  confluenceValue.textContent = e.target.value
})

async function loadConfluences() {
  try {
    const customization = await window.apiClient.getClientCustomization()

    confluenceSlider.value = customization.confluence_threshold || 3
    confluenceValue.textContent = customization.confluence_threshold || 3

    // Map backend fields to frontend checkboxes
    const indicatorMap = {
      rsi: customization.rsi_enabled,
      macd: customization.macd_enabled,
      bb: customization.bb_enabled,
      ema: customization.ema_enabled,
      stoch: customization.volume_enabled,
    }

    document.querySelectorAll("[data-indicator]").forEach((checkbox) => {
      const indicator = checkbox.dataset.indicator
      checkbox.checked = indicatorMap[indicator] !== false
    })
  } catch (error) {
    console.error("[v0] Error loading confluences:", error)
  }
}

document.getElementById("saveConfluences").addEventListener("click", async () => {
  try {
    const indicators = {}
    document.querySelectorAll("[data-indicator]").forEach((checkbox) => {
      indicators[checkbox.dataset.indicator] = checkbox.checked
    })

    const updateData = {
      confluence_threshold: Number.parseInt(confluenceSlider.value),
      rsi_enabled: indicators.rsi,
      macd_enabled: indicators.macd,
      bb_enabled: indicators.bb,
      ema_enabled: indicators.ema,
      volume_enabled: indicators.stoch,
    }

    await window.apiClient.updateClientCustomization(updateData)
    alert("Configurações de confluências salvas com sucesso!")
  } catch (error) {
    console.error("[v0] Error saving confluences:", error)
    alert("Erro ao salvar configurações")
  }
})

// ===== TEMA =====
const colorInputs = {
  primary: { color: document.getElementById("primaryColor"), text: document.getElementById("primaryColorText") },
  secondary: { color: document.getElementById("secondaryColor"), text: document.getElementById("secondaryColorText") },
  success: { color: document.getElementById("successColor"), text: document.getElementById("successColorText") },
  danger: { color: document.getElementById("dangerColor"), text: document.getElementById("dangerColorText") },
  bg: { color: document.getElementById("bgColor"), text: document.getElementById("bgColorText") },
  text: { color: document.getElementById("textColor"), text: document.getElementById("textColorText") },
}

// Sincronizar color picker com text input
Object.values(colorInputs).forEach(({ color, text }) => {
  color.addEventListener("input", (e) => {
    text.value = e.target.value
    updatePreview()
  })

  text.addEventListener("input", (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
      color.value = e.target.value
      updatePreview()
    }
  })
})

function updatePreview() {
  const preview = document.getElementById("themePreview")
  preview.style.setProperty("--preview-bg", colorInputs.bg.color.value)
  preview.style.setProperty("--preview-text", colorInputs.text.color.value)
  preview.style.setProperty("--preview-success", colorInputs.success.color.value)
  preview.style.setProperty("--preview-danger", colorInputs.danger.color.value)
}

async function loadTheme() {
  try {
    const profile = await window.apiClient.getClientProfile()

    if (profile.primary_color) colorInputs.primary.color.value = colorInputs.primary.text.value = profile.primary_color
    if (profile.secondary_color)
      colorInputs.secondary.color.value = colorInputs.secondary.text.value = profile.secondary_color
    if (profile.accent_color) colorInputs.success.color.value = colorInputs.success.text.value = profile.accent_color
    if (profile.text_color) colorInputs.danger.color.value = colorInputs.danger.text.value = profile.text_color

    colorInputs.bg.color.value = colorInputs.bg.text.value = "#0f172a"
    colorInputs.text.color.value = colorInputs.text.text.value = "#f1f5f9"

    updatePreview()
  } catch (error) {
    console.error("[v0] Error loading theme:", error)
  }
}

document.getElementById("saveTheme").addEventListener("click", async () => {
  try {
    const theme = {
      primary_color: colorInputs.primary.color.value,
      secondary_color: colorInputs.secondary.color.value,
      accent_color: colorInputs.success.color.value,
      text_color: colorInputs.danger.color.value,
    }

    await window.apiClient.updateClientTheme(theme)
    alert("Tema salvo com sucesso! As cores serão aplicadas na próxima vez que você abrir a aplicação.")
  } catch (error) {
    console.error("[v0] Error saving theme:", error)
    alert("Erro ao salvar tema")
  }
})

document.getElementById("resetTheme").addEventListener("click", () => {
  colorInputs.primary.color.value = colorInputs.primary.text.value = "#3b82f6"
  colorInputs.secondary.color.value = colorInputs.secondary.text.value = "#2563eb"
  colorInputs.success.color.value = colorInputs.success.text.value = "#10b981"
  colorInputs.danger.color.value = colorInputs.danger.text.value = "#ef4444"
  colorInputs.bg.color.value = colorInputs.bg.text.value = "#0f172a"
  colorInputs.text.color.value = colorInputs.text.text.value = "#f1f5f9"
  updatePreview()
  alert("Tema resetado para o padrão!")
})

// ===== TOKENS =====
async function loadTokens() {
  try {
    const response = await window.apiClient.getClientTokens()
    const tokens = response.tokens || []
    const tokensList = document.getElementById("tokensList")
    const tokenCount = document.getElementById("tokenCount")

    tokenCount.textContent = tokens.length

    if (tokens.length === 0) {
      tokensList.innerHTML = '<div class="empty-state">Nenhum token gerado ainda</div>'
      return
    }

    tokensList.innerHTML = tokens
      .map(
        (token) => `
        <div class="token-item">
            <div class="token-info">
                <div class="token-name">${token.token_name || "Token"}</div>
                <div class="token-value">${token.token}</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">
                  Status: ${token.is_active ? "✓ Ativo" : "✕ Inativo"} | 
                  Usos: ${token.usage_count} | 
                  Criado: ${new Date(token.created_at).toLocaleDateString("pt-BR")}
                </div>
            </div>
            <div class="token-actions">
                <button class="btn-copy" onclick="copyToken('${token.token}')">Copiar</button>
                <button class="btn-delete" onclick="deleteToken(${token.id})">Excluir</button>
            </div>
        </div>
    `,
      )
      .join("")
  } catch (error) {
    console.error("[v0] Error loading tokens:", error)
    alert("Erro ao carregar tokens")
  }
}

document.getElementById("generateTokenBtn").addEventListener("click", async () => {
  const input = document.getElementById("tokenName")
  const name = input.value.trim()

  if (!name) {
    alert("Por favor, insira um nome para o token")
    return
  }

  try {
    await window.apiClient.createClientToken({ token_name: name })
    input.value = ""
    loadTokens()
    alert("Token criado com sucesso!")
  } catch (error) {
    console.error("[v0] Error creating token:", error)
    alert(`Erro ao criar token: ${error.message}`)
  }
})

function copyToken(token) {
  navigator.clipboard.writeText(token).then(() => {
    alert("Token copiado para a área de transferência!")
  })
}

async function deleteToken(tokenId) {
  if (!confirm("Tem certeza que deseja excluir este token?")) return

  try {
    await window.apiClient.deleteClientToken(tokenId)
    loadTokens()
    alert("Token excluído com sucesso!")
  } catch (error) {
    console.error("[v0] Error deleting token:", error)
    alert("Erro ao excluir token")
  }
}

// Inicializar tudo
loadAssets()
loadConfluences()
loadTheme()
loadTokens()
