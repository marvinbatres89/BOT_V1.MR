/* ==========================================
   BOT V1 MR
   DERIV TRADE V3 - SOLO DEMO

   BUY + SEGUIMIENTO HÍBRIDO ROBUSTO

   Seguimiento:
   1) Suscripción proposal_open_contract
   2) Consulta periódica de respaldo

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

    this.reqId = 5000;

    this.pendientes =
      new Map();

    this.seguimientos =
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

          this.interrumpirSeguimientos(
            "Conexión Deriv cerrada."
          );

        }

      }
    );

  }


  siguienteReqId() {

    this.reqId += 1;

    return this.reqId;

  }


  activar() {

    const estado =
      derivConnection.obtenerEstado();


    if (!estado.connected) {

      return {
        ok: false,
        mensaje:
          "Conecte Deriv DEMO antes de activar la ejecución."
      };

    }


    if (!estado.demoVerified) {

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


    if (!this.ejecucionActiva) {

      return {
        ok: false,
        motivo:
          "Ejecución DEMO desactivada."
      };

    }


    if (!estado.connected) {

      return {
        ok: false,
        motivo:
          "Deriv DEMO no está conectado."
      };

    }


    if (!estado.demoVerified) {

      return {
        ok: false,
        motivo:
          "Cuenta no verificada como DEMO."
      };

    }


    if (this.operacionActiva) {

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
      typeof datos !== "object"
    ) {

      return;

    }


    const reqId =
      datos.req_id;


    /*
      RESPUESTA DE SOLICITUD INDIVIDUAL
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


      if (datos.error) {

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

      /*
        NO hacemos return si también viene
        proposal_open_contract, porque una
        misma respuesta puede servir para
        actualizar el seguimiento.
      */

    }


    /*
      IMPORTANTE:
      No dependemos de msg_type.
      Procesamos cualquier mensaje que
      contenga proposal_open_contract.
    */

    const contrato =
      datos.proposal_open_contract;


    if (!contrato) {

      return;

    }


    const contractId =
      String(
        contrato.contract_id ??
        ""
      );


    if (
      !contractId ||
      !this.seguimientos.has(
        contractId
      )
    ) {

      return;

    }


    const seguimiento =
      this.seguimientos.get(
        contractId
      );


    if (
      datos.subscription?.id &&
      !seguimiento.subscriptionId
    ) {

      seguimiento.subscriptionId =
        datos.subscription.id;

    }


    seguimiento.ultimoContrato =
      contrato;


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


  estaCerrado(
    contrato
  ) {

    const status =
      String(
        contrato?.status ??
        ""
      )
        .trim()
        .toLowerCase();


    return (
      Number(
        contrato?.is_sold ??
        0
      ) === 1 ||
      contrato?.is_sold === true ||
      Number(
        contrato?.is_expired ??
        0
      ) === 1 ||
      contrato?.is_expired === true ||
      [
        "won",
        "lost",
        "sold",
        "expired",
        "cancelled",
        "canceled"
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


        if (!envio.ok) {

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


    if (!permiso.ok) {

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


    if (!respuesta.ok) {

      return respuesta;

    }


    const compra =
      respuesta.datos?.buy;


    if (!compra?.contract_id) {

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
        .trim()
        .toUpperCase();


    if (!estado) {

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


  limpiarSeguimiento(
    contractId
  ) {

    const seguimiento =
      this.seguimientos.get(
        contractId
      );


    if (!seguimiento) {

      return null;

    }


    this.seguimientos.delete(
      contractId
    );


    clearTimeout(
      seguimiento.timeout
    );


    clearInterval(
      seguimiento.pollTimer
    );


    if (
      seguimiento.subscriptionId
    ) {

      derivConnection.enviar({
        forget:
          seguimiento.subscriptionId
      });

    }


    return seguimiento;

  }


  finalizarSeguimiento(
    contractId,
    contrato
  ) {

    const seguimiento =
      this.limpiarSeguimiento(
        contractId
      );


    if (!seguimiento) {

      return;

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


  interrumpirSeguimientos(
    motivo
  ) {

    for (
      const contractId
      of Array.from(
        this.seguimientos.keys()
      )
    ) {

      const seguimiento =
        this.limpiarSeguimiento(
          contractId
        );


      if (seguimiento) {

        seguimiento.resolve({
          ok: false,

          error:
            motivo ||
            "Seguimiento interrumpido.",

          contractId
        });

      }

    }

  }


  async consultarUnaVez(
    contractId
  ) {

    return this.solicitar(
      {
        proposal_open_contract:
          1,

        contract_id:
          Number.isFinite(
            Number(
              contractId
            )
          )
            ? Number(
                contractId
              )
            : contractId
      },
      8000
    );

  }


  async esperarResultado(
    contractId,
    {
      timeoutMs = 60000,
      pollMs = 900,
      onUpdate = null
    } = {}
  ) {

    const id =
      String(
        contractId
      );


    if (!id) {

      return {
        ok: false,
        error:
          "Falta contract_id para seguimiento."
      };

    }


    if (
      this.seguimientos.has(
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

          ultimoContrato:
            null,

          consultando:
            false,

          timeout:
            null,

          pollTimer:
            null

        };


        seguimiento.timeout =
          setTimeout(
            () => {

              const ultimo =
                seguimiento.ultimoContrato;


              if (
                ultimo &&
                this.estaCerrado(
                  ultimo
                )
              ) {

                this.finalizarSeguimiento(
                  id,
                  ultimo
                );

                return;

              }


              const limpio =
                this.limpiarSeguimiento(
                  id
                );


              if (limpio) {

                /*
                  Libera la operación para no
                  bloquear el BOT eternamente.
                */
                this.operacionActiva =
                  null;


                limpio.resolve({
                  ok: false,

                  error:
                    "Tiempo de seguimiento agotado. Revise el contrato en Deriv.",

                  contractId:
                    id,

                  ultimoContrato:
                    ultimo
                });

              }

            },
            timeoutMs
          );


        this.seguimientos.set(
          id,
          seguimiento
        );


        /*
          1) SUSCRIPCIÓN EN TIEMPO REAL
        */

        const envioSuscripcion =
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


        /*
          2) RESPALDO POR POLLING
             Cada ~0.9 s hacemos una consulta
             individual. Así seguimos recibiendo
             el cierre aunque el servidor no
             entregue la suscripción como esperamos.
        */

        const polling =
          async () => {

            if (
              !this.seguimientos.has(
                id
              ) ||
              seguimiento.consultando
            ) {

              return;

            }


            seguimiento.consultando =
              true;


            try {

              const respuesta =
                await this.consultarUnaVez(
                  id
                );


              if (
                respuesta.ok &&
                respuesta.datos
                  ?.proposal_open_contract
              ) {

                const contrato =
                  respuesta.datos
                    .proposal_open_contract;


                seguimiento.ultimoContrato =
                  contrato;


                if (
                  typeof onUpdate ===
                    "function"
                ) {

                  try {

                    onUpdate(
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
                    id,
                    contrato
                  );

                }

              }

            } finally {

              seguimiento.consultando =
                false;

            }

          };


        seguimiento.pollTimer =
          setInterval(
            polling,
            pollMs
          );


        /*
          Primera consulta inmediata para
          no esperar al primer intervalo.
        */
        polling();


        if (!envioSuscripcion.ok) {

          /*
            No cancelamos: el polling sigue
            siendo suficiente como respaldo.
          */
          console.warn(
            "No se pudo iniciar suscripción; seguimiento continúa por consultas.",
            envioSuscripcion.mensaje
          );

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
        this.seguimientos.size
    };

  }

}


export const derivTrade =
  new DerivTrade();
