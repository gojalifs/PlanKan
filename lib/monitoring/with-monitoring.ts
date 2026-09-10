import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function enabled(): boolean {
  return process.env.MONITORING_ENABLED !== "false";
}

async function recordApiLog(opts: {
  method: string;
  route: string;
  status: number;
  durationMs: number;
  error?: string | null;
}) {
  try {
    await prisma.apiLog.create({
      data: {
        method: opts.method,
        route: opts.route,
        status: opts.status,
        durationMs: opts.durationMs,
        error: opts.error ?? null,
      },
    });
  } catch {
    // fire-and-forget — never block the response
  }
}

/**
 * Higher-order wrapper for Next.js route handlers.
 * Logs one `ApiLog` row per request (best-effort, non-blocking).
 *
 * Usage:
 *   async function GETHandler(req: Request) { ... }
 *   export const GET = withMonitoring("wallets", GETHandler);
 */
export function withMonitoring<
  Args extends unknown[],
  T extends NextResponse,
>(
  route: string,
  handler: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T> {
  return async (...args: Args) => {
    const start = performance.now();
    let response: T;
    let status = 500;
    let errorMsg: string | null = null;

    try {
      response = await handler(...args);
      status = response.status;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      status = 500;
      errorMsg = msg;
      response = NextResponse.json(
        { error: msg || "Internal Server Error" },
        { status: 500 }
      ) as T;
    }

    const durationMs = performance.now() - start;

    // Fire-and-forget — never add latency to the response.
    if (enabled()) {
      recordApiLog({
        method: extractMethod(args),
        route,
        status,
        durationMs,
        error: errorMsg,
      }).catch(() => {});
    }

    return response;
  };
}

function extractMethod(args: unknown[]): string {
  const req = args[0];
  if (req && typeof req === "object" && "method" in req) {
    return String((req as { method: string }).method);
  }
  return "GET";
}
