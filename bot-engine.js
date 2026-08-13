/* ==========================================
   BOT V1 MR
   BOT ENGINE
   FIX13.2 - ANALIZADOR DE PERFIL DE SEÑAL

   CONSERVA:
   - FIX12 TIMING LIMPIO
   - FIX13 PERFIL DE SEÑAL
   - FIX13.1 BRIDGE -> PROCESO CORREGIDO
   - TARGET REAL
   - DERIV DEMO
   - COTIZACIÓN ANTES DEL BUY
   - CALIBRACIÓN POR MERCADO
   - HISTORIAL FIX8/FIX9/FIX10/FIX11/FIX12/FIX13/FIX13.1
   - ESTADÍSTICAS GANADAS / PERDIDAS
   - 12 MERCADOS
   - COMPARADORES DE TIMING

   FIX13.2 AGREGA:
   - COMPARACIÓN GANADAS VS PERDIDAS
   - CONFIANZA
   - RSI
   - TENDENCIA
   - MOMENTUM
   - VOLATILIDAD
   - DIRECCIÓN
   - ÚLTIMO DÍGITO
   - PARIDAD DEL ÚLTIMO DÍGITO
   - ZONAS DE RSI
   - ZONAS DE CONFIANZA
   - HALLAZGOS EXPLORATORIOS
   - PATRONES FAVORABLES
   - PATRONES DE RIESGO

   IMPimport {
  APP_VERSION,
  ENGINE,
  MARKETS,
  STRATEGIES
} from "./config.js";

import { diagnostics } from "./diagnostics.js";
import { derivAPI } from "./deriv-api.js";
import { marketBuffer } from "./market-buffer.js";
import { latencyMonitor } from "./latency-monitor.js";
import { buildSnapshot } from "./indicators.js";
import { exploreOpportunity } from "./engine1.js";
import { validateOpportunity } from "./engine2.js";
import { buildConsensus } from "./consensus.js";
import { evaluateTiming } from "./timing.js";
import { applyQualityFilter } from "./quality-filter.js";
import { statistics } from "./statistics.js";
import { memoryManager } from "./memory-manager.js";
import { voiceAssistant } from "./voice.js";
import {
  visualDirection,
  briefExplanation
} from "./prediction.js";
import { executionCalibrator } from "./execution-calibrator.js";
import { i18n } from "./i18n.js";
import { marketRegistry } from "./market-registry.js";


const $ = (id) =>
  document.getElementById(id);


const UI = {};

[
  "connectionStatus",
  "engineStatus",
  "memoryStatus",
  "latencyStatus",
  "marketSelect",
  "strategySelect",
  "modeSelect",
  "connectButton",
  "disconnectButton",
  "engineButton",
  "predictionButton",
  "controlMessage",
  "marketName",
  "price",
  "tickCount",
  "lastDigit",
  "updateTime",
  "digits",
  "trend",
  "rsi",
  "momentum",
  "volatility",
  "engineStage",
  "engineDetail",
  "engineProgress",
  "signalCard",
  "signalState",
  "signalTitle",
  "signalValue",
  "signalScore",
  "signalBar",
  "signalReasons",
  "countdown",
  "floatingSignal",
  "floatingState",
  "floatingValue",
  "floatingDetail",
  "voiceButton",
  "voiceSelect",
  "voiceRate",
  "voiceRateValue",
  "voiceTest",
  "diagnosticButton",
  "diagnosticPanel",
  "diagnosticContent",
  "copyDiagnostic",
  "clearDiagnostic",
  "activityLog",
  "clearLog",
  "statsTests",
  "statsSuccess",
  "statsFailed",
  "statsAccuracy",
  "resetStats",
  "calibrationStatus",
  "calibrationSummary",
  "executedSecond",
  "manualResult",
  "saveCalibration",
  "resetCalibration",
  "calibrationTable",
  "languageSelect",
  "tickerMarketName",
  "tickerConnection",
  "tickerPrice",
  "tickerLastDigit",
  "tickerDigits",
  "tickerEven",
  "tickerOdd",
  "tickerRises",
  "tickerFalls",
  "refreshMarkets",
  "manualMarketSymbol",
  "manualMarketName",
  "manualMarketOneSecond",
  "addManualMarket",
  "marketRegistryMessage",
  "entryAlertEnabled",
  "entryAlertSecond",
  "entryAlertDelay",
  "entryFlash",
  "appUpdateStatus"
].forEach((id) => {
  UI[id] = $(id);
});


const state = {
  connected: false,
  engineOn: false,
  predictionActive: false,
  cooldown: false,
  symbol: "1HZ100V",
  strategy: "rise_fall",
  mode: "fast",
  snapshot: null,
  lastOpportunity: null,
  latency: latencyMonitor.current,
  countdownTimer: null,
  cooldownTimer: null,
  lastPredictionResult: null
};


/* ==========================================
   FIX13.3
   SINCRONIZACIÓN VISUAL + BOT

   OBJETIVO:

   1. SEÑAL CONFIRMADA
   2. TARGET SE CREA INMEDIATAMENTE
   3. SE ENVÍA AL BOT INMEDIATAMENTE
   4. LA VOZ YA NO BLOQUEA EL TARGET
   5. AL LLEGAR AL TARGET COMIENZA EL 10
   6. BOT Y CONTADOR COMPARTEN EL MISMO TARGET
   ========================================== */

const BOT_PREAVISO_SEGUNDOS =
  2.0;

const BOT_PREAVISO_MS =
  BOT_PREAVISO_SEGUNDOS *
  1000;


/* ==========================================
   UTILIDADES
   ========================================== */

function setText(
  element,
  value
) {

  if (
    element
  ) {

    element.textContent =
      String(
        value
      );

  }

}


function log(
  message,
  level = ""
) {

  if (
    !UI.activityLog
  ) {

    return;

  }


  const line =
    document.createElement(
      "p"
    );


  line.textContent =
    `[${new Date().toLocaleTimeString("es-SV")}] ${message}`;


  line.className =
    level;


  UI.activityLog.prepend(
    line
  );


  while (
    UI.activityLog.children.length >
    ENGINE.maxLogLines
  ) {

    UI.activityLog
      .lastElementChild
      ?.remove();

  }

}


function statsKey() {

  return [
    state.symbol,
    state.strategy,
    state.mode
  ].join("|");

}


function renderStats() {

  const value =
    statistics.get(
      statsKey()
    );


  const accuracy =
    value.tests
      ? (
          value.success /
          value.tests
        ) * 100
      : null;


  setText(
    UI.statsTests,
    value.tests
  );


  setText(
    UI.statsSuccess,
    value.success
  );


  setText(
    UI.statsFailed,
    value.failed
  );


  setText(
    UI.statsAccuracy,
    accuracy ===
      null
      ? "NO DATA"
      : `${accuracy.toFixed(1)}%`
  );

}


function minimumTicks() {

  if (
    state.strategy ===
    "match"
  ) {

    return ENGINE.minMatchTicks;

  }


  if (
    state.strategy ===
      "boom" ||
    state.strategy ===
      "crash"
  ) {

    return ENGINE.minSpikeTicks;

  }


  return state.mode ===
    "deep"
    ? ENGINE.minDeepTicks
    : ENGINE.minFastTicks;

}


function marketSupportsStrategy(
  symbol = state.symbol,
  strategy = state.strategy
) {

  const market =
    marketRegistry.all()[
      symbol
    ];


  return Boolean(
    market
      ?.strategies
      ?.includes(
        strategy
      )
  );

}


function canPredict() {

  return (
    state.connected &&
    state.engineOn &&
    !state.predictionActive &&
    !state.cooldown &&
    marketBuffer.prices.length >=
      minimumTicks() &&
    state.latency.operable &&
    marketSupportsStrategy()
  );

}


/* ==========================================
   CONTROLES
   ========================================== */

function renderControls() {

  setText(
    UI.engineStatus,
    state.engineOn
      ? "ON"
      : "OFF"
  );


  UI.engineButton.textContent =
    state.engineOn
      ? i18n.t(
          "stopEngine"
        )
      : i18n.t(
          "startEngine"
        );


  UI.connectButton.textContent =
    i18n.t(
      "connect"
    );


  UI.disconnectButton.textContent =
    i18n.t(
      "disconnect"
    );


  UI.predictionButton.disabled =
    !canPredict();


  UI.predictionButton.textContent =
    state.cooldown
      ? i18n.t(
          "waitButton"
        )
      : i18n.t(
          "prediction"
        );


  const locked =
    state.predictionActive ||
    state.cooldown;


  [
    UI.marketSelect,
    UI.strategySelect,
    UI.modeSelect
  ].forEach(
    (element) => {

      element.disabled =
        locked;

    }
  );

}


/* ==========================================
   CONEXIÓN
   ========================================== */

function renderConnection(
  status,
  label
) {

  state.connected =
    status ===
    "live";


  setText(
    UI.connectionStatus,
    label
  );


  UI.connectButton.disabled =
    status ===
      "connecting" ||
    status ===
      "live";


  UI.disconnectButton.disabled =
    status !==
    "live";


  UI.engineButton.disabled =
    status !==
    "live";


  if (
    !state.connected &&
    state.engineOn
  ) {

    stopEngine(
      false
    );

  }


  renderControls();

}


/* ==========================================
   LATENCIA
   ========================================== */

function renderLatency() {

  const value =
    state.latency;


  setText(
    UI.latencyStatus,
    value.latencyMs ===
      null
      ? "NO DATA"
      : `${value.status} · ${Math.round(
          value.latencyMs
        )} ms`
  );


  UI.latencyStatus.className =
    `status-pill ${
      value.operable
        ? "live"
        : value.status ===
            "NO OPERAR"
          ? "danger-pill"
          : ""
    }`;

}


/* ==========================================
   DÍGITOS
   ========================================== */

function renderDigits() {

  UI.digits.innerHTML =
    "";


  marketBuffer.digits
    .slice(
      -20
    )
    .forEach(
      (
        digit,
        index,
        array
      ) => {

        const item =
          document.createElement(
            "span"
          );


        item.className =
          `digit${
            index ===
              array.length -
                1
              ? " current"
              : ""
          }`;


        item.textContent =
          digit;


        UI.digits.appendChild(
          item
        );

      }
    );

}


/* ==========================================
   INDICADORES
   ========================================== */

function renderIndicators(
  snapshot
) {

  setText(
    UI.trend,
    i18n.translateState(
      snapshot.trend.direction
    )
  );


  setText(
    UI.rsi,
    snapshot.rsi ===
      null
      ? "--"
      : snapshot.rsi.toFixed(
          1
        )
  );


  setText(
    UI.momentum,
    i18n.translateState(
      snapshot
        .momentum
        .direction
    )
  );


  setText(
    UI.volatility,
    i18n.translateState(
      snapshot
        .volatility
        .level
    )
  );

}


/* ==========================================
   IDIOMA
   ========================================== */

function renderLanguage() {

  document
    .querySelectorAll(
      "[data-i18n]"
    )
    .forEach(
      (element) => {

        element.textContent =
          i18n.t(
            element
              .dataset
              .i18n
          );

      }
    );


  document
    .querySelectorAll(
      "[data-i18n-option]"
    )
    .forEach(
      (option) => {

        option.textContent =
          i18n.t(
            option
              .dataset
              .i18nOption
          );

      }
    );


  if (
    UI.languageSelect
  ) {

    UI.languageSelect.value =
      i18n.language;

  }


  UI.modeSelect
    ?.dispatchEvent(
      new Event(
        "optionsupdated"
      )
    );


  renderControls();


  if (
    state.snapshot
  ) {

    renderIndicators(
      state.snapshot
    );

  }

}


/* ==========================================
   MERCADOS
   ========================================== */

function populateMarketSelector() {

  const previous =
    state.symbol;


  const markets =
    marketRegistry.all();


  UI.marketSelect.innerHTML =
    "";


  const compatible =
    Object.entries(
      markets
    )
      .filter(
        (
          [
            ,
            market
          ]
        ) =>
          market.enabled !==
            false &&
          Array.isArray(
            market.strategies
          ) &&
          market.strategies.includes(
            state.strategy
          )
      )
      .sort(
        (
          a,
          b
        ) => {

          const rank =
            (
              [
                symbol,
                market
              ]
            ) => {

              const name =
                String(
                  market.name ||
                  ""
                );


              const match =
                name.match(
                  /(?:Volatility\s+|Boom\s+|Crash\s+)(\d+)/i
                );


              const n =
                Number(
                  match?.[1] ||
                  999
                );


              if (
                /^R_\d+$/.test(
                  symbol
                )
              ) {

                return [
                  0,
                  n,
                  name
                ];

              }


              if (
                /^1HZ\d+V$/.test(
                  symbol
                ) ||
                /\(1s\)/i.test(
                  name
                )
              ) {

                return [
                  1,
                  n,
                  name
                ];

              }


              if (
                /boom/i.test(
                  name
                )
              ) {

                return [
                  2,
                  n,
                  name
                ];

              }


              if (
                /crash/i.test(
                  name
                )
              ) {

                return [
                  3,
                  n,
                  name
                ];

              }


              return [
                4,
                n,
                name
              ];

            };


          const ra =
            rank(
              a
            );


          const rb =
            rank(
              b
            );


          return (
            ra[0] -
              rb[0] ||
            ra[1] -
              rb[1] ||
            ra[2]
              .localeCompare(
                rb[2]
              )
          );

        }
      );


  compatible.forEach(
    (
      [
        symbol,
        market
      ]
    ) => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        symbol;


      option.textContent =
        market.name;


      option.dataset.marketFamily =
        /boom/i.test(
          market.name
        )
          ? "boom"
          : /crash/i.test(
              market.name
            )
            ? "crash"
            : (
                /^1HZ/.test(
                  symbol
                ) ||
                /\(1s\)/i.test(
                  market.name
                )
              )
              ? "1s"
              : /^R_/.test(
                  symbol
                )
                ? "standard"
                : "other";


      UI.marketSelect.appendChild(
        option
      );

    }
  );


  if (
    compatible.some(
      (
        [
          symbol
        ]
      ) =>
        symbol ===
        previous
    )
  ) {

    UI.marketSelect.value =
      previous;

  }

  else if (
    UI.marketSelect
      .options
      .length
  ) {

    state.symbol =
      UI.marketSelect
        .options[0]
        .value;


    UI.marketSelect.value =
      state.symbol;

  }


  UI.marketSelect.disabled =
    !UI.marketSelect
      .options
      .length;


  UI.marketSelect.dispatchEvent(
    new Event(
      "optionsupdated"
    )
  );


  return (
    previous !==
    state.symbol
  );

}


/* ==========================================
   TICKER
   ========================================== */

