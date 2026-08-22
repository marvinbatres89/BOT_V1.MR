/* ==========================================
   BOT V1 MR
   BOT.JS
   FIX14.0 · SINCRONIZACIÓN 1:1

   OBJETIVO:
   TRADING ANALYZER = CEREBRO
   BOT = EJECUTOR

   REGLA PRINCIPAL:
   - PREPARAR congela la predicción original.
   - EJECUTAR debe conservar exactamente:
       OPERACION ID
       MERCADO
       ESTRATEGIA
       DIRECCIÓN
       CONFIANZA
       SCORE BRUTO
       PUNTO DE ENTRADA
       BARRERA / DÍGITO
   - TARGET puede aparecer después.
   - BOT NO recalcula confianza.
   - BOT NO cambia dirección.
   - BOT NO genera segunda predicción.
   - Si PREPARAR y EJECUTAR no coinciden:
       SINCRONIZACIÓN INVÁLIDA
       NO BUY

   CONSERVA:
   - DERIV DEMO
   - AUTOMÁTICO
   - MANUAL DIAGNÓSTICO
   - PREPARAR / EJECUTAR
   - RESULTADO GANADA / PERDIDA
   - CALIBRACIÓN
   - TELEMETRÍA
   - MEMORIA DEL MOTOR
   - ESTADÍSTICAS
   - RISE/FALL
   - EVEN/ODD
   - OVER/UNDER
   - MATCH/DIFFERS
   ========================================== */


import {
  signalBridge
} from "./signal-bridge.js?v=FIX14-SYNC-1";


import {
  botEngine
} from "./bot-engine.js?v=FIX13-8-ENGINE-1";


import {
  derivConnection
} from "./deriv-connection.js";


/* ==========================================
   VERSIONES
   ========================================== */

const BOT_VERSION =
  "FIX14.0";


const BOT_BUILD =
  "SYNC-1-A-1";


const MODO_AUTOMATICO =
  "AUTOMATICO";


const MODO_MANUAL =
  "MANUAL_DIAGNOSTICO";


const $ =
  (id) =>
    document.getElementById(id);


/* ==========================================
   ESTADO LOCAL
   ========================================== */

let ultimoEstadoManualFinal =
  null;


/*
  Aquí guardamos la fotografía ORIGINAL
  recibida en PREPARAR.

  Clave:
  operacionId

  Valor:
  objeto congelado con los datos que NO
  pueden cambiar en EJECUTAR.
*/

const operacionesSincronizadas =
  new Map();


const MAX_OPERACIONES_SYNC =
  50;


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


  /* DERIV */

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


  /* MODO */

  modoEjecucionSelect:
    $("modoEjecucionSelect"),

  modoEjecucionEstado:
    $("modoEjecucionEstado"),

  manualPanel:
    $("manualPanel"),

  manualEstado:
    $("manualEstado"),

  manualOperacion:
    $("manualOperacion"),

  manualMercado:
    $("manualMercado"),

  manualDireccion:
    $("manualDireccion"),

  manualTarget:
    $("manualTarget"),

  manualProgramado:
    $("manualProgramado"),

  manualClickOffset:
    $("manualClickOffset"),

  manualBuyOffset:
    $("manualBuyOffset"),

  botonEjecutarManual:
    $("botonEjecutarManual"),


  /* CALIBRADOR */

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
    $("calibracionProgramacion"),


  /* MEMORIA OPCIONAL */

  memoriaEstado:
    $("memoriaEstado"),

  memoriaPatrones:
    $("memoriaPatrones"),

  memoriaOperaciones:
    $("memoriaOperaciones"),

  memoriaFavorables:
    $("memoriaFavorables"),

  memoriaRiesgo:
    $("memoriaRiesgo"),

  memoriaSinEvidencia:
    $("memoriaSinEvidencia"),

  memoriaUltimoPatron:
    $("memoriaUltimoPatron")

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
   UTILIDADES
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


function normalizarTexto(
  valor
) {

  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }


  const texto =
    String(valor)
      .trim()
      .toUpperCase();


  return texto || null;

}


function numeroSeguro(
  valor
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }


  const numero =
    Number(valor);


  return Number.isFinite(numero)
    ? numero
    : null;

}


/* ==========================================
   EXTRACCIÓN OFICIAL DE CAMPOS
   ========================================== */

function obtenerOperacionId(
  senal
) {

  return String(
    senal?.operacionId ??
    senal?.metadata?.operacionId ??
    ""
  ).trim();

}


function obtenerFase(
  senal
) {

  return String(
    senal?.fase ??
    senal?.metadata?.fase ??
    "LEGACY"
  )
    .trim()
    .toUpperCase();

}


function obtenerScoreBruto(
  senal
) {

  const candidatos = [

    senal?.rawScore,

    senal?.scoreBruto,

    senal?.metadata?.rawScore,

    senal?.metadata?.scoreBruto,

    senal?.metadata?.engine1?.rawScore

  ];


  for (
    const valor
    of candidatos
  ) {

    const numero =
      numeroSeguro(valor);


    if (
      numero !== null
    ) {

      return numero;

    }

  }


  return null;

}


function obtenerBarrera(
  senal
) {

  const candidatos = [

    senal?.barrier,

    senal?.barrera,

    senal?.digit,

    senal?.digito,

    senal?.metadata?.barrier,

    senal?.metadata?.barrera,

    senal?.metadata?.digit,

    senal?.metadata?.digito,

    senal?.metadata?.numero,

    senal?.metadata?.number

  ];


  for (
    const valor
    of candidatos
  ) {

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      continue;
    }


    const numero =
      Number(valor);


    if (
      Number.isInteger(numero) &&
      numero >= 0 &&
      numero <= 9
    ) {

      return numero;

    }

  }


  return null;

}


/* ==========================================
   FOTOGRAFÍA INMUTABLE
   ========================================== */

