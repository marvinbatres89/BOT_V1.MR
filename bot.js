/* ==========================================
   BOT V1 MR
   BOT.JS
   FIX13 - TIMING + PERFIL DE SEÑAL

   CONSERVA:
   - PUENTE TRADING ANALYZER -> BOT
   - SIGNAL-BRIDGE FIX12 ESTABLE
   - DERIV DEMO
   - COTIZACIÓN
   - BUY
   - RESULTADO FINAL
   - 12 MERCADOS
   - ESTADÍSTICAS HISTÓRICAS
   - COMPARADORES
   - CALIBRACIÓN POR MERCADO
   - DATOS FIX8/FIX9/FIX10/FIX11/FIX12

   FIX13:
   - CARGA FORZADA BOT-ENGINE FIX13
   - CONSERVA SIGNAL-BRIDGE FIX12
   - TIMING LIMPIO
   - TIMING VÁLIDO / ANÓMALO
   - DIAGNÓSTICO DE TARGET
   - CONSERVA PERFIL COMPLETO DE SEÑAL:
       CONFIANZA
       TENDENCIA
       RSI
       MOMENTUM
       VOLATILIDAD
       ÚLTIMO DÍGITO
   - PREPARADO PARA COMPARAR
     PERFIL DE GANADAS VS PERDIDAS
   ========================================== */

import {
  signalBridge
} from "./signal-bridge.js?v=FIX12-BRIDGE-1";

import {
  botEngine
} from "./bot-engine.js?v=FIX13-TIMING-1";

import {
  derivConnection
} from "./deriv-connection.js";


const BOT_VERSION =
  "FIX13";

const BOT_BUILD =
  "TIMING-1";


const $ =
  (id) =>
    document.getElementById(id);


/* ==========================================
   UI PRINCIPAL
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

  calibradorAjuste:
    $("calibradorAjuste"),

  calibradorEspera:
    $("calibradorEspera"),

  calibradorSignalBuy:
    $("calibradorSignalBuy"),

  calibradorPropuesta:
    $("calibradorPropuesta"),

  calibradorBuy:
    $("calibradorBuy"),

  calibradorResultado:
    $("calibradorResultado"),

  calibracionMercadoSelect:
    $("calibracionMercadoSelect"),

  calibracionAjusteSelect:
    $("calibracionAjusteSelect"),

  botonGuardarCalibracion:
    $("botonGuardarCalibracion"),

  botonResetCalibracion:
    $("botonResetCalibracion"),

  calibracionMercadoActual:
    $("calibracionMercadoActual"),

  calibracionAjusteActual:
    $("calibracionAjusteActual"),

  calibracionTargetDisponible:
    $("calibracionTargetDisponible"),

  calibracionProgramacion:
    $("calibracionProgramacion")

};


/* ==========================================
   12 MERCADOS
   ========================================== */

