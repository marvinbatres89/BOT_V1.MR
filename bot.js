/* ==========================================
   BOT V1 MR
   CONTROLADOR PRINCIPAL
   FIX6

   TRADING ANALYZER
   -> CONTRATO
   -> PROPUESTA DERIV
   -> COMPRA DEMO CONTROLADA
   -> SEGUIMIENTO
   -> RESULTADO FINAL

   SOLO CUENTA DEMO
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


/* ==========================================
   AYUDANTE DOM
   ========================================== */

const $ =
  (id) =>
    document.getElementById(id);


/* ==========================================
   ELEMENTOS DEL BOT
   ========================================== */

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
   ELEMENTOS DERIV
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
   EJECUCIÓN DEMO
   ========================================== */

const botonActivarDemo =
  $("botonActivarDemo");

const botonDesactivarDemo =
  $("botonDesactivarDemo");

const estadoEjecucion =
  $("estadoEjecucion");

const operacionDemo =
  $("operacionDemo");


/* ==========================================
   HORA
   ========================================== */

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
    document.createElement(
      "p"
    );


  linea.textContent =
    `[${obtenerHora()}] ${mensaje}`;


  if (
    tipo === "correcto"
  ) {

    linea.style.color =
      "#79f3c2";

  }


  if (
    tipo === "aviso"
  ) {

    linea.style.color =
      "#ffd37a";

  }


  if (
    tipo === "error"
  ) {

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

  if (!senal) {
    return;
  }


  if (mercado) {

    mercado.textContent =
      senal.mercado ||
      "--";

  }


  if (estrategia) {

    estrategia.textContent =
      senal.estrategia ||
      "--";

  }


  if (direccion) {

    direccion.textContent =
      senal.direccion ||
      "--";

  }


  if (confianza) {

    confianza.textContent =
      `${senal.confianza}%`;

  }


  if (entrada) {

    entrada.textContent =
      senal.segundosEntrada !== null &&
      senal.segundosEntrada !== undefined
        ? `${senal.segundosEntrada} s`
        : "--";

  }


  if (precio) {

    precio.textContent =
      senal.precio !== null &&
      senal.precio !== undefined
        ? senal.precio
        : "--";

  }


  if (!ultimaSenal) {
    return;
  }


  ultimaSenal.innerHTML = `

    <strong>Mercado:</strong>
    ${senal.mercado ?? "--"}
    <br><br>

    <strong>Estrategia:</strong>
    ${senal.estrategia ?? "--"}
    <br>

    <strong>Dirección:</strong>
    ${senal.direccion ?? "--"}
    <br>

    <strong>Confianza:</strong>
    ${senal.confianza ?? "--"}%
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
        ? `${senal.segundosEntrada} segundos`
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

  if (!ultimoContrato) {
    return;
  }


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
    ${contrato.symbol ?? "--"}
    <br><br>

    <strong>Contrato Deriv:</strong>
    ${contrato.contractType ?? "--"}
    <br>

    <strong>Dirección:</strong>
    ${contrato.direction ?? "--"}
    <br>

    <strong>Barrera:</strong>
    ${barrera}
    <br>

    <strong>Confianza:</strong>
    ${contrato.confidence ?? "--"}%
    <br>

    <strong>Segundo:</strong>
    ${contrato.executionSecond ?? "--"}

  `;

}


/* ==========================================
   MOSTRAR PROPUESTA SIMULADA
   ========================================== */

function mostrarPropuestaSimulada(
  propuesta
) {

  if (
    !ultimaPropuesta ||
    !propuesta
  ) {

    return;

  }


  ultimaPropuesta.innerHTML = `

    <strong>Modo:</strong>
    ${propuesta.modo ?? "SIMULACION"}
    <br><br>

    <strong>Contrato:</strong>
    ${propuesta.contractType ?? "--"}
    <br>

    <strong>Monto:</strong>
    ${propuesta.amount ?? "--"}
    ${propuesta.currency ?? ""}
    <br>

    <strong>Duración:</strong>
    ${propuesta.duration ?? "--"}
    ${propuesta.durationUnit ?? ""}
    <br>

    <strong>Estado:</strong>
    ${propuesta.status ?? "--"}
    <br>

    <strong>ID simulación:</strong>
    ${propuesta.id ?? "--"}

  `;

}


