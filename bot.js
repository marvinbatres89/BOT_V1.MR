/* ==========================================
   BOT V1 MR
   BOT.JS
   FIX13.4.2

   PROTOCOLO:

   PREPARAR
   --------
   - recibe señal confirmada
   - muestra datos
   - bot-engine solicita propuesta
   - NO compra
   - queda listo esperando TARGET

   EJECUTAR
   --------
   - recibe target del número 10
   - aplica calibración
   - BUY sale en instante programado
   - muestra BUY ENVIADO
   - muestra BUY CONFIRMADO
   - muestra GANADA / PERDIDA

   CONSERVA:
   - DERIV DEMO
   - HISTORIAL
   - TELEMETRÍA
   - 12 MERCADOS
   - COMPARADORES
   - CALIBRACIÓN
   - PERFIL DE SEÑAL
   ========================================== */


import {
  signalBridge
} from "./signal-bridge.js?v=FIX13-4-2-BRIDGE-1";


import {
  botEngine
} from "./bot-engine.js?v=FIX13-4-2-ENGINE-1";


import {
  derivConnection
} from "./deriv-connection.js";


/* ==========================================
   VERSIONES
   ========================================== */

const BOT_VERSION =
  "FIX13.4.2";


const BOT_BUILD =
  "PREPARE-TARGET-1";


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
   COMPARADORES
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
   RELOJ
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
   FIX13.4.2
   PREPARACIÓN LISTA
   ========================================== */

window.addEventListener(
  "bot:prepared",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    if (
      UI.operacionDemo
    ) {

      UI.operacionDemo.innerHTML = `

        <strong>
          🟡 PROPUESTA PREPARADA
        </strong>

        <br><br>

        <strong>Mercado:</strong>
        ${datos.mercado ?? "--"}
        <br>

        <strong>Dirección:</strong>
        ${datos.direccion ?? "--"}
        <br>

        <strong>Proposal ID:</strong>
        ${datos.proposalId ?? "--"}
        <br>

        <strong>Operación:</strong>
        ${datos.operacionId ?? "--"}
        <br><br>

        Esperando TARGET 10...

      `;

    }


    registrarActividad(
      `🟡 PREPARADA · ${
        datos.mercado ||
        "--"
      } · ${
        datos.direccion ||
        "--"
      } · esperando TARGET 10.`,
      "correcto"
    );

  }
);


/* ==========================================
   BUY ENVIADO
   ========================================== */

window.addEventListener(
  "bot:buy-requested",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    const desviacion =
      Number(
        datos
          .buyTargetDeviationMs
      );


    if (
      UI.operacionDemo
    ) {

      UI.operacionDemo.innerHTML = `

        <strong>
          ⚡ BUY ENVIADO
        </strong>

        <br><br>

        <strong>Mercado:</strong>
        ${datos.mercado ?? "--"}
        <br>

        <strong>Dirección:</strong>
        ${datos.direccion ?? "--"}
        <br>

        <strong>Target 10:</strong>
        ${datos.targetExecutionAt ?? "--"}
        <br>

        <strong>Programado:</strong>
        ${datos.programmedExecutionAt ?? "--"}
        <br>

        <strong>Calibración:</strong>
        ${formatoMs(
          datos.calibracionMs
        )}
        <br>

        <strong>BUY enviado:</strong>
        ${datos.buyRequestedAt ?? "--"}
        <br>

        <strong>Desviación programada:</strong>
        ${formatoMs(
          desviacion
        )}

      `;

    }


    if (
      UI.calibradorSignalBuy
    ) {

      UI.calibradorSignalBuy.textContent =
        `TARGET ${formatoMs(
          desviacion
        )}`;

    }


    registrarActividad(
      `⚡ BUY ENVIADO · ${
        datos.mercado ||
        "--"
      } · ${
        datos.direccion ||
        "--"
      } · calibración ${
        formatoMs(
          datos.calibracionMs
        )
      } · desviación ${
        formatoMs(
          desviacion
        )
      }`,
      Math.abs(
        desviacion
      ) <=
        50
        ? "correcto"
        : "aviso"
    );

  }
);


