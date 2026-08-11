/* ==========================================
   BOT V1 MR
   CONTROLADOR PRINCIPAL
   FIX7 - CALIBRADOR VISUAL

   CONSERVA:
   - SINCRONIZACIÓN
   - DERIV DEMO
   - COTIZACIÓN
   - BUY DEMO
   - RESULTADO

   AGREGA:
   - PANEL VISUAL DE LATENCIA
   - ESTADÍSTICAS STANDARD
   - ESTADÍSTICAS 1S
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
    document.getElementById(id);


/* ==========================================
   UI
   ========================================== */

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

  ultimaPropuesta:
    $("ultimaPropuesta"),

  operacionDemo:
    $("operacionDemo"),

  resultadoDemo:
    $("resultadoDemo"),

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
    $("derivConexion"),


  estadoEjecucion:
    $("estadoEjecucion"),

  botonActivarDemo:
    $("botonActivarDemo"),

  botonDesactivarDemo:
    $("botonDesactivarDemo"),


  /* FIX7 */

  calibradorFamilia:
    $("calibradorFamilia"),

  calibradorPunto:
    $("calibradorPunto"),

  calibradorReferencia:
    $("calibradorReferencia"),

  calibradorSignalBuy:
    $("calibradorSignalBuy"),

  calibradorPropuesta:
    $("calibradorPropuesta"),

  calibradorBuy:
    $("calibradorBuy"),

  calibradorConfirmacion:
    $("calibradorConfirmacion"),

  calibradorResultado:
    $("calibradorResultado"),


  standardPruebas:
    $("standardPruebas"),

  standardGanadas:
    $("standardGanadas"),

  standardPerdidas:
    $("standardPerdidas"),

  standardAccuracy:
    $("standardAccuracy"),

  standardLatencia:
    $("standardLatencia"),


  oneSecondPruebas:
    $("oneSecondPruebas"),

  oneSecondGanadas:
    $("oneSecondGanadas"),

  oneSecondPerdidas:
    $("oneSecondPerdidas"),

  oneSecondAccuracy:
    $("oneSecondAccuracy"),

  oneSecondLatencia:
    $("oneSecondLatencia")

};


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

  if (!UI.registroBot) {
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


  UI.registroBot.prepend(
    linea
  );

}


/* ==========================================
   FORMATO MS
   ========================================== */

function formatoMs(
  valor
) {

  const numero =
    Number(
      valor
    );


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return "--";

  }


  return `${numero.toFixed(2)} ms`;

}


/* ==========================================
   MOSTRAR SEÑAL
   ========================================== */

function mostrarSenal(
  senal
) {

  if (
    UI.mercado
  ) {

    UI.mercado.textContent =
      senal.mercado ||
      "--";

  }


  if (
    UI.estrategia
  ) {

    UI.estrategia.textContent =
      senal.estrategia ||
      "--";

  }


  if (
    UI.direccion
  ) {

    UI.direccion.textContent =
      senal.direccion ||
      "--";

  }


  if (
    UI.confianza
  ) {

    UI.confianza.textContent =
      `${senal.confianza}%`;

  }


  if (
    UI.entrada
  ) {

    UI.entrada.textContent =
      senal.segundosEntrada !==
        null &&
      senal.segundosEntrada !==
        undefined
        ? `${senal.segundosEntrada} s`
        : "--";

  }


  if (
    UI.precio
  ) {

    UI.precio.textContent =
      senal.precio !==
        null &&
      senal.precio !==
        undefined
        ? senal.precio
        : "--";

  }


  if (
    UI.ultimaSenal
  ) {

    UI.ultimaSenal.innerHTML = `

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
        senal.segundosEntrada !==
          null &&
        senal.segundosEntrada !==
          undefined
          ? `${senal.segundosEntrada} segundos`
          : "--"
      }

    `;

  }

}


/* ==========================================
   CONTRATO
   ========================================== */

function mostrarContrato(
  contrato
) {

  if (
    !UI.ultimoContrato ||
    !contrato
  ) {

    return;

  }


  UI.ultimoContrato.innerHTML = `

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
    ${contrato.barrier ?? "--"}
    <br>

    <strong>Confianza:</strong>
    ${contrato.confidence ?? "--"}%
    <br>

    <strong>Segundo:</strong>
    ${contrato.executionSecond ?? "--"}

  `;

}


