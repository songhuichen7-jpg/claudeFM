import { existsSync, mkdirSync, cpSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

export const APP_ROOT = resolve(process.env.CLAUDIO_APP_ROOT ?? resolve(__dirname, ".."))
export const DATA_ROOT = resolve(process.env.CLAUDIO_DATA_ROOT ?? APP_ROOT)
export const DIST_DIR = resolve(process.env.CLAUDIO_DIST_DIR ?? join(APP_ROOT, "dist"))

export function appPath(...parts: string[]): string {
  return join(APP_ROOT, ...parts)
}

export function dataPath(...parts: string[]): string {
  return join(DATA_ROOT, ...parts)
}

export function ensureDataDir(...parts: string[]): string {
  const dir = dataPath(...parts)
  mkdirSync(dir, { recursive: true })
  return dir
}

export function ensureSeededDataDir(relativeDir: string): string {
  const dest = dataPath(relativeDir)
  if (!existsSync(dest)) {
    const seed = appPath(relativeDir)
    if (existsSync(seed)) {
      cpSync(seed, dest, { recursive: true })
    } else {
      mkdirSync(dest, { recursive: true })
    }
  }
  return dest
}
