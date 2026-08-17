/* ==========================================
   BOT V1 MR
   BOT-ENGINE.JS
   FIX13.4.2

   PROTOCOLO DE DOS FASES:

   FASE 1 = PREPARAR
   -----------------
   Trading Analyzer confirma señal.
   BOT:
   - recibe información
   - traduce contrato
   - solicita propuesta DERIV DEMO
   - guarda propuesta
   - NO compra todavía

   FASE 2 = EJECUTAR
   -----------------
   Trading Analyzer termina la frase:
   "Tienes diez segundos para realizar
    la operación."

   Luego:
   - crea TARGET 10 a +1000 ms
   - BOT recibe TARGET
   - aplica calibración por mercado
   - espera instante programado
   - manda BUY
   - confirma BUY
   - espera GANADA / PERDIDA

   REFERENCIA:
   TARGET 10 = centro de calibración.

   STANDARD:
   calibración alrededor de 0 ms.

   1S:
   calibración alrededor de +100 ms,
   ajustable individualmente.

   CONSERVA:
   - DERIV DEMO
   - HISTORIAL
   - TELEMETRÍA
   - GANADAS / PERDIDAS
   - PERFIL DE SEÑAL
   - COMPARADORES
   - 12 MERCADOS
   - AJUSTE -300 A +300 ms
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
  "FIX13.4.2";


const TIMING_BASE_VERSION =
  "FIX13.4.2";


const SYNC_VERSION =
  "FIX13.4.2";


const TIMING_COMPATIBLE_VERSIONS = [

  "FIX12",
  "FIX13",
  "FIX13.1",
  "FIX13.2",
  "FIX13.3",
  "FIX13.4",
  "FIX13.4.1",
  "FIX13.4.2"

];


const SIGNAL_PROFILE_VERSIONS = [

  "FIX13",
  "FIX13.1",
  "FIX13.2",
  "FIX13.3",
  "FIX13.4",
  "FIX13.4.1",
  "FIX13.4.2"

];


/* ==========================================
   PERFIL
   ========================================== */

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
   TIMING
   ========================================== */

const TIMING_LIMITS = {

  bridgeToProcessMaxMs:
    1000,

  proposalMaxMs:
    2000,

  buyConfirmationMaxMs:
    2000,

  targetDeviationMaxAbsMs:
    750,

  waitOvershootMaxMs:
    500

};


/* ==========================================
   PREPARACIÓN
   ========================================== */

/*
  Una preparación no debe quedarse viva
  indefinidamente.

  20 segundos es solamente una protección
  de memoria.

  Normalmente TARGET llega pocos segundos
  después de PREPARAR.
*/

const PREPARATION_TTL_MS =
  20000;


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
   TODOS
   ========================================== */

const MERCADOS_CONTROLADOS = [

  ...MERCADOS_STANDARD,
  ...MERCADOS_1S

];


