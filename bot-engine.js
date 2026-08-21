/* ==========================================
   BOT V1 MR
   BOT-ENGINE.JS
   FIX13.8 MEMORIA DE PATRONES

   BASE: FIX13.7

   CONSERVA:
   - AUTOMÁTICO
   - MANUAL DIAGNÓSTICO
   - PREPARAR / EJECUTAR
   - DERIV DEMO
   - TELEMETRÍA
   - GANADA / PERDIDA
   - 12 MERCADOS
   - CALIBRACIÓN -0.3 A +1.0
   - SCORE BRUTO
   - PERFILES
   - COMPARADORES
   - HISTORIAL EN MEMORIA
   - CACHÉ DE ESTADÍSTICAS
   - ESTADO RÁPIDO
   - MANUAL LISTO DESDE PREPARAR
   - TARGET ACTUALIZA REFERENCIA DESPUÉS
   - NUEVA OPERACIÓN MANUAL DESCARTA ANTIGUA

   FIX13.8 AGREGA:
   - MEMORIA PERSISTENTE DE PATRONES
   - AGRUPACIÓN POR:
       MERCADO
       ESTRATEGIA
       DIRECCIÓN
       VALOR DEL PATRÓN
       CONFIANZA
       SCORE BRUTO
   - FAVORABLE / RIESGO / SIN EVIDENCIA
   - MODO APRENDIZAJE
   - FILTRO HISTÓRICO AUTOMÁTICO
   - MANUAL NUNCA ES BLOQUEADO
   - REGISTRO AUTOMÁTICO GANADA/PERDIDA
   - TIMING REAL SE GUARDA EN PATRÓN
   - BASE PARA TESTLOG DESCARGABLE
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

import {
  executionRecorder
} from "./execution-recorder.js";


/* ==========================================
   STORAGE
   ========================================== */

const TELEMETRY_KEY =
  "BOT_V1_MR_FIX8_TELEMETRY";

const CALIBRATION_KEY =
  "BOT_V1_MR_FIX11_CALIBRATION";

const EXECUTION_MODE_KEY =
  "BOT_V1_MR_FIX13_6_EXECUTION_MODE";

const PATTERN_MEMORY_KEY =
  "BOT_V1_MR_FIX13_8_PATTERN_MEMORY";


/* ==========================================
   VERSIONES
   ========================================== */

const TELEMETRY_VERSION =
  "FIX13.8";

const TIMING_BASE_VERSION =
  "FIX13.8";

const SYNC_VERSION =
  "FIX13.8";

const PATTERN_VERSION =
  "FIX13.8-PATTERN-1";


const TIMING_COMPATIBLE_VERSIONS = [
  "FIX12",
  "FIX13",
  "FIX13.1",
  "FIX13.2",
  "FIX13.3",
  "FIX13.4",
  "FIX13.4.1",
  "FIX13.4.2",
  "FIX13.5",
  "FIX13.6",
  "FIX13.7",
  "FIX13.8"
];


const SIGNAL_PROFILE_VERSIONS = [
  "FIX13",
  "FIX13.1",
  "FIX13.2",
  "FIX13.3",
  "FIX13.4",
  "FIX13.4.1",
  "FIX13.4.2",
  "FIX13.5",
  "FIX13.6",
  "FIX13.7",
  "FIX13.8"
];


const MODOS_EJECUCION = {

  AUTOMATICO:
    "AUTOMATICO",

  MANUAL:
    "MANUAL_DIAGNOSTICO"

};


/* ==========================================
   CONTROL
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
   FIX13.8
   CONTROL MEMORIA DE PATRONES
   ========================================== */

const PATTERN_CONTROL = {

  /*
    Con menos de 4 operaciones,
    no se bloquea nada.
  */

  minimumDecisionSamples:
    4,


  /*
    8 o más muestras convierten
    el patrón en evidencia más fuerte.
  */

  strongEvidenceSamples:
    8,


  /*
    Si alcanza 70% o más:
    FAVORABLE.
  */

  favorableAccuracy:
    70,


  /*
    Si cae a 35% o menos:
    RIESGO.
  */

  riskAccuracy:
    35,


  /*
    36% a 69%:
    NEUTRO / SIN EVIDENCIA FUERTE.
  */

  confidenceBucketSize:
    2,


  /*
    Score bruto se agrupa
    de 5 en 5.
  */

  scoreBucketSize:
    5,


  /*
    Valor especial de la predicción,
    si existe, se agrupa de 5 en 5.

    Ejemplos:
    20.0
    30.0
    40.0
  */

  valueBucketSize:
    5,


  /*
    Timing observado se agrupa
    de 100 ms en 100 ms.
  */

  timingBucketSizeMs:
    100,


  /*
    Número máximo de resultados
    recientes guardados dentro
    de cada patrón.
  */

  maxRecentResults:
    20,


  /*
    Límite de patrones persistidos.
  */

  maxPatterns:
    1500,


  /*
    El filtro se aplica únicamente
    al AUTOMÁTICO.
  */

  blockRiskInAutomatic:
    true,


  /*
    Los patrones desconocidos
    se ejecutan en DEMO para aprender.
  */

  learningMode:
    true

};


const PREPARATION_TTL_MS =
  60000;


/* ==========================================
   MERCADOS
   ========================================== */

const MERCADOS_STANDARD = [
  "R_10",
  "R_25",
  "R_50",
  "R_75",
  "R_100"
];


const MERCADOS_1S = [
  "1HZ10V",
  "1HZ15V",
  "1HZ25V",
  "1HZ30V",
  "1HZ50V",
  "1HZ75V",
  "1HZ100V"
];


const MERCADOS_CONTROLADOS = [
  ...MERCADOS_STANDARD,
  ...MERCADOS_1S
];


/* ==========================================
   CALIBRACIÓN
   ========================================== */

const AJUSTES_PERMITIDOS_MS = [
  -300,
  -200,
  -100,
  0,
  100,
  200,
  300,
  400,
  500,
  600,
  700,
  800,
  900,
  1000
];


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
   MOTOR
   ========================================== */

class BotEngine {

  constructor() {

    this.activo =
      false;

    this.pausado =
      false;

    this.modo =
      "DERIV DEMO + FIX13.8 MEMORIA DE PATRONES";

    this.modoEjecucion =
      this.cargarModoEjecucion();

    this.ultimaSenalProcesada =
      null;

    this.senalesEnProceso =
      new Set();

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

    this.ultimoAnalisisPatron =
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


    /*
      Historial FIX13.7:
      carga una sola vez.
    */

    this.historialTelemetria =
      this.cargarHistorialTelemetria();


    /*
      FIX13.8:
      memoria histórica consolidada.
    */

    this.memoriaPatrones =
      this.cargarMemoriaPatrones();


    /*
      Caché de analítica pesada.
    */

    this.cacheAnalitica =
      null;


    this.timerLimpieza =
      setInterval(
        () => {

          this
            .limpiarPreparacionesExpiradas();

        },
        5000
      );

  }


  /* ========================================
     UTILIDADES
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
          a,
          b
        ) =>
          a +
          b,
        0
      );


    return this.redondear(
      total /
      validos.length
    );

  }


  mediana(
    valores
  ) {

    const validos =
      this
        .valoresValidos(
          valores
        )
        .sort(
          (
            a,
            b
          ) =>
            a -
            b
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


  minimo(
    valores
  ) {

    const validos =
      this.valoresValidos(
        valores
      );


    return validos.length
      ? this.redondear(
          Math.min(
            ...validos
          )
        )
      : null;

  }


  maximo(
    valores
  ) {

    const validos =
      this.valoresValidos(
        valores
      );


    return validos.length
      ? this.redondear(
          Math.max(
            ...validos
          )
        )
      : null;

  }


  diferencia(
    inicio,
    fin
  ) {

    const a =
      Number(
        inicio
      );

    const b =
      Number(
        fin
      );


    if (
      !Number.isFinite(
        a
      ) ||
      !Number.isFinite(
        b
      )
    ) {

      return null;

    }


    return this.redondear(
      b -
      a
    );

  }


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
     CACHÉ
     ======================================== */

  invalidarCacheAnalitica() {

    this.cacheAnalitica =
      null;

  }


  /* ========================================
     HISTORIAL TELEMETRÍA
     ======================================== */

