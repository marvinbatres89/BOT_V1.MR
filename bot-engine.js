/* ==========================================
   BOT V1 MR
   BOT ENGINE
   FIX10 - CALIBRADOR MULTIMERCADO

   CONSERVA:
   - FIX8 / FIX9 TELEMETRÍA
   - CONTRATO
   - PROPUESTA
   - BUY DEMO
   - RESULTADO
   - GANADAS VS PERDIDAS
   - LATENCIAS
   - DATOS ANTERIORES

   AGREGA:
   STANDARD:
   - R_10
   - R_25
   - R_50
   - R_75
   - R_100

   1 SEGUNDO:
   - 1HZ10V
   - 1HZ15V
   - 1HZ25V
   - 1HZ30V
   - 1HZ50V
   - 1HZ75V
   - 1HZ100V

   TOTAL: 12 MERCADOS

   IMPORTANTE:
   FIX10 TODAVÍA NO CAMBIA EL TIMING.
   SOLO MIDE Y COMPARA.
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


/*
  CONSERVAMOS LA MISMA CLAVE
  PARA NO PERDER LAS PRUEBAS
  DE FIX8 Y FIX9.
*/

const TELEMETRY_KEY =
  "BOT_V1_MR_FIX8_TELEMETRY";


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
      "DERIV DEMO + CALIBRADOR FIX10";

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
      numero * 100
    ) / 100;

  }


  /* ========================================
     PROMEDIO
     ======================================== */

  promedio(
    valores
  ) {

    const validos =
      valores
        .map(
          Number
        )
        .filter(
          Number.isFinite
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
      valores
        .map(
          Number
        )
        .filter(
          Number.isFinite
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
      valores
        .map(
          Number
        )
        .filter(
          Number.isFinite
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
      valores
        .map(
          Number
        )
        .filter(
          Number.isFinite
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
     FAMILIA DEL MERCADO
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


    return MERCADOS_CONTROLADOS.includes(
      symbol
    );

  }


  /* ========================================
     RETRASO DE REFERENCIA

     SOLO PARA REGISTRO.

     NO APLICA ESPERA AUTOMÁTICA.
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
     CONTROL DEL BOT
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

    return derivTrade.activar();

  }


  desactivarEjecucionDemo() {

    return derivTrade.desactivar();

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
     CREAR TELEMETRÍA
     ======================================== */

  crearTelemetria(
    senal,
    senalRecibidaPerf = null
  ) {

    const ahora =
      this.ahora();


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


    return {

      id:
        `${Date.now()}-${Math.floor(
          Math.random() *
          100000
        )}`,

      version:
        "FIX10",

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
          : ahora,

      processStartedPerf:
        ahora,

      proposalRequestedPerf:
        null,

      proposalReceivedPerf:
        null,

      buyRequestedPerf:
        null,

      buyConfirmedPerf:
        null,

      resultReceivedPerf:
        null,

      bridgeToProcessMs:
        null,

      proposalLatencyMs:
        null,

      buyLatencyMs:
        null,

      processToBuyMs:
        null,

      signalToBuyMs:
        null,

      signalToBuyConfirmMs:
        null,

      totalUntilResultMs:
        null,

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
        1500
      ) {

        historial.length =
          1500;

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
        "No se pudo guardar telemetría FIX10:",
        error
      );

    }


    return telemetria;

  }


  /* ========================================
     FILTRO POR MERCADO
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
     FILTRO POR FAMILIA
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

      promedioBuyMs:
        this.promedio(
          buy
        ),

      promedioSignalToConfirmMs:
        this.promedio(
          confirmacion
        )

    };

  }


  /* ========================================
     COMPARAR GANADAS / PERDIDAS
     ======================================== */

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


    const ganadas =
      finalizadas.filter(
        (item) =>
          item.resultado ===
            "GANADA"
      );


    const perdidas =
      finalizadas.filter(
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


    let lectura =
      "DATOS INSUFICIENTES";


    if (
      diferenciaMedianaMs !==
        null
    ) {

      if (
        diferenciaMedianaMs >
        20
      ) {

        lectura =
          "GANADAS ENTRAN MÁS RÁPIDO";

      }

      else if (
        diferenciaMedianaMs <
        -20
      ) {

        lectura =
          "GANADAS ENTRAN MÁS TARDE";

      }

      else {

        lectura =
          "TIMING MUY SIMILAR";

      }

    }


    return {

      total:
        finalizadas.length,

      ganadas:
        metricasGanadas,

      perdidas:
        metricasPerdidas,

      diferenciaPromedioMs,

      diferenciaMedianaMs,

      lectura

    };

  }


  /* ========================================
     RESUMEN DE MERCADO
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
      pruebas > 0
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

      pruebas,

      ganadas,

      perdidas,

      accuracy,

      promedioSignalToBuyMs:
        this.promedio(
          finalizadas.map(
            (item) =>
              item.signalToBuyMs
          )
        ),

      medianaSignalToBuyMs:
        this.mediana(
          finalizadas.map(
            (item) =>
              item.signalToBuyMs
          )
        ),

      promedioProposalMs:
        this.promedio(
          finalizadas.map(
            (item) =>
              item.proposalLatencyMs
          )
        ),

      promedioBuyMs:
        this.promedio(
          finalizadas.map(
            (item) =>
              item.buyLatencyMs
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
     RESUMEN DE TODOS LOS MERCADOS
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
     RESUMEN POR FAMILIA
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
        pruebas > 0
          ? this.redondear(
              (
                ganadas /
                pruebas
              ) *
              100
            )
          : null,

      promedioSignalToBuyMs:
        this.promedio(
          finalizadas.map(
            (item) =>
              item.signalToBuyMs
          )
        ),

      medianaSignalToBuyMs:
        this.mediana(
          finalizadas.map(
            (item) =>
              item.signalToBuyMs
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

      lectura:
        resumen
          .comparadorTiming
          .lectura

    };

  }


  /* ========================================
     PROCESAR SEÑAL
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
         CONTRATO
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
         SIMULACIÓN
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
         COTIZACIÓN DERIV
         ==================================== */

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
         BUY DEMO

         FIX10 NO AGREGA RETRASO.
         ==================================== */

      if (
        propuestaDeriv.ok &&
        derivTrade
          .obtenerEstado()
          .ejecucionActiva
      ) {

        telemetria.buyRequestedPerf =
          this.ahora();


        compraDemo =
          await derivTrade.comprar(
            propuestaDeriv
          );


        telemetria.buyConfirmedPerf =
          this.ahora();


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
             RESULTADO
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
              profit > 0
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
          propuestaDeriv.ok
            ? "SOLO_COTIZACION"
            : "PROPUESTA_RECHAZADA";

      }


      if (
        id
      ) {

        this.ultimaSenalProcesada =
          id;

      }


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

    }


    return {

      activo:
        this.activo,

      pausado:
        this.pausado,

      modo:
        this.modo,

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