/* ==========================================
   MOSTRAR PROPUESTA DERIV
   ========================================== */

function mostrarPropuestaDeriv(
  propuesta,
  contrato
) {

  if (
    !ultimaPropuesta ||
    !propuesta?.ok
  ) {

    return;

  }


  ultimaPropuesta.innerHTML = `

    <strong>Modo:</strong>
    DERIV DEMO REAL
    <br><br>

    <strong>Mercado:</strong>
    ${contrato?.symbol ?? "--"}
    <br>

    <strong>Contrato:</strong>
    ${contrato?.contractType ?? "--"}
    <br>

    <strong>ID propuesta:</strong>
    ${propuesta.id ?? "--"}
    <br><br>

    <strong>Precio solicitado:</strong>
    ${propuesta.askPrice ?? "--"}
    <br>

    <strong>Pago potencial:</strong>
    ${propuesta.payout ?? "--"}
    <br>

    <strong>Spot:</strong>
    ${propuesta.spot ?? "--"}
    <br><br>

    <strong>Estado:</strong>
    COTIZACIÓN REAL RECIBIDA

  `;

}


/* ==========================================
   MOSTRAR OPERACIÓN ABIERTA
   ========================================== */

function mostrarOperacionAbierta(
  compra
) {

  if (!operacionDemo) {
    return;
  }


  operacionDemo.classList.remove(
    "ganada",
    "perdida"
  );


  operacionDemo.innerHTML = `

    <strong>
      OPERACIÓN DEMO ABIERTA
    </strong>

    <br><br>

    <strong>Contract ID:</strong>
    ${compra?.contractId ?? "--"}
    <br>

    <strong>Compra:</strong>
    ${compra?.buyPrice ?? "--"}
    <br>

    <strong>Pago máximo:</strong>
    ${compra?.payout ?? "--"}
    <br><br>

    <strong>Seguimiento:</strong>
    Esperando resultado de Deriv...

  `;

}


/* ==========================================
   ACTUALIZAR SEGUIMIENTO
   ========================================== */

function actualizarOperacion(
  contrato
) {

  if (
    !operacionDemo ||
    !contrato
  ) {

    return;

  }


  const estado =
    String(
      contrato.status ??
      "open"
    )
      .toUpperCase();


  const profit =
    contrato.profit !== undefined
      ? contrato.profit
      : "--";


  operacionDemo.innerHTML = `

    <strong>
      OPERACIÓN DEMO EN SEGUIMIENTO
    </strong>

    <br><br>

    <strong>Contract ID:</strong>
    ${contrato.contract_id ?? "--"}
    <br>

    <strong>Estado:</strong>
    ${estado}
    <br>

    <strong>Profit actual:</strong>
    ${profit}

  `;

}


/* ==========================================
   RESULTADO FINAL
   ========================================== */

function mostrarResultado(
  resultado
) {

  if (
    !operacionDemo ||
    !resultado
  ) {

    return;

  }


  const profit =
    Number(
      resultado.profit ??
      0
    );


  const ganada =
    profit > 0;


  operacionDemo.classList.remove(
    "ganada",
    "perdida"
  );


  operacionDemo.classList.add(
    ganada
      ? "ganada"
      : "perdida"
  );


  operacionDemo.innerHTML = `

    <div
      class="${
        ganada
          ? "resultado-ganado"
          : "resultado-perdido"
      }"
    >
      ${
        ganada
          ? "GANADA"
          : "PERDIDA"
      }
    </div>

    <br>

    <strong>Contract ID:</strong>
    ${resultado.contractId ?? "--"}
    <br>

    <strong>Profit:</strong>
    ${profit}
    <br>

    <strong>Compra:</strong>
    ${resultado.buyPrice ?? "--"}
    <br>

    <strong>Cierre:</strong>
    ${resultado.sellPrice ?? "--"}
    <br>

    <strong>Fuente:</strong>
    ${resultado.source ?? "--"}

  `;

}


