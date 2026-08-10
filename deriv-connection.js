/* ==========================================
   BOT V1 MR
   DERIV CONNECTION V3

   PAT + DETECCIÓN AUTOMÁTICA DEMO
   + WEBSOCKET AUTENTICADO
   + RECONEXIÓN CONTROLADA

   FASE SEGURA:
   SIN COMPRAS
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

      state:
        new Set(),

      message:
        new Set(),

      error:
        new Set(),

      account:
        new Set()

    };

  }


  /* ========================================
     EVENTOS
     ======================================== */

  on(
    tipo,
    callback
  ) {

    if (
      this.listeners[tipo] &&
      typeof callback === "function"
    ) {

      this.listeners[tipo]
        .add(callback);

    }


    return () => {

      this.listeners[tipo]
        ?.delete(callback);

    };

  }


  emitir(
    tipo,
    datos
  ) {

    this.listeners[tipo]
      ?.forEach(
        (callback) => {

          try {

            callback(datos);

          } catch (error) {

            console.error(
              "Error listener Deriv:",
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

        accountId:
          this.accountId,

        appId:
          this.appId

      }
    );

  }


  /* ========================================
     EXTRAER MENSAJE ERROR HTTP
     ======================================== */

  obtenerMensajeError(
    datos,
    status
  ) {

    return (

      datos?.errors?.[0]?.message ||

      datos?.error?.message ||

      datos?.message ||

      `Error HTTP ${status}`

    );

  }


  /* ========================================
     BUSCAR CUENTAS DEL TOKEN PAT
     ======================================== */

  async obtenerCuentas({
    token,
    appId
  }) {

    const url =
      "https://api.derivws.com/trading/v1/options/accounts";


    const respuesta =
      await fetch(
        url,
        {

          method:
            "GET",

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


    let datos;


    try {

      datos =
        await respuesta.json();

    } catch {

      throw new Error(
        "Deriv devolvió una respuesta inválida al buscar las cuentas."
      );

    }


    if (
      !respuesta.ok
    ) {

      throw new Error(
        this.obtenerMensajeError(
          datos,
          respuesta.status
        )
      );

    }


    /*
      Permitimos varias estructuras
      posibles de respuesta.
    */

    const cuentas =

      datos?.data ||

      datos?.accounts ||

      datos?.data?.accounts ||

      [];


    if (
      Array.isArray(cuentas)
    ) {

      return cuentas;

    }


    if (
      Array.isArray(
        cuentas?.accounts
      )
    ) {

      return cuentas.accounts;

    }


    return [];

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
      Primero buscamos indicadores
      explícitos de cuenta demo.
    */

    let cuenta =
      cuentas.find(
        (item) => {

          return (

            item?.is_virtual === true ||

            item?.is_virtual === 1 ||

            item?.is_demo === true ||

            item?.is_demo === 1 ||

            item?.account_type ===
              "demo" ||

            item?.account_type ===
              "virtual"

          );

        }
      );


    if (
      cuenta
    ) {

      return cuenta;

    }


    /*
      Como respaldo buscamos
      identificadores conocidos de
      cuentas virtuales.
    */

    cuenta =
      cuentas.find(
        (item) => {

          const id =
            String(
              item?.account_id ??
              item?.id ??
              item?.loginid ??
              ""
            )
            .toUpperCase();


          return (

            id.startsWith("VRTC") ||

            id.startsWith("DOT")

          );

        }
      );


    return (
      cuenta ||
      null
    );

  }


  /* ========================================
     EXTRAER ID DE CUENTA
     ======================================== */

  extraerAccountId(
    cuenta
  ) {

    return (

      cuenta?.account_id ||

      cuenta?.id ||

      cuenta?.loginid ||

      cuenta?.accountId ||

      null

    );

  }


  /* ========================================
     DETECTAR CUENTA DEMO
     ======================================== */

  async detectarCuentaDemo({
    token,
    appId
  }) {

    this.cambiarEstado(
      "connecting",
      "Buscando cuenta DEMO de Deriv..."
    );


    const cuentas =
      await this.obtenerCuentas({
        token,
        appId
      });


    const cuentaDemo =
      this.encontrarCuentaDemo(
        cuentas
      );


    if (
      !cuentaDemo
    ) {

      throw new Error(
        "No se encontró una cuenta DEMO asociada al token."
      );

    }


    const accountId =
      this.extraerAccountId(
        cuentaDemo
      );


    if (
      !accountId
    ) {

      throw new Error(
        "Se encontró la cuenta DEMO, pero no fue posible obtener su ID."
      );

    }


    this.accountId =
      String(accountId);


    this.emitir(
      "account",
      {

        accountId:
          this.accountId,

        cuenta:
          cuentaDemo

      }
    );


    return this.accountId;

  }


  /* ========================================
     SOLICITAR URL WEBSOCKET OTP
     ======================================== */

  async obtenerWebSocketUrl({
    token,
    accountId,
    appId
  }) {

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
              String(appId),

            "Content-Type":
              "application/json"

          }

        }
      );


    let datos;


    try {

      datos =
        await respuesta.json();

    } catch {

      throw new Error(
        "Deriv devolvió una respuesta inválida al solicitar el WebSocket."
      );

    }


    if (
      !respuesta.ok
    ) {

      throw new Error(
        this.obtenerMensajeError(
          datos,
          respuesta.status
        )
      );

    }


    const wsUrl =
      datos?.data?.url;


    if (
      !wsUrl
    ) {

      throw new Error(
        "Deriv no devolvió la URL WebSocket."
      );

    }


    return wsUrl;

  }


  /* ========================================
     ABRIR WEBSOCKET
     ======================================== */

  abrirWebSocket(
    wsUrl
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        let finalizado =
          false;


        let abierto =
          false;


        const socket =
          new WebSocket(
            wsUrl
          );


        this.socket =
          socket;


        const timeout =
          setTimeout(
            () => {

              if (
                finalizado
              ) {

                return;

              }


              finalizado =
                true;


              try {

                socket.close();

              } catch {}


              reject(
                new Error(
                  "Tiempo de conexión con Deriv agotado."
                )
              );

            },
            15000
          );


        socket.onopen =
          () => {

            if (
              finalizado
            ) {

              return;

            }


            abierto =
              true;

            finalizado =
              true;


            clearTimeout(
              timeout
            );


            this.intentosReconexion =
              0;


            this.cambiarEstado(
              "connected",
              `Cuenta DEMO conectada · ${this.accountId}`
            );


            resolve({
              ok: true
            });

          };


        socket.onmessage =
          (evento) => {

            let datos;


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


        /*
          IMPORTANTE:

          onerror no genera inmediatamente
          un DERIV ERROR visual.

          En móviles Chrome puede dispararlo
          aunque onclose sea quien realmente
          determine qué ocurrió.
        */

        socket.onerror =
          () => {

            console.warn(
              "Evento WebSocket Deriv detectado."
            );

          };


        socket.onclose =
          (evento) => {

            clearTimeout(
              timeout
            );


            if (
              this.socket === socket
            ) {

              this.socket =
                null;

            }


            this.connected =
              false;

            this.connecting =
              false;


            /*
              Falló antes de abrir.
            */

            if (
              !abierto
            ) {

              if (
                !finalizado
              ) {

                finalizado =
                  true;


                reject(
                  new Error(
                    `No se pudo abrir WebSocket Deriv · código ${evento.code}`
                  )
                );

              }


              return;

            }


            /*
              Desconexión solicitada
              por el usuario.
            */

            if (
              this.cierreManual
            ) {

              this.cambiarEstado(
                "disconnected",
                "Deriv desconectado."
              );

              return;

            }


            /*
              Desconexión inesperada.
            */

            this.cambiarEstado(
              "disconnected",
              `Conexión Deriv interrumpida · código ${evento.code}`
            );


            this.programarReconexion();

          };

      }
    );

  }


  /* ========================================
     CONECTAR DEMO
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


    token =
      String(
        token ||
        ""
      ).trim();


    appId =
      String(
        appId ||
        ""
      ).trim();


    if (
      !token
    ) {

      return {

        ok: false,

        mensaje:
          "Falta Token PAT."

      };

    }


    if (
      !appId
    ) {

      return {

        ok: false,

        mensaje:
          "Falta Deriv App ID."

      };

    }


    this.cierreManual =
      false;


    this.appId =
      appId;


    try {

      /*
        PASO 1
        Detectar automáticamente
        cuenta DEMO.
      */

      const accountId =
        await this.detectarCuentaDemo({
          token,
          appId
        });


      /*
        PASO 2
        Solicitar OTP.
      */

      this.cambiarEstado(
        "connecting",
        "Solicitando acceso DEMO a Deriv..."
      );


      this.wsUrl =
        await this.obtenerWebSocketUrl({

          token,

          accountId,

          appId

        });


      /*
        PASO 3
        Abrir WebSocket autenticado.
      */

      this.cambiarEstado(
        "connecting",
        "Conectando WebSocket DEMO..."
      );


      await this.abrirWebSocket(
        this.wsUrl
      );


      return {

        ok: true,

        mensaje:
          "Deriv DEMO conectado correctamente.",

        accountId:
          this.accountId

      };


    } catch (error) {

      this.socket =
        null;


      this.connected =
        false;


      this.connecting =
        false;


      const mensaje =
        error?.message ||
        "Error desconocido conectando con Deriv.";


      this.cambiarEstado(
        "error",
        mensaje
      );


      this.emitir(
        "error",
        {
          mensaje
        }
      );


      return {

        ok: false,

        mensaje

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


      this.emitir(
        "error",
        {
          mensaje:
            "Se agotaron los intentos de reconexión."
        }
      );


      return;

    }


    this.intentosReconexion +=
      1;


    const intento =
      this.intentosReconexion;


    this.cambiarEstado(
      "connecting",
      `Reconectando Deriv · intento ${intento}/${this.maxIntentosReconexion}`
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

            console.warn(
              "Reintento Deriv fallido:",
              error
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

  enviar(
    datos
  ) {

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

    this.cierreManual =
      true;


    clearTimeout(
      this.temporizadorReconexion
    );


    this.temporizadorReconexion =
      null;


    const socket =
      this.socket;


    this.socket =
      null;


    try {

      if (
        socket &&
        (
          socket.readyState ===
            WebSocket.OPEN ||

          socket.readyState ===
            WebSocket.CONNECTING
        )
      ) {

        socket.close(
          1000,
          "Desconexión manual"
        );

      }

    } catch {}


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

      appId:
        this.appId,

      intentosReconexion:
        this.intentosReconexion,

      socketReadyState:
        this.socket?.readyState ??
        null

    };

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const derivConnection =
  new DerivConnection();
