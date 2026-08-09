/* ==========================================
   BOT V1 MR
   MOTOR DEL BOT
   FASE 1: SIMULACIÓN SEGURA
   ========================================== */

class BotEngine {

  constructor() {

    this.activo = false;
    this.pausado = false;

    this.ultimaSenalProcesada = null;

    this.modo = "SIMULACION";

  }


  /* ========================================
     INICIAR BOT
     ======================================== */

  iniciar() {

    this.activo = true;
    this.pausado = false;

    return {
      ok: true,
      mensaje: "Bot iniciado en modo simulación"
    };

  }


  /* ========================================
     PAUSAR BOT
     ======================================== */

  pausar() {

    this.pausado = true;

    return {
      ok: true,
      mensaje: "Bot pausado"
    };

  }


  /* ========================================
     REANUDAR BOT
     ======================================== */

  reanudar() {

    this.pausado = false;

    return {
      ok: true,
      mensaje: "Bot reanudado"
    };

  }


  /* ========================================
     DETENER BOT
     ======================================== */

  detener() {

    this.activo = false;
    this.pausado = false;

    return {
      ok: true,
      mensaje: "Bot detenido"
    };

  }


  /* ========================================
     VALIDAR ESTADO
     ======================================== */

  puedeProcesar() {

    if (!this.activo) {

      return {
        ok: false,
        motivo: "El bot está apagado"
      };

    }

    if (this.pausado) {

      return {
        ok: false,
        motivo: "El bot está pausado"
      };

    }

    return {
      ok: true
    };

  }


  /* ========================================
     PROCESAR SEÑAL
     ======================================== */

  procesarSenal(senal) {

    const estado = this.puedeProcesar();

    if (!estado.ok) {

      return {
        aceptada: false,
        motivo: estado.motivo
      };

    }


    /* EVITAR DUPLICADOS */

    if (
      this.ultimaSenalProcesada ===
      senal.id
    ) {

      return {
        aceptada: false,
        motivo: "Señal duplicada"
      };

    }


    /* GUARDAR ID */

    this.ultimaSenalProcesada =
      senal.id;


    /* ======================================
       FASE ACTUAL:
       SOLO SIMULACIÓN
       ====================================== */

    return {

      aceptada: true,

      modo:
        this.modo,

      mercado:
        senal.mercado,

      estrategia:
        senal.estrategia,

      direccion:
        senal.direccion,

      confianza:
        senal.confianza,

      precio:
        senal.precio,

      segundosEntrada:
        senal.segundosEntrada,

      mensaje:
        "Señal aceptada por el BOT V1 MR"

    };

  }


  /* ========================================
     ESTADO ACTUAL
     ======================================== */

  obtenerEstado() {

    return {

      activo:
        this.activo,

      pausado:
        this.pausado,

      modo:
        this.modo,

      ultimaSenalProcesada:
        this.ultimaSenalProcesada

    };

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const botEngine =
  new BotEngine();
