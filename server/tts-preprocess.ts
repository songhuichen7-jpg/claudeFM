// Text preprocessor for Claudio's TTS pipeline.
// Goal: Chinese/English mixed DJ commentary that reads like a young woman
// whispering close to your ear — natural breath, English names "bracketed"
// with soft pauses, long sentences segmented, transitions marked.
//
// Style modes:
//   - "natural" — em-dashes / commas only. Works on every TTS engine.
//   - "ssml"    — <break time=".."/> markers. For engines that parse SSML.
//   - "mimo"    — MiMo's native audio tags ([吸气]/[气声]/[轻笑]) injected at
//                 natural breath points. Maps Claudio's "e-girl breathy" feel.

type Style = "natural" | "ssml" | "mimo"

const ZH = /[一-鿿]/
const DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const

export function preprocessForTts(input: string, style: Style = "natural"): string {
  let t = input
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/　/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim()

  // 1. Spoken numbers — done BEFORE boundary spacing so the digits-CJK
  //    boundary disappears with the digit itself, no stray space left behind.
  t = t.replace(/(\d{4})\s*年/g, (_m, y: string) => `${readYear(y)}年`)
  t = t.replace(/(\d{1,3})\s*(首|分钟|秒|岁|遍|轨)/g,
    (_m, n: string, q: string) => `${readSmallNum(+n)}${q}`)

  // 2. Hard space at every CJK↔Latin boundary — the engine mis-pronounces
  //    English as pinyin without this.
  t = t
    .replace(/([一-鿿])([A-Za-z0-9])/g, "$1 $2")
    .replace(/([A-Za-z0-9])([一-鿿])/g, "$1 $2")

  // 3. CJK-English-CJK sandwich → bracket the English token with breath commas.
  //    Only tokens ≥ 6 chars qualify ("Coldplay" / "Radiohead" / "honestly").
  //    Short tokens (Yellow / OK / FM / DJ / Mia / song) stay fluid — bracketing
  //    them every time makes the TTS stagger instead of speak.
  t = t.replace(
    /([一-鿿])\s+([A-Za-z][A-Za-z0-9 '’\-]{5,}?)\s+([一-鿿])/g,
    (_m, a: string, eng: string, b: string) => `${a}，${eng.trim()}，${b}`,
  )

  // 4. Em-dash on transitions — the radio "breath + lean in" signal.
  t = t.replace(/。\s*(但|然而|不过|可是)/g, "——$1")
  t = t.replace(/，\s*(对吧|你说呢|对不对)/g, "——$1")

  // 5. Break clauses longer than ~28 CJK chars at hinge words.
  t = breakLongClauses(t, 28)

  // 6. Collapse duplicate punctuation produced by the steps above.
  t = t.replace(/，{2,}/g, "，").replace(/。{2,}/g, "。")

  if (style === "ssml") {
    return `<speak>${t
      .replace(/——/g, '<break time="350ms"/>')
      .replace(/。/g, '。<break time="500ms"/>')
      .replace(/，/g, '，<break time="180ms"/>')}</speak>`
  }

  if (style === "mimo") {
    // MiMo's "voice quality" is controlled by the style instruction in
    // messages[0], NOT by sprinkling tags everywhere. Over-tagging makes the
    // engine perform every breath instead of just speaking softly.
    //
    // So this branch deliberately injects almost nothing — em-dashes stay as
    // em-dashes (MiMo handles them as natural pauses), no [气声] prefix.
    // Tags only appear when the input text itself contains them (e.g. the
    // assistant explicitly wrote "[轻笑]那这首" for a beat-level cue).
    return t
  }
  return t
}

const HINGE_WORDS = ["然后", "接着", "而且", "不过", "可是", "但是", "所以", "于是"]
const HINGE_CHARS = /[的和而但却]/

function breakLongClauses(text: string, maxLen: number): string {
  const forceMax = Math.floor(maxLen * 1.5)
  return text
    .split(/(?<=[。！？])/)
    .map(seg => {
      const cjk = (seg.match(/[一-鿿]/g) ?? []).length
      if (cjk <= maxLen) return seg
      let zhSince = 0
      let out = ""
      for (let i = 0; i < seg.length; i++) {
        const ch = seg[i]
        out += ch
        if (ZH.test(ch)) zhSince++
        const next = seg[i + 1] ?? ""
        if (!/[一-鿿]/.test(next)) continue

        const hingeWord = HINGE_WORDS.find(w => seg.startsWith(w, i + 1))
        const hingeChar = HINGE_CHARS.test(ch)
        const reached = zhSince >= maxLen
        const forced = zhSince >= forceMax

        if ((reached && (hingeWord || hingeChar)) || forced) {
          if (!/[，。！？；——]$/.test(out)) out += "，"
          zhSince = 0
        }
      }
      return out
    })
    .join("")
}

function readSmallNum(n: number): string {
  if (n < 10) return DIGITS[n]
  if (n < 20) return n === 10 ? "十" : `十${DIGITS[n - 10]}`
  if (n < 100) {
    const t = Math.floor(n / 10)
    const o = n % 10
    return `${DIGITS[t]}十${o ? DIGITS[o] : ""}`
  }
  return String(n)
}

function readYear(y: string): string {
  return y.split("").map(d => DIGITS[+d]).join("")
}
