/* ==========================================
   BOT V1 MR
   DERIV PROPOSAL

   SOLICITA PROPUESTAS REALES
   A DERIV DEMO

   IMPORTANTE:
   NO COMPRA CONTRATOS
   NO USA BUY
   ========================================== */

import {
  derivConnection
} from "./deriv-connection.js";


class DerivProposal {

  constructor() {

    this.reqId = 1000;

    this.pendientes =
      new Map();

    this.ultimaPropuesta =
      null;


    /*
      Escuchamos todas las respuestas
      que llegan por el WebSocket
      autenticado ya existente.
    */

    derivConnection.on(
      "message",
      (datos) => {

        this.procesarRespuesta(
          datos
        );

      }
    );

  }


  /* ========================================
     CREAR REQ ID
     ======================================== */

  siguienteReqId() {

    this.reqId += 1;

    return this.reqId;

  }


  /* ========================================
     PROCESAR RESPUESTAS DERIV
     ======================================== */

  procesarRespuesta(
    datos
  ) {

    if (
      !datos ||
      typeof datos !== "object"
    ) {

      return;

    }


    const reqId =
      datos.req_id;


    if (
      !reqId ||
      !this.pendientes.has(reqId)
    ) {

      return;

    }


    const pendiente =
      this.pendientes.get(
        reqId
      );


    this.pendientes.delete(
      reqId
    );


    clearTimeout(
      pendiente.timeout
    );


    /* --------------------------------------
       ERROR DERIV
       -------------------------------------- */

    if (
      datos.error
    ) {

      pendiente.reject(
        new Error(
          datos.error.message ||
          datos.error.code ||
          "Deriv rechazó la propuesta."
        )
      );

      return;

    }


    /* --------------------------------------
       PROPUESTA
       -------------------------------------- */

    if (
      datos.proposal
    ) {

      const propuesta = {

        ok:
          true,

        modo:
          "DERIV_DEMO_REAL",

        reqId,

        id:
          datos.proposal.id ??
          null,

        askPrice:
          Number(
            datos.proposal.ask_price ??
            0
          ),

        payout:
          Number(
            datos.proposal.payout ??
            0
          ),

        spot:
          datos.proposal.spot ??
          null,

        spotTime:
          datos.proposal.spot_time ??
          null,

        longcode:
          datos.proposal.longcode ??
          "",

        displayValue:
          datos.proposal.display_value ??
          null,

        raw:
          datos.proposal,

        receivedAt:
          Date.now()

      };


      this.ultimaPropuesta =
        propuesta;


      pendiente.resolve(
        propuesta
      );

      return;

    }


    pendiente.reject(
      new Error(
        "Deriv respondió sin una propuesta válida."
      )
    );

  }


  /* ========================================
     VALIDAR CONTRATO
     ======================================== */

  validarContrato(
    contrato
  ) {

    if (!contrato) {

      return {
        ok: false,
        error:
          "No existe contrato."
      };

    }


    if (!contrato.symbol) {

      return {
        ok: false,
        error:
          "Falta mercado."
      };

    }


    if (!contrato.contractType) {

      return {
        ok: false,
        error:
          "Falta contractType."
      };

    }


    return {
      ok: true
    };

  }


  /* ========================================
     CONSTRUIR REQUEST PROPOSAL
     ======================================== */

  construirSolicitud(
    contrato,
    opciones = {}
  ) {

    const monto =
      Number(
        opciones.monto ??
        1
      );


    const moneda =
      String(
        opciones.moneda ??
        "USD"
      )
      .toUpperCase();


    const duracion =
      Number(
        opciones.duracion ??
        1
      );


    const unidadDuracion =
      String(
        opciones.unidadDuracion ??
        "t"
      );


    if (
      !Number.isFinite(monto) ||
      monto <= 0
    ) {

      throw new Error(
        "Monto inválido."
      );

    }


    if (
      !Number.isFinite(duracion) ||
      duracion <= 0
    ) {

      throw new Error(
        "Duración inválida."
      );

    }


    const reqId =
      this.siguienteReqId();


    const solicitud = {

      proposal:
        1,

      amount:
        monto,

      basis:
        "stake",

      contract_type:
        contrato.contractType,

      currency:
        moneda,

      duration:
        duracion,

      duration_unit:
        unidadDuracion,

      symbol:
        contrato.symbol,

      req_id:
        reqId

    };


    /*
      Solo agregamos barrier cuando
      el tipo de contrato realmente
      la necesita.
    */

    if (
      contrato.barrier !== null &&
      contrato.barrier !== undefined
    ) {

      solicitud.barrier =
        String(
          contrato.barrier
        );

    }


    return solicitud;

  }


  /* ========================================
     SOLICITAR PROPUESTA REAL
     ======================================== */

  async solicitar(
    contrato,
    opciones = {}
  ) {

    const validacion =
      this.validarContrato(
        contrato
      );


    if (
      !validacion.ok
    ) {

      return {

        ok: false,

        error:
          validacion.error

      };

    }


    const estado =
      derivConnection.obtenerEstado();


    if (
      !estado.connected
    ) {

      return {

        ok: false,

        error:
          "Deriv DEMO no está conectado."

      };

    }


    let solicitud;


    try {

      solicitud =
        this.construirSolicitud(
          contrato,
          opciones
        );

    } catch (error) {

      return {

        ok: false,

        error:
          error.message

      };

    }


    return new Promise(
      (resolve) => {

        const reqId =
          solicitud.req_id;


        const timeout =
          setTimeout(
            () => {

              this.pendientes.delete(
                reqId
              );


              resolve({

                ok: false,

                error:
                  "Deriv no respondió a la propuesta dentro del tiempo esperado."

              });

            },
            10000
          );


        this.pendientes.set(
          reqId,
          {

            timeout,

            resolve:
              (propuesta) => {

                resolve(
                  propuesta
                );

              },

            reject:
              (error) => {

                resolve({

                  ok: false,

                  error:
                    error.message

                });

              }

          }
        );


        const envio =
          derivConnection.enviar(
            solicitud
          );


        if (
          !envio.ok
        ) {

          clearTimeout(
            timeout
          );


          this.pendientes.delete(
            reqId
          );


          resolve({

            ok: false,

            error:
              envio.mensaje

          });

        }

      }
    );

  }


  /* ========================================
     ÚLTIMA PROPUESTA
     ======================================== */

  obtenerUltimaPropuesta() {

    return this.ultimaPropuesta;

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const derivProposal =
  new DerivProposal();
