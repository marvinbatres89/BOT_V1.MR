/* ==========================================
   BOT V1 MR
   CONEXIÓN AUTENTICADA CON DERIV
   FASE 1: CUENTA DEMO
   SIN COMPRAS
   ========================================== */

class DerivConnection {

  constructor() {

    this.socket = null;

    this.connected = false;
    this.connecting = false;

    this.accountId = null;
    this.appId = null;

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

      this.listeners[tipo].add(
        callback
      );

    }

    return () => {

      this.listeners[tipo]?.delete(
        callback
      );

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
        mensaje
      }
    );

  }


  /* ========================================
     SOLICITAR URL WEBSOCKET AUTENTICADA
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
          method:
            "POST",

          headers: {

            "Authorization":
              `Bearer ${token}`,

            "Deriv-App-ID":
              String(appId)

          }
        }
      );


    const datos =
      await respuesta.json();


    if (!respuesta.ok) {

      const mensaje =
        datos?.errors?.[0]?.message ||
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
        "Deriv no devolvió una URL WebSocket."
      );

    }


    return wsUrl;

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


    this.cambiarEstado(
      "connecting",
      "Solicitando acceso DEMO a Deriv..."
    );


    try {

      this.accountId =
        accountId;

      this.appId =
        appId;


      /*
        PASO 1
        Obtener URL autenticada OTP
      */

      const wsUrl =
        await this.obtenerWebSocketUrl({
          token,
          accountId,
          appId
        });


      /*
        PASO 2
        Abrir WebSocket autenticado
      */

      this.socket =
        new WebSocket(
          wsUrl
        );


      this.socket.onopen =
        () => {

          this.cambiarEstado(
            "connected",
            "Cuenta DEMO conectada con Deriv."
          );

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
                "Error en WebSocket de Deriv."
            }
          );

        };


      this.socket.onclose =
        (evento) => {

          this.socket =
            null;

          this.cambiarEstado(
            "disconnected",
            `Conexión Deriv cerrada · código ${evento.code}`
          );

        };


      return {
        ok: true,
        mensaje:
          "Conexión DEMO iniciada."
      };


    } catch (error) {

      this.socket =
        null;

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
     ENVIAR MENSAJE WEBSOCKET
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
          "Deriv no está conectado."
      };

    }


    try {

      this.socket.send(
        JSON.stringify(
          datos
        )
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
     DESCONECTAR
     ======================================== */

  desconectar() {

    try {

      this.socket?.close();

    } catch {}


    this.socket =
      null;

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
