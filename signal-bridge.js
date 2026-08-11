/* ==========================================
   BOT V1 MR
   PUENTE DE SINCRONIZACIÓN REAL
   FIX6

   TRADING ANALYZER -> BOT

   RECEPCIÓN:
   - BroadcastChannel
   - localStorage

   PROTECCIÓN:
   - Señales duplicadas
   - Señales antiguas
   - Datos inválidos
   ========================================== */

const BOT_CHANNEL_NAME =
  "trading-analyzer-bot-v1-mr";

const STORAGE_SIGNAL_KEY =
  "TA_BOT_SIGNAL_V1";

const MAX_ANTIGUEDAD_SENAL =
  15000;


class SignalBridge {

  constructor() {

    this.ultimaSenal =
      null;

    this.conectado =
      false;

    this.listeners =
      new Set();

    this.channel =
      null;

    this.ultimoIdRecibido =
      null;


    this.iniciarReceptorReal();

  }


  /* ========================================
     INICIAR RECEPTOR
     ======================================== */

  iniciarReceptorReal() {

    /* --------------------------------------
       BROADCAST CHANNEL
       -------------------------------------- */

    if (
      "BroadcastChannel" in
      window
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


    /* --------------------------------------
       LOCAL STORAGE
       -------------------------------------- */

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


  /* ========================================
     CONECTAR BOT
     ======================================== */

  conectar() {

    this.conectado =
      true;


    /*
      Recuperar una señal guardada
      solamente cuando todavía es reciente.
    */

    try {

      const guardada =
        localStorage.getItem(
          STORAGE_SIGNAL_KEY
        );


      if (
        guardada
      ) {

        const datos =
          JSON.parse(
            guardada
          );


        const timestamp =
          Number(
            datos?.timestamp ??
            0
          );


        const antiguedad =
          Date.now() -
          timestamp;


        if (
          timestamp > 0 &&
          antiguedad >= 0 &&
          antiguedad <=
            MAX_ANTIGUEDAD_SENAL
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


  /* ========================================
     DESCONECTAR
     ======================================== */

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


    return true;

  }


  /* ========================================
     VALIDAR ANTIGÜEDAD
     ======================================== */

  esSenalReciente(
    datos
  ) {

    /*
      Las señales internas de prueba pueden
      no traer timestamp inicialmente.
    */

    if (
      datos?.timestamp ===
        undefined ||
      datos?.timestamp ===
        null
    ) {

      return true;

    }


    const timestamp =
      Number(
        datos.timestamp
      );


    if (
      !Number.isFinite(
        timestamp
      ) ||
      timestamp <= 0
    ) {

      return false;

    }


    const antiguedad =
      Date.now() -
      timestamp;


    return (
      antiguedad >= 0 &&
      antiguedad <=
        MAX_ANTIGUEDAD_SENAL
    );

  }


  /* ========================================
     VALIDAR SEÑAL
     ======================================== */

  validarSenal(
    senal
  ) {

    if (
      !senal
    ) {

      return false;

    }


    if (
      !senal.mercado
    ) {

      return false;

    }


    if (
      !senal.estrategia
    ) {

      return false;

    }


    if (
      !senal.direccion
    ) {

      return false;

    }


    const confianza =
      Number(
        senal.confianza
      );


    if (
      !Number.isFinite(
        confianza
      )
    ) {

      return false;

    }


    if (
      confianza < 0 ||
      confianza > 100
    ) {

      return false;

    }


    return true;

  }


  /* ========================================
     RECIBIR SEÑAL EXTERNA
     ======================================== */

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
      !this.esSenalReciente(
        datos
      )
    ) {

      console.warn(
        "Señal antigua ignorada."
      );

      return false;

    }


    if (
      datos?.id !==
        undefined &&
      datos?.id !==
        null &&
      String(
        datos.id
      ) ===
        String(
          this.ultimoIdRecibido
        )
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

      if (
        datos?.id !==
          undefined &&
        datos?.id !==
          null
      ) {

        this.ultimoIdRecibido =
          datos.id;

      }


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


  /* ========================================
     RECIBIR SEÑAL
     ======================================== */

  recibirSenal(
    datos
  ) {

    if (
      !datos ||
      typeof datos !==
        "object"
    ) {

      return false;

    }


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
        datos.precio !==
          null &&
        datos.precio !==
          undefined
          ? Number(
              datos.precio
            )
          : null,

      ultimoDigito:
        datos.ultimoDigito !==
          null &&
        datos.ultimoDigito !==
          undefined
          ? Number(
              datos.ultimoDigito
            )
          : null,

      tendencia:
        datos.tendencia ??
        null,

      rsi:
        datos.rsi !==
          null &&
        datos.rsi !==
          undefined
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
        datos.segundosEntrada !==
          null &&
        datos.segundosEntrada !==
          undefined
          ? Number(
              datos.segundosEntrada
            )
          : null,

      modo:
        datos.modo ??
        null,

      origen:
        datos.origen ??
        null,

      metadata:
        datos.metadata &&
        typeof datos.metadata ===
          "object"
          ? {
              ...datos.metadata
            }
          : {},

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


  /* ========================================
     ESCUCHAR SEÑALES
     ======================================== */

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


  /* ========================================
     ÚLTIMA SEÑAL
     ======================================== */

  obtenerUltimaSenal() {

    return this.ultimaSenal;

  }


  /* ========================================
     ESTADO
     ======================================== */

  estaConectado() {

    return this.conectado;

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const signalBridge =
  new SignalBridge();