/* ==========================================
   SEÑAL RECIBIDA
   ========================================== */

signalBridge.onSenal(
  async (senal) => {

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
          senal,
          {
            onOperacionUpdate:
              actualizarOperacion
          }
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


        registrarActividad(
          `CONTRATO → ${resultado.contrato.contractType}`,
          "correcto"
        );

      }


      if (
        resultado.propuesta
      ) {

        mostrarPropuestaSimulada(
          resultado.propuesta
        );

      }


      if (
        resultado.propuestaDeriv?.ok
      ) {

        mostrarPropuestaDeriv(
          resultado.propuestaDeriv,
          resultado.contrato
        );


        registrarActividad(
          `DERIV DEMO → COTIZACIÓN REAL · ${resultado.contrato.contractType} · ${resultado.propuestaDeriv.askPrice}`,
          "correcto"
        );

      } else {

        registrarActividad(
          `DERIV DEMO → ${resultado.propuestaDeriv?.error || "Sin cotización."}`,
          "aviso"
        );

      }


      if (
        resultado.compraDemo?.ok
      ) {

        mostrarOperacionAbierta(
          resultado.compraDemo.compra
        );


        registrarActividad(
          `BUY DEMO OK · Contract ID ${resultado.compraDemo.compra.contractId}`,
          "correcto"
        );

      }


      if (
        resultado.compraDemo &&
        !resultado.compraDemo.ok
      ) {

        registrarActividad(
          `BUY DEMO RECHAZADO · ${resultado.compraDemo.error}`,
          "error"
        );

      }


      if (
        resultado.resultadoDemo?.contractId
      ) {

        mostrarResultado(
          resultado.resultadoDemo
        );


        registrarActividad(
          `${Number(resultado.resultadoDemo.profit) > 0 ? "GANADA" : "PERDIDA"} · PROFIT ${resultado.resultadoDemo.profit}`,
          Number(resultado.resultadoDemo.profit) > 0
            ? "correcto"
            : "error"
        );

      }


      else if (
        resultado.resultadoDemo?.ok ===
          false
      ) {

        if (operacionDemo) {

          operacionDemo.innerHTML += `

            <br><br>

            <strong>
              Seguimiento pendiente
            </strong>

            <br>

            ${
              resultado.resultadoDemo.error ??
              "No se recibió resultado final."
            }

          `;

        }


        registrarActividad(
          `SEGUIMIENTO → ${resultado.resultadoDemo.error}`,
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


/* ==========================================
   PUENTE
   ========================================== */

window.addEventListener(
  "bot:estado",
  (evento) => {

    const datos =
      evento.detail;


    if (
      datos.conectado
    ) {

      if (estadoBot) {

        estadoBot.textContent =
          "BOT SYNC";

        estadoBot.classList.remove(
          "apagado"
        );

        estadoBot.classList.add(
          "encendido"
        );

      }


      if (botonConectar) {

        botonConectar.disabled =
          true;

      }


      if (botonPausar) {

        botonPausar.disabled =
          false;

      }


      registrarActividad(
        datos.mensaje,
        "correcto"
      );

    } else {

      if (estadoBot) {

        estadoBot.textContent =
          "BOT OFF";

        estadoBot.classList.remove(
          "encendido"
        );

        estadoBot.classList.add(
          "apagado"
        );

      }


      if (botonConectar) {

        botonConectar.disabled =
          false;

      }


      if (botonPausar) {

        botonPausar.disabled =
          true;

      }


      registrarActividad(
        datos.mensaje,
        "aviso"
      );

    }

  }
);


/* ==========================================
   ORIGEN DE SEÑAL
   ========================================== */

window.addEventListener(
  "bot:signal-source",
  (evento) => {

    registrarActividad(
      `Señal recibida desde ${evento.detail?.origen || "desconocido"}`,
      "correcto"
    );

  }
);


/* ==========================================
   ERROR PUENTE
   ========================================== */

window.addEventListener(
  "bot:error",
  (evento) => {

    registrarActividad(
      evento.detail?.mensaje ||
      "Error de sincronización.",
      "error"
    );

  }
);


/* ==========================================
   CONECTAR PUENTE
   ========================================== */

if (botonConectar) {

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

}


/* ==========================================
   PAUSAR
   ========================================== */

if (botonPausar) {

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

}


/* ==========================================
   SEÑAL DE PRUEBA
   ========================================== */

if (botonProbar) {

  botonProbar.addEventListener(
    "click",
    () => {

      registrarActividad(
        "Enviando señal DEMO...",
        "aviso"
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

}


/* ==========================================
   CUENTA DERIV DETECTADA
   ========================================== */

derivConnection.on(
  "account",
  ({
    accountId
  }) => {

    if (
      derivAccountId
    ) {

      derivAccountId.value =
        accountId;

    }


    if (derivCuenta) {

      derivCuenta.textContent =
        accountId ||
        "--";

    }


    registrarActividad(
      `Cuenta DEMO detectada · ${accountId}`,
      "correcto"
    );

  }
);


/* ==========================================
   ESTADO DERIV
   ========================================== */

derivConnection.on(
  "state",
  ({
    estado,
    mensaje
  }) => {

    if (estadoDeriv) {

      estadoDeriv.textContent =
        mensaje;

    }


    if (
      estado === "connected"
    ) {

      if (derivConexion) {

        derivConexion.textContent =
          "DEMO CONECTADO";

      }


      if (derivCuenta) {

        derivCuenta.textContent =
          derivConnection
            .obtenerEstado()
            .accountId ||
          "--";

      }


      if (botonConectarDeriv) {

        botonConectarDeriv.disabled =
          true;

      }


      if (botonDesconectarDeriv) {

        botonDesconectarDeriv.disabled =
          false;

      }


      if (botonActivarDemo) {

        botonActivarDemo.disabled =
          false;

      }


      if (derivAppId) {

        derivAppId.disabled =
          true;

      }


      if (derivAccountId) {

        derivAccountId.disabled =
          true;

      }


      if (derivToken) {

        derivToken.disabled =
          true;

      }


      registrarActividad(
        "Deriv DEMO conectado correctamente.",
        "correcto"
      );

    }


    else if (
      estado === "connecting"
    ) {

      if (derivConexion) {

        derivConexion.textContent =
          "CONECTANDO";

      }


      if (botonConectarDeriv) {

        botonConectarDeriv.disabled =
          true;

      }


      if (botonDesconectarDeriv) {

        botonDesconectarDeriv.disabled =
          true;

      }

    }


    else {

      if (derivConexion) {

        derivConexion.textContent =
          "OFF";

      }


      if (botonConectarDeriv) {

        botonConectarDeriv.disabled =
          false;

      }


      if (botonDesconectarDeriv) {

        botonDesconectarDeriv.disabled =
          true;

      }


      if (botonActivarDemo) {

        botonActivarDemo.disabled =
          true;

      }


      if (botonDesactivarDemo) {

        botonDesactivarDemo.disabled =
          true;

      }


      if (estadoEjecucion) {

        estadoEjecucion.textContent =
          "DESACTIVADA";

      }


      if (derivAppId) {

        derivAppId.disabled =
          false;

      }


      if (derivToken) {

        derivToken.disabled =
          false;

      }


      botEngine
        .desactivarEjecucionDemo();


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
   ERROR DERIV
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
   CONECTAR DERIV
   ========================================== */

if (botonConectarDeriv) {

  botonConectarDeriv.addEventListener(
    "click",
    async () => {

      const appId =
        derivAppId?.value
          ?.trim() ||
        "";


      const token =
        derivToken?.value
          ?.trim() ||
        "";


      if (!appId) {

        registrarActividad(
          "Falta Deriv App ID.",
          "aviso"
        );

        derivAppId?.focus();

        return;

      }


      if (!token) {

        registrarActividad(
          "Falta Token PAT.",
          "aviso"
        );

        derivToken?.focus();

        return;

      }


      if (derivAccountId) {

        derivAccountId.value =
          "Buscando automáticamente...";

        derivAccountId.disabled =
          true;

      }


      registrarActividad(
        "Buscando cuenta DEMO y conectando con Deriv...",
        "aviso"
      );


      const resultado =
        await derivConnection.conectarDemo({
          token,
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

}


/* ==========================================
   DESCONECTAR DERIV
   ========================================== */

if (botonDesconectarDeriv) {

  botonDesconectarDeriv.addEventListener(
    "click",
    () => {

      botEngine
        .desactivarEjecucionDemo();


      derivConnection
        .desconectar();


      if (derivToken) {

        derivToken.value =
          "";

      }


      registrarActividad(
        "Deriv DEMO desconectado.",
        "aviso"
      );

    }
  );

}


/* ==========================================
   ACTIVAR COMPRA DEMO
   ========================================== */

if (botonActivarDemo) {

  botonActivarDemo.addEventListener(
    "click",
    () => {

      const resultado =
        botEngine
          .activarEjecucionDemo();


      if (!resultado.ok) {

        registrarActividad(
          resultado.mensaje,
          "error"
        );

        return;

      }


      botonActivarDemo.disabled =
        true;


      if (botonDesactivarDemo) {

        botonDesactivarDemo.disabled =
          false;

      }


      if (estadoEjecucion) {

        estadoEjecucion.textContent =
          "ACTIVA · SOLO DEMO";

      }


      registrarActividad(
        "EJECUCIÓN DEMO ACTIVADA.",
        "correcto"
      );

    }
  );

}


/* ==========================================
   DESACTIVAR COMPRA DEMO
   ========================================== */

if (botonDesactivarDemo) {

  botonDesactivarDemo.addEventListener(
    "click",
    () => {

      const resultado =
        botEngine
          .desactivarEjecucionDemo();


      botonDesactivarDemo.disabled =
        true;


      if (botonActivarDemo) {

        botonActivarDemo.disabled =
          !derivConnection
            .obtenerEstado()
            .connected;

      }


      if (estadoEjecucion) {

        estadoEjecucion.textContent =
          "DESACTIVADA";

      }


      registrarActividad(
        resultado.mensaje,
        "aviso"
      );

    }
  );

}


/* ==========================================
   CERRAR PÁGINA
   ========================================== */

window.addEventListener(
  "beforeunload",
  () => {

    botEngine
      .desactivarEjecucionDemo();


    derivConnection
      .desconectar();

  }
);


/* ==========================================
   ESTADO INICIAL
   ========================================== */

if (derivAccountId) {

  derivAccountId.value =
    "Se detectará automáticamente";

  derivAccountId.disabled =
    true;

}


if (botonActivarDemo) {

  botonActivarDemo.disabled =
    true;

}


if (botonDesactivarDemo) {

  botonDesactivarDemo.disabled =
    true;

}


if (estadoEjecucion) {

  estadoEjecucion.textContent =
    "DESACTIVADA";

}


registrarActividad(
  "BOT V1 MR FIX6 preparado."
);


registrarActividad(
  "Esperando conexión con Trading Analyzer."
);


registrarActividad(
  "Ejecución DEMO desactivada por seguridad."
);
