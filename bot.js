/* ==========================================
   BOT V1 MR
   BOT.JS
   FIX8 - ESTADÍSTICAS POR MERCADO
   + RESULTADO FINAL CORREGIDO

   CONSERVA:
   - PUENTE
   - DERIV DEMO
   - COTIZACIÓN
   - BUY
   - SEGUIMIENTO
   - TELEMETRÍA

   AGREGA:
   - 10 MERCADOS INDIVIDUALES
   - TABLAS STANDARD / 1S
   - RESULTADO FINAL ROBUSTO
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

  calibradorFamilia:
    $("calibradorFamilia"),

  calibradorMercado:
    $("calibradorMercado"),

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

  calibradorResultado:
    $("calibradorResultado")

};


/* ==========================================
   FILAS DE MERCADO
   ========================================== */

const FILAS_MERCADO = {

  R_10: {

    pruebas:
      $("r10Pruebas"),

    ganadas:
      $("r10Ganadas"),

    perdidas:
      $("r10Perdidas"),

    accuracy:
      $("r10Accuracy"),

    latencia:
      $("r10Latencia")

  },

  R_25: {

    pruebas:
      $("r25Pruebas"),

    ganadas:
      $("r25Ganadas"),

    perdidas:
      $("r25Perdidas"),

    accuracy:
      $("r25Accuracy"),

    latencia:
      $("r25Latencia")

  },

  R_50: {

    pruebas:
      $("r50Pruebas"),

    ganadas:
      $("r50Ganadas"),

    perdidas:
      $("r50Perdidas"),

    accuracy:
      $("r50Accuracy"),

    latencia:
      $("r50Latencia")

  },

  R_75: {

    pruebas:
      $("r75Pruebas"),

    ganadas:
      $("r75Ganadas"),

    perdidas:
      $("r75Perdidas"),

    accuracy:
      $("r75Accuracy"),

    latencia:
      $("r75Latencia")

  },

  R_100: {

    pruebas:
      $("r100Pruebas"),

    ganadas:
      $("r100Ganadas"),

    perdidas:
      $("r100Perdidas"),

    accuracy:
      $("r100Accuracy"),

    latencia:
      $("r100Latencia")

  },

  "1HZ10V": {

    pruebas:
      $("hz10Pruebas"),

    ganadas:
      $("hz10Ganadas"),

    perdidas:
      $("hz10Perdidas"),

    accuracy:
      $("hz10Accuracy"),

    latencia:
      $("hz10Latencia")

  },

  "1HZ25V": {

    pruebas:
      $("hz25Pruebas"),

    ganadas:
      $("hz25Ganadas"),

    perdidas:
      $("hz25Perdidas"),

    accuracy:
      $("hz25Accuracy"),

    latencia:
      $("hz25Latencia")

  },

  "1HZ50V": {

    pruebas:
      $("hz50Pruebas"),

    ganadas:
      $("hz50Ganadas"),

    perdidas:
      $("hz50Perdidas"),

    accuracy:
      $("hz50Accuracy"),

    latencia:
      $("hz50Latencia")

  },

  "1HZ75V": {

    pruebas:
      $("hz75Pruebas"),

    ganadas:
      $("hz75Ganadas"),

    perdidas:
      $("hz75Perdidas"),

    accuracy:
      $("hz75Accuracy"),

    latencia:
      $("hz75Latencia")

  },

  "1HZ100V": {

    pruebas:
      $("hz100Pruebas"),

    ganadas:
      $("hz100Ganadas"),

    perdidas:
      $("hz100Perdidas"),

    accuracy:
      $("hz100Accuracy"),

    latencia:
      $("hz100Latencia")

  }

};


/* ==========================================
   TIEMPO
   ========================================== */

function ahoraPreciso() {

  if (
    typeof performance !==
      "undefined" &&
    typeof performance.now ===
      "function"
  ) {

    return performance.now();

  }


  return Date.now();

}


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
   FORMATO
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


function formatoPorcentaje(
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


  return `${numero.toFixed(1)}%`;

}


