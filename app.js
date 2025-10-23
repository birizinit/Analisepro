;(() => {
  // State
  const state = {
    bankroll: 1000,
    totalOps: 6,
    expectedWins: 4,
    payout: 1.9,
    stakeMode: "percent",
    stakeValue: 1,
    operations: [],
    projectedBalance: 0,
    projectedReturn: 0,
    allowedLosses: 0,
    winRate: 0,
    realProfit: 0,
    isLoading: false,
    loadingInterval: null,
    loadingMessages: [
      "Conectando à Binance...",
      "Coletando dados de 1 hora...",
      "Analisando velas de 1 minuto...",
      "Calculando Suporte e Resistência...",
      "Verificando Price Action...",
      "Analisando Tendência...",
      "Calculando Fibonacci...",
      "Verificando Bollinger Bands...",
      "Calculando MACD e RSI...",
      "Validando confluências...",
    ],
    signalData: null,
    sidebarCollapsed: false,
  }

  // Helpers
  const $ = (s) => document.querySelector(s)
  const fmtCurrency = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  let bankrollEl, totalOpsEl, expectedWinsEl, payoutEl, stakeModeEl, stakeValueEl, stakeValueLabel
  let generateBtn, loadingOverlay, loadingMessageEl
  let operationsEl, resetBtn, saveSettingsBtn
  let bankrollDisplay, projectedBalanceEl, projectedReturnEl, allowedLossesEl, winRateEl, realProfitBox, realProfitEl
  let winsCountEl, lossesCountEl, pendingCountEl
  let signalModal,
    closeModal,
    ackBtn,
    signalAssetEl,
    signalConfidenceEl,
    signalAnalysesEl,
    signalTimestampEl,
    signalTypeEl,
    confluenceCountEl
  let noSignalModal, closeNoSignalModal, ackNoSignalBtn, noSignalConfluencesEl, noSignalAnalysesEl
  let confirmModal, confirmMessage, confirmYes, confirmNo
  let toggleSidebar, sidebar
  let confirmCallback = null

  function showToast(message, type = "info") {
    const toast = document.createElement("div")
    toast.className = `toast toast-${type}`
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${type === "success" ? "✓" : type === "error" ? "✕" : type === "warning" ? "⚠" : "ℹ"}</span>
        <span class="toast-message">${message}</span>
      </div>
    `
    document.body.appendChild(toast)

    setTimeout(() => toast.classList.add("toast-show"), 10)

    setTimeout(() => {
      toast.classList.remove("toast-show")
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }

  async function saveSettings() {
    const settings = {
      bankroll: state.bankroll,
      totalOps: state.totalOps,
      expectedWins: state.expectedWins,
      payout: state.payout,
      stakeMode: state.stakeMode,
      stakeValue: state.stakeValue,
    }

    try {
      localStorage.setItem("settings", JSON.stringify(settings))
      showToast("Configurações salvas com sucesso!", "success")
    } catch (error) {
      console.error("Error saving settings:", error)
      showToast("Erro ao salvar configurações", "error")
    }
  }

  async function loadSettings() {
    try {
      const settingsStr = localStorage.getItem("settings")
      if (settingsStr) {
        const settings = JSON.parse(settingsStr)
        Object.assign(state, settings)
        updateInputsFromState()
        recalc()
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  function updateInputsFromState() {
    bankrollEl.value = state.bankroll
    totalOpsEl.value = state.totalOps
    expectedWinsEl.value = state.expectedWins
    payoutEl.value = state.payout
    stakeModeEl.value = state.stakeMode
    stakeValueEl.value = state.stakeValue
    stakeValueLabel.innerText = state.stakeMode === "percent" ? "Percentual (%)" : "Valor (R$)"
  }

  function validateInputs() {
    const errors = []

    if (state.bankroll <= 0) {
      errors.push("Banca deve ser maior que zero")
    }

    if (state.totalOps < 1) {
      errors.push("Total de operações deve ser no mínimo 1")
    }

    if (state.expectedWins > state.totalOps) {
      errors.push("Acertos não pode ser maior que Total de Operações")
    }

    if (state.payout < 1) {
      errors.push("Payout deve ser maior ou igual a 1.0")
    }

    if (state.stakeValue <= 0) {
      errors.push("Valor do stake deve ser maior que zero")
    }

    if (state.stakeMode === "percent" && state.stakeValue > 100) {
      errors.push("Percentual não pode ser maior que 100%")
    }

    if (state.stakeMode === "percent" && state.stakeValue > 5) {
      showToast("Atenção: Stake acima de 5% é considerado arriscado!", "warning")
    }

    if (errors.length > 0) {
      showToast(errors[0], "error")
      return false
    }

    return true
  }

  function applyCustomTheme() {
    const theme = JSON.parse(localStorage.getItem("theme") || "{}")

    if (Object.keys(theme).length > 0) {
      const root = document.documentElement

      if (theme.primary) {
        root.style.setProperty("--accent", theme.primary)
        root.style.setProperty("--accent-hover", theme.secondary || theme.primary)
      }
      if (theme.success) root.style.setProperty("--success", theme.success)
      if (theme.danger) root.style.setProperty("--danger", theme.danger)
      if (theme.bg) root.style.setProperty("--bg-primary", theme.bg)
      if (theme.text) root.style.setProperty("--text-primary", theme.text)
    }
  }

  // Apply theme on load
  applyCustomTheme()

  async function init() {
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Get all elements
    generateBtn = $("#generateBtn")
    bankrollEl = $("#bankroll")
    totalOpsEl = $("#totalOps")
    expectedWinsEl = $("#expectedWins")
    payoutEl = $("#payout")
    stakeModeEl = $("#stakeMode")
    stakeValueEl = $("#stakeValue")
    stakeValueLabel = $("#stakeValueLabel")
    loadingOverlay = $("#loadingOverlay")
    loadingMessageEl = $("#loadingMessage")
    operationsEl = $("#operations")
    resetBtn = $("#resetBtn")
    saveSettingsBtn = $("#saveSettingsBtn")
    bankrollDisplay = $("#bankrollDisplay")
    projectedBalanceEl = $("#projectedBalance")
    projectedReturnEl = $("#projectedReturn")
    allowedLossesEl = $("#allowedLosses")
    winRateEl = $("#winRate")
    realProfitBox = $("#realProfitBox")
    realProfitEl = $("#realProfit")
    winsCountEl = $("#winsCount")
    lossesCountEl = $("#lossesCount")
    pendingCountEl = $("#pendingCount")
    signalModal = $("#signalModal")
    closeModal = $("#closeModal")
    ackBtn = $("#ackBtn")
    signalAssetEl = $("#signalAsset")
    signalConfidenceEl = $("#signalConfidence")
    signalAnalysesEl = $("#signalAnalyses")
    signalTimestampEl = $("#signalTimestamp")
    signalTypeEl = $("#signalType")
    confluenceCountEl = $("#confluenceCount")
    noSignalModal = $("#noSignalModal")
    closeNoSignalModal = $("#closeNoSignalModal")
    ackNoSignalBtn = $("#ackNoSignalBtn")
    noSignalConfluencesEl = $("#noSignalConfluences")
    noSignalAnalysesEl = $("#noSignalAnalyses")
    confirmModal = $("#confirmModal")
    confirmMessage = $("#confirmMessage")
    confirmYes = $("#confirmYes")
    confirmNo = $("#confirmNo")
    toggleSidebar = $("#toggleSidebar")
    sidebar = $("#sidebar")

    const logoutBtn = $("#logoutBtn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("isLoggedIn")
        localStorage.removeItem("userType")
        localStorage.removeItem("userEmail")
        localStorage.removeItem("userToken")
        localStorage.removeItem("tokenName")
        window.location.href = "login.html"
      })
    }

    const adminPanelBtn = $("#adminPanelBtn")
    if (adminPanelBtn) {
      const userType = localStorage.getItem("userType")
      if (userType === "admin") {
        adminPanelBtn.style.display = "block"
      } else {
        adminPanelBtn.style.display = "none"
      }
    }

    await loadSettings()

    // Wire inputs
    bankrollEl.addEventListener("input", () => {
      state.bankroll = Number(bankrollEl.value || 0)
      recalc()
    })

    totalOpsEl.addEventListener("input", () => {
      state.totalOps = Math.max(1, Number(totalOpsEl.value || 1))
      if (validateInputs()) recalc()
    })

    expectedWinsEl.addEventListener("input", () => {
      state.expectedWins = Math.max(0, Number(expectedWinsEl.value || 0))
      if (validateInputs()) recalc()
    })

    payoutEl.addEventListener("input", () => {
      state.payout = Number(payoutEl.value || 1.0)
      if (validateInputs()) recalc()
    })

    stakeModeEl.addEventListener("change", () => {
      state.stakeMode = stakeModeEl.value
      stakeValueLabel.innerText = state.stakeMode === "percent" ? "Percentual (%)" : "Valor (R$)"
      recalc()
    })

    stakeValueEl.addEventListener("input", () => {
      state.stakeValue = Number(stakeValueEl.value || 0)
      if (validateInputs()) recalc()
    })

    generateBtn.addEventListener("click", handleGenerateSignal)
    resetBtn.addEventListener("click", () =>
      showConfirmation("Tem certeza que deseja resetar todas as operações?", resetOperations),
    )
    saveSettingsBtn.addEventListener("click", saveSettings)

    closeModal.addEventListener("click", () => hideSignalModal())
    ackBtn.addEventListener("click", () => hideSignalModal())

    closeNoSignalModal.addEventListener("click", () => hideNoSignalModal())
    ackNoSignalBtn.addEventListener("click", () => hideNoSignalModal())

    confirmYes.addEventListener("click", () => {
      hideConfirmation()
      if (confirmCallback) confirmCallback()
    })

    confirmNo.addEventListener("click", hideConfirmation)

    // Sidebar toggle
    toggleSidebar.addEventListener("click", () => {
      state.sidebarCollapsed = !state.sidebarCollapsed
      sidebar.classList.toggle("collapsed")
      const icon = $("#toggleIcon")
      icon.textContent = state.sidebarCollapsed ? "→" : "←"
    })

    recalc()
  }

  function showConfirmation(message, callback) {
    confirmMessage.innerText = message
    confirmCallback = callback
    confirmModal.classList.remove("hidden")
  }

  function hideConfirmation() {
    confirmModal.classList.add("hidden")
    confirmCallback = null
  }

  function recalc() {
    if (!validateInputs()) return

    const stake = state.stakeMode === "percent" ? state.bankroll * (state.stakeValue / 100) : state.stakeValue
    const profitPerWin = stake * (state.payout - 1)
    const losses = Math.max(0, state.totalOps - state.expectedWins)
    const expectedProfit = state.expectedWins * profitPerWin - losses * stake
    const projected = state.bankroll + expectedProfit
    const returnPercent = state.bankroll ? (expectedProfit / state.bankroll) * 100 : 0
    const rate = state.totalOps ? (state.expectedWins / state.totalOps) * 100 : 0

    state.projectedBalance = projected
    state.projectedReturn = returnPercent
    state.allowedLosses = losses
    state.winRate = rate

    if (!state.operations || state.operations.length !== state.totalOps) {
      state.operations = Array.from({ length: state.totalOps }, (_, i) => ({
        id: i + 1,
        stake: stake,
        result: "pending",
      }))
    } else {
      state.operations = state.operations.map((op) => ({ ...op, stake }))
    }

    updateUI()
  }

  function updateUI() {
    bankrollDisplay.innerText = fmtCurrency(state.bankroll)
    projectedBalanceEl.innerText = fmtCurrency(state.projectedBalance)
    projectedReturnEl.innerText = (state.projectedReturn >= 0 ? "+" : "") + state.projectedReturn.toFixed(2) + "%"
    allowedLossesEl.innerText = String(state.allowedLosses)
    winRateEl.innerText = state.winRate.toFixed(1) + "%"

    const wins = state.operations.filter((o) => o.result === "win").length
    const losses = state.operations.filter((o) => o.result === "loss").length
    const stake = state.operations[0]?.stake || 0
    const real = wins * (stake * (state.payout - 1)) - losses * stake
    state.realProfit = real
    if (real !== 0) {
      realProfitBox.classList.remove("hidden")
      realProfitEl.innerText = (real >= 0 ? "+" : "") + fmtCurrency(real)
    } else {
      realProfitBox.classList.add("hidden")
    }

    operationsEl.innerHTML = ""
    state.operations.forEach((op) => {
      const btn = document.createElement("button")
      btn.className = "op-btn " + (op.result === "win" ? "win" : op.result === "loss" ? "loss" : "")
      btn.innerHTML = `<div><strong>#${op.id}</strong> <div style="font-size:11px;color:var(--text-secondary);">Stake: ${fmtCurrency(op.stake)}</div></div><div style="min-width:60px;text-align:right;font-weight:600;">${op.result.toUpperCase()}</div>`
      btn.addEventListener("click", () => toggleOperationResult(op.id))
      operationsEl.appendChild(btn)
    })

    winsCountEl.innerText = String(state.operations.filter((o) => o.result === "win").length)
    lossesCountEl.innerText = String(state.operations.filter((o) => o.result === "loss").length)
    pendingCountEl.innerText = String(state.operations.filter((o) => o.result === "pending").length)
  }

  function toggleOperationResult(id) {
    state.operations = state.operations.map((op) => {
      if (op.id === id) {
        const next = op.result === "pending" ? "win" : op.result === "win" ? "loss" : "pending"

        if (next === "win") {
          showToast(`Operação #${id} marcada como WIN!`, "success")
        } else if (next === "loss") {
          showToast(`Operação #${id} marcada como LOSS`, "error")
        }

        return { ...op, result: next }
      }
      return op
    })
    updateUI()
  }

  function resetOperations() {
    state.operations = state.operations.map((op) => ({ ...op, result: "pending" }))
    updateUI()
    showToast("Operações resetadas com sucesso", "info")
  }

  async function generateRealSignal() {
    const assets = [
      { name: "BTC/USDT", symbol: "BTCUSDT" },
      { name: "ETH/USDT", symbol: "ETHUSDT" },
      { name: "SOL/USDT", symbol: "SOLUSDT" },
      { name: "BNB/USDT", symbol: "BNBUSDT" },
      { name: "XRP/USDT", symbol: "XRPUSDT" },
      { name: "ADA/USDT", symbol: "ADAUSDT" },
    ]

    const selectedAsset = assets[Math.floor(Math.random() * assets.length)]

    try {
      const klines1h = await window.BinanceAPI.getKlines(selectedAsset.symbol, "1h", 100)
      const klines1m = await window.BinanceAPI.getKlines(selectedAsset.symbol, "1m", 60)

      const closes1h = klines1h.map((k) => k.close)
      const volumes1h = klines1h.map((k) => k.volume)
      const currentPrice = closes1h[closes1h.length - 1]

      const analyses = []
      const confluences = []
      const missingConfluences = []
      let callScore = 0
      let putScore = 0

      // RSI Analysis
      const rsi = window.TechnicalIndicators.RSI(closes1h, 14)

      if (rsi < 30) {
        callScore += 25
        confluences.push("RSI")
        analyses.push({
          name: "RSI",
          description: `RSI em sobrevenda (${rsi.toFixed(1)}) - Forte indicação de CALL`,
          status: "confirmed",
        })
      } else if (rsi > 70) {
        putScore += 25
        confluences.push("RSI")
        analyses.push({
          name: "RSI",
          description: `RSI em sobrecompra (${rsi.toFixed(1)}) - Forte indicação de PUT`,
          status: "confirmed",
        })
      } else if (rsi >= 45 && rsi <= 55) {
        missingConfluences.push(`RSI neutro (${rsi.toFixed(1)}) - Sem sinal claro`)
        analyses.push({
          name: "RSI",
          description: `RSI neutro (${rsi.toFixed(1)}) - Mercado equilibrado`,
          status: "neutral",
        })
      } else if (rsi > 55) {
        callScore += 8
        missingConfluences.push(`RSI em ${rsi.toFixed(1)} - Força insuficiente para confluência`)
        analyses.push({
          name: "RSI",
          description: `RSI em ${rsi.toFixed(1)} - Leve força compradora`,
          status: "neutral",
        })
      } else {
        putScore += 8
        missingConfluences.push(`RSI em ${rsi.toFixed(1)} - Força insuficiente para confluência`)
        analyses.push({
          name: "RSI",
          description: `RSI em ${rsi.toFixed(1)} - Leve força vendedora`,
          status: "neutral",
        })
      }

      // MACD Analysis
      const macd = window.TechnicalIndicators.MACD(closes1h)

      if (macd.histogram > 0 && macd.macd > macd.signal) {
        callScore += 25
        confluences.push("MACD")
        analyses.push({
          name: "MACD",
          description: `MACD positivo e acima do sinal - Momentum de alta confirmado`,
          status: "confirmed",
        })
      } else if (macd.histogram < 0 && macd.macd < macd.signal) {
        putScore += 25
        confluences.push("MACD")
        analyses.push({
          name: "MACD",
          description: `MACD negativo e abaixo do sinal - Momentum de baixa confirmado`,
          status: "confirmed",
        })
      } else if (macd.histogram > 0) {
        callScore += 10
        missingConfluences.push("MACD positivo mas sem cruzamento confirmado")
        analyses.push({
          name: "MACD",
          description: `MACD positivo mas fraco - Momentum altista moderado`,
          status: "neutral",
        })
      } else {
        putScore += 10
        missingConfluences.push("MACD negativo mas sem cruzamento confirmado")
        analyses.push({
          name: "MACD",
          description: `MACD negativo mas fraco - Momentum baixista moderado`,
          status: "neutral",
        })
      }

      // Bollinger Bands Analysis
      const bb = window.TechnicalIndicators.BollingerBands(closes1h, 20, 2)
      const bbPosition = ((currentPrice - bb.lower) / (bb.upper - bb.lower)) * 100

      if (bbPosition < 20) {
        callScore += 20
        confluences.push("Bollinger Bands")
        analyses.push({
          name: "Bollinger Bands",
          description: `Preço na banda inferior (${bbPosition.toFixed(0)}%) - Reversão para cima provável`,
          status: "confirmed",
        })
      } else if (bbPosition > 80) {
        putScore += 20
        confluences.push("Bollinger Bands")
        analyses.push({
          name: "Bollinger Bands",
          description: `Preço na banda superior (${bbPosition.toFixed(0)}%) - Reversão para baixo provável`,
          status: "confirmed",
        })
      } else {
        missingConfluences.push(`Preço no meio das bandas (${bbPosition.toFixed(0)}%) - Sem extremo`)
        analyses.push({
          name: "Bollinger Bands",
          description: `Preço no meio das Bollinger Bands (${bbPosition.toFixed(0)}%) - Volatilidade normal`,
          status: "neutral",
        })
      }

      // Trend Analysis
      const ema20 = window.TechnicalIndicators.EMA(closes1h, 20)
      const ema50 = window.TechnicalIndicators.EMA(closes1h, 50)
      const lastEma20 = ema20[ema20.length - 1]
      const lastEma50 = ema50[ema50.length - 1]

      if (currentPrice > lastEma20 && lastEma20 > lastEma50) {
        callScore += 20
        confluences.push("Tendência")
        analyses.push({
          name: "Tendência",
          description: `Tendência de alta confirmada - Preço > EMA20 > EMA50`,
          status: "confirmed",
        })
      } else if (currentPrice < lastEma20 && lastEma20 < lastEma50) {
        putScore += 20
        confluences.push("Tendência")
        analyses.push({
          name: "Tendência",
          description: `Tendência de baixa confirmada - Preço < EMA20 < EMA50`,
          status: "confirmed",
        })
      } else if (currentPrice > lastEma20) {
        callScore += 10
        missingConfluences.push("Tendência de curto prazo sem confirmação de longo prazo")
        analyses.push({
          name: "Tendência",
          description: `Preço acima da EMA 20 - Tendência de curto prazo altista`,
          status: "neutral",
        })
      } else {
        putScore += 10
        missingConfluences.push("Tendência de curto prazo sem confirmação de longo prazo")
        analyses.push({
          name: "Tendência",
          description: `Preço abaixo da EMA 20 - Tendência de curto prazo baixista`,
          status: "neutral",
        })
      }

      // Support and Resistance
      const srLevels = window.TechnicalIndicators.findSupportResistance(closes1h, 0.015)
      const nearestSupport = srLevels
        .filter((l) => l.type === "support" && l.price < currentPrice)
        .sort((a, b) => b.price - a.price)[0]
      const nearestResistance = srLevels
        .filter((l) => l.type === "resistance" && l.price > currentPrice)
        .sort((a, b) => a.price - b.price)[0]

      if (nearestSupport && Math.abs(currentPrice - nearestSupport.price) / currentPrice < 0.01) {
        callScore += 20
        confluences.push("Suporte/Resistência")
        analyses.push({
          name: "Suporte/Resistência",
          description: `Preço próximo ao suporte forte (${nearestSupport.price.toFixed(2)}) - Provável reversão`,
          status: "confirmed",
        })
      } else if (nearestResistance && Math.abs(currentPrice - nearestResistance.price) / currentPrice < 0.01) {
        putScore += 20
        confluences.push("Suporte/Resistência")
        analyses.push({
          name: "Suporte/Resistência",
          description: `Preço próximo à resistência forte (${nearestResistance.price.toFixed(2)}) - Provável reversão`,
          status: "confirmed",
        })
      } else {
        missingConfluences.push("Preço distante de níveis críticos de S/R")
        analyses.push({
          name: "Suporte/Resistência",
          description: `Preço entre níveis de S/R - Sem sinal claro`,
          status: "neutral",
        })
      }

      // Fibonacci
      const fib = window.TechnicalIndicators.FibonacciLevels(closes1h.slice(-50))
      const fibLevels = [
        { level: 0.236, price: fib.level_236, name: "23.6%" },
        { level: 0.382, price: fib.level_382, name: "38.2%" },
        { level: 0.5, price: fib.level_500, name: "50%" },
        { level: 0.618, price: fib.level_618, name: "61.8%" },
      ]

      const nearFib = fibLevels.find((f) => Math.abs(currentPrice - f.price) / currentPrice < 0.008)

      if (nearFib) {
        if (currentPrice < fib.level_500) {
          callScore += 15
          confluences.push("Fibonacci")
          analyses.push({
            name: "Fibonacci",
            description: `Preço no nível Fibonacci ${nearFib.name} - Zona de suporte`,
            status: "confirmed",
          })
        } else {
          putScore += 15
          confluences.push("Fibonacci")
          analyses.push({
            name: "Fibonacci",
            description: `Preço no nível Fibonacci ${nearFib.name} - Zona de resistência`,
            status: "confirmed",
          })
        }
      } else {
        missingConfluences.push("Preço fora dos níveis Fibonacci principais")
        analyses.push({
          name: "Fibonacci",
          description: `Preço fora dos níveis Fibonacci principais`,
          status: "neutral",
        })
      }

      // Price Action
      const priceAction = window.TechnicalIndicators.detectPriceAction(klines1m)

      if (priceAction.strength === "strong") {
        if (priceAction.signal === "CALL") {
          callScore += 20
          confluences.push("Price Action")
          analyses.push({
            name: "Price Action",
            description: `Padrão ${priceAction.pattern} detectado - Forte sinal de alta`,
            status: "confirmed",
          })
        } else if (priceAction.signal === "PUT") {
          putScore += 20
          confluences.push("Price Action")
          analyses.push({
            name: "Price Action",
            description: `Padrão ${priceAction.pattern} detectado - Forte sinal de baixa`,
            status: "confirmed",
          })
        }
      } else if (priceAction.strength === "moderate") {
        if (priceAction.signal === "CALL") {
          callScore += 10
          missingConfluences.push(`Padrão ${priceAction.pattern} moderado - Força insuficiente`)
          analyses.push({
            name: "Price Action",
            description: `Padrão ${priceAction.pattern} - Sinal moderado de alta`,
            status: "neutral",
          })
        } else if (priceAction.signal === "PUT") {
          putScore += 10
          missingConfluences.push(`Padrão ${priceAction.pattern} moderado - Força insuficiente`)
          analyses.push({
            name: "Price Action",
            description: `Padrão ${priceAction.pattern} - Sinal moderado de baixa`,
            status: "neutral",
          })
        }
      } else {
        missingConfluences.push(`${priceAction.pattern} - Sem padrão forte detectado`)
        analyses.push({ name: "Price Action", description: `Sem padrão forte detectado`, status: "neutral" })
      }

      // Volume
      const avgVolume = volumes1h.slice(-20).reduce((a, b) => a + b, 0) / 20
      const currentVolume = volumes1h[volumes1h.length - 1]
      const volumeRatio = currentVolume / avgVolume

      if (volumeRatio > 1.5) {
        const bonus = 10
        if (callScore > putScore) callScore += bonus
        else if (putScore > callScore) putScore += bonus
        analyses.push({
          name: "Volume",
          description: `Volume ${(volumeRatio * 100).toFixed(0)}% acima da média - Movimento confirmado`,
          status: "confirmed",
        })
      } else if (volumeRatio < 0.7) {
        analyses.push({
          name: "Volume",
          description: `Volume ${(volumeRatio * 100).toFixed(0)}% da média - Baixa participação`,
          status: "warning",
        })
      } else {
        analyses.push({
          name: "Volume",
          description: `Volume dentro da média - Participação normal`,
          status: "neutral",
        })
      }

      let signalType = "NEUTRO"
      let confidence = 50
      let confidenceLevel = 3

      const totalConfluences = confluences.length

      if (callScore > putScore && totalConfluences >= 3) {
        signalType = "CALL"
        confidence = Math.min(50 + callScore, 95)
        confidenceLevel = totalConfluences >= 6 ? 5 : totalConfluences >= 5 ? 4 : 3
      } else if (putScore > callScore && totalConfluences >= 3) {
        signalType = "PUT"
        confidence = Math.min(50 + putScore, 95)
        confidenceLevel = totalConfluences >= 6 ? 5 : totalConfluences >= 5 ? 4 : 3
      } else {
        return {
          asset: selectedAsset.name,
          symbol: selectedAsset.symbol,
          probability: confidence,
          analyses: analyses,
          signalType: signalType,
          timestamp: new Date().toISOString(),
          confluences: totalConfluences,
          confidenceLevel: 0,
          hasSignal: false,
          missingConfluences: missingConfluences,
          detectedConfluences: confluences,
        }
      }

      return {
        asset: selectedAsset.name,
        symbol: selectedAsset.symbol,
        probability: confidence,
        analyses: analyses,
        signalType: signalType,
        timestamp: new Date().toISOString(),
        confluences: totalConfluences,
        confidenceLevel: confidenceLevel,
        hasSignal: true,
        detectedConfluences: confluences,
      }
    } catch (error) {
      console.error("Erro ao gerar sinal:", error)
      showToast("Erro ao conectar com Binance. Tente novamente.", "error")
      throw error
    }
  }

  async function handleGenerateSignal() {
    if (state.isLoading) return

    state.isLoading = true
    generateBtn.disabled = true
    loadingOverlay.classList.remove("hidden")

    let idx = 0
    loadingMessageEl.innerText = state.loadingMessages[idx]

    state.loadingInterval = setInterval(() => {
      idx = (idx + 1) % state.loadingMessages.length
      loadingMessageEl.innerText = state.loadingMessages[idx]
    }, 800)

    try {
      state.signalData = await generateRealSignal()

      setTimeout(() => {
        clearInterval(state.loadingInterval)
        state.isLoading = false
        generateBtn.disabled = false
        loadingOverlay.classList.add("hidden")

        if (state.signalData.hasSignal) {
          showSignalModal()
          showToast("Sinal gerado com sucesso!", "success")
        } else {
          showNoSignalModal()
          showToast("Nenhum sinal seguro encontrado", "warning")
        }
      }, 2500)
    } catch (error) {
      clearInterval(state.loadingInterval)
      state.isLoading = false
      generateBtn.disabled = false
      loadingOverlay.classList.add("hidden")
    }
  }

  function showSignalModal() {
    const { asset, signalType, confidenceLevel, analyses, confluences, timestamp } = state.signalData

    signalAssetEl.innerText = asset

    const stars = "⭐".repeat(confidenceLevel)
    signalConfidenceEl.innerHTML = `${stars} ${confidenceLevel}/5`

    confluenceCountEl.innerText = `${confluences}/7`

    signalTypeEl.innerText = signalType
    signalTypeEl.className = `signal-badge ${signalType.toLowerCase()}`

    signalTimestampEl.innerText = new Date(timestamp).toLocaleString("pt-BR")

    signalAnalysesEl.innerHTML = analyses
      .map(
        (a) => `
      <div class="analysis-item ${a.status}">
        <span class="analysis-icon">${a.status === "confirmed" ? "✓" : a.status === "neutral" ? "○" : a.status === "warning" ? "⚠" : "✕"}</span>
        <div>
          <strong>${a.name}</strong>
          <p>${a.description}</p>
        </div>
      </div>
    `,
      )
      .join("")

    signalModal.classList.remove("hidden")
  }

  function hideSignalModal() {
    signalModal.classList.add("hidden")
  }

  function showNoSignalModal() {
    const { confluences, analyses, missingConfluences } = state.signalData

    noSignalConfluencesEl.innerText = `${confluences}/7`

    noSignalAnalysesEl.innerHTML = analyses
      .map(
        (a) => `
      <div class="analysis-item ${a.status}">
        <span class="analysis-icon">${a.status === "confirmed" ? "✓" : a.status === "neutral" ? "○" : a.status === "warning" ? "⚠" : "✕"}</span>
        <div>
          <strong>${a.name}</strong>
          <p>${a.description}</p>
        </div>
      </div>
    `,
      )
      .join("")

    if (missingConfluences && missingConfluences.length > 0) {
      noSignalAnalysesEl.innerHTML += `
        <div style="margin-top:16px;padding:12px;background:rgba(245,158,11,0.1);border-radius:8px;border:1px solid rgba(245,158,11,0.3);">
          <h4 style="margin:0 0 8px 0;font-size:12px;color:var(--warning);">Motivos da rejeição:</h4>
          ${missingConfluences.map((reason) => `<p style="font-size:12px;color:var(--text-secondary);margin:4px 0;">• ${reason}</p>`).join("")}
        </div>
      `
    }

    noSignalModal.classList.remove("hidden")
  }

  function hideNoSignalModal() {
    noSignalModal.classList.add("hidden")
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()

if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html"
}
