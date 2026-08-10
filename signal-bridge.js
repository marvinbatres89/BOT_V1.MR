/* ==========================================
   BOT V1 MR
   PUENTE DE SINCRONIZACIÓN REAL
   Trading Analyzer -> BOT
   ========================================== */

const BOT_CHANNEL_NAME =
  "trading-analyzer-bot-v1-mr";

const STORAGE_SIGNAL_KEY =
  "TA_BOT_SIGNAL_V1";

const MAX_SIGNAL_AGE_MS =
  15000;


class SignalBridge {

  constructor() {

    this.ultimaSenal = null;
    this.conectado = false;

    this.listeners =
      new Set();

    this.channel = null;

    this.ultimoIdRecibido =
      null;

    this.iniciarReceptorReal();

  }


  iniciarReceptorReal() {

    if (
      "BroadcastChannel" in window
    ) {

      try {

        this.channel =
          new BroadcastChannel(
            BOT_CHANNEL_NAME
          );


        this.channel.onmessage =
          (evento) => {

            this.recibirSenalExterna(
              evento.data,
              "BroadcastChannel"
            );

          };

      } catch (error) {

        console.error(
          "No se pudo iniciar BroadcastChannel:",
          error
        );

      }

    }


    window.addEventListener(
      "storage",
      (evento) => {

        if (
          evento.key !==
            STORAGE_SIGNAL_KEY ||
          !evento.newValue
        ) {

          return;

        }


        try {

          const datos =
            JSON.parse(
              evento.newValue
            );


          this.recibirSenalExterna(
            datos,
            "localStorage"
          );

        } catch (error) {

          console.error(
            "Error leyendo señal localStorage:",
            error
          );

        }

      }
    );

  }


  conectar() {

    this.conectado =
      true;


    /*
      Si Android pausó la pestaña,
      recuperamos únicamente una señal
      muy reciente guardada por el Analyzer.
    */

    try {

      const guardada =
        localStorage.getItem(
          STORAGE_SIGNAL_KEY
        );


      if (guardada) {

        const datos =
          JSON.parse(
            guardada
          );


        const antiguedad =
          Date.now() -
          Number(
            datos.timestamp || 0
          );


        if (
          antiguedad >= 0 &&
          antiguedad <=
            MAX_SIGNAL_AGE_MS
        ) {

          setTimeout(
            () => {

              this.recibirSenalExterna(
                datos,
                "localStorage-recuperada"
              );

            },
            150
          );

        }

      }

    } catch (error) {

      console.error(
        "No se pudo recuperar la última señal:",
        error
      );

    }


    window.dispatchEvent(
      new CustomEvent(
        "bot:estado",
        {
          detail: {
            conectado:
              true,

            mensaje:
              "BOT V1 MR escuchando Trading Analyzer"
          }
        }
      )
    );


    return true;

  }


  desconectar() {

    this.conectado =
      false;


    window.dispatchEvent(
      new CustomEvent(
        "bot:estado",
        {
          detail: {
            conectado:
              false,

            mensaje:
              "BOT desconectado"
          }
        }
      )
    );

  }


  validarSenal(
    senal
  ) {

    if (
      !senal ||
      !senal.mercado ||
      !senal.estrategia ||
      !senal.direccion
    ) {

      return false;

    }


    const confianza =
      Number(
        senal.confianza
      );


    return (
      Number.isFinite(
        confianza
      ) &&
      confianza >= 0 &&
      confianza <= 100
    );

  }


  recibirSenalExterna(
    datos,
    origen = "desconocido"
  ) {

    if (
      !this.conectado
    ) {

      console.log(
        "Señal recibida pero BOT desconectado."
      );

      return false;

    }


    if (
      datos?.id &&
      datos.id ===
        this.ultimoIdRecibido
    ) {

      console.log(
        "Señal duplicada ignorada."
      );

      return false;

    }


    const resultado =
      this.recibirSenal(
        datos
      );


    if (
      resultado
    ) {

      this.ultimoIdRecibido =
        datos.id ??
        null;


      window.dispatchEvent(
        new CustomEvent(
          "bot:signal-source",
          {
            detail: {
              origen
            }
          }
        )
      );

    }


    return resultado;

  }


  recibirSenal(
    datos = {}
  ) {

    const senal = {

      id:
        datos.id ??
        Date.now(),

      mercado:
        datos.mercado,

      estrategia:
        datos.estrategia,

      direccion:
        datos.direccion,

      confianza:
        Number(
          datos.confianza
        ),

      precio:
        datos.precio != null
          ? Number(
              datos.precio
            )
          : null,

      ultimoDigito:
        datos.ultimoDigito != null
          ? Number(
              datos.ultimoDigito
            )
          : null,

      tendencia:
        datos.tendencia ??
        null,

      rsi:
        datos.rsi != null
          ? Number(
              datos.rsi
            )
          : null,

      momentum:
        datos.momentum ??
        null,

      volatilidad:
        datos.volatilidad ??
        null,

      segundosEntrada:
        datos.segundosEntrada != null
          ? Number(
              datos.segundosEntrada
            )
          : null,

      modo:
        datos.modo ??
        null,

      /*
        Se conserva metadata para
        OVER/UNDER y MATCH cuando
        Trading Analyzer la envíe.
      */
      metadata:
        (
          datos.metadata &&
          typeof datos.metadata ===
            "object"
        )
          ? {
              ...datos.metadata
            }
          : {},

      origen:
        datos.origen ??
        null,

      timestamp:
        datos.timestamp ??
        Date.now()

    };


    if (
      !this.validarSenal(
        senal
      )
    ) {

      window.dispatchEvent(
        new CustomEvent(
          "bot:error",
          {
            detail: {
              mensaje:
                "Señal rechazada: datos inválidos"
            }
          }
        )
      );

      return false;

    }


    this.ultimaSenal =
      senal;


    for (
      const callback
      of this.listeners
    ) {

      try {

        callback(
          senal
        );

      } catch (error) {

        console.error(
          "Error enviando señal al bot:",
          error
        );

      }

    }


    window.dispatchEvent(
      new CustomEvent(
        "trading-analyzer:signal",
        {
          detail:
            senal
        }
      )
    );


    return true;

  }


  onSenal(
    callback
  ) {

    if (
      typeof callback ===
      "function"
    ) {

      this.listeners.add(
        callback
      );

    }


    return () => {

      this.listeners.delete(
        callback
      );

    };

  }


  obtenerUltimaSenal() {

    return this.ultimaSenal;

  }


  estaConectado() {

    return this.conectado;

  }

}


export const signalBridge =
  new SignalBridge();
