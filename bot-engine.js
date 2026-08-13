/* ==========================================
   BOT V1 MR
   BOT ENGINE
   FIX12 - TELEMETRÍA LIMPIA DE TIMING

   CONSERVA:
   - FIX11 TARGET REAL
   - DERIV DEMO
   - COTIZACIÓN ANTES DEL BUY
   - CALIBRACIÓN POR MERCADO
   - HISTORIAL FIX8/FIX9/FIX10/FIX11
   - ESTADÍSTICAS GANADAS / PERDIDAS
   - 12 MERCADOS

   FIX12 AGREGA:

   - SEPARACIÓN REAL DE:
     SEÑAL -> PROCESO
     PROCESO -> COTIZACIÓN
     COTIZACIÓN
     ESPERA PROGRAMADA
     COTIZACIÓN -> BUY
     BUY -> CONFIRMACIÓN
     DESVIACIÓN DEL TARGET

   - CLASIFICACIÓN:
     TIMING VÁLIDO
     TIMING ANÓMALO

   - LOS REGISTROS ANTIGUOS
     SE CONSERVAN PARA ESTADÍSTICAS,
     PERO NO CONTAMINAN EL NUEVO
     COMPARADOR DE TIMING FIX12.

   IMPORTANTE:
   SOLO DEMO DURANTE CALIBRACIÓN
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

/*
  ESTA CLAVE NO CAMBIA.

  Así conservamos TODO el historial
  acumulado desde FIX8.
*/

const TELEMETRY_KEY =
  "BOT_V1_MR_FIX8_TELEMETRY";


const CALIBRATION_KEY =
  "BOT_V1_MR_FIX11_CALIBRATION";


/* ==========================================
   VERSIÓN DE TELEMETRÍA
   ========================================== */

const TELEMETRY_VERSION =
  "FIX12";


