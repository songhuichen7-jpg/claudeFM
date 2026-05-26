// Open-Meteo is free, key-less, CORS-friendly. We use it for the "环境注入"
// fragment of the context window.

const LAT = Number(process.env.CLAUDIO_LAT ?? "31.2304") // Shanghai default
const LON = Number(process.env.CLAUDIO_LON ?? "121.4737")

export type WeatherSnap = {
  tempC: number
  feelsC: number
  rain: boolean
  condition: string
  isDay: boolean
  fetchedAt: number
}

let cache: WeatherSnap | null = null

const CODE_NAMES: Record<number, string> = {
  0: "clear",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "fog",
  51: "drizzle",
  53: "drizzle",
  55: "drizzle",
  61: "rain",
  63: "rain",
  65: "heavy rain",
  71: "snow",
  73: "snow",
  75: "snow",
  80: "rain showers",
  81: "rain showers",
  82: "rain showers",
  95: "thunderstorm",
  96: "thunderstorm",
  99: "thunderstorm",
}

export async function getWeather(): Promise<WeatherSnap | null> {
  if (cache && Date.now() - cache.fetchedAt < 15 * 60_000) return cache
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,is_day,weather_code,precipitation`
    const res = await fetch(url)
    if (!res.ok) return cache
    const j: any = await res.json()
    const c = j.current
    const code = Number(c.weather_code ?? 0)
    cache = {
      tempC: Number(c.temperature_2m),
      feelsC: Number(c.apparent_temperature),
      rain: Number(c.precipitation ?? 0) > 0 || (code >= 51 && code <= 82),
      condition: CODE_NAMES[code] ?? "unknown",
      isDay: c.is_day === 1,
      fetchedAt: Date.now(),
    }
    return cache
  } catch (err) {
    console.warn("[weather] fetch failed", (err as Error).message)
    return cache
  }
}