function renderTicker() {

  setText(
    UI.tickerMarketName,
    marketRegistry.all()[
      state.symbol
    ]?.name ||
      state.symbol
  );


  setText(
    UI.tickerConnection,
    state.connected
      ? `● ${i18n.t(
          "connected"
        )}`
      : "● OFFLINE"
  );


  setText(
    UI.tickerPrice,
    UI.price
      ?.textContent ||
      "--"
  );


  setText(
    UI.tickerLastDigit,
    UI.lastDigit
      ?.textContent ||
      "--"
  );


  const digits =
    marketBuffer.digits
      .slice(
        -20
      );


  UI.tickerDigits.innerHTML =
    "";


  digits.forEach(
    (
      digit,
      index
    ) => {

      const node =
        document.createElement(
          "span"
        );


      node.className =
        `ticker-digit ${
          digit %
            2 ===
          0
            ? "even"
            : "odd"
        }${
          index ===
            digits.length -
              1
            ? " current"
            : ""
        }`;


      node.textContent =
        digit;


      UI.tickerDigits.appendChild(
        node
      );

    }
  );


  const even =
    digits.filter(
      (digit) =>
        digit %
          2 ===
        0
    ).length;


  setText(
    UI.tickerEven,
    even
  );


  setText(
    UI.tickerOdd,
    digits.length -
      even
  );


  const prices =
    marketBuffer.prices
      .slice(
        -21
      );


  let rises =
    0;


  let falls =
    0;


  for (
    let index =
      1;
    index <
      prices.length;
    index +=
      1
  ) {

    if (
      prices[index] >
      prices[
        index -
        1
      ]
    ) {

      rises +=
        1;

    }


    if (
      prices[index] <
      prices[
        index -
        1
      ]
    ) {

      falls +=
        1;

    }

  }


  setText(
    UI.tickerRises,
    rises
  );


  setText(
    UI.tickerFalls,
    falls
  );

}


/* ==========================================
   TICKS
   ========================================== */

function processTick(
  tick
) {

  if (
    tick.symbol !==
    state.symbol
  ) {

    return;

  }


  const rendered =
    marketBuffer.push(
      tick
    );


  state.latency =
    latencyMonitor.update(
      tick
    );


  setText(
    UI.price,
    rendered.formatted
  );


  setText(
    UI.tickCount,
    marketBuffer.ticks
  );


  setText(
    UI.lastDigit,
    rendered.digit ??
      "--"
  );


  setText(
    UI.updateTime,
    new Date(
      tick.epoch *
        1000
    ).toLocaleTimeString(
      "es-SV"
    )
  );


  setText(
    UI.memoryStatus,
    marketBuffer.prices.length
  );


  renderDigits();

  renderLatency();

  renderTicker();


  if (
    state.engineOn
  ) {

    state.snapshot =
      buildSnapshot({
        prices:
          marketBuffer.prices,

        digits:
          marketBuffer.digits,

        mode:
          state.mode
      });


    state.lastOpportunity =
      exploreOpportunity(
        state.strategy,
        state.snapshot
      );


    renderIndicators(
      state.snapshot
    );

  }


  renderControls();

}


/* ==========================================
   MOTOR
   ========================================== */

function startEngine() {

  if (
    !state.connected
  ) {

    return;

  }


  state.engineOn =
    true;


  state.snapshot =
    null;


  state.lastOpportunity =
    null;


  setText(
    UI.controlMessage,
    "Motor encendido. Análisis continuo activo en segundo plano."
  );


  setText(
    UI.engineStage,
    "ANÁLISIS CONTINUO"
  );


  setText(
    UI.engineDetail,
    "Los motores preparan oportunidades; no se mostrará ninguna hasta pulsar PREDICTION."
  );


  UI.engineProgress.style.width =
    "25%";


  voiceAssistant.speak(
    `Motor encendido. ${
      marketRegistry.all()[
        state.symbol
      ]?.name ||
      state.symbol
    }. Estrategia ${
      STRATEGIES[
        state.strategy
      ].voice
    }.`
  );


  diagnostics.ok(
    "Motor encendido.",
    {
      symbol:
        state.symbol,

      strategy:
        state.strategy
    }
  );


  log(
    "Análisis continuo activado.",
    "ok"
  );


  renderControls();

}


function stopEngine(
  announce = true
) {

  state.engineOn =
    false;


  state.predictionActive =
    false;


  state.cooldown =
    false;


  clearInterval(
    state.countdownTimer
  );


  clearTimeout(
    state.cooldownTimer
  );


  memoryManager.clean(
    "stop-engine"
  );


  marketBuffer.reset();


  latencyMonitor.reset();


  state.latency =
    latencyMonitor.current;


  setText(
    UI.controlMessage,
    "Motor apagado y memoria temporal liberada."
  );


  setText(
    UI.engineStage,
    "MOTOR APAGADO"
  );


  setText(
    UI.engineDetail,
    "Encienda el motor para comenzar un análisis limpio."
  );


  UI.engineProgress.style.width =
    "0%";


  setText(
    UI.price,
    "--"
  );


  setText(
    UI.tickCount,
    0
  );


  setText(
    UI.lastDigit,
    "--"
  );


  setText(
    UI.memoryStatus,
    0
  );


  UI.digits.innerHTML =
    "";


  renderLatency();


  if (
    announce
  ) {

    voiceAssistant.speak(
      "Motor apagado. Memoria temporal liberada."
    );

  }


  renderControls();

}


/* ==========================================
   SEÑAL VISUAL
   ========================================== */

function showFloating(
  type,
  stateText,
  value,
  detail
) {

  UI.floatingSignal.className =
    `signal-toast ${type} visible`;


  setText(
    UI.floatingState,
    stateText
  );


  setText(
    UI.floatingValue,
    value
  );


  setText(
    UI.floatingDetail,
    detail
  );

}


function hideFloating() {

  UI.floatingSignal
    .classList
    .remove(
      "visible"
    );

}


function showReasons(
  result
) {

  UI.signalReasons.innerHTML =
    "";


  [
    ...(
      result.reasons ||
      []
    ),

    ...(
      result.warnings ||
      []
    ).map(
      (x) =>
        `⚠ ${x}`
    )
  ]
    .slice(
      0,
      5
    )
    .forEach(
      (reason) => {

        const item =
          document.createElement(
            "li"
          );


        item.textContent =
          reason;


        UI.signalReasons.appendChild(
          item
        );

      }
    );

}


/* ==========================================
   FINALIZAR
   ========================================== */

function finishPrediction(
  message
) {

  clearInterval(
    state.countdownTimer
  );


  state.predictionActive =
    false;


  state.cooldown =
    true;


  setText(
    UI.engineStage,
    "PREDICCIÓN FINALIZADA"
  );


  setText(
    UI.engineDetail,
    "No se generará otra señal automáticamente."
  );


  UI.engineProgress.style.width =
    "0%";


  setText(
    UI.controlMessage,
    `${message} Puede cambiar mercado o solicitar otra predicción.`
  );


  hideFloating();


  voiceAssistant.speak(
    "Predicción finalizada. Genera una nueva señal.",
    {
      replace:
        true,

      rate:
        1.05
    }
  );


  diagnostics.info(
    "Predicción finalizada.",
    {
      message
    }
  );


  renderControls();


  clearTimeout(
    state.cooldownTimer
  );


  state.cooldownTimer =
    setTimeout(
      () => {

        state.cooldown =
          false;


        setText(
          UI.engineStage,
          "ANÁLISIS CONTINUO"
        );


        setText(
          UI.engineDetail,
          "Pulse PREDICTION para solicitar otra decisión."
        );


        renderControls();

      },
      ENGINE.cooldownMs
    );

}


/* ==========================================
   SOLICITAR PREDICCIÓN
   ========================================== */

async function requestPrediction() {

  if (
    !canPredict()
  ) {

    return;

  }


  state.predictionActive =
    true;


  renderControls();


  setText(
    UI.engineStage,
    "PREDICIENDO MERCADO"
  );


  setText(
    UI.engineDetail,
    `${
      marketRegistry.all()[
        state.symbol
      ]?.name ||
      state.symbol
    } · ${
      STRATEGIES[
        state.strategy
      ].name
    }`
  );


  UI.engineProgress.style.width =
    "55%";


  setText(
    UI.signalState,
    "ANALYZING"
  );


  setText(
    UI.signalTitle,
    "Validación rápida"
  );


  setText(
    UI.signalValue,
    "--"
  );


  setText(
    UI.countdown,
    "--"
  );


  voiceAssistant.speak(
    `Prediciendo ${
      marketRegistry.all()[
        state.symbol
      ]?.name ||
      state.symbol
    }.`
  );


  diagnostics.info(
    "Predicción solicitada.",
    {
      symbol:
        state.symbol,

      strategy:
        state.strategy,

      mode:
        state.mode
    }
  );


  const validationDelay =
    state.strategy ===
      "match"
      ? Math.min(
          900,
          ENGINE.quickValidationMs
        )
      : state.strategy ===
          "rise_fall"
        ? ENGINE.riseFallValidationMs
        : (
            state.strategy ===
              "boom" ||
            state.strategy ===
              "crash"
          )
          ? ENGINE.spikeValidationMs
          : ENGINE.quickValidationMs;


  await new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        validationDelay
      )
  );


  const first =
    exploreOpportunity(
      state.strategy,
      state.snapshot
    );


  const freshSnapshot =
    buildSnapshot({
      prices:
        marketBuffer.prices,

      digits:
        marketBuffer.digits,

      mode:
        state.mode
    });


  const fresh =
    exploreOpportunity(
      state.strategy,
      freshSnapshot
    );


  const validation =
    validateOpportunity(
      first,
      fresh,
      freshSnapshot
    );


  const consensus =
    buildConsensus(
      first,
      validation
    );


  const timing =
    evaluateTiming({
      strategy:
        state.strategy,

      snapshot:
        freshSnapshot,

      latency:
        state.latency
    });


  const quality =
    applyQualityFilter({
      strategy:
        state.strategy,

      opportunity:
        first,

      consensus,

      timing
    });


  const result = {

    ...consensus,

    strategy:
      state.strategy,

    direction:
      first.direction,

    score:
      quality.score,

    reasons:
      consensus.reasons,

    warnings:
      consensus.warnings,

    metadata:
      consensus.metadata

  };


  setText(
    UI.signalScore,
    `${quality.score}/100`
  );


  UI.signalBar.style.width =
    `${quality.score}%`;


  showReasons(
    result
  );


  if (
    first.direction ===
    "NO_OPERAR"
  ) {

    UI.signalCard.className =
      "card signal-card no-operate";


    setText(
      UI.signalState,
      "NO OPERAR"
    );


    setText(
      UI.signalTitle,
      "Matches descartado"
    );


    setText(
      UI.signalValue,
      "MATCHES 0"
    );


    showFloating(
      "no-operate",
      "NO OPERAR",
      "MATCHES 0",
      "El número 0 está excluido."
    );


    voiceAssistant.speak(
      "Coincidencia cero. No operar."
    );


    setTimeout(
      () =>
        finishPrediction(
          "El candidato fue 0 y se descartó."
        ),
      2200
    );


    return;

  }


  if (
    !quality.approved
  ) {

    UI.signalCard.className =
      "card signal-card wait";


    setText(
      UI.signalState,
      "ESPERAR"
    );


    setText(
      UI.signalTitle,
      "Sin entrada suficientemente clara"
    );


    setText(
      UI.signalValue,
      "ESPERAR"
    );


    showFloating(
      "prepare",
      "ESPERAR",
      "SIN ENTRADA",
      quality.reason
    );


    voiceAssistant.speak(
      "No hay una entrada suficientemente clara. Espere y vuelva a solicitar una predicción."
    );


    setTimeout(
      () =>
        finishPrediction(
          quality.reason
        ),
      2600
    );


    return;

  }


  const value =
    visualDirection(
      result
    );


  const explanation =
    briefExplanation(
      result
    );


  UI.signalCard.className =
    "card signal-card confirmed";


  setText(
    UI.signalState,
    "READY"
  );


  setText(
    UI.signalTitle,
    "Predicción confirmada"
  );


  setText(
    UI.signalValue,
    value
  );


  showFloating(
    "confirmed",
    "EJECUTAR",
    value,
    explanation ||
      "Filtros superados."
  );


  setText(
    UI.engineStage,
    "PREDICCIÓN CONFIRMADA"
  );


  setText(
    UI.engineDetail,
    "Sincronizando BOT y cuenta regresiva FIX13.3."
  );


  UI.engineProgress.style.width =
    "88%";


  await beginPredictionSequence(
    result
  );

}


/* ==========================================
   DIAGNÓSTICO
   ========================================== */

function renderDiagnostics(
  entries
) {

  if (
    !entries.length
  ) {

    UI.diagnosticContent.textContent =
      "Sin eventos.";


    return;

  }


  UI.diagnosticContent.innerHTML =
    "";


  entries
    .slice()
    .reverse()
    .forEach(
      (entry) => {

        const line =
          document.createElement(
            "div"
          );


        line.className =
          `diagnostic-line ${entry.level}`;


        const extra =
          entry.data
            ? `\n${JSON.stringify(
                entry.data,
                null,
                2
              )}`
            : "";


        line.textContent =
          `[${entry.time}] ${entry.message}${extra}`;


        UI.diagnosticContent.appendChild(
          line
        );

      }
    );

}


/* ==========================================
   CALIBRADOR
   ========================================== */

function calibrationContext() {

  return {

    symbol:
      state.symbol,

    strategy:
      state.strategy,

    mode:
      state.mode

  };

}


function renderCalibration() {

  const recommendation =
    executionCalibrator
      .recommendation(
        calibrationContext()
      );


  setText(
    UI.calibrationStatus,
    recommendation.status
  );


  setText(
    UI.calibrationSummary,
    recommendation.second
      ? `${recommendation.status}: segundo ${recommendation.second} · ${recommendation.accuracy.toFixed(1)}% en ${recommendation.tests} pruebas.`
      : "Registre al menos 20 resultados por segundo antes de mostrar una recomendación."
  );


  UI.calibrationTable.innerHTML =
    "";


  recommendation.rows.forEach(
    (row) => {

      const line =
        document.createElement(
          "div"
        );


      line.className =
        "calibration-row";


      line.innerHTML = `
        <strong>Seg. ${row.second}</strong>
        <span>${row.tests} pruebas</span>
        <span>${row.success} +</span>
        <span>${row.failed} -</span>
      `;


      UI.calibrationTable.appendChild(
        line
      );

    }
  );

}


function sleep(
  ms
) {

  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
  );

}


/* ==========================================
   SINCRONIZACIÓN BOT FIX13.3
   ========================================== */

const BOT_CHANNEL_NAME =
  "trading-analyzer-bot-v1-mr";


const botChannel =
  "BroadcastChannel" in
    window
    ? new BroadcastChannel(
        BOT_CHANNEL_NAME
      )
    : null;


/* ==========================================
   ENVIAR SEÑAL
   ========================================== */