/* ==========================================
   SEÑAL
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
      Number.isFinite(
        Number(
          senal.confianza
        )
      )
        ? `${Number(
            senal.confianza
          )}%`
        : "--";

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
        ? String(
            senal.precio
          )
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

      <strong>Punto de entrada:</strong>
      ${senal.segundosEntrada ?? "--"}

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

    <strong>Punto:</strong>
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
      ${
        propuesta?.error ||
        "No se recibió cotización."
      }

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
   COMPRA
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
        Compra DEMO no ejecutada
      </strong>

      <br><br>

      ${
        compra?.error ||
        "Ejecución DEMO desactivada."
      }

    `;

    return;

  }


  const dato =
    compra.compra ||
    {};


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
   SEGUIMIENTO
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

    <strong>Compra:</strong>
    ${contrato.buy_price ?? "--"}
    <br>

    <strong>Profit actual:</strong>
    ${contrato.profit ?? "--"}

  `;

}


/* ==========================================
   RESULTADO FINAL
   FIX8
   ========================================== */

function pintarResultadoFinal(
  dato
) {

  if (
    !UI.resultadoDemo ||
    !dato
  ) {

    return;

  }


  const profit =
    Number(
      dato.profit ??
      0
    );


  const ganada =
    profit > 0;


  UI.resultadoDemo
    .classList
    .remove(
      "ganada",
      "perdida"
    );


  UI.resultadoDemo
    .classList
    .add(
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

    <strong>Estado:</strong>
    ${dato.status ?? "--"}
    <br>

    <strong>Fuente:</strong>
    ${dato.source ?? "--"}

  `;

}


/* ==========================================
   RESULTADO DEMO ROBUSTO

   ACEPTA:
   1) { ok:true, resultado:{...} }
   2) resultado directo
   ========================================== */

function mostrarResultadoDemo(
  resultado
) {

  if (
    !UI.resultadoDemo ||
    !resultado
  ) {

    return;

  }


  if (
    resultado.ok === true &&
    resultado.resultado
  ) {

    pintarResultadoFinal(
      resultado.resultado
    );

    return;

  }


  if (
    resultado.contractId ||
    resultado.profit !==
      undefined
  ) {

    pintarResultadoFinal(
      resultado
    );

    return;

  }


  if (
    resultado.ok === false
  ) {

    UI.resultadoDemo
      .classList
      .remove(
        "ganada",
        "perdida"
      );


    UI.resultadoDemo.innerHTML = `

      <strong>
        Seguimiento pendiente
      </strong>

      <br><br>

      ${
        resultado.error ||
        "No se recibió resultado final."
      }

    `;

  }

}


/* ==========================================
   ÚLTIMO RESULTADO DEL ENGINE
   RESPALDO VISUAL
   ========================================== */

function recuperarResultadoEngine() {

  const estado =
    botEngine.obtenerEstado();


  const ultimo =
    estado?.ultimoResultadoDemo;


  if (
    ultimo &&
    (
      ultimo.contractId ||
      ultimo.profit !==
        undefined
    )
  ) {

    pintarResultadoFinal(
      ultimo
    );


    return true;

  }


  return false;

}


/* ==========================================
   TELEMETRÍA
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
    UI.calibradorMercado
  ) {

    UI.calibradorMercado.textContent =
      telemetria.mercado ??
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
    UI.calibradorResultado
  ) {

    UI.calibradorResultado.textContent =
      telemetria.resultado ??
      "--";

  }


  registrarActividad(
    `FIX8 · ${telemetria.mercado ?? "--"} · ${telemetria.familiaMercado ?? "--"} · Señal→BUY ${formatoMs(
      telemetria.signalToBuyMs
    )}`,
    "aviso"
  );

}


/* ==========================================
   RENDER FILA MERCADO
   ========================================== */

function renderFilaMercado(
  mercado,
  resumen
) {

  const fila =
    FILAS_MERCADO[
      mercado
    ];


  if (
    !fila ||
    !resumen
  ) {

    return;

  }


  if (
    fila.pruebas
  ) {

    fila.pruebas.textContent =
      resumen.pruebas ??
      0;

  }


  if (
    fila.ganadas
  ) {

    fila.ganadas.textContent =
      resumen.ganadas ??
      0;

  }


  if (
    fila.perdidas
  ) {

    fila.perdidas.textContent =
      resumen.perdidas ??
      0;

  }


  if (
    fila.accuracy
  ) {

    fila.accuracy.textContent =
      formatoPorcentaje(
        resumen.accuracy
      );

  }


  if (
    fila.latencia
  ) {

    fila.latencia.textContent =
      formatoMs(
        resumen.promedioSignalToBuyMs
      );

  }

}


/* ==========================================
   ACTUALIZAR 10 MERCADOS
   ========================================== */

function actualizarTablaMercados() {

  const estado =
    botEngine.obtenerEstado();


  const resumenes =
    estado?.resumenMercados ||
    {};


  for (
    const mercado
    of Object.keys(
      FILAS_MERCADO
    )
  ) {

    renderFilaMercado(
      mercado,
      resumenes[
        mercado
      ]
    );

  }

}


/* ==========================================
   EJECUCIÓN DEMO
   ========================================== */

function renderEjecucionDemo() {

  const estadoTrade =
    botEngine
      .obtenerEstado()
      ?.trade ||
    {};


  const conectado =
    Boolean(
      derivConnection
        .obtenerEstado()
        ?.connected
    );


  const activa =
    Boolean(
      estadoTrade
        .ejecucionActiva
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
      !conectado;

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

    const marcaPuente =
      Number(
        senal
          ?.bridgeReceivedPerf
      );


    const senalRecibidaPerf =
      Number.isFinite(
        marcaPuente
      )
        ? marcaPuente
        : ahoraPreciso();


    mostrarSenal(
      senal
    );


    if (
      UI.resultadoDemo
    ) {

      UI.resultadoDemo
        .classList
        .remove(
          "ganada",
          "perdida"
        );


      UI.resultadoDemo.innerHTML = `

        <strong>
          Operación en proceso...
        </strong>

      `;

    }


    registrarActividad(
      "Procesando señal FIX8...",
      "aviso"
    );


    try {

      const resultado =
        await botEngine
          .procesarSenal(
            senal,
            {

              onOperacionUpdate:
                mostrarActualizacionContrato,

              senalRecibidaPerf

            }
          );


      if (
        !resultado
          ?.aceptada
      ) {

        registrarActividad(
          `Señal no procesada · ${
            resultado?.etapa ||
            "BOT"
          } · ${
            resultado?.motivo ||
            "Sin motivo informado"
          }`,
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

      }


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


      /*
        RESULTADO PRINCIPAL
      */

      if (
        resultado.resultadoDemo
      ) {

        mostrarResultadoDemo(
          resultado.resultadoDemo
        );

      }


      /*
        RESPALDO VISUAL FIX8.

        Si la estructura del resultado
        no actualizó la tarjeta,
        tomamos el último resultado
        guardado por el Engine.
      */

      recuperarResultadoEngine();


      mostrarTelemetria(
        resultado.telemetria
      );


      actualizarTablaMercados();


      if (
        resultado.resultadoDemo
          ?.ok
      ) {

        const dato =
          resultado
            .resultadoDemo
            .resultado;


        const profit =
          Number(
            dato?.profit ??
            0
          );


        registrarActividad(
          `${
            profit > 0
              ? "GANADA"
              : "PERDIDA"
          } · PROFIT ${profit} · ${senal.mercado}`,
          profit > 0
            ? "correcto"
            : "error"
        );

      }


      else if (
        resultado.telemetria
          ?.resultado ===
            "GANADA" ||
        resultado.telemetria
          ?.resultado ===
            "PERDIDA"
      ) {

        registrarActividad(
          `${resultado.telemetria.resultado} · PROFIT ${resultado.telemetria.profit ?? "--"} · ${senal.mercado}`,
          resultado.telemetria
            .resultado ===
              "GANADA"
            ? "correcto"
            : "error"
        );

      }


    } catch (
      error
    ) {

      registrarActividad(
        `Error procesando señal: ${
          error?.message ||
          String(
            error
          )
        }`,
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
      evento.detail ||
      {};


    if (
      datos.conectado
    ) {

      if (
        UI.estadoBot
      ) {

        UI.estadoBot.textContent =
          "BOT SYNC";


        UI.estadoBot
          .classList
          .remove(
            "apagado"
          );


        UI.estadoBot
          .classList
          .add(
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
        datos.mensaje ||
        "Puente conectado.",
        "correcto"
      );

    } else {

      if (
        UI.estadoBot
      ) {

        UI.estadoBot.textContent =
          "BOT OFF";


        UI.estadoBot
          .classList
          .remove(
            "encendido"
          );


        UI.estadoBot
          .classList
          .add(
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
      `Señal recibida desde ${
        evento.detail?.origen ||
        "desconocido"
      }`,
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

  UI.botonConectar
    .addEventListener(
      "click",
      () => {

        signalBridge
          .conectar();


        const resultado =
          botEngine
            .iniciar();


        registrarActividad(
          resultado?.mensaje ||
          "Motor iniciado.",
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

  UI.botonPausar
    .addEventListener(
      "click",
      () => {

        const estado =
          botEngine
            .obtenerEstado();


        if (
          !estado
            ?.pausado
        ) {

          const resultado =
            botEngine
              .pausar();


          UI.botonPausar
            .textContent =
            "REANUDAR";


          registrarActividad(
            resultado
              ?.mensaje ||
            "Bot pausado.",
            "aviso"
          );

        } else {

          const resultado =
            botEngine
              .reanudar();


          UI.botonPausar
            .textContent =
            "PAUSAR";


          registrarActividad(
            resultado
              ?.mensaje ||
            "Bot reanudado.",
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

  UI.botonActivarDemo
    .addEventListener(
      "click",
      () => {

        const resultado =
          botEngine
            .activarEjecucionDemo();


        registrarActividad(
          resultado?.mensaje ||
          "Cambio de ejecución.",
          resultado?.ok
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

  UI.botonDesactivarDemo
    .addEventListener(
      "click",
      () => {

        const resultado =
          botEngine
            .desactivarEjecucionDemo();


        registrarActividad(
          resultado?.mensaje ||
          "Ejecución DEMO desactivada.",
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

  UI.botonProbar
    .addEventListener(
      "click",
      () => {

        registrarActividad(
          "Enviando señal interna FIX8...",
          "aviso"
        );


        signalBridge
          .recibirSenal({

            id:
              `DEMO-${Date.now()}`,

            mercado:
              "R_10",

            estrategia:
              "even_odd",

            direccion:
              "EVEN",

            confianza:
              82,

            precio:
              12345.67,

            ultimoDigito:
              8,

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
              "FIX8_TEST",

            timestamp:
              Date.now(),

            metadata:
              {}

          });

      }
    );

}


/* ==========================================
   CUENTA DERIV
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
        accountId ||
        "";

    }


    if (
      UI.derivCuenta
    ) {

      UI.derivCuenta.textContent =
        accountId ||
        "--";

    }


    registrarActividad(
      `Cuenta DEMO verificada · ${
        accountId ||
        "--"
      }`,
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
        mensaje ||
        estado ||
        "--";

    }


    if (
      estado ===
        "connected"
    ) {

      if (
        UI.derivConexion
      ) {

        UI.derivConexion
          .textContent =
          "DEMO CONECTADO";

      }


      if (
        UI.derivCuenta
      ) {

        UI.derivCuenta
          .textContent =
          derivConnection
            .obtenerEstado()
            ?.accountId ||
          "--";

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
      estado ===
        "connecting"
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
        estado ===
          "error"
      ) {

        registrarActividad(
          `Deriv: ${
            mensaje ||
            "Error de conexión"
          }`,
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
      `DERIV ERROR → ${
        mensaje ||
        "Error desconocido"
      }`,
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

  UI.botonConectarDeriv
    .addEventListener(
      "click",
      async () => {

        const appId =
          UI.derivAppId
            ?.value
            ?.trim() ||
          "";


        const token =
          UI.derivToken
            ?.value
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


        if (
          UI.derivAccountId
        ) {

          UI.derivAccountId.value =
            "Buscando automáticamente...";

        }


        registrarActividad(
          "Buscando cuenta DEMO y conectando con Deriv...",
          "aviso"
        );


        try {

          const resultado =
            await derivConnection
              .conectarDemo({

                token,

                appId

              });


          if (
            !resultado
              ?.ok
          ) {

            registrarActividad(
              `No se pudo conectar: ${
                resultado?.mensaje ||
                "Error desconocido"
              }`,
              "error"
            );

          }


        } catch (
          error
        ) {

          registrarActividad(
            `Error conectando Deriv: ${
              error?.message ||
              String(
                error
              )
            }`,
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

  UI.botonDesconectarDeriv
    .addEventListener(
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


        if (
          UI.derivAccountId
        ) {

          UI.derivAccountId.value =
            "Se detectará automáticamente";

        }


        renderEjecucionDemo();

      }
    );

}


/* ==========================================
   CIERRE PÁGINA
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
   INICIO FIX8
   ========================================== */

if (
  UI.derivAccountId
) {

  UI.derivAccountId.value =
    "Se detectará automáticamente";

}


renderEjecucionDemo();


actualizarTablaMercados();


recuperarResultadoEngine();


registrarActividad(
  "BOT V1 MR FIX8 preparado."
);


registrarActividad(
  "Estadísticas por mercado activadas."
);


registrarActividad(
  "Resultado final reforzado."
);


registrarActividad(
  "Ejecución DEMO desactivada por defecto."
);
