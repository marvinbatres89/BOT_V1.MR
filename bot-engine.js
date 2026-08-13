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

   IMPORTANTE:
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
