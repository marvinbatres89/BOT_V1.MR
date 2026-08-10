/* ==========================================
   BOT V1 MR
   DERIV CONNECTION
   CUENTA DEMO
   V2 - CONEXIÓN MÁS ESTABLE
   ========================================== */

class DerivConnection {

  constructor() {

    this.socket = null;

    this.connected = false;
    this.connecting = false;

    this.accountId = null;
    this.appId = null;

    this.wsUrl = null;

    this.cierreManual = false;

    this.intentosReconexion = 0;
    this.maxIntentosReconexion = 3;

    this.temporizadorReconexion = null;

    this.listeners = {
      state: new Set(),
      message: new Set(),
      error: new Set()
    };

  }


  /* ========================================
     EVENTOS
     ======================================== */

  on(tipo, callback) {

    if (
      this.listeners[tipo] &&
      typeof callback === "function"
    ) {

      this.listeners[tipo].add(callback);

    }

    return () => {

      this.listeners[tipo]?.delete(callback);

    };

  }


  emitir(tipo, datos) {

    this.listeners[tipo]?.forEach(
      (callback) => {

        try {

          callback(datos);

        } catch (error) {

          console.error(
            "Error en listener Deriv:",
            error
          );

        }

      }
    );

  }


  /* ========================================
     ESTADO
     ======================================== */

  cambiarEstado(
    estado,
    mensaje
  ) {

    this.connected =
      estado === "connected";

    this.connecting =
      estado === "connecting";


    this.emitir(
      "state",
      {
        estado,
        mensaje,
        accountId: this.accountId,
        appId: this.appId
      }
    );

  }


  /* ========================================
     OBTENER URL WEBSOCKET AUTENTICADA
     ======================================== */

  async obtenerWebSocketUrl({
    token,
    accountId,
    appId
  }) {

    if (!token) {

      throw new Error(
        "Falta el token PAT."
      );

    }


    if (!accountId) {

      throw new Error(
        "Falta el ID de cuenta DEMO."
      );

    }


    if (!appId) {

      throw new Error(
        "Falta el Deriv App ID."
      );

    }


    const url =
      `https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`;


    const respuesta =
      await fetch(
        url,
        {
          method: "POST",

          headers: {

            "Authorization":
              `Bearer ${token}`,

            "Deriv-App-ID":
              String(appId),

            "Content-Type":
              "application/json"

          }
        }
      );


    let datos = null;


    try {

      datos =
        await respuesta.json();

    } catch {

      throw new Error(
        "Deriv devolvió una respuesta no válida."
      );

    }


    if (!respuesta.ok) {

      const mensaje =
        datos?.errors?.[0]?.message ||
        datos?.error?.message ||
        datos?.message ||
        `Error HTTP ${respuesta.status}`;


      throw new Error(
        mensaje
      );

    }


    const wsUrl =
      datos?.data?.url;


    if (!wsUrl) {

      throw new Error(
        "Deriv no devolvió la URL WebSocket."
      );

    }


    return wsUrl;

  }


  /* ========================================
     ABRIR WEBSOCKET
     ======================================== */

  abrirWebSocket(wsUrl) {

    return new Promise(
      (resolve, reject) => {

        let terminado = false;


        try {

          this.socket =
            new WebSocket(wsUrl);


          const timeout =
            setTimeout(
              () => {

                if (terminado) {
                  return;
                }

                terminado = true;


                try {

                  this.socket?.close();

                } catch {}


                reject(
                  new Error(
                    "Tiempo de conexión con Deriv agotado."
                  )
                );

              },
              15000
            );


          this.socket.onopen =
            () => {

              if (terminado) {
                return;
              }


              terminado = true;

              clearTimeout(timeout);


              this.connected = true;
              this.connecting = false;

              this.intentosReconexion = 0;


              this.cambiarEstado(
                "connected",
                "Cuenta DEMO conectada con Deriv."
              );


              resolve({
                ok: true
              });

            };


          this.socket.onmessage =
            (evento) => {

              let datos = null;


              try {

                datos =
                  JSON.parse(
                    evento.data
                  );

              } catch {

                datos =
                  evento.data;

              }


              this.emitir(
                "message",
                datos
              );

            };


          this.socket.onerror =
            () => {

              this.emitir(
                "error",
                {
                  mensaje:
                    "Error temporal en WebSocket de Deriv."
                }
              );


              /*
                No rechazamos inmediatamente.

                Algunos navegadores móviles pueden
                lanzar onerror justo antes de onclose.

                Dejamos que onclose determine
                el estado final.
              */

            };


          this.socket.onclose =
            (evento) => {

              clearTimeout(timeout);


              const estabaConectado =
                this.connected;


              this.socket = null;

              this.connected = false;
              this.connecting = false;


              if (
                !terminado &&
                !estabaConectado
              ) {

                terminado = true;


                reject(
                  new Error(
                    `Deriv cerró la conexión · código ${evento.code}`
                  )
                );

                return;

              }


              this.cambiarEstado(
                "disconnected",
                `Conexión Deriv cerrada · código ${evento.code}`
              );


              /*
                Si nosotros pulsamos DESCONECTAR,
                no intentamos reconectar.
              */

              if (this.cierreManual) {

                return;

              }


              /*
                Reconexión únicamente si ya
                existía una conexión válida.
              */

              if (estabaConectado) {

                this.programarReconexion();

              }

            };


        } catch (error) {

          reject(error);

        }

      }
    );

  }