function crearFotografiaSenal(
  senal
) {

  return Object.freeze({

    operacionId:
      obtenerOperacionId(senal),

    mercado:
      normalizarTexto(
        senal?.mercado
      ),

    estrategia:
      normalizarTexto(
        senal?.estrategia
      ),

    direccion:
      normalizarTexto(
        senal?.direccion
      ),

    confianza:
      numeroSeguro(
        senal?.confianza
      ),

    scoreBruto:
      obtenerScoreBruto(
        senal
      ),

    segundosEntrada:
      numeroSeguro(
        senal?.segundosEntrada
      ),

    barrera:
      obtenerBarrera(
        senal
      )

  });

}


/* ==========================================
   GUARDAR PREPARAR
   ========================================== */

function congelarPreparacion(
  senal
) {

  const foto =
    crearFotografiaSenal(
      senal
    );


  if (
    !foto.operacionId
  ) {

    return {
      ok: false,
      motivo:
        "PREPARAR llegó sin operacionId."
    };

  }


  operacionesSincronizadas.set(
    foto.operacionId,
    foto
  );


  /*
    Limitar memoria local.
  */

  while (
    operacionesSincronizadas.size >
    MAX_OPERACIONES_SYNC
  ) {

    const primeraClave =
      operacionesSincronizadas
        .keys()
        .next()
        .value;


    operacionesSincronizadas.delete(
      primeraClave
    );

  }


  return {
    ok: true,
    foto
  };

}


/* ==========================================
   COMPARACIÓN 1:1
   ========================================== */

function compararNumero(
  nombre,
  original,
  recibido,
  diferencias,
  {
    permitirNullNuevo =
      false
  } = {}
) {

  if (
    original === null &&
    recibido === null
  ) {
    return;
  }


  if (
    permitirNullNuevo &&
    original === null
  ) {
    return;
  }


  if (
    original !== recibido
  ) {

    diferencias.push(
      `${nombre}: PREPARAR=${original ?? "--"} / EJECUTAR=${recibido ?? "--"}`
    );

  }

}


function compararTexto(
  nombre,
  original,
  recibido,
  diferencias
) {

  if (
    original !== recibido
  ) {

    diferencias.push(
      `${nombre}: PREPARAR=${original ?? "--"} / EJECUTAR=${recibido ?? "--"}`
    );

  }

}


function validarSincronizacionEjecucion(
  senal
) {

  const operacionId =
    obtenerOperacionId(
      senal
    );


  if (
    !operacionId
  ) {

    return {
      ok: false,
      operacionId: null,
      diferencias: [
        "EJECUTAR no incluye operacionId."
      ]
    };

  }


  const original =
    operacionesSincronizadas.get(
      operacionId
    );


  if (
    !original
  ) {

    return {
      ok: false,
      operacionId,
      diferencias: [
        "No existe PREPARAR congelado para esta operación."
      ]
    };

  }


  const actual =
    crearFotografiaSenal(
      senal
    );


  const diferencias =
    [];


  compararTexto(
    "MERCADO",
    original.mercado,
    actual.mercado,
    diferencias
  );


  compararTexto(
    "ESTRATEGIA",
    original.estrategia,
    actual.estrategia,
    diferencias
  );


  compararTexto(
    "DIRECCIÓN",
    original.direccion,
    actual.direccion,
    diferencias
  );


  compararNumero(
    "CONFIANZA",
    original.confianza,
    actual.confianza,
    diferencias
  );


  /*
    SCORE BRUTO:

    Si PREPARAR ya lo traía,
    EJECUTAR debe conservarlo.

    Si PREPARAR no lo traía,
    todavía no bloqueamos por score,
    porque el Analyzer actual puede
    no estar enviándolo.
  */

  if (
    original.scoreBruto !== null
  ) {

    compararNumero(
      "SCORE BRUTO",
      original.scoreBruto,
      actual.scoreBruto,
      diferencias
    );

  }


  compararNumero(
    "PUNTO DE ENTRADA",
    original.segundosEntrada,
    actual.segundosEntrada,
    diferencias
  );


  /*
    Para OVER/UNDER y MATCH:
    si PREPARAR llevaba barrera/dígito,
    EJECUTAR debe mantenerlo.
  */

  if (
    original.barrera !== null
  ) {

    compararNumero(
      "BARRERA/DÍGITO",
      original.barrera,
      actual.barrera,
      diferencias
    );

  }


  return {

    ok:
      diferencias.length === 0,

    operacionId,

    original,

    actual,

    diferencias

  };

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


  while (
    UI.registroBot.children.length >
    120
  ) {

    UI.registroBot.removeChild(
      UI.registroBot.lastElementChild
    );

  }

}


/* ==========================================
   FORMATOS
   ========================================== */

function formatoMs(
  valor
) {

  const numero =
    numeroSeguro(valor);


  if (
    numero === null
  ) {
    return "--";
  }


  return `${numero.toFixed(2)} ms`;

}


function formatoOffsetMs(
  valor
) {

  const numero =
    numeroSeguro(valor);


  if (
    numero === null
  ) {
    return "--";
  }


  return `${
    numero > 0
      ? "+"
      : ""
  }${numero.toFixed(2)} ms`;

}


function formatoSegundosDesdeMs(
  valor
) {

  const numero =
    numeroSeguro(valor);


  if (
    numero === null
  ) {
    return "--";
  }


  const segundos =
    numero / 1000;


  return `${
    segundos > 0
      ? "+"
      : ""
  }${segundos.toFixed(1)} s`;

}


function formatoPorcentaje(
  valor
) {

  const numero =
    numeroSeguro(valor);


  if (
    numero === null
  ) {
    return "--";
  }


  return `${numero.toFixed(1)}%`;

}


/* ==========================================
   ESTADO MOTOR
   ========================================== */

function obtenerEstadoRapido() {

  if (
    typeof botEngine
      .obtenerEstadoRapido ===
    "function"
  ) {

    return botEngine
      .obtenerEstadoRapido();

  }


  return botEngine
    .obtenerEstado();

}


function obtenerEstadoCompleto() {

  return botEngine
    .obtenerEstado();

}


function obtenerModoActual() {

  return (
    obtenerEstadoRapido()
      ?.modoEjecucion ||
    MODO_AUTOMATICO
  );

}


/* ==========================================
   MOSTRAR SEÑAL
   ========================================== */