function enviarSenalAlBot(
  result,
  segundoEntrada,
  targetExecutionAt
) {

  const ultimoPrecio =
    marketBuffer.prices.length
      ? marketBuffer.prices[
          marketBuffer.prices.length -
            1
        ]
      : null;


  const ultimoDigito =
    marketBuffer.digits.length
      ? marketBuffer.digits[
          marketBuffer.digits.length -
            1
        ]
      : null;


  const target =
    Number(
      targetExecutionAt
    );


  if (
    !Number.isFinite(
      target
    ) ||
    target <=
      Date.now()
  ) {

    diagnostics.error(
      "FIX13.3: targetExecutionAt inválido.",
      {
        targetExecutionAt:
          target
      }
    );


    log(
      "BOT FIX13.3 ERROR → target inválido.",
      "error"
    );


    return false;

  }


  const ahoraEpoch =
    Date.now();


  const senal = {

    id:
      `${ahoraEpoch}-${state.symbol}-${state.strategy}`,

    mercado:
      state.symbol,

    estrategia:
      state.strategy,

    direccion:
      result.direction,

    confianza:
      Number(
        result.score ||
        0
      ),

    precio:
      ultimoPrecio,

    ultimoDigito:
      ultimoDigito,

    tendencia:
      state.snapshot
        ?.trend
        ?.direction ??
      null,

    rsi:
      state.snapshot
        ?.rsi ??
      null,

    momentum:
      state.snapshot
        ?.momentum
        ?.direction ??
      null,

    volatilidad:
      state.snapshot
        ?.volatility
        ?.level ??
      null,

    segundosEntrada:
      segundoEntrada,

    modo:
      state.mode,

    targetExecutionAt:
      target,

    /*
      FIX13.3:
      MARCA ABSOLUTA PARA EL BOT.
    */

    analyzerSentEpoch:
      ahoraEpoch,

    timestamp:
      ahoraEpoch,

    metadata: {

      ...(
        result.metadata ||
        {}
      ),

      targetExecutionAt:
        target,

      analyzerSentEpoch:
        ahoraEpoch,

      preavisoBotSegundos:
        BOT_PREAVISO_SEGUNDOS,

      preavisoBotMs:
        BOT_PREAVISO_MS,

      fix:
        "FIX13.3-SYNC"

    },

    origen:
      `Trading Analyst Pro MR V${APP_VERSION}`

  };


  let broadcastOk =
    false;


  let storageOk =
    false;


  try {

    if (
      botChannel
    ) {

      botChannel.postMessage(
        senal
      );


      broadcastOk =
        true;

    }

  }

  catch (
    error
  ) {

    diagnostics.error(
      "Error BroadcastChannel hacia BOT.",
      {
        message:
          error.message
      }
    );

  }


  try {

    localStorage.setItem(
      "TA_BOT_SIGNAL_V1",
      JSON.stringify(
        senal
      )
    );


    storageOk =
      true;

  }

  catch (
    error
  ) {

    diagnostics.error(
      "Error localStorage hacia BOT.",
      {
        message:
          error.message
      }
    );

  }


  const anticipacion =
    target -
    Date.now();


  diagnostics.ok(
    "Señal FIX13.3 enviada al BOT V1 MR.",
    {

      mercado:
        senal.mercado,

      direccion:
        senal.direccion,

      confianza:
        senal.confianza,

      segundoEntrada:
        senal.segundosEntrada,

      targetExecutionAt:
        senal.targetExecutionAt,

      analyzerSentEpoch:
        senal.analyzerSentEpoch,

      anticipacionMs:
        anticipacion,

      BroadcastChannel:
        broadcastOk,

      localStorage:
        storageOk

    }
  );


  log(
    `BOT FIX13.3 → ${senal.mercado} · ${senal.direccion} · ${senal.confianza}% · TARGET ${segundoEntrada} · PREAVISO ${(anticipacion / 1000).toFixed(2)} s`,
    "ok"
  );


  return (
    broadcastOk ||
    storageOk
  );

}


/* ==========================================
   CUENTA REGRESIVA
   ========================================== */

async function runCountdown(
  seconds
) {

  clearInterval(
    state.countdownTimer
  );


  return new Promise(
    (resolve) => {

      const startedAt =
        performance.now();


      let lastShown =
        null;


      let alertRunId =
        0;


      const flashEntry =
        () => {

          if (
            !UI.entryAlertEnabled
              ?.checked ||
            !UI.entryFlash
          ) {

            return;

          }


          UI.entryFlash.hidden =
            false;


          UI.entryFlash.classList.remove(
            "pulse"
          );


          void UI.entryFlash.offsetWidth;


          UI.entryFlash.classList.add(
            "pulse"
          );


          setTimeout(
            () => {

              UI.entryFlash.hidden =
                true;

            },
            650
          );

        };


      const update =
        () => {

          const elapsed =
            (
              performance.now() -
              startedAt
            ) /
            1000;


          const remaining =
            Math.max(
              0,
              Number(
                seconds
              ) -
              Math.floor(
                elapsed
              )
            );


          if (
            remaining !==
            lastShown
          ) {

            lastShown =
              remaining;


            setText(
              UI.countdown,
              remaining
            );


            const target =
              Number(
                UI.entryAlertSecond
                  ?.value ||
                10
              );


            const thisRun =
              ++alertRunId;


            const spoken =
              voiceAssistant
                .speakCountdownNumber(
                  remaining
                );


            if (
              UI.entryAlertEnabled
                ?.checked &&
              remaining ===
                target &&
              spoken &&
              typeof spoken.then ===
                "function"
            ) {

              spoken.then(
                () => {

                  if (
                    thisRun !==
                    alertRunId
                  ) {

                    return;

                  }


                  const delay =
                    Math.max(
                      0,
                      Number(
                        UI.entryAlertDelay
                          ?.value ||
                        0
                      )
                    );


                  setTimeout(
                    flashEntry,
                    delay
                  );

                }
              );

            }

          }


          if (
            elapsed >=
            Number(
              seconds
            )
          ) {

            clearInterval(
              state.countdownTimer
            );


            setText(
              UI.countdown,
              0
            );


            resolve();

          }

        };


      update();


      state.countdownTimer =
        setInterval(
          update,
          40
        );

    }
  );

}


/* ==========================================
   SECUENCIA FIX13.3

   CAMBIO CLAVE:

   YA NO ESPERAMOS A QUE TERMINE LA VOZ
   ANTES DE CREAR EL TARGET.

   AHORA:
   T0 = SEÑAL CONFIRMADA
   T0 = TARGET CREADO
   T0 = ENVÍO AL BOT
   T0 -> VOZ NO BLOQUEANTE
   T0 + 2s = CONTADOR 10
   T0 + 2s = BUY TARGET BOT
   ========================================== */

async function beginPredictionSequence(
  result
) {

  const explanation =
    briefExplanation(
      result
    );


  state.lastPredictionResult =
    result;


  const targetSecond =
    Number(
      UI.entryAlertSecond
        ?.value ||
      10
    );


  /*
    FIX13.3:
    EL TARGET SE CREA ANTES DE LA VOZ.
  */

  const targetExecutionAt =
    Date.now() +
    BOT_PREAVISO_MS;


  setText(
    UI.engineStage,
    "PREAVISO FIX13.3 AL BOT"
  );


  setText(
    UI.engineDetail,
    `BOT recibe la señal ${BOT_PREAVISO_SEGUNDOS.toFixed(1)} s antes del segundo ${targetSecond}.`
  );


  UI.engineProgress.style.width =
    "90%";


  /*
    ENVIAMOS PRIMERO.
  */

  const enviada =
    enviarSenalAlBot(
      result,
      targetSecond,
      targetExecutionAt
    );


  if (
    !enviada
  ) {

    diagnostics.error(
      "FIX13.3: no se pudo transmitir la señal al BOT."
    );


    log(
      "BOT FIX13.3 → FALLO DE TRANSMISIÓN.",
      "error"
    );

  }


  /*
    VOZ NO BLOQUEANTE.

    IMPORTANTE:
    NO USAMOS await AQUÍ.

    Aunque la voz dure más,
    el target no se desplaza.
  */

  Promise.resolve(
    voiceAssistant
      .announcePredictionAndExecution(
        result,
        explanation
      )
  )
    .catch(
      (
        error
      ) => {

        diagnostics.error(
          "FIX13.3: error en anuncio de voz.",
          {
            message:
              error?.message ||
              String(
                error
              )
          }
        );

      }
    );


  /*
    ESPERA HASTA EL MISMO TARGET
    QUE YA TIENE EL BOT.
  */

  const espera =
    Math.max(
      0,
      targetExecutionAt -
      Date.now()
    );


  await sleep(
    espera
  );


  /*
    ESTE INSTANTE DEBE COINCIDIR CON:
    - CONTADOR 10
    - TARGET BOT
    - BUY ENVIADO DEL BOT
  */

  setText(
    UI.engineStage,
    "VENTANA DE EJECUCIÓN"
  );


  setText(
    UI.engineDetail,
    `TARGET ${targetSecond} alcanzado · BOT sincronizado FIX13.3.`
  );


  UI.engineProgress.style.width =
    "100%";


  diagnostics.ok(
    "FIX13.3 TARGET VISUAL ALCANZADO.",
    {

      targetExecutionAt,

      visualReachedAt:
        Date.now(),

      desviacionVisualMs:
        Date.now() -
        targetExecutionAt

    }
  );


  log(
    `FIX13.3 → CONTADOR ${targetSecond} EN TARGET.`,
    "ok"
  );


  await runCountdown(
    ENGINE.executionSeconds
  );


  await sleep(
    450
  );


  finishPrediction(
    "La ventana de ejecución terminó."
  );

}


/* ==========================================
   AJUSTES
   ========================================== */

const ENTRY_SETTINGS_KEY =
  "trading-entry-alert-v11-3-4";


function loadEntrySettings() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          ENTRY_SETTINGS_KEY
        ) ||
        "{}"
      );


    if (
      UI.entryAlertEnabled
    ) {

      UI.entryAlertEnabled.checked =
        saved.enabled ??
        true;

    }


    if (
      UI.entryAlertSecond
    ) {

      UI.entryAlertSecond.value =
        String(
          saved.second ??
          10
        );

    }


    if (
      UI.entryAlertDelay
    ) {

      UI.entryAlertDelay.value =
        String(
          saved.delayMs ??
          0
        );

    }

  }

  catch {}

}


function saveEntrySettings() {

  try {

    localStorage.setItem(
      ENTRY_SETTINGS_KEY,
      JSON.stringify({

        enabled:
          Boolean(
            UI.entryAlertEnabled
              ?.checked
          ),

        second:
          Number(
            UI.entryAlertSecond
              ?.value ||
            10
          ),

        delayMs:
          Number(
            UI.entryAlertDelay
              ?.value ||
            0
          )

      })
    );

  }

  catch {}

}


/* ==========================================
   INICIO
   ========================================== */

async function init() {

  await voiceAssistant.init();


  voiceAssistant.voices
    .forEach(
      (voice) => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          `${voice.name}|${voice.lang}`;


        option.textContent =
          `${voice.name} · ${voice.lang}`;


        UI.voiceSelect.appendChild(
          option
        );

      }
    );


  diagnostics.subscribe(
    renderDiagnostics
  );


  diagnostics.ok(
    `Trading Analyst Pro MR V${APP_VERSION} iniciado. FIX13.3 SYNC · preaviso ${BOT_PREAVISO_SEGUNDOS.toFixed(1)} s.`
  );


  loadEntrySettings();

  populateMarketSelector();

  renderLanguage();

  renderTicker();

  renderStats();

  renderCalibration();

  renderControls();

  renderLatency();


  setText(
    UI.marketName,
    marketRegistry.all()[
      state.symbol
    ]?.name ||
      state.symbol
  );


  log(
    `Trading Analyst Pro MR V${APP_VERSION} listo · FIX13.3 SYNC · preaviso ${BOT_PREAVISO_SEGUNDOS.toFixed(1)} s.`,
    "ok"
  );

}


/* ==========================================
   BOTONES PRINCIPALES
   ========================================== */

UI.connectButton.addEventListener(
  "click",
  () =>
    derivAPI.connect(
      state.symbol
    )
);


UI.disconnectButton.addEventListener(
  "click",
  () => {

    stopEngine(
      false
    );


    derivAPI.disconnect();

  }
);


UI.engineButton.addEventListener(
  "click",
  () => {

    state.engineOn
      ? stopEngine()
      : startEngine();

  }
);


UI.predictionButton.addEventListener(
  "click",
  requestPrediction
);


/* ==========================================
   MERCADO
   ========================================== */

UI.marketSelect.addEventListener(
  "change",
  () => {

    const wasEngineOn =
      state.engineOn;


    state.symbol =
      UI.marketSelect.value;


    memoryManager.clean(
      "market-change"
    );


    marketBuffer.reset();


    latencyMonitor.reset();


    state.latency =
      latencyMonitor.current;


    state.snapshot =
      null;


    state.lastOpportunity =
      null;


    setText(
      UI.marketName,
      marketRegistry.all()[
        state.symbol
      ]?.name ||
        state.symbol
    );


    setText(
      UI.price,
      "--"
    );


    setText(
      UI.tickCount,
      0
    );


    setText(
      UI.lastDigit,
      "--"
    );


    setText(
      UI.memoryStatus,
      0
    );


    UI.digits.innerHTML =
      "";


    if (
      state.connected
    ) {

      derivAPI.changeSymbol(
        state.symbol
      );

    }


    if (
      wasEngineOn
    ) {

      state.engineOn =
        true;


      setText(
        UI.engineStage,
        "SINCRONIZANDO NUEVO MERCADO"
      );


      setText(
        UI.engineDetail,
        "Recopilando datos limpios sin apagar el motor."
      );


      voiceAssistant.speak(
        `Cambiando a ${
          marketRegistry.all()[
            state.symbol
          ]?.name ||
          state.symbol
        }.`
      );

    }


    populateMarketSelector();

    renderLanguage();

    renderTicker();

    renderStats();

    renderCalibration();

    renderControls();

  }
);


/* ==========================================
   ESTRATEGIA
   ========================================== */

UI.strategySelect.addEventListener(
  "change",
  () => {

    state.strategy =
      UI.strategySelect.value;


    state.snapshot =
      null;


    state.lastOpportunity =
      null;


    const previous =
      state.symbol;


    const changedMarket =
      populateMarketSelector();


    if (
      !UI.marketSelect
        .options
        .length
    ) {

      setText(
        UI.controlMessage,
        state.connected
          ? `No se detectó todavía un mercado compatible con ${STRATEGIES[state.strategy].name}. Actualizando desde Deriv...`
          : `Conecte la herramienta para cargar mercados compatibles con ${STRATEGIES[state.strategy].name}.`
      );


      if (
        state.connected
      ) {

        derivAPI.requestActiveSymbols();

      }

    }

    else if (
      changedMarket &&
      state.connected &&
      state.symbol !==
        previous
    ) {

      memoryManager.clean(
        "strategy-market-change"
      );


      marketBuffer.reset();


      latencyMonitor.reset();


      state.latency =
        latencyMonitor.current;


      derivAPI.changeSymbol(
        state.symbol
      );


      setText(
        UI.marketName,
        marketRegistry.all()[
          state.symbol
        ]?.name ||
          state.symbol
      );

    }


    setText(
      UI.engineStage,
      state.engineOn
        ? "ESTRATEGIA ACTUALIZADA"
        : "EN ESPERA"
    );


    setText(
      UI.engineDetail,
      state.engineOn
        ? `Analizando ${STRATEGIES[state.strategy].name} sin apagar el motor.`
        : "Encienda el motor para comenzar."
    );


    voiceAssistant.speak(
      `Estrategia ${
        STRATEGIES[
          state.strategy
        ].voice
      }.`
    );


    renderLanguage();

    renderTicker();

    renderStats();

    renderCalibration();

    renderControls();

  }
);


/* ==========================================
   MODO
   ========================================== */

UI.modeSelect.addEventListener(
  "change",
  () => {

    state.mode =
      UI.modeSelect.value;


    state.snapshot =
      null;


    state.lastOpportunity =
      null;


    renderCalibration();

    renderControls();

  }
);


/* ==========================================
   VOZ
   ========================================== */

UI.voiceButton.addEventListener(
  "click",
  () => {

    setText(
      UI.voiceButton,
      voiceAssistant.toggle()
        ? "🔊"
        : "🔇"
    );

  }
);


