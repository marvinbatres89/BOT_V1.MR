/* ==========================================
   BOT V1 MR
   DERIV TRADE V2 - SOLO DEMO

   BUY + SEGUIMIENTO POR SUSCRIPCIÓN

   REGLAS:
   - Cuenta DEMO verificada obligatoria
   - Ejecución apagada por defecto
   - 1 operación a la vez
   - Sin martingala
   - Sin cuenta real
   ========================================== */

import {
  derivConnection
} from "./deriv-connection.js";


class DerivTrade {

  constructor() {

    this.reqId =
      5000;

    this.pendientes =
      new Map();

    this.suscripcionesContrato =
      new Map();

    this.ejecucionActiva =
      false;

    this.operacionActiva =
      null;

    this.ultimoResultado =
      null;


    derivConnection.on(
      "message",
      (datos) => {

        this.procesarMensaje(
          datos
        );

      }
    );


    derivConnection.on(
      "state",
      ({ estado }) => {

        if (
          estado !== "connected"
        ) {

          this.limpiarSeguimientos(
            "Conexión Deriv cerrada."
          );

        }

      }
    );

  }


  siguienteReqId() {

    this.reqId +=
      1;

    return this.reqId;

  }


  activar() {

    const estado =
      derivConnection.obtenerEstado();


    if (
      !estado.connected
    ) {

      return {
        ok: false,
        mensaje:
          "Conecte Deriv DEMO antes de activar la ejecución."
      };

    }


    if (
      !estado.demoVerified
    ) {

      return {
        ok: false,
        mensaje:
          "La cuenta no está verificada como DEMO."
      };

    }


    this.ejecucionActiva =
      true;


    return {
      ok: true,
      mensaje:
        "Ejecución DEMO activada."
    };

  }


  desactivar() {

    this.ejecucionActiva =
      false;


    return {
      ok: true,
      mensaje:
        "Ejecución DEMO desactivada."
    };

  }


  puedeComprar() {

    const estado =
      derivConnection.obtenerEstado();


    if (
      !this.ejecucionActiva
    ) {

      return {
        ok: false,
        motivo:
          "Ejecución DEMO desactivada."
      };

    }


    if (
      !estado.connected
    ) {

      return {
        ok: false,
        motivo:
          "Deriv DEMO no está conectado."
      };

    }


    if (
      !estado.demoVerified
    ) {

      return {
        ok: false,
        motivo:
          "Cuenta no verificada como DEMO."
      };

    }


    if (
      this.operacionActiva
    ) {

      return {
        ok: false,
        motivo:
          "Ya existe una operación DEMO activa."
      };

    }


    return {
      ok: true
    };

  }


  procesarMensaje(
    datos
  ) {

    if (
      !datos ||
      typeof datos !==
        "object"
    ) {

      return;

    }


    const reqId =
      datos.req_id;


    /*
      RESPUESTAS DE SOLICITUD ÚNICA
    */

    if (
      reqId &&
      this.pendientes.has(
        reqId
      )
    ) {

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

        pendiente.resolve({
          ok: false,

          error:
            datos.error.message ||
            datos.error.code ||
            "Deriv rechazó la solicitud.",

          code:
            datos.error.code ??
            null
        });

      } else {

        pendiente.resolve({
          ok: true,
          datos
        });

      }

      return;

    }


    /*
      ACTUALIZACIONES DE CONTRATO SUSCRITO
    */

