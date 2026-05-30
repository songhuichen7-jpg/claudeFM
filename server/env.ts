// Load .env into process.env BEFORE any module that reads env at import time
// (e.g. tts.ts reads MIMO_API_KEY at module top-level). This file must be the
// very first import in server/index.ts. No dependency — uses Node's built-in
// loader (Node ≥ 20.12). Missing .env is fine; fallbacks apply.
try {
  process.loadEnvFile()
} catch {
  /* no .env present — silent/anonymous fallbacks handle it */
}
