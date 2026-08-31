/*
=========================================================
BOT V1 MR — V3.8 ENTRY AUTHORIZATION ENGINE
Capa adicional sobre bot-engine.js existente.

OBJETIVO
- NO reemplaza el motor actual.
- NO altera calibraciones existentes.
- NO cambia PREPARAR/EJECUTAR.
- En AUTOMÁTICO, antes del BUY clasifica:
    AUTORIZADA
    APRENDER
    BLOQUEADA
- En MANUAL DIAGNÓSTICO no bloquea.
=========================================================
*/

import { botEngine } from "./bot-engine.js";

const V38_CONTROL = Object.freeze({
  version: "V3.8-ENTRY-AUTHORIZER-1",

  // Confianza mínima visible recibida desde Trading Analyzer.
  minConfidenceByStrategy: Object.freeze({
    rise_fall: 76,
    even_odd: 74,
    over_under: 76,
    match: 78,
    default: 76
  }),

  // Cantidad mínima de apoyos favorables además del patrón.
  minSupportsNormal: 2,
  minSupportsAfterOneLoss: 3,
  minSupportsAfterTwoLosses: 4,

  // Tras racha negativa exigimos más confianza.
  minConfidenceAfterOneLoss: 78,
  minConfidenceAfterTwoLosses: 82,

  // En AUTO, SIN_EVIDENCIA / NEUTRO = APRENDER, no BUY.
  blockLearningInAutomatic: true,

  // Riesgos detectados por cualquier puerta = bloqueo duro.
  hardBlockOnRisk: true,

  // Ventana usada solo para contar pérdidas consecutivas recientes.
  recentTelemetryLimit: 20
});

function normalizar(valor) {
  return String(valor ?? "").trim().toUpperCase();
}

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function llamarSeguro(nombre, ...args) {
  try {
    const fn = botEngine?.[nombre];
    if (typeof fn === "function") {
      return fn.apply(botEngine, args);
    }
  } catch (error) {
    console.warn(`V3.8 · ${nombre} omitido:`, error);
  }
  return null;
}

function obtenerModoManual() {
  try {
    if (typeof botEngine?.esModoManual === "function") {
      return botEngine.esModoManual() === true;
    }
  } catch {}
  return normalizar(botEngine?.modoEjecucion).includes("MANUAL");
}

function obtenerPreparada(senal) {
  try {
    const operacionId =
      senal?.operacionId ??
      senal?.metadata?.operacionId ??
      null;

    if (!operacionId || !(botEngine?.preparaciones instanceof Map)) {
      return null;
    }

    return botEngine.preparaciones.get(operacionId) ?? null;
  } catch {
    return null;
  }
}

function contarPerdidasConsecutivas() {
  const historial = Array.isArray(botEngine?.historialTelemetria)
    ? botEngine.historialTelemetria
    : [];

  const recientes = historial
    .slice(-V38_CONTROL.recentTelemetryLimit)
    .reverse();

  let perdidas = 0;

  for (const fila of recientes) {
    const resultado = normalizar(fila?.resultado);

    if (resultado === "PERDIDA") {
      perdidas += 1;
      continue;
    }

    if (resultado === "GANADA") {
      break;
    }
  }

  return perdidas;
}

function confianzaMinima(estrategia, perdidasConsecutivas) {
  const key = String(estrategia ?? "").trim().toLowerCase();

  let min =
    V38_CONTROL.minConfidenceByStrategy[key] ??
    V38_CONTROL.minConfidenceByStrategy.default;

  if (perdidasConsecutivas >= 2) {
    min = Math.max(min, V38_CONTROL.minConfidenceAfterTwoLosses);
  } else if (perdidasConsecutivas === 1) {
    min = Math.max(min, V38_CONTROL.minConfidenceAfterOneLoss);
  }

  return min;
}

function soportesRequeridos(perdidasConsecutivas) {
  if (perdidasConsecutivas >= 2) {
    return V38_CONTROL.minSupportsAfterTwoLosses;
  }
  if (perdidasConsecutivas === 1) {
    return V38_CONTROL.minSupportsAfterOneLoss;
  }
  return V38_CONTROL.minSupportsNormal;
}

function esFavorable(obj) {
  const clasificacion = normalizar(obj?.clasificacion);
  const decision = normalizar(obj?.decision);

  return (
    clasificacion.includes("FAVORABLE") ||
    clasificacion.includes("POSITIV") ||
    decision === "OPERAR" ||
    decision === "PERMITIR" ||
    obj?.apoyar === true
  );
}

function esRiesgo(obj) {
  const clasificacion = normalizar(obj?.clasificacion);
  const decision = normalizar(obj?.decision);

  return (
    obj?.bloquear === true ||
    clasificacion.includes("RIESGO") ||
    clasificacion.includes("DESFAVORABLE") ||
    decision === "NO_OPERAR" ||
    decision === "BLOQUEAR"
  );
}

