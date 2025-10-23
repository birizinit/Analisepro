class BinanceAPI {
  static BASE_URL = "https://api.binance.com/api/v3"

  // Fetch candlestick data (klines)
  static async getKlines(symbol, interval = "1h", limit = 100) {
    try {
      const url = `${this.BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`)
      }

      const data = await response.json()

      // Parse klines: [openTime, open, high, low, close, volume, ...]
      return data.map((k) => ({
        time: k[0],
        open: Number.parseFloat(k[1]),
        high: Number.parseFloat(k[2]),
        low: Number.parseFloat(k[3]),
        close: Number.parseFloat(k[4]),
        volume: Number.parseFloat(k[5]),
      }))
    } catch (error) {
      console.error("[v0] Binance API error:", error)
      throw error
    }
  }

  // Get current price
  static async getCurrentPrice(symbol) {
    try {
      const url = `${this.BASE_URL}/ticker/price?symbol=${symbol}`
      const response = await fetch(url)
      const data = await response.json()
      return Number.parseFloat(data.price)
    } catch (error) {
      console.error("[v0] Error fetching price:", error)
      throw error
    }
  }

  // Get 24h volume
  static async get24hVolume(symbol) {
    try {
      const url = `${this.BASE_URL}/ticker/24hr?symbol=${symbol}`
      const response = await fetch(url)
      const data = await response.json()
      return {
        volume: Number.parseFloat(data.volume),
        quoteVolume: Number.parseFloat(data.quoteVolume),
        priceChange: Number.parseFloat(data.priceChangePercent),
      }
    } catch (error) {
      console.error("[v0] Error fetching volume:", error)
      throw error
    }
  }
}

window.BinanceAPI = BinanceAPI
