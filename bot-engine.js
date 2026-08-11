/* ==========================================
   BOT V1 MR
   BOT ENGINE
   FIX7 - CALIBRADOR DE EJECUCIÓN

   CONSERVA FIX6:
   SEÑAL
   -> CONTRATO
   -> PROPUESTA
   -> BUY DEMO
   -> RESULTADO

   AGREGA FIX7:
   -> FAMILIA DE MERCADO
   -> PUNTO DE ENTRADA
   -> RETRASO CONFIGURADO
   -> LATENCIA DE PROPUESTA
   -> LATENCIA DE BUY
   -> LATENCIA TOTAL
   -> RESULTADO
   -> HISTORIAL DE CALIBRACIÓN

   SOLO CUENTA DEMO
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
  "BOT_V1_MR_FIX7_TELEMETRY";


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
      "DERIV DEMO + CALIBRADOR FIX7";

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
     REDONDEAR MILISEGUNDOS
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


  /* ========================================
     IDENTIFICAR FAMILIA DEL MERCADO

     R_...   = ESTÁNDAR
     1HZ...  = 1 SEGUNDO
     ======================================== */

  obtenerFamiliaMercado(
    mercado
  ) {

    const symbol =
      String(
        mercado ||
        ""
      )
        .trim()
        .toUpperCase();


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
     RETRASO DE REFERENCIA

     NO MODIFICA LA EJECUCIÓN.
     SOLO LO REGISTRA PARA CALIBRAR.
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
     INICIAR
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


  /* ========================================
     PAUSAR
     ======================================== */

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


  /* ========================================
     REANUDAR
     ======================================== */

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


  /* ========================================
     DETENER
     ======================================== */

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


  /* ========================================
     EJECUCIÓN DEMO
     ======================================== */

  activarEjecucionDemo() {

    return derivTrade.activar();

  }


  desactivarEjecucionDemo() {

    return derivTrade.desactivar();

  }


  /* ========================================
     VALIDAR ESTADO
     ======================================== */

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
     CREAR TELEMETRÍA FIX7
     ======================================== */

  crearTelemetria(
    senal,
    senalRecibidaPerf = null
  ) {

    const ahora =
      this.ahora();


    const familia =
      this.obtenerFamiliaMercado(
        senal?.mercado
      );


    const retrasoReferenciaMs =
      this.obtenerRetrasoReferencia(
        senal?.mercado
      );


    return {

      id:
        `${Date.now()}-${Math.floor(
          Math.random() * 100000
        )}`,

      signalId:
        senal?.id ??
        null,

      mercado:
        senal?.mercado ??
        null,

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
        retrasoReferenciaMs !== null
          ? retrasoReferenciaMs / 1000
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
    telemetria
  ) {

    const t =
      telemetria;


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

      const datos =
        JSON.parse(
          localStorage.getItem(
            TELEMETRY_KEY
          ) ||
          "[]"
        );


      const historial =
        Array.isArray(
          datos
        )
          ? datos
          : [];


      historial.unshift(
        {
          ...telemetria
        }
      );


      if (
        historial.length >
        300
      ) {

        historial.length =
          300;

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
        "No se pudo guardar telemetría FIX7:",
        error
      );

    }


    return telemetria;

  }


  /* ========================================
     HISTORIAL COMPLETO
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
     HISTORIAL POR FAMILIA
     ======================================== */

  obtenerTelemetriaPorFamilia(
    familia
  ) {

    const buscada =
      String(
        familia ||
        ""
      )
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


    const accuracy =
      finalizadas.length
        ? (
            ganadas /
            finalizadas.length
          ) * 100
        : null;


    const latencias =
      finalizadas
        .map(
          (item) =>
            Number(
              item.signalToBuyMs
            )
        )
        .filter(
          Number.isFinite
        );


    const promedioSignalToBuyMs =
      latencias.length
        ? latencias.reduce(
            (
              suma,
              valor
            ) =>
              suma + valor,
            0
          ) /
          latencias.length
        : null;


    return {

      familia:
        String(
          familia
        )
          .toUpperCase(),

      pruebas:
        finalizadas.length,

      ganadas,

      perdidas,

      accuracy:
        accuracy !== null
          ? this.ms(
              accuracy
            )
          : null,

      promedioSignalToBuyMs:
        promedioSignalToBuyMs !==
          null
          ? this.ms(
              promedioSignalToBuyMs
            )
          : null

    };

  }


  /* ========================================
     LIMPIAR TELEMETRÍA
     ======================================== */

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
     PROCESAR SEÑAL FIX7
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
         PASO 1
         MAPEAR CONTRATO
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
         PASO 2
         SIMULACIÓN LOCAL
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
         PASO 3
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
         PASO 4
         BUY DEMO

         IMPORTANTE:
         FIX7 NO AGREGA RETRASO.
         SOLO MIDE EL RETRASO REAL.
         ==================================== */

      if (
        propuestaDeriv.ok &&
        derivTrade.obtenerEstado()
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
             PASO 5
             ESPERAR RESULTADO
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

          } else {

            resultadoDemo =
              seguimiento;


            telemetria.resultado =
              "SIN_CONFIRMAR";


            telemetria.profit =
              null;

          }

        } else {

          telemetria.resultado =
            "BUY_RECHAZADO";

        }

      } else {

        telemetria.resultado =
          propuestaDeriv.ok
            ? "SOLO_COTIZACION"
            : "PROPUESTA_RECHAZADA";

      }


      /* ====================================
         MARCAR SEÑAL PROCESADA
         ==================================== */

      if (
        id
      ) {

        this.ultimaSenalProcesada =
          id;

      }


      /* ====================================
         GUARDAR MEDICIONES
         ==================================== */

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
     ESTADO ACTUAL
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
