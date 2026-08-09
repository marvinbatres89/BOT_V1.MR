/* ==========================================
   BOT V1 MR
   PUENTE DE SINCRONIZACIÓN
   ========================================== */

class SignalBridge {

  constructor() {
    this.ultimaSenal = null;
    this.conectado = false;
    this.listeners = new Set();
  }


  /* ========================================
     CONECTAR PUENTE
     ======================================== */

  conectar() {
    this.conectado = true;

    window.dispatchEvent(
      new CustomEvent("bot:estado", {
        detail: {
          conectado: true,
          mensaje:
            "Bot sincronizado con Trading Analyzer"
        }
      })
    );

    return true;
  }


  /* ========================================
     DESCONECTAR PUENTE
     ======================================== */

  desconectar() {
    this.conectado = false;

    window.dispatchEvent(
      new CustomEvent("bot:estado", {
        detail: {
          conectado: false,
          mensaje:
            "Bot desconectado de Trading Analyzer"
        }
      })
    );
  }


  /* ========================================
     VALIDAR SEÑAL
     ======================================== */

  validarSenal(senal) {

    if (!senal) {
      return false;
    }

    if (!senal.mercado) {
      return false;
    }

    if (!senal.estrategia) {
      return false;
    }

    if (!senal.direccion) {
      return false;
    }

    const confianza = Number(senal.confianza);

    if (!Number.isFinite(confianza)) {
      return false;
    }

    if (confianza < 0 || confianza > 100) {
      return false;
    }

    return true;
  }


  /* ========================================
     RECIBIR SEÑAL
     ======================================== */

  recibirSenal(datos) {

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
        Number(datos.confianza),

      precio:
        datos.precio != null
          ? Number(datos.precio)
          : null,

      ultimoDigito:
        datos.ultimoDigito != null
          ? Number(datos.ultimoDigito)
          : null,

      tendencia:
        datos.tendencia ?? null,

      rsi:
        datos.rsi != null
          ? Number(datos.rsi)
          : null,

      momentum:
        datos.momentum != null
          ? Number(datos.momentum)
          : null,

      volatilidad:
        datos.volatilidad != null
          ? Number(datos.volatilidad)
          : null,

      segundosEntrada:
        datos.segundosEntrada != null
          ? Number(datos.segundosEntrada)
          : null,

      timestamp:
        Date.now()

    };


    /* VALIDACIÓN */

    if (!this.validarSenal(senal)) {

      window.dispatchEvent(
        new CustomEvent("bot:error", {
          detail: {
            mensaje:
              "Señal rechazada: datos inválidos"
          }
        })
      );

      return false;
    }


    /* GUARDAR ÚLTIMA SEÑAL */

    this.ultimaSenal = senal;


    /* ENVIAR A LOS LISTENERS */

    for (const callback of this.listeners) {

      try {

        callback(senal);

      } catch (error) {

        console.error(
          "Error enviando señal al bot:",
          error
        );

      }

    }


    /* EVENTO GLOBAL */

    window.dispatchEvent(
      new CustomEvent(
        "trading-analyzer:signal",
        {
          detail: senal
        }
      )
    );

    return true;
  }


  /* ========================================
     ESCUCHAR SEÑALES
     ======================================== */

  onSenal(callback) {

    if (
      typeof callback === "function"
    ) {

      this.listeners.add(callback);

    }

    return () => {
      this.listeners.delete(callback);
    };
  }


  /* ========================================
     OBTENER ÚLTIMA SEÑAL
     ======================================== */

  obtenerUltimaSenal() {
    return this.ultimaSenal;
  }


  /* ========================================
     SABER SI ESTÁ CONECTADO
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