UI.voiceSelect.addEventListener(
  "change",
  () => {

    voiceAssistant.voice =
      voiceAssistant.voices.find(
        (voice) =>
          `${voice.name}|${voice.lang}` ===
          UI.voiceSelect.value
      ) ||
      voiceAssistant.voice;

  }
);


UI.voiceRate.addEventListener(
  "input",
  () => {

    voiceAssistant.rate =
      Number(
        UI.voiceRate.value
      );


    setText(
      UI.voiceRateValue,
      `${voiceAssistant.rate.toFixed(2)}x`
    );

  }
);


UI.voiceTest.addEventListener(
  "click",
  () => {

    voiceAssistant.speak(
      "Asistente de voz funcionando. Matches se pronuncia coincidencia."
    );

  }
);


/* ==========================================
   DIAGNÓSTICOS
   ========================================== */

UI.diagnosticButton.addEventListener(
  "click",
  () => {

    const open =
      UI.diagnosticPanel.hidden;


    UI.diagnosticPanel.hidden =
      !open;


    UI.diagnosticButton.textContent =
      open
        ? "🛠 CERRAR"
        : "🛠 ABRIR";

  }
);


UI.copyDiagnostic.addEventListener(
  "click",
  async () => {

    try {

      await navigator.clipboard.writeText(
        diagnostics.exportText() ||
        "Sin eventos."
      );


      log(
        "Diagnóstico copiado.",
        "ok"
      );

    }

    catch (
      error
    ) {

      diagnostics.error(
        "No se pudo copiar el diagnóstico.",
        {
          message:
            error.message
        }
      );

    }

  }
);


UI.clearDiagnostic.addEventListener(
  "click",
  () =>
    diagnostics.clear()
);


UI.clearLog.addEventListener(
  "click",
  () => {

    UI.activityLog.innerHTML =
      "";

  }
);


UI.resetStats.addEventListener(
  "click",
  () => {

    statistics.reset(
      statsKey()
    );


    renderStats();

  }
);


/* ==========================================
   CALIBRACIÓN
   ========================================== */

UI.saveCalibration.addEventListener(
  "click",
  () => {

    const second =
      Number(
        UI.executedSecond.value
      );


    const result =
      UI.manualResult.value;


    if (
      !second ||
      ![
        "success",
        "failed"
      ].includes(
        result
      )
    ) {

      log(
        "Seleccione segundo y resultado antes de guardar.",
        "warn"
      );


      return;

    }


    executionCalibrator.record(
      calibrationContext(),
      second,
      result ===
        "success"
    );


    statistics.record(
      statsKey(),
      result ===
        "success"
    );


    populateMarketSelector();

    renderLanguage();

    renderTicker();

    renderStats();

    renderCalibration();


    UI.executedSecond.value =
      "";


    UI.manualResult.value =
      "";


    log(
      `Resultado guardado para el segundo ${second}.`,
      "ok"
    );

  }
);


UI.resetCalibration.addEventListener(
  "click",
  () => {

    executionCalibrator.reset(
      calibrationContext()
    );


    renderCalibration();


    log(
      "Calibración reiniciada para esta configuración.",
      "warn"
    );

  }
);


/* ==========================================
   AJUSTES DE ENTRADA
   ========================================== */

UI.entryAlertEnabled
  ?.addEventListener(
    "change",
    saveEntrySettings
  );


UI.entryAlertSecond
  ?.addEventListener(
    "change",
    saveEntrySettings
  );


UI.entryAlertDelay
  ?.addEventListener(
    "change",
    saveEntrySettings
  );


/* ==========================================
   IDIOMA
   ========================================== */

UI.languageSelect.addEventListener(
  "change",
  () => {

    i18n.setLanguage(
      UI.languageSelect.value
    );


    renderLanguage();

    renderTicker();


    UI.marketSelect.dispatchEvent(
      new Event(
        "optionsupdated"
      )
    );


    UI.strategySelect.dispatchEvent(
      new Event(
        "optionsupdated"
      )
    );


    UI.modeSelect.dispatchEvent(
      new Event(
        "optionsupdated"
      )
    );

  }
);


window.addEventListener(
  "languagechange",
  () => {

    renderLanguage();

    renderTicker();

  }
);


/* ==========================================
   MERCADOS DINÁMICOS
   ========================================== */

UI.refreshMarkets.addEventListener(
  "click",
  () => {

    derivAPI.requestActiveSymbols();


    setText(
      UI.marketRegistryMessage,
      "Solicitando mercados activos a Deriv..."
    );

  }
);


UI.addManualMarket.addEventListener(
  "click",
  () => {

    try {

      marketRegistry.addManual({
        symbol:
          UI.manualMarketSymbol.value,

        name:
          UI.manualMarketName.value,

        oneSecond:
          UI.manualMarketOneSecond.checked
      });


      populateMarketSelector();


      setText(
        UI.marketRegistryMessage,
        "Mercado agregado correctamente."
      );


      UI.manualMarketSymbol.value =
        "";


      UI.manualMarketName.value =
        "";


      UI.manualMarketOneSecond.checked =
        false;

    }

    catch (
      error
    ) {

      setText(
        UI.marketRegistryMessage,
        error.message
      );

    }

  }
);


/* ==========================================
   EVENTOS DERIV
   ========================================== */

derivAPI.on(
  "activeSymbols",
  ({
    items
  }) => {

    marketRegistry.ingestActiveSymbols(
      items
    );


    const previous =
      state.symbol;


    const changedMarket =
      populateMarketSelector();


    if (
      changedMarket &&
      state.connected &&
      state.symbol !==
        previous
    ) {

      memoryManager.clean(
        "active-symbols-market-change"
      );


      marketBuffer.reset();


      latencyMonitor.reset();


      state.latency =
        latencyMonitor.current;


      derivAPI.changeSymbol(
        state.symbol
      );


      setText(
        UI.marketName,
        marketRegistry.all()[
          state.symbol
        ]?.name ||
          state.symbol
      );

    }


    setText(
      UI.marketRegistryMessage,
      `${items.length} símbolos recibidos; se mostraron los mercados compatibles con la estrategia.`
    );


    renderTicker();

    renderControls();

  }
);


derivAPI.on(
  "state",
  ({
    state:
      status,
    label
  }) =>
    renderConnection(
      status,
      label
    )
);


derivAPI.on(
  "tick",
  processTick
);


derivAPI.on(
  "error",
  ({
    message
  }) =>
    log(
      message,
      "error"
    )
);


derivAPI.on(
  "log",
  ({
    message,
    level
  }) =>
    log(
      message,
      level
    )
);


/* ==========================================
   MEMORIA
   ========================================== */

memoryManager.register(
  () => {

    clearInterval(
      state.countdownTimer
    );


    clearTimeout(
      state.cooldownTimer
    );


    state.predictionActive =
      false;


    state.cooldown =
      false;


    hideFloating();

  }
);


/* ==========================================
   CIERRE
   ========================================== */

window.addEventListener(
  "beforeunload",
  () => {

    derivAPI.disconnect();


    memoryManager.clean(
      "before-unload"
    );

  }
);


/* ==========================================
   INICIAR
   ========================================== */

init()
  .catch(
    (
      error
    ) => {

      diagnostics.error(
        "Error durante init().",
        {
          name:
            error.name,

          message:
            error.message,

          stack:
            error.stack
        }
      );

    }
  );


/* ==========================================
   FIN APP.JS
   FIX13.3 SYNC
   ========================================== */ORTANTE:
   FIX13.2 SOLO OBSERVA Y COMPARA.
   NO BLOQUEA OPERACIONES TODAVÍA.
   ========================================== */


import {
  contractMapper
} from "./contract-mapper.js";

import {
  proposalSimulator
} from "./proposal-simulator.js";

import {
  derivProposal
} from "./deriv-proposal.js";

import {
  derivTrade
} from "./deriv-trade.js";


/* ==========================================
   STORAGE
   ========================================== */

const TELEMETRY_KEY =
  "BOT_V1_MR_FIX8_TELEMETRY";

const CALIBRATION_KEY =
  "BOT_V1_MR_FIX11_CALIBRATION";


/* ==========================================
   VERSIONES
   ========================================== */

const TELEMETRY_VERSION =
  "FIX13.2";

const TIMING_BASE_VERSION =
  "FIX12";

const TIMING_COMPATIBLE_VERSIONS = [

  "FIX12",
  "FIX13",
  "FIX13.1",
  "FIX13.2"

];

const SIGNAL_PROFILE_VERSIONS = [

  "FIX13",
  "FIX13.1",
  "FIX13.2"

];


/* ==========================================
   CONTROL PERFIL FIX13.2
   ========================================== */

/*
  Estos límites NO bloquean operaciones.

  Solamente deciden cuándo un patrón
  tiene suficientes observaciones para
  mostrarse como hallazgo exploratorio.
*/

const PROFILE_CONTROL = {

  minimumPatternSamples:
    4,

  minimumStrongSamples:
    8,

  meaningfulGapPercent:
    20,

  strongGapPercent:
    30,

  maxHallazgos:
    8

};


/* ==========================================
   LÍMITES TIMING
   ========================================== */

const TIMING_LIMITS = {

  bridgeToProcessMaxMs:
    1000,

  proposalMaxMs:
    1500,

  buyConfirmationMaxMs:
    1500,

  targetDeviationMaxAbsMs:
    750,

  waitOvershootMaxMs:
    500

};


/* ==========================================
   MERCADOS STANDARD
   ========================================== */

const MERCADOS_STANDARD = [

  "R_10",
  "R_25",
  "R_50",
  "R_75",
  "R_100"

];


/* ==========================================
   MERCADOS 1S
   ========================================== */

const MERCADOS_1S = [

  "1HZ10V",
  "1HZ15V",
  "1HZ25V",
  "1HZ30V",
  "1HZ50V",
  "1HZ75V",
  "1HZ100V"

];


/* ==========================================
   TODOS LOS MERCADOS
   ========================================== */

const MERCADOS_CONTROLADOS = [

  ...MERCADOS_STANDARD,
  ...MERCADOS_1S

];


/* ==========================================
   AJUSTES PERMITIDOS
   ========================================== */

const AJUSTES_PERMITIDOS_MS = [

  -300,
  -200,
  -100,
  0,
  100,
  200,
  300

];


/* ==========================================
   CALIBRACIÓN INICIAL
   ========================================== */

const CALIBRACION_INICIAL = {

  R_10:
    0,

  R_25:
    0,

  R_50:
    0,

  R_75:
    0,

  R_100:
    0,

  "1HZ10V":
    0,

  "1HZ15V":
    0,

  "1HZ25V":
    0,

  "1HZ30V":
    0,

  "1HZ50V":
    0,

  "1HZ75V":
    0,

  "1HZ100V":
    0

};


/* ==========================================
   BOT ENGINE
   ========================================== */

class BotEngine {

  constructor() {

    this.activo =
      false;

    this.pausado =
      false;

    this.ultimaSenalProcesada =
      null;

    this.senalesEnProceso =
      new Set();

    this.modo =
      "DERIV DEMO + FIX13.2 SIGNAL PROFILE";

    this.ultimoContrato =
      null;

    this.ultimaPropuesta =
      null;

    this.ultimaPropuestaDeriv =
      null;

    this.ultimaCompraDemo =
      null;

    this.ultimoResultadoDemo =
      null;

    this.ultimaTelemetria =
      null;


    this.configuracion = {

      monto:
        1,

      moneda:
        "USD",

      duracion:
        1,

      unidadDuracion:
        "t"

    };


    this.calibracion =
      this.cargarCalibracion();

  }


  /* ========================================
     RELOJ
     ======================================== */

  ahora() {

    if (
      typeof performance !==
        "undefined" &&
      typeof performance.now ===
        "function"
    ) {

      return performance.now();

    }


    return Date.now();

  }


  /* ========================================
     ESPERA
     ======================================== */

  esperar(
    ms
  ) {

    const tiempo =
      Number(
        ms
      );


    if (
      !Number.isFinite(
        tiempo
      ) ||
      tiempo <=
        0
    ) {

      return Promise.resolve();

    }


    return new Promise(
      (
        resolve
      ) => {

        setTimeout(
          resolve,
          tiempo
        );

      }
    );

  }


  /* ========================================
     REDONDEO
     ======================================== */

  redondear(
    valor
  ) {

    const numero =
      Number(
        valor
      );


    if (
      !Number.isFinite(
        numero
      )
    ) {

      return null;

    }


    return (
      Math.round(
        numero *
        100
      ) /
      100
    );

  }


  /* ========================================
     VALORES VÁLIDOS
     ======================================== */

  valoresValidos(
    valores
  ) {

    return valores
      .map(
        Number
      )
      .filter(
        Number.isFinite
      );

  }


  /* ========================================
     PROMEDIO
     ======================================== */

  promedio(
    valores
  ) {

    const validos =
      this.valoresValidos(
        valores
      );


    if (
      !validos.length
    ) {

      return null;

    }


    const suma =
      validos.reduce(
        (
          acumulado,
          valor
        ) =>
          acumulado +
          valor,
        0
      );


    return this.redondear(
      suma /
      validos.length
    );

  }


  /* ========================================
     MEDIANA
     ======================================== */

  mediana(
    valores
  ) {

    const validos =
      this.valoresValidos(
        valores
      )
        .sort(
          (
            a,
            b
          ) =>
            a - b
        );


    if (
      !validos.length
    ) {

      return null;

    }


    const mitad =
      Math.floor(
        validos.length /
        2
      );


    if (
      validos.length %
        2 ===
      0
    ) {

      return this.redondear(
        (
          validos[
            mitad - 1
          ] +
          validos[
            mitad
          ]
        ) /
        2
      );

    }


    return this.redondear(
      validos[
        mitad
      ]
    );

  }


  /* ========================================
     MÍNIMO
     ======================================== */

  minimo(
    valores
  ) {

    const validos =
      this.valoresValidos(
        valores
      );


    if (
      !validos.length
    ) {

      return null;

    }


    return this.redondear(
      Math.min(
        ...validos
      )
    );

  }


  /* ========================================
     MÁXIMO
     ======================================== */

  maximo(
    valores
  ) {

    const validos =
      this.valoresValidos(
        valores
      );


    if (
      !validos.length
    ) {

      return null;

    }


    return this.redondear(
      Math.max(
        ...validos
      )
    );

  }


  /* ========================================
     NORMALIZAR TEXTO
     ======================================== */

  normalizarTexto(
    valor
  ) {

    if (
      valor ===
        undefined ||
      valor ===
        null
    ) {

      return null;

    }


    const texto =
      String(
        valor
      )
        .trim()
        .toUpperCase();


    return texto ||
      null;

  }


  /* ========================================
     NORMALIZAR MERCADO
     ======================================== */

  normalizarMercado(
    mercado
  ) {

    return String(
      mercado ||
      ""
    )
      .trim()
      .toUpperCase();

  }


  /* ========================================
     FAMILIA MERCADO
     ======================================== */

  obtenerFamiliaMercado(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    if (
      symbol.startsWith(
        "1HZ"
      )
    ) {

      return "1S";

    }


    if (
      symbol.startsWith(
        "R_"
      )
    ) {

      return "STANDARD";

    }


    return "OTHER";

  }


  /* ========================================
     MERCADO CONTROLADO
     ======================================== */

