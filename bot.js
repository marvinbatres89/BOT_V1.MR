/* ==========================================
   BOT V1 MR
   CONTROLADOR PRINCIPAL CONSOLIDADO

   Trading Analyzer decide.
   El BOT traduce y solicita cotización.
   Deriv DEMO NO compra.
   ========================================== */

import {
  signalBridge
} from "./signal-bridge.js";

import {
  botEngine
} from "./bot-engine.js";

import {
  derivConnection
} from "./deriv-connection.js";


const $ =
  (id) =>
    document.getElementById(
      id
    );


const UI = {

  estadoBot:
    $("estadoBot"),

  mercado:
    $("mercado"),

  estrategia:
    $("estrategia"),

  direccion:
    $("direccion"),

  confianza:
    $("confianza"),

  entrada:
    $("entrada"),

  precio:
    $("precio"),

  botonConectar:
    $("botonConectar"),

  botonPausar:
    $("botonPausar"),

  botonProbar:
    $("botonProbar"),

  ultimaSenal:
    $("ultimaSenal"),

  ultimoContrato:
    $("ultimoContrato"),

  ultimaPropuestaSimulada:
    $("ultimaPropuestaSimulada"),

  ultimaPropuestaDeriv:
    $("ultimaPropuestaDeriv"),

  registroBot:
    $("registroBot"),

  estadoDeriv:
    $("estadoDeriv"),

  derivAppId:
    $("derivAppId"),

  derivAccountId:
    $("derivAccountId"),

  derivToken:
    $("derivToken"),

  botonConectarDeriv:
    $("botonConectarDeriv"),

  botonDesconectarDeriv:
    $("botonDesconectarDeriv"),

  derivCuenta:
    $("derivCuenta"),

  derivConexion:
    $("derivConexion")

};


function obtenerHora() {

  return new Date()
    .toLocaleTimeString(
      "es-SV",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit"
      }
    );

}


function registrarActividad(
  mensaje,
  tipo = "normal"
) {

  if (
    !UI.registroBot
  ) {

    return;

  }


  const linea =
    document.createElement(
      "p"
    );


  linea.textContent =
    `[${obtenerHora()}] ${mensaje}`;


  if (
    tipo ===
      "correcto"
  ) {

    linea.style.color =
      "#79f3c2";

  }


  if (
    tipo ===
      "aviso"
  ) {

    linea.style.color =
      "#ffd37a";

  }


  if (
    tipo ===
      "error"
  ) {

    linea.style.color =
      "#ff9fb4";

  }


  UI.registroBot.prepend(
    linea
  );

}


function mostrarSenal(
  senal
) {

  UI.mercado.textContent =
    senal.mercado ||
    "--";

  UI.estrategia.textContent =
    senal.estrategia ||
    "--";

  UI.direccion.textContent =
    senal.direccion ||
    "--";

  UI.confianza.textContent =
    `${senal.confianza}%`;


  UI.entrada.textContent =
    senal.segundosEntrada != null
      ? `${senal.segundosEntrada} s`
      : "--";


  UI.precio.textContent =
    senal.precio != null
      ? String(
          senal.precio
        )
      : "--";


  const metadata =
    senal.metadata &&
    Object.keys(
      senal.metadata
    ).length
      ? JSON.stringify(
          senal.metadata
        )
      : "--";


  UI.ultimaSenal.innerHTML = `

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
    ${senal.segundosEntrada ?? "--"}
    segundos
    <br>

    <strong>Metadata:</strong>
    ${metadata}

  `;

}


