/* ==========================================
   BOT V1 MR
   MOTOR PRINCIPAL DEL BOT
   FASE 3:
   CONTRATO + SIMULACIÓN + PROPUESTA REAL DEMO
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


class BotEngine {

  constructor() {

    this.activo = false;
    this.pausado = false;

    this.ultimaSenalProcesada = null;

    this.modo = "SIMULACION + DERIV DEMO";

    this.ultimoContrato = null;
    this.ultimaPropuesta = null;
    this.ultimaPropuestaDeriv = null;

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

    this.activo = true;
    this.pausado = false;

    return {
      ok: true,
      mensaje:
        "Bot iniciado."
    };

  }


  pausar() {

    this.pausado = true;

    return {
      ok: true,
      mensaje:
        "Bot pausado."
    };

  }


  reanudar() {

    this.pausado = false;

    return {
      ok: true,
      mensaje:
        "Bot reanudado."
    };

  }


  detener() {

    this.activo = false;
    this.pausado = false;

    return {
      ok: true,
      mensaje:
        "Bot detenido."
    };

  }


  puedeProcesar() {

    if (!this.activo) {

      return {
        ok: false,
        motivo:
          "El bot está apagado."
      };

    }


    if (this.pausado) {

      return {
        ok: false,
        motivo:
          "El bot está pausado."
      };

    }


    return {
      ok: true
    };

  }


  configurar(opciones = {}) {

    if (
      opciones.monto !== undefined
    ) {

      const monto =
        Number(
          opciones.monto
        );


      if (
        Number.isFinite(monto) &&
        monto > 0
      ) {

        this.configuracion.monto =
          monto;

      }

    }


    if (
      opciones.moneda
    ) {

      this.configuracion.moneda =
        String(
          opciones.moneda
        )
        .toUpperCase();

    }


    if (
      opciones.duracion !== undefined
    ) {

      const duracion =
        Number(
          opciones.duracion
        );


      if (
        Number.isFinite(duracion) &&
        duracion > 0
      ) {

        this.configuracion.duracion =
          duracion;

      }

    }


    if (
      opciones.unidadDuracion
    ) {

      this.configuracion.unidadDuracion =
        opciones.unidadDuracion;

    }


    return {

      ok: true,

      configuracion:
        {
          ...this.configuracion
        }

    };

  }


  /* ========================================
     PROCESAR SEÑAL
     AHORA ES ASÍNCRONO
     ======================================== */

  async procesarSenal(senal) {

    const estado =
      this.puedeProcesar();


    if (!estado.ok) {

      return {

        aceptada:
          false,

        motivo:
          estado.motivo

      };

    }


    if (
      this.ultimaSenalProcesada ===
      senal.id
    ) {

      return {

        aceptada:
          false,

        motivo:
          "Señal duplicada."

      };

    }


    /* ======================================
       PASO 1
       MAPEAR A CONTRATO
       ====================================== */

    const contrato =
      contractMapper.mapear(
        senal
      );


    if (!contrato.ok) {

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


    /* ======================================
       PASO 2
       PROPUESTA SIMULADA LOCAL
       ====================================== */

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


    if (!propuestaSimulada.ok) {

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


    /* ======================================
       PASO 3
       PROPUESTA REAL DERIV DEMO
       ====================================== */

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


    /* ======================================
       MARCAR COMO PROCESADA
       ====================================== */

    this.ultimaSenalProcesada =
      senal.id;


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

      mensaje:
        propuestaDeriv.ok
          ? `PROPUESTA DERIV DEMO RECIBIDA · ${contrato.contractType}`
          : `SIMULACIÓN OK · DERIV DEMO: ${propuestaDeriv.error}`

    };

  }


  obtenerUltimoContrato() {

    return this.ultimoContrato;

  }


  obtenerUltimaPropuesta() {

    return this.ultimaPropuesta;

  }


  obtenerUltimaPropuestaDeriv() {

    return this.ultimaPropuestaDeriv;

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
