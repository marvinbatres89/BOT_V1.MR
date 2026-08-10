/* ==========================================
   BOT V1 MR
   DERIV TRADE V4 - SOLO DEMO

   BUY + SEGUIMIENTO FINAL ROBUSTO

   Seguimiento combinado:
   1) proposal_open_contract suscrito
   2) proposal_open_contract por consulta
   3) profit_table como verificación de cierre

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

    this.reqId +=
      1;

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
      RESPUESTAS A PETICIONES INDIVIDUALES
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

    }


    /*
      ACTUALIZACIÓN DE CONTRATO ABIERTO

      No dependemos de msg_type.
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


    this.notificarActualizacion(
      seguimiento,
      contrato
    );


    if (
      this.estaCerrado(
        contrato
      )
    ) {

      this.finalizarDesdeContrato(
        contractId,
        contrato
      );

    }

  }


  notificarActualizacion(
    seguimiento,
    contrato
  ) {

    if (
      typeof seguimiento?.onUpdate ===
        "function"
    ) {

      try {

        seguimiento.onUpdate(
          contrato
        );

      } catch {}

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


  normalizarResultadoContrato(
    contrato
  ) {

    const buyPrice =
      Number(
        contrato?.buy_price ??
        this.operacionActiva?.buyPrice ??
        0
      );


    const profit =
      Number(
        contrato?.profit ??
        0
      );


    const sellPrice =
      Number(
        contrato?.sell_price ??
        (
          Number.isFinite(
            buyPrice + profit
          )
            ? buyPrice + profit
            : 0
        )
      );


    let estado =
      String(
        contrato?.status ??
        ""
      )
        .trim()
        .toUpperCase();


    if (
      ![
        "WON",
        "LOST"
      ].includes(
        estado
      )
    ) {

      estado =
        profit > 0
          ? "WON"
          : "LOST";

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
          sellPrice
        ),

      source:
        "proposal_open_contract",

      raw:
        contrato
    };

  }


  normalizarResultadoProfitTable(
    transaccion
  ) {

    const buyPrice =
      Math.abs(
        Number(
          transaccion?.buy_price ??
          transaccion?.amount ??
          this.operacionActiva?.buyPrice ??
          0
        )
      );


    const sellPrice =
      Number(
        transaccion?.sell_price ??
        transaccion?.payout ??
        0
      );


    let profit =
      Number(
        transaccion?.profit ??
        NaN
      );


    if (
      !Number.isFinite(
        profit
      )
    ) {

      profit =
        sellPrice -
        buyPrice;

    }


    return {

      contractId:
        String(
          transaccion?.contract_id ??
          this.operacionActiva?.contractId ??
          ""
        ),

      status:
        profit > 0
          ? "WON"
          : "LOST",

      profit,

      buyPrice,

      sellPrice,

      payout:
        sellPrice,

      source:
        "profit_table",

      raw:
        transaccion
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
      seguimiento.openPollTimer
    );


    clearInterval(
      seguimiento.profitPollTimer
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


  finalizar(
    contractId,
    resultado
  ) {

    const seguimiento =
      this.limpiarSeguimiento(
        contractId
      );


    if (!seguimiento) {

      return;

    }


    this.ultimoResultado =
      resultado;


    this.operacionActiva =
      null;


    seguimiento.resolve({
      ok: true,
      resultado
    });

  }


  finalizarDesdeContrato(
    contractId,
    contrato
  ) {

    const resultado =
      this.normalizarResultadoContrato(
        contrato
      );


    this.finalizar(
      contractId,
      resultado
    );

  }


  finalizarDesdeProfitTable(
    contractId,
    transaccion
  ) {

    const resultado =
      this.normalizarResultadoProfitTable(
        transaccion
      );


    this.finalizar(
      contractId,
      resultado
    );

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


    this.operacionActiva =
      null;

  }


  async consultarContrato(
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
      7000
    );

  }


  extraerProfitTable(
    datos
  ) {

    if (
      Array.isArray(
        datos?.profit_table?.transactions
      )
    ) {

      return datos.profit_table.transactions;

    }


    if (
      Array.isArray(
        datos?.profit_table
      )
    ) {

      return datos.profit_table;

    }


    return [];

  }


  async consultarProfitTable(
    contractId
  ) {

    /*
      profit_table contiene contratos
      ya cerrados. Lo usamos como tercera
      fuente para confirmar el resultado
      cuando proposal_open_contract queda
      reportando OPEN.
    */

    const respuesta =
      await this.solicitar(
        {
          profit_table:
            1,

          description:
            1,

          limit:
            25,

          sort:
            "DESC"
        },
        7000
      );


    if (!respuesta.ok) {

      return respuesta;

    }


    const lista =
      this.extraerProfitTable(
        respuesta.datos
      );


    const buscado =
      String(
        contractId
      );


    const encontrada =
      lista.find(
        (item) =>
          String(
            item?.contract_id ??
            ""
          ) === buscado
      );


    return {
      ok: true,

      encontrada:
        encontrada ??
        null
    };

  }


  async esperarResultado(
    contractId,
    {
      timeoutMs = 90000,
      openPollMs = 1200,
      profitPollMs = 1800,
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

          consultandoOpen:
            false,

          consultandoProfit:
            false,

          timeout:
            null,

          openPollTimer:
            null,

          profitPollTimer:
            null

        };


        seguimiento.timeout =
          setTimeout(
            () => {

              const limpio =
                this.limpiarSeguimiento(
                  id
                );


              if (limpio) {

                /*
                  FIX4:
                  Liberamos el bloqueo para que
                  el BOT no quede atrapado para
                  siempre si la API no entrega
                  un cierre.
                */
                this.operacionActiva =
                  null;


                limpio.resolve({
                  ok: false,

                  error:
                    "No se pudo confirmar el cierre dentro del tiempo de seguridad.",

                  contractId:
                    id,

                  ultimoContrato:
                    limpio.ultimoContrato
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
          1) SUSCRIPCIÓN
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


        if (!envioSuscripcion.ok) {

          console.warn(
            "Suscripción proposal_open_contract no disponible; continúan las consultas de respaldo.",
            envioSuscripcion.mensaje
          );

        }


        /*
          2) CONSULTA DE CONTRATO ABIERTO
        */

        const consultarOpen =
          async () => {

            if (
              !this.seguimientos.has(
                id
              ) ||
              seguimiento.consultandoOpen
            ) {

              return;

            }


            seguimiento.consultandoOpen =
              true;


            try {

              const respuesta =
                await this.consultarContrato(
                  id
                );


              const contrato =
                respuesta.ok
                  ? respuesta.datos
                      ?.proposal_open_contract
                  : null;


              if (contrato) {

                seguimiento.ultimoContrato =
                  contrato;


                this.notificarActualizacion(
                  seguimiento,
                  contrato
                );


                if (
                  this.estaCerrado(
                    contrato
                  )
                ) {

                  this.finalizarDesdeContrato(
                    id,
                    contrato
                  );

                }

              }

            } finally {

              seguimiento.consultandoOpen =
                false;

            }

          };


        /*
          3) PROFIT TABLE:
             cuando el contrato ya salió de
             posiciones abiertas, debe aparecer
             aquí como operación cerrada.
        */

        const consultarProfit =
          async () => {

            if (
              !this.seguimientos.has(
                id
              ) ||
              seguimiento.consultandoProfit
            ) {

              return;

            }


            seguimiento.consultandoProfit =
              true;


            try {

              const respuesta =
                await this.consultarProfitTable(
                  id
                );


              if (
                respuesta.ok &&
                respuesta.encontrada
              ) {

                this.finalizarDesdeProfitTable(
                  id,
                  respuesta.encontrada
                );

              }

            } finally {

              seguimiento.consultandoProfit =
                false;

            }

          };


        seguimiento.openPollTimer =
          setInterval(
            consultarOpen,
            openPollMs
          );


        seguimiento.profitPollTimer =
          setInterval(
            consultarProfit,
            profitPollMs
          );


        /*
          Primeras consultas inmediatas.
        */
        consultarOpen();


        setTimeout(
          () => {

            consultarProfit();

          },
          1200
        );

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