  cargarHistorialTelemetria() {

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


  obtenerHistorialTelemetria() {

    return this.historialTelemetria;

  }


  persistirHistorialTelemetria() {

    try {

      localStorage.setItem(
        TELEMETRY_KEY,
        JSON.stringify(
          this.historialTelemetria
        )
      );


      return true;

    }

    catch (
      error
    ) {

      console.warn(
        "No se pudo persistir historial:",
        error
      );


      return false;

    }

  }


  /* ========================================
     FIX13.8
     MEMORIA DE PATRONES
     ======================================== */

  cargarMemoriaPatrones() {

    try {

      const datos =
        JSON.parse(
          localStorage.getItem(
            PATTERN_MEMORY_KEY
          ) ||
          "{}"
        );


      if (
        datos &&
        typeof datos ===
          "object" &&
        !Array.isArray(
          datos
        )
      ) {

        return datos;

      }

    }

    catch (
      error
    ) {

      console.warn(
        "No se pudo cargar memoria de patrones:",
        error
      );

    }


    return {};

  }


  persistirMemoriaPatrones() {

    try {

      const entradas =
        Object.entries(
          this.memoriaPatrones
        );


      /*
        Evita crecimiento ilimitado.
        Conserva los patrones más recientes.
      */

      if (
        entradas.length >
        PATTERN_CONTROL
          .maxPatterns
      ) {

        entradas.sort(
          (
            a,
            b
          ) =>
            Number(
              b[1]
                ?.updatedAt ??
              0
            ) -
            Number(
              a[1]
                ?.updatedAt ??
              0
            )
        );


        const recortadas =
          entradas.slice(
            0,
            PATTERN_CONTROL
              .maxPatterns
          );


        this.memoriaPatrones =
          Object.fromEntries(
            recortadas
          );

      }


      localStorage.setItem(
        PATTERN_MEMORY_KEY,
        JSON.stringify(
          this.memoriaPatrones
        )
      );


      return true;

    }

    catch (
      error
    ) {

      console.warn(
        "No se pudo guardar memoria de patrones:",
        error
      );


      return false;

    }

  }


  /* ========================================
     BUCKETS / AGRUPACIÓN
     ======================================== */

  agruparNumero(
    valor,
    paso
  ) {

    const numero =
      Number(
        valor
      );


    const tamano =
      Number(
        paso
      );


    if (
      !Number.isFinite(
        numero
      ) ||
      !Number.isFinite(
        tamano
      ) ||
      tamano <=
        0
    ) {

      return null;

    }


    return (
      Math.round(
        numero /
        tamano
      ) *
      tamano
    );

  }


  extraerValorPatron(
    senal
  ) {

    const candidatos = [

      senal
        ?.valorPatron,

      senal
        ?.predictionValue,

      senal
        ?.diferencia,

      senal
        ?.shortDiff,

      senal
        ?.valor,

      senal
        ?.metadata
        ?.valorPatron,

      senal
        ?.metadata
        ?.predictionValue,

      senal
        ?.metadata
        ?.diferencia,

      senal
        ?.metadata
        ?.shortDiff,

      senal
        ?.metadata
        ?.engine1
        ?.shortDiff,

      senal
        ?.metadata
        ?.engine1
        ?.difference

    ];


    for (
      const candidato
      of candidatos
    ) {

      const numero =
        Number(
          candidato
        );


      if (
        Number.isFinite(
          numero
        )
      ) {

        return this.redondear(
          numero
        );

      }

    }


    return null;

  }


  crearFirmaPatron(
    senal
  ) {

    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );


    const estrategia =
      this.normalizarTexto(
        senal?.estrategia
      ) ||
      "SIN_ESTRATEGIA";


    const direccion =
      this.normalizarTexto(
        senal?.direccion
      ) ||
      "SIN_DIRECCION";


    const confianza =
      Number(
        senal?.confianza
      );


    const scoreBruto =
      this.extraerScoreBruto(
        senal
      );


    const valorPatron =
      this.extraerValorPatron(
        senal
      );


    const confianzaBucket =
      Number.isFinite(
        confianza
      )
        ? this.agruparNumero(
            confianza,
            PATTERN_CONTROL
              .confidenceBucketSize
          )
        : null;


    const scoreBucket =
      Number.isFinite(
        Number(
          scoreBruto
        )
      )
        ? this.agruparNumero(
            scoreBruto,
            PATTERN_CONTROL
              .scoreBucketSize
          )
        : null;


    const valorBucket =
      Number.isFinite(
        Number(
          valorPatron
        )
      )
        ? this.agruparNumero(
            valorPatron,
            PATTERN_CONTROL
              .valueBucketSize
          )
        : null;


    const key = [

      mercado ||
        "SIN_MERCADO",

      estrategia,

      direccion,

      `V${
        valorBucket ??
        "X"
      }`,

      `C${
        confianzaBucket ??
        "X"
      }`,

      `S${
        scoreBucket ??
        "X"
      }`

    ].join(
      "|"
    );


    return {

      key,

      version:
        PATTERN_VERSION,

      mercado,

      estrategia,

      direccion,

      confianza:
        Number.isFinite(
          confianza
        )
          ? this.redondear(
              confianza
            )
          : null,

      confianzaBucket,

      scoreBruto,

      scoreBucket,

      valorPatron,

      valorBucket

    };

  }


  /* ========================================
     CLASIFICAR PATRÓN
     ======================================== */

  clasificarPatronHistorico(
    entrada
  ) {

    if (
      !entrada ||
      Number(
        entrada.total ??
        0
      ) <
        PATTERN_CONTROL
          .minimumDecisionSamples
    ) {

      return {

        clasificacion:
          "SIN_EVIDENCIA",

        fuerza:
          "RECOPILANDO",

        decision:
          "APRENDER",

        bloquear:
          false

      };

    }


    const total =
      Number(
        entrada.total ??
        0
      );


    const ganadas =
      Number(
        entrada.ganadas ??
        0
      );


    const accuracy =
      total >
        0
        ? (
            ganadas /
            total
          ) *
          100
        : 0;


    const fuerte =
      total >=
      PATTERN_CONTROL
        .strongEvidenceSamples;


    if (
      accuracy >=
      PATTERN_CONTROL
        .favorableAccuracy
    ) {

      return {

        clasificacion:
          "FAVORABLE",

        fuerza:
          fuerte
            ? "FUERTE"
            : "PRELIMINAR",

        decision:
          "PERMITIR",

        bloquear:
          false

      };

    }


    if (
      accuracy <=
      PATTERN_CONTROL
        .riskAccuracy
    ) {

      return {

        clasificacion:
          "RIESGO",

        fuerza:
          fuerte
            ? "FUERTE"
            : "PRELIMINAR",

        decision:
          "NO_OPERAR",

        bloquear:
          true

      };

    }


    return {

      clasificacion:
        "NEUTRO",

      fuerza:
        fuerte
          ? "FUERTE"
          : "PRELIMINAR",

      decision:
        "APRENDER",

      bloquear:
        false

    };

  }


  analizarPatron(
    senal
  ) {

    const firma =
      this.crearFirmaPatron(
        senal
      );


    const entrada =
      this.memoriaPatrones[
        firma.key
      ] ||
      null;


    const clasificacion =
      this.clasificarPatronHistorico(
        entrada
      );


    const total =
      Number(
        entrada?.total ??
        0
      );


    const ganadas =
      Number(
        entrada?.ganadas ??
        0
      );


    const perdidas =
      Number(
        entrada?.perdidas ??
        0
      );


    const accuracy =
      total >
        0
        ? this.redondear(
            (
              ganadas /
              total
            ) *
              100
          )
        : null;


    const resultado = {

      ...firma,

      total,

      muestras:
        total,

      ganadas,

      perdidas,

      accuracy,

      clasificacion:
        clasificacion
          .clasificacion,

      fuerza:
        clasificacion
          .fuerza,

      decision:
        clasificacion
          .decision,

      bloquear:
        clasificacion
          .bloquear,

      promedioTimingMs:
        entrada
          ?.promedioTimingMs ??
        null,

      promedioManualClickTargetMs:
        entrada
          ?.promedioManualClickTargetMs ??
        null,

      promedioBuyTargetMs:
        entrada
          ?.promedioBuyTargetMs ??
        null,

      ultimosResultados:
        Array.isArray(
          entrada
            ?.ultimosResultados
        )
          ? [
              ...entrada
                .ultimosResultados
            ]
          : []

    };


    this.ultimoAnalisisPatron =
      {
        ...resultado
      };


    this.emitirEvento(
      "bot:pattern-evaluated",
      resultado
    );


    return resultado;

  }


  /* ========================================
     REGISTRAR RESULTADO EN MEMORIA
     ======================================== */

