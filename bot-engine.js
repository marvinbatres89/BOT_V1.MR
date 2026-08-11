/* ==========================================
   BOT V1 MR
   BOT ENGINE
   FIX9 - COMPARADOR DE TIMING

   CONSERVA FIX8:
   - SINCRONIZACIÓN
   - CONTRATO
   - PROPUESTA
   - BUY DEMO
   - RESULTADO
   - TELEMETRÍA
   - ESTADÍSTICAS POR MERCADO

   AGREGA FIX9:
   - GANADAS VS PERDIDAS
   - PROMEDIO SEÑAL → BUY
   - PROMEDIO COTIZACIÓN
   - PROMEDIO BUY → CONFIRMACIÓN
   - COMPARACIÓN POR MERCADO

   IMPORTANTE:
   Conservamos la misma clave de FIX8
   para aprovechar las pruebas existentes.
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


const TELEMETRY_KEY =
  "BOT_V1_MR_FIX8_TELEMETRY";


const MERCADOS_CONTROLADOS = [

  "R_10",
  "R_25",
  "R_50",
  "R_75",
  "R_100",

  "1HZ10V",
  "1HZ25V",
  "1HZ50V",
  "1HZ75V",
  "1HZ100V"

];


/* ==========================================
   ENGINE
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
      "DERIV DEMO + CALIBRADOR FIX9";

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
     NÚMEROS
     ======================================== */

  ms(
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


  promedio(
    lista
  ) {

    const validos =
      lista
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


    return this.ms(

      validos.reduce(
        (
          suma,
          valor
        ) =>
          suma +
          valor,
        0
      ) /
      validos.length

    );

  }


  minimo(
    lista
  ) {

    const validos =
      lista
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


    return this.ms(
      Math.min(
        ...validos
      )
    );

  }


  maximo(
    lista
  ) {

    const validos =
      lista
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


    return this.ms(
      Math.max(
        ...validos
      )
    );

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


  /* ========================================
     REFERENCIA ACTUAL

     SOLO REFERENCIA ESTADÍSTICA.
     NO INTRODUCE ESPERAS.
     ======================================== */

  obtenerRetrasoReferencia(
    mercado
  ) {

    const familia =
      this.obtenerFamiliaMercado(
        mercado
      );


    if (
      familia === "1S"
    ) {

      return 100;

    }


    if (
      familia === "STANDARD"
    ) {

      return 0;

    }


    return null;

  }


  /* ========================================
     CONTROL ENGINE
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
     TELEMETRÍA
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
          Math.random() * 100000
        )}`,

      version:
        "FIX9",

      signalId:
        senal?.id ??
        null,

      mercado,

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
        this.ms(
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
        this.ms(
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
        this.ms(
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
        this.ms(
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
        this.ms(
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
        this.ms(
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
        this.ms(
          t.resultReceivedPerf -
          t.signalReceivedPerf
        );

    }


    return t;

  }


  /* ========================================
     HISTORIAL

     MISMA CLAVE FIX8:
     NO BORRAMOS PRUEBAS ANTERIORES.
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
        1000
      ) {

        historial.length =
          1000;

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
        "No se pudo guardar telemetría FIX9:",
        error
      );

    }


    return telemetria;

  }


  limpiarTelemetria() {

    try {

      localStorage.removeItem(
        TELEMETRY_KEY
      );

    } catch {}


    this.ultimaTelemetria =
      null;


    return {

      ok:
        true

    };

  }


  /* ========================================
     FILTROS
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
     MÉTRICAS DE UN GRUPO

     FIX9:
     Puede ser GANADA o PERDIDA.
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
     COMPARADOR GANADAS / PERDIDAS
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


    let diferenciaSignalToBuyMs =
      null;


    if (
      metricasGanadas
        .promedioSignalToBuyMs !==
        null &&
      metricasPerdidas
        .promedioSignalToBuyMs !==
        null
    ) {

      diferenciaSignalToBuyMs =
        this.ms(
          metricasPerdidas
            .promedioSignalToBuyMs -
          metricasGanadas
            .promedioSignalToBuyMs
        );

    }


    let lectura =
      "DATOS INSUFICIENTES";


    if (
      diferenciaSignalToBuyMs !==
      null
    ) {

      if (
        diferenciaSignalToBuyMs >
        20
      ) {

        lectura =
          "GANADAS ENTRAN MÁS RÁPIDO";

      }

      else if (
        diferenciaSignalToBuyMs <
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

      diferenciaSignalToBuyMs,

      lectura

    };

  }


  /* ========================================
     RESUMEN GENERAL
     ======================================== */

  construirResumen(
    datos,
    etiqueta
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
      ).length;


    const perdidas =
      finalizadas.filter(
        (item) =>
          item.resultado ===
            "PERDIDA"
      ).length;


    const total =
      finalizadas.length;


    const accuracy =
      total > 0
        ? (
            ganadas /
            total
          ) * 100
        : null;


    return {

      etiqueta,

      pruebas:
        total,

      ganadas,

      perdidas,

      accuracy:
        accuracy !== null
          ? this.ms(
              accuracy
            )
          : null,

      promedioSignalToBuyMs:
        this.promedio(
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

      comparadorTiming:
        this.construirComparadorTiming(
          finalizadas
        )

    };

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


    return this.construirResumen(
      datos,
      String(
        familia ||
        ""
      )
        .toUpperCase()
    );

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


    const resumen =
      this.construirResumen(
        datos,
        symbol
      );


    return {

      mercado:
        symbol,

      familia:
        this.obtenerFamiliaMercado(
          symbol
        ),

      retrasoReferenciaMs:
        this.obtenerRetrasoReferencia(
          symbol
        ),

      ...resumen

    };

  }


  /* ========================================
     RESUMEN 10 MERCADOS
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
     COMPARACIÓN DESTACADA
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

      diferenciaSignalToBuyMs:
        resumen
          .comparadorTiming
          .diferenciaSignalToBuyMs,

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
         PROPUESTA DERIV
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
             SEGUIMIENTO
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

        resumenFamilia:
          this.obtenerResumenFamilia(
            telemetria
              .familiaMercado
          ),

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
     ESTADO
     ======================================== */

  obtenerEstado() {

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

      resumen1S:
        this.obtenerResumenFamilia(
          "1S"
        ),

      resumenStandard:
        this.obtenerResumenFamilia(
          "STANDARD"
        ),

      resumenMercados:
        this.obtenerResumenMercados(),

      comparacionR50:
        this.obtenerComparacionMercado(
          "R_50"
        ),

      comparacion1HZ75V:
        this.obtenerComparacionMercado(
          "1HZ75V"
        ),

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
