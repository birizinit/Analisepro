// Lightweight implementation of RSI, MACD, EMA, and SMA calculations

class TechnicalIndicators {
  // Calculate Simple Moving Average
  static SMA(data, period) {
    const result = []
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / period)
    }
    return result
  }

  // Calculate Exponential Moving Average
  static EMA(data, period) {
    const k = 2 / (period + 1)
    const result = [data[0]]
    for (let i = 1; i < data.length; i++) {
      result.push(data[i] * k + result[i - 1] * (1 - k))
    }
    return result
  }

  // Calculate RSI (Relative Strength Index)
  static RSI(data, period = 14) {
    const changes = []
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1])
    }

    const gains = changes.map((c) => (c > 0 ? c : 0))
    const losses = changes.map((c) => (c < 0 ? Math.abs(c) : 0))

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

    const rsiValues = []

    for (let i = period; i < changes.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      const rsi = 100 - 100 / (1 + rs)
      rsiValues.push(rsi)
    }

    return rsiValues[rsiValues.length - 1] || 50
  }

  // Calculate MACD (Moving Average Convergence Divergence)
  static MACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const emaFast = this.EMA(data, fastPeriod)
    const emaSlow = this.EMA(data, slowPeriod)

    const macdLine = []
    const startIndex = slowPeriod - fastPeriod

    for (let i = 0; i < emaSlow.length; i++) {
      macdLine.push(emaFast[i + startIndex] - emaSlow[i])
    }

    const signalLine = this.EMA(macdLine, signalPeriod)
    const histogram = []

    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i + macdLine.length - signalLine.length] - signalLine[i])
    }

    return {
      macd: macdLine[macdLine.length - 1] || 0,
      signal: signalLine[signalLine.length - 1] || 0,
      histogram: histogram[histogram.length - 1] || 0,
    }
  }

  // Calculate Bollinger Bands
  static BollingerBands(data, period = 20, stdDev = 2) {
    const sma = this.SMA(data, period)
    const lastSMA = sma[sma.length - 1]

    const slice = data.slice(-period)
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - lastSMA, 2), 0) / period
    const std = Math.sqrt(variance)

    return {
      upper: lastSMA + std * stdDev,
      middle: lastSMA,
      lower: lastSMA - std * stdDev,
      current: data[data.length - 1],
    }
  }

  static FibonacciLevels(data) {
    // Find highest and lowest points in the dataset
    const high = Math.max(...data)
    const low = Math.min(...data)
    const diff = high - low

    return {
      level_0: high,
      level_236: high - diff * 0.236,
      level_382: high - diff * 0.382,
      level_500: high - diff * 0.5,
      level_618: high - diff * 0.618,
      level_786: high - diff * 0.786,
      level_100: low,
      current: data[data.length - 1],
      high: high,
      low: low,
    }
  }

  static findSupportResistance(data, threshold = 0.02) {
    const levels = []

    // Find local highs and lows
    for (let i = 2; i < data.length - 2; i++) {
      // Local high
      if (data[i] > data[i - 1] && data[i] > data[i - 2] && data[i] > data[i + 1] && data[i] > data[i + 2]) {
        levels.push({ price: data[i], type: "resistance", strength: 1 })
      }
      // Local low
      if (data[i] < data[i - 1] && data[i] < data[i - 2] && data[i] < data[i + 1] && data[i] < data[i + 2]) {
        levels.push({ price: data[i], type: "support", strength: 1 })
      }
    }

    // Cluster nearby levels
    const clustered = []
    for (const level of levels) {
      const existing = clustered.find(
        (l) => Math.abs(l.price - level.price) / level.price < threshold && l.type === level.type,
      )
      if (existing) {
        existing.strength++
        existing.price = (existing.price + level.price) / 2
      } else {
        clustered.push({ ...level })
      }
    }

    // Sort by strength
    return clustered.sort((a, b) => b.strength - a.strength)
  }

  static detectPriceAction(klines) {
    const len = klines.length
    if (len < 3) return { pattern: "insufficient_data", signal: "NEUTRO" }

    const last = klines[len - 1]
    const prev = klines[len - 2]
    const prev2 = klines[len - 3]

    // Bullish patterns
    const bullishEngulfing =
      prev.close < prev.open && last.close > last.open && last.close > prev.open && last.open < prev.close

    const hammer =
      last.high - last.close < (last.close - last.open) * 0.3 &&
      last.close - last.low > (last.close - last.open) * 2 &&
      last.close > last.open

    const morningStart =
      prev2.close < prev2.open && prev.open < prev.close && last.close > last.open && last.close > prev2.open

    // Bearish patterns
    const bearishEngulfing =
      prev.close > prev.open && last.close < last.open && last.close < prev.open && last.open > prev.close

    const shootingStar =
      last.close - last.low < (last.open - last.close) * 0.3 &&
      last.high - last.close > (last.open - last.close) * 2 &&
      last.close < last.open

    const eveningStar =
      prev2.close > prev2.open && prev.close < prev.open && last.close < last.open && last.close < prev2.close

    if (bullishEngulfing) return { pattern: "Bullish Engulfing", signal: "CALL", strength: "strong" }
    if (hammer) return { pattern: "Hammer", signal: "CALL", strength: "moderate" }
    if (morningStart) return { pattern: "Morning Star", signal: "CALL", strength: "strong" }
    if (bearishEngulfing) return { pattern: "Bearish Engulfing", signal: "PUT", strength: "strong" }
    if (shootingStar) return { pattern: "Shooting Star", signal: "PUT", strength: "moderate" }
    if (eveningStar) return { pattern: "Evening Star", signal: "PUT", strength: "strong" }

    return { pattern: "No clear pattern", signal: "NEUTRO", strength: "none" }
  }
}

window.TechnicalIndicators = TechnicalIndicators