  /* ========================================
     CONECTAR CUENTA DEMO
     ======================================== */

  async conectarDemo({
    token,
    accountId,
    appId
  }) {

    if (
      this.connected ||
      this.connecting
    ) {

      return {
        ok: false,
        mensaje:
          "La conexión ya está activa o iniciándose."
      };

    }


    this.cierreManual = false;


    this.cambiarEstado(
      "connecting",
      "Solicitando acceso DEMO a Deriv..."
    );


    try {

      this.accountId =
        String(accountId).trim();

      this.appId =
        String(appId).trim();


      /*
        PASO 1
        Solicitar OTP / WebSocket URL
      */

      this.wsUrl =
        await this.obtenerWebSocketUrl({
          token,
          accountId:
            this.accountId,
          appId:
            this.appId
        });


      /*
        PASO 2
        Abrir WebSocket
      */

      await this.abrirWebSocket(
        this.wsUrl
      );


      return {
        ok: true,
        mensaje:
          "Cuenta DEMO conectada correctamente.",
        accountId:
          this.accountId
      };


    } catch (error) {

      this.socket = null;

      this.connected = false;
      this.connecting = false;


      this.cambiarEstado(
        "error",
        error.message
      );


      this.emitir(
        "error",
        {
          mensaje:
            error.message
        }
      );


      return {
        ok: false,
        mensaje:
          error.message
      };

    }

  }


  /* ========================================
     RECONEXIÓN
     ======================================== */

  programarReconexion() {

    if (
      this.cierreManual ||
      !this.wsUrl
    ) {

      return;

    }


    if (
      this.intentosReconexion >=
      this.maxIntentosReconexion
    ) {

      this.cambiarEstado(
        "error",
        "No fue posible restablecer la conexión con Deriv."
      );

      return;

    }


    this.intentosReconexion += 1;


    const intento =
      this.intentosReconexion;


    this.cambiarEstado(
      "connecting",
      `Reconectando con Deriv · intento ${intento}/${this.maxIntentosReconexion}`
    );


    clearTimeout(
      this.temporizadorReconexion
    );


    this.temporizadorReconexion =
      setTimeout(
        async () => {

          try {

            await this.abrirWebSocket(
              this.wsUrl
            );

          } catch (error) {

            this.emitir(
              "error",
              {
                mensaje:
                  `Reintento ${intento}: ${error.message}`
              }
            );


            this.programarReconexion();

          }

        },
        2000
      );

  }


  /* ========================================
     ENVIAR MENSAJE
     ======================================== */

  enviar(datos) {

    if (
      !this.socket ||
      this.socket.readyState !==
        WebSocket.OPEN
    ) {

      return {
        ok: false,
        mensaje:
          "Deriv DEMO no está conectado."
      };

    }


    try {

      this.socket.send(
        JSON.stringify(datos)
      );


      return {
        ok: true
      };


    } catch (error) {

      return {
        ok: false,
        mensaje:
          error.message
      };

    }

  }


  /* ========================================
     PING
     ======================================== */

  ping() {

    return this.enviar({
      ping: 1
    });

  }


  /* ========================================
     DESCONECTAR
     ======================================== */

  desconectar() {

    this.cierreManual = true;


    clearTimeout(
      this.temporizadorReconexion
    );


    this.temporizadorReconexion =
      null;


    try {

      this.socket?.close(
        1000,
        "Desconexión manual"
      );

    } catch {}


    this.socket = null;

    this.connected = false;
    this.connecting = false;


    this.cambiarEstado(
      "disconnected",
      "Deriv desconectado."
    );

  }


  /* ========================================
     ESTADO ACTUAL
     ======================================== */

  obtenerEstado() {

    return {

      connected:
        this.connected,

      connecting:
        this.connecting,

      accountId:
        this.accountId,

      appId:
        this.appId,

      intentosReconexion:
        this.intentosReconexion,

      socketReadyState:
        this.socket?.readyState
        ?? null

    };

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const derivConnection =
  new DerivConnection();