/* ==========================================
   AJUSTES
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

   STANDARD:
   referencia inicial 0 ms.

   1S:
   referencia inicial +100 ms.

   Si ya existe calibración guardada,
   localStorage tiene prioridad.
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
    100,

  "1HZ15V":
    100,

  "1HZ25V":
    100,

  "1HZ30V":
    100,

  "1HZ50V":
    100,

  "1HZ75V":
    100,

  "1HZ100V":
    100

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


    this.modo =
      "DERIV DEMO + FIX13.4.2 PREPARE/TARGET";


    this.ultimaSenalProcesada =
      null;


    this.senalesEnProceso =
      new Set();


    /*
      FIX13.4.2

      Aquí quedan temporalmente
      las propuestas solicitadas
      durante PREPARAR.
    */

    this.preparaciones =
      new Map();


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


    this.timerLimpieza =
      setInterval(
        () => {

          this.limpiarPreparacionesExpiradas();

        },
        5000
      );

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
      (resolve) => {

        setTimeout(
          resolve,
          tiempo
        );

      }
    );

  }


  /* ========================================
     EVENTOS VISUALES BOT
     ======================================== */

  emitirEvento(
    nombre,
    detalle = {}
  ) {

    try {

      window.dispatchEvent(
        new CustomEvent(
          nombre,
          {
            detail:
              detalle
          }
        )
      );

    }

    catch (
      error
    ) {

      console.warn(
        `No se pudo emitir ${nombre}:`,
        error
      );

    }

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


    const total =
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
      total /
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
     TEXTO
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
     MERCADO
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
     CALIBRACIÓN
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


    return this.obtenerFamiliaMercado(
      symbol
    ) ===
      "1S"
      ? 100
      : 0;

  }


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
        "Calibración restablecida a valores base: STANDARD 0 ms / 1S +100 ms."

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


    const visual =
      Number(
        senal
          ?.targetVisualAt
      );


    if (
      Number.isFinite(
        visual
      ) &&
      visual >
        0
    ) {

      return visual;

    }


    const metadata =
      Number(
        senal
          ?.metadata
          ?.targetExecutionAt ??
        senal
          ?.metadata
          ?.targetVisualAt
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
          "La señal no incluye TARGET."

      };

    }


    /*
      IMPORTANTE:

      programmedAt =
      TARGET 10 + calibración.

      Ejemplos:

      STANDARD 0:
      BUY en TARGET.

      STANDARD -100:
      BUY 100 ms antes.

      1S +100:
      BUY 100 ms después.
    */

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
     BOT
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
        "Bot iniciado FIX13.4.2."

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


    this.preparaciones.clear();


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
     OPERACIÓN ID
     ======================================== */

  obtenerOperacionId(
    senal
  ) {

    return String(
      senal
        ?.operacionId ??
      senal
        ?.metadata
        ?.operacionId ??
      ""
    )
      .trim();

  }


  obtenerFase(
    senal
  ) {

    return String(
      senal
        ?.fase ??
      senal
        ?.metadata
        ?.fase ??
      "LEGACY"
    )
      .trim()
      .toUpperCase();

  }


  /* ========================================
     LIMPIEZA PREPARACIONES
     ======================================== */

  limpiarPreparacionesExpiradas() {

    const ahora =
      Date.now();


    for (
      const [
        operacionId,
        preparacion
      ]
      of this.preparaciones
    ) {

      if (
        ahora -
          Number(
            preparacion
              ?.preparedAt ??
            0
          ) >
        PREPARATION_TTL_MS
      ) {

        this.preparaciones.delete(
          operacionId
        );

      }

    }

  }


  /* ========================================
     CLASIFICACIONES PERFIL
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
        null

    };

  }


  /* ========================================
     TELEMETRÍA
     ======================================== */

  crearTelemetria(
    senal
  ) {

    const ahoraPerf =
      this.ahora();


    const ahoraEpoch =
      Date.now();


    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );


    const perfil =
      this.crearPerfilSenal(
        senal
      );


    const programacion =
      this.calcularProgramacion(
        senal
      );


    const bridgeReceivedEpoch =
      Number(
        senal
          ?.bridgeReceivedEpoch ??
        senal
          ?.timestamp
      );


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

      sincronizacionVisual:
        SYNC_VERSION,

      signalId:
        senal?.id ??
        null,

      operacionId:
        this.obtenerOperacionId(
          senal
        ) ||
        null,

      faseInicial:
        this.obtenerFase(
          senal
        ),

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
        perfil.direccion,

      confianza:
        perfil.confianza,

      zonaConfianza:
        perfil.zonaConfianza,

      tendencia:
        perfil.tendencia,

      rsi:
        perfil.rsi,

      zonaRsi:
        perfil.zonaRsi,

      momentum:
        perfil.momentum,

      tendenciaMomentum:
        perfil.tendenciaMomentum,

      volatilidad:
        perfil.volatilidad,

      ultimoDigito:
        perfil.ultimoDigito,

      zonaDigito:
        perfil.zonaDigito,

      ultimoDigitoPar:
        perfil.ultimoDigitoPar,

      paridadUltimoDigito:
        perfil.paridadUltimoDigito,

      perfilSenal:
        {
          ...perfil
        },

      puntoEntrada:
        senal?.segundosEntrada ??
        10,

      retrasoReferenciaMs:
        this.obtenerRetrasoReferencia(
          mercado
        ),

      retrasoReferenciaSeg:
        this.obtenerRetrasoReferencia(
          mercado
        ) !==
          null
          ? this.obtenerRetrasoReferencia(
              mercado
            ) /
            1000
          : null,


      /* PREPARE */

      prepareReceivedEpoch:
        ahoraEpoch,

      prepareStartedEpoch:
        ahoraEpoch,

      proposalRequestedEpoch:
        null,

      proposalReceivedEpoch:
        null,

      proposalPreparedEpoch:
        null,


      /* TARGET */

      targetReceivedEpoch:
        null,

      targetExecutionAt:
        programacion
          .targetExecutionAt,

      programmedExecutionAt:
        programacion
          .programmedAt,

      calibracionMs:
        programacion
          .ajusteMs,

      calibracionSeg:
        programacion
          .ajusteSeg,

      programacionDisponible:
        programacion
          .disponible,

      puedeAnticipar:
        programacion
          .puedeAnticipar,

      programacionMotivo:
        programacion
          .motivo,


      /* ESPERA */

      waitStartedEpoch:
        null,

      waitEndedEpoch:
        null,

      esperaProgramadaInicialMs:
        programacion
          .esperaMs,

      esperaProgramadaMs:
        programacion
          .esperaMs,


      /* BUY */

      buyRequestedEpoch:
        null,

      buyConfirmedEpoch:
        null,

      resultReceivedEpoch:
        null,


      /* PERF */

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


      /* MÉTRICAS */

      bridgeToProcessMs:
        Number.isFinite(
          bridgeReceivedEpoch
        )
          ? this.redondear(
              ahoraEpoch -
              bridgeReceivedEpoch
            )
          : null,

      signalToProposalRequestMs:
        null,

      signalToProposalReceivedMs:
        null,

      processToProposalRequestMs:
        null,

      proposalLatencyMs:
        null,

      prepareToTargetMs:
        null,

      targetToBuyMs:
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


      /* TIMING */

      timingValido:
        false,

      timingClasificacion:
        "PENDIENTE",

      timingAnomalias:
        [],

      usableForTimingComparator:
        false,

      usableForSignalProfile:
        false,


      /* RESULTADO */

      contractId:
        null,

      resultado:
        "PREPARANDO",

      profit:
        null,

      source:
        null,

      createdAt:
        Date.now()

    };

  }


  /* ========================================
     DIFERENCIA
     ======================================== */

  diferencia(
    inicio,
    fin
  ) {

    if (
      Number.isFinite(
        Number(
          inicio
        )
      ) &&
      Number.isFinite(
        Number(
          fin
        )
      )
    ) {

      return this.redondear(
        Number(
          fin
        ) -
        Number(
          inicio
        )
      );

    }


    return null;

  }


  /* ========================================
     CALCULAR TELEMETRÍA
     ======================================== */

  calcularTelemetria(
    t
  ) {

    t.signalToProposalRequestMs =
      this.diferencia(
        t.signalReceivedPerf,
        t.proposalRequestedPerf
      );


    t.signalToProposalReceivedMs =
      this.diferencia(
        t.signalReceivedPerf,
        t.proposalReceivedPerf
      );


    t.processToProposalRequestMs =
      this.diferencia(
        t.processStartedPerf,
        t.proposalRequestedPerf
      );


    t.proposalLatencyMs =
      this.diferencia(
        t.proposalRequestedPerf,
        t.proposalReceivedPerf
      );


    t.prepareToTargetMs =
      this.diferencia(
        t.prepareReceivedEpoch,
        t.targetReceivedEpoch
      );


    t.calibrationWaitActualMs =
      this.diferencia(
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
      this.diferencia(
        t.proposalReceivedPerf,
        t.buyRequestedPerf
      );


    t.processToBuyMs =
      this.diferencia(
        t.processStartedPerf,
        t.buyRequestedPerf
      );


    t.signalToBuyMs =
      this.diferencia(
        t.signalReceivedPerf,
        t.buyRequestedPerf
      );


    t.buyLatencyMs =
      this.diferencia(
        t.buyRequestedPerf,
        t.buyConfirmedPerf
      );


    t.signalToBuyConfirmMs =
      this.diferencia(
        t.signalReceivedPerf,
        t.buyConfirmedPerf
      );


    t.totalUntilResultMs =
      this.diferencia(
        t.signalReceivedPerf,
        t.resultReceivedPerf
      );


    if (
      Number.isFinite(
        t.targetExecutionAt
      ) &&
      Number.isFinite(
        t.buyRequestedEpoch
      )
    ) {

      t.targetToBuyMs =
        this.redondear(
          t.buyRequestedEpoch -
          t.targetExecutionAt
        );

    }


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
          "Registro legacy."
        ];


      t.usableForTimingComparator =
        false;


      return t;

    }


    if (
      !Number.isFinite(
        Number(
          t.targetExecutionAt
        )
      )
    ) {

      anomalias.push(
        "Sin TARGET 10."
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
        "No se pudo guardar telemetría FIX13.4.2:",
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
        (item) =>
          this.normalizarMercado(
            item?.mercado
          ) ===
          buscado
      );

  }


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
        (item) =>
          String(
            item?.familiaMercado ||
            ""
          )
            .toUpperCase() ===
          buscada
      );

  }


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
        (item) =>
          Number(
            item?.calibracionMs ??
            0
          ) ===
          ajuste
      );

  }


  filtrarTimingValido(
    datos
  ) {

    return datos.filter(
      (item) =>
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


  filtrarPerfilFix13(
    datos
  ) {

    return datos.filter(
      (item) =>
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
     MÉTRICAS
     ======================================== */

  construirMetricasGrupo(
    datos
  ) {

    const extraer =
      (campo) =>
        datos.map(
          (item) =>
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

      promedioBuyMs:
        this.promedio(
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


  construirComparadorTiming(
    datos
  ) {

    const finalizadas =
      datos.filter(
        (item) =>
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
        (item) =>
          item.resultado ===
          "GANADA"
      );


    const perdidas =
      timingValido.filter(
        (item) =>
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
            "GANADAS MÁS TEMPRANO";

        }

        else if (
          diferenciaTargetMedianaMs <
          -40
        ) {

          lectura =
            "GANADAS MÁS TARDE";

        }

        else {

          lectura =
            "TARGET MUY SIMILAR";

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
        (item) =>
          item.resultado ===
          "GANADA"
      );


    const perdidas =
      datos.filter(
        (item) =>
          item.resultado ===
          "PERDIDA"
      );


    return {

      promedioTotal:
        this.promedio(
          datos.map(
            (item) =>
              item?.[
                campo
              ]
          )
        ),

      promedioGanadas:
        this.promedio(
          ganadas.map(
            (item) =>
              item?.[
                campo
              ]
          )
        ),

      promedioPerdidas:
        this.promedio(
          perdidas.map(
            (item) =>
              item?.[
                campo
              ]
          )
        ),

      medianaGanadas:
        this.mediana(
          ganadas.map(
            (item) =>
              item?.[
                campo
              ]
          )
        ),

      medianaPerdidas:
        this.mediana(
          perdidas.map(
            (item) =>
              item?.[
                campo
              ]
          )
        )

    };

  }


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


  construirHallazgosPerfil(
    distribuciones,
    accuracyGeneral
  ) {

    const candidatos =
      [];


    const agregar =
      (
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

            accuracyGeneral,

            diferenciaVsGeneral:
              diferencia,

            clasificacion,

            fuerza:
              fila.total >=
                PROFILE_CONTROL
                  .minimumStrongSamples &&
              Math.abs(
                diferencia
              ) >=
                PROFILE_CONTROL
                  .strongGapPercent
                ? "MAS_FUERTE"
                : "PRELIMINAR"

          });

        }

      };


    agregar(
      "DIRECCION",
      distribuciones.direccion
    );


    agregar(
      "CONFIANZA",
      distribuciones.zonaConfianza
    );


    agregar(
      "RSI",
      distribuciones.zonaRsi
    );


    agregar(
      "TENDENCIA",
      distribuciones.tendencia
    );


    agregar(
      "MOMENTUM",
      distribuciones.momentum
    );


    agregar(
      "VOLATILIDAD",
      distribuciones.volatilidad
    );


    agregar(
      "PARIDAD_DIGITO",
      distribuciones.paridadUltimoDigito
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
        )
    );


    return candidatos.slice(
      0,
      PROFILE_CONTROL.maxHallazgos
    );

  }


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
        (item) =>
          item.resultado ===
          "GANADA"
      );


    const perdidas =
      datos.filter(
        (item) =>
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


    const normalizados =
      datos.map(
        (item) => {

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
              item?.zonaConfianza ||
              this.clasificarConfianza(
                item?.confianza
              ),

            zonaRsi:
              item?.zonaRsi ||
              this.clasificarRsi(
                item?.rsi
              ),

            tendenciaMomentum:
              item?.tendenciaMomentum ||
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
                Number.isInteger(
                  Number(
                    item?.ultimoDigito
                  )
                )
                  ? Number(
                      item.ultimoDigito
                    ) %
                      2 ===
                    0
                    ? "PAR"
                    : "IMPAR"
                  : "SIN_DATO"
              )

          };

        }
      );


    const distribuciones = {

      direccion:
        this.contarCategorias(
          normalizados,
          "direccion"
        ),

      zonaConfianza:
        this.contarCategorias(
          normalizados,
          "zonaConfianza"
        ),

      zonaRsi:
        this.contarCategorias(
          normalizados,
          "zonaRsi"
        ),

      tendencia:
        this.contarCategorias(
          normalizados,
          "tendencia"
        ),

      momentum:
        this.contarCategorias(
          normalizados,
          "momentum"
        ),

      volatilidad:
        this.contarCategorias(
          normalizados,
          "volatilidad"
        ),

      paridadUltimoDigito:
        this.contarCategorias(
          normalizados,
          "paridadUltimoDigito"
        )

    };


    const hallazgos =
      this.construirHallazgosPerfil(
        distribuciones,
        accuracy
      );


    return {

      mercado:
        symbol,

      versionAnalisis:
        TELEMETRY_VERSION,

      filtroAutomaticoActivo:
        false,

      muestras:
        total,

      ganadas:
        ganadas.length,

      perdidas:
        perdidas.length,

      accuracy,

      estadoAnalisis:
        total >=
          20
          ? "ANALISIS_ACTIVO"
          : total >=
              10
            ? "ANALISIS_PRELIMINAR"
            : total >
                0
              ? "RECOPILANDO"
              : "SIN_MUESTRAS",

      confianza:
        this.construirPerfilNumerico(
          normalizados,
          "confianza"
        ),

      rsi:
        this.construirPerfilNumerico(
          normalizados,
          "rsi"
        ),

      distribuciones,

      hallazgos,

      favorables:
        hallazgos.filter(
          (item) =>
            item.clasificacion ===
            "FAVORABLE"
        ),

      riesgos:
        hallazgos.filter(
          (item) =>
            item.clasificacion ===
            "RIESGO"
        )

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
        (item) =>
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
        (item) =>
          item.resultado ===
          "GANADA"
      ).length;


    const perdidas =
      finalizadas.filter(
        (item) =>
          item.resultado ===
          "PERDIDA"
      ).length;


    const pruebas =
      finalizadas.length;


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

      muestrasTimingDescartadas:
        finalizadas.length -
        timingValido.length,

      promedioSignalToBuyMs:
        this.promedio(
          timingValido.map(
            (item) =>
              item.signalToBuyMs
          )
        ),

      medianaSignalToBuyMs:
        this.mediana(
          timingValido.map(
            (item) =>
              item.signalToBuyMs
          )
        ),

      promedioProposalMs:
        this.promedio(
          timingValido.map(
            (item) =>
              item.proposalLatencyMs
          )
        ),

      promedioBuyMs:
        this.promedio(
          timingValido.map(
            (item) =>
              item.buyLatencyMs
          )
        ),

      promedioDesviacionTargetMs:
        this.promedio(
          timingValido.map(
            (item) =>
              item.buyTargetDeviationMs
          )
        ),

      medianaDesviacionTargetMs:
        this.mediana(
          timingValido.map(
            (item) =>
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


  obtenerResumenFamilia(
    familia
  ) {

    const datos =
      this.obtenerTelemetriaPorFamilia(
        familia
      );


    const finalizadas =
      datos.filter(
        (item) =>
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
        (item) =>
          item.resultado ===
          "GANADA"
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

      perdidas:
        pruebas -
        ganadas,

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
            (item) =>
              item.signalToBuyMs
          )
        ),

      medianaSignalToBuyMs:
        this.mediana(
          timingValido.map(
            (item) =>
              item.signalToBuyMs
          )
        ),

      promedioDesviacionTargetMs:
        this.promedio(
          timingValido.map(
            (item) =>
              item.buyTargetDeviationMs
          )
        )

    };

  }


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
        resumen.calibracionActualMs,

      muestrasTimingFix12:
        resumen.muestrasTimingFix12,

      muestrasTimingDescartadas:
        resumen.muestrasTimingDescartadas,

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


  obtenerResumenCalibracion(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const ajustes =
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
            (item) =>
              item.resultado ===
                "GANADA" ||
              item.resultado ===
                "PERDIDA"
          );


      const ganadas =
        datos.filter(
          (item) =>
            item.resultado ===
            "GANADA"
        ).length;


      ajustes[
        String(
          ajuste
        )
      ] = {

        ajusteMs:
          ajuste,

        ajusteSeg:
          ajuste /
          1000,

        pruebas:
          datos.length,

        ganadas,

        perdidas:
          datos.length -
          ganadas,

        accuracy:
          datos.length >
            0
            ? this.redondear(
                (
                  ganadas /
                  datos.length
                ) *
                100
              )
            : null

      };

    }


    return {

      mercado:
        symbol,

      ajusteActualMs:
        this.obtenerAjusteMercado(
          symbol
        ),

      ajustes

    };

  }


  /* ========================================
     CREAR CONTRATO + PROPUESTA
     ======================================== */

  async crearPreparacion(
    senal,
    telemetria
  ) {

    const contrato =
      contractMapper.mapear(
        senal
      );


    if (
      !contrato.ok
    ) {

      return {

        ok:
          false,

        etapa:
          "CONTRACT_MAPPER",

        error:
          contrato.error

      };

    }


    this.ultimoContrato =
      contrato;


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

      return {

        ok:
          false,

        etapa:
          "PROPOSAL_SIMULATOR",

        error:
          propuestaSimulada.error

      };

    }


    this.ultimaPropuesta =
      propuestaSimulada;


    telemetria
      .proposalRequestedEpoch =
      Date.now();


    telemetria
      .proposalRequestedPerf =
      this.ahora();