const FILAS_MERCADO = {

  R_10: {
    pruebas: $("r10Pruebas"),
    ganadas: $("r10Ganadas"),
    perdidas: $("r10Perdidas"),
    accuracy: $("r10Accuracy"),
    latencia: $("r10Latencia")
  },

  R_25: {
    pruebas: $("r25Pruebas"),
    ganadas: $("r25Ganadas"),
    perdidas: $("r25Perdidas"),
    accuracy: $("r25Accuracy"),
    latencia: $("r25Latencia")
  },

  R_50: {
    pruebas: $("r50Pruebas"),
    ganadas: $("r50Ganadas"),
    perdidas: $("r50Perdidas"),
    accuracy: $("r50Accuracy"),
    latencia: $("r50Latencia")
  },

  R_75: {
    pruebas: $("r75Pruebas"),
    ganadas: $("r75Ganadas"),
    perdidas: $("r75Perdidas"),
    accuracy: $("r75Accuracy"),
    latencia: $("r75Latencia")
  },

  R_100: {
    pruebas: $("r100Pruebas"),
    ganadas: $("r100Ganadas"),
    perdidas: $("r100Perdidas"),
    accuracy: $("r100Accuracy"),
    latencia: $("r100Latencia")
  },

  "1HZ10V": {
    pruebas: $("hz10Pruebas"),
    ganadas: $("hz10Ganadas"),
    perdidas: $("hz10Perdidas"),
    accuracy: $("hz10Accuracy"),
    latencia: $("hz10Latencia")
  },

  "1HZ15V": {
    pruebas: $("hz15Pruebas"),
    ganadas: $("hz15Ganadas"),
    perdidas: $("hz15Perdidas"),
    accuracy: $("hz15Accuracy"),
    latencia: $("hz15Latencia")
  },

  "1HZ25V": {
    pruebas: $("hz25Pruebas"),
    ganadas: $("hz25Ganadas"),
    perdidas: $("hz25Perdidas"),
    accuracy: $("hz25Accuracy"),
    latencia: $("hz25Latencia")
  },

  "1HZ30V": {
    pruebas: $("hz30Pruebas"),
    ganadas: $("hz30Ganadas"),
    perdidas: $("hz30Perdidas"),
    accuracy: $("hz30Accuracy"),
    latencia: $("hz30Latencia")
  },

  "1HZ50V": {
    pruebas: $("hz50Pruebas"),
    ganadas: $("hz50Ganadas"),
    perdidas: $("hz50Perdidas"),
    accuracy: $("hz50Accuracy"),
    latencia: $("hz50Latencia")
  },

  "1HZ75V": {
    pruebas: $("hz75Pruebas"),
    ganadas: $("hz75Ganadas"),
    perdidas: $("hz75Perdidas"),
    accuracy: $("hz75Accuracy"),
    latencia: $("hz75Latencia")
  },

  "1HZ100V": {
    pruebas: $("hz100Pruebas"),
    ganadas: $("hz100Ganadas"),
    perdidas: $("hz100Perdidas"),
    accuracy: $("hz100Accuracy"),
    latencia: $("hz100Latencia")
  }

};


/* ==========================================
   COMPARADORES PILOTO
   ========================================== */