function mostrarSenal(
  senal
) {

  const confianza =
    numeroSeguro(
      senal?.confianza
    );


  const scoreBruto =
    obtenerScoreBruto(
      senal
    );


  const fase =
    obtenerFase(
      senal
    );


  const operacionId =
    obtenerOperacionId(
      senal
    );


  const target =
    senal?.targetExecutionAt ??
    senal?.targetVisualAt ??
    senal?.metadata?.targetExecutionAt ??
    senal?.metadata?.targetVisualAt ??
    null;


  const barrera =
    obtenerBarrera(
      senal
    );


  if (
    UI.mercado
  ) {
    UI.mercado.textContent =
      senal?.mercado ||
      "--";
  }


  if (
    UI.estrategia
  ) {
    UI.estrategia.textContent =
      senal?.estrategia ||
      "--";
  }


  if (
    UI.direccion
  ) {
    UI.direccion.textContent =
      senal?.direccion ||
      "--";
  }


  /*
    IMPORTANTE FIX14:

    Se muestra DIRECTAMENTE la confianza
    recibida de Trading Analyzer.

    NO usamos:
    patrón
    motor
    accuracy histórico
    score convertido
    ni ningún segundo cálculo.
  */

  if (
    UI.confianza
  ) {

    UI.confianza.textContent =
      confianza !== null
        ? `${confianza}%`
        : "--";

  }


  if (
    UI.entrada
  ) {

    UI.entrada.textContent =
      senal?.segundosEntrada != null
        ? `${senal.segundosEntrada} s`
        : "--";

  }


  if (
    UI.precio
  ) {

    UI.precio.textContent =
      senal?.precio != null
        ? String(
            senal.precio
          )
        : "--";

  }


  if (
    UI.ultimaSenal
  ) {

    UI.ultimaSenal.innerHTML = `

      <strong>Sincronización:</strong>
      FIX14 · DATOS ORIGINALES
      <br><br>

      <strong>Operación ID:</strong>
      ${operacionId || "--"}
      <br>

      <strong>Fase:</strong>
      ${fase}
      <br><br>

      <strong>Mercado:</strong>
      ${senal?.mercado ?? "--"}
      <br>

      <strong>Estrategia:</strong>
      ${senal?.estrategia ?? "--"}
      <br>

      <strong>Dirección:</strong>
      ${senal?.direccion ?? "--"}
      <br>

      <strong>Confianza Analyzer:</strong>
      ${
        confianza !== null
          ? `${confianza}%`
          : "--"
      }
      <br>

      <strong>Score bruto Analyzer:</strong>
      ${scoreBruto ?? "--"}
      <br>

      <strong>Barrera / dígito:</strong>
      ${barrera ?? "--"}
      <br>

      <strong>Tendencia:</strong>
      ${senal?.tendencia ?? "--"}
      <br>

      <strong>RSI:</strong>
      ${senal?.rsi ?? "--"}
      <br>

      <strong>Momentum:</strong>
      ${senal?.momentum ?? "--"}
      <br>

      <strong>Volatilidad:</strong>
      ${senal?.volatilidad ?? "--"}
      <br>

      <strong>Último dígito:</strong>
      ${senal?.ultimoDigito ?? "--"}
      <br>

      <strong>Punto de entrada:</strong>
      ${senal?.segundosEntrada ?? "--"}
      <br>

      <strong>TARGET:</strong>
      ${target ?? "ESPERANDO"}

    `;

  }

}


/* ==========================================
   MOSTRAR ERROR DE SINCRONIZACIÓN
   ========================================== */

function mostrarErrorSincronizacion(
  validacion
) {

  if (
    UI.operacionDemo
  ) {

    UI.operacionDemo.innerHTML = `

      <strong>
        ⛔ SINCRONIZACIÓN INVÁLIDA
      </strong>

      <br><br>

      <strong>Operación:</strong>
      ${validacion.operacionId ?? "--"}
      <br><br>

      El BOT detectó que la señal
      EJECUTAR no coincide con PREPARAR.
      <br><br>

      <strong>BUY:</strong>
      BLOQUEADO
      <br><br>

      <strong>Diferencias:</strong>
      <br>

      ${
        validacion.diferencias
          .map(
            (item) =>
              `• ${item}`
          )
          .join("<br>")
      }

    `;

  }


  registrarActividad(
    `⛔ SYNC INVÁLIDA · ${
      validacion.operacionId ||
      "--"
    } · BUY BLOQUEADO.`,
    "error"
  );


  for (
    const diferencia
    of validacion.diferencias
  ) {

    registrarActividad(
      `SYNC → ${diferencia}`,
      "error"
    );

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

    <strong>Confianza original:</strong>
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
    resultado.profit !== undefined
  ) {

    pintarResultadoFinal(
      resultado
    );

  }

}


function recuperarResultadoEngine() {

  const ultimo =
    obtenerEstadoRapido()
      ?.ultimoResultadoDemo;


  if (
    ultimo &&
    (
      ultimo.contractId ||
      ultimo.profit !== undefined
    )
  ) {

    pintarResultadoFinal(
      ultimo
    );

  }

}


/* ==========================================
   MODO MANUAL
   ========================================== */