    if (
      datos.msg_type ===
        "proposal_open_contract" &&
      datos.proposal_open_contract
    ) {

      const contrato =
        datos.proposal_open_contract;


      const contractId =
        String(
          contrato.contract_id ??
          ""
        );


      if (
        !contractId ||
        !this.suscripcionesContrato.has(
          contractId
        )
      ) {

        return;

      }


      const seguimiento =
        this.suscripcionesContrato.get(
          contractId
        );


      if (
        datos.subscription?.id &&
        !seguimiento.subscriptionId
      ) {

        seguimiento.subscriptionId =
          datos.subscription.id;

      }


      if (
        typeof seguimiento.onUpdate ===
          "function"
      ) {

        try {

          seguimiento.onUpdate(
            contrato
          );

        } catch {}

      }


      if (
        this.estaCerrado(
          contrato
        )
      ) {

        this.finalizarSeguimiento(
          contractId,
          contrato
        );

      }

    }

  }


  estaCerrado(
    contrato
  ) {

    const status =
      String(
        contrato?.status ??
        ""
      )
        .toLowerCase();


    return (
      Boolean(
        contrato?.is_sold
      ) ||
      Boolean(
        contrato?.is_expired
      ) ||
      [
        "won",
        "lost",
        "sold",
        "expired"
      ].includes(
        status
      )
    );

  }


  solicitar(
    payload,
    timeoutMs = 10000
  ) {

    const reqId =
      this.siguienteReqId();


    const solicitud = {
      ...payload,
      req_id:
        reqId
    };


    return new Promise(
      (resolve) => {

        const timeout =
          setTimeout(
            () => {

              this.pendientes.delete(
                reqId
              );


              resolve({
                ok: false,

                error:
                  "Deriv no respondió dentro del tiempo esperado."
              });

            },
            timeoutMs
          );


        this.pendientes.set(
          reqId,
          {
            timeout,
            resolve
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


  async comprar(
    propuestaDeriv
  ) {

    const permiso =
      this.puedeComprar();


    if (
      !permiso.ok
    ) {

      return {
        ok: false,

        error:
          permiso.motivo
      };

    }


    if (
      !propuestaDeriv?.ok ||
      !propuestaDeriv?.id
    ) {

      return {
        ok: false,

        error:
          "No existe una propuesta Deriv válida para comprar."
      };

    }


    const precio =
      Number(
        propuestaDeriv.askPrice
      );


    if (
      !Number.isFinite(
        precio
      ) ||
      precio <= 0
    ) {

      return {
        ok: false,

        error:
          "Precio de propuesta inválido."
      };

    }


    const respuesta =
      await this.solicitar(
        {
          buy:
            String(
              propuestaDeriv.id
            ),

          price:
            precio
        }
      );


    if (
      !respuesta.ok
    ) {

      return respuesta;

    }


    const compra =
      respuesta.datos?.buy;


    if (
      !compra?.contract_id
    ) {

      return {
        ok: false,

        error:
          "Deriv respondió sin contract_id."
      };

    }


    this.operacionActiva = {

      contractId:
        String(
          compra.contract_id
        ),

      transactionId:
        compra.transaction_id ??
        null,

      buyPrice:
        Number(
          compra.buy_price ??
          precio
        ),

      payout:
        Number(
          compra.payout ??
          0
        ),

      longcode:
        compra.longcode ??
        "",

      purchaseTime:
        compra.purchase_time ??
        null,

      startedAt:
        Date.now()

    };


    return {
      ok: true,

      compra:
        {
          ...this.operacionActiva
        }
    };

  }


  normalizarResultado(
    contrato
  ) {

    const profit =
      Number(
        contrato?.profit ??
        0
      );


    const buyPrice =
      Number(
        contrato?.buy_price ??
        this.operacionActiva?.buyPrice ??
        0
      );


    const sellPrice =
      Number(
        contrato?.sell_price ??
        contrato?.payout ??
        0
      );


    let estado =
      String(
        contrato?.status ??
        ""
      )
        .toUpperCase();


    if (
      !estado
    ) {

      estado =
        profit > 0
          ? "WON"
          : profit < 0
            ? "LOST"
            : "CLOSED";

    }


    return {

      contractId:
        String(
          contrato?.contract_id ??
          this.operacionActiva?.contractId ??
          ""
        ),

      status:
        estado,

      profit,

      buyPrice,

      sellPrice,

      payout:
        Number(
          contrato?.payout ??
          0
        ),

      isSold:
        Boolean(
          contrato?.is_sold
      ),

      isExpired:
        Boolean(
          contrato?.is_expired
        ),

      dateStart:
        contrato?.date_start ??
        null,

      dateExpiry:
        contrato?.date_expiry ??
        null,

      raw:
        contrato
    };

  }


  finalizarSeguimiento(
    contractId,
    contrato
  ) {

    const seguimiento =
      this.suscripcionesContrato.get(
        contractId
      );


    if (
      !seguimiento
    ) {

      return;

    }


    this.suscripcionesContrato.delete(
      contractId
    );


    clearTimeout(
      seguimiento.timeout
    );


    if (
      seguimiento.subscriptionId
    ) {

      derivConnection.enviar({
        forget:
          seguimiento.subscriptionId
      });

    }


    const resultado =
      this.normalizarResultado(
        contrato
      );


    this.ultimoResultado =
      resultado;


    this.operacionActiva =
      null;


    seguimiento.resolve({
      ok: true,
      resultado
    });

  }


  limpiarSeguimientos(
    motivo
  ) {

    for (
      const [
        contractId,
        seguimiento
      ]
      of this.suscripcionesContrato
    ) {

      clearTimeout(
        seguimiento.timeout
      );


      seguimiento.resolve({
        ok: false,
        error:
          motivo ||
          "Seguimiento interrumpido.",
        contractId
      });

    }


    this.suscripcionesContrato.clear();

  }


  async esperarResultado(
    contractId,
    {
      timeoutMs = 60000,
      onUpdate = null
    } = {}
  ) {

    const id =
      String(
        contractId
      );


    if (
      !id
    ) {

      return {
        ok: false,
        error:
          "Falta contract_id para seguimiento."
      };

    }


    if (
      this.suscripcionesContrato.has(
        id
      )
    ) {

      return {
        ok: false,
        error:
          "Ese contrato ya está siendo seguido."
      };

    }


    return new Promise(
      (resolve) => {

        const seguimiento = {

          resolve,
          onUpdate,
          subscriptionId:
            null,

          timeout:
            null
        };


        seguimiento.timeout =
          setTimeout(
            () => {

              this.suscripcionesContrato.delete(
                id
              );


              if (
                seguimiento.subscriptionId
              ) {

                derivConnection.enviar({
                  forget:
                    seguimiento.subscriptionId
                });

              }


              resolve({
                ok: false,

                error:
                  "Tiempo de seguimiento agotado. Revise el contrato en Deriv.",

                contractId:
                  id
              });

            },
            timeoutMs
          );


        this.suscripcionesContrato.set(
          id,
          seguimiento
        );


        /*
          La documentación oficial de Deriv
          recomienda suscribirse a
          proposal_open_contract para recibir
          actualizaciones en tiempo real hasta
          el cierre del contrato.
        */

        const envio =
          derivConnection.enviar({
            proposal_open_contract:
              1,

            contract_id:
              Number.isFinite(
                Number(
                  id
                )
              )
                ? Number(
                    id
                  )
                : id,

            subscribe:
              1
          });


        if (
          !envio.ok
        ) {

          clearTimeout(
            seguimiento.timeout
          );


          this.suscripcionesContrato.delete(
            id
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


  obtenerEstado() {

    return {

      ejecucionActiva:
        this.ejecucionActiva,

      operacionActiva:
        this.operacionActiva
          ? {
              ...this.operacionActiva
            }
          : null,

      ultimoResultado:
        this.ultimoResultado
          ? {
              ...this.ultimoResultado
            }
          : null,

      contratosEnSeguimiento:
        this.suscripcionesContrato.size
    };

  }

}


export const derivTrade =
  new DerivTrade();