  registrarResultadoPatron(
    telemetria
  ) {

    if (
      !telemetria ||
      !(
        telemetria.resultado ===
          "GANADA" ||
        telemetria.resultado ===
          "PERDIDA"
      )
    ) {

      return null;

    }


    const firma =
      telemetria
        .patronFirma ||
      null;


    const key =
      telemetria
        .patronKey ||
      firma?.key ||
      null;


    if (
      !key
    ) {

      return null;

    }


    const anterior =
      this.memoriaPatrones[
        key
      ] ||
      {

        key,

        version:
          PATTERN_VERSION,

        mercado:
          firma?.mercado ??
          telemetria.mercado ??
          null,

        estrategia:
          firma?.estrategia ??
          telemetria.estrategia ??
          null,

        direccion:
          firma?.direccion ??
          telemetria.direccion ??
          null,

        valorBucket:
          firma?.valorBucket ??
          null,

        confianzaBucket:
          firma?.confianzaBucket ??
          null,

        scoreBucket:
          firma?.scoreBucket ??
          null,

        total:
          0,

        ganadas:
          0,

        perdidas:
          0,

        sumaTimingMs:
          0,

        muestrasTiming:
          0,

        sumaManualClickTargetMs:
          0,

        muestrasManualClickTarget:
          0,

        sumaBuyTargetMs:
          0,

        muestrasBuyTarget:
          0,

        promedioTimingMs:
          null,

        promedioManualClickTargetMs:
          null,

        promedioBuyTargetMs:
          null,

        ultimosResultados:
          [],

        createdAt:
          Date.now(),

        updatedAt:
          Date.now()

      };


    anterior.total =
      Number(
        anterior.total ??
        0
      ) +
      1;


    if (
      telemetria.resultado ===
      "GANADA"
    ) {

      anterior.ganadas =
        Number(
          anterior.ganadas ??
          0
        ) +
        1;

    }


    if (
      telemetria.resultado ===
      "PERDIDA"
    ) {

      anterior.perdidas =
        Number(
          anterior.perdidas ??
          0
        ) +
        1;

    }


    /*
      Timing real disponible.
    */

    const timingPrincipal =
      Number.isFinite(
        Number(
          telemetria
            .manualClickToTargetMs
        )
      )
        ? Number(
            telemetria
              .manualClickToTargetMs
          )
        : Number.isFinite(
            Number(
              telemetria
                .buyTargetDeviationMs
            )
          )
          ? Number(
              telemetria
                .buyTargetDeviationMs
            )
          : null;


    if (
      Number.isFinite(
        timingPrincipal
      )
    ) {

      anterior.sumaTimingMs =
        Number(
          anterior.sumaTimingMs ??
          0
        ) +
        timingPrincipal;


      anterior.muestrasTiming =
        Number(
          anterior.muestrasTiming ??
          0
        ) +
        1;


      anterior.promedioTimingMs =
        this.redondear(
          anterior
            .sumaTimingMs /
          anterior
            .muestrasTiming
        );

    }


    const manualClick =
      Number(
        telemetria
          .manualClickToTargetMs
      );


    if (
      Number.isFinite(
        manualClick
      )
    ) {

      anterior
        .sumaManualClickTargetMs =
        Number(
          anterior
            .sumaManualClickTargetMs ??
          0
        ) +
        manualClick;


      anterior
        .muestrasManualClickTarget =
        Number(
          anterior
            .muestrasManualClickTarget ??
          0
        ) +
        1;


      anterior
        .promedioManualClickTargetMs =
        this.redondear(
          anterior
            .sumaManualClickTargetMs /
          anterior
            .muestrasManualClickTarget
        );

    }


    const buyTarget =
      Number(
        telemetria
          .buyTargetDeviationMs
      );


    if (
      Number.isFinite(
        buyTarget
      )
    ) {

      anterior
        .sumaBuyTargetMs =
        Number(
          anterior
            .sumaBuyTargetMs ??
          0
        ) +
        buyTarget;


      anterior
        .muestrasBuyTarget =
        Number(
          anterior
            .muestrasBuyTarget ??
          0
        ) +
        1;


      anterior
        .promedioBuyTargetMs =
        this.redondear(
          anterior
            .sumaBuyTargetMs /
          anterior
            .muestrasBuyTarget
        );

    }


    const accuracy =
      anterior.total >
        0
        ? this.redondear(
            (
              anterior.ganadas /
              anterior.total
            ) *
              100
          )
        : null;


    anterior.accuracy =
      accuracy;


    const resumenResultado = {

      resultado:
        telemetria.resultado,

      fecha:
        Date.now(),

      confianza:
        telemetria.confianza ??
        null,

      scoreBruto:
        telemetria.scoreBruto ??
        null,

      valorPatron:
        telemetria.valorPatron ??
        null,

      modo:
        telemetria.modoEjecucion ??
        null,

      clickTargetMs:
        telemetria
          .manualClickToTargetMs ??
        null,

      buyTargetMs:
        telemetria
          .buyTargetDeviationMs ??
        null,

      profit:
        telemetria.profit ??
        null,

      contractId:
        telemetria.contractId ??
        null

    };


    anterior
      .ultimosResultados =
      Array.isArray(
        anterior
          .ultimosResultados
      )
        ? anterior
            .ultimosResultados
        : [];


    anterior
      .ultimosResultados
      .unshift(
        resumenResultado
      );


    if (
      anterior
        .ultimosResultados
        .length >
      PATTERN_CONTROL
        .maxRecentResults
    ) {

      anterior
        .ultimosResultados
        .length =
        PATTERN_CONTROL
          .maxRecentResults;

    }


    anterior.updatedAt =
      Date.now();


    const nuevaClasificacion =
      this.clasificarPatronHistorico(
        anterior
      );


    anterior.clasificacion =
      nuevaClasificacion
        .clasificacion;


    anterior.fuerza =
      nuevaClasificacion
        .fuerza;


    anterior.decision =
      nuevaClasificacion
        .decision;


    this.memoriaPatrones[
      key
    ] =
      anterior;


    this.persistirMemoriaPatrones();


    const evento = {

      key,

      mercado:
        anterior.mercado,

      estrategia:
        anterior.estrategia,

      direccion:
        anterior.direccion,

      total:
        anterior.total,

      ganadas:
        anterior.ganadas,

      perdidas:
        anterior.perdidas,

      accuracy:
        anterior.accuracy,

      clasificacion:
        anterior.clasificacion,

      fuerza:
        anterior.fuerza,

      decision:
        anterior.decision,

      promedioTimingMs:
        anterior
          .promedioTimingMs

    };


    this.emitirEvento(
      "bot:pattern-updated",
      evento
    );


    return evento;

  }


  /* ========================================
     RESUMEN MEMORIA
     ======================================== */