function analizarEntradaV38(senal) {
  const preparada = obtenerPreparada(senal);

  const patron =
    preparada?.analisisPatron ??
    llamarSeguro("analizarPatron", senal);

  const movimientoParidad =
    preparada?.analisisMovimientoParidad ??
    llamarSeguro("analizarMovimientoParidad", senal);

  const timing =
    preparada?.analisisTimingBuy ??
    llamarSeguro("analizarTimingBuyDecision", senal);

  const oportunidadHistorica =
    preparada?.analisisOportunidadHistorica ??
    llamarSeguro("analizarOportunidadHistorica", senal);

  const regimen =
    preparada?.analisisRegimenRacha ??
    llamarSeguro("analizarRegimenRacha", senal) ??
    botEngine?.ultimoAnalisisRegimenRacha ??
    null;

  const confianza =
    numero(
      senal?.confianza ??
      senal?.visibleScore ??
      senal?.metadata?.visibleScore
    );

  const perdidasConsecutivas =
    contarPerdidasConsecutivas();

  const minConfianza =
    confianzaMinima(
      senal?.estrategia,
      perdidasConsecutivas
    );

  const minSoportes =
    soportesRequeridos(
      perdidasConsecutivas
    );

  const patronFavorable =
    esFavorable(patron);

  const patronRiesgo =
    esRiesgo(patron);

  const puertas = [
    ["PATRON", patron],
    ["MOVIMIENTO_PARIDAD", movimientoParidad],
    ["TIMING", timing],
    ["OPORTUNIDAD_HISTORICA", oportunidadHistorica],
    ["REGIMEN", regimen]
  ];

  const riesgos = [];
  const apoyos = [];

  for (const [nombre, valor] of puertas) {
    if (!valor) continue;

    if (esRiesgo(valor)) {
      riesgos.push(nombre);
    } else if (esFavorable(valor)) {
      apoyos.push(nombre);
    }
  }

  // La confianza es un apoyo adicional, pero nunca sustituye
  // la evidencia histórica del patrón.
  const confianzaValida =
    confianza !== null &&
    confianza >= minConfianza;

  if (confianzaValida) {
    apoyos.push("CONFIANZA");
  }

  const evidenciaPatron =
    patronFavorable === true;

  let estado = "APRENDER";
  let decision = "NO_OPERAR";
  let bloquear = true;
  let motivo =
    "La señal todavía no tiene evidencia suficiente para autorizar BUY automático.";

  if (
    V38_CONTROL.hardBlockOnRisk &&
    riesgos.length > 0
  ) {
    estado = "BLOQUEADA";
    decision = "NO_OPERAR";
    bloquear = true;
    motivo =
      `Contradicción o riesgo detectado en: ${riesgos.join(", ")}.`;
  }
  else if (
    evidenciaPatron &&
    confianzaValida &&
    apoyos.length >= minSoportes
  ) {
    estado = "AUTORIZADA";
    decision = "OPERAR";
    bloquear = false;
    motivo =
      "Patrón favorable, confianza suficiente y confirmaciones compatibles.";
  }
  else if (
    !evidenciaPatron
  ) {
    estado = "APRENDER";
    decision = "NO_OPERAR";
    bloquear = V38_CONTROL.blockLearningInAutomatic;
    motivo =
      "Patrón sin evidencia favorable suficiente: se conserva como APRENDER.";
  }
  else {
    estado = "BLOQUEADA";
    decision = "NO_OPERAR";
    bloquear = true;
    motivo =
      "Existe patrón favorable, pero faltan confirmaciones o confianza para autorizar BUY.";
  }

  return {
    version: V38_CONTROL.version,
    timestamp: Date.now(),
    estado,
    decision,
    bloquear,
    motivo,

    mercado: senal?.mercado ?? null,
    estrategia: senal?.estrategia ?? null,
    direccion: senal?.direccion ?? null,

    confianza,
    minConfianza,
    confianzaValida,

    perdidasConsecutivas,
    minSoportes,
    soportesFavorables: apoyos.length,
    apoyos,
    riesgos,

    patronFavorable,
    patronRiesgo,

    patron: patron ?? null,
    movimientoParidad: movimientoParidad ?? null,
    timing: timing ?? null,
    oportunidadHistorica: oportunidadHistorica ?? null,
    regimen: regimen ?? null
  };
}

function emitirAutorizacion(resultado) {
  try {
    window.dispatchEvent(
      new CustomEvent(
        "bot:entry-authorization",
        { detail: resultado }
      )
    );
  } catch {}
}

