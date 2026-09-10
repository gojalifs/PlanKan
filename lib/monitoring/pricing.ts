/**
 * Gemini Vision API pricing (USD per 1M tokens).
 * Built-in defaults are placeholders — override via env vars so pricing
 * can be corrected without redeploying.
 */

const DEFAULT_PRICE_PER_M: Record<string, { input: number; output: number }> = {
  "gemini-3.5-flash-lite": { input: 0.10, output: 0.40 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.30 },
  "gemini-2.0-flash":      { input: 0.10, output: 0.40 },
};

const FALLBACK = { input: 0.10, output: 0.40 };

function envOverride(): { input: number; output: number } | null {
  const inp = Number(process.env.GEMINI_PRICE_INPUT_PER_M);
  const out = Number(process.env.GEMINI_PRICE_OUTPUT_PER_M);
  if (inp > 0 && out > 0) return { input: inp, output: out };
  return null;
}

/**
 * Estimate USD cost for a Gemini generateContent call.
 * @param model  — e.g. "gemini-3.5-flash-lite"
 * @param prompt — prompt / input token count
 * @param output — candidate / output token count
 * @returns estimated cost in USD
 */
export function geminiCost(model: string, prompt: number, output: number): number {
  const env = envOverride();
  const price = env ?? DEFAULT_PRICE_PER_M[model] ?? FALLBACK;
  return (prompt / 1_000_000) * price.input + (output / 1_000_000) * price.output;
}

/**
 * Flat per-request fallback when token counts are unavailable
 * (e.g. transport error before response body is received).
 */
export function fallbackCostPerRequest(): number {
  return Number(process.env.GEMINI_EST_COST_PER_REQUEST ?? "0.0001");
}
