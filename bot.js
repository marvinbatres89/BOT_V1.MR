/* ==========================================
   BOT V1 MR
   CONTROLADOR PRINCIPAL
   SINCRONIZACIÓN + SIMULACIÓN + DERIV DEMO
   ========================================== */

import { signalBridge } from "./signal-bridge.js";
import { botEngine } from "./bot-engine.js";
import { derivConnection } from "./deriv-connection.js";


/* ==========================================
   ELEMENTOS DE LA INTERFAZ
   ========================================== */

const $ =
  (id) => document.getElementById(id);


const estadoBot =
  $("estadoBot");

const mercado =
  $("mercado");

const estrategia =
  $("estrategia");

const direccion =
  $("direccion");

const confianza =
  $("confianza");

const entrada =
  $("entrada");

const precio =
  $("precio");


const botonConectar =
  $("botonConectar");

const botonPausar =
  $("botonPausar");

const botonProbar =
  $("botonProbar");


const ultimaSenal =
  $("ultimaSenal");

const ultimoContrato =
  $("ultimoContrato");

const ultimaPropuesta =
  $("ultimaPropuesta");

const registroBot =
  $("registroBot");


/* ==========================================
   ELEMENTOS DERIV DEMO
   ========================================== */

const estadoDeriv =
  $("estadoDeriv");

const derivAppId =
  $("derivAppId");

const derivAccountId =
  $("derivAccountId");

const derivToken =
  $("derivToken");

const botonConectarDeriv =
  $("botonConectarDeriv");

const botonDesconectarDeriv =
  $("botonDesconectarDeriv");

const derivCuenta =
  $("derivCuenta");

const derivConexion =
  $("derivConexion");


/* ==========================================
   HORA
   ========================================== */

function obtenerHora() {

  return new Date()
    .toLocaleTimeString(
      "es-SV",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    );

}


/* ==========================================
   REGISTRO
   ========================================== */

function registrarActividad(
  mensaje,
  tipo = "normal"
) {

  if (!registroBot) {
    return;
  }


  const linea =
    document.createElement("p");


  linea.textContent =
    `[${obtenerHora()}] ${mensaje}`;


  if (tipo === "correcto") {

    linea.style.color =
      "#79f3c2";

  }


  if (tipo === "aviso") {

    linea.style.color =
      "#ffd37a";

  }


  if (tipo === "error") {

    linea.style.color =
      "#ff9fb4";

  }


  registroBot.prepend(
    linea
  );

}


/* ==========================================
   MOSTRAR SEÑAL
   ========================================== */