/* ==========================================
   BUY CONFIRMADO
   ========================================== */

window.addEventListener(
  "bot:buy-confirmed",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    const compra =
      datos.compra ||
      {};


    if (
      datos.ok
    ) {

      if (
        UI.operacionDemo
      ) {

        UI.operacionDemo.innerHTML = `

          <strong>
            ✅ BUY CONFIRMADO
          </strong>

          <br><br>

          <strong>Mercado:</strong>
          ${datos.mercado ?? "--"}
          <br>

          <strong>Dirección:</strong>
          ${datos.direccion ?? "--"}
          <br>

          <strong>Contract ID:</strong>
          ${compra.contractId ?? "--"}
          <br>

          <strong>Compra:</strong>
          ${compra.buyPrice ?? "--"} USD
          <br>

          <strong>Target 10:</strong>
          ${datos.targetExecutionAt ?? "--"}
          <br>

          <strong>Programado:</strong>
          ${datos.programmedExecutionAt ?? "--"}
          <br>

          <strong>Calibración:</strong>
          ${formatoMs(
            datos.calibracionMs
          )}
          <br>

          <strong>Desviación envío:</strong>
          ${formatoMs(
            datos.buyTargetDeviationMs
          )}
          <br>

          <strong>Desviación confirmación:</strong>
          ${formatoMs(
            datos.buyConfirmTargetDeviationMs
          )}

        `;

      }


      registrarActividad(
        `✅ BUY CONFIRMADO · ${
          datos.mercado ||
          "--"
        } · Contract ${
          compra.contractId ||
          "--"
        } · confirmación ${
          formatoMs(
            datos.buyConfirmTargetDeviationMs
          )
        }`,
        "correcto"
      );

    }

    else {

      registrarActividad(
        `❌ BUY RECHAZADO · ${
          datos.mercado ||
          "--"
        } · ${
          datos.error ||
          "Sin detalle"
        }`,
        "error"
      );

    }

  }
);


/* ==========================================
   RESULTADO EN TIEMPO REAL
   ========================================== */

window.addEventListener(
  "bot:result",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    registrarActividad(
      `RESULTADO · ${
        datos.resultado ||
        "--"
      } · ${
        datos.mercado ||
        "--"
      } · PROFIT ${
        datos.profit ??
        "--"
      }`,
      datos.resultado ===
        "GANADA"
        ? "correcto"
        : datos.resultado ===
            "PERDIDA"
          ? "error"
          : "aviso"
    );


    if (
      datos.resultadoDemo
    ) {

      pintarResultadoFinal(
        datos.resultadoDemo
      );

    }

  }
);


/* ==========================================
   FUENTE SEÑAL
   ========================================== */

window.addEventListener(
  "bot:signal-source",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    const fase =
      String(
        datos.fase ||
        datos.metadata
          ?.fase ||
        "?"
      )
        .toUpperCase();


    registrarActividad(
      `PUENTE ${BOT_VERSION} · FASE ${fase} · ${
        datos.mercado ||
        "--"
      }.`,
      "correcto"
    );

  }
);


/* ==========================================
   CALIBRACIÓN
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

    UI.calibracionMercadoActual
      .textContent =
      mercado;

  }


  if (
    UI.calibracionAjusteActual
  ) {

    UI.calibracionAjusteActual
      .textContent =
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


UI.calibracionMercadoSelect
  ?.addEventListener(
    "change",
    actualizarPanelCalibracion
  );


UI.botonGuardarCalibracion
  ?.addEventListener(
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


UI.botonResetCalibracion
  ?.addEventListener(
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


  const fase =
    String(
      senal.fase ||
      senal.metadata
        ?.fase ||
      "--"
    )
      .toUpperCase();


  const target =
    senal.targetExecutionAt ??
    senal.targetVisualAt ??
    senal.metadata
      ?.targetExecutionAt ??
    null;


  if (
    UI.ultimaSenal
  ) {

    UI.ultimaSenal.innerHTML = `

      <strong>Fase:</strong>
      ${fase}
      <br><br>

      <strong>Mercado:</strong>
      ${senal.mercado ?? "--"}
      <br>

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
      ${target ?? "ESPERANDO"}

    `;

  }

}


/* ==========================================
   TARGET
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
          : "TARGET ALCANZADO";

    }

    else {

      UI.calibracionProgramacion.textContent =
        "ESPERANDO TARGET";

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
   PROPUESTA DERIV
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
        propuesta?.message ||
        "No se recibió cotización."
      }

    `;


    return;

  }


  UI.ultimaPropuesta.innerHTML = `

    <strong>Estado:</strong>
    PROPUESTA PREPARADA
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
   DIAGNÓSTICO TIMING
   ========================================== */

