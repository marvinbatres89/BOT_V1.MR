/* ==========================================
   BOT V1 MR
   DERIV TRADE - SOLO DEMO

   BUY + SEGUIMIENTO DE CONTRATO

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

    this.ejecucionActiva =
      false;

    this.operacionActiva =
      null;

    this.ultimoResultado =
      null;

    // Seguimientos activos por contract_id.
    // Deriv enviará actualizaciones de proposal_open_contract
    // mediante una suscripción hasta que el contrato cierre.
    this.seguimientos = new Map();


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


  activar() {

    const estado =
      derivConnection.obtenerEstado();


    if (
      !estado.connected
    ) {

      return {
        ok:
          false,

        mensaje:
          "Conecte Deriv DEMO antes de activar la ejecución."
      };

    }


    if (
      !estado.demoVerified
    ) {

      return {
        ok:
          false,

        mensaje:
          "La cuenta no está verificada como DEMO."
      };

    }


    this.ejecucionActiva =
      true;


    return {
      ok:
        true,

      mensaje:
        "Ejecución DEMO activada."
    };

  }


  desactivar() {

    this.ejecucionActiva =
      false;


    return {
      ok:
        true,

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
        ok:
          false,

        motivo:
          "Ejecución DEMO desactivada."
      };

    }


    if (
      !estado.connected
    ) {

      return {
        ok:
          false,

        motivo:
          "Deriv DEMO no está conectado."
      };

    }


    if (
      !estado.demoVerified
    ) {

      return {
        ok:
          false,

        motivo:
          "Cuenta no verificada como DEMO."
      };

    }


    if (
      this.operacionActiva
    ) {

      return {
        ok:
          false,

        motivo:
          "Ya existe una operación DEMO activa."
      };

    }


    return {
      ok:
        true
    };

  }


  procesarRespuesta(
    datos
  ) {

    if (
      !datos ||
      typeof datos !==
        "object"
    ) {

      return;

    }


    /* --------------------------------------
       ACTUALIZACIÓN DE CONTRATO SUSCRITO
       -------------------------------------- */

    const poc =
      datos.proposal_open_contract;

    if (poc?.contract_id != null) {

      const clave =
        String(poc.contract_id);

      const seguimiento =
        this.seguimientos.get(clave);

      if (seguimiento) {

        seguimiento.onData(
          poc,
          datos.subscription?.id ?? null
        );

      }

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

      pendiente.resolve({
        ok:
          false,

        error:
          datos.error.message ||
          datos.error.code ||
          "Deriv rechazó la solicitud.",

        code:
          datos.error.code ??
          null
      });

      return;

    }


    pendiente.resolve({
      ok:
        true,

      datos
    });

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
                ok:
                  false,

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
            ok:
              false,

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
        ok:
          false,

        error:
          permiso.motivo
      };

    }


    if (
      !propuestaDeriv?.ok ||
      !propuestaDeriv?.id
    ) {

      return {
        ok:
          false,

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
        ok:
          false,

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
        ok:
          false,

        error:
          "Deriv respondió sin contract_id."
      };

    }


    this.operacionActiva = {

      contractId:
        compra.contract_id,

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
      ok:
        true,

      compra:
        {
          ...this.operacionActiva
        }
    };

  }


  async consultarContrato(
    contractId
  ) {

    const respuesta =
      await this.solicitar(
        {
          proposal_open_contract:
            1,

          contract_id:
            contractId
        },
        10000
      );


    if (
      !respuesta.ok
    ) {

      return respuesta;

    }


    const contrato =
      respuesta.datos
        ?.proposal_open_contract;


    if (
      !contrato
    ) {

      return {
        ok:
          false,

        error:
          "Deriv respondió sin información del contrato."
      };

    }


    return {
      ok:
        true,

      contrato
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
        contrato?.contract_id ??
        this.operacionActiva?.contractId ??
        null,

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


  async esperarResultado(
    contractId,
    {
      timeoutMs = 60000,
      onUpdate = null
    } = {}
  ) {

    const clave =
      String(contractId);


    /*
      Usamos una suscripción real a
      proposal_open_contract.

      Esto evita depender de consultas
      repetidas y permite recibir el
      cambio final is_sold/status en cuanto
      Deriv cierra el contrato.
    */

    return new Promise(
      (resolve) => {

        let terminado =
          false;

        let subscriptionId =
          null;


        const finalizar =
          (respuesta) => {

            if (terminado) {
              return;
            }

            terminado =
              true;

            clearTimeout(
              timeout
            );

            this.seguimientos.delete(
              clave
            );


            if (subscriptionId) {

              derivConnection.enviar({
                forget:
                  subscriptionId
              });

            }


            resolve(
              respuesta
            );

          };


        const onData =
          (
            contrato,
            idSuscripcion
          ) => {

            if (idSuscripcion) {
              subscriptionId =
                idSuscripcion;
            }


            if (
              typeof onUpdate ===
                "function"
            ) {

              try {
                onUpdate(contrato);
              } catch {}

            }


            const isSold =
              Number(
                contrato?.is_sold ?? 0
              ) === 1 ||
              contrato?.is_sold === true;

            const status =
              String(
                contrato?.status ?? ""
              )
                .toLowerCase();


            if (
              isSold ||
              [
                "won",
                "lost",
                "sold",
                "expired"
              ].includes(status)
            ) {

              const resultado =
                this.normalizarResultado(
                  contrato
                );

              this.ultimoResultado =
                resultado;

              this.operacionActiva =
                null;

              finalizar({
                ok: true,
                resultado
              });

            }

          };


        this.seguimientos.set(
          clave,
          {
            onData
          }
        );


        const timeout =
          setTimeout(
            () => {

              finalizar({
                ok: false,
                error:
                  "No se recibió el cierre del contrato dentro del tiempo esperado.",
                contractId
              });

            },
            timeoutMs
          );


        const envio =
          derivConnection.enviar({
            proposal_open_contract: 1,
            contract_id:
              contractId,
            subscribe: 1
          });


        if (!envio.ok) {

          finalizar({
            ok: false,
            error:
              envio.mensaje,
            contractId
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
          : null
    };

  }

}


export const derivTrade =
  new DerivTrade();
