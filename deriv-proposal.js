/* ==========================================
   BOT V1 MR
   DERIV PROPOSAL
   FIX6.1

   SOLICITA PROPUESTAS REALES
   A DERIV DEMO

   CORRECCIÓN:
   symbol -> underlying_symbol

   IMPORTANTE:
   NO COMPRA CONTRATOS
   NO USA BUY
   ========================================== */

import {
  derivConnection
} from "./deriv-connection.js";


class DerivProposal {

  constructor() {

    this.reqId =
      1000;

    this.pendientes =
      new Map();

    this.ultimaPropuesta =
      null;


    derivConnection.on(
      "message",
      (datos) => {

        this.procesarRespuesta(
          datos
        );

      }
    );

  }


  siguienteReqId() {

    this.reqId +=
      1;

    return this.reqId;

  }


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
      !this.pendientes.has(
        reqId
      )
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


  validarContrato(
    contrato
  ) {

    if (
      !contrato
    ) {

      return {
        ok:
          false,

        error:
          "No existe contrato."
      };

    }


    if (
      !contrato.symbol
    ) {

      return {
        ok:
          false,

        error:
          "Falta mercado."
      };

    }


    if (
      !contrato.contractType
    ) {

      return {
        ok:
          false,

        error:
          "Falta contractType."
      };

    }


    return {
      ok:
        true
    };

  }


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
      !Number.isFinite(
        monto
      ) ||
      monto <= 0
    ) {

      throw new Error(
        "Monto inválido."
      );

    }


    if (
      !Number.isFinite(
        duracion
      ) ||
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

      underlying_symbol:
        contrato.symbol,

      req_id:
        reqId

    };


    if (
      contrato.barrier !==
        null &&
      contrato.barrier !==
        undefined
    ) {

      solicitud.barrier =
        String(
          contrato.barrier
        );

    }


    return solicitud;

  }


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

        ok:
          false,

        error:
          validacion.error

      };

    }


    const estado =
      derivConnection
        .obtenerEstado();


    if (
      !estado.connected
    ) {

      return {

        ok:
          false,

        error:
          "Deriv DEMO no está conectado."

      };

    }


    if (
      !estado.demoVerified
    ) {

      return {

        ok:
          false,

        error:
          "La cuenta no está verificada como DEMO."

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

        ok:
          false,

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

                ok:
                  false,

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

                  ok:
                    false,

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

            ok:
              false,

            error:
              envio.mensaje

          });

        }

      }
    );

  }


  obtenerUltimaPropuesta() {

    return this.ultimaPropuesta;

  }

}


export const derivProposal =
  new DerivProposal();