function renderModoEjecucion() {

  const estado =
    obtenerEstadoRapido();


  const modo =
    estado?.modoEjecucion ||
    MODO_AUTOMATICO;


  if (
    UI.modoEjecucionSelect
  ) {
    UI.modoEjecucionSelect.value =
      modo;
  }


  if (
    UI.modoEjecucionEstado
  ) {

    UI.modoEjecucionEstado.textContent =
      modo === MODO_MANUAL
        ? "MANUAL DIAGNÓSTICO"
        : "AUTOMÁTICO";

  }


  if (
    UI.manualPanel
  ) {

    UI.manualPanel.hidden =
      modo !== MODO_MANUAL;

  }


  const pendiente =
    estado?.manualPendiente ||
    null;


  if (
    UI.botonEjecutarManual
  ) {

    UI.botonEjecutarManual.disabled =
      !(
        modo === MODO_MANUAL &&
        pendiente
      );

  }


  if (
    !pendiente
  ) {

    if (UI.manualOperacion)
      UI.manualOperacion.textContent = "--";

    if (UI.manualMercado)
      UI.manualMercado.textContent = "--";

    if (UI.manualDireccion)
      UI.manualDireccion.textContent = "--";

    if (UI.manualTarget)
      UI.manualTarget.textContent = "--";

    if (UI.manualProgramado)
      UI.manualProgramado.textContent = "--";


    if (
      UI.manualEstado
    ) {

      UI.manualEstado.textContent =
        ultimoEstadoManualFinal ||
        (
          modo === MODO_MANUAL
            ? "ESPERANDO PREDICCIÓN"
            : "MODO AUTOMÁTICO"
        );

    }


    return;

  }


  ultimoEstadoManualFinal =
    null;


  if (
    UI.manualEstado
  ) {

    UI.manualEstado.textContent =
      pendiente.targetDisponible
        ? "LISTO PARA EJECUTAR"
        : "LISTO · ESPERANDO TARGET";

  }


  if (UI.manualOperacion)
    UI.manualOperacion.textContent =
      pendiente.operacionId || "--";

  if (UI.manualMercado)
    UI.manualMercado.textContent =
      pendiente.mercado || "--";

  if (UI.manualDireccion)
    UI.manualDireccion.textContent =
      pendiente.direccion || "--";

  if (UI.manualTarget)
    UI.manualTarget.textContent =
      pendiente.targetExecutionAt ??
      "ESPERANDO";

  if (UI.manualProgramado)
    UI.manualProgramado.textContent =
      pendiente.programmedExecutionAt ??
      "ESPERANDO";

}


/* ==========================================
   CAMBIO DE MODO
   ========================================== */

UI.modoEjecucionSelect
  ?.addEventListener(
    "change",
    () => {

      const modo =
        UI.modoEjecucionSelect
          ?.value ||
        MODO_AUTOMATICO;


      /*
        Al cambiar de modo eliminamos
        las fotografías PREPARAR pendientes.

        Así no se ejecuta accidentalmente
        una señal generada bajo otro modo.
      */

      operacionesSincronizadas.clear();


      ultimoEstadoManualFinal =
        null;


      const resultado =
        botEngine
          .establecerModoEjecucion(
            modo
          );


      registrarActividad(
        resultado?.mensaje ||
        "No se pudo cambiar el modo.",
        resultado?.ok
          ? "correcto"
          : "error"
      );


      renderModoEjecucion();

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
    obtenerEstadoRapido();


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
      String(ajuste);

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
   TELEMETRÍA
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
      telemetria.programacionDisponible
        ? "SÍ"
        : "NO";

  }


  if (
    UI.calibracionProgramacion
  ) {

    if (
      telemetria.programacionDisponible
    ) {

      UI.calibracionProgramacion.textContent =
        telemetria.modoEjecucion === MODO_MANUAL
          ? "REFERENCIA MANUAL"
          : telemetria.puedeAnticipar
            ? "PROGRAMADA"
            : "TARGET ALCANZADO";

    }

    else {

      UI.calibracionProgramacion.textContent =
        "ESPERANDO TARGET";

    }

  }

}


function mostrarTelemetria(
  telemetria
) {

  if (
    !telemetria
  ) {
    return;
  }


  if (UI.calibradorFamilia)
    UI.calibradorFamilia.textContent =
      telemetria.familiaMercado ?? "--";

  if (UI.calibradorMercado)
    UI.calibradorMercado.textContent =
      telemetria.mercado ?? "--";

  if (UI.calibradorPunto)
    UI.calibradorPunto.textContent =
      telemetria.puntoEntrada ?? "--";

  if (UI.calibradorReferencia)
    UI.calibradorReferencia.textContent =
      telemetria.retrasoReferenciaSeg != null
        ? `${telemetria.retrasoReferenciaSeg} s`
        : "--";

  if (UI.calibradorAjuste)
    UI.calibradorAjuste.textContent =
      formatoSegundosDesdeMs(
        telemetria.calibracionMs
      );

  if (UI.calibradorEspera)
    UI.calibradorEspera.textContent =
      formatoMs(
        telemetria.esperaProgramadaMs
      );

  if (UI.calibradorSignalBuy)
    UI.calibradorSignalBuy.textContent =
      telemetria.modoEjecucion === MODO_MANUAL
        ? `CLIC ${formatoOffsetMs(
            telemetria.manualClickToTargetMs
          )}`
        : formatoMs(
            telemetria.signalToBuyMs
          );

  if (UI.calibradorPropuesta)
    UI.calibradorPropuesta.textContent =
      `REQ ${formatoOffsetMs(
        telemetria.targetToPullRequestMs
      )} · RESP ${formatoOffsetMs(
        telemetria.targetToPullReceivedMs
      )} · LAT ${formatoMs(
        telemetria.proposalLatencyMs
      )}`;

  if (UI.calibradorBuy)
    UI.calibradorBuy.textContent =
      formatoMs(
        telemetria.buyLatencyMs
      );

  if (UI.calibradorResultado)
    UI.calibradorResultado.textContent =
      telemetria.resultado ?? "--";


  if (
    UI.manualClickOffset
  ) {

    UI.manualClickOffset.textContent =
      formatoOffsetMs(
        telemetria.manualClickToTargetMs
      );

  }


  if (
    UI.manualBuyOffset
  ) {

    UI.manualBuyOffset.textContent =
      formatoOffsetMs(
        telemetria.manualBuyToTargetMs
      );

  }


  mostrarEstadoTarget(
    telemetria
  );

}


/* ==========================================
   ESTADÍSTICAS
   ========================================== */

function renderFilaMercado(
  mercado,
  resumen
) {

  const fila =
    FILAS_MERCADO[mercado];


  if (
    !fila ||
    !resumen
  ) {
    return;
  }


  if (fila.pruebas)
    fila.pruebas.textContent =
      resumen.pruebas ?? 0;

  if (fila.ganadas)
    fila.ganadas.textContent =
      resumen.ganadas ?? 0;

  if (fila.perdidas)
    fila.perdidas.textContent =
      resumen.perdidas ?? 0;

  if (fila.accuracy)
    fila.accuracy.textContent =
      formatoPorcentaje(
        resumen.accuracy
      );

  if (fila.latencia)
    fila.latencia.textContent =
      formatoMs(
        resumen.promedioSignalToBuyMs
      );

}


