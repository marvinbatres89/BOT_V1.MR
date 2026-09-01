/* ==========================================
   BOT V1 MR
   SIGNAL BRIDGE
   FIX14.2 · BRIDGE RECOVERY + SYNC V3.8.2

   TRADING ANALYZER -> BOT

   RECEPCIÓN:
   1. BroadcastChannel
   2. evento localStorage
   3. comprobación periódica localStorage

   CONSERVA:
   - protección contra duplicados
   - protección contra señales antiguas
   - validación
   - marca de alta precisión
   - targetExecutionAt
   - PREPARAR / EJECUTAR
   - respaldo Android
   - diagnóstico de origen

   CORRIGE:
   - elimina dependencia obligatoria
     de execution-recorder.js
   - el puente puede arrancar aunque
     el registrador no exista
   - compatible con SYNC-V3.8.2
   ========================================== */


const BOT_CHANNEL_NAME =
  "trading-analyzer-bot-v1-mr";


const STORAGE_SIGNAL_KEY =
  "TA_BOT_SIGNAL_V1";


const BRIDGE_VERSION =
  "FIX14.2-BRIDGE-RECOVERY-SYNC-V3.8.2";


/*
  Una señal de trading no debe
  recuperarse indefinidamente.
*/

const MAX_ANTIGUEDAD_SENAL =
  20000;


/*
  Respaldo localStorage.
*/