/* ==========================================
   LÍMITES DE CONTROL FIX12

   Estos límites NO deciden si una
   operación gana o pierde.

   Solamente determinan si una muestra
   puede utilizarse para analizar timing.
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
      "DERIV DEMO + CALIBRADOR FIX12";

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
     RELOJ DE ALTA PRECISIÓN
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


    return Math.round(
      numero *
      100
    ) /
    100;

  }


  /* ========================================
     VALORES NUMÉRICOS VÁLIDOS
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
     FAMILIA
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

    const symbol =
      this.normalizarMercado(
        mercado
      );


    return MERCADOS_CONTROLADOS
      .includes(
        symbol
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


    } catch {

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


    } catch {

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
     RESTABLECER CALIBRACIÓN
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


    const esperaMs =
      Math.max(
        0,
        programmedAt -
        ahoraEpoch
      );


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

      esperaMs,

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
     CREAR TELEMETRÍA FIX12
     ======================================== */

  crearTelemetria(
    senal,
    senalRecibidaPerf = null
  ) {

    const ahoraPerf =
      this.ahora();


    const ahoraEpoch =
      Date.now();


    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );


    const familia =
      this.obtenerFamiliaMercado(
        mercado
      );


    const retrasoReferenciaMs =
      this.obtenerRetrasoReferencia(
        mercado
      );


    const programacion =
      this.calcularProgramacion(
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

      signalId:
        senal?.id ??
        null,

      mercado,

      mercadoControlado:
        this.mercadoControlado(
          mercado
        ),

      familiaMercado:
        familia,

      estrategia:
        senal?.estrategia ??
        null,

      direccion:
        senal?.direccion ??
        null,

      confianza:
        Number(
          senal?.confianza ??
          0
        ),

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
        programacion.ajusteMs,

      calibracionSeg:
        programacion.ajusteSeg,

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

      signalReceivedEpoch:
        Number(
          senal?.timestamp
        ) ||
        null,

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
         PERFORMANCE
         ==================================== */

      modo:
        senal?.modo ??
        null,

      signalReceivedPerf:
        Number.isFinite(
          Number(
            senalRecibidaPerf
          )
        )
          ? Number(
              senalRecibidaPerf
            )
          : ahoraPerf,

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
         MÉTRICAS FIX12
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
         CONTROL DE CALIDAD TIMING
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

    if (
      Number.isFinite(
        t.signalReceivedPerf
      ) &&
      Number.isFinite(
        t.processStartedPerf
      )
    ) {

      t.bridgeToProcessMs =
        this.redondear(
          t.processStartedPerf -
          t.signalReceivedPerf
        );

    }


    if (
      Number.isFinite(
        t.signalReceivedPerf
      ) &&
      Number.isFinite(
        t.proposalRequestedPerf
      )
    ) {

      t.signalToProposalRequestMs =
        this.redondear(
          t.proposalRequestedPerf -
          t.signalReceivedPerf
        );

    }


    if (
      Number.isFinite(
        t.signalReceivedPerf
      ) &&
      Number.isFinite(
        t.proposalReceivedPerf
      )
    ) {

      t.signalToProposalReceivedMs =
        this.redondear(
          t.proposalReceivedPerf -
          t.signalReceivedPerf
        );

    }


    if (
      Number.isFinite(
        t.processStartedPerf
      ) &&
      Number.isFinite(
        t.proposalRequestedPerf
      )
    ) {

      t.processToProposalRequestMs =
        this.redondear(
          t.proposalRequestedPerf -
          t.processStartedPerf
        );

    }


    if (
      Number.isFinite(
        t.proposalRequestedPerf
      ) &&
      Number.isFinite(
        t.proposalReceivedPerf
      )
    ) {

      t.proposalLatencyMs =
        this.redondear(
          t.proposalReceivedPerf -
          t.proposalRequestedPerf
        );

    }


    if (
      Number.isFinite(
        t.calibrationWaitStartedPerf
      ) &&
      Number.isFinite(
        t.calibrationWaitEndedPerf
      )
    ) {

      t.calibrationWaitActualMs =
        this.redondear(
          t.calibrationWaitEndedPerf -
          t.calibrationWaitStartedPerf
        );

    }


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


    if (
      Number.isFinite(
        t.proposalReceivedPerf
      ) &&
      Number.isFinite(
        t.buyRequestedPerf
      )
    ) {

      t.proposalToBuyMs =
        this.redondear(
          t.buyRequestedPerf -
          t.proposalReceivedPerf
        );

    }


    if (
      Number.isFinite(
        t.processStartedPerf
      ) &&
      Number.isFinite(
        t.buyRequestedPerf
      )
    ) {

      t.processToBuyMs =
        this.redondear(
          t.buyRequestedPerf -
          t.processStartedPerf
        );

    }


    if (
      Number.isFinite(
        t.signalReceivedPerf
      ) &&
      Number.isFinite(
        t.buyRequestedPerf
      )
    ) {

      t.signalToBuyMs =
        this.redondear(
          t.buyRequestedPerf -
          t.signalReceivedPerf
        );

    }


    if (
      Number.isFinite(
        t.buyRequestedPerf
      ) &&
      Number.isFinite(
        t.buyConfirmedPerf
      )
    ) {

      t.buyLatencyMs =
        this.redondear(
          t.buyConfirmedPerf -
          t.buyRequestedPerf
        );

    }


    if (
      Number.isFinite(
        t.signalReceivedPerf
      ) &&
      Number.isFinite(
        t.buyConfirmedPerf
      )
    ) {

      t.signalToBuyConfirmMs =
        this.redondear(
          t.buyConfirmedPerf -
          t.signalReceivedPerf
        );

    }


    if (
      Number.isFinite(
        t.signalReceivedPerf
      ) &&
      Number.isFinite(
        t.resultReceivedPerf
      )
    ) {

      t.totalUntilResultMs =
        this.redondear(
          t.resultReceivedPerf -
          t.signalReceivedPerf
        );

    }


    this.clasificarTiming(
      t
    );


    return t;

  }


  /* ========================================
     CLASIFICAR TIMING FIX12
     ======================================== */

  clasificarTiming(
    t
  ) {

    const anomalias =
      [];


    /*
      Solo FIX12 puede participar
      automáticamente en el nuevo
      comparador limpio.
    */

    if (
      t.version !==
      TELEMETRY_VERSION
    ) {

      t.timingValido =
        false;

      t.timingClasificacion =
        "LEGACY";

      t.timingAnomalias =
        [
          "Registro anterior a FIX12."
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
      t.bridgeToProcessMs >
        TIMING_LIMITS
          .bridgeToProcessMaxMs
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


    } catch {

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


    } catch (
      error
    ) {

      console.warn(
        "No se pudo guardar telemetría FIX12:",
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
        (item) =>
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

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const ajuste =
      Number(
        ajusteMs
      );


    return this
      .obtenerTelemetriaPorMercado(
        symbol
      )
      .filter(
        (item) =>
          Number(
            item
              ?.calibracionMs ??
            0
          ) ===
          ajuste
      );

  }


  /* ========================================
     SOLO TIMING FIX12 VÁLIDO
     ======================================== */

  filtrarTimingValido(
    datos
  ) {

    return datos.filter(
      (item) =>
        item?.version ===
          TELEMETRY_VERSION &&
        item?.timingValido ===
          true &&
        item?.usableForTimingComparator ===
          true
    );

  }


  /* ========================================
     MÉTRICAS DE GRUPO
     ======================================== */

  construirMetricasGrupo(
    datos
  ) {

    const signalBuy =
      datos.map(
        (item) =>
          item.signalToBuyMs
      );


    const proposal =
      datos.map(
        (item) =>
          item.proposalLatencyMs
      );


    const proposalBuy =
      datos.map(
        (item) =>
          item.proposalToBuyMs
      );


    const espera =
      datos.map(
        (item) =>
          item.calibrationWaitActualMs
      );


    const excesoEspera =
      datos.map(
        (item) =>
          item.calibrationWaitOvershootMs
      );


    const buy =
      datos.map(
        (item) =>
          item.buyLatencyMs
      );


    const confirmacion =
      datos.map(
        (item) =>
          item.signalToBuyConfirmMs
      );


    const desviacionTarget =
      datos.map(
        (item) =>
          item.buyTargetDeviationMs
      );


    const desviacionConfirmacion =
      datos.map(
        (item) =>
          item.buyConfirmTargetDeviationMs
      );


    return {

      cantidad:
        datos.length,

      promedioSignalToBuyMs:
        this.promedio(
          signalBuy
        ),

      medianaSignalToBuyMs:
        this.mediana(
          signalBuy
        ),

      minimoSignalToBuyMs:
        this.minimo(
          signalBuy
        ),

      maximoSignalToBuyMs:
        this.maximo(
          signalBuy
        ),

      promedioProposalMs:
        this.promedio(
          proposal
        ),

      medianaProposalMs:
        this.mediana(
          proposal
        ),

      promedioProposalToBuyMs:
        this.promedio(
          proposalBuy
        ),

      medianaProposalToBuyMs:
        this.mediana(
          proposalBuy
        ),

      promedioEsperaMs:
        this.promedio(
          espera
        ),

      medianaEsperaMs:
        this.mediana(
          espera
        ),

      promedioExcesoEsperaMs:
        this.promedio(
          excesoEspera
        ),

      promedioBuyMs:
        this.promedio(
          buy
        ),

      medianaBuyMs:
        this.mediana(
          buy
        ),

      promedioSignalToConfirmMs:
        this.promedio(
          confirmacion
        ),

      promedioDesviacionTargetMs:
        this.promedio(
          desviacionTarget
        ),

      medianaDesviacionTargetMs:
        this.mediana(
          desviacionTarget
        ),

      minimoDesviacionTargetMs:
        this.minimo(
          desviacionTarget
        ),

      maximoDesviacionTargetMs:
        this.maximo(
          desviacionTarget
        ),

      promedioDesviacionConfirmacionMs:
        this.promedio(
          desviacionConfirmacion
        )

    };

  }


  /* ========================================
     COMPARADOR TIMING FIX12
     ======================================== */

  construirComparadorTiming(
    datos
  ) {

    /*
      GANADAS/PERDIDAS DEL HISTORIAL
      COMPLETO.
    */

    const finalizadas =
      datos.filter(
        (item) =>
          item.resultado ===
            "GANADA" ||
          item.resultado ===
            "PERDIDA"
      );


    /*
      PERO EL TIMING SE CALCULA
      ÚNICAMENTE CON MUESTRAS FIX12
      VÁLIDAS.
    */

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
      "ESPERANDO MUESTRAS FIX12";


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

      promedioProposalToBuyMs:
        this.promedio(
          timingValido.map(
            (item) =>
              item.proposalToBuyMs
          )
        ),

      promedioEsperaMs:
        this.promedio(
          timingValido.map(
            (item) =>
              item.calibrationWaitActualMs
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
        )

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


  /* ========================================
     COMPARACIÓN INDIVIDUAL
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
          .lectura

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
            (item) =>
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
          (item) =>
            item.resultado ===
              "GANADA"
        ).length;


      const perdidas =
        datos.filter(
          (item) =>
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
     PROCESAR SEÑAL FIX12
     ======================================== */

  async procesarSenal(
    senal,
    {
      onOperacionUpdate = null,
      senalRecibidaPerf = null
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
        proposalSimulator.crearPropuesta(
          contrato,
          {

            monto:
              this.configuracion.monto,

            moneda:
              this.configuracion.moneda,

            duracion:
              this.configuracion.duracion,

            unidadDuracion:
              this.configuracion.unidadDuracion

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
         3. SOLICITAR COTIZACIÓN
         ==================================== */

      telemetria.proposalRequestedEpoch =
        Date.now();


      telemetria.proposalRequestedPerf =
        this.ahora();


      const propuestaDeriv =
        await derivProposal.solicitar(
          contrato,
          {

            monto:
              this.configuracion.monto,

            moneda:
              this.configuracion.moneda,

            duracion:
              this.configuracion.duracion,

            unidadDuracion:
              this.configuracion.unidadDuracion

          }
        );


      telemetria.proposalReceivedEpoch =
        Date.now();


      telemetria.proposalReceivedPerf =
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
            telemetria.calibracionMs,

          calibracionSeg:
            telemetria.calibracionSeg,

          programacionDisponible:
            telemetria.programacionDisponible,

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


      /* ====================================
         4. CALCULAR ESPERA RESTANTE

         FIX12:
         aquí queda claramente separada
         la latencia de cotización de la
         espera hasta el target.
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


        telemetria.esperaProgramadaMs =
          this.redondear(
            restanteMs
          );


        if (
          restanteMs >
          0
        ) {

          telemetria.waitStartedEpoch =
            Date.now();


          telemetria
            .calibrationWaitStartedPerf =
            this.ahora();


          await this.esperar(
            restanteMs
          );


          telemetria.waitEndedEpoch =
            Date.now();


          telemetria
            .calibrationWaitEndedPerf =
            this.ahora();

        }

        else {

          telemetria.waitStartedEpoch =
            Date.now();


          telemetria.waitEndedEpoch =
            Date.now();


          telemetria
            .calibrationWaitStartedPerf =
            this.ahora();


          telemetria
            .calibrationWaitEndedPerf =
            telemetria
              .calibrationWaitStartedPerf;

        }

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


        telemetria.buyRequestedEpoch =
          buyRequestedAt;


        telemetria.buyRequestedPerf =
          this.ahora();


        if (
          Number.isFinite(
            telemetria
              .programmedExecutionAt
          )
        ) {

          telemetria.buyTargetDeviationMs =
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


        telemetria.buyConfirmedEpoch =
          buyConfirmedAt;


        telemetria.buyConfirmedPerf =
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
            await derivTrade.esperarResultado(
              compraDemo
                .compra
                .contractId,
              {

                onUpdate:
                  onOperacionUpdate

              }
            );


          telemetria.resultReceivedEpoch =
            Date.now();


          telemetria.resultReceivedPerf =
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
                resultadoDemo.profit ??
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
              resultadoDemo.source ??
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


    } finally {

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

      limitesTiming:
        {
          ...TIMING_LIMITS
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
