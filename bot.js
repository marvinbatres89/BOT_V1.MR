/* ==========================================
   BOT V1 MR
   CONTROLADOR PRINCIPAL
   FIX7 - CALIBRADOR DE EJECUCIÓN

   CONSERVA:
   - SINCRONIZACIÓN
   - DERIV DEMO
   - COTIZACIÓN
   - BUY
   - RESULTADO

   AGREGA:
   - MEDICIÓN DE LATENCIA
   - FAMILIA 1S / STANDARD
   - SIGNAL -> BUY
   - LATENCIA PROPUESTA
   - LATENCIA BUY
   - ESTADÍSTICAS POR FAMILIA
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


const UI = {

  estadoBot: $("estadoBot"),
  mercado: $("mercado"),
  estrategia: $("estrategia"),
  direccion: $("direccion"),
  confianza: $("confianza"),
  entrada: $("entrada"),
  precio: $("precio"),

  botonConectar: $("botonConectar"),
  botonPausar: $("botonPausar"),
  botonProbar: $("botonProbar"),

  ultimaSenal: $("ultimaSenal"),
  ultimoContrato: $("ultimoContrato"),

  ultimaPropuestaSimulada:
    $("ultimaPropuestaSimulada") ||
    $("ultimaPropuesta"),

  ultimaPropuestaDeriv:
    $("ultimaPropuestaDeriv") ||
    $("ultimaPropuesta"),

  operacionDemo: $("operacionDemo"),
  resultadoDemo: $("resultadoDemo"),
  registroBot: $("registroBot"),

  estadoDeriv: $("estadoDeriv"),
  derivAppId: $("derivAppId"),
  derivAccountId: $("derivAccountId"),
  derivToken: $("derivToken"),

  botonConectarDeriv:
    $("botonConectarDeriv"),

  botonDesconectarDeriv:
    $("botonDesconectarDeriv"),

  derivCuenta: $("derivCuenta"),
  derivConexion: $("derivConexion"),

  estadoEjecucionDemo:
    $("estadoEjecucionDemo") ||
    $("estadoEjecucion"),

  botonActivarEjecucion:
    $("botonActivarEjecucion") ||
    $("botonActivarDemo"),

  botonDesactivarEjecucion:
    $("botonDesactivarEjecucion") ||
    $("botonDesactivarDemo")

};


/* ========================================
   HORA
   ======================================== */

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


/* ========================================
   REGISTRO
   ======================================== */