const COMPARADORES = {

  R_50: {

    ganadasCantidad:
      $("r50TimingGanadasCantidad"),

    ganadasSignalBuy:
      $("r50TimingGanadasSignalBuy"),

    ganadasMin:
      $("r50TimingGanadasMin"),

    ganadasMax:
      $("r50TimingGanadasMax"),

    ganadasProposal:
      $("r50TimingGanadasProposal"),

    ganadasBuy:
      $("r50TimingGanadasBuy"),

    perdidasCantidad:
      $("r50TimingPerdidasCantidad"),

    perdidasSignalBuy:
      $("r50TimingPerdidasSignalBuy"),

    perdidasMin:
      $("r50TimingPerdidasMin"),

    perdidasMax:
      $("r50TimingPerdidasMax"),

    perdidasProposal:
      $("r50TimingPerdidasProposal"),

    perdidasBuy:
      $("r50TimingPerdidasBuy"),

    diferencia:
      $("r50TimingDiferencia"),

    lectura:
      $("r50TimingLectura")

  },


  "1HZ75V": {

    ganadasCantidad:
      $("hz75TimingGanadasCantidad"),

    ganadasSignalBuy:
      $("hz75TimingGanadasSignalBuy"),

    ganadasMin:
      $("hz75TimingGanadasMin"),

    ganadasMax:
      $("hz75TimingGanadasMax"),

    ganadasProposal:
      $("hz75TimingGanadasProposal"),

    ganadasBuy:
      $("hz75TimingGanadasBuy"),

    perdidasCantidad:
      $("hz75TimingPerdidasCantidad"),

    perdidasSignalBuy:
      $("hz75TimingPerdidasSignalBuy"),

    perdidasMin:
      $("hz75TimingPerdidasMin"),

    perdidasMax:
      $("hz75TimingPerdidasMax"),

    perdidasProposal:
      $("hz75TimingPerdidasProposal"),

    perdidasBuy:
      $("hz75TimingPerdidasBuy"),

    diferencia:
      $("hz75TimingDiferencia"),

    lectura:
      $("hz75TimingLectura")

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
   FORMATOS
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


function formatoSegundosDesdeMs(
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


  const segundos =
    numero /
    1000;


  return `${
    segundos >
      0
      ? "+"
      : ""
  }${segundos.toFixed(1)} s`;

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


/* ==========================================
   DIAGNÓSTICO PUENTE
   ========================================== */

window.addEventListener(
  "bot:signal-source",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    const origen =
      datos.origen ||
      "desconocido";


    registrarActividad(
      `PUENTE ${BOT_VERSION} RECIBIÓ SEÑAL · ${origen}`,
      "correcto"
    );


    console.log(
      `BOT ${BOT_VERSION} · SEÑAL DETECTADA`,
      datos
    );

  }
);


/* ==========================================
   CALIBRACIÓN VISUAL
   ========================================== */

function obtenerMercadoSeleccionado() {

  return (
    UI.calibracionMercadoSelect
      ?.value ||
    "R_10"
  );

}


function actualizarPanelCalibracion() {

  const estado =
    botEngine
      .obtenerEstado();


  const mercado =
    obtenerMercadoSeleccionado();


  const ajuste =
    Number(
      estado
        ?.calibracionActual
        ?.[mercado] ??
      0
    );


  if (
    UI.calibracionMercadoActual
  ) {

    UI.calibracionMercadoActual.textContent =
      mercado;

  }


  if (
    UI.calibracionAjusteActual
  ) {

    UI.calibracionAjusteActual.textContent =
      formatoSegundosDesdeMs(
        ajuste
      );

  }


  if (
    UI.calibracionAjusteSelect
  ) {

    UI.calibracionAjusteSelect.value =
      String(
        ajuste
      );

  }

}


/* ==========================================
   CAMBIO DE MERCADO CALIBRACIÓN
   ========================================== */

if (
  UI.calibracionMercadoSelect
) {

  UI.calibracionMercadoSelect
    .addEventListener(
      "change",
      () => {

        actualizarPanelCalibracion();

      }
    );

}


/* ==========================================
   GUARDAR CALIBRACIÓN
   ========================================== */

if (
  UI.botonGuardarCalibracion
) {

  UI.botonGuardarCalibracion
    .addEventListener(
      "click",
      () => {

        const mercado =
          obtenerMercadoSeleccionado();


        const ajuste =
          Number(
            UI.calibracionAjusteSelect
              ?.value ??
            0
          );


        const resultado =
          botEngine
            .establecerAjusteMercado(
              mercado,
              ajuste
            );


        registrarActividad(
          resultado?.mensaje ||
          "No se pudo guardar calibración.",
          resultado?.ok
            ? "correcto"
            : "error"
        );


        actualizarPanelCalibracion();

      }
    );

}


/* ==========================================
   RESET CALIBRACIÓN
   ========================================== */

if (
  UI.botonResetCalibracion
) {

  UI.botonResetCalibracion
    .addEventListener(
      "click",
      () => {

        const resultado =
          botEngine
            .restablecerCalibracion();


        registrarActividad(
          resultado?.mensaje ||
          "Calibración restablecida.",
          "aviso"
        );


        actualizarPanelCalibracion();

      }
    );

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
      senal.segundosEntrada !=
        null
        ? `${senal.segundosEntrada} s`
        : "--";

  }


  if (
    UI.precio
  ) {

    UI.precio.textContent =
      senal.precio !=
        null
        ? String(
            senal.precio
          )
        : "--";

  }


  const target =
    senal.targetExecutionAt ??
    senal.metadata
      ?.targetExecutionAt ??
    null;


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

      <strong>Punto:</strong>
      ${senal.segundosEntrada ?? "--"}
      <br>

      <strong>Target:</strong>
      ${target ?? "NO DISPONIBLE"}

    `;

  }

}


/* ==========================================
   ESTADO TARGET
   ========================================== */

function mostrarEstadoTarget(
  telemetria
) {

  if (
    !telemetria
  ) {

    return;

  }


  if (
    UI.calibracionTargetDisponible
  ) {

    UI.calibracionTargetDisponible.textContent =
      telemetria
        .programacionDisponible
        ? "SÍ"
        : "NO";

  }


  if (
    UI.calibracionProgramacion
  ) {

    if (
      telemetria
        .programacionDisponible
    ) {

      UI.calibracionProgramacion.textContent =
        telemetria
          .puedeAnticipar
          ? "PROGRAMADA"
          : "TARGET YA ALCANZADO";

    }

    else {

      UI.calibracionProgramacion.textContent =
        "SIN TARGET";

    }

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

    <strong>Contrato:</strong>
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
   COTIZACIÓN
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
    <br>

    <strong>Precio:</strong>
    ${propuesta.askPrice ?? "--"}
    <br>

    <strong>Pago potencial:</strong>
    ${propuesta.payout ?? "--"}
    <br>

    <strong>Spot:</strong>
    ${propuesta.spot ?? "--"}

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
    profit >
    0;


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
    resultado.ok ===
      true &&
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

  }

}


function recuperarResultadoEngine() {

  const ultimo =
    botEngine
      .obtenerEstado()
      ?.ultimoResultadoDemo;


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

  }

}


/* ==========================================
   TELEMETRÍA FIX12
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
      telemetria.retrasoReferenciaSeg !=
        null
        ? `${telemetria.retrasoReferenciaSeg} s`
        : "--";

  }


  if (
    UI.calibradorAjuste
  ) {

    UI.calibradorAjuste.textContent =
      formatoSegundosDesdeMs(
        telemetria.calibracionMs
      );

  }


  if (
    UI.calibradorEspera
  ) {

    UI.calibradorEspera.textContent =
      formatoMs(
        telemetria.esperaProgramadaMs
      );

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


  mostrarEstadoTarget(
    telemetria
  );

}


/* ==========================================
   DIAGNÓSTICO TIMING FIX12
   ========================================== */

function registrarDiagnosticoTiming(
  telemetria
) {

  if (
    !telemetria
  ) {

    return;

  }


  const version =
    telemetria.version ||
    "SIN VERSION";


  const clasificacion =
    telemetria.timingClasificacion ||
    "PENDIENTE";


  const desviacion =
    telemetria.buyTargetDeviationMs;


  registrarActividad(
    `TELEMETRÍA ${version} · ${
      telemetria.mercado ||
      "--"
    } · TIMING ${clasificacion} · desviación target ${
      formatoMs(
        desviacion
      )
    }`,
    telemetria.timingValido
      ? "correcto"
      : "aviso"
  );


  if (
    Array.isArray(
      telemetria.timingAnomalias
    ) &&
    telemetria
      .timingAnomalias
      .length
  ) {

    telemetria
      .timingAnomalias
      .forEach(
        (
          anomalia
        ) => {

          registrarActividad(
            `TIMING → ${anomalia}`,
            "aviso"
          );

        }
      );

  }

}


/* ==========================================
   TABLAS
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

    /*
      FIX12:
      Este valor ahora representa
      únicamente las muestras de timing
      FIX12 consideradas válidas.
    */

    fila.latencia.textContent =
      formatoMs(
        resumen.promedioSignalToBuyMs
      );

  }

}


function actualizarTablaMercados() {

  const resumenes =
    botEngine
      .obtenerEstado()
      ?.resumenMercados ||
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
   COMPARADORES FIX12
   ========================================== */

function renderComparador(
  mercado,
  comparacion
) {

  const ui =
    COMPARADORES[
      mercado
    ];


  if (
    !ui ||
    !comparacion
  ) {

    return;

  }


  const ganadas =
    comparacion.ganadas ||
    {};


  const perdidas =
    comparacion.perdidas ||
    {};


  if (
    ui.ganadasCantidad
  ) {

    ui.ganadasCantidad.textContent =
      ganadas.cantidad ??
      0;

  }


  if (
    ui.ganadasSignalBuy
  ) {

    ui.ganadasSignalBuy.textContent =
      formatoMs(
        ganadas.promedioSignalToBuyMs
      );

  }


  if (
    ui.ganadasMin
  ) {

    ui.ganadasMin.textContent =
      formatoMs(
        ganadas.minimoSignalToBuyMs
      );

  }


  if (
    ui.ganadasMax
  ) {

    ui.ganadasMax.textContent =
      formatoMs(
        ganadas.maximoSignalToBuyMs
      );

  }


  if (
    ui.ganadasProposal
  ) {

    ui.ganadasProposal.textContent =
      formatoMs(
        ganadas.promedioProposalMs
      );

  }


  if (
    ui.ganadasBuy
  ) {

    ui.ganadasBuy.textContent =
      formatoMs(
        ganadas.promedioBuyMs
      );

  }


  if (
    ui.perdidasCantidad
  ) {

    ui.perdidasCantidad.textContent =
      perdidas.cantidad ??
      0;

  }


  if (
    ui.perdidasSignalBuy
  ) {

    ui.perdidasSignalBuy.textContent =
      formatoMs(
        perdidas.promedioSignalToBuyMs
      );

  }


  if (
    ui.perdidasMin
  ) {

    ui.perdidasMin.textContent =
      formatoMs(
        perdidas.minimoSignalToBuyMs
      );

  }


  if (
    ui.perdidasMax
  ) {

    ui.perdidasMax.textContent =
      formatoMs(
        perdidas.maximoSignalToBuyMs
      );

  }


  if (
    ui.perdidasProposal
  ) {

    ui.perdidasProposal.textContent =
      formatoMs(
        perdidas.promedioProposalMs
      );

  }


  if (
    ui.perdidasBuy
  ) {

    ui.perdidasBuy.textContent =
      formatoMs(
        perdidas.promedioBuyMs
      );

  }


  if (
    ui.diferencia
  ) {

    /*
      Conservamos este campo visual.

      FIX12 prioriza el comparador limpio.
    */

    ui.diferencia.textContent =
      formatoMs(
        comparacion
          .diferenciaMedianaMs
      );

  }


  if (
    ui.lectura
  ) {

    const muestras =
      Number(
        comparacion
          .muestrasTimingFix12 ??
        0
      );


    ui.lectura.textContent =
      muestras >
        0
        ? `${comparacion.lectura || "ESPERANDO DATOS"} · FIX12 ${muestras} muestras`
        : "ESPERANDO MUESTRAS FIX12";

  }

}


function actualizarComparadores() {

  const comparaciones =
    botEngine
      .obtenerEstado()
      ?.comparaciones ||
    {};


  renderComparador(
    "R_50",
    comparaciones[
      "R_50"
    ]
  );


  renderComparador(
    "1HZ75V",
    comparaciones[
      "1HZ75V"
    ]
  );

}


/* ==========================================
   EJECUCIÓN DEMO
   ========================================== */

function renderEjecucionDemo() {

  const trade =
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
      trade
        .ejecucionActiva
    );


  if (
    UI.estadoEjecucion
  ) {

    UI.estadoEjecucion.textContent =
      activa
        ? "EJECUCIÓN DEMO ON"
        : "EJECUCIÓN DEMO OFF";


    UI.estadoEjecucion
      .classList
      .toggle(
        "encendido-ejecucion",
        activa
      );


    UI.estadoEjecucion
      .classList
      .toggle(
        "apagado-ejecucion",
        !activa
      );

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

    const target =
      Number(
        senal
          ?.targetExecutionAt ??
        senal
          ?.metadata
          ?.targetExecutionAt
      );


    registrarActividad(
      `SEÑAL RECIBIDA → ${senal.mercado} · ${senal.direccion} · TARGET ${
        Number.isFinite(
          target
        )
          ? "SÍ"
          : "NO"
      }`,
      "correcto"
    );


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


      UI.resultadoDemo.innerHTML =
        "<strong>Operación en proceso...</strong>";

    }


    registrarActividad(
      `Procesando señal ${BOT_VERSION}...`,
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
            resultado?.motivo ||
            "Sin motivo"
          }`,
          "aviso"
        );

        return;

      }


      registrarActividad(
        `SEÑAL ACEPTADA · ${senal.mercado} · ajuste ${
          formatoSegundosDesdeMs(
            resultado.calibracionMs
          )
        }`,
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


      if (
        resultado.resultadoDemo
      ) {

        mostrarResultadoDemo(
          resultado.resultadoDemo
        );

      }


      recuperarResultadoEngine();


      mostrarTelemetria(
        resultado.telemetria
      );


      registrarDiagnosticoTiming(
        resultado.telemetria
      );


      actualizarTablaMercados();


      actualizarComparadores();


      actualizarPanelCalibracion();


      registrarActividad(
        `${BOT_VERSION} · ${senal.mercado} · target ${
          resultado.programacionDisponible
            ? "SÍ"
            : "NO"
        } · calibración ${
          formatoSegundosDesdeMs(
            resultado.calibracionMs
          )
        }`,
        "aviso"
      );


      if (
        resultado.telemetria
          ?.resultado ===
            "GANADA" ||
        resultado.telemetria
          ?.resultado ===
            "PERDIDA"
      ) {

        registrarActividad(
          `${resultado.telemetria.resultado} · PROFIT ${
            resultado.telemetria.profit ??
            "--"
          } · ${senal.mercado}`,
          resultado.telemetria
            .resultado ===
              "GANADA"
            ? "correcto"
            : "error"
        );

      }

    }

    catch (
      error
    ) {

      registrarActividad(
        `Error procesando señal ${BOT_VERSION}: ${
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
   ESTADO PUENTE
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
        `Puente ${BOT_VERSION} conectado.`,
        "correcto"
      );

    }

    else {

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
   CONECTAR BOT
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
          "Bot iniciado.",
          "correcto"
        );


        const estadoMotor =
          botEngine
            .obtenerEstado();


        registrarActividad(
          `MOTOR ${estadoMotor?.versionTelemetria || "?"} · ${BOT_BUILD}`,
          estadoMotor
              ?.versionTelemetria ===
            "FIX12"
            ? "correcto"
            : "aviso"
        );


        if (
          signalBridge
            .obtenerEstado
        ) {

          const estadoPuente =
            signalBridge
              .obtenerEstado();


          registrarActividad(
            `Bridge · Broadcast ${
              estadoPuente
                ?.canalDisponible
                ? "OK"
                : "NO"
            } · respaldo ${
              estadoPuente
                ?.respaldoActivo
                ? "ON"
                : "OFF"
            }`,
            estadoPuente
              ?.canalDisponible
              ? "correcto"
              : "aviso"
          );

        }

      }
    );

}


/* ==========================================
   PAUSAR / REANUDAR
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
          !estado?.pausado
        ) {

          botEngine
            .pausar();

          UI.botonPausar.textContent =
            "REANUDAR";

        }

        else {

          botEngine
            .reanudar();

          UI.botonPausar.textContent =
            "PAUSAR";

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
          "Ejecución DEMO.",
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

        botEngine
          .desactivarEjecucionDemo();


        renderEjecucionDemo();


        registrarActividad(
          "Ejecución DEMO desactivada.",
          "aviso"
        );

      }
    );

}


/* ==========================================
   PRUEBA INTERNA FIX13
   PERFIL COMPLETO DE SEÑAL
   ========================================== */

if (
  UI.botonProbar
) {

  UI.botonProbar
    .addEventListener(
      "click",
      () => {

        const targetExecutionAt =
          Date.now() +
          2000;


        signalBridge
          .recibirSenal({

            id:
              `FIX13-${Date.now()}`,

            mercado:
              "R_50",

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
              61,

            momentum:
              "ALCISTA",

            volatilidad:
              "MEDIA",

            segundosEntrada:
              10,

            modo:
              "FIX13_TEST",

            targetExecutionAt,

            timestamp:
              Date.now(),

            metadata: {

              targetExecutionAt,

              preavisoBotSegundos:
                2,

              fix:
                "FIX13_TEST",

              perfilSenal: {

                confianza:
                  82,

                tendencia:
                  "ALCISTA",

                rsi:
                  61,

                momentum:
                  "ALCISTA",

                volatilidad:
                  "MEDIA",

                ultimoDigito:
                  8

              }

            }

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
        "Deriv DEMO conectado.",
        "correcto"
      );

    }

    else {

      if (
        UI.derivConexion
      ) {

        UI.derivConexion.textContent =
          estado ===
            "connecting"
            ? "CONECTANDO"
            : "OFF";

      }


      if (
        estado !==
          "connecting"
      ) {

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

      }

    }

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


        try {

          const resultado =
            await derivConnection
              .conectarDemo({
                token,
                appId
              });


          if (
            !resultado?.ok
          ) {

            registrarActividad(
              resultado?.mensaje ||
              "No se pudo conectar.",
              "error"
            );

          }

        }

        catch (
          error
        ) {

          registrarActividad(
            error?.message ||
            "Error de conexión.",
            "error"
          );

        }

      }
    );

}


/* ==========================================
   DESCONECTAR DERIV
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


        renderEjecucionDemo();

      }
    );

}


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
   CIERRE
   ========================================== */

window.addEventListener(
  "beforeunload",
  () => {

    botEngine
      .desactivarEjecucionDemo();


    if (
      signalBridge
        .destruir
    ) {

      signalBridge
        .destruir();

    }

    else {

      signalBridge
        .desconectar();

    }


    derivConnection
      .desconectar();

  }
);


/* ==========================================
   INICIO FIX12
   ========================================== */

if (
  UI.derivAccountId
) {

  UI.derivAccountId.value =
    "Se detectará automáticamente";

}


renderEjecucionDemo();


actualizarTablaMercados();


actualizarComparadores();


actualizarPanelCalibracion();


recuperarResultadoEngine();


const estadoInicialMotor =
  botEngine
    .obtenerEstado();


registrarActividad(
  `BOT V1 MR ${BOT_VERSION} ${BOT_BUILD} preparado.`,
  "correcto"
);


registrarActividad(
  `Motor de telemetría → ${
    estadoInicialMotor
      ?.versionTelemetria ||
    "NO DETECTADO"
  }.`,
  estadoInicialMotor
    ?.versionTelemetria ===
  "FIX13"
    ? "correcto"
    : "aviso"
);


registrarActividad(
  "Telemetría histórica FIX8/FIX9/FIX10/FIX11/FIX12 conservada."
);


registrarActividad(
  "Comparadores de timing FIX13 preparados."
);


registrarActividad(
  "Perfil de señal FIX13 preparado para análisis de ganadas y perdidas."
);


registrarActividad(
  "Calibración -0.3 s a +0.3 s conservada."
);


registrarActividad(
  "12 mercados conservados."
);


registrarActividad(
  "Esperando targetExecutionAt desde Trading Analyzer."
);