function mostrarSenal(
  senal
) {

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

    entrada.textContent =
      "--";

  }


  if (
    senal.precio !== null &&
    senal.precio !== undefined
  ) {

    precio.textContent =
      senal.precio;

  } else {

    precio.textContent =
      "--";

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
      senal.segundosEntrada !== null &&
      senal.segundosEntrada !== undefined
        ? senal.segundosEntrada + " segundos"
        : "--"
    }

  `;

}


/* ==========================================
   MOSTRAR CONTRATO
   ========================================== */

function mostrarContrato(
  contrato
) {

  if (!contrato) {

    ultimoContrato.textContent =
      "Esperando una señal válida...";

    return;

  }


  const barrera =
    contrato.barrier !== null &&
    contrato.barrier !== undefined
      ? contrato.barrier
      : "--";


  ultimoContrato.innerHTML = `

    <strong>Mercado:</strong>
    ${contrato.symbol}
    <br><br>

    <strong>Contrato Deriv:</strong>
    ${contrato.contractType}
    <br>

    <strong>Dirección:</strong>
    ${contrato.direction}
    <br>

    <strong>Barrera:</strong>
    ${barrera}
    <br>

    <strong>Confianza:</strong>
    ${contrato.confidence}%
    <br>

    <strong>Segundo:</strong>
    ${contrato.executionSecond ?? "--"}

  `;

}


/* ==========================================
   MOSTRAR PROPUESTA
   ========================================== */

function mostrarPropuesta(
  propuesta
) {

  if (!propuesta) {

    ultimaPropuesta.textContent =
      "Todavía no existe una propuesta.";

    return;

  }


  ultimaPropuesta.innerHTML = `

    <strong>Modo:</strong>
    ${propuesta.modo}
    <br><br>

    <strong>Contrato:</strong>
    ${propuesta.contractType}
    <br>

    <strong>Monto:</strong>
    ${propuesta.amount}
    ${propuesta.currency}
    <br>

    <strong>Duración:</strong>
    ${propuesta.duration}
    ${propuesta.durationUnit}
    <br>

    <strong>Estado:</strong>
    ${propuesta.status}
    <br>

    <strong>ID:</strong>
    ${propuesta.id}

  `;

}


/* ==========================================
   RECIBIR SEÑAL DEL TRADING ANALYZER
   ========================================== */

signalBridge.onSenal(
  (senal) => {

    mostrarSenal(
      senal
    );


    const resultado =
      botEngine.procesarSenal(
        senal
      );


    if (
      resultado.aceptada
    ) {

      registrarActividad(
        `SEÑAL ACEPTADA · ${senal.mercado} · ${senal.estrategia} · ${senal.direccion} · ${senal.confianza}%`,
        "correcto"
      );


      /* CONTRATO */

      if (
        resultado.contrato
      ) {

        mostrarContrato(
          resultado.contrato
        );


        const barrera =
          resultado.contrato.barrier !== null &&
          resultado.contrato.barrier !== undefined
            ? ` · BARRERA ${resultado.contrato.barrier}`
            : "";


        registrarActividad(
          `CONTRATO → ${resultado.contrato.contractType}${barrera}`,
          "correcto"
        );

      }


      /* PROPUESTA SIMULADA */

      if (
        resultado.propuesta
      ) {

        mostrarPropuesta(
          resultado.propuesta
        );


        registrarActividad(
          `SIMULACIÓN → ${resultado.propuesta.amount} ${resultado.propuesta.currency} · ${resultado.propuesta.duration}${resultado.propuesta.durationUnit} · ${resultado.propuesta.status}`,
          "correcto"
        );

      }

    } else {

      registrarActividad(
        `Señal no procesada · ${resultado.etapa || "BOT"} · ${resultado.motivo}`,
        "aviso"
      );

    }

  }
);


/* ==========================================
   ESTADO DEL PUENTE
   ========================================== */

window.addEventListener(
  "bot:estado",
  (evento) => {

    const datos =
      evento.detail;


    if (
      datos.conectado
    ) {

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
   ORIGEN DE LA SEÑAL
   ========================================== */

window.addEventListener(
  "bot:signal-source",
  (evento) => {

    const origen =
      evento.detail?.origen ||
      "desconocido";


    registrarActividad(
      `Señal recibida desde ${origen}`,
      "correcto"
    );

  }
);


/* ==========================================
   ERRORES DEL PUENTE
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
   BOTÓN CONECTAR PUENTE
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
   PAUSAR / REANUDAR
   ========================================== */

botonPausar.addEventListener(
  "click",
  () => {

    const estado =
      botEngine.obtenerEstado();


    if (
      !estado.pausado
    ) {

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
   SEÑAL DEMO
   ========================================== */

botonProbar.addEventListener(
  "click",
  () => {

    registrarActividad(
      "Enviando señal DEMO..."
    );


    signalBridge.recibirSenal({

      mercado:
        "1HZ100V",

      estrategia:
        "rise_fall",

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
        "ALCISTA",

      volatilidad:
        "MEDIA",

      segundosEntrada:
        3

    });

  }
);


/* ==========================================
   DERIV
   ESTADO DE CONEXIÓN
   ========================================== */

derivConnection.on(
  "state",
  ({
    estado,
    mensaje
  }) => {

    estadoDeriv.textContent =
      mensaje;


    if (
      estado === "connected"
    ) {

      derivConexion.textContent =
        "DEMO CONECTADO";


      derivCuenta.textContent =
        derivAccountId.value || "--";


      botonConectarDeriv.disabled =
        true;


      botonDesconectarDeriv.disabled =
        false;


      derivAppId.disabled =
        true;


      derivAccountId.disabled =
        true;


      derivToken.disabled =
        true;


      registrarActividad(
        "Deriv DEMO conectado.",
        "correcto"
      );

    }


    else if (
      estado === "connecting"
    ) {

      derivConexion.textContent =
        "CONECTANDO";


      botonConectarDeriv.disabled =
        true;


      registrarActividad(
        mensaje,
        "aviso"
      );

    }


    else {

      derivConexion.textContent =
        "OFF";


      derivCuenta.textContent =
        "--";


      botonConectarDeriv.disabled =
        false;


      botonDesconectarDeriv.disabled =
        true;


      derivAppId.disabled =
        false;


      derivAccountId.disabled =
        false;


      derivToken.disabled =
        false;


      if (
        estado === "error"
      ) {

        registrarActividad(
          `Deriv: ${mensaje}`,
          "error"
        );

      }

    }

  }
);


/* ==========================================
   ERRORES DERIV
   ========================================== */

derivConnection.on(
  "error",
  ({
    mensaje
  }) => {

    registrarActividad(
      `DERIV ERROR → ${mensaje}`,
      "error"
    );

  }
);


/* ==========================================
   MENSAJES DERIV
   ========================================== */

derivConnection.on(
  "message",
  (datos) => {

    console.log(
      "Mensaje Deriv:",
      datos
    );

  }
);


/* ==========================================
   CONECTAR DERIV DEMO
   ========================================== */

botonConectarDeriv.addEventListener(
  "click",
  async () => {

    const appId =
      derivAppId.value.trim();

    const accountId =
      derivAccountId.value.trim();

    const token =
      derivToken.value.trim();


    if (!appId) {

      registrarActividad(
        "Falta Deriv App ID.",
        "aviso"
      );

      derivAppId.focus();

      return;

    }


    if (!accountId) {

      registrarActividad(
        "Falta ID de cuenta DEMO.",
        "aviso"
      );

      derivAccountId.focus();

      return;

    }


    if (!token) {

      registrarActividad(
        "Falta Token PAT.",
        "aviso"
      );

      derivToken.focus();

      return;

    }


    registrarActividad(
      "Iniciando conexión con Deriv DEMO...",
      "aviso"
    );


    const resultado =
      await derivConnection.conectarDemo({
        token,
        accountId,
        appId
      });


    if (
      !resultado.ok
    ) {

      registrarActividad(
        `No se pudo conectar: ${resultado.mensaje}`,
        "error"
      );

    }

  }
);


/* ==========================================
   DESCONECTAR DERIV
   ========================================== */

botonDesconectarDeriv.addEventListener(
  "click",
  () => {

    derivConnection.desconectar();


    /*
      Borrar token del campo cuando
      desconectamos.
    */

    derivToken.value =
      "";


    registrarActividad(
      "Deriv DEMO desconectado.",
      "aviso"
    );

  }
);


/* ==========================================
   CIERRE DE PÁGINA
   ========================================== */

window.addEventListener(
  "beforeunload",
  () => {

    derivConnection.desconectar();

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


registrarActividad(
  "Deriv DEMO todavía desconectado."
);
