/* ==========================================
   BOT V1 MR
   BOT.JS
   FIX10 - CALIBRADOR MULTIMERCADO

   CONSERVA:
   - PUENTE
   - DERIV DEMO
   - COTIZACIÓN
   - BUY
   - RESULTADO FINAL
   - TELEMETRÍA
   - COMPARADORES R_50 / 1HZ75V
   - DATOS ANTERIORES

   AGREGA:
   - 1HZ15V
   - 1HZ30V
   - 12 MERCADOS EN TOTAL
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
   12 FILAS DE MERCADO
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
   COMPARADORES DESTACADOS
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
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
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

  if (!UI.registroBot) {
    return;
  }


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
   MOSTRAR SEÑAL
   ========================================== */

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


  if (UI.entrada) {

    UI.entrada.textContent =
      senal.segundosEntrada != null
        ? `${senal.segundosEntrada} s`
        : "--";

  }


  if (UI.precio) {

    UI.precio.textContent =
      senal.precio != null
        ? String(
            senal.precio
          )
        : "--";

  }


  if (UI.ultimaSenal) {

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

  if (!UI.ultimaPropuesta) {
    return;
  }


  if (!propuesta?.ok) {

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

  if (!UI.operacionDemo) {
    return;
  }


  if (!compra?.ok) {

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
    compra.compra || {};


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

  if (!telemetria) {
    return;
  }


  if (UI.calibradorFamilia) {

    UI.calibradorFamilia.textContent =
      telemetria.familiaMercado ??
      "--";

  }


  if (UI.calibradorMercado) {

    UI.calibradorMercado.textContent =
      telemetria.mercado ??
      "--";

  }


  if (UI.calibradorPunto) {

    UI.calibradorPunto.textContent =
      telemetria.puntoEntrada ??
      "--";

  }


  if (UI.calibradorReferencia) {

    UI.calibradorReferencia.textContent =
      telemetria.retrasoReferenciaSeg != null
        ? `${telemetria.retrasoReferenciaSeg} s`
        : "--";

  }


  if (UI.calibradorSignalBuy) {

    UI.calibradorSignalBuy.textContent =
      formatoMs(
        telemetria.signalToBuyMs
      );

  }


  if (UI.calibradorPropuesta) {

    UI.calibradorPropuesta.textContent =
      formatoMs(
        telemetria.proposalLatencyMs
      );

  }


  if (UI.calibradorBuy) {

    UI.calibradorBuy.textContent =
      formatoMs(
        telemetria.buyLatencyMs
      );

  }


  if (UI.calibradorResultado) {

    UI.calibradorResultado.textContent =
      telemetria.resultado ??
      "--";

  }

}


/* ==========================================
   TABLAS DE LOS 12 MERCADOS
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


  if (fila.pruebas) {

    fila.pruebas.textContent =
      resumen.pruebas ?? 0;

  }


  if (fila.ganadas) {

    fila.ganadas.textContent =
      resumen.ganadas ?? 0;

  }


  if (fila.perdidas) {

    fila.perdidas.textContent =
      resumen.perdidas ?? 0;

  }


  if (fila.accuracy) {

    fila.accuracy.textContent =
      formatoPorcentaje(
        resumen.accuracy
      );

  }


  if (fila.latencia) {

    fila.latencia.textContent =
      formatoMs(
        resumen.promedioSignalToBuyMs
      );

  }

}


function actualizarTablaMercados() {

  const estado =
    botEngine
      .obtenerEstado();


  const resumenes =
    estado
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
   COMPARADORES
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


  if (ui.ganadasCantidad) {
    ui.ganadasCantidad.textContent =
      ganadas.cantidad ?? 0;
  }


  if (ui.ganadasSignalBuy) {
    ui.ganadasSignalBuy.textContent =
      formatoMs(
        ganadas.promedioSignalToBuyMs
      );
  }


  if (ui.ganadasMin) {
    ui.ganadasMin.textContent =
      formatoMs(
        ganadas.minimoSignalToBuyMs
      );
  }


  if (ui.ganadasMax) {
    ui.ganadasMax.textContent =
      formatoMs(
        ganadas.maximoSignalToBuyMs
      );
  }


  if (ui.ganadasProposal) {
    ui.ganadasProposal.textContent =
      formatoMs(
        ganadas.promedioProposalMs
      );
  }


  if (ui.ganadasBuy) {
    ui.ganadasBuy.textContent =
      formatoMs(
        ganadas.promedioBuyMs
      );
  }


  if (ui.perdidasCantidad) {
    ui.perdidasCantidad.textContent =
      perdidas.cantidad ?? 0;
  }


  if (ui.perdidasSignalBuy) {
    ui.perdidasSignalBuy.textContent =
      formatoMs(
        perdidas.promedioSignalToBuyMs
      );
  }


  if (ui.perdidasMin) {
    ui.perdidasMin.textContent =
      formatoMs(
        perdidas.minimoSignalToBuyMs
      );
  }


  if (ui.perdidasMax) {
    ui.perdidasMax.textContent =
      formatoMs(
        perdidas.maximoSignalToBuyMs
      );
  }


  if (ui.perdidasProposal) {
    ui.perdidasProposal.textContent =
      formatoMs(
        perdidas.promedioProposalMs
      );
  }


  if (ui.perdidasBuy) {
    ui.perdidasBuy.textContent =
      formatoMs(
        perdidas.promedioBuyMs
      );
  }


  /*
    FIX10:
    usamos la MEDIANA como lectura principal
    para reducir el efecto de valores extremos.
  */

  if (ui.diferencia) {

    ui.diferencia.textContent =
      formatoMs(
        comparacion
          .diferenciaMedianaMs
      );

  }


  if (ui.lectura) {

    ui.lectura.textContent =
      comparacion.lectura ||
      "DATOS INSUFICIENTES";

  }

}


function actualizarComparadores() {

  const estado =
    botEngine
      .obtenerEstado();


  const comparaciones =
    estado?.comparaciones ||
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


  if (UI.estadoEjecucion) {

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


  if (UI.botonActivarDemo) {

    UI.botonActivarDemo.disabled =
      activa ||
      !conectado;

  }


  if (UI.botonDesactivarDemo) {

    UI.botonDesactivarDemo.disabled =
      !activa;

  }

}


/* ==========================================
   RECIBIR SEÑAL REAL
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


    if (UI.resultadoDemo) {

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
      "Procesando señal FIX10...",
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


      actualizarTablaMercados();


      actualizarComparadores();


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


      if (
        resultado.comparacionMercado
      ) {

        registrarActividad(
          `TIMING ${senal.mercado} · ${
            resultado
              .comparacionMercado
              .lectura
          } · Δ MEDIANA ${
            formatoMs(
              resultado
                .comparacionMercado
                .diferenciaMedianaMs
            )
          }`,
          "aviso"
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

          const resultado =
            botEngine
              .pausar();


          UI.botonPausar.textContent =
            "REANUDAR";


          registrarActividad(
            resultado?.mensaje ||
            "Bot pausado.",
            "aviso"
          );

        }


        else {

          const resultado =
            botEngine
              .reanudar();


          UI.botonPausar.textContent =
            "PAUSAR";


          registrarActividad(
            resultado?.mensaje ||
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
          "Cambio de ejecución DEMO.",
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

        signalBridge
          .recibirSenal({

            id:
              `FIX10-${Date.now()}`,

            mercado:
              "1HZ15V",

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
              "FIX10_TEST",

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

        UI.derivConexion.textContent =
          "DEMO CONECTADO";

      }


      if (
        UI.derivCuenta
      ) {

        UI.derivCuenta.textContent =
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
          "Conectando con Deriv DEMO...",
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
            !resultado?.ok
          ) {

            registrarActividad(
              `No se pudo conectar: ${
                resultado?.mensaje ||
                "Error desconocido"
              }`,
              "error"
            );

          }

        }


        catch (
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
   CIERRE
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
   INICIO FIX10
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


recuperarResultadoEngine();


registrarActividad(
  "BOT V1 MR FIX10 preparado."
);


registrarActividad(
  "Calibrador de 12 mercados activado."
);


registrarActividad(
  "1HZ15V y 1HZ30V agregados."
);


registrarActividad(
  "Datos anteriores conservados."
);


registrarActividad(
  "Ejecución DEMO desactivada por defecto."
);