function registrarActividad(
  mensaje,
  tipo = "normal"
) {

  if (!UI.registroBot) {
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


  UI.registroBot.prepend(
    linea
  );

}


/* ========================================
   FORMATO MILISEGUNDOS
   ======================================== */

function formatoMs(
  valor
) {

  const numero =
    Number(valor);


  if (!Number.isFinite(numero)) {
    return "--";
  }


  return `${numero.toFixed(2)} ms`;

}


/* ========================================
   MOSTRAR SEÑAL
   ======================================== */

function mostrarSenal(
  senal
) {

  if (UI.mercado) {
    UI.mercado.textContent =
      senal.mercado || "--";
  }


  if (UI.estrategia) {
    UI.estrategia.textContent =
      senal.estrategia || "--";
  }


  if (UI.direccion) {
    UI.direccion.textContent =
      senal.direccion || "--";
  }


  if (UI.confianza) {
    UI.confianza.textContent =
      `${senal.confianza}%`;
  }


  if (UI.entrada) {

    UI.entrada.textContent =
      senal.segundosEntrada != null
        ? `${senal.segundosEntrada} s`
        : "--";

  }


  if (UI.precio) {

    UI.precio.textContent =
      senal.precio != null
        ? String(senal.precio)
        : "--";

  }


  if (UI.ultimaSenal) {

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
      ${senal.segundosEntrada ?? "--"} segundos

    `;

  }

}


/* ========================================
   MOSTRAR CONTRATO
   ======================================== */

function mostrarContrato(
  contrato
) {

  if (!UI.ultimoContrato) {
    return;
  }


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
    ${contrato.barrier ?? "--"}
    <br>

    <strong>Confianza:</strong>
    ${contrato.confidence}%
    <br>

    <strong>Segundo:</strong>
    ${contrato.executionSecond ?? "--"}

  `;

}


/* ========================================
   PROPUESTA SIMULADA
   ======================================== */

function mostrarPropuestaSimulada(
  propuesta
) {

  if (
    !UI.ultimaPropuestaSimulada ||
    !propuesta
  ) {

    return;

  }


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
    ${propuesta.duration}${propuesta.durationUnit}
    <br>

    <strong>Estado:</strong>
    ${propuesta.status}
    <br>

    <strong>ID:</strong>
    ${propuesta.id}

  `;

}


/* ========================================
   PROPUESTA DERIV
   ======================================== */

function mostrarPropuestaDeriv(
  propuesta,
  contrato
) {

  if (!UI.ultimaPropuestaDeriv) {
    return;
  }


  if (!propuesta?.ok) {

    UI.ultimaPropuestaDeriv.innerHTML = `

      <strong>Estado:</strong>
      SIN COTIZACIÓN
      <br><br>

      <strong>Motivo:</strong>
      ${propuesta?.error ||
        "No se recibió cotización."}

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

    <strong>ID propuesta:</strong>
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

    <strong>Estado:</strong>
    COTIZACIÓN REAL RECIBIDA

  `;

}


/* ========================================
   MOSTRAR COMPRA
   ======================================== */

function mostrarCompraDemo(
  compra
) {

  if (!UI.operacionDemo) {
    return;
  }


  if (!compra?.ok) {

    UI.operacionDemo.innerHTML = `

      <strong>
        Compra DEMO no ejecutada.
      </strong>

      <br><br>

      ${compra?.error ||
        "Ejecución DEMO desactivada."}

    `;

    return;

  }


  const dato =
    compra.compra;


  UI.operacionDemo.innerHTML = `

    <strong>ESTADO:</strong>
    OPERACIÓN DEMO ABIERTA
    <br><br>

    <strong>Contract ID:</strong>
    ${dato.contractId}
    <br>

    <strong>Transaction ID:</strong>
    ${dato.transactionId ?? "--"}
    <br>

    <strong>Compra:</strong>
    ${dato.buyPrice} USD
    <br>

    <strong>Pago máximo:</strong>
    ${dato.payout}
    <br>

    <strong>Descripción:</strong>
    ${dato.longcode || "--"}

  `;

}


/* ========================================
   ACTUALIZACIÓN CONTRATO
   ======================================== */

function mostrarActualizacionContrato(
  contrato
) {

  if (!UI.operacionDemo) {
    return;
  }


  const status =
    String(
      contrato?.status ??
      "OPEN"
    )
      .toUpperCase();


  UI.operacionDemo.innerHTML = `

    <strong>ESTADO:</strong>
    ${status}
    <br><br>

    <strong>Contract ID:</strong>
    ${contrato?.contract_id ?? "--"}
    <br>

    <strong>Precio compra:</strong>
    ${contrato?.buy_price ?? "--"}
    <br>

    <strong>Profit actual:</strong>
    ${contrato?.profit ?? "--"}
    <br>

    <strong>Vendido:</strong>
    ${contrato?.is_sold
      ? "SÍ"
      : "NO"}

  `;

}


/* ========================================
   RESULTADO DEMO
   ======================================== */

function mostrarResultadoDemo(
  resultado
) {

  if (
    !UI.resultadoDemo ||
    !resultado
  ) {

    return;

  }


  if (!resultado.ok) {

    UI.resultadoDemo.innerHTML = `

      <strong>
        Seguimiento pendiente.
      </strong>

      <br><br>

      ${resultado.error ||
        "No se recibió resultado final."}

    `;

    return;

  }


  const dato =
    resultado.resultado;


  const ganado =
    Number(
      dato.profit
    ) > 0;


  UI.resultadoDemo.innerHTML = `

    <strong>RESULTADO:</strong>
    ${ganado
      ? "GANADA ✅"
      : "PERDIDA ❌"}

    <br><br>

    <strong>Estado Deriv:</strong>
    ${dato.status}
    <br>

    <strong>Contract ID:</strong>
    ${dato.contractId}
    <br>

    <strong>Compra:</strong>
    ${dato.buyPrice}
    <br>

    <strong>Venta/Pago:</strong>
    ${dato.sellPrice}
    <br>

    <strong>Beneficio:</strong>
    ${dato.profit} USD
    <br>

    <strong>Fuente:</strong>
    ${dato.source ?? "--"}

  `;

}


/* ========================================
   FIX7
   MOSTRAR TELEMETRÍA
   ======================================== */

function mostrarTelemetria(
  telemetria
) {

  if (!telemetria) {
    return;
  }


  registrarActividad(
    `FIX7 · FAMILIA ${telemetria.familiaMercado} · PUNTO ${telemetria.puntoEntrada ?? "--"} · REFERENCIA ${telemetria.retrasoReferenciaSeg ?? "--"} s`,
    "aviso"
  );


  registrarActividad(
    `LATENCIA · Señal→BUY ${formatoMs(
      telemetria.signalToBuyMs
    )} · Propuesta ${formatoMs(
      telemetria.proposalLatencyMs
    )} · BUY ${formatoMs(
      telemetria.buyLatencyMs
    )}`,
    "aviso"
  );


  registrarActividad(
    `LATENCIA · Señal→Confirmación ${formatoMs(
      telemetria.signalToBuyConfirmMs
    )} · Total→Resultado ${formatoMs(
      telemetria.totalUntilResultMs
    )}`,
    "aviso"
  );

}


/* ========================================
   FIX7
   RESUMEN FAMILIA
   ======================================== */

function mostrarResumenFamilia(
  resumen
) {

  if (!resumen) {
    return;
  }


  const precision =
    resumen.accuracy != null
      ? `${resumen.accuracy}%`
      : "--";


  registrarActividad(
    `CALIBRADOR ${resumen.familia} · ${resumen.pruebas} pruebas · ${resumen.ganadas} G · ${resumen.perdidas} P · ACIERTO ${precision} · PROMEDIO Señal→BUY ${formatoMs(
      resumen.promedioSignalToBuyMs
    )}`,
    "correcto"
  );

}


/* ========================================
   EJECUCIÓN DEMO
   ======================================== */

function renderEjecucionDemo() {

  const estado =
    botEngine
      .obtenerEstado()
      .trade;


  const activa =
    Boolean(
      estado.ejecucionActiva
    );


  if (UI.estadoEjecucionDemo) {

    UI.estadoEjecucionDemo.textContent =
      activa
        ? "EJECUCIÓN DEMO ON"
        : "EJECUCIÓN DEMO OFF";


    UI.estadoEjecucionDemo
      .classList
      .toggle(
        "encendido-ejecucion",
        activa
      );


    UI.estadoEjecucionDemo
      .classList
      .toggle(
        "apagado-ejecucion",
        !activa
      );

  }


  if (UI.botonActivarEjecucion) {

    UI.botonActivarEjecucion.disabled =
      activa;

  }


  if (UI.botonDesactivarEjecucion) {

    UI.botonDesactivarEjecucion.disabled =
      !activa;

  }

}


/* ========================================
   RECIBIR SEÑAL
   ======================================== */

signalBridge.onSenal(
  async (
    senal
  ) => {

    /*
      Marca de tiempo FIX7.
      Se toma inmediatamente al entrar
      al callback del BOT.
    */

    const senalRecibidaPerf =
      typeof performance !==
        "undefined"
        ? performance.now()
        : Date.now();


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
              mostrarActualizacionContrato,

            senalRecibidaPerf

          }
        );


      if (!resultado.aceptada) {

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


      if (resultado.contrato) {

        mostrarContrato(
          resultado.contrato
        );


        registrarActividad(
          `CONTRATO → ${resultado.contrato.contractType}${
            resultado.contrato.barrier != null
              ? ` · BARRERA ${resultado.contrato.barrier}`
              : ""
          }`,
          "correcto"
        );

      }


      if (resultado.propuesta) {

        mostrarPropuestaSimulada(
          resultado.propuesta
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

      } else {

        registrarActividad(
          `DERIV DEMO → ${resultado.propuestaDeriv?.error || "Sin cotización."}`,
          "aviso"
        );

      }


      if (
        resultado.ejecucionDemoActiva
      ) {

        mostrarCompraDemo(
          resultado.compraDemo
        );


        if (
          resultado.compraDemo?.ok
        ) {

          registrarActividad(
            `COMPRA DEMO → contract ${resultado.compraDemo.compra.contractId} · ${resultado.compraDemo.compra.buyPrice} USD`,
            "correcto"
          );


          mostrarResultadoDemo(
            resultado.resultadoDemo
          );


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
              `RESULTADO DEMO → ${
                profit > 0
                  ? "GANADA"
                  : "PERDIDA"
              } · ${profit} USD`,
              profit > 0
                ? "correcto"
                : "error"
            );

          }

        } else {

          registrarActividad(
            `COMPRA DEMO NO EJECUTADA → ${resultado.compraDemo?.error || "Motivo desconocido."}`,
            "aviso"
          );

        }

      } else {

        registrarActividad(
          "Ejecución DEMO OFF · Solo cotización.",
          "aviso"
        );

      }


      /*
        FIX7:
        mostrar mediciones después
        de finalizar la operación.
      */

      mostrarTelemetria(
        resultado.telemetria
      );


      mostrarResumenFamilia(
        resultado.resumenFamilia
      );


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


/* ========================================
   ESTADO DEL PUENTE
   ======================================== */

window.addEventListener(
  "bot:estado",
  (
    evento
  ) => {

    const datos =
      evento.detail;


    if (datos.conectado) {

      if (UI.estadoBot) {

        UI.estadoBot.textContent =
          "BOT SYNC";


        UI.estadoBot.classList.remove(
          "apagado"
        );


        UI.estadoBot.classList.add(
          "encendido"
        );

      }


      if (UI.botonConectar) {
        UI.botonConectar.disabled =
          true;
      }


      if (UI.botonPausar) {
        UI.botonPausar.disabled =
          false;
      }


      registrarActividad(
        datos.mensaje,
        "correcto"
      );

    } else {

      if (UI.estadoBot) {

        UI.estadoBot.textContent =
          "BOT OFF";


        UI.estadoBot.classList.remove(
          "encendido"
        );


        UI.estadoBot.classList.add(
          "apagado"
        );

      }


      if (UI.botonConectar) {
        UI.botonConectar.disabled =
          false;
      }


      if (UI.botonPausar) {
        UI.botonPausar.disabled =
          true;
      }


      registrarActividad(
        datos.mensaje,
        "aviso"
      );

    }

  }
);


/* ========================================
   ORIGEN DE SEÑAL
   ======================================== */

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


/* ========================================
   ERRORES PUENTE
   ======================================== */

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


/* ========================================
   CONECTAR PUENTE
   ======================================== */

if (UI.botonConectar) {

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


/* ========================================
   PAUSAR / REANUDAR
   ======================================== */

if (UI.botonPausar) {

  UI.botonPausar.addEventListener(
    "click",
    () => {

      const estado =
        botEngine.obtenerEstado();


      if (!estado.pausado) {

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


/* ========================================
   ACTIVAR EJECUCIÓN DEMO
   ======================================== */

if (UI.botonActivarEjecucion) {

  UI.botonActivarEjecucion
    .addEventListener(
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


/* ========================================
   DESACTIVAR EJECUCIÓN
   ======================================== */

if (UI.botonDesactivarEjecucion) {

  UI.botonDesactivarEjecucion
    .addEventListener(
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


/* ========================================
   SEÑAL INTERNA DE PRUEBA
   ======================================== */

if (UI.botonProbar) {

  UI.botonProbar.addEventListener(
    "click",
    () => {

      registrarActividad(
        "Enviando señal DEMO FIX7...",
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
            10,

          modo:
            "FIX7_TEST",

          metadata:
            {}

        }
      );

    }
  );

}


/* ========================================
   CUENTA DERIV
   ======================================== */

derivConnection.on(
  "account",
  ({
    accountId
  }) => {

    if (UI.derivAccountId) {
      UI.derivAccountId.value =
        accountId;
    }


    if (UI.derivCuenta) {
      UI.derivCuenta.textContent =
        accountId || "--";
    }


    registrarActividad(
      `Cuenta DEMO verificada · ${accountId}`,
      "correcto"
    );

  }
);


/* ========================================
   ESTADO DERIV
   ======================================== */

derivConnection.on(
  "state",
  ({
    estado,
    mensaje
  }) => {

    if (UI.estadoDeriv) {
      UI.estadoDeriv.textContent =
        mensaje;
    }


    if (estado === "connected") {

      if (UI.derivConexion) {

        UI.derivConexion.textContent =
          "DEMO CONECTADO";

      }


      if (UI.derivCuenta) {

        UI.derivCuenta.textContent =
          derivConnection
            .obtenerEstado()
            .accountId ||
          "--";

      }


      if (UI.botonConectarDeriv) {
        UI.botonConectarDeriv.disabled =
          true;
      }


      if (UI.botonDesconectarDeriv) {
        UI.botonDesconectarDeriv.disabled =
          false;
      }


      if (UI.derivAppId) {
        UI.derivAppId.disabled =
          true;
      }


      if (UI.derivAccountId) {
        UI.derivAccountId.disabled =
          true;
      }


      if (UI.derivToken) {
        UI.derivToken.disabled =
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

      if (UI.derivConexion) {

        UI.derivConexion.textContent =
          "CONECTANDO";

      }


      if (UI.botonConectarDeriv) {
        UI.botonConectarDeriv.disabled =
          true;
      }


      if (UI.botonDesconectarDeriv) {
        UI.botonDesconectarDeriv.disabled =
          true;
      }


      registrarActividad(
        mensaje,
        "aviso"
      );

    }


    else {

      if (UI.derivConexion) {
        UI.derivConexion.textContent =
          "OFF";
      }


      if (UI.botonConectarDeriv) {
        UI.botonConectarDeriv.disabled =
          false;
      }


      if (UI.botonDesconectarDeriv) {
        UI.botonDesconectarDeriv.disabled =
          true;
      }


      if (UI.derivAppId) {
        UI.derivAppId.disabled =
          false;
      }


      if (UI.derivToken) {
        UI.derivToken.disabled =
          false;
      }


      botEngine
        .desactivarEjecucionDemo();


      renderEjecucionDemo();


      if (estado === "error") {

        registrarActividad(
          `Deriv: ${mensaje}`,
          "error"
        );

      }

    }

  }
);


/* ========================================
   ERROR DERIV
   ======================================== */

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


/* ========================================
   CONECTAR DERIV DEMO
   ======================================== */

if (UI.botonConectarDeriv) {

  UI.botonConectarDeriv
    .addEventListener(
      "click",
      async () => {

        const appId =
          UI.derivAppId
            ?.value
            .trim() ||
          "";


        const token =
          UI.derivToken
            ?.value
            .trim() ||
          "";


        if (!appId) {

          registrarActividad(
            "Falta Deriv App ID.",
            "aviso"
          );


          UI.derivAppId?.focus();

          return;

        }


        if (!token) {

          registrarActividad(
            "Falta Token PAT.",
            "aviso"
          );


          UI.derivToken?.focus();

          return;

        }


        if (UI.derivAccountId) {

          UI.derivAccountId.value =
            "Buscando automáticamente...";

        }


        registrarActividad(
          "Buscando cuenta DEMO y conectando con Deriv...",
          "aviso"
        );


        const resultado =
          await derivConnection
            .conectarDemo(
              {
                token,
                appId
              }
            );


        if (!resultado.ok) {

          if (UI.derivAccountId) {

            UI.derivAccountId.value =
              "Se detectará automáticamente";

          }


          registrarActividad(
            `No se pudo conectar: ${resultado.mensaje}`,
            "error"
          );

        }

      }
    );

}


/* ========================================
   DESCONECTAR DERIV
   ======================================== */

if (UI.botonDesconectarDeriv) {

  UI.botonDesconectarDeriv
    .addEventListener(
      "click",
      () => {

        botEngine
          .desactivarEjecucionDemo();


        renderEjecucionDemo();


        derivConnection
          .desconectar();


        if (UI.derivToken) {
          UI.derivToken.value =
            "";
        }


        if (UI.derivAccountId) {

          UI.derivAccountId.value =
            "Se detectará automáticamente";

        }


        registrarActividad(
          "Deriv DEMO desconectado.",
          "aviso"
        );

      }
    );

}


/* ========================================
   CIERRE DE PÁGINA
   ======================================== */

window.addEventListener(
  "beforeunload",
  () => {

    botEngine
      .desactivarEjecucionDemo();


    derivConnection
      .desconectar();

  }
);


/* ========================================
   INICIO FIX7
   ======================================== */

if (UI.derivAccountId) {

  UI.derivAccountId.value =
    "Se detectará automáticamente";

}


renderEjecucionDemo();


registrarActividad(
  "BOT V1 MR FIX7 preparado."
);


registrarActividad(
  "Calibrador de ejecución activado."
);


registrarActividad(
  "FIX7 separará mercados 1S y STANDARD."
);


registrarActividad(
  "Ejecución DEMO desactivada por defecto."
);


registrarActividad(
  "Esperando conexión con Trading Analyzer."
);
