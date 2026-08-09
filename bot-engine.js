/* ==========================================
   BOT V1 MR
   MOTOR PRINCIPAL DEL BOT
   FASE 2: CONTRATO + PROPUESTA SIMULADA
   ========================================== */

import {
  contractMapper
} from "./contract-mapper.js";

import {
  proposalSimulator
} from "./proposal-simulator.js";


class BotEngine {

  constructor() {

    this.activo = false;
    this.pausado = false;

    this.ultimaSenalProcesada = null;

    this.modo = "SIMULACION";

    this.ultimoContrato = null;
    this.ultimaPropuesta = null;

    /* --------------------------------------
       CONFIGURACIÓN TEMPORAL DE PRUEBA
       -------------------------------------- */

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
     INICIAR BOT
     ======================================== */

  iniciar() {

    this.activo = true;
    this.pausado = false;

    return {

      ok:
        true,

      mensaje:
        "Bot iniciado en modo simulación"

    };

  }


  /* ========================================
     PAUSAR BOT
     ======================================== */

  pausar() {

    this.pausado = true;

    return {

      ok:
        true,

      mensaje:
        "Bot pausado"

    };

  }


  /* ========================================
     REANUDAR BOT
     ======================================== */

  reanudar() {

    this.pausado = false;

    return {

      ok:
        true,

      mensaje:
        "Bot reanudado"

    };

  }


  /* ========================================
     DETENER BOT
     ======================================== */

  detener() {

    this.activo = false;
    this.pausado = false;

    return {

      ok:
        true,

      mensaje:
        "Bot detenido"

    };

  }


  /* ========================================
     VALIDAR ESTADO
     ======================================== */

  puedeProcesar() {

    if (!this.activo) {

      return {

        ok:
          false,

        motivo:
          "El bot está apagado"

      };

    }


    if (this.pausado) {

      return {

        ok:
          false,

        motivo:
          "El bot está pausado"

      };

    }


    return {

      ok:
        true

    };

  }


  /* ========================================
     CONFIGURACIÓN
     ======================================== */

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

      ok:
        true,

      configuracion:
        {
          ...this.configuracion
        }

    };

  }


  /* ========================================
     PROCESAR SEÑAL
     ======================================== */

  procesarSenal(senal) {

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


    /* --------------------------------------
       EVITAR DUPLICADOS
       -------------------------------------- */

    if (
      this.ultimaSenalProcesada ===
      senal.id
    ) {

      return {

        aceptada:
          false,

        motivo:
          "Señal duplicada"

      };

    }


    /*
      Todavía NO marcamos la señal como
      procesada hasta comprobar que puede
      traducirse correctamente.
    */


    /* ======================================
       PASO 1
       TRADUCIR SEÑAL A CONTRATO DERIV
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
       CREAR PROPUESTA SIMULADA
       ====================================== */

    const propuesta =
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


    if (!propuesta.ok) {

      return {

        aceptada:
          false,

        etapa:
          "PROPOSAL_SIMULATOR",

        motivo:
          propuesta.error

      };

    }


    /* ======================================
       SEÑAL PROCESADA CORRECTAMENTE
       ====================================== */

    this.ultimaSenalProcesada =
      senal.id;

    this.ultimaPropuesta =
      propuesta;


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

      contrato:
        contrato,

      propuesta:
        propuesta,

      mensaje:
        `SIMULACIÓN PREPARADA · ${contrato.contractType}`

    };

  }


  /* ========================================
     ÚLTIMO CONTRATO
     ======================================== */

  obtenerUltimoContrato() {

    return this.ultimoContrato;

  }


  /* ========================================
     ÚLTIMA PROPUESTA
     ======================================== */

  obtenerUltimaPropuesta() {

    return this.ultimaPropuesta;

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
