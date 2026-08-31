/*
BOT — EXECUTION SYNC V3.8.2
El BOT usa EXCLUSIVAMENTE targetExecutionAt recibido del Analyzer.
EVEN y ODD conservan calibración independiente.
*/
export const EXECUTION_SYNC_V382 = Object.freeze({
  protocol: "SYNC-V3.8.2",
  defaults: Object.freeze({
    EVEN: -300,
    ODD: 300
  }),
  minMs: -500,
  maxMs: 1000
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

export function getDirectionalExecutionAt(signal, calibration = {}) {
  const target = Number(
    signal?.targetExecutionAt ??
    signal?.metadata?.targetExecutionAt
  );

  if (!Number.isFinite(target)) {
    throw new Error("SYNC V3.8.2: targetExecutionAt inválido.");
  }

  const direction = String(signal?.direccion || "").trim().toUpperCase();
  const fallback = EXECUTION_SYNC_V382.defaults[direction] ?? 0;
  const configured = Number(calibration?.[direction]);

  const offsetMs = clamp(
    Number.isFinite(configured) ? configured : fallback,
    EXECUTION_SYNC_V382.minMs,
    EXECUTION_SYNC_V382.maxMs
  );

  return {
    direction,
    sharedTargetAt: target,
    offsetMs,
    buyAt: target + offsetMs
  };
}

export async function waitUntilEpoch(epochMs) {
  const target = Number(epochMs);
  if (!Number.isFinite(target)) return;

  while (true) {
    const remaining = target - Date.now();
    if (remaining <= 0) return;

    // Espera gruesa primero y fina al acercarse al BUY.
    if (remaining > 80) {
      await new Promise(r => setTimeout(r, Math.max(1, remaining - 50)));
    } else {
      await new Promise(r => setTimeout(r, Math.min(10, Math.max(1, remaining))));
    }
  }
}