  obtenerResumenMemoriaPatrones() {

    const patrones =
      Object.values(
        this.memoriaPatrones
      );


    const favorables =
      patrones.filter(
        (
          item
        ) =>
          item?.clasificacion ===
          "FAVORABLE"
      );


    const riesgos =
      patrones.filter(
        (
          item
        ) =>
          item?.clasificacion ===
          "RIESGO"
      );


    const neutros =
      patrones.filter(
        (
          item
        ) =>
          item?.clasificacion ===
            "NEUTRO" ||
          item?.clasificacion ===
            "SIN_EVIDENCIA" ||
          !item?.clasificacion
      );


    const operaciones =
      patrones.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item?.total ??
            0
          ),
        0
      );


    return {

      version:
        PATTERN_VERSION,

      patrones:
        patrones.length,

      operaciones,

      favorables:
        favorables.length,

      riesgos:
        riesgos.length,

      sinEvidencia:
        neutros.length,

      minimumDecisionSamples:
        PATTERN_CONTROL
          .minimumDecisionSamples,

      favorableAccuracy:
        PATTERN_CONTROL
          .favorableAccuracy,

      riskAccuracy:
        PATTERN_CONTROL
          .riskAccuracy,

      learningMode:
        PATTERN_CONTROL
          .learningMode,

      filtroAutomatico:
        PATTERN_CONTROL
          .blockRiskInAutomatic

    };

  }


  obtenerPatronesOrdenados() {

    return Object
      .values(
        this.memoriaPatrones
      )
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          Number(
            b?.total ??
            0
          ) -
          Number(
            a?.total ??
            0
          )
      );

  }


  restablecerMemoriaPatrones() {

    this.memoriaPatrones =
      {};


    this.persistirMemoriaPatrones();


    this.ultimoAnalisisPatron =
      null;


    this.emitirEvento(
      "bot:pattern-memory-reset",
      {
        ok:
          true
      }
    );


    return {

      ok:
        true,

      mensaje:
        "Memoria de patrones restablecida."

    };

  }


  /* ========================================
     TESTLOG BASE
     ======================================== */

  obtenerTestLog() {

    return {

      generadoEn:
        new Date()
          .toISOString(),

      versionBot:
        TELEMETRY_VERSION,

      versionPatrones:
        PATTERN_VERSION,

      configuracion: {

        modoEjecucion:
          this.modoEjecucion,

        monto:
          this.configuracion
            .monto,

        calibracion:
          {
            ...this.calibracion
          },

        patternControl:
          {
            ...PATTERN_CONTROL
          }

      },

      resumenMemoria:
        this
          .obtenerResumenMemoriaPatrones(),

      patrones:
        this
          .obtenerPatronesOrdenados(),

      telemetria:
        this.historialTelemetria
          .slice()

    };

  }


  /* ========================================
     MODO
     ======================================== */

  cargarModoEjecucion() {

    try {

      const guardado =
        String(
          localStorage.getItem(
            EXECUTION_MODE_KEY
          ) ||
          ""
        )
          .trim()
          .toUpperCase();


      if (
        guardado ===
        MODOS_EJECUCION.MANUAL
      ) {

        return MODOS_EJECUCION.MANUAL;

      }

    }

    catch {

      // sin almacenamiento

    }


    return MODOS_EJECUCION
      .AUTOMATICO;

  }


  guardarModoEjecucion() {

    try {

      localStorage.setItem(
        EXECUTION_MODE_KEY,
        this.modoEjecucion
      );


      return true;

    }

    catch {

      return false;

    }

  }


  establecerModoEjecucion(
    modo
  ) {

    const normalizado =
      String(
        modo ||
        ""
      )
        .trim()
        .toUpperCase();


    if (
      normalizado !==
        MODOS_EJECUCION
          .AUTOMATICO &&
      normalizado !==
        MODOS_EJECUCION
          .MANUAL
    ) {

      return {

        ok:
          false,

        mensaje:
          "Modo de ejecución no válido."

      };

    }


    if (
      normalizado !==
      this.modoEjecucion
    ) {

      this.preparaciones
        .clear();

    }


    this.modoEjecucion =
      normalizado;


    this.guardarModoEjecucion();


    this.emitirEvento(
      "bot:execution-mode",
      {

        modo:
          this.modoEjecucion

      }
    );


    return {

      ok:
        true,

      modo:
        this.modoEjecucion,

      mensaje:
        this.modoEjecucion ===
          MODOS_EJECUCION.MANUAL
          ? "Modo MANUAL DIAGNÓSTICO activo."
          : "Modo AUTOMÁTICO activo."

    };

  }


  obtenerModoEjecucion() {

    return this.modoEjecucion;

  }


  esModoManual() {

    return (
      this.modoEjecucion ===
      MODOS_EJECUCION.MANUAL
    );

  }


  /* ========================================
     MERCADO
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


      const resultado = {
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


    return (
      this.obtenerFamiliaMercado(
        symbol
      ) ===
      "1S"
        ? 100
        : 0
    );

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


    this.invalidarCacheAnalitica();


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


    this.invalidarCacheAnalitica();


    return {

      ok:
        true,

      mensaje:
        "Calibración restablecida: STANDARD 0 ms / 1S +100 ms."

    };

  }


  /* ========================================
     TARGET
     ======================================== */

  obtenerTargetExecutionAt(
    senal
  ) {

    const candidatos = [

      senal
        ?.targetExecutionAt,

      senal
        ?.targetVisualAt,

      senal
        ?.metadata
        ?.targetExecutionAt,

      senal
        ?.metadata
        ?.targetVisualAt

    ];


    for (
      const candidato
      of candidatos
    ) {

      const valor =
        Number(
          candidato
        );


      if (
        Number.isFinite(
          valor
        ) &&
        valor >
          0
      ) {

        return valor;

      }

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
        "Bot iniciado FIX13.8."

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


    this.preparaciones
      .clear();


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
     OPERACIÓN / FASE
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
     LIMPIEZA
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

        this.preparaciones
          .delete(
            operacionId
          );


        this.emitirEvento(
          "bot:preparation-expired",
          {

            operacionId,

            mercado:
              preparacion
                ?.senalPreparacion
                ?.mercado ??
              null

          }
        );

      }

    }

  }


  limpiarManualPendienteAnterior(
    nuevaOperacionId
  ) {

    if (
      !this.esModoManual()
    ) {

      return;

    }


    for (
      const [
        operacionId,
        item
      ]
      of this.preparaciones
    ) {

      if (
        operacionId ===
        nuevaOperacionId
      ) {

        continue;

      }


      if (
        item
          ?.modoPreparacion ===
          MODOS_EJECUCION.MANUAL &&
        item
          ?.ejecutando !==
          true
      ) {

        this.preparaciones
          .delete(
            operacionId
          );


        this.emitirEvento(
          "bot:manual-replaced",
          {

            operacionId,

            nuevaOperacionId

          }
        );

      }

    }

  }


  /* ========================================
     MANUAL PENDIENTE
     ======================================== */

  obtenerPreparacionManualPendiente() {

    const candidatas =
      [
        ...this
          .preparaciones
          .values()
      ]
        .filter(
          (
            item
          ) =>
            item
              ?.manualReady ===
              true &&
            item
              ?.ejecutando !==
              true
        )
        .sort(
          (
            a,
            b
          ) =>
            Number(
              b
                ?.manualReadyAt ??
              b
                ?.preparedAt ??
              0
            ) -
            Number(
              a
                ?.manualReadyAt ??
              a
                ?.preparedAt ??
              0
            )
        );


    if (
      !candidatas.length
    ) {

      return null;

    }


    const item =
      candidatas[
        0
      ];


    return {

      operacionId:
        item.operacionId,

      mercado:
        item
          .senalEjecucion
          ?.mercado ??
        item
          .senalPreparacion
          ?.mercado ??
        null,

      estrategia:
        item
          .senalEjecucion
          ?.estrategia ??
        item
          .senalPreparacion
          ?.estrategia ??
        null,

      direccion:
        item
          .senalEjecucion
          ?.direccion ??
        item
          .senalPreparacion
          ?.direccion ??
        null,

      confianza:
        item
          .senalEjecucion
          ?.confianza ??
        item
          .senalPreparacion
          ?.confianza ??
        null,

      targetExecutionAt:
        item
          .telemetria
          ?.targetExecutionAt ??
        null,

      programmedExecutionAt:
        item
          .telemetria
          ?.programmedExecutionAt ??
        null,

      calibracionMs:
        item
          .telemetria
          ?.calibracionMs ??
        null,

      preparedAt:
        item.preparedAt,

      manualReadyAt:
        item.manualReadyAt,

      targetReceivedAt:
        item.targetReceivedAt,

      targetDisponible:
        Number.isFinite(
          Number(
            item
              .telemetria
              ?.targetExecutionAt
          )
        ),

      patron:
        item
          .analisisPatron ??
        null

    };

  }


  /* ========================================
     PERFIL
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


  extraerScoreBruto(
    senal
  ) {

    const candidatos = [

      senal?.rawScore,

      senal?.scoreBruto,

      senal
        ?.metadata
        ?.rawScore,

      senal
        ?.metadata
        ?.scoreBruto,

      senal
        ?.metadata
        ?.engine1
        ?.rawScore

    ];


    for (
      const candidato
      of candidatos
    ) {

      const numero =
        Number(
          candidato
        );


      if (
        Number.isFinite(
          numero
        )
      ) {

        return this.redondear(
          numero
        );

      }

    }


    return null;

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


    const firmaPatron =
      this.crearFirmaPatron(
        senal
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

      modoEjecucion:
        this.modoEjecucion,

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

      scoreBruto:
        this.extraerScoreBruto(
          senal
        ),

      valorPatron:
        firmaPatron
          .valorPatron,

      patronKey:
        firmaPatron.key,

      patronFirma:
        {
          ...firmaPatron
        },

      patronClasificacion:
        null,

      patronFuerza:
        null,

      patronDecision:
        null,

      patronMuestrasPrevias:
        0,

      patronGanadasPrevias:
        0,

      patronPerdidasPrevias:
        0,

      patronAccuracyPrevio:
        null,

      patronBloqueado:
        false,

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


      /* PREPARAR */

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


      /* BOTÓN LISTO */

      manualReadyEpoch:
        null,

      prepareToManualReadyMs:
        null,

      targetToManualReadyMs:
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


      /* MANUAL */

      manualClickEpoch:
        null,

      manualClickPerf:
        null,

      manualClickToTargetMs:
        null,

      manualClickToProgrammedMs:
        null,

      manualClickToBuyMs:
        null,

      manualBuyToTargetMs:
        null,

      manualBuyConfirmToTargetMs:
        null,


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

      targetToPullRequestMs:
        null,

      targetToPullReceivedMs:
        null,

      programmedToBuyMs:
        null,

      programmedToBuyConfirmMs:
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


    if (
      Number.isFinite(
        Number(
          t.targetExecutionAt
        )
      ) &&
      Number.isFinite(
        Number(
          t.proposalRequestedEpoch
        )
      )
    ) {

      t.targetToPullRequestMs =
        this.redondear(
          Number(
            t.proposalRequestedEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    if (
      Number.isFinite(
        Number(
          t.targetExecutionAt
        )
      ) &&
      Number.isFinite(
        Number(
          t.proposalReceivedEpoch
        )
      )
    ) {

      t.targetToPullReceivedMs =
        this.redondear(
          Number(
            t.proposalReceivedEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    if (
      Number.isFinite(
        Number(
          t.programmedExecutionAt
        )
      ) &&
      Number.isFinite(
        Number(
          t.buyRequestedEpoch
        )
      )
    ) {

      t.programmedToBuyMs =
        this.redondear(
          Number(
            t.buyRequestedEpoch
          ) -
          Number(
            t.programmedExecutionAt
          )
        );

    }


    if (
      Number.isFinite(
        Number(
          t.programmedExecutionAt
        )
      ) &&
      Number.isFinite(
        Number(
          t.buyConfirmedEpoch
        )
      )
    ) {

      t.programmedToBuyConfirmMs =
        this.redondear(
          Number(
            t.buyConfirmedEpoch
          ) -
          Number(
            t.programmedExecutionAt
          )
        );

    }


    t.prepareToTargetMs =
      this.diferencia(
        t.prepareReceivedEpoch,
        t.targetReceivedEpoch
      );


    if (
      Number.isFinite(
        Number(
          t.manualReadyEpoch
        )
      ) &&
      Number.isFinite(
        Number(
          t.prepareReceivedEpoch
        )
      )
    ) {

      t.prepareToManualReadyMs =
        this.redondear(
          Number(
            t.manualReadyEpoch
          ) -
          Number(
            t.prepareReceivedEpoch
          )
        );

    }


    if (
      Number.isFinite(
        Number(
          t.manualReadyEpoch
        )
      ) &&
      Number.isFinite(
        Number(
          t.targetReceivedEpoch
        )
      )
    ) {

      t.targetToManualReadyMs =
        this.redondear(
          Number(
            t.manualReadyEpoch
          ) -
          Number(
            t.targetReceivedEpoch
          )
        );

    }


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
        Number(
          t.targetExecutionAt
        )
      ) &&
      Number.isFinite(
        Number(
          t.buyRequestedEpoch
        )
      )
    ) {

      t.targetToBuyMs =
        this.redondear(
          Number(
            t.buyRequestedEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    if (
      Number.isFinite(
        Number(
          t.manualClickEpoch
        )
      ) &&
      Number.isFinite(
        Number(
          t.targetExecutionAt
        )
      )
    ) {

      t.manualClickToTargetMs =
        this.redondear(
          Number(
            t.manualClickEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    if (
      Number.isFinite(
        Number(
          t.manualClickEpoch
        )
      ) &&
      Number.isFinite(
        Number(
          t.programmedExecutionAt
        )
      )
    ) {

      t.manualClickToProgrammedMs =
        this.redondear(
          Number(
            t.manualClickEpoch
          ) -
          Number(
            t.programmedExecutionAt
          )
        );

    }


    if (
      Number.isFinite(
        Number(
          t.manualClickEpoch
        )
      ) &&
      Number.isFinite(
        Number(
          t.buyRequestedEpoch
        )
      )
    ) {

      t.manualClickToBuyMs =
        this.redondear(
          Number(
            t.buyRequestedEpoch
          ) -
          Number(
            t.manualClickEpoch
          )
        );

    }


    if (
      t.modoEjecucion ===
        MODOS_EJECUCION.MANUAL &&
      Number.isFinite(
        Number(
          t.targetExecutionAt
        )
      ) &&
      Number.isFinite(
        Number(
          t.buyRequestedEpoch
        )
      )
    ) {

      t.manualBuyToTargetMs =
        this.redondear(
          Number(
            t.buyRequestedEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    if (
      t.modoEjecucion ===
        MODOS_EJECUCION.MANUAL &&
      Number.isFinite(
        Number(
          t.targetExecutionAt
        )
      ) &&
      Number.isFinite(
        Number(
          t.buyConfirmedEpoch
        )
      )
    ) {

      t.manualBuyConfirmToTargetMs =
        this.redondear(
          Number(
            t.buyConfirmedEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
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
      ) &&
      t.modoEjecucion !==
        MODOS_EJECUCION.MANUAL
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
        `Bridge→Proceso alto: ${
          t.bridgeToProcessMs
        } ms`
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
        `Cotización anómala: ${
          t.proposalLatencyMs
        } ms`
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
        `BUY→confirmación anómalo: ${
          t.buyLatencyMs
        } ms`
      );

    }


    if (
      t.modoEjecucion !==
        MODOS_EJECUCION.MANUAL &&
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
        `Desviación target alta: ${
          t.buyTargetDeviationMs
        } ms`
      );

    }


    if (
      t.modoEjecucion !==
        MODOS_EJECUCION.MANUAL &&
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
        `Espera excedida: ${
          t.calibrationWaitOvershootMs
        } ms`
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


    if (
      t.modoEjecucion ===
      MODOS_EJECUCION.MANUAL
    ) {

      t.timingClasificacion =
        t.timingValido
          ? "MANUAL_VALIDO"
          : "MANUAL_ANOMALO";


      t.usableForTimingComparator =
        false;


      return t;

    }


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


    this.historialTelemetria
      .unshift(
        {
          ...telemetria
        }
      );


    if (
      this.historialTelemetria
        .length >
      2000
    ) {

      this.historialTelemetria
        .length =
        2000;

    }


    this.persistirHistorialTelemetria();


    this.invalidarCacheAnalitica();


    return telemetria;

  }


  /* ========================================
     FILTROS HISTORIALES
     ======================================== */

  obtenerTelemetriaPorMercado(
    mercado
  ) {

    const buscado =
      this.normalizarMercado(
        mercado
      );


    return this.historialTelemetria
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


    return this.historialTelemetria
      .filter(
        (
          item
        ) =>
          String(
            item
              ?.familiaMercado ||
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
        (
          item
        ) =>
          Number(
            item
              ?.calibracionMs ??
            0
          ) ===
          ajuste
      );

  }


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
        item
          ?.timingValido ===
          true &&
        item
          ?.usableForTimingComparator ===
          true &&
        item
          ?.modoEjecucion !==
          MODOS_EJECUCION.MANUAL
    );

  }


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
          item
            ?.resultado ===
            "GANADA" ||
          item
            ?.resultado ===
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
      (
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

      promedioTargetToPullRequestMs:
        this.promedio(
          extraer(
            "targetToPullRequestMs"
          )
        ),

      medianaTargetToPullRequestMs:
        this.mediana(
          extraer(
            "targetToPullRequestMs"
          )
        ),

      promedioTargetToPullReceivedMs:
        this.promedio(
          extraer(
            "targetToPullReceivedMs"
          )
        ),

      medianaTargetToPullReceivedMs:
        this.mediana(
          extraer(
            "targetToPullReceivedMs"
          )
        ),

      promedioProgrammedToBuyMs:
        this.promedio(
          extraer(
            "programmedToBuyMs"
          )
        ),

      medianaProgrammedToBuyMs:
        this.mediana(
          extraer(
            "programmedToBuyMs"
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
        3 &&
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
      distribuciones
        .paridadUltimoDigito
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
      PROFILE_CONTROL
        .maxHallazgos
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


    const normalizados =
      datos.map(
        (
          item
        ) => {

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
        PATTERN_CONTROL
          .blockRiskInAutomatic,

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

      scoreBruto:
        this.construirPerfilNumerico(
          normalizados,
          "scoreBruto"
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
          (
            item
          ) =>
            item.clasificacion ===
            "FAVORABLE"
        ),

      riesgos:
        hallazgos.filter(
          (
            item
          ) =>
            item.clasificacion ===
            "RIESGO"
        )

    };

  }


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


    const perfil =
      this.obtenerResumenPerfilSenal(
        symbol
      );


    const manuales =
      finalizadas.filter(
        (
          item
        ) =>
          item
            ?.modoEjecucion ===
          MODOS_EJECUCION.MANUAL
      );


    const patronesMercado =
      Object.values(
        this.memoriaPatrones
      )
        .filter(
          (
            item
          ) =>
            this.normalizarMercado(
              item?.mercado
            ) ===
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

      patrones:
        patronesMercado.length,

      patronesFavorables:
        patronesMercado
          .filter(
            (
              item
            ) =>
              item
                ?.clasificacion ===
              "FAVORABLE"
          )
          .length,

      patronesRiesgo:
        patronesMercado
          .filter(
            (
              item
            ) =>
              item
                ?.clasificacion ===
              "RIESGO"
          )
          .length,

      muestrasManual:
        manuales.length,

      promedioManualClickTargetMs:
        this.promedio(
          manuales.map(
            (
              item
            ) =>
              item
                .manualClickToTargetMs
          )
        ),

      promedioManualClickBuyMs:
        this.promedio(
          manuales.map(
            (
              item
            ) =>
              item
                .manualClickToBuyMs
          )
        ),

      promedioPrepareManualReadyMs:
        this.promedio(
          manuales.map(
            (
              item
            ) =>
              item
                .prepareToManualReadyMs
          )
        ),

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

      promedioTargetToPullRequestMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.targetToPullRequestMs
          )
        ),

      medianaTargetToPullRequestMs:
        this.mediana(
          timingValido.map(
            (
              item
            ) =>
              item.targetToPullRequestMs
          )
        ),

      promedioTargetToPullReceivedMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.targetToPullReceivedMs
          )
        ),

      medianaTargetToPullReceivedMs:
        this.mediana(
          timingValido.map(
            (
              item
            ) =>
              item.targetToPullReceivedMs
          )
        ),

      promedioProgrammedToBuyMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.programmedToBuyMs
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
            (
              item
            ) =>
              (
                item.resultado ===
                  "GANADA" ||
                item.resultado ===
                  "PERDIDA"
              ) &&
              item
                ?.modoEjecucion !==
                MODOS_EJECUCION.MANUAL
          );


      const ganadas =
        datos.filter(
          (
            item
          ) =>
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
     PREPARAR PROPUESTA
     ======================================== */

  async crearPreparacion(
    senal,
    telemetria
  ) {

    const contrato =
      contractMapper
        .mapear(
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

      executionRecorder
        .recordProposalRequested(
          String(
            senal.id
          )
        );

    }

    catch (
      error
    ) {

      console.warn(
        "EXECUTION RECORDER proposal:",
        error
      );

    }


    const propuestaDeriv =
      await derivProposal
        .solicitar(
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

      executionRecorder
        .recordProposalReceived(
          String(
            senal.id
          ),
          {

            receivedAt:
              telemetria
                .proposalReceivedEpoch

          }
        );

    }

    catch (
      error
    ) {

      console.warn(
        "EXECUTION RECORDER response:",
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
     PREPARAR
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


    if (
      this.preparaciones
        .has(
          operacionId
        )
    ) {

      const existente =
        this.preparaciones
          .get(
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

        analisisPatron:
          existente
            .analisisPatron ??
          null,

        telemetria:
          {
            ...existente.telemetria
          }

      };

    }


    this.limpiarManualPendienteAnterior(
      operacionId
    );


    /*
      FIX13.8:
      Antes de comprar nada,
      consultamos memoria histórica.
    */

    const analisisPatron =
      this.analizarPatron(
        senal
      );


    const telemetria =
      this.crearTelemetria(
        senal
      );


    telemetria
      .patronClasificacion =
      analisisPatron
        .clasificacion;


    telemetria
      .patronFuerza =
      analisisPatron
        .fuerza;


    telemetria
      .patronDecision =
      analisisPatron
        .decision;


    telemetria
      .patronMuestrasPrevias =
      analisisPatron
        .muestras;


    telemetria
      .patronGanadasPrevias =
      analisisPatron
        .ganadas;


    telemetria
      .patronPerdidasPrevias =
      analisisPatron
        .perdidas;


    telemetria
      .patronAccuracyPrevio =
      analisisPatron
        .accuracy;


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

        analisisPatron,

        telemetria

      };

    }


    const ahora =
      Date.now();


    const manualReady =
      this.esModoManual();


    if (
      manualReady
    ) {

      telemetria
        .modoEjecucion =
        MODOS_EJECUCION.MANUAL;


      telemetria
        .manualReadyEpoch =
        ahora;


      telemetria
        .prepareToManualReadyMs =
        this.redondear(
          ahora -
          telemetria
            .prepareReceivedEpoch
        );


      telemetria.resultado =
        "MANUAL_LISTO_SIN_TARGET";

    }


    const registro = {

      operacionId,

      senalPreparacion:
        {
          ...senal
        },

      senalEjecucion:
        null,

      contrato:
        preparacion.contrato,

      propuesta:
        preparacion
          .propuestaSimulada,

      propuestaDeriv:
        preparacion
          .propuestaDeriv,

      telemetria,

      analisisPatron,

      preparedAt:
        ahora,

      targetReceivedAt:
        null,

      manualReadyAt:
        manualReady
          ? ahora
          : null,

      manualReady,

      modoPreparacion:
        this.modoEjecucion,

      ejecutando:
        false

    };


    this.preparaciones
      .set(
        operacionId,
        registro
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
          ahora,

        modoEjecucion:
          this.modoEjecucion,

        analisisPatron

      }
    );


    if (
      manualReady
    ) {

      this.emitirEvento(
        "bot:manual-ready",
        {

          ok:
            true,

          operacionId,

          mercado:
            senal.mercado,

          estrategia:
            senal.estrategia,

          direccion:
            senal.direccion,

          confianza:
            senal.confianza,

          targetExecutionAt:
            null,

          programmedExecutionAt:
            null,

          calibracionMs:
            this.obtenerAjusteMercado(
              senal.mercado
            ),

          readyAt:
            ahora,

          prepareToReadyMs:
            telemetria
              .prepareToManualReadyMs,

          targetDisponible:
            false,

          estado:
            "LISTO_SIN_TARGET",

          analisisPatron

        }
      );

    }


    return {

      aceptada:
        true,

      fase:
        "PREPARAR",

      estado:
        manualReady
          ? "MANUAL_LISTO_SIN_TARGET"
          : "PROPUESTA_PREPARADA",

      operacionId,

      mercado:
        senal.mercado,

      estrategia:
        senal.estrategia,

      direccion:
        senal.direccion,

      confianza:
        senal.confianza,

      analisisPatron,

      contrato:
        preparacion.contrato,

      propuesta:
        preparacion
          .propuestaSimulada,

      propuestaDeriv:
        preparacion
          .propuestaDeriv,

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

      ejecucionManualLista:
        manualReady,

      modoEjecucion:
        this.modoEjecucion,

      ejecucionDemoActiva:
        derivTrade
          .obtenerEstado()
          .ejecucionActiva

    };

  }


  /* ========================================
     TARGET
     ======================================== */

  actualizarTargetPreparacion(
    preparada,
    senal
  ) {

    const telemetria =
      preparada.telemetria;


    telemetria
      .targetReceivedEpoch =
      Date.now();


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
      Number.isFinite(
        Number(
          telemetria
            .manualReadyEpoch
        )
      )
    ) {

      telemetria
        .targetToManualReadyMs =
        this.redondear(
          Number(
            telemetria
              .manualReadyEpoch
          ) -
          Number(
            telemetria
              .targetReceivedEpoch
          )
        );

    }


    return {

      telemetria,

      programacion

    };

  }


  /* ========================================
     COMPRA PREPARADA
     ======================================== */

  async ejecutarCompraPreparada(
    preparada,
    senal,
    {
      onOperacionUpdate =
        null,

      origen =
        "AUTOMATICO"
    } = {}
  ) {

    if (
      preparada.ejecutando
    ) {

      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        motivo:
          "Esta operación ya se está ejecutando."

      };

    }


    preparada.ejecutando =
      true;


    const operacionId =
      preparada.operacionId;


    const telemetria =
      preparada.telemetria;


    const targetExecutionAt =
      Number(
        telemetria
          .targetExecutionAt
      );


    const programmedAt =
      Number(
        telemetria
          .programmedExecutionAt
      );


    const calibracionMs =
      Number(
        telemetria
          .calibracionMs ??
        0
      );


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


      this.preparaciones
        .delete(
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

        analisisPatron:
          preparada
            .analisisPatron ??
          null,

        contrato:
          preparada.contrato,

        propuestaDeriv:
          preparada
            .propuestaDeriv,

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
        programmedAt
      )
    ) {

      telemetria
        .buyTargetDeviationMs =
        this.redondear(
          buyRequestedAt -
          programmedAt
        );

    }


    if (
      origen ===
        "MANUAL" &&
      Number.isFinite(
        Number(
          telemetria
            .manualClickEpoch
        )
      )
    ) {

      telemetria
        .manualClickToBuyMs =
        this.redondear(
          buyRequestedAt -
          Number(
            telemetria
              .manualClickEpoch
          )
        );

    }


    this.emitirEvento(
      "bot:buy-requested",
      {

        operacionId,

        mercado:
          senal.mercado,

        direccion:
          senal.direccion,

        targetExecutionAt:
          Number.isFinite(
            targetExecutionAt
          )
            ? targetExecutionAt
            : null,

        programmedExecutionAt:
          Number.isFinite(
            programmedAt
          )
            ? programmedAt
            : null,

        calibracionMs,

        buyRequestedAt,

        buyTargetDeviationMs:
          telemetria
            .buyTargetDeviationMs,

        modoEjecucion:
          telemetria
            .modoEjecucion,

        manualClickEpoch:
          telemetria
            .manualClickEpoch,

        manualClickToTargetMs:
          telemetria
            .manualClickToTargetMs,

        manualClickToBuyMs:
          telemetria
            .manualClickToBuyMs,

        analisisPatron:
          preparada
            .analisisPatron ??
          null

      }
    );


    const compraDemo =
      await derivTrade
        .comprar(
          preparada
            .propuestaDeriv
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
        programmedAt
      )
    ) {

      telemetria
        .buyConfirmTargetDeviationMs =
        this.redondear(
          buyConfirmedAt -
          programmedAt
        );

    }


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
              .buyConfirmTargetDeviationMs,

          modoEjecucion:
            telemetria
              .modoEjecucion

        }
      );


      this.guardarTelemetria(
        telemetria
      );


      this.preparaciones
        .delete(
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

        analisisPatron:
          preparada
            .analisisPatron ??
          null,

        contrato:
          preparada.contrato,

        propuesta:
          preparada.propuesta,

        propuestaDeriv:
          preparada
            .propuestaDeriv,

        compraDemo,

        resultadoDemo:
          null,

        telemetria:
          {
            ...telemetria
          }

      };

    }


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
          Number.isFinite(
            targetExecutionAt
          )
            ? targetExecutionAt
            : null,

        programmedExecutionAt:
          Number.isFinite(
            programmedAt
          )
            ? programmedAt
            : null,

        calibracionMs,

        buyTargetDeviationMs:
          telemetria
            .buyTargetDeviationMs,

        buyConfirmTargetDeviationMs:
          telemetria
            .buyConfirmTargetDeviationMs,

        modoEjecucion:
          telemetria
            .modoEjecucion,

        manualClickEpoch:
          telemetria
            .manualClickEpoch,

        manualClickToTargetMs:
          telemetria
            .manualClickToTargetMs,

        manualClickToBuyMs:
          telemetria
            .manualClickToBuyMs

      }
    );


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
            telemetria
              .resultado,

          profit,

          resultadoDemo,

          modoEjecucion:
            telemetria
              .modoEjecucion,

          manualClickToTargetMs:
            telemetria
              .manualClickToTargetMs,

          manualClickToBuyMs:
            telemetria
              .manualClickToBuyMs

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

          resultadoDemo,

          modoEjecucion:
            telemetria
              .modoEjecucion

        }
      );

    }


    this.ultimaSenalProcesada =
      operacionId;


    this.guardarTelemetria(
      telemetria
    );


    /*
      FIX13.8:
      Solo GANADA/PERDIDA alimenta
      la memoria del patrón.
    */

    const patronActualizado =
      this.registrarResultadoPatron(
        telemetria
      );


    this.preparaciones
      .delete(
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

      modoEjecucion:
        telemetria
          .modoEjecucion,

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

      scoreBruto:
        telemetria
          .scoreBruto,

      valorPatron:
        telemetria
          .valorPatron,

      analisisPatron:
        preparada
          .analisisPatron ??
        null,

      patronActualizado,

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

      manualClickEpoch:
        telemetria
          .manualClickEpoch,

      manualClickToTargetMs:
        telemetria
          .manualClickToTargetMs,

      manualClickToProgrammedMs:
        telemetria
          .manualClickToProgrammedMs,

      manualClickToBuyMs:
        telemetria
          .manualClickToBuyMs,

      manualBuyToTargetMs:
        telemetria
          .manualBuyToTargetMs,

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
        preparada
          .propuestaDeriv,

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

      resumenMemoria:
        this
          .obtenerResumenMemoriaPatrones(),

      ejecucionDemoActiva:
        derivTrade
          .obtenerEstado()
          .ejecucionActiva

    };

  }


  /* ========================================
     EJECUTAR / TARGET
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
      this.preparaciones
        .get(
          operacionId
        );


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


    preparada.senalEjecucion =
      {
        ...senal
      };


    preparada.targetReceivedAt =
      Date.now();


    const {
      telemetria,
      programacion
    } =
      this.actualizarTargetPreparacion(
        preparada,
        senal
      );


    if (
      !programacion.disponible
    ) {

      telemetria.resultado =
        "TARGET_INVALIDO";


      this.guardarTelemetria(
        telemetria
      );


      this.preparaciones
        .delete(
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


    /* ====================================
       MANUAL
       ==================================== */

    if (
      preparada
        .modoPreparacion ===
        MODOS_EJECUCION.MANUAL ||
      this.esModoManual()
    ) {

      telemetria
        .modoEjecucion =
        MODOS_EJECUCION.MANUAL;


      telemetria.resultado =
        "MANUAL_ESPERANDO_CLICK";


      preparada.manualReady =
        true;


      preparada.ejecutando =
        false;


      if (
        !Number.isFinite(
          Number(
            telemetria
              .manualReadyEpoch
          )
        )
      ) {

        telemetria
          .manualReadyEpoch =
          Date.now();


        preparada.manualReadyAt =
          telemetria
            .manualReadyEpoch;

      }


      telemetria
        .targetToManualReadyMs =
        this.redondear(
          Number(
            telemetria
              .manualReadyEpoch
          ) -
          Number(
            telemetria
              .targetReceivedEpoch
          )
        );


      this.ultimaTelemetria =
        {
          ...telemetria
        };


      this.emitirEvento(
        "bot:manual-ready",
        {

          ok:
            true,

          operacionId,

          mercado:
            senal.mercado,

          estrategia:
            senal.estrategia,

          direccion:
            senal.direccion,

          confianza:
            senal.confianza,

          targetExecutionAt:
            programacion
              .targetExecutionAt,

          programmedExecutionAt:
            programacion
              .programmedAt,

          calibracionMs:
            programacion
              .ajusteMs,

          readyAt:
            telemetria
              .manualReadyEpoch,

          prepareToReadyMs:
            telemetria
              .prepareToManualReadyMs,

          targetToReadyMs:
            telemetria
              .targetToManualReadyMs,

          targetDisponible:
            true,

          estado:
            "LISTO_CON_TARGET",

          analisisPatron:
            preparada
              .analisisPatron ??
            null

        }
      );


      return {

        aceptada:
          true,

        fase:
          "EJECUTAR",

        estado:
          "MANUAL_ESPERANDO_CLICK",

        operacionId,

        mercado:
          senal.mercado,

        estrategia:
          senal.estrategia,

        direccion:
          senal.direccion,

        confianza:
          senal.confianza,

        scoreBruto:
          telemetria
            .scoreBruto,

        valorPatron:
          telemetria
            .valorPatron,

        analisisPatron:
          preparada
            .analisisPatron ??
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

        contrato:
          preparada.contrato,

        propuesta:
          preparada.propuesta,

        propuestaDeriv:
          preparada
            .propuestaDeriv,

        compraDemo:
          null,

        resultadoDemo:
          null,

        telemetria:
          {
            ...telemetria
          },

        modoEjecucion:
          MODOS_EJECUCION.MANUAL,

        ejecucionManualLista:
          true

      };

    }


    /* ====================================
       AUTOMÁTICO
       FILTRO HISTÓRICO FIX13.8
       ==================================== */

    telemetria
      .modoEjecucion =
      MODOS_EJECUCION.AUTOMATICO;


    const analisisPatron =
      preparada
        .analisisPatron ||
      this.analizarPatron(
        senal
      );


    /*
      Solo se bloquea si:
      - automático
      - filtro activado
      - patrón RIESGO
      - ya alcanzó mínimo de muestras
    */

    const bloquearPorPatron =
      PATTERN_CONTROL
        .blockRiskInAutomatic &&
      analisisPatron
        ?.bloquear ===
        true &&
      Number(
        analisisPatron
          ?.muestras ??
        0
      ) >=
        PATTERN_CONTROL
          .minimumDecisionSamples;


    if (
      bloquearPorPatron
    ) {

      telemetria
        .patronBloqueado =
        true;


      telemetria.resultado =
        "NO_OPERAR_PATRON_RIESGO";


      /*
        Importante:
        NO contamos esto como pérdida
        ni como ganada porque no hubo BUY.
      */

      this.guardarTelemetria(
        telemetria
      );


      this.emitirEvento(
        "bot:pattern-blocked",
        {

          operacionId,

          mercado:
            senal.mercado,

          estrategia:
            senal.estrategia,

          direccion:
            senal.direccion,

          confianza:
            senal.confianza,

          scoreBruto:
            telemetria
              .scoreBruto,

          valorPatron:
            telemetria
              .valorPatron,

          analisisPatron,

          motivo:
            "Patrón histórico de riesgo. BUY automático bloqueado."

        }
      );


      this.preparaciones
        .delete(
          operacionId
        );


      return {

        aceptada:
          true,

        fase:
          "EJECUTAR",

        estado:
          "NO_OPERAR_PATRON_RIESGO",

        bloqueada:
          true,

        motivo:
          "Patrón histórico de riesgo. No se ejecutó BUY.",

        operacionId,

        mercado:
          senal.mercado,

        estrategia:
          senal.estrategia,

        direccion:
          senal.direccion,

        confianza:
          senal.confianza,

        scoreBruto:
          telemetria
            .scoreBruto,

        valorPatron:
          telemetria
            .valorPatron,

        analisisPatron,

        telemetria:
          {
            ...telemetria
          },

        compraDemo:
          null,

        resultadoDemo:
          null

      };

    }


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
          programacion
            .programmedAt
        );


      this.guardarTelemetria(
        telemetria
      );


      this.preparaciones
        .delete(
          operacionId
        );


      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        motivo:
          "El instante programado ya pasó.",

        analisisPatron,

        telemetria

      };

    }


    const restanteMs =
      Math.max(
        0,
        programacion
          .programmedAt -
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


    return this
      .ejecutarCompraPreparada(
        preparada,
        senal,
        {

          onOperacionUpdate,

          origen:
            "AUTOMATICO"

        }
      );

  }


  /* ========================================
     EJECUTAR AHORA MANUAL
     ======================================== */

  async ejecutarManual(
    operacionId = null,
    {
      onOperacionUpdate =
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

        fase:
          "MANUAL",

        motivo:
          estado.motivo

      };

    }


    if (
      !this.esModoManual()
    ) {

      return {

        aceptada:
          false,

        fase:
          "MANUAL",

        motivo:
          "El BOT no está en modo MANUAL DIAGNÓSTICO."

      };

    }


    let preparada =
      null;


    if (
      operacionId
    ) {

      preparada =
        this.preparaciones
          .get(
            String(
              operacionId
            )
          ) ??
        null;

    }

    else {

      const pendientes =
        [
          ...this
            .preparaciones
            .values()
        ]
          .filter(
            (
              item
            ) =>
              item
                ?.manualReady ===
                true &&
              item
                ?.ejecutando !==
                true
          )
          .sort(
            (
              a,
              b
            ) =>
              Number(
                b
                  ?.manualReadyAt ??
                b
                  ?.preparedAt ??
                0
              ) -
              Number(
                a
                  ?.manualReadyAt ??
                a
                  ?.preparedAt ??
                0
              )
          );


      preparada =
        pendientes[
          0
        ] ??
        null;

    }


    if (
      !preparada
    ) {

      return {

        aceptada:
          false,

        fase:
          "MANUAL",

        motivo:
          "No hay una operación manual lista para ejecutar."

      };

    }


    if (
      !preparada.manualReady
    ) {

      return {

        aceptada:
          false,

        fase:
          "MANUAL",

        motivo:
          "La propuesta todavía no está lista."

      };

    }


    if (
      preparada.ejecutando
    ) {

      return {

        aceptada:
          false,

        fase:
          "MANUAL",

        motivo:
          "La operación ya se está ejecutando."

      };

    }


    const senal =
      preparada
        .senalEjecucion ??
      preparada
        .senalPreparacion;


    const telemetria =
      preparada.telemetria;


    const clickEpoch =
      Date.now();


    telemetria
      .modoEjecucion =
      MODOS_EJECUCION.MANUAL;


    telemetria
      .manualClickEpoch =
      clickEpoch;


    telemetria
      .manualClickPerf =
      this.ahora();


    if (
      Number.isFinite(
        Number(
          telemetria
            .targetExecutionAt
        )
      )
    ) {

      telemetria
        .manualClickToTargetMs =
        this.redondear(
          clickEpoch -
          Number(
            telemetria
              .targetExecutionAt
          )
        );

    }


    if (
      Number.isFinite(
        Number(
          telemetria
            .programmedExecutionAt
        )
      )
    ) {

      telemetria
        .manualClickToProgrammedMs =
        this.redondear(
          clickEpoch -
          Number(
            telemetria
              .programmedExecutionAt
          )
        );

    }


    /*
      MANUAL:
      el patrón se muestra pero
      NUNCA bloquea el botón.
    */

    this.emitirEvento(
      "bot:manual-click",
      {

        operacionId:
          preparada
            .operacionId,

        mercado:
          senal?.mercado,

        estrategia:
          senal?.estrategia,

        direccion:
          senal?.direccion,

        confianza:
          senal?.confianza,

        targetExecutionAt:
          telemetria
            .targetExecutionAt,

        programmedExecutionAt:
          telemetria
            .programmedExecutionAt,

        clickAt:
          clickEpoch,

        clickToTargetMs:
          telemetria
            .manualClickToTargetMs,

        clickToProgrammedMs:
          telemetria
            .manualClickToProgrammedMs,

        targetDisponible:
          Number.isFinite(
            Number(
              telemetria
                .targetExecutionAt
            )
          ),

        analisisPatron:
          preparada
            .analisisPatron ??
          null

      }
    );


    return this
      .ejecutarCompraPreparada(
        preparada,
        senal,
        {

          onOperacionUpdate,

          origen:
            "MANUAL"

        }
      );

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


    return {

      aceptada:
        false,

      fase,

      motivo:
        "Señal sin protocolo PREPARAR/EJECUTAR. FIX13.8 requiere las dos fases."

    };

  }


  /* ========================================
     ANALÍTICA EN CACHÉ
     ======================================== */

  construirAnaliticaCompleta() {

    const comparaciones =
      {};


    const calibraciones =
      {};


    const perfilesSenal =
      {};


    const analisisPerfiles =
      {};


    const resumenMercados =
      {};


    for (
      const mercado
      of MERCADOS_CONTROLADOS
    ) {

      const resumen =
        this.obtenerResumenMercado(
          mercado
        );


      resumenMercados[
        mercado
      ] =
        resumen;


      comparaciones[
        mercado
      ] = {

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


      calibraciones[
        mercado
      ] =
        this.obtenerResumenCalibracion(
          mercado
        );


      perfilesSenal[
        mercado
      ] =
        resumen
          .perfilSenalFix13;


      analisisPerfiles[
        mercado
      ] =
        resumen
          .perfilSenalFix13;

    }


    return {

      resumenStandard:
        this.obtenerResumenFamilia(
          "STANDARD"
        ),

      resumen1S:
        this.obtenerResumenFamilia(
          "1S"
        ),

      resumenMercados,

      comparaciones,

      calibraciones,

      perfilesSenal,

      analisisPerfiles

    };

  }


  obtenerAnaliticaCache() {

    if (
      this.cacheAnalitica
    ) {

      return this.cacheAnalitica;

    }


    this.cacheAnalitica =
      this.construirAnaliticaCompleta();


    return this.cacheAnalitica;

  }


  /* ========================================
     ESTADO RÁPIDO
     ======================================== */

  obtenerEstadoRapido() {

    return {

      activo:
        this.activo,

      pausado:
        this.pausado,

      modo:
        this.modo,

      modoEjecucion:
        this.modoEjecucion,

      manualPendiente:
        this
          .obtenerPreparacionManualPendiente(),

      preparacionesActivas:
        this.preparaciones.size,

      versionTelemetria:
        TELEMETRY_VERSION,

      timingBase:
        TIMING_BASE_VERSION,

      sincronizacionVisual:
        SYNC_VERSION,

      versionPatrones:
        PATTERN_VERSION,

      protocolo:
        "PREPARAR_EJECUTAR",

      protocoloManual:
        "PREPARAR_CLICK_TARGET_BUY",

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

      ultimoAnalisisPatron:
        this.ultimoAnalisisPatron,

      resumenMemoriaPatrones:
        this
          .obtenerResumenMemoriaPatrones(),

      calibracionActual:
        {
          ...this.calibracion
        },

      ajustesPermitidosMs:
        [
          ...AJUSTES_PERMITIDOS_MS
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


  /* ========================================
     ESTADO COMPLETO
     ======================================== */

  obtenerEstado() {

    const rapido =
      this.obtenerEstadoRapido();


    const analitica =
      this.obtenerAnaliticaCache();


    return {

      ...rapido,

      modosEjecucion:
        {
          ...MODOS_EJECUCION
        },

      filtroAutomaticoActivo:
        PATTERN_CONTROL
          .blockRiskInAutomatic,

      modoAprendizajeActivo:
        PATTERN_CONTROL
          .learningMode,

      controlPatrones:
        {
          ...PATTERN_CONTROL
        },

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

      resumenStandard:
        analitica
          .resumenStandard,

      resumen1S:
        analitica
          .resumen1S,

      resumenMercados:
        analitica
          .resumenMercados,

      comparaciones:
        analitica
          .comparaciones,

      calibraciones:
        analitica
          .calibraciones,

      perfilesSenal:
        analitica
          .perfilesSenal,

      analisisPerfiles:
        analitica
          .analisisPerfiles

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
   FIX13.8 MEMORIA DE PATRONES
   ========================================== */