function renderComparador(
  mercado,
  comparacion
) {

  const ui =
    COMPARADORES[mercado];


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


  if (ui.ganadasCantidad)
    ui.ganadasCantidad.textContent =
      ganadas.cantidad ?? 0;

  if (ui.ganadasSignalBuy)
    ui.ganadasSignalBuy.textContent =
      formatoMs(
        ganadas.promedioSignalToBuyMs
      );

  if (ui.ganadasMin)
    ui.ganadasMin.textContent =
      formatoMs(
        ganadas.minimoSignalToBuyMs
      );

  if (ui.ganadasMax)
    ui.ganadasMax.textContent =
      formatoMs(
        ganadas.maximoSignalToBuyMs
      );

  if (ui.ganadasProposal)
    ui.ganadasProposal.textContent =
      `PULL ${formatoOffsetMs(
        ganadas.promedioTargetToPullRequestMs
      )}`;

  if (ui.ganadasBuy)
    ui.ganadasBuy.textContent =
      formatoMs(
        ganadas.promedioBuyMs
      );


  if (ui.perdidasCantidad)
    ui.perdidasCantidad.textContent =
      perdidas.cantidad ?? 0;

  if (ui.perdidasSignalBuy)
    ui.perdidasSignalBuy.textContent =
      formatoMs(
        perdidas.promedioSignalToBuyMs
      );

  if (ui.perdidasMin)
    ui.perdidasMin.textContent =
      formatoMs(
        perdidas.minimoSignalToBuyMs
      );

  if (ui.perdidasMax)
    ui.perdidasMax.textContent =
      formatoMs(
        perdidas.maximoSignalToBuyMs
      );

  if (ui.perdidasProposal)
    ui.perdidasProposal.textContent =
      `PULL ${formatoOffsetMs(
        perdidas.promedioTargetToPullRequestMs
      )}`;

  if (ui.perdidasBuy)
    ui.perdidasBuy.textContent =
      formatoMs(
        perdidas.promedioBuyMs
      );


  if (ui.diferencia)
    ui.diferencia.textContent =
      formatoMs(
        comparacion.diferenciaMedianaMs
      );


  if (ui.lectura)
    ui.lectura.textContent =
      comparacion.lectura ||
      "ESPERANDO MUESTRAS";

}


function actualizarEstadisticasCompletas() {

  const estado =
    obtenerEstadoCompleto();


  const resumenes =
    estado?.resumenMercados ||
    {};


  Object.keys(
    FILAS_MERCADO
  ).forEach(
    (mercado) => {

      renderFilaMercado(
        mercado,
        resumenes[mercado]
      );

    }
  );


  const comparaciones =
    estado?.comparaciones ||
    {};


  renderComparador(
    "R_50",
    comparaciones["R_50"]
  );


  renderComparador(
    "1HZ75V",
    comparaciones["1HZ75V"]
  );

}


/* ==========================================
   MEMORIA VISUAL
   ========================================== */

function actualizarResumenMemoria() {

  const estado =
    obtenerEstadoRapido();


  const resumen =
    estado?.resumenMemoriaPatrones ||
    {};


  if (UI.memoriaPatrones)
    UI.memoriaPatrones.textContent =
      resumen.patrones ?? 0;

  if (UI.memoriaOperaciones)
    UI.memoriaOperaciones.textContent =
      resumen.operaciones ?? 0;

  if (UI.memoriaFavorables)
    UI.memoriaFavorables.textContent =
      resumen.favorables ?? 0;

  if (UI.memoriaRiesgo)
    UI.memoriaRiesgo.textContent =
      resumen.riesgos ?? 0;

  if (UI.memoriaSinEvidencia)
    UI.memoriaSinEvidencia.textContent =
      resumen.sinEvidencia ?? 0;

  if (UI.memoriaEstado)
    UI.memoriaEstado.textContent =
      resumen.learningMode
        ? "APRENDIZAJE ACTIVO"
        : "APRENDIZAJE OFF";


  const ultimo =
    estado?.ultimoAnalisisPatron;


  if (
    UI.memoriaUltimoPatron
  ) {

    UI.memoriaUltimoPatron.textContent =
      ultimo
        ? `${
            ultimo.clasificacion ||
            "SIN_EVIDENCIA"
          } · ${
            ultimo.muestras ??
            0
          } muestras · ${
            ultimo.accuracy ??
            "--"
          }%`
        : "SIN MUESTRAS";

  }

}


/* ==========================================
   EJECUCIÓN DEMO
   ========================================== */

function renderEjecucionDemo() {

  const estado =
    obtenerEstadoRapido();


  const trade =
    estado?.trade ||
    {};


  const conectado =
    Boolean(
      derivConnection
        .obtenerEstado()
        ?.connected
    );


  const activa =
    Boolean(
      trade.ejecucionActiva
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


  renderModoEjecucion();

}


/* ==========================================
   EVENTOS MOTOR
   ========================================== */

window.addEventListener(
  "bot:execution-mode",
  (
    evento
  ) => {

    const modo =
      evento.detail?.modo ||
      MODO_AUTOMATICO;


    operacionesSincronizadas.clear();


    registrarActividad(
      modo === MODO_MANUAL
        ? "MODO → MANUAL DIAGNÓSTICO."
        : "MODO → AUTOMÁTICO.",
      "correcto"
    );


    renderModoEjecucion();

  }
);


window.addEventListener(
  "bot:manual-replaced",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    registrarActividad(
      `Manual anterior reemplazado · ${
        datos.operacionId ||
        "--"
      }.`,
      "aviso"
    );

  }
);


window.addEventListener(
  "bot:prepared",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    registrarActividad(
      `🟡 PREPARADA · ${
        datos.mercado ||
        "--"
      } · ${
        datos.direccion ||
        "--"
      }.`,
      "correcto"
    );

  }
);