function registrarDiagnosticoTiming(
  telemetria
) {

  if (
    !telemetria
  ) {

    return;

  }


  registrarActividad(
    `TELEMETRÍA ${
      telemetria.version ||
      "?"
    } · ${
      telemetria.mercado ||
      "--"
    } · TIMING ${
      telemetria.timingClasificacion ||
      "PENDIENTE"
    } · desviación ${
      formatoMs(
        telemetria.buyTargetDeviationMs
      )
    }`,
    telemetria.timingValido
      ? "correcto"
      : "aviso"
  );


  if (
    Array.isArray(
      telemetria.timingAnomalias
    )
  ) {

    telemetria
      .timingAnomalias
      .forEach(
        (anomalia) => {

          registrarActividad(
            `TIMING → ${anomalia}`,
            "aviso"
          );

        }
      );

  }

}


/* ==========================================
   PERFIL
   ========================================== */

function registrarPerfilOperacion(
  telemetria
) {

  if (
    !telemetria
  ) {

    return;

  }


  registrarActividad(
    `PERFIL · Conf ${
      telemetria.confianza ??
      "--"
    } · RSI ${
      telemetria.rsi ??
      "--"
    } · Tend ${
      telemetria.tendencia ??
      "--"
    } · Mom ${
      telemetria.momentum ??
      "--"
    } · Vol ${
      telemetria.volatilidad ??
      "--"
    }`,
    "normal"
  );

}