/* ==========================================
   PROPUESTA
   ========================================== */

function mostrarPropuestaDeriv(
  propuesta,
  contrato
) {

  if (
    !UI.ultimaPropuesta
  ) {

    return;

  }


  if (
    !propuesta?.ok
  ) {

    UI.ultimaPropuesta.innerHTML = `

      <strong>Estado:</strong>
      SIN COTIZACIÓN
      <br><br>

      <strong>Motivo:</strong>
      ${propuesta?.error || "--"}

    `;

    return;

  }


  UI.ultimaPropuesta.innerHTML = `

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

    <strong>Precio:</strong>
    ${propuesta.askPrice ?? "--"}
    <br>

    <strong>Pago potencial:</strong>
    ${propuesta.payout ?? "--"}
    <br>

    <strong>Spot:</strong>
    ${propuesta.spot ?? "--"}
    <br>

    <strong>Estado:</strong>
    COTIZACIÓN REAL RECIBIDA

  `;

}


/* ==========================================
   COMPRA DEMO
   ========================================== */

function mostrarCompraDemo(
  compra
) {

  if (
    !UI.operacionDemo
  ) {

    return;

  }


  if (
    !compra?.ok
  ) {

    UI.operacionDemo.innerHTML = `

      <strong>
        Compra DEMO no ejecutada.
      </strong>

      <br><br>

      ${compra?.error || "--"}

    `;

    return;

  }


  const dato =
    compra.compra;


  UI.operacionDemo.innerHTML = `

    <strong>
      OPERACIÓN DEMO ABIERTA
    </strong>

    <br><br>

    <strong>Contract ID:</strong>
    ${dato.contractId ?? "--"}
    <br>

    <strong>Transaction ID:</strong>
    ${dato.transactionId ?? "--"}
    <br>

    <strong>Compra:</strong>
    ${dato.buyPrice ?? "--"} USD
    <br>

    <strong>Pago máximo:</strong>
    ${dato.payout ?? "--"}
    <br>

    <strong>Descripción:</strong>
    ${dato.longcode || "--"}

  `;

}


/* ==========================================
   ACTUALIZACIÓN
   ========================================== */

function mostrarActualizacionContrato(
  contrato
) {

  if (
    !UI.operacionDemo ||
    !contrato
  ) {

    return;

  }


  UI.operacionDemo.innerHTML = `

    <strong>
      OPERACIÓN DEMO EN SEGUIMIENTO
    </strong>

    <br><br>

    <strong>Contract ID:</strong>
    ${contrato.contract_id ?? "--"}
    <br>

    <strong>Estado:</strong>
    ${String(
      contrato.status ??
      "OPEN"
    ).toUpperCase()}
    <br>

    <strong>Profit actual:</strong>
    ${contrato.profit ?? "--"}

  `;

}


/* ==========================================
   RESULTADO
   ========================================== */

function mostrarResultadoDemo(
  resultado
) {

  if (
    !UI.resultadoDemo
  ) {

    return;

  }


  if (
    !resultado?.ok
  ) {

    UI.resultadoDemo.innerHTML = `

      <strong>
        Seguimiento pendiente
      </strong>

      <br><br>

      ${resultado?.error || "--"}

    `;

    return;

  }


  const dato =
    resultado.resultado;


  const profit =
    Number(
      dato.profit ??
      0
    );


  const ganada =
    profit > 0;


  UI.resultadoDemo.classList.remove(
    "ganada",
    "perdida"
  );


  UI.resultadoDemo.classList.add(
    ganada
      ? "ganada"
      : "perdida"
  );


  UI.resultadoDemo.innerHTML = `

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
    ${dato.contractId ?? "--"}
    <br>

    <strong>Profit:</strong>
    ${profit}
    <br>

    <strong>Compra:</strong>
    ${dato.buyPrice ?? "--"}
    <br>

    <strong>Cierre:</strong>
    ${dato.sellPrice ?? "--"}
    <br>

    <strong>Fuente:</strong>
    ${dato.source ?? "--"}

  `;

}


/* ==========================================
   FIX7
   PANEL CALIBRADOR
   ========================================== */