window.addEventListener(
  "bot:manual-ready",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    ultimoEstadoManualFinal =
      null;


    if (UI.manualEstado)
      UI.manualEstado.textContent =
        datos.targetDisponible
          ? "LISTO PARA EJECUTAR"
          : "LISTO · ESPERANDO TARGET";

    if (UI.manualOperacion)
      UI.manualOperacion.textContent =
        datos.operacionId || "--";

    if (UI.manualMercado)
      UI.manualMercado.textContent =
        datos.mercado || "--";

    if (UI.manualDireccion)
      UI.manualDireccion.textContent =
        datos.direccion || "--";

    if (UI.manualTarget)
      UI.manualTarget.textContent =
        datos.targetExecutionAt ??
        "ESPERANDO";

    if (UI.manualProgramado)
      UI.manualProgramado.textContent =
        datos.programmedExecutionAt ??
        "ESPERANDO";

    if (UI.botonEjecutarManual)
      UI.botonEjecutarManual.disabled =
        false;


    registrarActividad(
      `🟠 MANUAL LISTO · ${
        datos.mercado ||
        "--"
      } · ${
        datos.direccion ||
        "--"
      }.`,
      "aviso"
    );

  }
);


window.addEventListener(
  "bot:manual-click",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    if (UI.manualEstado)
      UI.manualEstado.textContent =
        "EJECUTANDO BUY";


    if (
      UI.manualClickOffset
    ) {

      UI.manualClickOffset.textContent =
        datos.targetDisponible
          ? formatoOffsetMs(
              datos.clickToTargetMs
            )
          : "SIN TARGET";

    }


    if (UI.botonEjecutarManual)
      UI.botonEjecutarManual.disabled =
        true;


    registrarActividad(
      `🖐️ CLIC MANUAL · ${
        datos.mercado ||
        "--"
      }.`,
      "correcto"
    );

  }
);


window.addEventListener(
  "bot:buy-requested",
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
          ⚡ BUY ENVIADO
        </strong>

        <br><br>

        <strong>Modo:</strong>
        ${datos.modoEjecucion ?? "--"}
        <br>

        <strong>Mercado:</strong>
        ${datos.mercado ?? "--"}
        <br>

        <strong>Dirección:</strong>
        ${datos.direccion ?? "--"}
        <br>

        <strong>TARGET:</strong>
        ${datos.targetExecutionAt ?? "SIN TARGET"}
        <br>

        <strong>Programado:</strong>
        ${datos.programmedExecutionAt ?? "--"}
        <br>

        <strong>Desviación:</strong>
        ${formatoOffsetMs(
          datos.buyTargetDeviationMs
        )}

      `;

    }


    registrarActividad(
      `⚡ BUY ENVIADO · ${
        datos.mercado ||
        "--"
      } · ${
        datos.direccion ||
        "--"
      }.`,
      "correcto"
    );

  }
);


window.addEventListener(
  "bot:buy-confirmed",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    if (
      datos.ok
    ) {

      registrarActividad(
        `✅ BUY CONFIRMADO · ${
          datos.mercado ||
          "--"
        } · Contract ${
          datos.compra?.contractId ||
          "--"
        }.`,
        "correcto"
      );

    }

    else {

      registrarActividad(
        `❌ BUY RECHAZADO · ${
          datos.error ||
          "Sin detalle"
        }.`,
        "error"
      );

    }

  }
);


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
      }.`,
      datos.resultado === "GANADA"
        ? "correcto"
        : datos.resultado === "PERDIDA"
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


    if (
      datos.modoEjecucion ===
      MODO_MANUAL
    ) {

      ultimoEstadoManualFinal =
        datos.resultado ||
        "--";


      if (
        UI.manualEstado
      ) {

        UI.manualEstado.textContent =
          ultimoEstadoManualFinal;

      }

    }


    actualizarResumenMemoria();

  }
);


window.addEventListener(
  "bot:pattern-evaluated",
  (
    evento
  ) => {

    const patron =
      evento.detail ||
      {};


    registrarActividad(
      `MEMORIA · ${
        patron.clasificacion ||
        "SIN_EVIDENCIA"
      } · ${
        patron.muestras ??
        0
      } muestras · ${
        patron.accuracy ??
        "--"
      }%.`
    );

  }
);


window.addEventListener(
  "bot:pattern-updated",
  (
    evento
  ) => {

    const patron =
      evento.detail ||
      {};


    registrarActividad(
      `APRENDIZAJE · ${
        patron.ultimoResultado ||
        "--"
      } · ${
        patron.total ??
        0
      } muestras · ${
        patron.accuracy ??
        "--"
      }%.`,
      "correcto"
    );


    actualizarResumenMemoria();

  }
);


window.addEventListener(
  "bot:pattern-blocked",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    registrarActividad(
      `⛔ PATRÓN RIESGO · ${
        datos.mercado ||
        "--"
      } · BUY AUTOMÁTICO BLOQUEADO.`,
      "aviso"
    );

  }
);


/* ==========================================
   EJECUTAR MANUAL
   ========================================== */

UI.botonEjecutarManual
  ?.addEventListener(
    "click",
    async () => {

      if (
        obtenerModoActual() !==
        MODO_MANUAL
      ) {

        registrarActividad(
          "EJECUTAR AHORA solo funciona en MANUAL DIAGNÓSTICO.",
          "aviso"
        );

        return;

      }


      UI.botonEjecutarManual.disabled =
        true;


      try {

        const resultado =
          await botEngine
            .ejecutarManual(
              null,
              {
                onOperacionUpdate:
                  mostrarActualizacionContrato
              }
            );


        if (
          !resultado?.aceptada
        ) {

          registrarActividad(
            resultado?.motivo ||
            "No se pudo ejecutar manualmente.",
            "aviso"
          );


          renderModoEjecucion();

          return;

        }


        if (resultado.compraDemo)
          mostrarCompraDemo(
            resultado.compraDemo
          );


        if (resultado.resultadoDemo)
          mostrarResultadoDemo(
            resultado.resultadoDemo
          );


        mostrarTelemetria(
          resultado.telemetria
        );


        actualizarEstadisticasCompletas();
        actualizarPanelCalibracion();
        actualizarResumenMemoria();
        recuperarResultadoEngine();
        renderModoEjecucion();

      }

      catch (
        error
      ) {

        registrarActividad(
          `Error MANUAL · ${
            error?.message ||
            String(error)
          }`,
          "error"
        );


        renderModoEjecucion();

      }

    }
  );


