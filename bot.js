/* ==========================================
   BOT V1 MR
   CONTROLADOR PRINCIPAL
   ========================================== */

import { signalBridge } from "./signal-bridge.js";
import { botEngine } from "./bot-engine.js";


/* ==========================================
   ELEMENTOS DE LA INTERFAZ
   ========================================== */

const estadoBot =
  document.getElementById("estadoBot");

const mercado =
  document.getElementById("mercado");

const estrategia =
  document.getElementById("estrategia");

const direccion =
  document.getElementById("direccion");

const confianza =
  document.getElementById("confianza");

const entrada =
  document.getElementById("entrada");

const precio =
  document.getElementById("precio");

const botonConectar =
  document.getElementById("botonConectar");

const botonPausar =
  document.getElementById("botonPausar");

const botonProbar =
  document.getElementById("botonProbar");

const ultimaSenal =
  document.getElementById("ultimaSenal");

const registroBot =
  document.getElementById("registroBot");


/* ==========================================
   OBTENER HORA
   ========================================== */

function obtenerHora() {

  return new Date().toLocaleTimeString(
    "es-SV",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );

}


/* ==========================================
   REGISTRAR ACTIVIDAD
   ========================================== */

function registrarActividad(
  mensaje,
  tipo = "normal"
) {

  const linea =
    document.createElement("p");

  linea.textContent =
    `[${obtenerHora()}] ${mensaje}`;

  if (tipo === "correcto") {
    linea.style.color = "#79f3c2";
  }

  if (tipo === "aviso") {
    linea.style.color = "#ffd37a";
  }

  if (tipo === "error") {
    linea.style.color = "#ff9fb4";
  }

  registroBot.prepend(linea);

}


/* ==========================================
   MOSTRAR SEÑAL EN PANTALLA
   ========================================== */

function mostrarSenal(senal) {

  mercado.textContent =
    senal.mercado || "--";

  estrategia.textContent =
    senal.estrategia || "--";

  direccion.textContent =
    senal.direccion || "--";

  confianza.textContent =
    `${senal.confianza}%`;

  if (
    senal.segundosEntrada !== null &&
    senal.segundosEntrada !== undefined
  ) {

    entrada.textContent =
      `${senal.segundosEntrada} s`;

  } else {

    entrada.textContent = "--";

  }

  if (
    senal.precio !== null &&
    senal.precio !== undefined
  ) {

    precio.textContent =
      senal.precio;

  } else {

    precio.textContent = "--";

  }


  ultimaSenal.innerHTML = `
    <strong>Mercado:</strong>
    ${senal.mercado}
    <br><br>

    <strong>Estrategia:</strong>
    ${senal.estrategia}
    <br>

    <strong>Dirección:</strong>
    ${senal.direccion}
    <br>

    <strong>Confianza:</strong>
    ${senal.confianza}%
    <br>

    <strong>Tendencia:</strong>
    ${senal.tendencia ?? "--"}
    <br>

    <strong>RSI:</strong>
    ${senal.rsi ?? "--"}
    <br>

    <strong>Momentum:</strong>
    ${senal.momentum ?? "--"}
    <br>

    <strong>Volatilidad:</strong>
    ${senal.volatilidad ?? "--"}
    <br>

    <strong>Último dígito:</strong>
    ${senal.ultimoDigito ?? "--"}
    <br>

    <strong>Entrada:</strong>
    ${
      senal.segundosEntrada !== null
        ? senal.segundosEntrada + " segundos"
        : "--"
    }
  `;

}


/* ==========================================
   RECIBIR SEÑAL DEL PUENTE
   ========================================== */

signalBridge.onSenal(
  (senal) => {

    mostrarSenal(senal);

    const resultado =
      botEngine.procesarSenal(senal);


    if (resultado.aceptada) {

      registrarActividad(
        `SEÑAL ACEPTADA · ${senal.mercado} · ${senal.estrategia} · ${senal.direccion} · ${senal.confianza}%`,
        "correcto"
      );

    } else {

      registrarActividad(
        `Señal no procesada: ${resultado.motivo}`,
        "aviso"
      );

    }

  }
);


/* ==========================================
   EVENTO ESTADO DEL PUENTE
   ========================================== */

window.addEventListener(
  "bot:estado",
  (evento) => {

    const datos =
      evento.detail;

    if (datos.conectado) {

      estadoBot.textContent =
        "BOT SYNC";

      estadoBot.classList.remove(
        "apagado"
      );

      estadoBot.classList.add(
        "encendido"
      );

      botonConectar.disabled =
        true;

      botonPausar.disabled =
        false;

      registrarActividad(
        datos.mensaje,
        "correcto"
      );

    } else {

      estadoBot.textContent =
        "BOT OFF";

      estadoBot.classList.remove(
        "encendido"
      );

      estadoBot.classList.add(
        "apagado"
      );

      botonConectar.disabled =
        false;

      botonPausar.disabled =
        true;

      registrarActividad(
        datos.mensaje,
        "aviso"
      );

    }

  }
);


/* ==========================================
   EVENTOS DE ERROR
   ========================================== */

window.addEventListener(
  "bot:error",
  (evento) => {

    registrarActividad(
      evento.detail?.mensaje ||
      "Error de sincronización",
      "error"
    );

  }
);


/* ==========================================
   BOTÓN CONECTAR
   ========================================== */

botonConectar.addEventListener(
  "click",
  () => {

    signalBridge.conectar();

    const resultado =
      botEngine.iniciar();

    registrarActividad(
      resultado.mensaje,
      "correcto"
    );

  }
);


/* ==========================================
   BOTÓN PAUSAR / REANUDAR
   ========================================== */

botonPausar.addEventListener(
  "click",
  () => {

    const estado =
      botEngine.obtenerEstado();


    if (!estado.pausado) {

      const resultado =
        botEngine.pausar();

      botonPausar.textContent =
        "REANUDAR";

      registrarActividad(
        resultado.mensaje,
        "aviso"
      );

    } else {

      const resultado =
        botEngine.reanudar();

      botonPausar.textContent =
        "PAUSAR";

      registrarActividad(
        resultado.mensaje,
        "correcto"
      );

    }

  }
);


/* ==========================================
   BOTÓN PRUEBA DE SEÑAL
   ========================================== */

botonProbar.addEventListener(
  "click",
  () => {

    registrarActividad(
      "Enviando señal DEMO desde Trading Analyzer..."
    );


    signalBridge.recibirSenal({

      mercado:
        "1HZ100V",

      estrategia:
        "RISE/FALL",

      direccion:
        "RISE",

      confianza:
        82,

      precio:
        12345.67,

      ultimoDigito:
        7,

      tendencia:
        "ALCISTA",

      rsi:
        61.4,

      momentum:
        0.72,

      volatilidad:
        1.38,

      segundosEntrada:
        3

    });

  }
);


/* ==========================================
   ESTADO INICIAL
   ========================================== */

registrarActividad(
  "BOT V1 MR preparado."
);

registrarActividad(
  "Esperando conexión con Trading Analyzer."
);