function mostrarTelemetria(
  telemetria
) {

  if (
    !telemetria
  ) {

    return;

  }


  if (
    UI.calibradorFamilia
  ) {

    UI.calibradorFamilia.textContent =
      telemetria.familiaMercado ??
      "--";

  }


  if (
    UI.calibradorPunto
  ) {

    UI.calibradorPunto.textContent =
      telemetria.puntoEntrada ??
      "--";

  }


  if (
    UI.calibradorReferencia
  ) {

    UI.calibradorReferencia.textContent =
      telemetria.retrasoReferenciaSeg !==
        null &&
      telemetria.retrasoReferenciaSeg !==
        undefined
        ? `${telemetria.retrasoReferenciaSeg} s`
        : "--";

  }


  if (
    UI.calibradorSignalBuy
  ) {

    UI.calibradorSignalBuy.textContent =
      formatoMs(
        telemetria.signalToBuyMs
      );

  }


  if (
    UI.calibradorPropuesta
  ) {

    UI.calibradorPropuesta.textContent =
      formatoMs(
        telemetria.proposalLatencyMs
      );

  }


  if (
    UI.calibradorBuy
  ) {

    UI.calibradorBuy.textContent =
      formatoMs(
        telemetria.buyLatencyMs
      );

  }


  if (
    UI.calibradorConfirmacion
  ) {

    UI.calibradorConfirmacion.textContent =
      formatoMs(
        telemetria.signalToBuyConfirmMs
      );

  }


  if (
    UI.calibradorResultado
  ) {

    UI.calibradorResultado.textContent =
      telemetria.resultado ??
      "--";

  }


  registrarActividad(
    `FIX7 · ${telemetria.familiaMercado} · PUNTO ${telemetria.puntoEntrada ?? "--"} · Señal→BUY ${formatoMs(
      telemetria.signalToBuyMs
    )}`,
    "aviso"
  );

}


/* ==========================================
   RESUMEN STANDARD
   ========================================== */

function mostrarResumenStandard(
  resumen
) {

  if (
    !resumen
  ) {

    return;

  }


  if (
    UI.standardPruebas
  ) {

    UI.standardPruebas.textContent =
      resumen.pruebas;

  }


  if (
    UI.standardGanadas
  ) {

    UI.standardGanadas.textContent =
      resumen.ganadas;

  }


  if (
    UI.standardPerdidas
  ) {

    UI.standardPerdidas.textContent =
      resumen.perdidas;

  }


  if (
    UI.standardAccuracy
  ) {

    UI.standardAccuracy.textContent =
      resumen.accuracy !== null
        ? `${resumen.accuracy}%`
        : "--";

  }


  if (
    UI.standardLatencia
  ) {

    UI.standardLatencia.textContent =
      formatoMs(
        resumen.promedioSignalToBuyMs
      );

  }

}


/* ==========================================
   RESUMEN 1S
   ========================================== */

function mostrarResumen1S(
  resumen
) {

  if (
    !resumen
  ) {

    return;

  }


  if (
    UI.oneSecondPruebas
  ) {

    UI.oneSecondPruebas.textContent =
      resumen.pruebas;

  }


  if (
    UI.oneSecondGanadas
  ) {

    UI.oneSecondGanadas.textContent =
      resumen.ganadas;

  }


  if (
    UI.oneSecondPerdidas
  ) {

    UI.oneSecondPerdidas.textContent =
      resumen.perdidas;

  }


  if (
    UI.oneSecondAccuracy
  ) {

    UI.oneSecondAccuracy.textContent =
      resumen.accuracy !== null
        ? `${resumen.accuracy}%`
        : "--";

  }


  if (
    UI.oneSecondLatencia
  ) {

    UI.oneSecondLatencia.textContent =
      formatoMs(
        resumen.promedioSignalToBuyMs
      );

  }

}


/* ==========================================
   ACTUALIZAR RESÚMENES
   ========================================== */

function actualizarResumenes() {

  const estado =
    botEngine.obtenerEstado();


  mostrarResumenStandard(
    estado.resumenStandard
  );


  mostrarResumen1S(
    estado.resumen1S
  );

}


/* ==========================================
   EJECUCIÓN DEMO
   ========================================== */