/* ==========================================
   RECIBIR SEÑAL
   ========================================== */

signalBridge.onSenal(
  async (
    senal
  ) => {

    const fase =
      obtenerFase(
        senal
      );


    const operacionId =
      obtenerOperacionId(
        senal
      );


    mostrarSenal(
      senal
    );


    registrarActividad(
      `SEÑAL RECIBIDA · ${
        fase
      } · OP ${
        operacionId ||
        "--"
      } · ${
        senal?.mercado ||
        "--"
      } · ${
        senal?.direccion ||
        "--"
      } · ${
        senal?.confianza ??
        "--"
      }%.`,
      "correcto"
    );


    /* ====================================
       FASE PREPARAR:
       CONGELAR DATOS OFICIALES
       ==================================== */

    if (
      fase === "PREPARAR"
    ) {

      const congelado =
        congelarPreparacion(
          senal
        );


      if (
        !congelado.ok
      ) {

        registrarActividad(
          `⛔ PREPARAR RECHAZADO · ${
            congelado.motivo
          }`,
          "error"
        );

        return;

      }


      registrarActividad(
        `🔒 PREDICCIÓN CONGELADA · ${
          congelado.foto.mercado
        } · ${
          congelado.foto.estrategia
        } · ${
          congelado.foto.direccion
        } · CONF ${
          congelado.foto.confianza ??
          "--"
        }% · SCORE ${
          congelado.foto.scoreBruto ??
          "--"
        }.`,
        "correcto"
      );

    }


    /* ====================================
       FASE EJECUTAR:
       VALIDAR 1:1 ANTES DEL MOTOR
       ==================================== */

    if (
      fase === "EJECUTAR"
    ) {

      const sincronizacion =
        validarSincronizacionEjecucion(
          senal
        );


      if (
        !sincronizacion.ok
      ) {

        mostrarErrorSincronizacion(
          sincronizacion
        );


        /*
          MUY IMPORTANTE:

          No llamamos a:
          botEngine.procesarSenal()

          Por tanto:
          no entra a procesarEjecucion()
          y no se envía BUY.
        */

        return;

      }


      registrarActividad(
        `✅ SYNC 1:1 CONFIRMADA · OP ${
          sincronizacion.operacionId
        } · ${
          sincronizacion.actual.mercado
        } · ${
          sincronizacion.actual.direccion
        } · ${
          sincronizacion.actual.confianza ??
          "--"
        }%.`,
        "correcto"
      );

    }


    const marcaPuente =
      Number(
        senal?.bridgeReceivedPerf
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


      /* =================================
         PREPARAR
         ================================= */

      if (
        resultado.fase ===
        "PREPARAR"
      ) {

        registrarActividad(
          `PREPARAR COMPLETADO · ${
            resultado.mercado ||
            senal.mercado ||
            "--"
          } · ${
            senal.confianza ??
            "--"
          }% · cotización lista.`,
          "correcto"
        );


        if (resultado.contrato)
          mostrarContrato(
            resultado.contrato
          );


        if (resultado.propuestaDeriv)
          mostrarPropuestaDeriv(
            resultado.propuestaDeriv,
            resultado.contrato
          );


        if (resultado.telemetria)
          mostrarTelemetria(
            resultado.telemetria
          );


        actualizarResumenMemoria();
        renderModoEjecucion();

        return;

      }


      /* =================================
         EJECUTAR
         ================================= */

      if (
        resultado.fase ===
        "EJECUTAR"
      ) {

        if (
          resultado.estado ===
          "MANUAL_ESPERANDO_CLICK"
        ) {

          registrarActividad(
            `MANUAL · TARGET recibido · ${
              senal.mercado ||
              "--"
            } · SYNC 1:1 OK.`,
            "aviso"
          );


          mostrarTelemetria(
            resultado.telemetria
          );


          renderModoEjecucion();

          return;

        }


        if (
          resultado.estado ===
          "NO_OPERAR_PATRON_RIESGO"
        ) {

          registrarActividad(
            `NO OPERAR · PATRÓN HISTÓRICO DE RIESGO · ${
              senal.mercado ||
              "--"
            }.`,
            "aviso"
          );


          mostrarTelemetria(
            resultado.telemetria
          );


          /*
            Ya terminó esa operación.
          */

          operacionesSincronizadas.delete(
            operacionId
          );


          actualizarResumenMemoria();

          return;

        }


        if (resultado.contrato)
          mostrarContrato(
            resultado.contrato
          );


        if (resultado.propuestaDeriv)
          mostrarPropuestaDeriv(
            resultado.propuestaDeriv,
            resultado.contrato
          );


        if (resultado.compraDemo)
          mostrarCompraDemo(
            resultado.compraDemo
          );


        if (resultado.resultadoDemo)
          mostrarResultadoDemo(
            resultado.resultadoDemo
          );


        recuperarResultadoEngine();


        mostrarTelemetria(
          resultado.telemetria
        );


        actualizarEstadisticasCompletas();
        actualizarPanelCalibracion();
        actualizarResumenMemoria();
        renderModoEjecucion();


        /*
          Ya finalizó la operación,
          eliminamos su fotografía
          de sincronización.
        */

        operacionesSincronizadas.delete(
          operacionId
        );

      }

    }

    catch (
      error
    ) {

      registrarActividad(
        `Error ${BOT_VERSION} · fase ${
          fase
        } · ${
          error?.message ||
          String(error)
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
          "BOT SYNC 1:1";


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


      if (UI.botonConectar)
        UI.botonConectar.disabled =
          true;


      if (UI.botonPausar)
        UI.botonPausar.disabled =
          false;


      registrarActividad(
        "Puente Trading Analyzer → BOT conectado.",
        "correcto"
      );

    }

    else {

      if (UI.estadoBot)
        UI.estadoBot.textContent =
          "BOT OFF";


      if (UI.botonConectar)
        UI.botonConectar.disabled =
          false;


      if (UI.botonPausar)
        UI.botonPausar.disabled =
          true;

    }

  }
);


window.addEventListener(
  "bot:signal-source",
  (
    evento
  ) => {

    registrarActividad(
      `PUENTE · ${
        evento.detail?.origen ||
        "origen desconocido"
      }.`
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
   CONECTAR BOT
   ========================================== */

UI.botonConectar
  ?.addEventListener(
    "click",
    () => {

      /*
        Comenzamos una sesión de
        sincronización limpia.
      */

      operacionesSincronizadas.clear();


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


      registrarActividad(
        `FIX14 · SYNC 1:1 ACTIVA · motor ${
          obtenerEstadoRapido()
            ?.versionTelemetria ||
          "?"
        }.`,
        "correcto"
      );


      renderModoEjecucion();

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
        obtenerEstadoRapido();


      if (
        !estado?.pausado
      ) {

        botEngine.pausar();

        UI.botonPausar.textContent =
          "REANUDAR";


        registrarActividad(
          "BOT pausado.",
          "aviso"
        );

      }

      else {

        botEngine.reanudar();

        UI.botonPausar.textContent =
          "PAUSAR";


        registrarActividad(
          "BOT reanudado.",
          "correcto"
        );

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
   PRUEBA INTERNA FIX14
   ========================================== */

UI.botonProbar
  ?.addEventListener(
    "click",
    async () => {

      const operacionId =
        `TEST-FIX14-${Date.now()}`;


      /*
        PREPARAR y EJECUTAR llevan
        EXACTAMENTE la misma predicción.
      */

      const prediccion = {

        operacionId,

        mercado:
          "R_50",

        estrategia:
          "even_odd",

        direccion:
          "EVEN",

        confianza:
          86,

        rawScore:
          84,

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
          10

      };


      signalBridge
        .recibirSenal({

          ...prediccion,

          id:
            `${operacionId}-PREPARE`,

          fase:
            "PREPARAR",

          protocolo:
            "FIX14",

          timestamp:
            Date.now(),

          metadata: {

            operacionId,

            fase:
              "PREPARAR",

            protocolo:
              "FIX14",

            rawScore:
              84,

            ejecutar:
              false

          }

        });


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


      signalBridge
        .recibirSenal({

          ...prediccion,

          id:
            `${operacionId}-TARGET`,

          fase:
            "EJECUTAR",

          protocolo:
            "FIX14",

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
              "FIX14",

            rawScore:
              84,

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
  (
    {
      accountId
    }
  ) => {

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
      `Cuenta Deriv detectada · ${
        accountId ||
        "--"
      }.`,
      "correcto"
    );

  }
);


/* ==========================================
   ESTADO DERIV
   ========================================== */

derivConnection.on(
  "state",
  (
    {
      estado,
      mensaje
    }
  ) => {

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

      if (UI.derivConexion)
        UI.derivConexion.textContent =
          "DEMO CONECTADO";


      if (UI.botonConectarDeriv)
        UI.botonConectarDeriv.disabled =
          true;


      if (UI.botonDesconectarDeriv)
        UI.botonDesconectarDeriv.disabled =
          false;


      if (UI.derivAppId)
        UI.derivAppId.disabled =
          true;


      if (UI.derivToken)
        UI.derivToken.disabled =
          true;


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
          estado === "connecting"
            ? "CONECTANDO"
            : "OFF";

      }


      if (
        estado !== "connecting"
      ) {

        if (UI.botonConectarDeriv)
          UI.botonConectarDeriv.disabled =
            false;


        if (UI.botonDesconectarDeriv)
          UI.botonDesconectarDeriv.disabled =
            true;


        if (UI.derivAppId)
          UI.derivAppId.disabled =
            false;


        if (UI.derivToken)
          UI.derivToken.disabled =
            false;


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


      operacionesSincronizadas.clear();


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
   ERRORES DERIV
   ========================================== */

derivConnection.on(
  "error",
  (
    {
      mensaje
    }
  ) => {

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
   CIERRE
   ========================================== */

window.addEventListener(
  "beforeunload",
  () => {

    botEngine
      .desactivarEjecucionDemo();


    operacionesSincronizadas.clear();


    if (
      signalBridge.destruir
    ) {

      signalBridge.destruir();

    }

    else if (
      signalBridge.desconectar
    ) {

      signalBridge.desconectar();

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

actualizarPanelCalibracion();

renderModoEjecucion();

recuperarResultadoEngine();

actualizarResumenMemoria();


try {

  actualizarEstadisticasCompletas();

}

catch (
  error
) {

  console.warn(
    "Estadísticas iniciales:",
    error
  );

}


const estadoInicialMotor =
  obtenerEstadoRapido();


registrarActividad(
  `BOT V1 MR ${BOT_VERSION} ${BOT_BUILD} preparado.`,
  "correcto"
);


registrarActividad(
  `Motor actual → ${
    estadoInicialMotor
      ?.versionTelemetria ||
    "NO DETECTADO"
  }.`
);


registrarActividad(
  "FIX14 · TRADING ANALYZER ES LA ÚNICA FUENTE DE PREDICCIÓN.",
  "correcto"
);


registrarActividad(
  "BOT no recalcula confianza ni dirección.",
  "correcto"
);


registrarActividad(
  "PREPARAR congela la predicción original.",
  "correcto"
);


registrarActividad(
  "EJECUTAR debe coincidir 1:1 con PREPARAR.",
  "correcto"
);


registrarActividad(
  "Si existe diferencia → BUY BLOQUEADO.",
  "correcto"
);


registrarActividad(
  "Rise/Fall · Even/Odd · Over/Under · Match se conservan."
);


registrarActividad(
  "Esperando señal PREPARAR desde Trading Analyzer."
);


/* ==========================================
   FIN BOT.JS
   FIX14.0 · SINCRONIZACIÓN 1:1
   ========================================== */