function instalarPanelVisual() {
  if (typeof document === "undefined") return;
  if (document.getElementById("v38EntryAuthorization")) return;

  const panel = document.createElement("section");
  panel.id = "v38EntryAuthorization";
  panel.setAttribute("aria-live", "polite");
  panel.style.cssText = [
    "margin:14px 0",
    "padding:14px 16px",
    "border:1px solid #34556a",
    "border-radius:16px",
    "background:#091a24",
    "font-family:inherit"
  ].join(";");

  panel.innerHTML = `
    <div style="font-size:.72rem;letter-spacing:.09em;font-weight:900;opacity:.75">
      V3.8 · AUTORIZADOR DE ENTRADA
    </div>
    <div id="v38AuthState" style="font-size:1.2rem;font-weight:1000;margin-top:7px">
      EN ESPERA
    </div>
    <div id="v38AuthDetail" style="font-size:.82rem;opacity:.82;margin-top:5px">
      Esperando una señal EJECUTAR.
    </div>
  `;

  const destino =
    document.querySelector("main") ??
    document.body;

  destino?.appendChild(panel);

  window.addEventListener(
    "bot:entry-authorization",
    (evento) => {
      const datos = evento.detail ?? {};
      const state =
        document.getElementById("v38AuthState");
      const detail =
        document.getElementById("v38AuthDetail");

      if (state) {
        state.textContent =
          datos.estado ?? "EN ESPERA";
      }

      if (detail) {
        const conf =
          datos.confianza == null
            ? "--"
            : `${datos.confianza}%`;

        detail.textContent =
          `${datos.motivo ?? ""} · Confianza ${conf} · ` +
          `Apoyos ${datos.soportesFavorables ?? 0}/${datos.minSoportes ?? 0}`;
      }
    }
  );
}

function instalarV38() {
  if (!botEngine || typeof botEngine.procesarEjecucion !== "function") {
    console.error(
      "V3.8 · No se encontró botEngine.procesarEjecucion."
    );
    return false;
  }

  if (botEngine.__v38EntryAuthorizerInstalled === true) {
    return true;
  }

  const procesarEjecucionOriginal =
    botEngine.procesarEjecucion.bind(botEngine);

  botEngine.procesarEjecucion =
    async function procesarEjecucionV38(
      senal,
      opciones = {}
    ) {
      // Manual conserva comportamiento original.
      if (obtenerModoManual()) {
        return procesarEjecucionOriginal(
          senal,
          opciones
        );
      }

      const diagnostico =
        analizarEntradaV38(senal);

      botEngine.ultimoAnalisisAutorizacionV38 = {
        ...diagnostico
      };

      emitirAutorizacion(diagnostico);

      if (diagnostico.bloquear === true) {
        const operacionId =
          senal?.operacionId ??
          senal?.metadata?.operacionId ??
          null;

        const preparada =
          obtenerPreparada(senal);

        if (preparada?.telemetria) {
          preparada.telemetria.autorizadorV38 =
            diagnostico.estado;
          preparada.telemetria.autorizadorV38Decision =
            diagnostico.decision;
          preparada.telemetria.autorizadorV38Motivo =
            diagnostico.motivo;
          preparada.telemetria.resultado =
            diagnostico.estado === "APRENDER"
              ? "NO_OPERAR_V38_APRENDER"
              : "NO_OPERAR_V38_BLOQUEADA";

          llamarSeguro(
            "guardarTelemetria",
            preparada.telemetria
          );
        }

        llamarSeguro(
          "limpiarCicloOperacion",
          operacionId,
          preparada?.telemetria?.resultado ??
            "NO_OPERAR_V38"
        );

        return {
          aceptada: true,
          fase: "EJECUTAR",
          estado: diagnostico.estado,
          bloqueada: true,
          motivo: diagnostico.motivo,
          operacionId,
          mercado: senal?.mercado ?? null,
          estrategia: senal?.estrategia ?? null,
          direccion: senal?.direccion ?? null,
          confianza: senal?.confianza ?? null,
          autorizacionV38: diagnostico,
          compraDemo: null,
          resultadoDemo: null,
          telemetria:
            preparada?.telemetria
              ? { ...preparada.telemetria }
              : null
        };
      }

      // AUTORIZADA: pasa al motor estable existente.
      const resultado =
        await procesarEjecucionOriginal(
          senal,
          opciones
        );

      if (resultado && typeof resultado === "object") {
        resultado.autorizacionV38 =
          diagnostico;
      }

      return resultado;
    };

  // Exponemos diagnóstico sin reemplazar obtenerEstado original.
  const obtenerEstadoOriginal =
    typeof botEngine.obtenerEstadoRapido === "function"
      ? botEngine.obtenerEstadoRapido.bind(botEngine)
      : null;

  if (obtenerEstadoOriginal) {
    botEngine.obtenerEstadoRapido =
      function obtenerEstadoRapidoV38() {
        const estado =
          obtenerEstadoOriginal() ?? {};

        return {
          ...estado,
          versionAutorizador:
            V38_CONTROL.version,
          ultimoAnalisisAutorizacionV38:
            botEngine.ultimoAnalisisAutorizacionV38 ??
            null
        };
      };
  }

  botEngine.__v38EntryAuthorizerInstalled = true;

  instalarPanelVisual();

  console.log(
    "✅ BOT V3.8 ENTRY AUTHORIZATION ENGINE instalado.",
    V38_CONTROL
  );

  return true;
}

instalarV38();

export {
  V38_CONTROL,
  analizarEntradaV38,
  instalarV38
};