function renderEjecucionDemo() {

  const estado =
    botEngine
      .obtenerEstado()
      .trade;


  const activa =
    Boolean(
      estado.ejecucionActiva
    );


  if (
    UI.estadoEjecucion
  ) {

    UI.estadoEjecucion.textContent =
      activa
        ? "EJECUCIÓN DEMO ON"
        : "EJECUCIÓN DEMO OFF";

  }


  if (
    UI.botonActivarDemo
  ) {

    UI.botonActivarDemo.disabled =
      activa ||
      !derivConnection
        .obtenerEstado()
        .connected;

  }


  if (
    UI.botonDesactivarDemo
  ) {

    UI.botonDesactivarDemo.disabled =
      !activa;

  }

}


/* ==========================================
   RECIBIR SEÑAL
   ========================================== */

signalBridge.onSenal(
  async (
    senal
  ) => {

    const senalRecibidaPerf =
      typeof performance !==
        "undefined"
        ? performance.now()
        : Date.now();


    mostrarSenal(
      senal
    );


    registrarActividad(
      "Procesando señal FIX7...",
      "aviso"
    );


    try {

      const resultado =
        await botEngine.procesarSenal(
          senal,
          {

            onOperacionUpdate:
              mostrarActualizacionContrato,

            senalRecibidaPerf

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


      mostrarContrato(
        resultado.contrato
      );


      mostrarPropuestaDeriv(
        resultado.propuestaDeriv,
        resultado.contrato
      );


      if (
        resultado.compraDemo
      ) {

        mostrarCompraDemo(
          resultado.compraDemo
        );

      }


      if (
        resultado.resultadoDemo
      ) {

        mostrarResultadoDemo(
          resultado.resultadoDemo
        );

      }


      mostrarTelemetria(
        resultado.telemetria
      );


      actualizarResumenes();


      if (
        resultado.resultadoDemo?.ok
      ) {

        const profit =
          Number(
            resultado
              .resultadoDemo
              .resultado
              .profit
          );


        registrarActividad(
          `${profit > 0 ? "GANADA" : "PERDIDA"} · PROFIT ${profit}`,
          profit > 0
            ? "correcto"
            : "error"
        );

      }


    } catch (
      error
    ) {

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
  (
    evento
  ) => {

    const datos =
      evento.detail;


    if (
      datos.conectado
    ) {

      if (
        UI.estadoBot
      ) {

        UI.estadoBot.textContent =
          "BOT SYNC";

        UI.estadoBot.classList.remove(
          "apagado"
        );

        UI.estadoBot.classList.add(
          "encendido"
        );

      }


      if (
        UI.botonConectar
      ) {

        UI.botonConectar.disabled =
          true;

      }


      if (
        UI.botonPausar
      ) {

        UI.botonPausar.disabled =
          false;

      }


      registrarActividad(
        datos.mensaje,
        "correcto"
      );

    } else {

      if (
        UI.estadoBot
      ) {

        UI.estadoBot.textContent =
          "BOT OFF";

        UI.estadoBot.classList.remove(
          "encendido"
        );

        UI.estadoBot.classList.add(
          "apagado"
        );

      }


      if (
        UI.botonConectar
      ) {

        UI.botonConectar.disabled =
          false;

      }


      if (
        UI.botonPausar
      ) {

        UI.botonPausar.disabled =
          true;

      }

    }

  }
);


/* ==========================================
   ORIGEN
   ========================================== */

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


/* ==========================================
   ERROR PUENTE
   ========================================== */

window.addEventListener(
  "bot:error",
  (
    evento
  ) => {

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

if (
  UI.botonConectar
) {

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

}


/* ==========================================
   PAUSAR
   ========================================== */

if (
  UI.botonPausar
) {

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

}


/* ==========================================
   ACTIVAR DEMO
   ========================================== */

if (
  UI.botonActivarDemo
) {

  UI.botonActivarDemo.addEventListener(
    "click",
    () => {

      const resultado =
        botEngine
          .activarEjecucionDemo();


      registrarActividad(
        resultado.mensaje,
        resultado.ok
          ? "correcto"
          : "aviso"
      );


      renderEjecucionDemo();

    }
  );

}


/* ==========================================
   DESACTIVAR DEMO
   ========================================== */

if (
  UI.botonDesactivarDemo
) {

  UI.botonDesactivarDemo.addEventListener(
    "click",
    () => {

      const resultado =
        botEngine
          .desactivarEjecucionDemo();


      registrarActividad(
        resultado.mensaje,
        "aviso"
      );


      renderEjecucionDemo();

    }
  );

}


/* ==========================================
   PRUEBA INTERNA
   ========================================== */

if (
  UI.botonProbar
) {

  UI.botonProbar.addEventListener(
    "click",
    () => {

      registrarActividad(
        "Enviando señal DEMO FIX7...",
        "aviso"
      );


      signalBridge.recibirSenal({

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
          10,

        modo:
          "FIX7_TEST",

        metadata:
          {}

      });

    }
  );

}


/* ==========================================
   CUENTA DEMO
   ========================================== */

derivConnection.on(
  "account",
  ({
    accountId
  }) => {

    if (
      UI.derivAccountId
    ) {

      UI.derivAccountId.value =
        accountId;

    }


    if (
      UI.derivCuenta
    ) {

      UI.derivCuenta.textContent =
        accountId ||
        "--";

    }


    registrarActividad(
      `Cuenta DEMO verificada · ${accountId}`,
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

    if (
      UI.estadoDeriv
    ) {

      UI.estadoDeriv.textContent =
        mensaje;

    }


    if (
      estado === "connected"
    ) {

      if (
        UI.derivConexion
      ) {

        UI.derivConexion.textContent =
          "DEMO CONECTADO";

      }


      if (
        UI.botonConectarDeriv
      ) {

        UI.botonConectarDeriv.disabled =
          true;

      }


      if (
        UI.botonDesconectarDeriv
      ) {

        UI.botonDesconectarDeriv.disabled =
          false;

      }


      if (
        UI.derivAppId
      ) {

        UI.derivAppId.disabled =
          true;

      }


      if (
        UI.derivToken
      ) {

        UI.derivToken.disabled =
          true;

      }


      renderEjecucionDemo();


      registrarActividad(
        "Deriv DEMO conectado correctamente.",
        "correcto"
      );

    }


    else if (
      estado === "connecting"
    ) {

      if (
        UI.derivConexion
      ) {

        UI.derivConexion.textContent =
          "CONECTANDO";

      }

    }


    else {

      if (
        UI.derivConexion
      ) {

        UI.derivConexion.textContent =
          "OFF";

      }


      if (
        UI.botonConectarDeriv
      ) {

        UI.botonConectarDeriv.disabled =
          false;

      }


      if (
        UI.botonDesconectarDeriv
      ) {

        UI.botonDesconectarDeriv.disabled =
          true;

      }


      if (
        UI.derivAppId
      ) {

        UI.derivAppId.disabled =
          false;

      }


      if (
        UI.derivToken
      ) {

        UI.derivToken.disabled =
          false;

      }


      botEngine
        .desactivarEjecucionDemo();


      renderEjecucionDemo();


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

if (
  UI.botonConectarDeriv
) {

  UI.botonConectarDeriv.addEventListener(
    "click",
    async () => {

      const appId =
        UI.derivAppId?.value
          ?.trim() ||
        "";


      const token =
        UI.derivToken?.value
          ?.trim() ||
        "";


      if (
        !appId
      ) {

        registrarActividad(
          "Falta Deriv App ID.",
          "aviso"
        );

        return;

      }


      if (
        !token
      ) {

        registrarActividad(
          "Falta Token PAT.",
          "aviso"
        );

        return;

      }


      registrarActividad(
        "Buscando cuenta DEMO y conectando con Deriv...",
        "aviso"
      );


      const resultado =
        await derivConnection
          .conectarDemo({
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
   DESCONECTAR
   ========================================== */

if (
  UI.botonDesconectarDeriv
) {

  UI.botonDesconectarDeriv.addEventListener(
    "click",
    () => {

      botEngine
        .desactivarEjecucionDemo();


      derivConnection
        .desconectar();


      if (
        UI.derivToken
      ) {

        UI.derivToken.value =
          "";

      }


      renderEjecucionDemo();

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
   INICIO
   ========================================== */

if (
  UI.derivAccountId
) {

  UI.derivAccountId.value =
    "Se detectará automáticamente";

}


renderEjecucionDemo();


actualizarResumenes();


registrarActividad(
  "BOT V1 MR FIX7 preparado."
);


registrarActividad(
  "Calibrador visual activado."
);


registrarActividad(
  "Mercados STANDARD y 1S separados."
);


registrarActividad(
  "Ejecución DEMO desactivada por defecto."
);