try {

  executionRecorder.recordProposalRequested(
    String(senal.id)
  );

} catch (error) {

  console.warn(
    "EXECUTION RECORDER · no pudo registrar solicitud de propuesta:",
    error
  );

}
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

try {

  executionRecorder.recordProposalReceived(
    String(senal.id),
    {
      receivedAt:
        telemetria.proposalReceivedEpoch
    }
  );

} catch (error) {

  console.warn(
    "EXECUTION RECORDER · no pudo registrar respuesta de propuesta:",
    error
  );

}
    if (
      !propuestaDeriv.ok
    ) {

      return {

        ok:
          false,

        etapa:
          "DERIV_PROPOSAL",

        error:
          propuestaDeriv.error,

        contrato,

        propuestaSimulada,

        propuestaDeriv

      };

    }


    this.ultimaPropuestaDeriv =
      propuestaDeriv;


    telemetria
      .proposalPreparedEpoch =
      Date.now();


    telemetria.resultado =
      "PROPUESTA_PREPARADA";


    return {

      ok:
        true,

      contrato,

      propuestaSimulada,

      propuestaDeriv

    };

  }


  /* ========================================
     FASE PREPARAR
     ======================================== */

  async procesarPreparacion(
    senal
  ) {

    const operacionId =
      this.obtenerOperacionId(
        senal
      );


    if (
      !operacionId
    ) {

      return {

        aceptada:
          false,

        etapa:
          "PREPARAR",

        motivo:
          "PREPARAR no incluye operacionId."

      };

    }


    /*
      Si BroadcastChannel y respaldo
      entregan lo mismo, no repetimos
      la cotización.
    */

    if (
      this.preparaciones.has(
        operacionId
      )
    ) {

      const existente =
        this.preparaciones.get(
          operacionId
        );


      return {

        aceptada:
          true,

        fase:
          "PREPARAR",

        estado:
          "YA_PREPARADA",

        operacionId,

        contrato:
          existente.contrato,

        propuestaDeriv:
          existente.propuestaDeriv,

        telemetria:
          {
            ...existente.telemetria
          }

      };

    }


    const telemetria =
      this.crearTelemetria(
        senal
      );


    const preparacion =
      await this.crearPreparacion(
        senal,
        telemetria
      );


    if (
      !preparacion.ok
    ) {

      telemetria.resultado =
        preparacion.etapa ===
          "DERIV_PROPOSAL"
          ? "PROPUESTA_RECHAZADA"
          : "PREPARACION_RECHAZADA";


      this.guardarTelemetria(
        telemetria
      );


      return {

        aceptada:
          false,

        fase:
          "PREPARAR",

        etapa:
          preparacion.etapa,

        motivo:
          preparacion.error,

        telemetria

      };

    }


    this.preparaciones.set(
      operacionId,
      {

        operacionId,

        senalPreparacion:
          {
            ...senal
          },

        contrato:
          preparacion.contrato,

        propuesta:
          preparacion.propuestaSimulada,

        propuestaDeriv:
          preparacion.propuestaDeriv,

        telemetria,

        preparedAt:
          Date.now()

      }
    );


    this.ultimaTelemetria =
      {
        ...telemetria
      };


    this.emitirEvento(
      "bot:prepared",
      {

        ok:
          true,

        operacionId,

        mercado:
          senal.mercado,

        direccion:
          senal.direccion,

        proposalId:
          preparacion
            .propuestaDeriv
            ?.id ??
          null,

        preparedAt:
          Date.now()

      }
    );


    return {

      aceptada:
        true,

      fase:
        "PREPARAR",

      estado:
        "PROPUESTA_PREPARADA",

      operacionId,

      mercado:
        senal.mercado,

      estrategia:
        senal.estrategia,

      direccion:
        senal.direccion,

      confianza:
        senal.confianza,

      contrato:
        preparacion.contrato,

      propuesta:
        preparacion.propuestaSimulada,

      propuestaDeriv:
        preparacion.propuestaDeriv,

      compraDemo:
        null,

      resultadoDemo:
        null,

      telemetria:
        {
          ...telemetria
        },

      preparacionLista:
        true,

      ejecucionDemoActiva:
        derivTrade
          .obtenerEstado()
          .ejecucionActiva

    };

  }


  /* ========================================
     FASE EJECUTAR
     ======================================== */

  async procesarEjecucion(
    senal,
    {
      onOperacionUpdate =
        null
    } = {}
  ) {

    const operacionId =
      this.obtenerOperacionId(
        senal
      );


    if (
      !operacionId
    ) {

      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        motivo:
          "EJECUTAR no incluye operacionId."

      };

    }


    const preparada =
      this.preparaciones.get(
        operacionId
      );


    /*
      No ejecutamos tarde desde cero.

      Si PREPARAR no existe, preferimos
      no comprar a destiempo.
    */

    if (
      !preparada
    ) {

      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        etapa:
          "PREPARACION_NO_ENCONTRADA",

        motivo:
          "No existe una cotización PREPARAR para esta operación."

      };

    }


    const telemetria =
      preparada.telemetria;


    telemetria
      .targetReceivedEpoch =
      Date.now();


    /*
      Actualizamos información del TARGET.
    */

    const programacion =
      this.calcularProgramacion(
        senal
      );


    telemetria
      .targetExecutionAt =
      programacion
        .targetExecutionAt;


    telemetria
      .programmedExecutionAt =
      programacion
        .programmedAt;


    telemetria
      .calibracionMs =
      programacion
        .ajusteMs;


    telemetria
      .calibracionSeg =
      programacion
        .ajusteSeg;


    telemetria
      .programacionDisponible =
      programacion
        .disponible;


    telemetria
      .puedeAnticipar =
      programacion
        .puedeAnticipar;


    telemetria
      .programacionMotivo =
      programacion
        .motivo;


    telemetria
      .esperaProgramadaInicialMs =
      programacion
        .esperaMs;


    telemetria
      .esperaProgramadaMs =
      programacion
        .esperaMs;


    if (
      !programacion.disponible
    ) {

      telemetria.resultado =
        "TARGET_INVALIDO";


      this.guardarTelemetria(
        telemetria
      );


      this.preparaciones.delete(
        operacionId
      );


      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        motivo:
          "TARGET no disponible.",

        telemetria

      };

    }


    /*
      Si el instante ya pasó demasiado,
      no compramos tarde.
    */

    if (
      programacion.programmedAt <
      Date.now() -
        100
    ) {

      telemetria.resultado =
        "TARGET_PERDIDO";


      telemetria
        .buyTargetDeviationMs =
        this.redondear(
          Date.now() -
          programacion.programmedAt
        );


      this.guardarTelemetria(
        telemetria
      );


      this.preparaciones.delete(
        operacionId
      );


      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        motivo:
          "El instante programado ya pasó.",

        telemetria

      };

    }


    /* ====================================
       ESPERA HASTA TARGET + CALIBRACIÓN
       ==================================== */

    const restanteMs =
      Math.max(
        0,
        programacion.programmedAt -
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


    /* ====================================
       EJECUCIÓN DEMO
       ==================================== */

    if (
      !derivTrade
        .obtenerEstado()
        .ejecucionActiva
    ) {

      telemetria.resultado =
        "SOLO_COTIZACION";


      this.guardarTelemetria(
        telemetria
      );


      this.preparaciones.delete(
        operacionId
      );


      return {

        aceptada:
          true,

        fase:
          "EJECUTAR",

        estado:
          "SOLO_COTIZACION",

        operacionId,

        contrato:
          preparada.contrato,

        propuestaDeriv:
          preparada.propuestaDeriv,

        compraDemo:
          null,

        resultadoDemo:
          null,

        telemetria:
          {
            ...telemetria
          },

        ejecucionDemoActiva:
          false

      };

    }


    /* ====================================
       BUY REQUESTED
       ==================================== */

    const buyRequestedAt =
      Date.now();


    telemetria
      .buyRequestedEpoch =
      buyRequestedAt;


    telemetria
      .buyRequestedPerf =
      this.ahora();


    telemetria
      .buyTargetDeviationMs =
      this.redondear(
        buyRequestedAt -
        programacion.programmedAt
      );


    /*
      Evento inmediato para que bot.js
      pueda mostrar BUY ENVIADO sin
      esperar la confirmación.
    */

    this.emitirEvento(
      "bot:buy-requested",
      {

        operacionId,

        mercado:
          senal.mercado,

        direccion:
          senal.direccion,

        targetExecutionAt:
          programacion.targetExecutionAt,

        programmedExecutionAt:
          programacion.programmedAt,

        calibracionMs:
          programacion.ajusteMs,

        buyRequestedAt,

        buyTargetDeviationMs:
          telemetria
            .buyTargetDeviationMs

      }
    );


    const compraDemo =
      await derivTrade.comprar(
        preparada.propuestaDeriv
      );


    const buyConfirmedAt =
      Date.now();


    telemetria
      .buyConfirmedEpoch =
      buyConfirmedAt;


    telemetria
      .buyConfirmedPerf =
      this.ahora();


    telemetria
      .buyConfirmTargetDeviationMs =
      this.redondear(
        buyConfirmedAt -
        programacion.programmedAt
      );


    /* ====================================
       BUY RECHAZADO
       ==================================== */

    if (
      !compraDemo.ok
    ) {

      telemetria.resultado =
        "BUY_RECHAZADO";


      this.emitirEvento(
        "bot:buy-confirmed",
        {

          ok:
            false,

          operacionId,

          mercado:
            senal.mercado,

          direccion:
            senal.direccion,

          error:
            compraDemo.error ??
            compraDemo.mensaje ??
            "BUY rechazado.",

          buyTargetDeviationMs:
            telemetria
              .buyTargetDeviationMs,

          buyConfirmTargetDeviationMs:
            telemetria
              .buyConfirmTargetDeviationMs

        }
      );


      this.guardarTelemetria(
        telemetria
      );


      this.preparaciones.delete(
        operacionId
      );


      return {

        aceptada:
          true,

        fase:
          "EJECUTAR",

        estado:
          "BUY_RECHAZADO",

        operacionId,

        contrato:
          preparada.contrato,

        propuesta:
          preparada.propuesta,

        propuestaDeriv:
          preparada.propuestaDeriv,

        compraDemo,

        resultadoDemo:
          null,

        telemetria:
          {
            ...telemetria
          }

      };

    }


    /* ====================================
       BUY CONFIRMADO
       ==================================== */

    this.ultimaCompraDemo =
      compraDemo.compra;


    telemetria.contractId =
      compraDemo
        .compra
        .contractId;


    this.emitirEvento(
      "bot:buy-confirmed",
      {

        ok:
          true,

        operacionId,

        mercado:
          senal.mercado,

        direccion:
          senal.direccion,

        compra:
          compraDemo.compra,

        targetExecutionAt:
          programacion.targetExecutionAt,

        programmedExecutionAt:
          programacion.programmedAt,

        calibracionMs:
          programacion.ajusteMs,

        buyTargetDeviationMs:
          telemetria
            .buyTargetDeviationMs,

        buyConfirmTargetDeviationMs:
          telemetria
            .buyConfirmTargetDeviationMs

      }
    );


    /* ====================================
       RESULTADO
       ==================================== */

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


    let resultadoDemo =
      null;


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


      this.emitirEvento(
        "bot:result",
        {

          operacionId,

          mercado:
            senal.mercado,

          direccion:
            senal.direccion,

          resultado:
            telemetria.resultado,

          profit,

          resultadoDemo

        }
      );

    }

    else {

      resultadoDemo =
        seguimiento;


      telemetria.resultado =
        "SIN_CONFIRMAR";


      telemetria.profit =
        null;


      this.emitirEvento(
        "bot:result",
        {

          operacionId,

          mercado:
            senal.mercado,

          direccion:
            senal.direccion,

          resultado:
            "SIN_CONFIRMAR",

          profit:
            null,

          resultadoDemo

        }
      );

    }


    this.ultimaSenalProcesada =
      operacionId;


    this.guardarTelemetria(
      telemetria
    );


    this.preparaciones.delete(
      operacionId
    );


    const perfilSenal =
      this.obtenerResumenPerfilSenal(
        telemetria.mercado
      );


    return {

      aceptada:
        true,

      fase:
        "EJECUTAR",

      estado:
        telemetria.resultado,

      modo:
        this.modo,

      operacionId,

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

      contrato:
        preparada.contrato,

      propuesta:
        preparada.propuesta,

      propuestaDeriv:
        preparada.propuestaDeriv,

      compraDemo,

      resultadoDemo,

      telemetria:
        {
          ...telemetria
        },

      resumenMercado:
        this.obtenerResumenMercado(
          telemetria.mercado
        ),

      comparacionMercado:
        this.obtenerComparacionMercado(
          telemetria.mercado
        ),

      resumenCalibracion:
        this.obtenerResumenCalibracion(
          telemetria.mercado
        ),

      perfilSenal,

      analisisPerfil:
        perfilSenal,

      resumenMercados:
        this.obtenerResumenMercados(),

      resumenStandard:
        this.obtenerResumenFamilia(
          "STANDARD"
        ),

      resumen1S:
        this.obtenerResumenFamilia(
          "1S"
        ),

      ejecucionDemoActiva:
        derivTrade
          .obtenerEstado()
          .ejecucionActiva

    };

  }


  /* ========================================
     PROCESAR SEÑAL
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

    /*
      Conservamos parámetro por
      compatibilidad con bot.js.
    */

    void senalRecibidaPerf;


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


    if (
      !senal ||
      typeof senal !==
        "object"
    ) {

      return {

        aceptada:
          false,

        motivo:
          "Señal inválida."

      };

    }


    const fase =
      this.obtenerFase(
        senal
      );


    /*
      FIX13.4.2
      PROTOCOLO NUEVO.
    */

    if (
      fase ===
      "PREPARAR"
    ) {

      return this
        .procesarPreparacion(
          senal
        );

    }


    if (
      fase ===
      "EJECUTAR"
    ) {

      return this
        .procesarEjecucion(
          senal,
          {
            onOperacionUpdate
          }
        );

    }


    /*
      SEGURIDAD:

      No compramos automáticamente
      señales antiguas sin fase mientras
      estemos probando FIX13.4.2.
    */

    return {

      aceptada:
        false,

      fase,

      motivo:
        "Señal sin protocolo PREPARAR/EJECUTAR. FIX13.4.2 requiere las dos fases."

    };

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

      sincronizacionVisual:
        SYNC_VERSION,

      protocolo:
        "PREPARAR_EJECUTAR",

      preparacionesActivas:
        this.preparaciones.size,

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
   FIX13.4.2
   ========================================== */