/* ==========================================
   TABLA MERCADOS
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


function actualizarTablaMercados() {

  const resumenes =
    botEngine
      .obtenerEstado()
      ?.resumenMercados ||
    {};


  Object.keys(
    FILAS_MERCADO
  )
    .forEach(
      (mercado) => {

        renderFilaMercado(
          mercado,
          resumenes[
            mercado
          ]
        );

      }
    );

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


  ui.ganadasCantidad &&
    (
      ui.ganadasCantidad.textContent =
        ganadas.cantidad ??
        0
    );


  ui.ganadasSignalBuy &&
    (
      ui.ganadasSignalBuy.textContent =
        formatoMs(
          ganadas.promedioSignalToBuyMs
        )
    );


  ui.ganadasMin &&
    (
      ui.ganadasMin.textContent =
        formatoMs(
          ganadas.minimoSignalToBuyMs
        )
    );


  ui.ganadasMax &&
    (
      ui.ganadasMax.textContent =
        formatoMs(
          ganadas.maximoSignalToBuyMs
        )
    );


  ui.ganadasProposal &&
    (
      ui.ganadasProposal.textContent =
        formatoMs(
          ganadas.promedioProposalMs
        )
    );


  ui.ganadasBuy &&
    (
      ui.ganadasBuy.textContent =
        formatoMs(
          ganadas.promedioBuyMs
        )
    );


  ui.perdidasCantidad &&
    (
      ui.perdidasCantidad.textContent =
        perdidas.cantidad ??
        0
    );


  ui.perdidasSignalBuy &&
    (
      ui.perdidasSignalBuy.textContent =
        formatoMs(
          perdidas.promedioSignalToBuyMs
        )
    );


  ui.perdidasMin &&
    (
      ui.perdidasMin.textContent =
        formatoMs(
          perdidas.minimoSignalToBuyMs
        )
    );


  ui.perdidasMax &&
    (
      ui.perdidasMax.textContent =
        formatoMs(
          perdidas.maximoSignalToBuyMs
        )
    );


  ui.perdidasProposal &&
    (
      ui.perdidasProposal.textContent =
        formatoMs(
          perdidas.promedioProposalMs
        )
    );


  ui.perdidasBuy &&
    (
      ui.perdidasBuy.textContent =
        formatoMs(
          perdidas.promedioBuyMs
        )
    );


  ui.diferencia &&
    (
      ui.diferencia.textContent =
        formatoMs(
          comparacion.diferenciaMedianaMs
        )
    );


  ui.lectura &&
    (
      ui.lectura.textContent =
        comparacion.lectura ||
        "ESPERANDO MUESTRAS"
    );

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

    const fase =
      String(
        senal?.fase ||
        senal?.metadata
          ?.fase ||
        "?"
      )
        .toUpperCase();


    mostrarSenal(
      senal
    );


    registrarActividad(
      `SEÑAL RECIBIDA · FASE ${fase} · ${
        senal.mercado ||
        "--"
      } · ${
        senal.direccion ||
        "--"
      }.`,
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
        !resultado?.aceptada
      ) {

        registrarActividad(
          `FASE ${fase} NO PROCESADA · ${
            resultado?.motivo ||
            "Sin motivo"
          }`,
          "aviso"
        );


        return;

      }


      /* ====================================
         PREPARAR
         ==================================== */

      if (
        resultado.fase ===
        "PREPARAR"
      ) {

        registrarActividad(
          `PREPARAR COMPLETADO · ${
            resultado.mercado ||
            senal.mercado ||
            "--"
          } · cotización lista.`,
          "correcto"
        );


        if (
          resultado.contrato
        ) {

          mostrarContrato(
            resultado.contrato
          );

        }


        if (
          resultado.propuestaDeriv
        ) {

          mostrarPropuestaDeriv(
            resultado.propuestaDeriv,
            resultado.contrato
          );

        }


        if (
          resultado.telemetria
        ) {

          mostrarTelemetria(
            resultado.telemetria
          );

        }


        return;

      }


      /* ====================================
         EJECUTAR
         ==================================== */

      if (
        resultado.fase ===
        "EJECUTAR"
      ) {

        registrarActividad(
          `EJECUTAR FINALIZADO · ${
            senal.mercado ||
            "--"
          } · ajuste ${
            formatoSegundosDesdeMs(
              resultado.calibracionMs
            )
          }.`,
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


        registrarPerfilOperacion(
          resultado.telemetria
        );


        actualizarTablaMercados();


        actualizarComparadores();


        actualizarPanelCalibracion();


        if (
          resultado.telemetria
            ?.resultado ===
              "GANADA" ||
          resultado.telemetria
            ?.resultado ===
              "PERDIDA"
        ) {

          registrarActividad(
            `${
              resultado.telemetria
                .resultado
            } · PROFIT ${
              resultado.telemetria
                .profit ??
              "--"
            } · ${
              senal.mercado ||
              "--"
            }.`,
            resultado.telemetria
              .resultado ===
                "GANADA"
              ? "correcto"
              : "error"
          );

        }

      }

    }

    catch (
      error
    ) {

      registrarActividad(
        `Error FIX13.4.2 · fase ${fase} · ${
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

UI.botonConectar
  ?.addEventListener(
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
        `MOTOR ${
          estadoMotor
            ?.versionTelemetria ||
          "?"
        } · ${BOT_BUILD}`,
        estadoMotor
            ?.versionTelemetria ===
          "FIX13.4.2"
          ? "correcto"
          : "aviso"
      );


      registrarActividad(
        `PROTOCOLO → ${
          estadoMotor
            ?.protocolo ||
          "NO DETECTADO"
        }`,
        estadoMotor
            ?.protocolo ===
          "PREPARAR_EJECUTAR"
          ? "correcto"
          : "aviso"
      );


      registrarActividad(
        `Sincronización visual → ${
          estadoMotor
            ?.sincronizacionVisual ||
          "NO DETECTADA"
        }`,
        estadoMotor
            ?.sincronizacionVisual ===
          "FIX13.4.2"
          ? "correcto"
          : "aviso"
      );

    }
  );


/* ==========================================
   PAUSAR
   ========================================== */

UI.botonPausar
  ?.addEventListener(
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


/* ==========================================
   ACTIVAR DEMO
   ========================================== */

UI.botonActivarDemo
  ?.addEventListener(
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


/* ==========================================
   DESACTIVAR DEMO
   ========================================== */

UI.botonDesactivarDemo
  ?.addEventListener(
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


/* ==========================================
   PRUEBA INTERNA
   FIX13.4.2
   ========================================== */

UI.botonProbar
  ?.addEventListener(
    "click",
    async () => {

      const operacionId =
        `TEST-${Date.now()}`;


      /*
        FASE PREPARAR
      */

      signalBridge
        .recibirSenal({

          id:
            `${operacionId}-PREPARE`,

          operacionId,

          fase:
            "PREPARAR",

          protocolo:
            "FIX13.4.2",

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

          timestamp:
            Date.now(),

          metadata: {

            operacionId,

            fase:
              "PREPARAR",

            protocolo:
              "FIX13.4.2",

            prepararCotizacion:
              true,

            ejecutar:
              false

          }

        });


      /*
        Simula la separación entre
        PREPARAR y TARGET.
      */

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            2500
          )
      );


      const targetExecutionAt =
        Date.now() +
        1000;


      /*
        FASE EJECUTAR
      */

      signalBridge
        .recibirSenal({

          id:
            `${operacionId}-TARGET`,

          operacionId,

          fase:
            "EJECUTAR",

          protocolo:
            "FIX13.4.2",

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

          targetExecutionAt,

          targetVisualAt:
            targetExecutionAt,

          timestamp:
            Date.now(),

          metadata: {

            operacionId,

            fase:
              "EJECUTAR",

            protocolo:
              "FIX13.4.2",

            targetExecutionAt,

            targetVisualAt:
              targetExecutionAt,

            ejecutar:
              true

          }

        });

    }
  );


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

UI.botonConectarDeriv
  ?.addEventListener(
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


/* ==========================================
   DESCONECTAR DERIV
   ========================================== */

UI.botonDesconectarDeriv
  ?.addEventListener(
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


/* ==========================================
   ERRORES
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

    else if (
      signalBridge
        .desconectar
    ) {

      signalBridge
        .desconectar();

    }


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
  `Motor → ${
    estadoInicialMotor
      ?.versionTelemetria ||
    "NO DETECTADO"
  }.`,
  estadoInicialMotor
      ?.versionTelemetria ===
    "FIX13.4.2"
    ? "correcto"
    : "aviso"
);


registrarActividad(
  `Protocolo → ${
    estadoInicialMotor
      ?.protocolo ||
    "NO DETECTADO"
  }.`,
  estadoInicialMotor
      ?.protocolo ===
    "PREPARAR_EJECUTAR"
    ? "correcto"
    : "aviso"
);


registrarActividad(
  `Sincronización → ${
    estadoInicialMotor
      ?.sincronizacionVisual ||
    "NO DETECTADA"
  }.`,
  estadoInicialMotor
      ?.sincronizacionVisual ===
    "FIX13.4.2"
    ? "correcto"
    : "aviso"
);


registrarActividad(
  "PREPARAR solicitará la cotización sin comprar."
);


registrarActividad(
  "EJECUTAR usará el TARGET 10 y la calibración del mercado."
);


registrarActividad(
  "STANDARD inicia con referencia 0 ms."
);


registrarActividad(
  "1S inicia con referencia +100 ms, salvo calibración guardada."
);


registrarActividad(
  "Esperando señal PREPARAR desde Trading Analyzer."
);


/* ==========================================
   FIN BOT.JS
   FIX13.4.2
   ========================================== */
