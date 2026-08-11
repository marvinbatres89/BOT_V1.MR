/* ==========================================
   BOT V1 MR
   MOTOR DEMO CONTROLADO

   SEÑAL
   -> CONTRATO
   -> RESPALDO SIMULADO
   -> COTIZACIÓN REAL DERIV DEMO
   -> COMPRA DEMO OPCIONAL
   -> RESULTADO

   DINERO REAL BLOQUEADO
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
      "DERIV DEMO CONTROLADO";

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


  async procesarSenal(
    senal,
    {
      onOperacionUpdate = null
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


    try {

      const contrato =
        contractMapper.mapear(
          senal
        );


      if (
        !contrato.ok
      ) {

        return {
          aceptada:
            false,

          etapa:
            "CONTRACT_MAPPER",

          motivo:
            contrato.error
        };

      }


      this.ultimoContrato =
        contrato;


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

        return {
          aceptada:
            false,

          etapa:
            "PROPOSAL_SIMULATOR",

          motivo:
            propuestaSimulada.error
        };

      }


      this.ultimaPropuesta =
        propuestaSimulada;


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


      if (
        propuestaDeriv.ok &&
        derivTrade.obtenerEstado()
          .ejecucionActiva
      ) {

        compraDemo =
          await derivTrade.comprar(
            propuestaDeriv
          );


        if (
          compraDemo.ok
        ) {

          this.ultimaCompraDemo =
            compraDemo.compra;


          const seguimiento =
            await derivTrade.esperarResultado(
              compraDemo.compra.contractId,
              {
                onUpdate:
                  onOperacionUpdate
              }
            );


          if (
            seguimiento.ok
          ) {

            resultadoDemo =
              seguimiento.resultado;


            this.ultimoResultadoDemo =
              resultadoDemo;

          } else {

            resultadoDemo =
              seguimiento;

          }

        }

      }


      if (
        id
      ) {

        this.ultimaSenalProcesada =
          id;

      }


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

        ejecucionDemoActiva:
          derivTrade.obtenerEstado()
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

      trade:
        derivTrade.obtenerEstado(),

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