const INTERVALO_RESPALDO_MS =
  250;



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


    this.temporizadorRespaldo =
      null;


    this.storageHandler =
      null;


    this.iniciarReceptorReal();

  }


  /* ========================================
     RELOJ DE ALTA PRECISIÓN
     ======================================== */

  ahora() {

    if (
      typeof performance !==
        "undefined" &&
      typeof performance.now ===
        "function"
    ) {

      return performance.now();

    }


    return Date.now();

  }


  /* ========================================
     OBTENER TARGET ABSOLUTO
     ======================================== */

  obtenerTargetExecutionAt(
    datos
  ) {

    const directo =
      Number(
        datos?.targetExecutionAt
      );


    if (
      Number.isFinite(
        directo
      ) &&
      directo > 0
    ) {

      return directo;

    }


    const metadata =
      Number(
        datos
          ?.metadata
          ?.targetExecutionAt
      );


    if (
      Number.isFinite(
        metadata
      ) &&
      metadata > 0
    ) {

      return metadata;

    }


    return null;

  }


  /* ========================================
     OBTENER TARGET VISUAL
     ======================================== */

  obtenerTargetVisualAt(
    datos
  ) {

    const directo =
      Number(
        datos?.targetVisualAt
      );


    if (
      Number.isFinite(
        directo
      ) &&
      directo > 0
    ) {

      return directo;

    }


    const metadata =
      Number(
        datos
          ?.metadata
          ?.targetVisualAt
      );


    if (
      Number.isFinite(
        metadata
      ) &&
      metadata > 0
    ) {

      return metadata;

    }


    return null;

  }


  /* ========================================
     OBTENER COUNTDOWN START
     ======================================== */

  obtenerCountdownStartAt(
    datos
  ) {

    const directo =
      Number(
        datos?.countdownStartAt
      );


    if (
      Number.isFinite(
        directo
      ) &&
      directo > 0
    ) {

      return directo;

    }


    const metadata =
      Number(
        datos
          ?.metadata
          ?.countdownStartAt
      );


    if (
      Number.isFinite(
        metadata
      ) &&
      metadata > 0
    ) {

      return metadata;

    }


    return null;

  }


  /* ========================================
     ID DE SEÑAL
     ======================================== */

  obtenerId(
    datos
  ) {

    if (
      datos?.id ===
        undefined ||
      datos?.id ===
        null
    ) {

      return null;

    }


    return String(
      datos.id
    );

  }


  /* ========================================
     OPERACIÓN ID
     ======================================== */

  obtenerOperacionId(
    datos
  ) {

    const valor =
      datos?.operacionId ??
      datos?.metadata?.operacionId ??
      null;


    if (
      valor === null ||
      valor === undefined
    ) {

      return null;

    }


    return String(
      valor
    );

  }


  /* ========================================
     FASE
     ======================================== */

  obtenerFase(
    datos
  ) {

    return String(
      datos?.fase ??
      datos?.metadata?.fase ??
      ""
    )
      .trim()
      .toUpperCase();

  }


  /* ========================================
     PROTOCOLO
     ======================================== */

  obtenerProtocolo(
    datos
  ) {

    return String(
      datos?.protocolo ??
      datos?.metadata?.protocolo ??
      ""
    )
      .trim();

  }


  /* ========================================
     INICIAR RECEPTORES
     ======================================== */

  iniciarReceptorReal() {

    this.iniciarBroadcastChannel();

    this.iniciarStorageListener();

  }


  /* ========================================
     BROADCAST CHANNEL
     ======================================== */

  iniciarBroadcastChannel() {

    if (
      !(
        "BroadcastChannel" in
        window
      )
    ) {

      console.warn(
        `${BRIDGE_VERSION} · BroadcastChannel no disponible.`
      );


      return false;

    }


    /*
      Si ya existe un canal abierto,
      no crear otro.
    */

    if (
      this.channel
    ) {

      return true;

    }


    try {

      this.channel =
        new BroadcastChannel(
          BOT_CHANNEL_NAME
        );


      this.channel.onmessage =
        (
          evento
        ) => {

          const recibidoPerf =
            this.ahora();


          console.log(
            `${BRIDGE_VERSION} · señal detectada por BroadcastChannel`,
            evento.data
          );


          this.recibirSenalExterna(
            evento.data,
            "BroadcastChannel",
            recibidoPerf
          );

        };


      this.channel.onmessageerror =
        (
          evento
        ) => {

          console.error(
            `${BRIDGE_VERSION} · error leyendo BroadcastChannel:`,
            evento
          );


          window.dispatchEvent(
            new CustomEvent(
              "bot:error",
              {
                detail: {
                  mensaje:
                    "Error leyendo el canal de sincronización."
                }
              }
            )
          );

        };


      console.log(
        `${BRIDGE_VERSION} · BroadcastChannel preparado.`,
        BOT_CHANNEL_NAME
      );


      return true;

    }

    catch (
      error
    ) {

      console.error(
        `${BRIDGE_VERSION} · no se pudo iniciar BroadcastChannel:`,
        error
      );


      return false;

    }

  }


  /* ========================================
     EVENTO STORAGE
     ======================================== */

  iniciarStorageListener() {

    if (
      this.storageHandler
    ) {

      return;

    }


    this.storageHandler =
      (
        evento
      ) => {

        if (
          evento.key !==
            STORAGE_SIGNAL_KEY ||
          !evento.newValue
        ) {

          return;

        }


        const recibidoPerf =
          this.ahora();


        try {

          const datos =
            JSON.parse(
              evento.newValue
            );


          console.log(
            `${BRIDGE_VERSION} · señal detectada por evento storage`,
            datos
          );


          this.recibirSenalExterna(
            datos,
            "localStorage-event",
            recibidoPerf
          );

        }

        catch (
          error
        ) {

          console.error(
            `${BRIDGE_VERSION} · error leyendo señal de localStorage:`,
            error
          );

        }

      };


    window.addEventListener(
      "storage",
      this.storageHandler
    );

  }


  /* ========================================
     RESPALDO LOCALSTORAGE
     ======================================== */

  iniciarRespaldoLocalStorage() {

    this.detenerRespaldoLocalStorage();


    this.temporizadorRespaldo =
      setInterval(
        () => {

          if (
            !this.conectado
          ) {

            return;

          }


          try {

            const guardada =
              localStorage.getItem(
                STORAGE_SIGNAL_KEY
              );


            if (
              !guardada
            ) {

              return;

            }


            const datos =
              JSON.parse(
                guardada
              );


            const id =
              this.obtenerId(
                datos
              );


            if (
              id &&
              id ===
                String(
                  this.ultimoIdRecibido
                )
            ) {

              return;

            }


            if (
              !this.esSenalReciente(
                datos
              )
            ) {

              return;

            }


            const recibidoPerf =
              this.ahora();


            console.log(
              `${BRIDGE_VERSION} · señal recuperada por respaldo localStorage`,
              datos
            );


            this.recibirSenalExterna(
              datos,
              "localStorage-poll",
              recibidoPerf
            );

          }

          catch (
            error
          ) {

            console.warn(
              `${BRIDGE_VERSION} · error comprobando respaldo localStorage:`,
              error
            );

          }

        },
        INTERVALO_RESPALDO_MS
      );

  }


  detenerRespaldoLocalStorage() {

    if (
      this.temporizadorRespaldo
    ) {

      clearInterval(
        this.temporizadorRespaldo
      );

    }


    this.temporizadorRespaldo =
      null;

  }


  /* ========================================
     CONECTAR BOT
     ======================================== */

  conectar() {

    try {

      /*
        Por seguridad, reabrir canal si fue
        cerrado anteriormente.
      */

      if (
        !this.channel
      ) {

        this.iniciarBroadcastChannel();

      }


      this.conectado =
        true;


      this.iniciarRespaldoLocalStorage();


      console.log(
        `${BRIDGE_VERSION} · puente conectado`,
        {
          canal:
            BOT_CHANNEL_NAME,

          storage:
            STORAGE_SIGNAL_KEY,

          broadcastDisponible:
            Boolean(
              this.channel
            )
        }
      );


      /*
        IMPORTANTE:
        Despachar el evento aunque no exista
        todavía una señal del Analyzer.
      */

      window.dispatchEvent(
        new CustomEvent(
          "bot:estado",
          {
            detail: {

              conectado:
                true,

              mensaje:
                "BOT SYNC",

              version:
                BRIDGE_VERSION,

              canal:
                BOT_CHANNEL_NAME,

              storageKey:
                STORAGE_SIGNAL_KEY,

              canalDisponible:
                Boolean(
                  this.channel
                )

            }
          }
        )
      );


      /*
        Al conectar, comprobar inmediatamente
        si existe una señal reciente.
      */

      this.recuperarUltimaSenal();


      return true;

    }

    catch (
      error
    ) {

      this.conectado =
        false;


      console.error(
        `${BRIDGE_VERSION} · error conectando puente:`,
        error
      );


      window.dispatchEvent(
        new CustomEvent(
          "bot:error",
          {
            detail: {

              mensaje:
                `No se pudo conectar el puente: ${
                  error?.message ||
                  String(
                    error
                  )
                }`

            }
          }
        )
      );


      return false;

    }

  }


  /* ========================================
     RECUPERAR ÚLTIMA SEÑAL
     ======================================== */

  recuperarUltimaSenal() {

    try {

      const guardada =
        localStorage.getItem(
          STORAGE_SIGNAL_KEY
        );


      if (
        !guardada
      ) {

        return false;

      }


      const datos =
        JSON.parse(
          guardada
        );


      if (
        !this.esSenalReciente(
          datos
        )
      ) {

        return false;

      }


      const id =
        this.obtenerId(
          datos
        );


      if (
        id &&
        id ===
          String(
            this.ultimoIdRecibido
          )
      ) {

        return false;

      }


      setTimeout(
        () => {

          if (
            !this.conectado
          ) {

            return;

          }


          const recibidoPerf =
            this.ahora();


          this.recibirSenalExterna(
            datos,
            "localStorage-recuperada",
            recibidoPerf
          );

        },
        100
      );


      return true;

    }

    catch (
      error
    ) {

      console.warn(
        `${BRIDGE_VERSION} · no se pudo recuperar la última señal:`,
        error
      );


      return false;

    }

  }


  /* ========================================
     DESCONECTAR BOT
     ======================================== */

  desconectar() {

    this.conectado =
      false;


    this.detenerRespaldoLocalStorage();


    window.dispatchEvent(
      new CustomEvent(
        "bot:estado",
        {
          detail: {

            conectado:
              false,

            mensaje:
              "BOT OFF",

            version:
              BRIDGE_VERSION

          }
        }
      )
    );


    console.log(
      `${BRIDGE_VERSION} · puente desconectado`
    );


    return true;

  }


  /* ========================================
     VALIDAR ANTIGÜEDAD
     ======================================== */

  esSenalReciente(
    datos
  ) {

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


    /*
      Permitimos un pequeño margen futuro
      por diferencias mínimas de reloj.
    */

    return (
      antiguedad >= -2000 &&
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
      !senal ||
      typeof senal !==
        "object"
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


    /*
      PREPARAR puede funcionar sin TARGET.

      EJECUTAR sí puede traer TARGET absoluto.
    */

    if (
      senal.targetExecutionAt !==
        null &&
      senal.targetExecutionAt !==
        undefined
    ) {

      const target =
        Number(
          senal.targetExecutionAt
        );


      if (
        !Number.isFinite(
          target
        ) ||
        target <= 0
      ) {

        return false;

      }

    }


    return true;

  }


  /* ========================================
     DUPLICADOS
     ======================================== */

  esDuplicada(
    datos
  ) {

    const id =
      this.obtenerId(
        datos
      );


    if (
      !id
    ) {

      return false;

    }


    return (
      id ===
      String(
        this.ultimoIdRecibido
      )
    );

  }


  /* ========================================
     RECIBIR SEÑAL EXTERNA
     ======================================== */

  recibirSenalExterna(
    datos,
    origen = "desconocido",
    recibidoPerf = null
  ) {

    if (
      !this.conectado
    ) {

      console.log(
        `${BRIDGE_VERSION} · señal detectada por ${origen}, pero BOT desconectado.`
      );


      return false;

    }


    if (
      !datos ||
      typeof datos !==
        "object"
    ) {

      console.warn(
        `${BRIDGE_VERSION} · señal ignorada: formato inválido.`
      );


      return false;

    }


    if (
      !this.esSenalReciente(
        datos
      )
    ) {

      console.warn(
        `${BRIDGE_VERSION} · señal antigua ignorada.`,
        {
          origen,

          id:
            datos?.id,

          timestamp:
            datos?.timestamp
        }
      );


      return false;

    }


    if (
      this.esDuplicada(
        datos
      )
    ) {

      /*
        Es normal recibir la misma señal
        por varias rutas.
      */

      return false;

    }


    const resultado =
      this.recibirSenal(
        datos,
        recibidoPerf
      );


    if (
      resultado
    ) {

      const id =
        this.obtenerId(
          datos
        );


      if (
        id
      ) {

        this.ultimoIdRecibido =
          id;

      }


      window.dispatchEvent(
        new CustomEvent(
          "bot:signal-source",
          {
            detail: {

              origen,

              recibidoPerf,

              id:
                datos?.id ??
                null,

              operacionId:
                this.obtenerOperacionId(
                  datos
                ),

              fase:
                this.obtenerFase(
                  datos
                ),

              protocolo:
                this.obtenerProtocolo(
                  datos
                ),

              mercado:
                datos?.mercado ??
                null,

              estrategia:
                datos?.estrategia ??
                null,

              direccion:
                datos?.direccion ??
                null,

              targetExecutionAt:
                this.obtenerTargetExecutionAt(
                  datos
                ),

              targetVisualAt:
                this.obtenerTargetVisualAt(
                  datos
                ),

              countdownStartAt:
                this.obtenerCountdownStartAt(
                  datos
                )

            }
          }
        )
      );


      console.log(
        `${BRIDGE_VERSION} · señal aceptada por el puente`,
        {
          origen,

          id:
            datos?.id,

          operacionId:
            this.obtenerOperacionId(
              datos
            ),

          fase:
            this.obtenerFase(
              datos
            ),

          protocolo:
            this.obtenerProtocolo(
              datos
            ),

          mercado:
            datos?.mercado,

          direccion:
            datos?.direccion,

          targetExecutionAt:
            this.obtenerTargetExecutionAt(
              datos
            )
        }
      );

    }


    return resultado;

  }


  /* ========================================
     NORMALIZAR Y ENTREGAR SEÑAL
     ======================================== */

  recibirSenal(
    datos,
    recibidoPerf = null
  ) {

    if (
      !datos ||
      typeof datos !==
        "object"
    ) {

      return false;

    }


    const marcaPuente =
      Number.isFinite(
        Number(
          recibidoPerf
        )
      )
        ? Number(
            recibidoPerf
          )
        : this.ahora();


    const targetExecutionAt =
      this.obtenerTargetExecutionAt(
        datos
      );


    const targetVisualAt =
      this.obtenerTargetVisualAt(
        datos
      );


    const countdownStartAt =
      this.obtenerCountdownStartAt(
        datos
      );


    const metadata =
      datos.metadata &&
      typeof datos.metadata ===
        "object"
        ? {
            ...datos.metadata
          }
        : {};


    /*
      Mantener las referencias absolutas
      tanto arriba como dentro de metadata.
    */

    if (
      targetExecutionAt !==
        null
    ) {

      metadata.targetExecutionAt =
        targetExecutionAt;

    }


    if (
      targetVisualAt !==
        null
    ) {

      metadata.targetVisualAt =
        targetVisualAt;

    }


    if (
      countdownStartAt !==
        null
    ) {

      metadata.countdownStartAt =
        countdownStartAt;

    }


    const fase =
      this.obtenerFase(
        datos
      );


    const protocolo =
      this.obtenerProtocolo(
        datos
      );


    const operacionId =
      this.obtenerOperacionId(
        datos
      );


    if (
      fase
    ) {

      metadata.fase =
        fase;

    }


    if (
      protocolo
    ) {

      metadata.protocolo =
        protocolo;

    }


    if (
      operacionId
    ) {

      metadata.operacionId =
        operacionId;

    }


    const confianzaBase =
      datos.visibleScore ??
      datos.confianza;


    const confianza =
      Number(
        confianzaBase
      );


    const senal = {

      id:
        datos.id ??
        `${Date.now()}-${Math.random()}`,

      operacionId:
        operacionId,

      fase:
        fase ||
        null,

      protocolo:
        protocolo ||
        null,

      mercado:
        String(
          datos.mercado ||
          ""
        )
          .trim()
          .toUpperCase(),

      estrategia:
        datos.estrategia,

      direccion:
        datos.direccion,

      /*
        SYNC 1:1:
        si Analyzer envía visibleScore,
        ese valor manda.
      */

      confianza:
        confianza,

      visibleScore:
        Number.isFinite(
          Number(
            datos.visibleScore
          )
        )
          ? Number(
              datos.visibleScore
            )
          : confianza,

      rawScore:
        Number.isFinite(
          Number(
            datos.rawScore
          )
        )
          ? Number(
              datos.rawScore
            )
          : Number.isFinite(
              Number(
                datos.metadata?.rawScore
              )
            )
            ? Number(
                datos.metadata.rawScore
              )
            : null,

      qualityScore:
        Number.isFinite(
          Number(
            datos.qualityScore
          )
        )
          ? Number(
              datos.qualityScore
            )
          : null,

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

      countdownStartAt:
        countdownStartAt,

      targetExecutionAt:
        targetExecutionAt,

      targetVisualAt:
        targetVisualAt,

      metadata:
        metadata,

      timestamp:
        datos.timestamp ??
        Date.now(),

      /*
        Marca de entrada al puente.
      */

      bridgeReceivedPerf:
        marcaPuente

    };


    if (
      !this.validarSenal(
        senal
      )
    ) {

      console.error(
        `${BRIDGE_VERSION} · señal rechazada`,
        senal
      );


      window.dispatchEvent(
        new CustomEvent(
          "bot:error",
          {
            detail: {

              mensaje:
                "Señal rechazada: datos inválidos."

            }
          }
        )
      );


      return false;

    }


    this.ultimaSenal =
      senal;


    /*
      IMPORTANTE:

      En esta versión NO existe
      dependencia obligatoria de
      execution-recorder.js.

      El puente entrega directamente
      la señal al BOT.
    */


    for (
      const callback
      of this.listeners
    ) {

      try {

        callback(
          senal
        );

      }

      catch (
        error
      ) {

        console.error(
          `${BRIDGE_VERSION} · error entregando señal al BOT:`,
          error
        );

      }

    }


    /*
      Evento adicional para diagnóstico.
    */

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


  obtenerEstado() {

    return {

      version:
        BRIDGE_VERSION,

      conectado:
        this.conectado,

      canalDisponible:
        Boolean(
          this.channel
        ),

      canal:
        BOT_CHANNEL_NAME,

      storageKey:
        STORAGE_SIGNAL_KEY,

      ultimaSenal:
        this.ultimaSenal,

      ultimoIdRecibido:
        this.ultimoIdRecibido,

      respaldoActivo:
        Boolean(
          this.temporizadorRespaldo
        )

    };

  }


  /* ========================================
     CERRAR COMPLETAMENTE
     ======================================== */

  destruir() {

    this.detenerRespaldoLocalStorage();


    if (
      this.storageHandler
    ) {

      try {

        window.removeEventListener(
          "storage",
          this.storageHandler
        );

      }

      catch {}

    }


    this.storageHandler =
      null;


    try {

      this.channel
        ?.close();

    }

    catch {}


    this.channel =
      null;


    this.conectado =
      false;


    console.log(
      `${BRIDGE_VERSION} · puente destruido`
    );

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const signalBridge =
  new SignalBridge();
