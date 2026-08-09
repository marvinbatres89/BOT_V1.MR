/* ==========================================
   BOT V1 MR
   CONEXIÓN AUTENTICADA CON DERIV
   PAT + DETECCIÓN AUTOMÁTICA DE CUENTA DEMO
   SIN COMPRAS
   ========================================== */

class DerivConnection {

  constructor() {

    this.socket = null;

    this.connected = false;
    this.connecting = false;

    this.accountId = null;
    this.appId = null;

    this.accountInfo = null;

    this.listeners = {
      state: new Set(),
      message: new Set(),
      error: new Set(),
      account: new Set()
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
     HEADERS AUTENTICADOS
     ======================================== */

  crearHeaders(
    token,
    appId
  ) {

    return {

      "Authorization":
        `Bearer ${token}`,

      "Deriv-App-ID":
        String(appId),

      "Content-Type":
        "application/json"

    };

  }


  /* ========================================
     OBTENER TODAS LAS CUENTAS OPTIONS
     ======================================== */

  async obtenerCuentas({
    token,
    appId
  }) {

    if (!token) {

      throw new Error(
        "Falta el token PAT."
      );

    }


    if (!appId) {

      throw new Error(
        "Falta el Deriv App ID."
      );

    }


    const respuesta =
      await fetch(
        "https://api.derivws.com/trading/v1/options/accounts",
        {
          method:
            "GET",

          headers:
            this.crearHeaders(
              token,
              appId
            )
        }
      );


    let datos = null;


    try {

      datos =
        await respuesta.json();

    } catch {

      throw new Error(
        `Deriv respondió HTTP ${respuesta.status}.`
      );

    }


    if (!respuesta.ok) {

      const mensaje =
        datos?.errors?.[0]?.message ||
        datos?.message ||
        `Error HTTP ${respuesta.status}`;

      throw new Error(
        mensaje
      );

    }


    /*
      Deriv puede devolver la colección
      dentro de data o directamente como array.
    */

    const cuentas =
      Array.isArray(datos)
        ? datos
        : Array.isArray(datos?.data)
          ? datos.data
          : Array.isArray(datos?.data?.accounts)
            ? datos.data.accounts
            : Array.isArray(datos?.accounts)
              ? datos.accounts
              : [];


    if (!cuentas.length) {

      throw new Error(
        "No se encontraron cuentas Options para este token."
      );

    }


    return cuentas;

  }


  /* ========================================
     IDENTIFICAR CUENTA DEMO
     ======================================== */

  encontrarCuentaDemo(
    cuentas
  ) {

    if (
      !Array.isArray(cuentas)
    ) {

      return null;

    }


    /*
      Consideramos varias formas posibles
      en las que Deriv puede etiquetar una demo.
    */

    return cuentas.find(
      (cuenta) => {

        const tipo =
          String(
            cuenta.account_type ??
            cuenta.type ??
            cuenta.environment ??
            ""
          )
          .toLowerCase();


        const id =
          String(
            cuenta.id ??
            cuenta.account_id ??
            cuenta.loginid ??
            ""
          )
          .toUpperCase();


        return (
          tipo === "demo" ||
          tipo.includes("demo") ||
          id.startsWith("VRTC") ||
          id.startsWith("DOT")
        );

      }
    ) || null;

  }


  /* ========================================
     OBTENER ID DE CUENTA
     ======================================== */

  obtenerIdCuenta(
    cuenta
  ) {

    return (
      cuenta?.id ??
      cuenta?.account_id ??
      cuenta?.accountId ??
      cuenta?.loginid ??
      null
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

    if (!accountId) {

      throw new Error(
        "Falta el ID de cuenta DEMO."
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

          headers:
            this.crearHeaders(
              token,
              appId
            )
        }
      );


    let datos = null;


    try {

      datos =
        await respuesta.json();

    } catch {

      throw new Error(
        `Deriv respondió HTTP ${respuesta.status} al solicitar OTP.`
      );

    }


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
     CONECTAR CUENTA DEMO AUTOMÁTICAMENTE
     ======================================== */

  async conectarDemo({
    token,
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
      "Buscando cuenta DEMO de Deriv..."
    );


    try {

      this.appId =
        appId;


      /* ======================================
         PASO 1
         OBTENER CUENTAS
         ====================================== */

      const cuentas =
        await this.obtenerCuentas({
          token,
          appId
        });


      /* ======================================
         PASO 2
         ENCONTRAR DEMO
         ====================================== */

      const cuentaDemo =
        this.encontrarCuentaDemo(
          cuentas
        );


      if (!cuentaDemo) {

        throw new Error(
          "No se encontró una cuenta DEMO de Options."
        );

      }


      const accountId =
        this.obtenerIdCuenta(
          cuentaDemo
        );


      if (!accountId) {

        throw new Error(
          "La cuenta DEMO no tiene un ID reconocible."
        );

      }


      this.accountId =
        accountId;

      this.accountInfo =
        cuentaDemo;


      this.emitir(
        "account",
        {
          accountId,
          account:
            cuentaDemo
        }
      );


      this.cambiarEstado(
        "connecting",
        `Cuenta DEMO encontrada: ${accountId}`
      );


      /* ======================================
         PASO 3
         PEDIR OTP
         ====================================== */

      const wsUrl =
        await this.obtenerWebSocketUrl({
          token,
          accountId,
          appId
        });


      /*
        El OTP dura poco tiempo,
        por eso conectamos inmediatamente.
      */


      /* ======================================
         PASO 4
         ABRIR WEBSOCKET DEMO
         ====================================== */

      this.socket =
        new WebSocket(
          wsUrl
        );


      this.socket.onopen =
        () => {

          this.cambiarEstado(
            "connected",
            `Cuenta DEMO conectada · ${accountId}`
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

        ok:
          true,

        mensaje:
          "Conexión DEMO iniciada.",

        accountId

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

        ok:
          false,

        mensaje:
          error.message

      };

    }

  }


  /* ========================================
     ENVIAR MENSAJE WEBSOCKET
     ======================================== */

  enviar(
    datos
  ) {

    if (
      !this.socket ||
      this.socket.readyState !==
        WebSocket.OPEN
    ) {

      return {

        ok:
          false,

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

        ok:
          true

      };


    } catch (error) {

      return {

        ok:
          false,

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

    this.connected =
      false;

    this.connecting =
      false;


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

      accountInfo:
        this.accountInfo,

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