function mostrarContrato(
  contrato
) {

  const barrera =
    contrato.barrier != null
      ? contrato.barrier
      : "--";


  UI.ultimoContrato.innerHTML = `

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


function mostrarPropuestaSimulada(
  propuesta
) {

  UI.ultimaPropuestaSimulada.innerHTML = `

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


function mostrarPropuestaDeriv(
  propuesta,
  contrato
) {

  if (
    !propuesta?.ok
  ) {

    UI.ultimaPropuestaDeriv.innerHTML = `

      <strong>Estado:</strong>
      SIN COTIZACIÓN
      <br><br>

      <strong>Motivo:</strong>
      ${propuesta?.error || "No se recibió cotización."}
      <br>

      <strong>Compra:</strong>
      BLOQUEADA

    `;

    return;

  }


  UI.ultimaPropuestaDeriv.innerHTML = `

    <strong>Modo:</strong>
    DERIV DEMO REAL
    <br><br>

    <strong>Mercado:</strong>
    ${contrato?.symbol ?? "--"}
    <br>

    <strong>Contrato:</strong>
    ${contrato?.contractType ?? "--"}
    <br>

    <strong>ID propuesta Deriv:</strong>
    ${propuesta.id ?? "--"}
    <br><br>

    <strong>Precio:</strong>
    ${propuesta.askPrice}
    <br>

    <strong>Pago potencial:</strong>
    ${propuesta.payout}
    <br>

    <strong>Spot:</strong>
    ${propuesta.spot ?? "--"}
    <br>

    <strong>Descripción:</strong>
    ${propuesta.longcode || "--"}
    <br><br>

    <strong>Estado:</strong>
    COTIZACIÓN REAL RECIBIDA
    <br>

    <strong>Compra:</strong>
    BLOQUEADA

  `;

}


signalBridge.onSenal(
  async (
    senal
  ) => {

    mostrarSenal(
      senal
    );


    registrarActividad(
      "Procesando señal...",
      "aviso"
    );


    try {

      const resultado =
        await botEngine.procesarSenal(
          senal
        );


      if (
        !resultado.aceptada
      ) {

        registrarActividad(
          `Señal no procesada · ${resultado.etapa || "BOT"} · ${resultado.motivo}`,
          "aviso"
        );

        return;

      }


      registrarActividad(
        `SEÑAL ACEPTADA · ${senal.mercado} · ${senal.estrategia} · ${senal.direccion} · ${senal.confianza}%`,
        "correcto"
      );


      if (
        resultado.contrato
      ) {

        mostrarContrato(
          resultado.contrato
        );


        const barrera =
          resultado.contrato.barrier !=
            null
            ? ` · BARRERA ${resultado.contrato.barrier}`
            : "";


        registrarActividad(
          `CONTRATO → ${resultado.contrato.contractType}${barrera}`,
          "correcto"
        );

      }


      if (
        resultado.propuesta
      ) {

        mostrarPropuestaSimulada(
          resultado.propuesta
        );


        registrarActividad(
          `RESPALDO SIMULADO → ${resultado.propuesta.amount} ${resultado.propuesta.currency} · ${resultado.propuesta.duration}${resultado.propuesta.durationUnit}`,
          "correcto"
        );

      }


      mostrarPropuestaDeriv(
        resultado.propuestaDeriv,
        resultado.contrato
      );


      if (
        resultado.propuestaDeriv?.ok
      ) {

        registrarActividad(
          `DERIV DEMO → COTIZACIÓN REAL · ${resultado.contrato.contractType} · precio ${resultado.propuestaDeriv.askPrice}`,
          "correcto"
        );


        registrarActividad(
          "COMPRA BLOQUEADA · Solo cotización.",
          "aviso"
        );

      } else {

        registrarActividad(
          `DERIV DEMO → ${resultado.propuestaDeriv?.error || "No se recibió cotización."}`,
          "aviso"
        );

      }


    } catch (error) {

      registrarActividad(
        `Error procesando señal: ${error.message}`,
        "error"
      );

    }

  }
);


window.addEventListener(
  "bot:estado",
  (
    evento
  ) => {

    const datos =
      evento.detail;


    if (
      datos.conectado
    ) {

      UI.estadoBot.textContent =
        "BOT SYNC";


      UI.estadoBot.classList.remove(
        "apagado"
      );


      UI.estadoBot.classList.add(
        "encendido"
      );


      UI.botonConectar.disabled =
        true;


      UI.botonPausar.disabled =
        false;


      registrarActividad(
        datos.mensaje,
        "correcto"
      );

    } else {

      UI.estadoBot.textContent =
        "BOT OFF";


      UI.estadoBot.classList.remove(
        "encendido"
      );


      UI.estadoBot.classList.add(
        "apagado"
      );


      UI.botonConectar.disabled =
        false;


      UI.botonPausar.disabled =
        true;


      registrarActividad(
        datos.mensaje,
        "aviso"
      );

    }

  }
);


window.addEventListener(
  "bot:signal-source",
  (
    evento
  ) => {

    registrarActividad(
      `Señal recibida desde ${evento.detail?.origen || "desconocido"}`,
      "correcto"
    );

  }
);


window.addEventListener(
  "bot:error",
  (
    evento
  ) => {

    registrarActividad(
      evento.detail?.mensaje ||
      "Error de sincronización",
      "error"
    );

  }
);


UI.botonConectar.addEventListener(
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


UI.botonPausar.addEventListener(
  "click",
  () => {

    const estado =
      botEngine.obtenerEstado();


    if (
      !estado.pausado
    ) {

      const resultado =
        botEngine.pausar();


      UI.botonPausar.textContent =
        "REANUDAR";


      registrarActividad(
        resultado.mensaje,
        "aviso"
      );

    } else {

      const resultado =
        botEngine.reanudar();


      UI.botonPausar.textContent =
        "PAUSAR";


      registrarActividad(
        resultado.mensaje,
        "correcto"
      );

    }

  }
);


UI.botonProbar.addEventListener(
  "click",
  () => {

    registrarActividad(
      "Enviando señal DEMO...",
      "aviso"
    );


    signalBridge.recibirSenal(
      {
        id:
          `DEMO-${Date.now()}`,

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
          3,

        metadata:
          {}
      }
    );

  }
);


derivConnection.on(
  "account",
  ({
    accountId
  }) => {

    UI.derivAccountId.value =
      accountId;


    UI.derivCuenta.textContent =
      accountId ||
      "--";


    registrarActividad(
      `Cuenta DEMO detectada · ${accountId}`,
      "correcto"
    );

  }
);


derivConnection.on(
  "state",
  ({
    estado,
    mensaje
  }) => {

    UI.estadoDeriv.textContent =
      mensaje;


    if (
      estado ===
        "connected"
    ) {

      UI.derivConexion.textContent =
        "DEMO CONECTADO";


      UI.derivCuenta.textContent =
        derivConnection
          .obtenerEstado()
          .accountId ||
        "--";


      UI.botonConectarDeriv.disabled =
        true;


      UI.botonDesconectarDeriv.disabled =
        false;


      UI.derivAppId.disabled =
        true;


      UI.derivAccountId.disabled =
        true;


      UI.derivToken.disabled =
        true;


      registrarActividad(
        "Deriv DEMO conectado correctamente.",
        "correcto"
      );

    }


    else if (
      estado ===
        "connecting"
    ) {

      UI.derivConexion.textContent =
        "CONECTANDO";


      UI.botonConectarDeriv.disabled =
        true;


      UI.botonDesconectarDeriv.disabled =
        true;


      registrarActividad(
        mensaje,
        "aviso"
      );

    }


    else {

      UI.derivConexion.textContent =
        "OFF";


      UI.botonConectarDeriv.disabled =
        false;


      UI.botonDesconectarDeriv.disabled =
        true;


      UI.derivAppId.disabled =
        false;


      UI.derivToken.disabled =
        false;


      if (
        estado ===
          "error"
      ) {

        registrarActividad(
          `Deriv: ${mensaje}`,
          "error"
        );

      }

    }

  }
);


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


UI.botonConectarDeriv.addEventListener(
  "click",
  async () => {

    const appId =
      UI.derivAppId.value
        .trim();


    const token =
      UI.derivToken.value
        .trim();


    if (
      !appId
    ) {

      registrarActividad(
        "Falta Deriv App ID.",
        "aviso"
      );


      UI.derivAppId.focus();

      return;

    }


    if (
      !token
    ) {

      registrarActividad(
        "Falta Token PAT.",
        "aviso"
      );


      UI.derivToken.focus();

      return;

    }


    UI.derivAccountId.value =
      "Buscando automáticamente...";


    registrarActividad(
      "Buscando cuenta DEMO y conectando con Deriv...",
      "aviso"
    );


    const resultado =
      await derivConnection.conectarDemo(
        {
          token,
          appId
        }
      );


    if (
      !resultado.ok
    ) {

      UI.derivAccountId.value =
        "Se detectará automáticamente";


      registrarActividad(
        `No se pudo conectar: ${resultado.mensaje}`,
        "error"
      );

    }

  }
);


UI.botonDesconectarDeriv.addEventListener(
  "click",
  () => {

    derivConnection.desconectar();


    UI.derivToken.value =
      "";


    UI.derivAccountId.value =
      "Se detectará automáticamente";


    registrarActividad(
      "Deriv DEMO desconectado.",
      "aviso"
    );

  }
);


window.addEventListener(
  "beforeunload",
  () => {

    derivConnection.desconectar();

  }
);


UI.derivAccountId.value =
  "Se detectará automáticamente";


registrarActividad(
  "BOT V1 MR preparado."
);

registrarActividad(
  "Esperando conexión con Trading Analyzer."
);

registrarActividad(
  "Deriv DEMO todavía desconectado."
);
