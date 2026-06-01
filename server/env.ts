// Load .env into process.env BEFORE modules that read env at import time.
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"

const candidates = [
  process.env.CLAUDIO_ENV_FILE,
  process.env.CLAUDIO_DATA_ROOT ? join(process.env.CLAUDIO_DATA_ROOT, ".env") : undefined,
  process.env.CLAUDIO_APP_ROOT ? join(process.env.CLAUDIO_APP_ROOT, ".env") : undefined,
  ".env",
].filter(Boolean) as string[]

for (const file of candidates) {
  try {
    const resolved = resolve(file)
    if (existsSync(resolved)) process.loadEnvFile(resolved)
  } catch {
    /* missing or unreadable env files are fine; fallbacks handle it */
  }
}