  mercadoControlado(
    mercado
  ) {

    return MERCADOS_CONTROLADOS
      .includes(
        this.normalizarMercado(
          mercado
        )
      );

  }


  /* ========================================
     REFERENCIA HISTÓRICA
     ======================================== */

  obtenerRetrasoReferencia(
    mercado
  ) {

    const familia =
      this.obtenerFamiliaMercado(
        mercado
      );


    if (
      familia ===
        "1S"
    ) {

      return 100;

    }


    if (
      familia ===
        "STANDARD"
    ) {

      return 0;

    }


    return null;

  }


  /* ========================================
     CARGAR CALIBRACIÓN
     ======================================== */

  cargarCalibracion() {

    try {

      const guardada =
        JSON.parse(
          localStorage.getItem(
            CALIBRATION_KEY
          ) ||
          "{}"
        );


      const resultado =
        {
          ...CALIBRACION_INICIAL
        };


      for (
        const mercado
        of MERCADOS_CONTROLADOS
      ) {

        const valor =
          Number(
            guardada[
              mercado
            ]
          );


        if (
          AJUSTES_PERMITIDOS_MS
            .includes(
              valor
            )
        ) {

          resultado[
            mercado
          ] =
            valor;

        }

      }


      return resultado;

    }

    catch {

      return {
        ...CALIBRACION_INICIAL
      };

    }

  }


  /* ========================================
     GUARDAR CALIBRACIÓN
     ======================================== */

  guardarCalibracion() {

    try {

      localStorage.setItem(
        CALIBRATION_KEY,
        JSON.stringify(
          this.calibracion
        )
      );


      return true;

    }

    catch {

      return false;

    }

  }


  /* ========================================
     OBTENER AJUSTE
     ======================================== */

  obtenerAjusteMercado(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const valor =
      Number(
        this.calibracion[
          symbol
        ]
      );


    if (
      AJUSTES_PERMITIDOS_MS
        .includes(
          valor
        )
    ) {

      return valor;

    }


    return 0;

  }


  /* ========================================
     ESTABLECER AJUSTE
     ======================================== */

  establecerAjusteMercado(
    mercado,
    ajusteMs
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const valor =
      Number(
        ajusteMs
      );


    if (
      !this.mercadoControlado(
        symbol
      )
    ) {

      return {

        ok:
          false,

        mensaje:
          "Mercado no controlado."

      };

    }


    if (
      !AJUSTES_PERMITIDOS_MS
        .includes(
          valor
        )
    ) {

      return {

        ok:
          false,

        mensaje:
          "Ajuste no permitido."

      };

    }


    this.calibracion[
      symbol
    ] =
      valor;


    this.guardarCalibracion();


    return {

      ok:
        true,

      mercado:
        symbol,

      ajusteMs:
        valor,

      ajusteSeg:
        valor /
        1000,

      mensaje:
        `Calibración ${symbol}: ${
          valor >
            0
            ? "+"
            : ""
        }${valor} ms`

    };

  }


  /* ========================================
     RESET CALIBRACIÓN
     ======================================== */

  restablecerCalibracion() {

    this.calibracion =
      {
        ...CALIBRACION_INICIAL
      };


    this.guardarCalibracion();


    return {

      ok:
        true,

      mensaje:
        "Calibración restablecida a 0 ms."

    };

  }


  /* ========================================
     TARGET
     ======================================== */

  obtenerTargetExecutionAt(
    senal
  ) {

    const directo =
      Number(
        senal
          ?.targetExecutionAt
      );


    if (
      Number.isFinite(
        directo
      ) &&
      directo >
        0
    ) {

      return directo;

    }


    const metadata =
      Number(
        senal
          ?.metadata
          ?.targetExecutionAt
      );


    if (
      Number.isFinite(
        metadata
      ) &&
      metadata >
        0
    ) {

      return metadata;

    }


    return null;

  }


  /* ========================================
     PROGRAMACIÓN
     ======================================== */

  calcularProgramacion(
    senal
  ) {

    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );


    const ajusteMs =
      this.obtenerAjusteMercado(
        mercado
      );


    const targetExecutionAt =
      this.obtenerTargetExecutionAt(
        senal
      );


    if (
      targetExecutionAt ===
        null
    ) {

      return {

        disponible:
          false,

        mercado,

        ajusteMs,

        ajusteSeg:
          ajusteMs /
          1000,

        targetExecutionAt:
          null,

        programmedAt:
          null,

        esperaMs:
          0,

        puedeAnticipar:
          false,

        motivo:
          "La señal no incluye targetExecutionAt."

      };

    }


    const programmedAt =
      targetExecutionAt +
      ajusteMs;


    const ahoraEpoch =
      Date.now();


