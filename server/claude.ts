// Backward-compatible module name for older imports. New code should import
// from llm.ts because the backend may be Claude CLI or OpenAI-compatible.
export {
  askDJ,
  claudeCliAvailable as claudeAvailable,
  generateLLMText,
  llmAvailable,
  llmStatus,
  type DJOutput,
  type LLMStatus,
} from "./llm.js"