    return {

      disponible:
        true,

      mercado,

      ajusteMs,

      ajusteSeg:
        ajusteMs /
        1000,

      targetExecutionAt,

      programmedAt,

      esperaMs:
        Math.max(
          0,
          programmedAt -
          ahoraEpoch
        ),

      puedeAnticipar:
        programmedAt >
        ahoraEpoch,

      motivo:
        programmedAt >
          ahoraEpoch
          ? "Programación válida."
          : "El instante programado ya ocurrió."

    };

  }


  /* ========================================
     CONTROL BOT
     ======================================== */

  iniciar() {

    this.activo =
      true;

    this.pausado =
      false;


    return {

      ok:
        true,

      mensaje:
        "Bot iniciado."

    };

  }


  pausar() {

    this.pausado =
      true;


    return {

      ok:
        true,

      mensaje:
        "Bot pausado."

    };

  }


  reanudar() {

    this.pausado =
      false;


    return {

      ok:
        true,

      mensaje:
        "Bot reanudado."

    };

  }


  detener() {

    this.activo =
      false;

    this.pausado =
      false;


    return {

      ok:
        true,

      mensaje:
        "Bot detenido."

    };

  }


  activarEjecucionDemo() {

    return derivTrade
      .activar();

  }


  desactivarEjecucionDemo() {

    return derivTrade
      .desactivar();

  }


  puedeProcesar() {

    if (
      !this.activo
    ) {

      return {

        ok:
          false,

        motivo:
          "El bot está apagado."

      };

    }


    if (
      this.pausado
    ) {

      return {

        ok:
          false,

        motivo:
          "El bot está pausado."

      };

    }


    return {

      ok:
        true

    };

  }


  /* ========================================
     CLASIFICACIÓN CONFIANZA FIX13.2
     ======================================== */

  clasificarConfianza(
    confianza
  ) {

    const valor =
      Number(
        confianza
      );


    if (
      !Number.isFinite(
        valor
      )
    ) {

      return "SIN_DATO";

    }


    if (
      valor <
      75
    ) {

      return "<75";

    }


    if (
      valor <
      80
    ) {

      return "75-79";

    }


    if (
      valor <
      85
    ) {

      return "80-84";

    }


    if (
      valor <
      90
    ) {

      return "85-89";

    }


    return "90-100";

  }


  /* ========================================
     CLASIFICACIÓN RSI FIX13.2
     ======================================== */

  clasificarRsi(
    rsi
  ) {

    const valor =
      Number(
        rsi
      );


    if (
      !Number.isFinite(
        valor
      )
    ) {

      return "SIN_DATO";

    }


    if (
      valor <=
      30
    ) {

      return "0-30";

    }


    if (
      valor <=
      44
    ) {

      return "31-44";

    }


    if (
      valor <=
      55
    ) {

      return "45-55";

    }


    if (
      valor <=
      69
    ) {

      return "56-69";

    }


    return "70-100";

  }


  /* ========================================
     CLASIFICAR DÍGITO
     ======================================== */

  clasificarDigito(
    digito
  ) {

    const valor =
      Number(
        digito
      );


    if (
      !Number.isInteger(
        valor
      ) ||
      valor <
        0 ||
      valor >
        9
    ) {

      return "SIN_DATO";

    }


    if (
      valor <=
      2
    ) {

      return "0-2";

    }


    if (
      valor <=
      5
    ) {

      return "3-5";

    }


    return "6-9";

  }


  /* ========================================
     PERFIL DE SEÑAL
     ======================================== */

  crearPerfilSenal(
    senal
  ) {

    const confianza =
      Number(
        senal?.confianza
      );


    const rsi =
      Number(
        senal?.rsi
      );


    const ultimoDigito =
      Number(
        senal?.ultimoDigito
      );


    const tendencia =
      this.normalizarTexto(
        senal?.tendencia
      );


    const momentum =
      this.normalizarTexto(
        senal?.momentum
      );


    const direccion =
      this.normalizarTexto(
        senal?.direccion
      );


    const ultimoDigitoValido =
      Number.isInteger(
        ultimoDigito
      ) &&
      ultimoDigito >=
        0 &&
      ultimoDigito <=
        9;


    return {

      direccion,

      confianza:
        Number.isFinite(
          confianza
        )
          ? confianza
          : null,

      zonaConfianza:
        this.clasificarConfianza(
          confianza
        ),

      tendencia,

      rsi:
        Number.isFinite(
          rsi
        )
          ? rsi
          : null,

      zonaRsi:
        this.clasificarRsi(
          rsi
        ),

      momentum,

      tendenciaMomentum:
        tendencia &&
        momentum
          ? tendencia ===
              momentum
            ? "ALINEADOS"
            : "NO_ALINEADOS"
          : "SIN_DATO",

      volatilidad:
        this.normalizarTexto(
          senal?.volatilidad
        ),

      ultimoDigito:
        ultimoDigitoValido
          ? ultimoDigito
          : null,

      zonaDigito:
        this.clasificarDigito(
          ultimoDigito
        ),

      ultimoDigitoPar:
        ultimoDigitoValido
          ? ultimoDigito %
              2 ===
            0
          : null,

      paridadUltimoDigito:
        ultimoDigitoValido
          ? ultimoDigito %
                2 ===
              0
            ? "PAR"
            : "IMPAR"
          : "SIN_DATO",

      modo:
        senal?.modo ??
        null,

      origen:
        senal?.origen ??
        senal
          ?.metadata
          ?.origen ??
        null

    };

  }


  /* ========================================
     CREAR TELEMETRÍA FIX13.2
     ======================================== */

  crearTelemetria(
    senal,
    senalRecibidaPerf =
      null
  ) {

    /*
      Se conserva por compatibilidad
      con bot.js.

      FIX13.2 no utiliza performance.now()
      externo para Bridge -> Proceso.
    */

    void senalRecibidaPerf;


    const ahoraPerf =
      this.ahora();


    const ahoraEpoch =
      Date.now();


    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );


    const retrasoReferenciaMs =
      this.obtenerRetrasoReferencia(
        mercado
      );


    const programacion =
      this.calcularProgramacion(
        senal
      );


    const perfilSenal =
      this.crearPerfilSenal(
        senal
      );


    const marcaEpochSenal =
      Number(
        senal
          ?.bridgeReceivedEpoch ??
        senal
          ?.timestamp
      );


    const signalReceivedEpoch =
      Number.isFinite(
        marcaEpochSenal
      )
        ? marcaEpochSenal
        : ahoraEpoch;


    return {

      id:
        `${Date.now()}-${Math.floor(
          Math.random() *
          100000
        )}`,

      version:
        TELEMETRY_VERSION,

      timingBase:
        TIMING_BASE_VERSION,

      signalId:
        senal?.id ??
        null,

      mercado,

      mercadoControlado:
        this.mercadoControlado(
          mercado
        ),

      familiaMercado:
        this.obtenerFamiliaMercado(
          mercado
        ),

      estrategia:
        senal?.estrategia ??
        null,

      direccion:
        perfilSenal
          .direccion,

      confianza:
        perfilSenal
          .confianza,

      zonaConfianza:
        perfilSenal
          .zonaConfianza,

      tendencia:
        perfilSenal
          .tendencia,

      rsi:
        perfilSenal
          .rsi,

      zonaRsi:
        perfilSenal
          .zonaRsi,

      momentum:
        perfilSenal
          .momentum,

      tendenciaMomentum:
        perfilSenal
          .tendenciaMomentum,

      volatilidad:
        perfilSenal
          .volatilidad,

      ultimoDigito:
        perfilSenal
          .ultimoDigito,

      zonaDigito:
        perfilSenal
          .zonaDigito,

      ultimoDigitoPar:
        perfilSenal
          .ultimoDigitoPar,

      paridadUltimoDigito:
        perfilSenal
          .paridadUltimoDigito,

      perfilSenal:
        {
          ...perfilSenal
        },

      puntoEntrada:
        senal?.segundosEntrada ??
        null,

      retrasoReferenciaMs,

      retrasoReferenciaSeg:
        retrasoReferenciaMs !==
          null
          ? retrasoReferenciaMs /
            1000
          : null,


      /* ====================================
         CALIBRACIÓN
         ==================================== */

      calibracionMs:
        programacion
          .ajusteMs,

      calibracionSeg:
        programacion
          .ajusteSeg,

      targetExecutionAt:
        programacion
          .targetExecutionAt,

      programmedExecutionAt:
        programacion
          .programmedAt,

      programacionDisponible:
        programacion
          .disponible,

      esperaProgramadaInicialMs:
        programacion
          .esperaMs,

      esperaProgramadaMs:
        programacion
          .esperaMs,

      puedeAnticipar:
        programacion
          .puedeAnticipar,

      programacionMotivo:
        programacion
          .motivo,


      /* ====================================
         EPOCH
         ==================================== */

      signalReceivedEpoch,

      processStartedEpoch:
        ahoraEpoch,

      proposalRequestedEpoch:
        null,

      proposalReceivedEpoch:
        null,

      waitStartedEpoch:
        null,

      waitEndedEpoch:
        null,

      buyRequestedEpoch:
        null,

      buyConfirmedEpoch:
        null,

      resultReceivedEpoch:
        null,


      /* ====================================
         PERFORMANCE LOCAL BOT
         ==================================== */

      modo:
        senal?.modo ??
        null,

      signalReceivedPerf:
        ahoraPerf,

      processStartedPerf:
        ahoraPerf,

      proposalRequestedPerf:
        null,

      proposalReceivedPerf:
        null,

      calibrationWaitStartedPerf:
        null,

      calibrationWaitEndedPerf:
        null,

      buyRequestedPerf:
        null,

      buyConfirmedPerf:
        null,

      resultReceivedPerf:
        null,


      /* ====================================
         MÉTRICAS
         ==================================== */

      bridgeToProcessMs:
        null,

      signalToProposalRequestMs:
        null,

      signalToProposalReceivedMs:
        null,

      processToProposalRequestMs:
        null,

      proposalLatencyMs:
        null,

      calibrationWaitActualMs:
        null,

      calibrationWaitOvershootMs:
        null,

      proposalToBuyMs:
        null,

      processToBuyMs:
        null,

      signalToBuyMs:
        null,

      signalToBuyConfirmMs:
        null,

      buyLatencyMs:
        null,

      buyTargetDeviationMs:
        null,

      buyConfirmTargetDeviationMs:
        null,

      totalUntilResultMs:
        null,


      /* ====================================
         TIMING
         ==================================== */

      timingValido:
        false,

      timingClasificacion:
        "PENDIENTE",

      timingAnomalias:
        [],

      usableForTimingComparator:
        false,


      /* ====================================
         PERFIL
         ==================================== */

      usableForSignalProfile:
        false,


      /* ====================================
         RESULTADO
         ==================================== */

      contractId:
        null,

      resultado:
        null,

      profit:
        null,

      source:
        null,

      createdAt:
        Date.now()

    };

  }


  /* ========================================
     CALCULAR TELEMETRÍA
     ======================================== */

  calcularTelemetria(
    t
  ) {

    const diferencia = (
      inicio,
      fin
    ) => {

      if (
        Number.isFinite(
          inicio
        ) &&
        Number.isFinite(
          fin
        )
      ) {

        return this.redondear(
          fin -
          inicio
        );

      }


      return null;

    };


    /* ======================================
       BRIDGE -> PROCESO FIX13.1+
       ====================================== */

    if (
      Number.isFinite(
        Number(
          t.signalReceivedEpoch
        )
      ) &&
      Number.isFinite(
        Number(
          t.processStartedEpoch
        )
      )
    ) {

      t.bridgeToProcessMs =
        this.redondear(
          Number(
            t.processStartedEpoch
          ) -
          Number(
            t.signalReceivedEpoch
          )
        );

    }

    else {

      t.bridgeToProcessMs =
        null;

    }


    t.signalToProposalRequestMs =
      diferencia(
        t.signalReceivedPerf,
        t.proposalRequestedPerf
      );


    t.signalToProposalReceivedMs =
      diferencia(
        t.signalReceivedPerf,
        t.proposalReceivedPerf
      );


    t.processToProposalRequestMs =
      diferencia(
        t.processStartedPerf,
        t.proposalRequestedPerf
      );


    t.proposalLatencyMs =
      diferencia(
        t.proposalRequestedPerf,
        t.proposalReceivedPerf
      );


    t.calibrationWaitActualMs =
      diferencia(
        t.calibrationWaitStartedPerf,
        t.calibrationWaitEndedPerf
      );


    if (
      Number.isFinite(
        t.calibrationWaitActualMs
      ) &&
      Number.isFinite(
        t.esperaProgramadaMs
      )
    ) {

      t.calibrationWaitOvershootMs =
        this.redondear(
          t.calibrationWaitActualMs -
          t.esperaProgramadaMs
        );

    }


    t.proposalToBuyMs =
      diferencia(
        t.proposalReceivedPerf,
        t.buyRequestedPerf
      );


    t.processToBuyMs =
      diferencia(
        t.processStartedPerf,
        t.buyRequestedPerf
      );


    t.signalToBuyMs =
      diferencia(
        t.signalReceivedPerf,
        t.buyRequestedPerf
      );


    t.buyLatencyMs =
      diferencia(
        t.buyRequestedPerf,
        t.buyConfirmedPerf
      );


    t.signalToBuyConfirmMs =
      diferencia(
        t.signalReceivedPerf,
        t.buyConfirmedPerf
      );


    t.totalUntilResultMs =
      diferencia(
        t.signalReceivedPerf,
        t.resultReceivedPerf
      );


    this.clasificarTiming(
      t
    );


    t.usableForSignalProfile =
      (
        t.resultado ===
          "GANADA" ||
        t.resultado ===
          "PERDIDA"
      );


    return t;

  }


  /* ========================================
     CLASIFICAR TIMING
     ======================================== */

  clasificarTiming(
    t
  ) {

    const anomalias =
      [];


    if (
      !TIMING_COMPATIBLE_VERSIONS
        .includes(
          String(
            t.version
          )
        )
    ) {

      t.timingValido =
        false;

      t.timingClasificacion =
        "LEGACY";

      t.timingAnomalias =
        [
          "Registro anterior al timing limpio."
        ];

      t.usableForTimingComparator =
        false;


      return t;

    }


    if (
      !t.programacionDisponible
    ) {

      anomalias.push(
        "Sin targetExecutionAt."
      );

    }


    if (
      Number.isFinite(
        t.bridgeToProcessMs
      ) &&
      (
        t.bridgeToProcessMs <
          0 ||
        t.bridgeToProcessMs >
          TIMING_LIMITS
            .bridgeToProcessMaxMs
      )
    ) {

      anomalias.push(
        `Bridge→Proceso alto: ${t.bridgeToProcessMs} ms`
      );

    }


    if (
      Number.isFinite(
        t.proposalLatencyMs
      ) &&
      (
        t.proposalLatencyMs <
          0 ||
        t.proposalLatencyMs >
          TIMING_LIMITS
            .proposalMaxMs
      )
    ) {

      anomalias.push(
        `Cotización anómala: ${t.proposalLatencyMs} ms`
      );

    }


    if (
      Number.isFinite(
        t.buyLatencyMs
      ) &&
      (
        t.buyLatencyMs <
          0 ||
        t.buyLatencyMs >
          TIMING_LIMITS
            .buyConfirmationMaxMs
      )
    ) {

      anomalias.push(
        `BUY→confirmación anómalo: ${t.buyLatencyMs} ms`
      );

    }


    if (
      Number.isFinite(
        t.buyTargetDeviationMs
      ) &&
      Math.abs(
        t.buyTargetDeviationMs
      ) >
        TIMING_LIMITS
          .targetDeviationMaxAbsMs
    ) {

      anomalias.push(
        `Desviación target alta: ${t.buyTargetDeviationMs} ms`
      );

    }


    if (
      Number.isFinite(
        t.calibrationWaitOvershootMs
      ) &&
      Math.abs(
        t.calibrationWaitOvershootMs
      ) >
        TIMING_LIMITS
          .waitOvershootMaxMs
    ) {

      anomalias.push(
        `Espera excedida: ${t.calibrationWaitOvershootMs} ms`
      );

    }


    if (
      !Number.isFinite(
        t.proposalLatencyMs
      )
    ) {

      anomalias.push(
        "Cotización sin medición."
      );

    }


    if (
      !Number.isFinite(
        t.buyTargetDeviationMs
      )
    ) {

      anomalias.push(
        "Desviación target sin medición."
      );

    }


    if (
      !Number.isFinite(
        t.buyLatencyMs
      )
    ) {

      anomalias.push(
        "BUY sin confirmación medible."
      );

    }


    t.timingAnomalias =
      anomalias;


    t.timingValido =
      anomalias.length ===
      0;


    t.timingClasificacion =
      t.timingValido
        ? "VALIDO"
        : "ANOMALO";


    t.usableForTimingComparator =
      t.timingValido &&
      (
        t.resultado ===
          "GANADA" ||
        t.resultado ===
          "PERDIDA"
      );


    return t;

  }


  /* ========================================
     HISTORIAL
     ======================================== */

  obtenerHistorialTelemetria() {

    try {

      const datos =
        JSON.parse(
          localStorage.getItem(
            TELEMETRY_KEY
          ) ||
          "[]"
        );


      return Array.isArray(
        datos
      )
        ? datos
        : [];

    }

    catch {

      return [];

    }

  }


  /* ========================================
     GUARDAR TELEMETRÍA
     ======================================== */

  guardarTelemetria(
    telemetria
  ) {

    this.calcularTelemetria(
      telemetria
    );


    this.ultimaTelemetria =
      {
        ...telemetria
      };


    try {

      const historial =
        this.obtenerHistorialTelemetria();


      historial.unshift(
        {
          ...telemetria
        }
      );


      if (
        historial.length >
        2000
      ) {

        historial.length =
          2000;

      }


      localStorage.setItem(
        TELEMETRY_KEY,
        JSON.stringify(
          historial
        )
      );

    }

    catch (
      error
    ) {

      console.warn(
        "No se pudo guardar telemetría FIX13.2:",
        error
      );

    }


    return telemetria;

  }


  /* ========================================
     TELEMETRÍA POR MERCADO
     ======================================== */

  obtenerTelemetriaPorMercado(
    mercado
  ) {

    const buscado =
      this.normalizarMercado(
        mercado
      );


    return this
      .obtenerHistorialTelemetria()
      .filter(
        (
          item
        ) =>
          this.normalizarMercado(
            item?.mercado
          ) ===
          buscado
      );

  }


  /* ========================================
     TELEMETRÍA POR FAMILIA
     ======================================== */

  obtenerTelemetriaPorFamilia(
    familia
  ) {

    const buscada =
      String(
        familia ||
        ""
      )
        .trim()
        .toUpperCase();


    return this
      .obtenerHistorialTelemetria()
      .filter(
        (
          item
        ) =>
          String(
            item?.familiaMercado ||
            ""
          )
            .toUpperCase() ===
          buscada
      );

  }


  /* ========================================
     TELEMETRÍA POR CALIBRACIÓN
     ======================================== */

  obtenerTelemetriaPorCalibracion(
    mercado,
    ajusteMs
  ) {

    const ajuste =
      Number(
        ajusteMs
      );


    return this
      .obtenerTelemetriaPorMercado(
        mercado
      )
      .filter(
        (
          item
        ) =>
          Number(
            item?.calibracionMs ??
            0
          ) ===
          ajuste
      );

  }


  /* ========================================
     TIMING VÁLIDO
     ======================================== */

  filtrarTimingValido(
    datos
  ) {

    return datos.filter(
      (
        item
      ) =>
        TIMING_COMPATIBLE_VERSIONS
          .includes(
            String(
              item?.version
            )
          ) &&
        item?.timingValido ===
          true &&
        item
          ?.usableForTimingComparator ===
          true
    );

  }


  /* ========================================
     PERFIL FIX13+
     ======================================== */

  filtrarPerfilFix13(
    datos
  ) {

    return datos.filter(
      (
        item
      ) =>
        SIGNAL_PROFILE_VERSIONS
          .includes(
            String(
              item?.version
            )
          ) &&
        (
          item?.resultado ===
            "GANADA" ||
          item?.resultado ===
            "PERDIDA"
        )
    );

  }


  /* ========================================
     MÉTRICAS TIMING
     ======================================== */

  construirMetricasGrupo(
    datos
  ) {

    const extraer = (
      campo
    ) =>
      datos.map(
        (
          item
        ) =>
          item?.[
            campo
          ]
      );


    return {

      cantidad:
        datos.length,

      promedioSignalToBuyMs:
        this.promedio(
          extraer(
            "signalToBuyMs"
          )
        ),

      medianaSignalToBuyMs:
        this.mediana(
          extraer(
            "signalToBuyMs"
          )
        ),

      minimoSignalToBuyMs:
        this.minimo(
          extraer(
            "signalToBuyMs"
          )
        ),

      maximoSignalToBuyMs:
        this.maximo(
          extraer(
            "signalToBuyMs"
          )
        ),

      promedioProposalMs:
        this.promedio(
          extraer(
            "proposalLatencyMs"
          )
        ),

      medianaProposalMs:
        this.mediana(
          extraer(
            "proposalLatencyMs"
          )
        ),

      promedioProposalToBuyMs:
        this.promedio(
          extraer(
            "proposalToBuyMs"
          )
        ),

      promedioEsperaMs:
        this.promedio(
          extraer(
            "calibrationWaitActualMs"
          )
        ),

      promedioBuyMs:
        this.promedio(
          extraer(
            "buyLatencyMs"
          )
        ),

      medianaBuyMs:
        this.mediana(
          extraer(
            "buyLatencyMs"
          )
        ),

      promedioDesviacionTargetMs:
        this.promedio(
          extraer(
            "buyTargetDeviationMs"
          )
        ),

      medianaDesviacionTargetMs:
        this.mediana(
          extraer(
            "buyTargetDeviationMs"
          )
        )

    };

  }


  /* ========================================
     COMPARADOR TIMING
     ======================================== */

  construirComparadorTiming(
    datos
  ) {

    const finalizadas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA" ||
          item.resultado ===
            "PERDIDA"
      );


    const timingValido =
      this.filtrarTimingValido(
        finalizadas
      );


    const ganadas =
      timingValido.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA"
      );


    const perdidas =
      timingValido.filter(
        (
          item
        ) =>
          item.resultado ===
            "PERDIDA"
      );


    const metricasGanadas =
      this.construirMetricasGrupo(
        ganadas
      );


    const metricasPerdidas =
      this.construirMetricasGrupo(
        perdidas
      );


    let diferenciaPromedioMs =
      null;


    let diferenciaMedianaMs =
      null;


    let diferenciaTargetMedianaMs =
      null;


    if (
      metricasGanadas
        .promedioSignalToBuyMs !==
        null &&
      metricasPerdidas
        .promedioSignalToBuyMs !==
        null
    ) {

      diferenciaPromedioMs =
        this.redondear(
          metricasPerdidas
            .promedioSignalToBuyMs -
          metricasGanadas
            .promedioSignalToBuyMs
        );

    }


    if (
      metricasGanadas
        .medianaSignalToBuyMs !==
        null &&
      metricasPerdidas
        .medianaSignalToBuyMs !==
        null
    ) {

      diferenciaMedianaMs =
        this.redondear(
          metricasPerdidas
            .medianaSignalToBuyMs -
          metricasGanadas
            .medianaSignalToBuyMs
        );

    }


    if (
      metricasGanadas
        .medianaDesviacionTargetMs !==
        null &&
      metricasPerdidas
        .medianaDesviacionTargetMs !==
        null
    ) {

      diferenciaTargetMedianaMs =
        this.redondear(
          metricasPerdidas
            .medianaDesviacionTargetMs -
          metricasGanadas
            .medianaDesviacionTargetMs
        );

    }


    let lectura =
      "ESPERANDO MUESTRAS";


    if (
      ganadas.length >=
        3 &&
      perdidas.length >=
        3
    ) {

      if (
        diferenciaTargetMedianaMs !==
          null
      ) {

        if (
          diferenciaTargetMedianaMs >
          40
        ) {

          lectura =
            "GANADAS MÁS CERCA DEL TARGET TEMPRANO";

        }

        else if (
          diferenciaTargetMedianaMs <
          -40
        ) {

          lectura =
            "GANADAS MÁS CERCA DEL TARGET TARDÍO";

        }

        else {

          lectura =
            "TARGET MUY SIMILAR";

        }

      }

      else if (
        diferenciaMedianaMs !==
          null
      ) {

        if (
          diferenciaMedianaMs >
          40
        ) {

          lectura =
            "GANADAS ENTRAN MÁS RÁPIDO";

        }

        else if (
          diferenciaMedianaMs <
          -40
        ) {

          lectura =
            "GANADAS ENTRAN MÁS TARDE";

        }

        else {

          lectura =
            "TIMING MUY SIMILAR";

        }

      }

    }


    return {

      totalHistorico:
        finalizadas.length,

      totalTimingValido:
        timingValido.length,

      totalTimingDescartado:
        finalizadas.length -
        timingValido.length,

      ganadas:
        metricasGanadas,

      perdidas:
        metricasPerdidas,

      diferenciaPromedioMs,

      diferenciaMedianaMs,

      diferenciaTargetMedianaMs,

      lectura

    };

  }


  /* ========================================
     PERFIL NUMÉRICO
     ======================================== */

  construirPerfilNumerico(
    datos,
    campo
  ) {

    const ganadas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA"
      );


    const perdidas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
            "PERDIDA"
      );


    return {

      promedioTotal:
        this.promedio(
          datos.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      promedioGanadas:
        this.promedio(
          ganadas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      promedioPerdidas:
        this.promedio(
          perdidas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      medianaGanadas:
        this.mediana(
          ganadas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      medianaPerdidas:
        this.mediana(
          perdidas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      minimoGanadas:
        this.minimo(
          ganadas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      maximoGanadas:
        this.maximo(
          ganadas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      minimoPerdidas:
        this.minimo(
          perdidas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      maximoPerdidas:
        this.maximo(
          perdidas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        )

    };

  }


  /* ========================================
     CONTAR CATEGORÍAS
     ======================================== */

  contarCategorias(
    datos,
    campo
  ) {

    const resultado =
      {};


    for (
      const item
      of datos
    ) {

      const valor =
        this.normalizarTexto(
          item?.[
            campo
          ]
        ) ??
        "SIN_DATO";


      if (
        !resultado[
          valor
        ]
      ) {

        resultado[
          valor
        ] = {

          total:
            0,

          ganadas:
            0,

          perdidas:
            0,

          accuracy:
            null

        };

      }


      resultado[
        valor
      ].total +=
        1;


      if (
        item.resultado ===
          "GANADA"
      ) {

        resultado[
          valor
        ].ganadas +=
          1;

      }


      if (
        item.resultado ===
          "PERDIDA"
      ) {

        resultado[
          valor
        ].perdidas +=
          1;

      }

    }


    for (
      const clave
      of Object.keys(
        resultado
      )
    ) {

      const fila =
        resultado[
          clave
        ];


      fila.accuracy =
        fila.total >
          0
          ? this.redondear(
              (
                fila.ganadas /
                fila.total
              ) *
              100
            )
          : null;

    }


    return resultado;

  }


  /* ========================================
     CONSTRUIR HALLAZGOS FIX13.2
     ======================================== */

  construirHallazgosPerfil(
    distribuciones,
    accuracyGeneral
  ) {

    const candidatos =
      [];


    const agregar = (
      grupo,
      filas
    ) => {

      for (
        const [
          valor,
          fila
        ]
        of Object.entries(
          filas ||
          {}
        )
      ) {

        if (
          valor ===
            "SIN_DATO" ||
          Number(
            fila.total
          ) <
            PROFILE_CONTROL
              .minimumPatternSamples
        ) {

          continue;

        }


        const accuracy =
          Number(
            fila.accuracy
          );


        if (
          !Number.isFinite(
            accuracy
          ) ||
          !Number.isFinite(
            Number(
              accuracyGeneral
            )
          )
        ) {

          continue;

        }


        const diferencia =
          this.redondear(
            accuracy -
            Number(
              accuracyGeneral
            )
          );


        let clasificacion =
          "NEUTRO";


        if (
          diferencia >=
            PROFILE_CONTROL
              .meaningfulGapPercent
        ) {

          clasificacion =
            "FAVORABLE";

        }

        else if (
          diferencia <=
            -PROFILE_CONTROL
              .meaningfulGapPercent
        ) {

          clasificacion =
            "RIESGO";

        }


        if (
          clasificacion ===
            "NEUTRO"
        ) {

          continue;

        }


        const fuerza =
          fila.total >=
            PROFILE_CONTROL
              .minimumStrongSamples &&
          Math.abs(
            diferencia
          ) >=
            PROFILE_CONTROL
              .strongGapPercent
            ? "MAS_FUERTE"
            : "PRELIMINAR";


        candidatos.push({

          grupo,

          valor,

          muestras:
            fila.total,

          ganadas:
            fila.ganadas,

          perdidas:
            fila.perdidas,

          accuracy,

          accuracyGeneral:
            Number(
              accuracyGeneral
            ),

          diferenciaVsGeneral:
            diferencia,

          clasificacion,

          fuerza

        });

      }

    };


    agregar(
      "DIRECCION",
      distribuciones
        .direccion
    );


    agregar(
      "CONFIANZA",
      distribuciones
        .zonaConfianza
    );


    agregar(
      "RSI",
      distribuciones
        .zonaRsi
    );


    agregar(
      "TENDENCIA",
      distribuciones
        .tendencia
    );


    agregar(
      "MOMENTUM",
      distribuciones
        .momentum
    );


    agregar(
      "TENDENCIA_MOMENTUM",
      distribuciones
        .tendenciaMomentum
    );


    agregar(
      "VOLATILIDAD",
      distribuciones
        .volatilidad
    );


    agregar(
      "PARIDAD_DIGITO",
      distribuciones
        .paridadUltimoDigito
    );


    agregar(
      "ZONA_DIGITO",
      distribuciones
        .zonaDigito
    );


    candidatos.sort(
      (
        a,
        b
      ) =>
        Math.abs(
          b.diferenciaVsGeneral
        ) -
        Math.abs(
          a.diferenciaVsGeneral
        ) ||
        b.muestras -
        a.muestras
    );


    return candidatos
      .slice(
        0,
        PROFILE_CONTROL
          .maxHallazgos
      );

  }


  /* ========================================
     RESUMEN PERFIL FIX13.2
     ======================================== */

  obtenerResumenPerfilSenal(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const datos =
      this.filtrarPerfilFix13(
        this.obtenerTelemetriaPorMercado(
          symbol
        )
      );


    const ganadas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA"
      );


    const perdidas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
            "PERDIDA"
      );


    const total =
      datos.length;


    const accuracy =
      total >
        0
        ? this.redondear(
            (
              ganadas.length /
              total
            ) *
            100
          )
        : null;


    /*
      Registros FIX13 anteriores pueden
      no traer las nuevas clasificaciones.

      Las calculamos al leerlos sin
      modificar el historial original.
    */

    const datosNormalizados =
      datos.map(
        (
          item
        ) => {

          const ultimoDigito =
            Number(
              item
                ?.ultimoDigito
            );


          const ultimoValido =
            Number.isInteger(
              ultimoDigito
            ) &&
            ultimoDigito >=
              0 &&
            ultimoDigito <=
              9;


          const tendencia =
            this.normalizarTexto(
              item?.tendencia
            );


          const momentum =
            this.normalizarTexto(
              item?.momentum
            );


          return {

            ...item,

            zonaConfianza:
              item
                ?.zonaConfianza ||
              this.clasificarConfianza(
                item?.confianza
              ),

            zonaRsi:
              item?.zonaRsi ||
              this.clasificarRsi(
                item?.rsi
              ),

            tendenciaMomentum:
              item
                ?.tendenciaMomentum ||
              (
                tendencia &&
                momentum
                  ? tendencia ===
                      momentum
                    ? "ALINEADOS"
                    : "NO_ALINEADOS"
                  : "SIN_DATO"
              ),

            paridadUltimoDigito:
              item
                ?.paridadUltimoDigito ||
              (
                ultimoValido
                  ? ultimoDigito %
                        2 ===
                      0
                    ? "PAR"
                    : "IMPAR"
                  : "SIN_DATO"
              ),

            zonaDigito:
              item
                ?.zonaDigito ||
              this.clasificarDigito(
                ultimoDigito
              )

          };

        }
      );


    const distribuciones =
      {

        direccion:
          this.contarCategorias(
            datosNormalizados,
            "direccion"
          ),

        zonaConfianza:
          this.contarCategorias(
            datosNormalizados,
            "zonaConfianza"
          ),

        zonaRsi:
          this.contarCategorias(
            datosNormalizados,
            "zonaRsi"
          ),

        tendencia:
          this.contarCategorias(
            datosNormalizados,
            "tendencia"
          ),

        momentum:
          this.contarCategorias(
            datosNormalizados,
            "momentum"
          ),

        tendenciaMomentum:
          this.contarCategorias(
            datosNormalizados,
            "tendenciaMomentum"
          ),

        volatilidad:
          this.contarCategorias(
            datosNormalizados,
            "volatilidad"
          ),

        paridadUltimoDigito:
          this.contarCategorias(
            datosNormalizados,
            "paridadUltimoDigito"
          ),

        zonaDigito:
          this.contarCategorias(
            datosNormalizados,
            "zonaDigito"
          )

      };


    const hallazgos =
      this.construirHallazgosPerfil(
        distribuciones,
        accuracy
      );


    const favorables =
      hallazgos.filter(
        (
          item
        ) =>
          item.clasificacion ===
            "FAVORABLE"
      );


    const riesgos =
      hallazgos.filter(
        (
          item
        ) =>
          item.clasificacion ===
            "RIESGO"
      );


    let estadoAnalisis =
      "SIN_MUESTRAS";


    let lectura =
      "Todavía no existen muestras FIX13 suficientes.";


    if (
      total >
      0
    ) {

      estadoAnalisis =
        "RECOPILANDO";


      lectura =
        `FIX13.2 recopilando perfil: ${total} muestras.`;

    }


    if (
      total >=
        10
    ) {

      estadoAnalisis =
        "ANALISIS_PRELIMINAR";


      lectura =
        "Ya existen muestras para comparar patrones preliminares; todavía no se bloquean señales.";

    }


    if (
      total >=
        20
    ) {

      estadoAnalisis =
        "ANALISIS_ACTIVO";


      lectura =
        "Perfil con 20 o más muestras. Los hallazgos siguen siendo observacionales hasta validarlos con más operaciones.";

    }


    return {

      mercado:
        symbol,

      versionAnalisis:
        "FIX13.2",

      filtroAutomaticoActivo:
        false,

      muestras:
        total,

      ganadas:
        ganadas.length,

      perdidas:
        perdidas.length,

      accuracy,

      estadoAnalisis,

      lectura,

      confianza:
        this.construirPerfilNumerico(
          datosNormalizados,
          "confianza"
        ),

      rsi:
        this.construirPerfilNumerico(
          datosNormalizados,
          "rsi"
        ),

      distribuciones,

      hallazgos,

      favorables,

      riesgos,

      control:
        {
          ...PROFILE_CONTROL
        }

    };

  }


  /* ========================================
     RESUMEN MERCADO
     ======================================== */

  obtenerResumenMercado(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const datos =
      this.obtenerTelemetriaPorMercado(
        symbol
      );


    const finalizadas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA" ||
          item.resultado ===
            "PERDIDA"
      );


    const timingValido =
      this.filtrarTimingValido(
        finalizadas
      );


    const ganadas =
      finalizadas.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA"
      ).length;


    const perdidas =
      finalizadas.filter(
        (
          item
        ) =>
          item.resultado ===
            "PERDIDA"
      ).length;


    const pruebas =
      finalizadas.length;


    const accuracy =
      pruebas >
        0
        ? this.redondear(
            (
              ganadas /
              pruebas
            ) *
            100
          )
        : null;


    const perfil =
      this.obtenerResumenPerfilSenal(
        symbol
      );


    return {

      mercado:
        symbol,

      familia:
        this.obtenerFamiliaMercado(
          symbol
        ),

      controlado:
        this.mercadoControlado(
          symbol
        ),

      calibracionActualMs:
        this.obtenerAjusteMercado(
          symbol
        ),

      calibracionActualSeg:
        this.obtenerAjusteMercado(
          symbol
        ) /
        1000,

      pruebas,

      ganadas,

      perdidas,

      accuracy,

      muestrasTimingFix12:
        timingValido.length,

      muestrasTimingDescartadas:
        finalizadas.length -
        timingValido.length,

      promedioSignalToBuyMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.signalToBuyMs
          )
        ),

      medianaSignalToBuyMs:
        this.mediana(
          timingValido.map(
            (
              item
            ) =>
              item.signalToBuyMs
          )
        ),

      promedioProposalMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.proposalLatencyMs
          )
        ),

      promedioProposalToBuyMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.proposalToBuyMs
          )
        ),

      promedioEsperaMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.calibrationWaitActualMs
          )
        ),

      promedioBuyMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.buyLatencyMs
          )
        ),

      promedioDesviacionTargetMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.buyTargetDeviationMs
          )
        ),

      medianaDesviacionTargetMs:
        this.mediana(
          timingValido.map(
            (
              item
            ) =>
              item.buyTargetDeviationMs
          )
        ),

      retrasoReferenciaMs:
        this.obtenerRetrasoReferencia(
          symbol
        ),

      comparadorTiming:
        this.construirComparadorTiming(
          finalizadas
        ),

      perfilSenalFix13:
        perfil,

      analisisPerfilFix13_2:
        perfil

    };

  }


  /* ========================================
     RESUMEN TODOS LOS MERCADOS
     ======================================== */

  obtenerResumenMercados() {

    const resultado =
      {};


    for (
      const mercado
      of MERCADOS_CONTROLADOS
    ) {

      resultado[
        mercado
      ] =
        this.obtenerResumenMercado(
          mercado
        );

    }


    return resultado;

  }


  /* ========================================
     RESUMEN FAMILIA
     ======================================== */

  obtenerResumenFamilia(
    familia
  ) {

    const datos =
      this.obtenerTelemetriaPorFamilia(
        familia
      );


    const finalizadas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA" ||
          item.resultado ===
            "PERDIDA"
      );


    const timingValido =
      this.filtrarTimingValido(
        finalizadas
      );


    const ganadas =
      finalizadas.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA"
      ).length;


    const perdidas =
      finalizadas.filter(
        (
          item
        ) =>
          item.resultado ===
            "PERDIDA"
      ).length;


    const pruebas =
      finalizadas.length;


    return {

      familia:
        String(
          familia
        )
          .toUpperCase(),

      pruebas,

      ganadas,

      perdidas,

      accuracy:
        pruebas >
          0
          ? this.redondear(
              (
                ganadas /
                pruebas
              ) *
              100
            )
          : null,

      muestrasTimingFix12:
        timingValido.length,

      promedioSignalToBuyMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.signalToBuyMs
          )
        ),

      medianaSignalToBuyMs:
        this.mediana(
          timingValido.map(
            (
              item
            ) =>
              item.signalToBuyMs
          )
        ),

      promedioDesviacionTargetMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.buyTargetDeviationMs
          )
        )

    };

  }


  /* ========================================
     COMPARACIÓN MERCADO
     ======================================== */

  obtenerComparacionMercado(
    mercado
  ) {

    const resumen =
      this.obtenerResumenMercado(
        mercado
      );


    return {

      mercado:
        resumen.mercado,

      familia:
        resumen.familia,

      pruebas:
        resumen.pruebas,

      accuracy:
        resumen.accuracy,

      calibracionActualMs:
        resumen
          .calibracionActualMs,

      muestrasTimingFix12:
        resumen
          .muestrasTimingFix12,

      muestrasTimingDescartadas:
        resumen
          .muestrasTimingDescartadas,

      ganadas:
        resumen
          .comparadorTiming
          .ganadas,

      perdidas:
        resumen
          .comparadorTiming
          .perdidas,

      diferenciaPromedioMs:
        resumen
          .comparadorTiming
          .diferenciaPromedioMs,

      diferenciaMedianaMs:
        resumen
          .comparadorTiming
          .diferenciaMedianaMs,

      diferenciaTargetMedianaMs:
        resumen
          .comparadorTiming
          .diferenciaTargetMedianaMs,

      lectura:
        resumen
          .comparadorTiming
          .lectura,

      perfilSenalFix13:
        resumen
          .perfilSenalFix13,

      analisisPerfilFix13_2:
        resumen
          .analisisPerfilFix13_2

    };

  }


  /* ========================================
     RESUMEN CALIBRACIÓN
     ======================================== */

  obtenerResumenCalibracion(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const resultado =
      {};


    for (
      const ajuste
      of AJUSTES_PERMITIDOS_MS
    ) {

      const datos =
        this
          .obtenerTelemetriaPorCalibracion(
            symbol,
            ajuste
          )
          .filter(
            (
              item
            ) =>
              item.resultado ===
                "GANADA" ||
              item.resultado ===
                "PERDIDA"
          );


      const timingValido =
        this.filtrarTimingValido(
          datos
        );


      const ganadas =
        datos.filter(
          (
            item
          ) =>
            item.resultado ===
              "GANADA"
        ).length;


      const perdidas =
        datos.filter(
          (
            item
          ) =>
            item.resultado ===
              "PERDIDA"
        ).length;


      const pruebas =
        datos.length;


      resultado[
        String(
          ajuste
        )
      ] = {

        ajusteMs:
          ajuste,

        ajusteSeg:
          ajuste /
          1000,

        pruebas,

        ganadas,

        perdidas,

        accuracy:
          pruebas >
            0
            ? this.redondear(
                (
                  ganadas /
                  pruebas
                ) *
                100
              )
            : null,

        muestrasTimingFix12:
          timingValido.length,

        promedioSignalToBuyMs:
          this.promedio(
            timingValido.map(
              (
                item
              ) =>
                item.signalToBuyMs
            )
          ),

        medianaSignalToBuyMs:
          this.mediana(
            timingValido.map(
              (
                item
              ) =>
                item.signalToBuyMs
            )
          ),

        promedioProposalMs:
          this.promedio(
            timingValido.map(
              (
                item
              ) =>
                item.proposalLatencyMs
            )
          ),

        promedioBuyMs:
          this.promedio(
            timingValido.map(
              (
                item
              ) =>
                item.buyLatencyMs
            )
          ),

        promedioDesviacionTargetMs:
          this.promedio(
            timingValido.map(
              (
                item
              ) =>
                item.buyTargetDeviationMs
            )
          ),

        medianaDesviacionTargetMs:
          this.mediana(
            timingValido.map(
              (
                item
              ) =>
                item.buyTargetDeviationMs
            )
          )

      };

    }


    return {

      mercado:
        symbol,

      ajusteActualMs:
        this.obtenerAjusteMercado(
          symbol
        ),

      ajustes:
        resultado

    };

  }


  /* ========================================
     PROCESAR SEÑAL FIX13.2
     ======================================== */

  async procesarSenal(
    senal,
    {
      onOperacionUpdate =
        null,
      senalRecibidaPerf =
        null
    } = {}
  ) {

    const estado =
      this.puedeProcesar();


    if (
      !estado.ok
    ) {

      return {

        aceptada:
          false,

        motivo:
          estado.motivo

      };

    }


    const id =
      senal?.id ??
      null;


    if (
      id &&
      (
        this.ultimaSenalProcesada ===
          id ||
        this.senalesEnProceso.has(
          id
        )
      )
    ) {

      return {

        aceptada:
          false,

        motivo:
          "Señal duplicada."

      };

    }


    if (
      id
    ) {

      this.senalesEnProceso.add(
        id
      );

    }


    const telemetria =
      this.crearTelemetria(
        senal,
        senalRecibidaPerf
      );


    try {

      /* ====================================
         1. CONTRATO
         ==================================== */

      const contrato =
        contractMapper.mapear(
          senal
        );


      if (
        !contrato.ok
      ) {

        telemetria.resultado =
          "CONTRATO_RECHAZADO";


        this.guardarTelemetria(
          telemetria
        );


        return {

          aceptada:
            false,

          etapa:
            "CONTRACT_MAPPER",

          motivo:
            contrato.error,

          telemetria

        };

      }


      this.ultimoContrato =
        contrato;


      /* ====================================
         2. SIMULACIÓN
         ==================================== */

      const propuestaSimulada =
        proposalSimulator
          .crearPropuesta(
            contrato,
            {

              monto:
                this
                  .configuracion
                  .monto,

              moneda:
                this
                  .configuracion
                  .moneda,

              duracion:
                this
                  .configuracion
                  .duracion,

              unidadDuracion:
                this
                  .configuracion
                  .unidadDuracion

            }
          );


      if (
        !propuestaSimulada.ok
      ) {

        telemetria.resultado =
          "SIMULACION_RECHAZADA";


        this.guardarTelemetria(
          telemetria
        );


        return {

          aceptada:
            false,

          etapa:
            "PROPOSAL_SIMULATOR",

          motivo:
            propuestaSimulada.error,

          telemetria

        };

      }


      this.ultimaPropuesta =
        propuestaSimulada;


      /* ====================================
         3. COTIZACIÓN
         ==================================== */

      telemetria
        .proposalRequestedEpoch =
        Date.now();


      telemetria
        .proposalRequestedPerf =
        this.ahora();


      const propuestaDeriv =
        await derivProposal.solicitar(
          contrato,
          {

            monto:
              this
                .configuracion
                .monto,

            moneda:
              this
                .configuracion
                .moneda,

            duracion:
              this
                .configuracion
                .duracion,

            unidadDuracion:
              this
                .configuracion
                .unidadDuracion

          }
        );


      telemetria
        .proposalReceivedEpoch =
        Date.now();


      telemetria
        .proposalReceivedPerf =
        this.ahora();


      if (
        propuestaDeriv.ok
      ) {

        this.ultimaPropuestaDeriv =
          propuestaDeriv;

      }


      let compraDemo =
        null;


      let resultadoDemo =
        null;


      /* ====================================
         PROPUESTA RECHAZADA
         ==================================== */

      if (
        !propuestaDeriv.ok
      ) {

        telemetria.resultado =
          "PROPUESTA_RECHAZADA";


        this.guardarTelemetria(
          telemetria
        );


        return {

          aceptada:
            true,

          modo:
            this.modo,

          mercado:
            senal.mercado,

          familia:
            telemetria
              .familiaMercado,

          estrategia:
            senal.estrategia,

          direccion:
            senal.direccion,

          confianza:
            senal.confianza,

          segundoEntrada:
            senal.segundosEntrada,

          calibracionMs:
            telemetria
              .calibracionMs,

          calibracionSeg:
            telemetria
              .calibracionSeg,

          programacionDisponible:
            telemetria
              .programacionDisponible,

          contrato,

          propuesta:
            propuestaSimulada,

          propuestaDeriv,

          compraDemo:
            null,

          resultadoDemo:
            null,

          telemetria:
            {
              ...telemetria
            },

          resumenMercado:
            this
              .obtenerResumenMercado(
                telemetria.mercado
              ),

          comparacionMercado:
            this
              .obtenerComparacionMercado(
                telemetria.mercado
              ),

          resumenCalibracion:
            this
              .obtenerResumenCalibracion(
                telemetria.mercado
              ),

          perfilSenal:
            this
              .obtenerResumenPerfilSenal(
                telemetria.mercado
              ),

          resumenMercados:
            this
              .obtenerResumenMercados(),

          resumenStandard:
            this
              .obtenerResumenFamilia(
                "STANDARD"
              ),

          resumen1S:
            this
              .obtenerResumenFamilia(
                "1S"
              ),

          ejecucionDemoActiva:
            derivTrade
              .obtenerEstado()
              .ejecucionActiva

        };

      }


      /* ====================================
         4. ESPERA AL TARGET
         ==================================== */

      if (
        telemetria
          .programacionDisponible &&
        Number.isFinite(
          telemetria
            .programmedExecutionAt
        )
      ) {

        const restanteMs =
          Math.max(
            0,
            telemetria
              .programmedExecutionAt -
            Date.now()
          );


        telemetria
          .esperaProgramadaMs =
          this.redondear(
            restanteMs
          );


        telemetria
          .waitStartedEpoch =
          Date.now();


        telemetria
          .calibrationWaitStartedPerf =
          this.ahora();


        if (
          restanteMs >
          0
        ) {

          await this.esperar(
            restanteMs
          );

        }


        telemetria
          .waitEndedEpoch =
          Date.now();


        telemetria
          .calibrationWaitEndedPerf =
          this.ahora();

      }


      /* ====================================
         5. BUY
         ==================================== */

      if (
        derivTrade
          .obtenerEstado()
          .ejecucionActiva
      ) {

        const buyRequestedAt =
          Date.now();


        telemetria
          .buyRequestedEpoch =
          buyRequestedAt;


        telemetria
          .buyRequestedPerf =
          this.ahora();


        if (
          Number.isFinite(
            telemetria
              .programmedExecutionAt
          )
        ) {

          telemetria
            .buyTargetDeviationMs =
            this.redondear(
              buyRequestedAt -
              telemetria
                .programmedExecutionAt
            );

        }


        compraDemo =
          await derivTrade.comprar(
            propuestaDeriv
          );


        const buyConfirmedAt =
          Date.now();


        telemetria
          .buyConfirmedEpoch =
          buyConfirmedAt;


        telemetria
          .buyConfirmedPerf =
          this.ahora();


        if (
          Number.isFinite(
            telemetria
              .programmedExecutionAt
          )
        ) {

          telemetria
            .buyConfirmTargetDeviationMs =
            this.redondear(
              buyConfirmedAt -
              telemetria
                .programmedExecutionAt
            );

        }


        /* ==================================
           COMPRA ACEPTADA
           ================================== */

        if (
          compraDemo.ok
        ) {

          this.ultimaCompraDemo =
            compraDemo.compra;


          telemetria.contractId =
            compraDemo
              .compra
              .contractId;


          /* ==================================
             6. RESULTADO
             ================================== */

          const seguimiento =
            await derivTrade
              .esperarResultado(
                compraDemo
                  .compra
                  .contractId,
                {

                  onUpdate:
                    onOperacionUpdate

                }
              );


          telemetria
            .resultReceivedEpoch =
            Date.now();


          telemetria
            .resultReceivedPerf =
            this.ahora();


          if (
            seguimiento.ok
          ) {

            resultadoDemo =
              seguimiento.resultado;


            this.ultimoResultadoDemo =
              resultadoDemo;


            const profit =
              Number(
                resultadoDemo
                  .profit ??
                0
              );


            telemetria.resultado =
              profit >
                0
                ? "GANADA"
                : "PERDIDA";


            telemetria.profit =
              profit;


            telemetria.source =
              resultadoDemo
                .source ??
              null;

          }

          else {

            resultadoDemo =
              seguimiento;


            telemetria.resultado =
              "SIN_CONFIRMAR";


            telemetria.profit =
              null;

          }

        }

        else {

          telemetria.resultado =
            "BUY_RECHAZADO";

        }

      }

      else {

        telemetria.resultado =
          "SOLO_COTIZACION";

      }


      /* ====================================
         MARCAR ID
         ==================================== */

      if (
        id
      ) {

        this.ultimaSenalProcesada =
          id;

      }


      /* ====================================
         GUARDAR
         ==================================== */

      this.guardarTelemetria(
        telemetria
      );


      const perfilSenal =
        this.obtenerResumenPerfilSenal(
          telemetria.mercado
        );


      /* ====================================
         RESPUESTA
         ==================================== */

      return {

        aceptada:
          true,

        modo:
          this.modo,

        mercado:
          senal.mercado,

        familia:
          telemetria
            .familiaMercado,

        estrategia:
          senal.estrategia,

        direccion:
          senal.direccion,

        confianza:
          senal.confianza,

        segundoEntrada:
          senal.segundosEntrada,

        calibracionMs:
          telemetria
            .calibracionMs,

        calibracionSeg:
          telemetria
            .calibracionSeg,

        programacionDisponible:
          telemetria
            .programacionDisponible,

        targetExecutionAt:
          telemetria
            .targetExecutionAt,

        programmedExecutionAt:
          telemetria
            .programmedExecutionAt,

        buyTargetDeviationMs:
          telemetria
            .buyTargetDeviationMs,

        timingValido:
          telemetria
            .timingValido,

        timingClasificacion:
          telemetria
            .timingClasificacion,

        timingAnomalias:
          [
            ...(
              telemetria
                .timingAnomalias ||
              []
            )
          ],

        contrato,

        propuesta:
          propuestaSimulada,

        propuestaDeriv,

        compraDemo,

        resultadoDemo,

        telemetria:
          {
            ...telemetria
          },

        resumenMercado:
          this
            .obtenerResumenMercado(
              telemetria.mercado
            ),

        comparacionMercado:
          this
            .obtenerComparacionMercado(
              telemetria.mercado
            ),

        resumenCalibracion:
          this
            .obtenerResumenCalibracion(
              telemetria.mercado
            ),

        perfilSenal,

        analisisPerfil:
          perfilSenal,

        resumenMercados:
          this
            .obtenerResumenMercados(),

        resumenStandard:
          this
            .obtenerResumenFamilia(
              "STANDARD"
            ),

        resumen1S:
          this
            .obtenerResumenFamilia(
              "1S"
            ),

        ejecucionDemoActiva:
          derivTrade
            .obtenerEstado()
            .ejecucionActiva

      };

    }

    finally {

      if (
        id
      ) {

        this.senalesEnProceso.delete(
          id
        );

      }

    }

  }


  /* ========================================
     ESTADO COMPLETO
     ======================================== */

  obtenerEstado() {

    const comparaciones =
      {};


    const calibraciones =
      {};


    const perfilesSenal =
      {};


    const analisisPerfiles =
      {};


    for (
      const mercado
      of MERCADOS_CONTROLADOS
    ) {

      comparaciones[
        mercado
      ] =
        this.obtenerComparacionMercado(
          mercado
        );


      calibraciones[
        mercado
      ] =
        this.obtenerResumenCalibracion(
          mercado
        );


      const perfil =
        this.obtenerResumenPerfilSenal(
          mercado
        );


      perfilesSenal[
        mercado
      ] =
        perfil;


      analisisPerfiles[
        mercado
      ] =
        perfil;

    }


    return {

      activo:
        this.activo,

      pausado:
        this.pausado,

      modo:
        this.modo,

      versionTelemetria:
        TELEMETRY_VERSION,

      timingBase:
        TIMING_BASE_VERSION,

      filtroAutomaticoActivo:
        false,

      versionesTimingCompatibles:
        [
          ...TIMING_COMPATIBLE_VERSIONS
        ],

      versionesPerfilCompatibles:
        [
          ...SIGNAL_PROFILE_VERSIONS
        ],

      limitesTiming:
        {
          ...TIMING_LIMITS
        },

      controlPerfil:
        {
          ...PROFILE_CONTROL
        },

      ultimaSenalProcesada:
        this.ultimaSenalProcesada,

      ultimoContrato:
        this.ultimoContrato,

      ultimaPropuesta:
        this.ultimaPropuesta,

      ultimaPropuestaDeriv:
        this.ultimaPropuestaDeriv,

      ultimaCompraDemo:
        this.ultimaCompraDemo,

      ultimoResultadoDemo:
        this.ultimoResultadoDemo,

      ultimaTelemetria:
        this.ultimaTelemetria,

      resumenStandard:
        this.obtenerResumenFamilia(
          "STANDARD"
        ),

      resumen1S:
        this.obtenerResumenFamilia(
          "1S"
        ),

      resumenMercados:
        this.obtenerResumenMercados(),

      comparaciones,

      calibraciones,

      perfilesSenal,

      analisisPerfiles,

      calibracionActual:
        {
          ...this.calibracion
        },

      ajustesPermitidosMs:
        [
          ...AJUSTES_PERMITIDOS_MS
        ],

      mercadosStandard:
        [
          ...MERCADOS_STANDARD
        ],

      mercados1S:
        [
          ...MERCADOS_1S
        ],

      mercadosControlados:
        [
          ...MERCADOS_CONTROLADOS
        ],

      trade:
        derivTrade
          .obtenerEstado(),

      configuracion:
        {
          ...this.configuracion
        }

    };

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const botEngine =
  new BotEngine();


/* ==========================================
   FIN BOT-ENGINE.JS
   FIX13.2
   ========================================== */
